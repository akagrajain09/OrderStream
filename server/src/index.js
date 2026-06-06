require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const { connectDB } = require('./db');
const { startChangeStream } = require('./changeStream');
const ordersRouter = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN
      ? process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim())
      : '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  })
);
app.use(express.json());

// ─── REST Routes ───────────────────────────────────────────────────────────────
app.use('/api/orders', ordersRouter);

// Health check endpoint (useful for Render keep-alive / deploy checks)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── HTTP + WebSocket Server ───────────────────────────────────────────────────
const server = http.createServer(app);

// Attach the WebSocket server to the same HTTP server.
// Clients connect via ws://host/ws
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`[WS] Client connected: ${ip} | Total: ${wss.clients.size}`);

  // Send a welcome / sync message so the client knows the connection is live
  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Real-time order stream active' }));

  ws.on('close', () => {
    console.log(`[WS] Client disconnected: ${ip} | Total: ${wss.clients.size}`);
  });

  ws.on('error', (err) => {
    console.error(`[WS] Client error (${ip}):`, err.message);
  });
});

// ─── Bootstrap ─────────────────────────────────────────────────────────────────
(async () => {
  try {
    await connectDB();
    startChangeStream(wss);

    server.listen(PORT, () => {
      console.log(`[Server] HTTP + WebSocket server running on port ${PORT}`);
      console.log(`[Server] REST API  → http://localhost:${PORT}/api/orders`);
      console.log(`[Server] WebSocket → ws://localhost:${PORT}/ws`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err.message);
    process.exit(1);
  }
})();
