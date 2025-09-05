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

## Backend API (FastAPI)

Il backend Python (FastAPI) espone alcune API per chat e suggerimenti. È ora disponibile anche un endpoint per proporre modifiche alla mappa come JSON Patch (RFC 6902), da approvare lato client.

- Avvio locale backend:
  - `cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
  - `uvicorn main:app --reload`

### Propose Map Diff API (JSON Patch)

- POST `/api/propose_map_diff`
- Body:
  - `user_request` (string): richiesta naturale dell'utente (IT ok)
  - `current_map` (object): stato corrente con almeno `nodes` e `connections`
  - `selection` (object, opzionale): contesto selezione, es. `{ "selectedNodeId": "1" }`
  - `format` (string): per ora solo `json-patch`

Esempio:

```
curl -s localhost:8000/api/propose_map_diff \
  -H 'Content-Type: application/json' \
  -d '{
    "user_request": "Rinomina il nodo 2 in Marketing Digitale e collega 2 con 7",
    "current_map": {
      "nodes": [{"id":"1","title":"Idea Centrale"},{"id":"2","title":"Strategia Marketing"},{"id":"7","title":"Partnership"}],
      "connections": []
    },
    "format": "json-patch"
  }'
```

Risposta:

```
{
  "patch": [
    {"op":"replace","path":"/nodes/1/title","value":"Marketing Digitale"},
    {"op":"add","path":"/connections/-","value":{"id":"tmp-conn-1","sourceId":"2","targetId":"7"}}
  ],
  "summary": "Rinominato nodo 2 e aggiunta connessione 2→7"
}
```

Note:
- I nuovi nodi devono avere id temporanei con prefisso `tmp-`.
- Se x,y sono ignoti, ometterli: il client potrà decidere il posizionamento.
