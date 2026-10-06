import "server-only";
import { GoogleAuth } from "google-auth-library";
import type { TreeFile, TreeFolder } from "../types";

const API = "https://www.googleapis.com/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const FILE_FIELDS =
  "id,name,mimeType,parents,createdTime,size,imageMediaMetadata(width,height,rotation),videoMediaMetadata(width,height)";

let auth: GoogleAuth | null = null;

export function driveConfigured() {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
}

/** GOOGLE_SERVICE_ACCOUNT_KEY may be the raw JSON key or the JSON base64-encoded. */
function credentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!.trim();
  const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  const key = JSON.parse(json);
  key.private_key = String(key.private_key).replace(/\\n/g, "\n");
  return key;
}

async function token(): Promise<string> {
  auth ??= new GoogleAuth({
    credentials: credentials(),
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  const t = await auth.getAccessToken();
  if (!t) throw new Error("Could not get a Google access token");
  return t;
}

async function api<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${API}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${await token()}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Drive API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  createdTime: string;
  size?: string;
  imageMediaMetadata?: { width?: number; height?: number; rotation?: number };
  videoMediaMetadata?: { width?: number; height?: number };
}

const shared = { supportsAllDrives: "true", includeItemsFromAllDrives: "true" };

async function findRootFolder(): Promise<DriveFile> {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (id) return api<DriveFile>(`/files/${id}`, { fields: FILE_FIELDS, supportsAllDrives: "true" });
  const name = process.env.GOOGLE_DRIVE_FOLDER_NAME || "Topaz Asset Library";
  const res = await api<{ files: DriveFile[] }>("/files", {
    ...shared,
    q: `name = '${name.replace(/'/g, "\\'")}' and mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: `files(${FILE_FIELDS})`,
    corpora: "allDrives",
  });
  if (!res.files.length) {
    throw new Error(`No Drive folder named "${name}" is shared with the service account`);
  }
  return res.files[0];
}

/** Lists the children of many folders at once (Drive has no recursive listing). */
async function listChildren(folderIds: string[]): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  for (let i = 0; i < folderIds.length; i += 40) {
    const chunk = folderIds.slice(i, i + 40);
    const q = `(${chunk.map((id) => `'${id}' in parents`).join(" or ")}) and trashed = false`;
    let pageToken: string | undefined;
    do {
      const res = await api<{ files: DriveFile[]; nextPageToken?: string }>("/files", {
        ...shared,
        q,
        corpora: "allDrives",
        pageSize: "1000",
        fields: `nextPageToken,files(${FILE_FIELDS})`,
        ...(pageToken ? { pageToken } : {}),
      });
      out.push(...res.files);
      pageToken = res.nextPageToken;
    } while (pageToken);
  }
  return out;
}

function toTreeFile(f: DriveFile): TreeFile {
  const meta = f.imageMediaMetadata ?? f.videoMediaMetadata;
  const rotated = f.imageMediaMetadata?.rotation === 1 || f.imageMediaMetadata?.rotation === 3;
  return {
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    width: rotated ? meta?.height : meta?.width,
    height: rotated ? meta?.width : meta?.height,
    size: f.size ? Number(f.size) : undefined,
    createdTime: f.createdTime,
  };
}

export async function readDriveTree(): Promise<TreeFolder> {
  const rootFile = await findRootFolder();
  const root: TreeFolder = { id: rootFile.id, name: rootFile.name, createdTime: rootFile.createdTime, files: [], folders: [] };
  const byId = new Map([[root.id, root]]);

  let frontier = [root.id];
  while (frontier.length) {
    const children = await listChildren(frontier);
    frontier = [];
    for (const c of children) {
      const parent = c.parents?.map((p) => byId.get(p)).find(Boolean);
      if (!parent) continue;
      if (c.mimeType === FOLDER_MIME) {
        const folder: TreeFolder = { id: c.id, name: c.name, createdTime: c.createdTime, files: [], folders: [] };
        byId.set(c.id, folder);
        parent.folders.push(folder);
        frontier.push(c.id);
      } else {
        parent.files.push(toTreeFile(c));
      }
    }
  }
  return root;
}

/** Streams a file's bytes from Drive, forwarding Range so video seeking works. */
export async function fetchDriveMedia(id: string, range: string | null): Promise<Response> {
  const headers: Record<string, string> = { Authorization: `Bearer ${await token()}` };
  if (range) headers.Range = range;
  return fetch(`${API}/files/${id}?alt=media&supportsAllDrives=true`, { headers, cache: "no-store" });
}

/** A resized thumbnail rendered by Google (works for images and videos). */
export async function fetchDriveThumb(id: string, width: number): Promise<Response | null> {
  const meta = await api<{ thumbnailLink?: string }>(`/files/${id}`, {
    fields: "thumbnailLink",
    supportsAllDrives: "true",
  });
  if (!meta.thumbnailLink) return null;
  const url = meta.thumbnailLink.replace(/=s\d+(-[a-z0-9-]+)?$/i, `=w${width}`);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${await token()}` }, cache: "no-store" });
  return res.ok ? res : null;
}
