const express = require("express");
const redisClient = require("./redis");
const {banIP,isBanned,whitelistIP}=require("./limiter");
const { publishEvent } = require("./events");
const router = express.Router();

router.post("/ban",async(req,res)=>{
    const {ip,reason,ttl}=req.body;
    await banIP(ip,reason,ttl);
    await publishEvent(redisClient, "manual_ban", { ip });
    res.json({ message: "IP banned" });
});

router.post("/unban", async (req, res) => {
    const { ip } = req.body;
    await redisClient.del(`ban:${ip}`);
    await publishEvent(redisClient, "unban", { ip });
    res.json({ message: "IP unbanned" });
});

router.post("/whitelist", async (req, res) => {
    const { ip } = req.body;
    await whitelistIP(ip);
    await publishEvent(redisClient, "whitelist", { ip });
    res.json({ message: "IP whitelisted" });
});

router.get("/ip/:ip", async (req, res) => {
    const ip = req.params.ip;

    const banned = await isBanned(ip);
    const meta = await redisClient.hGetAll(`ban:meta:${ip}`);
    const ttl = await redisClient.ttl(`ban:${ip}`);

    res.json({ banned, meta, ttl });
});

module.exports = router;
