---
name: docker-compose
description: >-
  Docker and Docker Compose standards for USC. Use when editing Dockerfiles,
  docker-compose.yml, container ports, env forwarding, or debugging
  containerized frontend/backend services.
---

# Docker & Compose (USC)

## Layout

| Service | Dockerfile | Port | User |
|---------|------------|------|------|
| backend | `backend/Dockerfile` | 5000 | non-root `node` |
| frontend | `frontend/Dockerfile` | 3000 | unprivileged nginx |

## Compose (`docker-compose.yml`)

- Run from repo root: `docker compose up --build`
- Backend loads root `.env` via `env_file: .env` and `${GEMINI_API_KEY}` substitution.
- Never bake API keys into images.

## Hardening

- Multi-stage builds: builder installs deps + compiles; runner carries only production artifacts.
- Backend: `node:18-alpine`, `USER node`.
- Frontend: Vite build stage on **Node 20+** (Vite 8 requirement) → `nginxinc/nginx-unprivileged` runner with `nginx.conf` SPA fallback.

## Env vars forwarded to backend

```
PORT, NODE_ENV, GEMINI_API_KEY, BITREFILL_API_KEY, BITREFILL_API_URL, FRONTEND_URL
```

## Frontend build pitfall: `npm ci` ERESOLVE

If `docker compose build` fails on `frontend` with `ERESOLVE` / `lucide-react` peer React conflict:

- Root cause: Dockerfile runs `npm ci` strictly; React 19 + outdated peer ranges fail unlike local `--legacy-peer-deps`.
- Ensure `frontend/.npmrc` exists (`legacy-peer-deps=true`) and is `COPY`d before `npm ci` in `frontend/Dockerfile`.
- Upgrade incompatible packages (e.g. `lucide-react` ≥ 1.20 for React 19).
- Regenerate lockfile: `cd frontend && npm install`.

**Node version:** `frontend/Dockerfile` builder must use `node:20-alpine` or newer — Vite 8 fails on Node 18 (`CustomEvent is not defined`).

See also `.cursor/skills/react-frontend/SKILL.md`.

## Verify

```bash
docker compose up --build
# Frontend http://localhost:3000
# Backend  http://localhost:5000/health
```
