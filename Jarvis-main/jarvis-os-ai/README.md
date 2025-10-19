# JARVIS OS — Vite + React + Express (Uploads)

> Futuristic enterprise OS prototype: animated landing, Vision (chat + voice demo), Dashboard, Projects (create, view, upload), Team Assembler prototype, and a lightweight file-upload backend.

## Quick Start

```bash
# 1) Install dependencies at the project root
npm install

# 2) Start frontend + backend together
npm run dev

# Frontend: http://localhost:8080
# Backend:  http://localhost:4000
```

- If Windows Firewall prompts, allow Node.js on Private networks.
- Backend status: open `http://localhost:4000/`
- Uploaded files index: `http://localhost:4000/uploads/`

## Requirements
- Node.js 18+
- npm 9+

## Project Structure

```
jarvis-os-ai/
├─ src/                     # React app (Vite + TS)
│  ├─ components/           # UI components (shadcn/ui, custom)
│  ├─ pages/                # Pages (Landing, Dashboard, Vision, Projects, etc.)
│  ├─ data/                 # Local JSON data (projects, users, employees)
│  └─ lib/                  # Helpers (auth, etc.)
├─ server/                  # Express upload server (Multer + CORS)
│  ├─ index.js              # /api/upload, /uploads/ static, / status
│  └─ package.json
├─ uploads/                 # Created automatically; stores uploaded files
├─ package.json             # Root dev scripts (concurrently)
└─ README.md
```

## Key Scripts (root package.json)
- `dev`: Run client and server concurrently
- `dev:client`: Vite dev server
- `dev:server`: Express upload server
- `build`: Build client
- `preview`: Preview built client

## Major Features
- **Landing**: parallax hero, hologram-style panel, reveal-on-scroll animations, tighter CTA-to-footer spacing
- **Vision**: cards for Chat and Voice Chat (Web Speech API demo)
- **Dashboard**: metrics, status, and an Upload modal (posts to backend)
- **Projects**:
  - Grid of projects from `src/data/projects.json` + user-created ones
  - “Create Project” modal; persisted to `localStorage` (`projects_custom`)
  - Project Detail: shows metrics, Upload button, and Delete (for custom projects only)
- **Team Assembler (prototype)**: project intake, animated searching, recommendations list, manual team builder; mock `employees.json` data

## Backend (Uploads)
- Location: `server/index.js`
- Endpoints:
  - `GET /` → server status page
  - `GET /api/health` → `{ ok: true }`
  - `POST /api/upload` → accepts files under field `files` (up to 20)
  - `GET /uploads/` → directory listing (HTML)
  - `GET /uploads/<filename>` → serves file
- Files are saved to the repo’s `uploads/` directory with a timestamped filename.
- CORS allows `http://localhost:8080`. For LAN testing, you may add your IP origin in the CORS config.

### Accepted file types (frontend)
`.pdf, .doc, .docx, .pptx, .txt, .md, .png, .jpg, .jpeg, .csv, .json`

## Data Persistence
- Seed data: `src/data/projects.json`, `users.json`, `employees.json`
- User-created projects: stored in `localStorage` (`projects_custom`) so they survive navigation/refresh
- Deleting a project in Project Detail removes it from `projects_custom`

## LAN/Network Access
- Vite shows a “Network” URL (e.g., `http://<your-ip>:8080`). Anyone on the same Wi‑Fi can open it if your firewall allows inbound on Private networks.
- Backend runs on `http://<your-ip>:4000`. If other devices upload, update CORS and the frontend upload URL to use your host IP (not `localhost`).

## Security Notes (Dev)
- Keep the upload server on trusted, Private networks only
- If exposing beyond LAN, add authentication, size/type limits (`multer`), virus scanning, HTTPS, and a database for metadata

## Troubleshooting
- "NetworkError when attempting to fetch resource": ensure the backend is running and reachable at `http://localhost:4000`
- “Cannot GET /uploads/”: ensure you’re on the updated server; visit `http://localhost:4000/uploads/`
- Voice chat not working: use a Chrome-based browser and grant mic permissions

## Where to Edit
- Landing animations: `src/pages/Landing.tsx`
- Upload UI: `src/pages/Dashboard.tsx` and `src/pages/ProjectDetail.tsx`
- Projects creation/persistence: `src/pages/Projects.tsx` (uses `localStorage`)
- Upload server: `server/index.js`

Enjoy building with JARVIS OS!
