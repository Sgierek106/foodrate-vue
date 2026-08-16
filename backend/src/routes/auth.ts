import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";
import {
  createSession,
  destroySession,
  getSession,
  type SessionUser,
} from "../auth/session";
import { db } from "../database";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_COOKIE = "foodrate_session";

interface PendingState {
  nonce: string;
  createdAt: number;
  // Where to send the browser after a successful sign-in (e.g. the SPA origin)
  next?: string;
}

// One-time states issued to /auth/login, so a redirect URL can't be replayed
const pendingStates = new Map<string, PendingState>();

function newPendingState(next?: string): string {
  const state = crypto.randomBytes(16).toString("hex");
  pendingStates.set(state, { nonce: state, createdAt: Date.now(), next });
  // Opportunistic cleanup of stale states
  if (pendingStates.size > 1000) {
    const now = Date.now();
    for (const [key, value] of pendingStates) {
      if (now - value.createdAt > OAUTH_STATE_TTL_MS) pendingStates.delete(key);
    }
  }
  return state;
}

function consumePendingState(state: string): PendingState | null {
  const entry = pendingStates.get(state);
  if (!entry) return null;
  pendingStates.delete(state);
  if (Date.now() - entry.createdAt > OAUTH_STATE_TTL_MS) return null;
  return entry;
}

function getPublicBaseUrl(request: FastifyRequest): string {
  // Explicit override wins (e.g. when the app sits behind a proxy that
  // doesn't forward X-Forwarded-Proto/Host correctly)
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  const proto = request.headers["x-forwarded-proto"]?.toString() || "http";
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  return `${proto}://${host}`;
}

function setSessionCookie(reply: FastifyReply, sessionId: string) {
  reply.setCookie(SESSION_COOKIE, sessionId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60, // seconds, matches session TTL
  });
}

export default async function authRoutes(fastify: FastifyInstance) {
  // Step 1: send the browser to Google's consent screen
  fastify.get("/auth/login", async (request, reply) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return reply.code(503).send({
        error:
          "Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the backend.",
      });
    }

    const { next } = request.query as { next?: string };
    const state = newPendingState(next);
    const redirectUri = `${getPublicBaseUrl(request)}/api/auth/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
      access_type: "online",
    });

    return reply.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  });

  // Step 2: Google redirects back here with ?code=...&state=...
  fastify.get("/auth/callback", async (request, reply) => {
    const { code, state, error } = request.query as {
      code?: string;
      state?: string;
      error?: string;
    };

    if (error) {
      return reply
        .code(400)
        .send({ error: `Google sign-in was cancelled: ${error}` });
    }
    if (!code || !state) {
      return reply.code(400).send({ error: "Missing code or state" });
    }
    const pending = consumePendingState(state);
    if (!pending) {
      return reply
        .code(400)
        .send({ error: "Invalid or expired sign-in state, please try again" });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return reply
        .code(503)
        .send({ error: "Google sign-in is not configured" });
    }

    const redirectUri = `${getPublicBaseUrl(request)}/api/auth/callback`;

    // Exchange the authorization code for tokens
    let tokenResponse: Response;
    try {
      tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
    } catch (err) {
      fastify.log.error({ err }, "Failed to reach Google token endpoint");
      return reply.code(502).send({ error: "Could not reach Google" });
    }

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text();
      fastify.log.error(
        { status: tokenResponse.status, body },
        "Google token exchange failed",
      );
      return reply
        .code(502)
        .send({ error: "Google rejected the authorization code" });
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
    };

    // Fetch the user's profile
    let userInfoResponse: Response;
    try {
      userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
    } catch (err) {
      fastify.log.error({ err }, "Failed to reach Google userinfo endpoint");
      return reply.code(502).send({ error: "Could not reach Google" });
    }

    if (!userInfoResponse.ok) {
      return reply
        .code(502)
        .send({ error: "Could not load your Google profile" });
    }

    const profile = (await userInfoResponse.json()) as {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
    };

    if (!profile.email) {
      return reply
        .code(502)
        .send({ error: "Google profile did not include an email address" });
    }

    // Sign-in allowlist: family_members doubles as the list of permitted
    // Google accounts. An empty table means open access; once it has
    // records, only those emails may sign in.
    const { rows: memberCountRows } = await db.execute(
      "SELECT COUNT(*) AS count FROM family_members",
    );
    if (Number(memberCountRows[0].count) > 0) {
      const { rows: matches } = await db.execute(
        "SELECT id FROM family_members WHERE email = ? COLLATE NOCASE",
        [profile.email],
      );
      if (matches.length === 0) {
        return reply.code(403).send({
          error:
            "This Google account is not on the family list. Ask a family member to add your email address.",
        });
      }
    }

    const user: SessionUser = {
      email: profile.email,
      name: profile.name || profile.email,
      picture: profile.picture,
      sub: profile.sub,
    };

    const sessionId = await createSession(user);
    setSessionCookie(reply, sessionId);

    // Return to the app (the SPA reads /auth/me to pick up the session).
    // Prefer the origin the SPA asked for (works when the frontend is served
    // from a different port in dev), then APP_URL, then the backend root.
    const appUrl = pending.next || process.env.APP_URL || "/";
    return reply.redirect(appUrl);
  });

  // Current user (or 401 if not signed in)
  fastify.get("/auth/me", async (request, reply) => {
    const sessionId = request.cookies[SESSION_COOKIE];
    const session = await getSession(sessionId);
    if (!session) {
      return reply.code(401).send({ error: "Not signed in" });
    }
    return session.user;
  });

  // Sign out
  fastify.post("/auth/logout", async (request, reply) => {
    const sessionId = request.cookies[SESSION_COOKIE];
    await destroySession(sessionId);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  });
}
