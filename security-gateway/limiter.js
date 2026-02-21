const { redisClient } = require("./redis");


function normalizeIP(ip) {
    if (ip === "::1") return "127.0.0.1";
    if (ip.startsWith("::ffff:")) {
        return ip.replace("::ffff:", "");
    }
    return ip;
}

// BAN IP
async function banIP(ip, reason, ttl) {
    await redisClient.set(`ban:${ip}`, "1", "EX", ttl);

    await redisClient.hset(
        `ban:meta:${ip}`,
        "reason", reason,
        "createdAt", Date.now()
    );
}

// CHECK BAN
async function isBanned(ip) {
    return await redisClient.exists(`ban:${ip}`);
}

// WHITELIST
async function whitelistIP(ip) {
    await redisClient.sadd("whitelist:ips", ip);
}

// CHECK WHITELIST
async function isWhitelisted(ip) {
    return await redisClient.sismember("whitelist:ips", ip);
}

module.exports = {
    banIP,
    isBanned,
    isWhitelisted,
    whitelistIP,
    normalizeIP
};
