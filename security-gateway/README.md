# Security Gateway with Redis Rate Limiting

This project is a security gateway API built with **Node.js**, **Express**, and **Redis**. It implements robust brute-force protection using the `rate-limiter-flexible` library and `ioredis`.

## 🚀 Features

- **Brute-Force Protection:** Limits login attempts based on a composite key of **IP Address + Username**.
- **Rate Limit Rule:** Allows **5 attempts per 5 minutes**.
- **Blocking Mechanism:** Automatically blocks the user for **15 minutes** if the limit is exceeded.
- **Distributed State:** Uses Redis for fast, atomic counter management.
- **Standard Responses:** Returns HTTP `429 Too Many Requests` with a `Retry-After` header when blocked.

## 🛠️ Prerequisites

- **Node.js** (v14 or higher)
- **Redis** (Running locally or via Docker)

## Installation & Setup
1) npm install
2) node server.js