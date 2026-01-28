# StudyRoom+ Deployment Guide

## ⚠️ Important Note on WebSocket Hosting

This application uses **Socket.io** for real-time communication (video calls, chat, whiteboard sync). Socket.io requires persistent WebSocket connections which are **NOT fully supported** on serverless platforms like Vercel's free tier.

### Recommended Deployment Options

#### Option 1: Railway (Recommended - Easiest)

Railway supports both the frontend and WebSocket backend seamlessly.

1. Create account at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Railway auto-detects Node.js and deploys both frontend and backend
4. Add environment variable: `PORT=3000` (Railway auto-assigns)

```bash
# No changes needed - Railway runs npm start automatically
```

#### Option 2: Render.com

Similar to Railway, fully supports WebSockets.

1. Create account at [render.com](https://render.com)
2. Create a new **Web Service**
3. Connect GitHub repository
4. Build Command: `cd frontend && npm install && npm run build && cd .. && npm install`
5. Start Command: `npm start`

#### Option 3: DigitalOcean App Platform

Full WebSocket support with simple deployment.

#### Option 4: Fly.io (Free Tier Available)

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login and deploy
fly auth login
fly launch
fly deploy
```

#### Option 5: Heroku

```bash
# Install Heroku CLI, then:
heroku create your-study-room-app
git push heroku main
```

---

## Vercel Deployment (Limited - Frontend Only)

If you only want to deploy the **frontend** (for demo purposes), you can use Vercel, but the real-time features won't work without a separate backend.

### Steps for Vercel Frontend-Only:

1. Deploy only the `frontend` folder to Vercel
2. Set up a separate backend on Railway/Render
3. Update `frontend/src/pages/Room.jsx` to connect to your backend URL:

```javascript
// Change this:
socketRef.current = io();

// To this:
socketRef.current = io("https://your-backend-url.railway.app");
```

---

## Local Development

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Run development server (both backend + frontend proxy)
npm run dev

# In another terminal, run frontend dev server
cd frontend && npm run dev
```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=production
```

---

## Build for Production

```bash
# Build frontend
cd frontend && npm run build

# The built files will be in frontend/dist
# Start the production server
npm start
```

---

## Project Structure

```
Online-Study-Room-Improved/
├── server.js          # Express + Socket.io backend
├── package.json       # Backend dependencies
├── vercel.json        # Vercel config (limited use)
├── frontend/          # React Vite frontend
│   ├── src/
│   ├── dist/          # Production build output
│   └── package.json
├── assets/            # Uploaded files storage
├── data/              # Local JSON database
└── public/            # Static files (legacy)
```

---

## Quick Deploy Commands

### Railway (Recommended)

```bash
# Just push to GitHub, Railway auto-deploys
git push origin main
```

### Render

```bash
# Connect repo in Render dashboard
# Build: cd frontend && npm install && npm run build && cd .. && npm install
# Start: npm start
```

---

## Features Checklist

- [x] Real-time video conferencing (WebRTC)
- [x] Chat with file sharing
- [x] Collaborative whiteboard
- [x] Meeting scheduling
- [x] Guest/Host role management
- [x] Network quality detection
- [x] Profile pictures
- [x] Light/Dark mode
- [x] Responsive design

---

## Troubleshooting

### WebSocket Connection Failed

- Ensure your hosting platform supports WebSockets
- Check if backend URL is correctly configured in frontend

### Video Not Working

- Ensure HTTPS is enabled (required for WebRTC)
- Check browser permissions for camera/microphone

### Build Failing

```bash
# Clear node_modules and reinstall
rm -rf node_modules frontend/node_modules
npm install
cd frontend && npm install
```
