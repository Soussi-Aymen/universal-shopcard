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
pnpm install
pnpm run dev     # Vite, port 5173
pnpm run build
pnpm run lint
```

## pnpm (React 19 peers)

pnpm resolves peer dependencies without npm's `legacy-peer-deps` workaround. Each package pins `packageManager` in `package.json`; run `corepack enable` once locally. Docker builds use `pnpm install --frozen-lockfile` via Corepack in `frontend/Dockerfile`.
