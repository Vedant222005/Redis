# Security Gateway with Redis Rate Limiting

A production-ready security gateway API built with **Node.js**, **Express**, and **Redis**. It implements brute-force protection, IP banning/whitelisting, real-time event streaming, and atomic access control via **Lua scripting**.

---

## 🚀 Features

- **Atomic Access Control:** A single Lua script (`checkAccess.lua`) atomically checks whitelist → ban → attempt count in one Redis round-trip, eliminating race conditions.
- **Brute-Force Protection:** Limits login attempts using a composite key of **IP Address + Username**.
- **Rate Limit Rule:** Allows **5 attempts per 5-minute window** (configurable via env vars).
- **Auto-Blocking:** Automatically bans the IP for **15 minutes** after the limit is exceeded.
- **Manual Admin Controls:** Admins can manually ban, unban, or whitelist any IP via REST API.
- **IP Whitelist:** Whitelisted IPs bypass all rate-limit checks entirely.
- **Distributed State:** Uses Redis for fast, atomic counter management (works across multiple server instances).
- **Real-Time Event Stream:** Security events (bans, blocks, whitelists) are published to a Redis Stream and exposed as a **Server-Sent Events (SSE)** endpoint.
- **Standard Responses:** Returns `HTTP 429 Too Many Requests` or `HTTP 403 Forbidden` with remaining TTL when blocked.
- **Docker Support:** Full Docker Compose setup for zero-config local development.

---

## 📁 Project Structure

```
security-gateway/
├── server.js          # Express app entry point; mounts routes & SSE stream
├── authRoutes.js      # POST /auth/login — rate-limited login endpoint
├── adminRoutes.js     # Admin routes: ban, unban, whitelist, IP lookup
├── limiter.js         # Redis helpers: banIP, isBanned, whitelist checks
├── redis.js           # ioredis client singleton
├── events.js          # publishEvent() — writes to Redis Stream
├── lua/
│   ├── checkAccess.lua  # Atomic Lua script: whitelist → ban → attempt → auto-ban
│   └── index.js         # Loads and executes the Lua script via ioredis
├── script.js          # k6 load test script
├── Dockerfile         # Docker image for the API
├── docker-compose.yml # Spins up Redis + API together
├── .env.example       # Sample environment variables
└── package.json
```

---

## 🛠️ Prerequisites

