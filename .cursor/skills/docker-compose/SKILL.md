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

## Frontend build (pnpm)

Docker builder uses `node:20-alpine` with Corepack + `pnpm install --frozen-lockfile`. Copy `package.json`, `pnpm-lock.yaml`, and `.npmrc` before install.

**Node version:** `frontend/Dockerfile` builder must use `node:20-alpine` or newer — Vite 8 fails on Node 18.

After changing `package.json`, regenerate the lockfile: `cd frontend && pnpm install`.

See also `.cursor/skills/react-frontend/SKILL.md`.

## Verify

```bash
docker compose up --build
# Frontend http://localhost:3000
# Backend  http://localhost:5000/health
```
