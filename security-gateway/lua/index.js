const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

//converting lua script into string
const luaScript = fs.readFileSync(
    path.join(__dirname, "checkAccess.lua"),
    "utf8"
);


async function checkAccess(redisClient, ip, username) {
    const whitelistKey = "whitelist:ips";
    const banKey = `ban:${ip}`;
    const attemptKey = `login_fail:${ip}_${username}`;

    const maxAttempts = process.env.MAX_ATTEMPTS || 5
    const windowTTL = process.env.WINDOW_SECONDS || 300;
    const banTTL = process.env.BAN_TTL || 900;

    const result = await redisClient.eval(
        luaScript,
        3, // number of KEYS
        whitelistKey,
        banKey,
        attemptKey,
        ip,
        maxAttempts,
        windowTTL,
        banTTL
    );

    return {
        status: result[0],
        value: Number(result[1])
    };
}

module.exports = { checkAccess };
