# Mind Maps Project

Progetto full-stack per chat AI e mappe concettuali con sincronizzazione cross-platform.

## 🏗️ Architettura

```
mindmaps-project/
├── frontend/          # Next.js app (web + API backend)
├── mobile/           # Expo React Native app
├── backend/          # Python backend (future)
└── shared/           # Utilities condivise
```

## 🚀 Quick Start

### Frontend Web + API
```bash
cd frontend
npm install
npm run dev
```
Disponibile su: http://localhost:3000

### Mobile App
```bash
cd mobile
npm install
npm start
```

## 📱 Funzionalità

### ✅ Già implementate:
- 💬 Chat AI con DeepSeek (streaming)
- 📱 App mobile responsive con hamburger menu
- 💾 Storage locale delle conversazioni
- 🔄 Backend condiviso web/mobile

### 🔜 In sviluppo:
- 🗺️ Mappe concettuali interattive
- 🔐 Autenticazione utente
- ☁️ Sincronizzazione Firebase
- 🤖 AI-assisted mind mapping

## 🌐 Deploy

### Railway (Production)
- Frontend deployato su Railway
- URL: https://your-app.railway.app
- Variabile ambiente: `DEEPSEEK_API_KEY`

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Mobile**: React Native, Expo
- **AI**: DeepSeek API
- **Deploy**: Railway
- **Future**: Firebase, Python backend

## 📖 Documentation

Vedi README specifici in ogni cartella:
- [Frontend README](./frontend/README.md)
- [Mobile README](./mobile/README.md)# Trigger Railway deploy with DeepSeek API key
Deploy: dom 24 ago 2025, 22:35:40, CEST
