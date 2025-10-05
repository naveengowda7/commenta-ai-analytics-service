const WebSocket = require("ws");

const wsServer = new WebSocket.Server({ noServer: true });
const clients = new Map();

wsServer.on("connection", (ws, req) => {
  console.log("🔌 WebSocket client connected to analytics");

  let subscribedVideoId = null;

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.type === 'subscribe' && data.videoId) {
        subscribedVideoId = data.videoId;

        if (!clients.has(subscribedVideoId)) {
          clients.set(subscribedVideoId, new Set());
        }
        clients.get(subscribedVideoId).add(ws);

        console.log(`✅ Client subscribed to analysis for video ${subscribedVideoId}`);

        ws.send(JSON.stringify({
          type: 'subscribed',
          videoId: subscribedVideoId
        }));
      }
    } catch (err) {
      console.error("❌ Invalid WebSocket message:", msg);
    }
  });

  ws.on("close", () => {
    if (subscribedVideoId && clients.has(subscribedVideoId)) {
      clients.get(subscribedVideoId).delete(ws);

      if (clients.get(subscribedVideoId).size === 0) {
        clients.delete(subscribedVideoId);
      }
    }
    console.log("🔌 WebSocket client disconnected from analytics");
  });

  ws.on("error", (error) => {
    console.error("❌ WebSocket error:", error);
  });
});

function broadcastAnalysis(videoId, data) {
  if (!clients.has(videoId)) return;

  const message = JSON.stringify(data);
  const videoClients = clients.get(videoId);

  videoClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });

  console.log(`📡 Broadcasted analysis to ${videoClients.size} clients for video ${videoId}`);
}

module.exports = { wsServer, broadcastAnalysis };
