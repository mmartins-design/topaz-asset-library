import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Media URLs carry a signature so /api/media and /api/thumb can confirm a file
 * belongs to the library without re-scanning Google Drive on every request.
 */
function key() {
  return process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.LOCAL_LIBRARY_PATH || "dev";
}

export function signId(id: string): string {
  return createHmac("sha256", key()).update(id).digest("base64url").slice(0, 22);
}

export function verifyId(id: string, sig: string | null): boolean {
  if (!sig) return false;
  const expected = Buffer.from(signId(id));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
