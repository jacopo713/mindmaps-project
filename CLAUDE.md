# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a full-stack mind maps project with AI chat functionality and cross-platform synchronization, structured as a monorepo:

- **frontend/** - Next.js 15 web application (serves both web UI and API backend)
- **mobile/** - React Native Expo application 
- **backend/** - FastAPI Python backend (future/alternative backend)
- **shared/** - Shared TypeScript utilities

### Key Architecture Patterns

The project currently uses a hybrid backend approach:
- **Primary**: Frontend serves as both web app AND API backend (Next.js API routes in pages/api/)
- **Alternative**: Standalone Python FastAPI backend for future scaling

Both frontend and mobile apps consume the same backend API, with environment-configurable API URLs:
- Frontend: `NEXT_PUBLIC_BACKEND_URL` (defaults to http://localhost:8000)
- Mobile: `EXPO_PUBLIC_API_URL` (defaults to http://localhost:8000)

### AI Integration

- Uses DeepSeek API for chat functionality
- Streaming responses implemented with Server-Sent Events (SSE)
- API key configured via `DEEPSEEK_API_KEY` environment variable
- Italian language responses by default

## Development Commands

### Frontend (Next.js Web + API)
```bash
cd frontend
npm install
npm run dev          # Start dev server with Turbopack
npm run build        # Build for production with Turbopack
npm start           # Start production server
npm run lint        # Run ESLint
```

### Mobile (React Native Expo)
```bash
cd mobile
npm install
npm start           # Start Expo development server
npm run android     # Start on Android
npm run ios         # Start on iOS
npm run web         # Start web version
```

### Backend (Python FastAPI)
```bash
cd backend
pip install -r requirements.txt
python main.py      # Start FastAPI server
# OR
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Docker Development
```bash
docker-compose up   # Start all services
```

## Deployment

### Railway (Production)
- Frontend is deployed on Railway
- Uses Nixpacks builder
- Requires `DEEPSEEK_API_KEY` environment variable
- Start command: `npm start` (production Next.js server)

### Environment Variables
- `DEEPSEEK_API_KEY` - Required for AI chat functionality
- `NEXT_PUBLIC_BACKEND_URL` - Frontend API base URL
- `EXPO_PUBLIC_API_URL` - Mobile app API base URL
- `PORT` - Backend server port (defaults to 8000)

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS 4
- **Mobile**: React Native, Expo, AsyncStorage
- **Backend**: FastAPI, Python, OpenAI SDK (for DeepSeek)
- **AI**: DeepSeek API with streaming responses
- **Deployment**: Railway, Docker

## File Structure Conventions

- Frontend components in `frontend/src/app/`
- Mobile components in `mobile/src/components/`
- Shared utilities in `shared/`
- API routes in `frontend/src/pages/api/` (currently unused - using Python backend)
- Mobile API utilities in `mobile/src/utils/api.ts`

## Current Features

- AI chat with streaming responses (DeepSeek)
- Cross-platform mobile app with responsive design
- Local storage for chat conversations
- Hamburger menu for mobile navigation
- Shared backend API between web and mobile

## Future Features (In Development)

- Interactive mind maps
- User authentication
- Firebase synchronization
- AI-assisted mind mapping