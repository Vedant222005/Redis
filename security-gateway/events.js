async function publishEvent(redisClient, type, data) {
    await redisClient.xadd(
        "stream:security_events",
        "*",
        "type", type,
        "data", JSON.stringify(data),
        "ts", Date.now().toString()
    );
}

module.exports = { publishEvent };
