# StudyRoom+

A real-time video conferencing and collaboration platform for online study sessions.

## Features

- **Video Conferencing** - WebRTC-powered real-time video calls
- **Live Chat** - Instant messaging with file sharing
- **Collaborative Whiteboard** - Draw and share ideas in real-time
- **Meeting Scheduling** - Schedule and manage study sessions
- **Smart Room Codes** - Simple OSR-format room codes (e.g., OSR4052)
- **Host Controls** - Waiting room, admin privileges
- **Network Quality Detection** - Auto-adjusts video quality
- **Profile Pictures** - Google/Facebook OAuth or guest mode
- **Dark/Light Mode** - Theme toggle support
- **Responsive Design** - Works on desktop and mobile

## Quick Start

```bash
# Install dependencies
npm install

# Build frontend
npm run build

# Start server
npm start
```

Open [http://localhost:5050](http://localhost:5050) in your browser.

## Development

```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed hosting instructions.

### Quick Deploy to Railway

1. Push to GitHub
2. Connect repo at [railway.app](https://railway.app)
3. Railway auto-deploys!

## Tech Stack

- **Frontend**: React, Vite, Framer Motion, Lucide Icons
- **Backend**: Node.js, Express, Socket.io
- **Real-time**: WebRTC, Socket.io
- **Database**: Local JSON (file-based)

## License

MIT
