# OrderStream — Real-Time Order Tracking System

> A production-ready system that pushes database changes to clients **instantly** — no polling, no delays.

---

## 🏗 Architecture

```
MongoDB Atlas (orders collection)
        │
        │  Change Stream  ← native CDC at the DB driver level
        ▼
Node.js Backend  (Express + ws)
        │
        │  WebSocket broadcast  ← persistent bidirectional connection
        ▼
React Browser Client  (Vite)
```

### Why this approach?

| Technique | How it works | Pros | Cons |
|---|---|---|---|
| **Polling** | Client asks "anything new?" every N seconds | Simple | Wasteful, not truly real-time |
| **SSE (Server-Sent Events)** | Server pushes text events to client | Simple, HTTP-compatible | One-direction only |
| **WebSockets** ✅ | Full-duplex persistent TCP channel | True real-time, bidirectional | Needs WS-capable host |
| **Kafka / Debezium** | Enterprise CDC pipeline | Massive scale | Huge operational overhead |

**MongoDB Change Streams** are the right primitive here: they tap into the MongoDB oplog at the driver level, so every insert/update/delete on the `orders` collection fires an event with the full document — zero polling, sub-100 ms latency.

**WebSockets** propagate that event to every connected browser tab instantly. The server fans out to all `OPEN` clients in a single loop — no third-party message broker needed at this scale.

---

## 📁 Project Structure

```
apt assignment/
├── server/                  # Node.js backend
│   ├── src/
│   │   ├── index.js         # Express + WebSocket server entry point
│   │   ├── db.js            # MongoDB connection (Mongoose)
│   │   ├── changeStream.js  # Change Stream watcher → WS broadcast
│   │   ├── models/
│   │   │   └── Order.js     # Mongoose schema (orders collection)
│   │   └── routes/
│   │       └── orders.js    # REST CRUD endpoints
│   ├── .env.example
│   └── package.json
│
└── client/                  # React + Vite frontend
    ├── src/
    │   ├── App.jsx           # Main dashboard
    │   ├── App.css           # Dark-mode styles
    │   ├── hooks/
    │   │   └── useWebSocket.js  # WS hook with auto-reconnect
    │   └── components/
    │       ├── OrderTable.jsx
    │       ├── OrderForm.jsx
    │       └── StatusBadge.jsx
    ├── .env.example
    └── package.json
```

---

## 🚀 Local Development

### Prerequisites
- Node.js ≥ 18
- A **MongoDB Atlas** account (free M0 tier is sufficient)
  > ⚠️ Change Streams require a **replica set**. Atlas free clusters support this. A single-node local `mongod` does NOT unless you enable `--replSet`.

### 1. Clone & setup

```bash
git clone <your-repo-url>
cd "apt assignment"
```

### 2. Configure the backend

```bash
cd server
cp .env.example .env
# Edit .env and paste your MongoDB Atlas connection string
npm install
npm run dev        # starts on http://localhost:4000
```

`.env` content:
```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/ordersdb?retryWrites=true&w=majority
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

### 3. Configure the frontend

```bash
cd client
# .env is already set for localhost — no changes needed for local dev
npm install
npm run dev        # starts on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

### 4. Test real-time updates

1. Open two browser tabs at `http://localhost:5173`
2. Create an order in one tab — both tabs update instantly
3. Change a status or delete an order — both tabs reflect the change
4. Use the REST API directly to trigger updates:

```bash
# Create
curl -X POST http://localhost:4000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_name":"Bob","product_name":"Laptop","status":"pending"}'

# Update status
curl -X PATCH http://localhost:4000/api/orders/<id> \
  -H "Content-Type: application/json" \
  -d '{"status":"shipped"}'

# Delete
curl -X DELETE http://localhost:4000/api/orders/<id>
```

---

## ☁️ Deployment

### Backend → [Render](https://render.com)

1. Push the `server/` directory to GitHub
2. Create a new **Web Service** on Render
3. Set build command: `npm install`
4. Set start command: `node src/index.js`
5. Add environment variables:
   - `MONGODB_URI` — your Atlas connection string
   - `PORT` — Render sets this automatically
   - `CLIENT_ORIGIN` — your Vercel frontend URL

### Frontend → [Vercel](https://vercel.com)

1. Push the `client/` directory to GitHub
2. Import it in Vercel as a **Vite** project
3. Add environment variables:
   - `VITE_API_URL` — `https://your-render-app.onrender.com`
   - `VITE_WS_URL` — `wss://your-render-app.onrender.com/ws`

> ⚠️ Note: Use `wss://` (secure WebSocket) in production — Render provides HTTPS/WSS by default.

### Database → MongoDB Atlas

1. Create a free **M0** cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Under **Network Access**, add `0.0.0.0/0` (allow all) or Render's IP range
3. Create a database user and copy the connection string into `MONGODB_URI`

---

## 🔌 API Reference

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `GET` | `/api/orders` | — | List all orders |
| `GET` | `/api/orders/:id` | — | Get single order |
| `POST` | `/api/orders` | `{customer_name, product_name, status}` | Create order |
| `PATCH` | `/api/orders/:id` | `{status?, customer_name?, product_name?}` | Update order |
| `DELETE` | `/api/orders/:id` | — | Delete order |
| `GET` | `/health` | — | Health check |
| `WS` | `/ws` | — | WebSocket endpoint |

### WebSocket Event Payloads

```json
// INSERT
{ "type": "INSERT", "order": { "id": "...", "customer_name": "...", "product_name": "...", "status": "pending", "updated_at": "..." } }

// UPDATE
{ "type": "UPDATE", "id": "...", "order": { ... }, "updatedFields": { "status": "shipped" } }

// DELETE
{ "type": "DELETE", "id": "..." }
```

---

## 📐 Scalability Considerations

| Concern | Current approach | At larger scale |
|---|---|---|
| **Horizontal scaling** | Single Node process | Add Redis pub/sub so all instances broadcast to their local WS clients |
| **Change Stream resilience** | Closes on error | Store resume token; restart stream from last position |
| **Auth** | None | Add JWT validation on WS upgrade handshake |
| **Client count** | Unlimited in-process | Cap per instance; use load balancer with sticky sessions |

---

## 🛠 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express 4
- **WebSocket**: `ws` (the lightest, most reliable WS library for Node)
- **Database**: MongoDB (via Mongoose 8)
- **CDC mechanism**: MongoDB Change Streams (native, no external tool needed)
- **Frontend**: React 18 + Vite
- **Hosting**: Render (backend), Vercel (frontend), MongoDB Atlas (DB)
