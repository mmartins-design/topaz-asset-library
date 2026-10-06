# Topaz Asset Library

A searchable before/after gallery of Topaz Labs images and videos. Content comes straight from the
**"Topaz Asset Library"** folder in Google Drive: add a folder or image set to Drive and it appears on the
site within 5 minutes.

- Masonry grid with infinite scroll and staggered filter animations
- **Images** / **Video** toggles, a **model** dropdown (one entry per top-level Drive folder), search, and sort
- Before/after compare slider for image *and* video pairs
- Light (default) and dark mode
- Filter state is kept in the URL (`?model=Wonder+2&type=image&q=bird`), so filtered views can be shared

Built with Next.js 16 (App Router, Cache Components) and deployed on Vercel.

## How Drive folders become assets

```
Topaz Asset Library/
  Images/                                → media-type grouping (Images / Videos), not a model
    Wonder 2/                            → "Wonder 2" in the model dropdown
      Giraffe with blue sky/             → one card (an "image set")
        Before.jpeg                      → before
        After.jpeg                       → after (shown in the compare slider)
        Thumbnail.webp                   → grid image (any name containing "thumb")
        Original download.zip            → "Download set" button
        Metadata.json                    → optional Webflow record (see below)
    Dust & Scratch, Super Focus/         → "A, B" lists the asset under both models
  Videos/
    Starlight Fast 2/
      Modern home aerial/
        Before.mp4
        After.mp4
```

When a set has a `Metadata.json` (the Webflow CMS export), it's used for:
- `Name`: the card title
- `Model`: the models (comma-separated)
- `Tags` and `Product`: search keywords
- `Created On`: the Newest/Oldest sort

Records marked `"Archived": "true"` or `"Draft": "true"` are hidden. Without the metadata, the folder names are used instead.

How before and after are detected, in order:

1. A file name containing `before` / `original`, and one containing `after`.
2. Otherwise the shortest name that the other files start with is the *before*, and the longest derivative is the *after*
   (`photo.jpg` → `photo-topaz-v4-focus.jpg`).
3. Otherwise the higher-resolution file is the *after*.

Set titles come from the folder name. When the folder is just a number (`9`, `_7`), the title comes from the
`.zip` name or the original file's name. A folder with more than 6 media files is treated as a collection,
and each file becomes its own card.

## Google Drive setup (one time)

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project (or reuse one) and enable the
   **Google Drive API**.
2. **IAM & Admin → Service Accounts → Create service account**. No roles are needed.
3. Open the service account → **Keys → Add key → JSON**. A `.json` file downloads.
4. In Google Drive, **share the "Topaz Asset Library" folder** with the service account's email
   (`…@….iam.gserviceaccount.com`) as **Viewer**.
5. Copy the folder ID from its URL: `drive.google.com/drive/folders/<FOLDER_ID>`.

## Environment variables

| Name | Required | Description |
| --- | --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | yes | The service account JSON key, pasted as-is or base64-encoded (`base64 -i key.json`) |
| `GOOGLE_DRIVE_FOLDER_ID` | recommended | ID of the "Topaz Asset Library" folder. If it's not set, the folder is looked up by name. |
| `REVALIDATE_SECRET` | recommended | Enables `/api/revalidate?secret=…` (refresh from Drive now) and manual `/api/sync?secret=…` |
| `BLOB_READ_WRITE_TOKEN` | recommended | Added automatically when you connect a Vercel Blob store (see below) |
| `CRON_SECRET` | with Blob | Any random string. Vercel sends it with the daily sync job so only Vercel can trigger it |
| `LOCAL_LIBRARY_PATH` | dev only | Reads a local copy of the library instead of Drive when no Google key is set |

See `.env.example`.

## Development

```bash
npm install
npm run dev
```

Without Google credentials, set `LOCAL_LIBRARY_PATH` in `.env.local` to a local copy of the library folder.

## Deploying to Vercel

1. Push this repo to GitHub.
2. On [vercel.com/new](https://vercel.com/new), import the repo. The framework preset is detected automatically.
3. Add the environment variables above under **Settings → Environment Variables**, then deploy.

The site re-reads Drive every 5 minutes. To refresh immediately after uploading, open
`https://<your-domain>/api/revalidate?secret=<REVALIDATE_SECRET>`.

## How media is served

**With Vercel Blob (recommended):** a sync job copies every Drive file into Vercel Blob, along with
pre-sized 800px and 2000px previews. Downloads, video playback and previews then come straight from
Vercel's CDN, so nothing passes through the site's functions.

- Blob paths include each file's Drive checksum, so a replaced file gets a new URL and caches never serve the old one.
- The sync runs daily (Vercel Cron, see `vercel.json`) and in the background after every `/api/revalidate`.
  You can also run it by hand: `/api/sync?secret=<REVALIDATE_SECRET>`. Each run copies only new or changed
  files, then deletes copies of files that were removed. If a run returns `"done": false`, it ran out of
  time; run it again to continue.
- Until a file has been copied, the site serves it through the fallback routes below.

Setup: Vercel project → **Storage → Create → Blob**, choose **Public** access, and connect it to this
project (this adds `BLOB_READ_WRITE_TOKEN`). Add `CRON_SECRET`, redeploy, then open `/api/sync?secret=…` once
for the first copy.

**Fallback routes:** the service account reads Drive and the site streams the file:

- `/api/thumb/:id?w=800`: resized preview generated by Google (images and video stills), cached by Vercel's CDN
- `/api/media/:id`: the full file, with Range support for video seeking. Add `?download=<name>` to download it.

Both routes only serve files that are part of the library. Each URL carries a signature (`?s=…`) generated when
the page is built, so the routes don't need to re-scan Drive on every request.
