import path from "path";
import fs from "fs";

/**
 * Uploaded rating photos are stored on disk next to the database file
 * (e.g. /app/data/photos in Docker, ./data/photos in local dev).
 */
export const PHOTOS_DIR = path.join(
  process.env.DATA_DIR || path.join(process.cwd(), "data"),
  "photos",
);

/**
 * Ensure the photos directory exists. Called at startup.
 */
export function ensurePhotosDir() {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}
