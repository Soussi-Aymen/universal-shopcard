---
name: nodejs-express-backend
description: >-
  Node.js Express backend patterns for USC Agent-Bridge. Use when editing
  backend/src, Express routes, middleware, env config, Gemini service, or
  Bitrefill MCP client code.
---

# Node.js & Express Backend (USC)

## Entry & middleware

- `backend/src/index.ts` — Helmet, CORS (locked to `FRONTEND_URL`), rate limit, `/health`, global error handler.
- Do not log `GEMINI_API_KEY` or `BITREFILL_API_KEY`.

## Environment

- Root `.env` is the source of truth; loaded by `backend/src/config/env.ts`.
- Validate required vars at startup; throw on missing `GEMINI_API_KEY`.
- `BITREFILL_API_KEY=mock` enables mock catalog only — with real keys, use live MCP.

## Services

| Service | Role |
|---------|------|
| `gemini.service.ts` | Parse user prompt → `{ country, items[] }` |
| `mcp.service.ts` | JSON-RPC to Bitrefill: `search-products`, `get-product-details`, `buy-products` |

## API routes (`backend/src/routes/api.ts`)

- `POST /api/intent` — prompt → Gemini → MCP search → top 3 products
- `POST /api/checkout` — `buy-products` with `payment_method: "bitcoin"`

## Scripts

```bash
npm run dev    # ts-node-dev, port 5000
npm run build  # tsc → dist/
npm run lint
```
