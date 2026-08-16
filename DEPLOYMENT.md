# On-Premises Deployment Guide

## Prerequisites

- **Docker** and **Docker Compose** installed on the target server
- Port `80` available (frontend) and optionally port `3000` (backend health checks)

## Quick Start

```bash
# 1. Copy the environment template
cp .env.example .env

# 2. Edit .env - set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (required)
#    and GOOGLE_MAPS_API_KEY (optional)
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
| `GOOGLE_MAPS_API_KEY`  | No                       | —                            | Google Maps Places API key for autocomplete            |
| `GOOGLE_CLIENT_ID`     | **Yes**                  | —                            | Google OAuth client ID (sign-in)                       |
| `GOOGLE_CLIENT_SECRET` | **Yes**                  | —                            | Google OAuth client secret (sign-in)                   |
| `PUBLIC_URL`           | No                       | request `Host` header        | Public URL of the app, used for the OAuth redirect URI |
| `PORT`                 | No                       | `3000`                       | Backend server port                                    |

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
> `http://localhost:3000/api/auth/callback` (redirect URI) to the same OAuth
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
              └─ proxies /api/* → Backend Container (:3000)
                                         │
                                         ├─ /api/auth/* → Google OAuth (login, callback, me, logout)
                                         │
                                         └─ Fastify API (session required) → SQLite (Docker Volume)
```

All `/api` routes except `/api/auth/login` and `/api/auth/callback` require a
valid session cookie. The SPA shows a "Sign in with Google" screen until the
user has a session.
