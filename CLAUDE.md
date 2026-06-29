# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (starts React + Electron in parallel)
npm run dev

# Transpile Electron main process only
npm run transpile:electron

# Type-check + Vite build (React)
npm run build

# Lint
npm run lint

# Production builds
npm run dist:mac    # macOS DMG (arm64)
npm run dist:win    # Windows NSIS + portable (x64)
npm run dist:linux  # Linux AppImage (x64)

# Clean build artifacts
npm run clean
```

The dev server runs on port 5123 (strict). When `NODE_ENV=development`, `NODE_TLS_REJECT_UNAUTHORIZED=0` is set in `resourceManager.ts` — this must never reach production builds. DevTools can be toggled in any build with **Cmd/Ctrl+Shift+I**.

## Architecture

This is an Electron + React + TypeScript desktop app. The process boundary is the core architectural concern.

### Three-process model

**Main process** (`src/electron/`)
- `main.ts` — app bootstrap, `BrowserWindow`, tray icon, IPC handler registration, DevTools shortcut
- `resourceManager.ts` — all system data collection (`systeminformation`, `os`, `fs`), polling loop, report builder, API submission. Polls CPU/RAM/network every 3s; storage every 30s. Fires an immediate poll on startup to avoid loading delay.
- `load-env.ts` — loads `.env` from project root in dev, from `process.resourcesPath` in packaged builds
- `preload.cts` — compiled as CommonJS (`.cts`), bridges main ↔ renderer with a channel whitelist
- `util.ts` — typed `ipcMainHandle` / `ipcWebContentsSend` wrappers + frame URL validation (checks `localhost:5123` in dev, file URL in prod)
- `pathResolver.ts` — resolves UI and preload paths for packaged vs. dev modes

**Renderer** (`src/ui/`)
- Single-page React app. Accesses system data only through `window.electron` — never directly via Node.js.
- `App.tsx` — all UI: live stats bars, static device info cards, "Send To IT" button with code prompt modal. Button color reflects state: accent (idle) → blue (sending) → green (success) → red (error).

**Shared types** (`types.d.ts` at root)
- `Statistics`, `StaticData`, `InfoFilesObject`, `EventPayloadMapping`, `Window["electron"]` — all global, no imports needed.

### IPC contract

| Direction | Channel | Payload |
|-----------|---------|---------|
| Renderer → Main (invoke) | `getStaticData` | none → `StaticData` |
| Renderer → Main (invoke) | `sendToIT` | `{ data: StaticData, stats: Statistics, code: string }` → `SendToITResponse` |
| Main → Renderer (push) | `statistics` | `Statistics` (every 3s) |

### API endpoints

Hardcoded in `resourceManager.ts` `CONFIG` object — not environment variables. Only `AUTH_TOKEN` comes from `.env`.

Both API calls use `net.fetch` (Electron's network stack) which uses the system certificate store, avoiding TLS issues with internal certificates.

### Info files

The app reads device metadata from flat `.txt` files:
- **Windows:** `C:/info/`
- **Mac/Linux:** `~/info/`

Files: `RCTag.txt`, `Department.txt`, `AssignedLocationBuilding.txt`, `AssignedLocationRoom.txt`, `LocalAccount.txt`, `OwnerFirstName.txt`, `OwnerLastName.txt`, `OwnerEmail.txt`, `UsageType.txt`, `YearModel.txt`

### Build pipeline

- Electron main/preload: `tsc --project src/electron/tsconfig.json` → outputs to `dist-electron/`
- React renderer: `vite build` → outputs to `dist-react/`
- Packaging: `electron-builder` reads `electron-builder.json`; `scripts/afterPack.cjs` strips xattrs post-pack (macOS)
- The preload is compiled as `.cjs` (CommonJS) because Electron's `sandbox: true` requires it
- `.env` is bundled into `extraResources` so packaged builds can read it at `process.resourcesPath/.env`

### Environment variables

Only one required at runtime:

| Variable | Purpose |
|----------|---------|
| `AUTH_TOKEN` | Bearer token for both API calls |

### Windows build

Run `build-windows.bat` on the Windows machine. It installs Node.js if needed, creates `.env` from `scripts/env-values.txt` if present, runs `npm install`, and builds. Output goes to `release/`.
