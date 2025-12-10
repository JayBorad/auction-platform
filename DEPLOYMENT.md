# 🚀 Auction Platform Deployment Guide

## Architecture Overview

Your auction platform now uses a **hybrid deployment**:
- **Frontend + API**: Vercel (serverless)
- **WebSocket Server**: Render (persistent connections)

```
┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │   Render        │
│                 │    │                 │
│ • Next.js App   │    │ • Socket.IO     │
│ • API Routes    │    │ • Persistent    │
│ • Static Assets │    │ • Real-time     │
│ • Serverless    │    │ • WebSockets    │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┘
              HTTP WebSocket Events
```

## 📋 Deployment Steps

### 1. Deploy WebSocket Server to Render

1. **Create Render Account**: Go to [render.com](https://render.com)

2. **Create Web Service**:
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - **Root Directory**: `socket-server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

3. **Environment Variables**:
   ```
   PORT=3001
   ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,https://your-vercel-app-git-main-yourname.vercel.app
   ```

4. **Deploy**: Click "Create Web Service"

5. **Get the URL**: After deployment, note your Render URL (e.g., `https://auction-socket.onrender.com`)

### 2. Update Vercel Environment Variables

In your Vercel dashboard:

1. Go to Project Settings → Environment Variables

2. **Add/Update these variables**:
   ```
   NEXT_PUBLIC_WS_URL=https://your-render-app.onrender.com
   WS_SERVER_URL=https://your-render-app.onrender.com
   MONGODB_URI=your-mongodb-connection-string
   NEXTAUTH_URL=https://your-vercel-app.vercel.app
   NEXTAUTH_SECRET=your-secure-secret
   ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
   ```

3. **Redeploy Vercel**: Push changes to trigger redeployment

### 3. CORS Configuration

Update your Socket.IO server CORS settings in `socket-server/server.js`:

```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : ['https://your-vercel-app.vercel.app'];
```

## 🔧 Environment Variables Reference

### Vercel (Frontend + API)
```bash
# Database
MONGODB_URI=mongodb+srv://...

# Authentication
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-secret-key

# WebSocket
NEXT_PUBLIC_WS_URL=https://your-socket-app.onrender.com
WS_SERVER_URL=https://your-socket-app.onrender.com

# CORS
ALLOWED_ORIGINS=https://your-app.vercel.app
```

### Render (WebSocket Server)
```bash
# Server
PORT=3001

# CORS - Allow your Vercel domains
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-git-main.vercel.app
```

## 🧪 Testing WebSocket Functionality

### 1. Health Check
Visit: `https://your-render-app.onrender.com/health`
Should return: `{"status":"ok","timestamp":"..."}`

### 2. WebSocket Connection Test
1. Open browser dev tools
2. Go to Network tab → WS filter
3. Visit your auction page
4. Should see WebSocket connection to Render

### 3. Real-time Auction Test
1. Open two browser tabs/windows
2. Join same auction in both
3. Place bid in one tab
4. Verify bid appears instantly in other tab

## 🚨 Troubleshooting

### WebSocket Not Connecting
- ✅ Check `NEXT_PUBLIC_WS_URL` environment variable
- ✅ Verify Render service is running
- ✅ Check browser console for CORS errors
- ✅ Ensure `ALLOWED_ORIGINS` includes your Vercel domain

### Auction Events Not Broadcasting
- ✅ Check `WS_SERVER_URL` in Vercel
- ✅ Verify `/api/websocket` route is working
- ✅ Check Render logs for event processing errors

### CORS Issues
- ✅ Update `ALLOWED_ORIGINS` in both services
- ✅ Include both production and preview deployment URLs

## 📊 Performance & Scaling

### Render WebSocket Server
- **Free Tier**: 750 hours/month, auto-sleep after 15min inactivity
- **Paid Plans**: Persistent connections, more resources

### Vercel Frontend
- **Hobby Plan**: 100GB bandwidth, serverless functions
- **Pro Plan**: Higher limits, longer function timeouts

## 🔄 Updates & Maintenance

### Updating WebSocket Server
1. Make changes in `socket-server/` directory
2. Push to GitHub
3. Render auto-deploys

### Updating Frontend
1. Make changes in main codebase
2. Push to GitHub
3. Vercel auto-deploys

## 🎯 Alternative WebSocket Solutions

If Render doesn't meet your needs, consider:

1. **Railway**: Similar to Render, good for WebSockets
2. **Fly.io**: Excellent for real-time apps, global deployment
3. **Pusher**: Managed WebSocket service (paid)
4. **Socket.io with Redis**: For scaling (advanced)

Your auction platform now has **persistent WebSocket connections** with **real-time bidding** working across Vercel + Render! 🎉
