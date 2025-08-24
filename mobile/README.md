# Tree Mobile App

App mobile per la chat AI con le stesse funzionalità del sito web.

## Caratteristiche

- 💬 Chat AI con streaming delle risposte
- 📱 Interfaccia ottimizzata per mobile/tablet
- 💾 Salvataggio locale delle conversazioni
- 🌐 Connessione al backend condiviso con l'app web

## Installazione

1. Installa le dipendenze:
```bash
npm install
```

2. Configura l'ambiente:
```bash
cp .env.example .env
```
Modifica `.env` con l'URL del tuo backend.

3. Avvia l'app:
```bash
npm start
```

## Utilizzo

### Avvio in modalità sviluppo

```bash
# Avvia Expo
npm start

# Avvia su Android
npm run android

# Avvia su iOS
npm run ios

# Avvia sul web
npm run web
```

### Configurazione Backend

L'app si connette al backend del progetto principale. Assicurati che:

1. Il backend sia avviato (porta 3000 di default)
2. L'URL in `.env` sia corretto

## Storage Locale

L'app salva automaticamente:
- ✅ Cronologia delle chat
- ✅ Messaggi e conversazioni
- ✅ Persistenza tra sessioni

I dati sono salvati localmente sul dispositivo e rimangono disponibili offline.

## Struttura del Progetto

```
src/
├── components/         # Componenti React Native
│   ├── ChatScreen.tsx  # Schermata principale chat
│   └── Sidebar.tsx     # Sidebar con lista chat
├── types/             # TypeScript interfaces
│   └── index.ts
├── utils/             # Utilities
│   ├── api.ts         # Client API per chat
│   └── storage.ts     # Gestione storage locale
```

## API Endpoints Utilizzati

L'app utilizza gli stessi endpoint del sito web:

```
POST /api/chat          # Invio messaggi (streaming)
```

## Prossimi Step

- [ ] Implementare autenticazione utente per sincronizzazione cross-dispositivo
- [ ] Aggiungere notifiche push
- [ ] Migliorare UI/UX per tablet
- [ ] Aggiungere supporto per allegati
- [ ] Implementare ricerca nelle chat