# Real-Time Financial Intelligence and Strategy Backtesting Platform

A beginner-friendly full-stack university final-year project using React, Express, PostgreSQL, JWT auth, and WebSockets.

## 1) Project Structure

```text
backend/
  controllers/
  routes/
  models/
  middleware/
  services/
  websocket/
  utils/
  app.js
  server.js
  schema.sql
frontend/
  src/
    components/
    pages/
    context/
    services/
    hooks/
```

## 2) Tech Stack

- Frontend: React (hooks), Axios, React Router, Chart.js
- Backend: Node.js, Express.js, JWT, Socket.IO WebSocket
- Database: PostgreSQL with pg

## 3) Prerequisites

- Node.js 18+
- PostgreSQL 14+

## 4) Setup and Run

### Backend

```bash
cd backend
cp .env.example .env
npm install
```

Edit .env:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/realtime_finance
JWT_SECRET=super_secret_change_me
CLIENT_URL=http://localhost:5173
OPENAI_API_KEY=
PORT=5000
```

Create DB and initialize schema:

```sql
CREATE DATABASE realtime_finance;
```

```bash
npm run db:init
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173

## 5) API Endpoints

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- POST /api/strategies
- POST /api/strategies/backtest
- GET /api/backtests/:id
- GET /api/backtests/:id/report?format=csv
- POST /api/ai/predict
- POST /api/portfolio
- PUT /api/portfolio/:id/holding
- GET /api/portfolio/:id

## 6) Example API Calls

Register:

```bash
curl -X POST http://localhost:5000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"username":"demo","email":"demo@example.com","password":"123456"}'
```

Login:

```bash
curl -X POST http://localhost:5000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"demo@example.com","password":"123456"}'
```

Create Strategy (replace TOKEN):

```bash
curl -X POST http://localhost:5000/api/strategies \\
  -H "Authorization: Bearer TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"SMA Crossover","description":"Simple MA strategy","parameters":{"shortWindow":5,"longWindow":20,"initialCapital":10000}}'
```

Run Backtest:

```bash
curl -X POST http://localhost:5000/api/strategies/backtest \\
  -H "Authorization: Bearer TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"strategyId":1,"symbol":"BTCUSDT","startDate":"2025-01-01","endDate":"2025-03-01","interval":"1d"}'
```

AI Predict:

```bash
curl -X POST http://localhost:5000/api/ai/predict \\
  -H "Authorization: Bearer TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"symbol":"BTCUSDT"}'
```

## 7) Sample WebSocket

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  path: '/ws/market',
  transports: ['websocket']
});

socket.on('market:ticker', (data) => {
  console.log(data);
});
```

Notes:
- Binance fetch failure falls back to mock prices.
- Missing OPENAI_API_KEY returns fallback AI prediction.
- Backtesting uses educational SMA crossover logic.
# realtime
