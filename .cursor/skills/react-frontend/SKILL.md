---
name: react-frontend
description: >-
  React frontend patterns for USC. Use when editing frontend/src components,
  App state, CSS theme, Vite config, or API fetch calls to the Agent-Bridge.
---

# React Frontend (USC)

## Structure

| File | Role |
|------|------|
| `App.tsx` | State hub: products, cart, checkout, errors, API calls |
| `PromptInput.tsx` | Single-prompt input + loading |
| `ProductCard.tsx` | Top-3 product display, add to ShopCard |
| `ShopCard.tsx` | Sticky sidebar, totals, checkout, QR invoice modal |
| `index.css` | Deep Space Dark glassmorphism design tokens |

## API

- Base URL: `import.meta.env.VITE_API_BASE || 'http://localhost:5000'`
- `POST /api/intent` with `{ prompt }`
- `POST /api/checkout` with `{ items: [{ productId, packageId }] }`

## Practices

- One visual concern per component; keep state in `App.tsx` (no Redux).
- Use CSS custom properties from `index.css` — avoid inline styles for new UI unless matching existing error banners.
- Avoid unnecessary re-renders; memoize only when a measured problem exists.

## Scripts

```bash
npm install
npm run dev     # Vite, port 5173
npm run build
npm run lint
```

## npm peer dependencies (React 19 + Docker)

**Problem:** `npm ci` in `frontend/Dockerfile` fails with `ERESOLVE` when a dependency's `peerDependencies` do not list React 19 (e.g. old `lucide-react@0.395` only allowed React 16–18).

**Local dev may work** with `npm install --legacy-peer-deps` while **Docker fails** because the Dockerfile runs plain `npm ci` without that flag.

**Fix checklist:**

1. Prefer upgrading the conflicting package to a React-19-compatible version (USC uses `lucide-react@^1.20.0+`).
2. Keep `frontend/.npmrc` with `legacy-peer-deps=true` so local install and Docker `npm ci` behave the same.
3. Copy `.npmrc` into the Docker builder stage **before** `npm ci`.
4. After changing `package.json`, regenerate `package-lock.json` with `npm install` in `frontend/`.
5. `frontend/Dockerfile` builder image must be **Node 20+** (`node:20-alpine`) — Vite 8 does not run on Node 18.

**Verify Docker build:**

```bash
docker compose build frontend
```
