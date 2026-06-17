---
name: typescript-strict
description: >-
  TypeScript strict-mode standards for USC backend and frontend. Use when
  writing or editing .ts/.tsx files, API types, service interfaces, or
  tsconfig.json. Enforces no-any and explicit typing.
---

# TypeScript Strict Mode (USC)

## Compiler

- Keep `"strict": true` in `backend/tsconfig.json` and `frontend/tsconfig.json`.
- Run `npm run build` and `npm run lint` in the affected package before finishing.

## Typing rules

- Never use `any`. Type API bodies, service returns, Express handlers, and React props explicitly.
- Define shared interfaces in the service or component file that owns the data (e.g. `Product` in `mcp.service.ts`, re-exported where needed).
- Prefer `unknown` + narrowing over `any` when parsing external JSON.

## Key typed surfaces

| Area | File |
|------|------|
| Config | `backend/src/config/env.ts` |
| MCP types | `backend/src/services/mcp.service.ts` |
| Gemini intent | `backend/src/services/gemini.service.ts` |
| API routes | `backend/src/routes/api.ts` |
| React components | `frontend/src/components/*.tsx` |
