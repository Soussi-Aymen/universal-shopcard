# AGENTS.md — Universal ShopCard (USC)

Project instructions for Cursor agents. Read this before making changes.

## What this is

**Universal ShopCard (USC)** — zero-chat, single-prompt commerce UI. User types one travel/shopping need; the backend Agent-Bridge parses intent with Gemini, queries Bitrefill MCP, returns top 3 products, and handles Bitcoin checkout via invoice/QR.

Hackathon: [PROMPT x PURCHASE — Bitrefill 2026](https://stadium.joinwebzero.com/programs/bitrefill-2026)

## Stack & ports

| Layer | Tech | Port |
|-------|------|------|
| Frontend | React 19, TypeScript, Vite, vanilla CSS | `3000` (Docker) / `5173` (dev) |
| Backend | Node.js, Express, TypeScript, Gemini SDK | `5000` |
| External | Bitrefill MCP JSON-RPC | `https://api.bitrefill.com/mcp` |

## Where to change what

| Task | File(s) |
|------|---------|
| Express app, middleware, health | `backend/src/index.ts` |
| Env vars, `.env` loading | `backend/src/config/env.ts` |
| API routes (`/api/intent`, `/api/checkout`) | `backend/src/routes/api.ts` |
| Gemini prompt → structured search | `backend/src/services/gemini.service.ts` |
| Bitrefill MCP client, mock catalog | `backend/src/services/mcp.service.ts` |
| App state, fetch calls to backend | `frontend/src/App.tsx` |
| Prompt input UI | `frontend/src/components/PromptInput.tsx` |
| Product cards (top 3) | `frontend/src/components/ProductCard.tsx` |
| Cart sidebar, checkout, QR modal | `frontend/src/components/ShopCard.tsx` |
| Theme / glassmorphism CSS | `frontend/src/index.css` |
| Docker orchestration | `docker-compose.yml` |
| Backend container | `backend/Dockerfile` |
| Frontend container + nginx | `frontend/Dockerfile`, `frontend/nginx.conf` |
| Agent behavior rules | `.cursor/rules/karpathy-guidelines.mdc` |
| Project skills (Windows, TS, Node, Docker, React) | `.cursor/skills/` |
| Human run instructions | `README.md` |

## Core user flow (do not break)

1. User submits one prompt → `POST /api/intent`
2. Gemini parses country + search items → MCP `search-products`
3. Backend returns **exactly top 3** products
4. User adds items to **Universal ShopCard** sidebar
5. Checkout → `POST /api/checkout` → Bitrefill `buy-products` via API v2 (`BITREFILL_PAYMENT_METHOD`, default `balance`)
6. Use **test products** (`BITREFILL_INCLUDE_TEST_PRODUCTS=true`) for $0 demos; real products spend developer balance

## Environment

**`.env` lives at the project root** (not `backend/.env`).

```env
GEMINI_API_KEY=...
BITREFILL_API_KEY=...          # real key for live catalog + checkout (not "mock")
BITREFILL_PAYMENT_METHOD=balance
BITREFILL_INCLUDE_TEST_PRODUCTS=true   # free test-gift-card-code for $0 demo
BITREFILL_ENABLE_PAYMENT=true          # false blocks checkout only
BITREFILL_API_URL=https://api.bitrefill.com/mcp
BITREFILL_API_V2_URL=https://api.bitrefill.com/v2
PORT=5000
FRONTEND_URL=http://localhost:3000
```

- Copy from `.env.example`
- `backend/src/config/env.ts` loads root `.env` first, then `backend/.env` fallback
- Docker Compose reads root `.env` via `env_file` + `${VAR}` substitution
- Never commit `.env` or log API keys

**Live vs mock:** `BITREFILL_API_KEY=mock` uses local mock catalog only. Real key + `balance` checkout uses developer credits. See `.cursor/rules/bitrefill-developer-credits.mdc`.

## Run

```bash
# Docker (from repo root)
docker compose up --build

# Local dev — backend
cd backend && npm install && npm run dev

# Local dev — frontend (separate terminal)
cd frontend && npm install --legacy-peer-deps && npm run dev
```

Frontend API base: `VITE_API_BASE` or default `http://localhost:5000` in `App.tsx`.

## Conventions

- **TypeScript strict** (`strict: true`) in both `backend/` and `frontend/` — no `any`
- **Surgical edits** — touch only files required for the task
- **Windows** — use tool `working_directory` instead of shell `cd`; quote paths with spaces
- **Verify** — `npm run build` and `npm run lint` in each package before finishing
- **Secrets** — env vars only; never hardcode keys in source

## API reference

| Route | Body | Returns |
|-------|------|---------|
| `POST /api/intent` | `{ prompt: string }` | `{ success, country, products[] }` |
| `POST /api/checkout` | `{ items: [{ productId, packageId }] }` | `{ success, invoices[] }` |
| `GET /health` | — | `{ status: "ok" }` |

Bitrefill MCP tools: `search-products`, `get-product-details`, `buy-products`  
Spec: https://github.com/bitrefill/bitrefill-mcp-server

## Cursor agent setup

| Path | Purpose |
|------|---------|
| `AGENTS.md` | Project context and change map (this file) |
| `.cursor/rules/karpathy-guidelines.mdc` | Core behavioral guardrails (always applied) |
| `.cursor/skills/windows-development/` | Windows shell safety |
| `.cursor/skills/typescript-strict/` | Strict TypeScript, no `any` |
| `.cursor/skills/nodejs-express-backend/` | Backend Agent-Bridge patterns |
| `.cursor/skills/docker-compose/` | Container orchestration |
| `.cursor/skills/react-frontend/` | React UI patterns |

## Repo layout

```
universal-shopcard/
├── AGENTS.md              # agent project context
├── .cursor/
│   ├── rules/             # always-on behavioral rules
│   └── skills/            # domain skills (Windows, TS, Node, Docker, React)
├── .env.example
├── docker-compose.yml
├── backend/src/
└── frontend/src/
```

Local-only (gitignored): `plan.md`, `.env`
