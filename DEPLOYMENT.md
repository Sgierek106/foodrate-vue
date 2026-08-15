# On-Premises Deployment Guide

## Prerequisites

- **Docker** and **Docker Compose** installed on the target server
- Port `80` available (frontend) and optionally port `3000` (backend health checks)

## Quick Start

```bash
# 1. Copy the environment template
cp .env.example .env

# 2. Edit .env - set your Google Maps API key (optional)
#    The database will use local SQLite by default — no cloud dependency needed

# 3. Build and start
docker compose up --build -d

# 4. Verify
curl http://localhost/health   # should return {"status":"ok",...}
```

The app will be available at `http://<server-ip>`.

## Environment Variables

| Variable              | Required                 | Default                      | Description                                      |
| --------------------- | ------------------------ | ---------------------------- | ------------------------------------------------ |
| `DATABASE_URL`        | No (uses SQLite default) | `file:/app/data/foodrate.db` | Local SQLite path                                |
| `TURSO_URL`           | No                       | —                            | Turso cloud database URL (alternative to SQLite) |
| `TURSO_AUTH_TOKEN`    | No                       | —                            | Turso auth token (only if using Turso)           |
| `GOOGLE_MAPS_API_KEY` | No                       | —                            | Google Maps Places API key for autocomplete      |
| `PORT`                | No                       | `3000`                       | Backend server port                              |

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
                                         └─ Fastify API → SQLite (Docker Volume)
```
