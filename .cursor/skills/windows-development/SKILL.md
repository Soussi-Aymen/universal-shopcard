---
name: windows-development
description: >-
  Windows shell safety for USC on win32. Use when running terminal commands,
  npm scripts, Docker, or file paths on Windows. Prevents CMD/PowerShell
  hallucinations, cd misuse, and path escaping errors.
---

# Windows Development (USC)

## Command safety

- Verify files and folders exist before running commands.
- Use the tool `working_directory` parameter instead of shell `cd`.
- Prefer built-in file tools (Read, Write, StrReplace, Glob) over `mkdir`, `rm`, `cp`, `echo`, or `cat`.
- Wrap paths in double quotes when shell arguments contain spaces.
- If PowerShell blocks package scripts, use `cmd.exe /c pnpm run ...` or invoke `node` directly.

## Paths

- Use forward slashes in docs and skill references (`backend/src`, not `backend\src`).
- Project root: `c:\Users\Aymen\Desktop\universal-shopcard` (or repo root relative paths).

## Docker on Windows

- Requires Docker Desktop running.
- Run `docker compose` from the repo root where `docker-compose.yml` and `.env` live.
