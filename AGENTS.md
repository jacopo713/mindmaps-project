# Repository Guidelines

## Project Structure & Modules
- `frontend/`: Next.js 15 (TypeScript) web app. Source in `src/` with `app/`, `components/`, `utils/`, `types/`.
- `backend/`: FastAPI service (`main.py`), `requirements.txt`, optional `.env`.
- `mobile/`: Expo React Native app (`src/`, `App.tsx`).
- `shared/`: TypeScript utilities consumed by web/mobile.
- Root: `docker-compose.yml`, top-level `package.json` (TypeScript only).

## Build, Test, Run
- Docker (recommended): `docker-compose up --build` — starts backend (8000), frontend (3000), mobile web (19006).
- Frontend:
  - `cd frontend && npm i`
  - Dev: `npm run dev` (Turbopack)
  - Build/serve: `npm run build && npm start`
  - Lint: `npm run lint`
- Backend:
  - `cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
  - Dev: `uvicorn main:app --reload`
- Mobile:
  - `cd mobile && npm i`
  - Web dev: `npm run web` (Expo); native: `npm run ios` / `npm run android`.

## Coding Style & Naming
- TypeScript/React: 2-space indent, PascalCase components (`components/Header.tsx`), camelCase functions, named exports for shared utils.
- Python: 4-space indent, type hints, FastAPI routers kept small and cohesive.
- Linting: ESLint (`next/core-web-vitals`, `next/typescript`). Keep files under `frontend/src/**`; ignore `.next/`, `node_modules/`.
- Filenames: kebab-case for non-components (`utils/date-utils.ts`), PascalCase for components.

## Testing Guidelines
- Current: no formal test runner configured.
- Recommended:
  - Frontend: React Testing Library + Vitest/Jest. Place tests next to files: `Component.test.tsx`.
  - Backend: `pytest` with `requests`/`httpx` for API. Name `test_*.py`.
  - Aim for meaningful coverage of core flows (chat streaming, node suggestions) over blanket %.

## Commits & Pull Requests
- Commits: Use clear, imperative messages (no strict convention in history). Example: `Fix RN streaming and fallback`. Group related changes; one topic per commit.
- PRs: Include summary, linked issues, setup steps, and screenshots/GIFs for UI. Note env vars used. Keep PRs small and focused; add checklist for testing locally.

## Security & Configuration
- Required env: `DEEPSEEK_API_KEY` (backend), `NEXT_PUBLIC_API_URL` (frontend), `EXPO_PUBLIC_API_URL` (mobile). See `.env.example` files.
- Never commit secrets. Prefer `.env` locally and platform vars in deployment.

