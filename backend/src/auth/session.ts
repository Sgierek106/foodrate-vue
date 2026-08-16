import crypto from "crypto";
import { db } from "../database";

export interface SessionUser {
  /** Google account email (unique per family member) */
  email: string;
  /** Display name from the Google account */
  name: string;
  /** Google avatar URL, if available */
  picture?: string;
  /** Google account ID (stable, opaque) */
  sub: string;
}

interface Session {
  user: SessionUser;
  createdAt: number;
  lastSeenAt: number;
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // hourly

/**
 * Sessions are persisted in the database so they survive backend restarts.
 * The session id is a random 256-bit token; the user profile is stored as JSON.
 */
export async function createSession(user: SessionUser): Promise<string> {
  const id = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  await db.execute(
    "INSERT INTO sessions (id, user_json, created_at, last_seen_at) VALUES (?, ?, ?, ?)",
    [id, JSON.stringify(user), now, now],
  );
  return id;
}

export async function getSession(
  id: string | undefined,
): Promise<Session | undefined> {
  if (!id) return undefined;
  const { rows } = await db.execute(
    "SELECT user_json, last_seen_at FROM sessions WHERE id = ?",
    [id],
  );
  if (rows.length === 0) return undefined;

  const lastSeenAt = Number(rows[0].last_seen_at);
  if (Date.now() - lastSeenAt > SESSION_TTL_MS) {
    await db.execute("DELETE FROM sessions WHERE id = ?", [id]);
    return undefined;
  }

  // Refresh last-seen (throttled to once per minute to limit writes)
  if (Date.now() - lastSeenAt > 60 * 1000) {
    await db.execute("UPDATE sessions SET last_seen_at = ? WHERE id = ?", [
      Date.now(),
      id,
    ]);
  }

  let user: SessionUser;
  try {
    user = JSON.parse(rows[0].user_json as string);
  } catch {
    return undefined;
  }
  return { user, createdAt: 0, lastSeenAt };
}

export async function destroySession(id: string | undefined): Promise<void> {
  if (id) {
    await db.execute("DELETE FROM sessions WHERE id = ?", [id]);
  }
}

// Periodically drop expired sessions so the table doesn't grow unbounded
const cleanupTimer = setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  db.execute("DELETE FROM sessions WHERE last_seen_at < ?", [cutoff]).catch(
    (err) => console.error("Session cleanup failed:", err),
  );
}, CLEANUP_INTERVAL_MS);
cleanupTimer.unref();
