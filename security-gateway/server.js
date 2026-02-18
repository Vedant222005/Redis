const express = require('express');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const Redis = require('ioredis'); 

const app = express();
app.use(express.json());

const redisClient = new Redis({
    host: '127.0.0.1',
    port: 6379,
});

redisClient.on('connect', () => console.log('Connected to Redis (ioredis)!'));
redisClient.on('error', (err) => console.log('Redis Error:', err));

// 2. SETUP RATE LIMITER (5 attempts / 5 mins, Block 15 mins)
const limiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'login_fail',
    points: 5,
    duration: 5 * 60,
    blockDuration: 15 * 60,
});

// 3. ENDPOINTS
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/auth/login', async (req, res) => {
    const { username } = req.body;
    const ip = req.ip;
    const key = `${ip}_${username}`; // Limit by IP + Username

    try {
        await limiter.consume(key); // Consume 1 point

        // Dummy Login Check
        if (username == 'admin') {
            return res.json({ message: 'Login successful' });
        } else {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (rlRejected) {
        // IF BLOCKED
        const retrySecs = Math.round(rlRejected.msBeforeNext / 1000) || 1;
        res.set('Retry-After', String(retrySecs));
        return res.status(429).send(`Too Many Requests. Blocked for ${retrySecs}s`);
    }
});

app.listen(3000, () => console.log(' Server running on port 3000'));