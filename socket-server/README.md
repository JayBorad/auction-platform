# Auction WebSocket Server

This is a standalone Socket.IO server for the auction platform, designed to run on Render.com for persistent WebSocket connections.

## 🚀 Deployment to Render

### 1. Create Render Account
Go to [render.com](https://render.com) and create an account.

### 2. Create New Web Service
- Click "New" → "Web Service"
- Connect your GitHub repository
- Select the `socket-server` directory as the root directory

### 3. Configure Service
```
Name: auction-websocket-server
Environment: Node
Build Command: npm install
Start Command: npm start
```

### 4. Environment Variables
Add these environment variables:
```
PORT=3001
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
```

Replace `your-vercel-app.vercel.app` with your actual Vercel domain.

### 5. Deploy
Click "Create Web Service" and wait for deployment.

## 🔧 Local Development

```bash
cd socket-server
npm install
npm run dev
```

The server will run on `http://localhost:3001`

## 📡 WebSocket Events

The server handles these events:
- `join_auction` - Join auction room
- `leave_auction` - Leave auction room
- `place_bid` - Place a bid
- `sync_timer` - Sync auction timer
- `get_connected_users` - Get list of connected users

## 🔄 Integration

After deployment, update your frontend's WebSocket URL:
```javascript
const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'https://your-render-app.onrender.com';
```
