require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { wsServer } = require("./src/ws/wsServer");
require("./src/workers/analysisWorker");

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.get("/", (req, res) => res.json({ status: "AI Analytics Service Running" }));
app.get("/health", (req, res) => res.json({ healthy: true }));

const server = http.createServer(app);
server.on("upgrade", (req, socket, head) => {
  wsServer.handleUpgrade(req, socket, head, ws => {
    wsServer.emit("connection", ws, req);
  });
});

const PORT = process.env.PORT || 4002;
server.listen(PORT, () => {
  console.log(`✅ AI Analytics Service running on port ${PORT}`);
  console.log(`✅ WebSocket server ready`);
  console.log(`✅ Analysis worker started`);
});

