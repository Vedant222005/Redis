const Redis = require('ioredis'); 

const redisClient = new Redis({
    host: '127.0.0.1',
    port: 6379,
});

redisClient.on('connect', () => console.log('Connected to Redis (ioredis)!'));
redisClient.on('error', (err) => console.log('Redis Error:', err));

module.exports={redisClient};