- **Node.js** v14 or higher
- **Redis** v6 or higher (locally or via Docker)
- **k6** (optional, for load testing — https://k6.io)

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and configure:

```env
PORT=3000             # Port the Express server listens on
REDIS_URL=redis://localhost:6379  # Redis connection URL

MAX_ATTEMPTS=5        # Max failed login attempts before auto-ban
WINDOW_SECONDS=300    # Sliding window duration (seconds) — 5 minutes
BAN_TTL=900           # Auto-ban duration (seconds) — 15 minutes
```

---

## 🚀 Installation & Setup

### Option 1 — Local (Node + Redis)

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure env vars
cp .env.example .env

# 3. Start the server
node server.js
```

### Option 2 — Docker Compose (recommended)

Spins up both Redis and the API with a single command:

```bash
docker-compose up --build
```

The API will be available at `http://localhost:3000`.

---

## 📡 API Reference

### Auth Routes

| Method | Endpoint       | Description                                      |
|--------|----------------|--------------------------------------------------|
| POST   | `/auth/login`  | Attempt login — subject to rate limiting         |

**Request Body:**
```json
{ "username": "admin" }
```

**Possible Responses:**

| Status | Meaning                                                        |
|--------|----------------------------------------------------------------|
| 200    | Login successful (username is `admin`)                         |
| 200    | Whitelisted IP — bypassed all checks                          |
| 401    | Invalid credentials — returns `remainingAttempts`             |
| 403    | IP is banned — returns TTL (seconds) until unban              |
| 429    | Too many attempts — IP auto-banned, returns ban TTL           |

---

### Admin Routes

| Method | Endpoint           | Description                              |
|--------|--------------------|------------------------------------------|
| POST   | `/admin/ban`       | Manually ban an IP with reason and TTL   |
| POST   | `/admin/unban`     | Remove a ban from an IP                  |
| POST   | `/admin/whitelist` | Add an IP to the permanent whitelist     |
| GET    | `/admin/ip/:ip`    | Lookup ban status, metadata, and TTL     |

**POST `/admin/ban` body:**
```json
{ "ip": "1.2.3.4", "reason": "suspicious activity", "ttl": 3600 }
```

**POST `/admin/unban` / `/admin/whitelist` body:**
```json
{ "ip": "1.2.3.4" }
```

---

### Utility Routes

| Method | Endpoint          | Description                                       |
|--------|-------------------|---------------------------------------------------|
| GET    | `/health`         | Health check — returns `{ "status": "ok" }`      |
| GET    | `/events/stream`  | SSE stream of real-time security events           |

**SSE Event format** (subscribe with `EventSource` in browser or `curl`):
```
data: {"type":"auto_ban","data":"{\"ip\":\"127.0.0.1\"}","ts":"1708000000000"}
```

Event types: `blocked_login`, `auto_ban`, `manual_ban`, `unban`, `whitelist`

---

## 🔑 Redis Data Model

| Key Pattern             | Redis Type | Purpose                                      |
|-------------------------|------------|----------------------------------------------|
| `whitelist:ips`         | Set        | IPs permanently allowed through              |
| `ban:<ip>`              | String     | Existence = IP is banned; TTL = time left    |
| `ban:meta:<ip>`         | Hash       | Stores `reason` and `createdAt` for a ban    |
| `attempts:<ip>:<user>`  | String     | Incremental attempt counter with sliding TTL |
| `stream:security_events`| Stream     | Append-only log of all security events       |

---

## ⚛️ How the Lua Script Works

The `lua/checkAccess.lua` script runs **atomically** inside Redis, executing 5 steps in a single operation:

```
1. SISMEMBER whitelist:ips <ip>   → if whitelisted, return immediately
2. EXISTS ban:<ip>                 → if banned, return TTL
3. INCR attempts:<ip>:<user>       → increment attempt counter
4. EXPIRE attempts:<ip>:<user>     → set window TTL on first attempt
5. if attempts > MAX_ATTEMPTS      → SET ban:<ip> EX <BAN_TTL>, return "auto_banned"
   else                            → return "allowed" with remaining attempts
```

This guarantees no two concurrent requests can both "slip through" on the last allowed attempt.

---

## 🧪 Load Testing with k6

Run the bundled k6 script to simulate 10 sequential login attempts:

```bash
k6 run script.js
```

### Expected Output

The test confirms the rate limiter works correctly:

```
Request 1–5  → Status: 401  (wrong credentials, attempts counted)
Request 6    → Status: 429  (limit exceeded, IP auto-banned)
Request 7–10 → Status: 403  (IP is now banned)
```

### k6 Result Summary

```
checks_total.......: 10      (10/10 passed ✓)
http_req_duration..: avg=7.72ms  min=3.71ms  max=14.1ms
http_req_failed....: 100.00%  (all returned non-2xx — expected behaviour)
iteration_duration.: avg=10.09s
```

> `http_req_failed` being 100% is correct — the test intentionally sends bad credentials to trigger rate limiting.

---

## 🔒 Security Considerations

- **IPv6 normalization:** `::1` and `::ffff:x.x.x.x` are normalized to standard IPv4 format before key generation.
- **Atomic operations:** Lua script prevents TOCTOU (Time-Of-Check-Time-Of-Use) race conditions.
- **TTL-based cleanup:** All ban and attempt keys have Redis TTLs — no manual cleanup required.
- **Admin routes are unprotected** in this example — add authentication middleware before deploying to production.