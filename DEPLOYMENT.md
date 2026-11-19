# Deployment Guide

This app can be deployed either to a **PaaS** (Railway — recommended for a
public URL with minimal ops) or **on-premises** with Docker Compose. Both use
the same Dockerfiles.

## PaaS Deployment (Railway)

Railway is a good fit: it builds from your existing Dockerfiles, gives each
service an HTTPS domain automatically, and supports persistent volumes (needed
for the SQLite database and uploaded photos).

The app runs as **two services**: `backend` (Fastify API) and `frontend`
(nginx + Vue SPA). The frontend proxies `/api/*` to the backend, so from the
browser's point of view everything is same-origin and the session cookie works
without any CORS setup.

### Prerequisites

- A [Railway](https://railway.app) account
- Your code pushed to GitHub (this repo already has a remote)
- Google OAuth client ID/secret (already set up)

### Step 1 — Create the two services

1. In Railway, click **New Project → Deploy from GitHub repo** and select this repo.
2. Because there are two Dockerfiles in subdirectories, create the services
   manually:
   - **New Service → Deploy from GitHub repo**
   - **backend** service: set **Root Directory** to `backend` (uses `backend/Dockerfile`).
   - **frontend** service: set **Root Directory** to `frontend` (uses `frontend/Dockerfile`).

### Step 2 — Backend configuration

On the **backend** service:

1. **Variables** tab — add:

   | Variable               | Value                                                 |
   | ---------------------- | ----------------------------------------------------- |
   | `GOOGLE_CLIENT_ID`     | your OAuth client ID                                  |
   | `GOOGLE_CLIENT_SECRET` | your OAuth client secret                              |
   | `GOOGLE_PLACES_API_KEY`  | (optional) your Maps key                              |
   | `NODE_ENV`             | `production`                                          |
   | `DATABASE_URL`         | `file:/app/data/foodrate.db` _(optional — see below)_ |
   | `DATA_DIR`             | `/app/data`                                           |
   | `PUBLIC_URL`           | _(set in Step 4)_                                     |

   **Database — pick one:**
   - **Local SQLite (default):** keep `DATABASE_URL=file:/app/data/foodrate.db`.
   - **Turso:** omit `DATABASE_URL` and set `TURSO_URL` and `TURSO_AUTH_TOKEN`
     instead. The backend falls back to Turso automatically when
     `DATABASE_URL` is not set.

2. **Volumes** tab — add a volume and set the **mount path** to `/app/data`.
   This persists uploaded photos (and the SQLite database, if you're not
   using Turso) across deploys. Without a volume, photos are wiped on every
   redeploy.

### Step 3 — Frontend configuration

On the **frontend** service:

1. **Variables** tab — add:

   | Variable      | Value             |
   | ------------- | ----------------- |
   | `BACKEND_URL` | _(set in Step 4)_ |

   `BACKEND_URL` is the URL nginx forwards `/api/*` to. It defaults to
   `http://backend:3001` (works with docker-compose) but on Railway you must
   point it at the backend's public domain.

### Step 4 — Wire up the domains

The two services reference each other, so wire them in this order:

1. **Backend** → **Settings → Networking** → **Generate Domain**. Copy the
   domain, e.g. `https://abc123.up.railway.app`.
2. **Frontend** → **Variables** → set `BACKEND_URL=https://abc123.up.railway.app`.
3. **Frontend** → **Settings → Networking** → **Generate Domain**. Copy the
   domain, e.g. `https://def456.up.railway.app`.
4. **Backend** → **Variables** → set `PUBLIC_URL=https://def456.up.railway.app`.

`PUBLIC_URL` is used to build the Google OAuth redirect URI, so it must be the
domain the user actually visits (the frontend).

### Step 5 — Update Google OAuth

In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
edit your OAuth client and add:

- **Authorized JavaScript origins**: `https://def456.up.railway.app`
- **Authorized redirect URIs**: `https://def456.up.railway.app/api/auth/callback`

(Replace with your actual frontend domain.)

### Step 6 — Verify

Open `https://def456.up.railway.app` in your browser. You should see the
"Sign in with Google" screen. Sign in and confirm you can add a rating and
upload a photo.

### Notes

- **Custom domain**: In **Settings → Networking** on the frontend service you
  can add a custom domain (e.g. `foodrate.yourdomain.com`). Railway provisions
  a TLS certificate automatically. If you do, update `PUBLIC_URL` and the
  Google OAuth origins/redirect URIs to the custom domain.
- **Data persistence**: The volume at `/app/data` holds both the database and
  photos. Download the volume from the Railway dashboard for a backup.
- **Turso alternative**: To avoid a volume for the database, set `TURSO_URL`
  and `TURSO_AUTH_TOKEN` instead of `DATABASE_URL`. You'd still need a volume
  (or object storage) for photos.

---

## On-Premises Deployment

### Prerequisites

- **Docker** and **Docker Compose** installed on the target server
- Port `80` available (frontend) and optionally port `3001` (backend health checks)

## Quick Start

```bash
# 1. Copy the environment template
cp .env.example .env

# 2. Edit .env - set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (required)
#    and GOOGLE_PLACES_API_KEY (optional)
#    The database will use local SQLite by default — no cloud dependency needed

# 3. Build and start
docker compose up --build -d

# 4. Verify
curl http://localhost/health   # should return {"status":"ok",...}
```

The app will be available at `http://<server-ip>`.

## Environment Variables

| Variable               | Required                 | Default                      | Description                                            |
| ---------------------- | ------------------------ | ---------------------------- | ------------------------------------------------------ |
| `DATABASE_URL`         | No (uses SQLite default) | `file:/app/data/foodrate.db` | Local SQLite path                                      |
| `TURSO_URL`            | No                       | —                            | Turso cloud database URL (alternative to SQLite)       |
| `TURSO_AUTH_TOKEN`     | No                       | —                            | Turso auth token (only if using Turso)                 |
| `GOOGLE_PLACES_API_KEY`  | No                       | —                            | Google Maps Places API key for autocomplete            |
| `GOOGLE_CLIENT_ID`     | **Yes**                  | —                            | Google OAuth client ID (sign-in)                       |
| `GOOGLE_CLIENT_SECRET` | **Yes**                  | —                            | Google OAuth client secret (sign-in)                   |
| `PUBLIC_URL`           | No                       | request `Host` header        | Public URL of the app, used for the OAuth redirect URI |
| `HTTP_PORT`            | No                       | `80`                         | Host port the frontend (nginx) is published on         |
| `PORT`                 | No                       |  `3001`                       | Backend server port                                  |

## Google Sign-In Setup

The app requires Google sign-in — every API request needs a valid session.

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and select (or create) a project.
2. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**.
3. Choose **Web application** as the application type.
4. Fill in:
   - **Authorized JavaScript origins**: `https://your-domain.com`
   - **Authorized redirect URIs**: `https://your-domain.com/api/auth/callback`
5. Copy the client ID and secret into `.env` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

> **Note:** For local development over `http://localhost`, add
> `http://localhost:5173` (JavaScript origin) and
> `http://localhost:3001/api/auth/callback` (redirect URI) to the same OAuth
> client. Sessions are stored in memory on the backend, so restarting the
> backend signs everyone out.

## Database Modes

### Local SQLite (default, recommended for UAT)

No external services needed. Data persists in a Docker volume (`db-data`).

```env
DATABASE_URL=file:/app/data/foodrate.db
```

### Turso Cloud (for production)

Uncomment and fill in `TURSO_URL` and `TURSO_AUTH_TOKEN` in `.env`.

## Remote Access with Tailscale (recommended)

Avoids router port forwarding and gives the app real HTTPS (required for
Google OAuth outside the LAN). Only devices on your tailnet can reach it.

### One-time setup

1. Create a free tailnet at https://login.tailscale.com and generate an
   **auth key** at https://login.tailscale.com/key. Add it to `.env`:
   `TS_AUTHKEY=tskey-aut
2. Start the stack with the Tailscale overlay:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.tailscale.yml up -d
   ```
3. In the Tailscale admin console, authorize the new `foodrate` machine and
   enable HTTPS for it (**... → Enable HTTPS**). This provisions a certificate
   for `foodrate.<your-tailnet>.ts.net`.
4. The `tailscale serve` config (see `tailscale-serve.json`) terminates TLS
   and forwards to the frontend. Verify from a tailnet device:
   ```bash
   curl https://foodrate.<your-tailnet>.ts.net/health
   ```

### Point the app at the HTTPS URL

1. `.env`: `PUBLIC_URL=https://foodrate.<your-tailnet>.ts.net` then
   `docker compose ... up -d` to reload.
2. Google Cloud Console → OAuth client — add:
   - Authorized JavaScript origins: `https://foodrate.<your-tailnet>.ts.net`
   - Authorized redirect URIs: `https://foodrate.<your-tailnet>.ts.net/api/auth/callback`

### Install Tailscale on client devices

Install the Tailscale app (phone/laptop), sign in to the same tailnet, and
open the `https://foodrate...ts.net` URL. No ports are exposed to the
internet at any point.

---

## Useful Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Rebuild after code changes
docker compose up --build -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Access backend shell
docker compose exec backend sh
```

## Directory Structure

```
foodrate/
├── docker-compose.yml      # Orchestration config
├── .env.example            # Environment template
├── .env                    # Your actual config (git-ignored)
├── backend/
│   ├── Dockerfile          # Backend container (Node.js + Fastify)
│   └── .dockerignore
└── frontend/
    ├── Dockerfile          # Frontend container (Nginx + Vue SPA)
    ├── nginx.conf          # Nginx config with API reverse proxy
    └── .dockerignore
```

## Architecture

```
User Browser
     │
     ▼
  :80 ──→ Nginx (Frontend Container)
              │
              ├─ serves Vue SPA static files
              │
              └─ proxies /api/* → Backend Container (:3001)
                                         │
                                         ├─ /api/auth/* → Google OAuth (login, callback, me, logout)
                                         │
                                         └─ Fastify API (session required) → SQLite (Docker Volume)
```

All `/api` routes except `/api/auth/login` and `/api/auth/callback` require a
valid session cookie. The SPA shows a "Sign in with Google" screen until the
user has a session.
