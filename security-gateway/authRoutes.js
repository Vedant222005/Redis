const {normalizeIP}=require("./limiter");
const{checkAccess}=require("./lua/index");
const { publishEvent } = require("./events");
const express=require('express');
const {redisClient}=require('./redis')

const router = express.Router();

router.post('/login', async (req, res) => {
    const { username } = req.body;
    const ip = normalizeIP(req.ip);

    try {
        const result = await checkAccess(redisClient, ip, username);

        if (result.status === "whitelisted") {
            return res.json({ message: "Whitelisted - allowed" });
        }

        if (result.status === "banned") {
            await publishEvent(redisClient, "blocked_login", { ip });
            return res.status(403).json({
                message: "IP banned",
                ttl: result.value
            });
        }

        if (result.status === "auto_banned") {
            await publishEvent(redisClient, "auto_ban", { ip });
            return res.status(429).json({
                message: "Too many attempts - IP auto banned",
                ttl: result.value
            });
        }

        // Allowed → now check credentials
        if (username === "admin") {
            return res.json({ message: "Login successful" });
        }

        return res.status(401).json({
            message: "Invalid credentials",
            remainingAttempts: result.value
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


module.exports=router