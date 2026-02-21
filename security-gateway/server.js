const express = require('express');
const adminRoutes = require("./adminRoutes");
const authRoutes=require("./authRoutes");
const {redisClient}=require('./redis')

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use("/admin", adminRoutes);

// 3. ENDPOINTS
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get("/events/stream", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let lastId = "$";
    let isConnected = true;

    // Detect client disconnect
    req.on("close", () => {
        console.log("Client disconnected");
        isConnected = false;
    });

    while (isConnected) {
        const response = await redisClient.xread(
            "BLOCK", 5000,
            "COUNT", 10,
            "STREAMS",
            "stream:security_events",
            lastId
        );

        if (!response) continue;

        const [stream, messages] = response[0];

        for (const [id, fields] of messages) {
            lastId = id;

            const event = {};
            for (let i = 0; i < fields.length; i += 2) {
                event[fields[i]] = fields[i + 1];
            }

            res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
    }
});

app.use("/auth",authRoutes);





app.listen(PORT, () => console.log(' Server running on port 3000'));