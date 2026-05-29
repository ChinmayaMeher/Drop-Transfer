# Drop.Transfer

Instant, anonymous peer-to-peer message and code drops. No accounts, no sign-up.

## Features

- 🔑 Auto-generated Drop IDs — share yours to receive messages
- 💬 Send plain messages or code snippets
- ⚡ Live inbox polling every 3 seconds
- 🗑️ Delete messages from your inbox
- ↩️ Quick reply from the message viewer
- 📱 Responsive (mobile-friendly)

## Project Structure

```
drop-transfer/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx              # App entry point
    ├── App.jsx               # Root component & state
    ├── styles/
    │   └── globals.css       # All global styles
    ├── components/
    │   ├── SendForm.jsx      # Send message/code form
    │   ├── Inbox.jsx         # Inbox message list
    │   └── MessageViewer.jsx # Message detail & reply
    └── utils/
        └── helpers.js        # generateId, timeAgo
```

## Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

## Notes

This app uses `window.storage` — a shared key-value store provided by the Claude.ai
Artifacts runtime. It is designed to run inside a Claude Artifact. If you want to run
it standalone, replace all `window.storage` calls in `App.jsx` with your own backend
(e.g. Firebase, Supabase, or a simple REST API).
