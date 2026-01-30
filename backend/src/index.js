import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { getTrafficStatus, setDensity } from "./speedPrediction.js";

// ============ DATA STRUCTURES ============
const app = express();
const port = process.env.PORT || 3001;
const server = createServer(app);

// Store connected users: Map<userId, {ws, userName, location, connectedAt}>
const connectedUsers = new Map();

// Store all messages in memory (max 1000)
const messageHistory = [];
const MAX_MESSAGES = 1000;

// Get initial traffic status
let trafficData = getTrafficStatus();

// ============ MIDDLEWARE ============
app.use(cors());
app.use(express.json());

// ============ WEBSOCKET SERVER ============
const wss = new WebSocketServer({
  server,
  perMessageDeflate: false,
  clientTracking: true,
});

// Helper: Send message to all connected clients
const broadcastToAll = (payload) => {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      // OPEN
      try {
        client.send(message);
      } catch (error) {
        console.error("❌ Broadcast error:", error.message);
      }
    }
  });
};

// Helper: Add message to history
const addMessageToHistory = (msg) => {
  messageHistory.push(msg);
  if (messageHistory.length > MAX_MESSAGES) {
    messageHistory.shift();
  }
  return msg;
};

// Helper: Get connected users list
const getConnectedUsersList = () => {
  return Array.from(connectedUsers.values()).map((user) => ({
    userId: user.id,
    userName: user.userName,
    connectedAt: user.connectedAt,
  }));
};

// ============ WEBSOCKET CONNECTION HANDLER ============
wss.on("connection", (ws) => {
  console.log(`\n✅ NEW CONNECTION - Total clients: ${wss.clients.size}`);
  let userId = null;

  // Send initial data on connection
  if (ws.readyState === 1) {
    ws.send(
      JSON.stringify({
        type: "init",
        messageHistory: messageHistory.slice(-50), // Send last 50 messages
        users: getConnectedUsersList(),
        traffic: trafficData,
      }),
    );
  }

  // ============ MESSAGE HANDLER ============
  ws.on("message", (rawData) => {
    let data;
    try {
      data = JSON.parse(rawData.toString());
    } catch (error) {
      console.error("❌ Parse error:", error.message);
      return;
    }

    console.log(`📨 Message type: ${data.type}`);

    switch (data.type) {
      // ========== USER CONNECT ==========
      case "connect": {
        userId = data.userId || `user_${Date.now()}`;
        const userInfo = {
          id: userId,
          ws,
          userName: data.userName || `Guest_${userId.slice(-4)}`,
          location: null,
          connectedAt: new Date().toISOString(),
        };
        connectedUsers.set(userId, userInfo);

        // Send connected confirmation
        ws.send(
          JSON.stringify({
            type: "connected",
            userId,
            messageHistory: messageHistory.slice(-50),
            users: getConnectedUsersList(),
          }),
        );

        console.log(`👤 User connected: ${userInfo.userName} (${userId})`);

        // Notify all other users
        broadcastToAll({
          type: "userJoined",
          userId,
          userName: userInfo.userName,
          users: getConnectedUsersList(),
        });

        break;
      }

      // ========== CHAT MESSAGE ==========
      case "chat": {
        if (!userId) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Not connected. Please reconnect.",
            }),
          );
          break;
        }

        const user = connectedUsers.get(userId);
        if (!user) break;

        const chatMsg = {
          id: `msg_${Date.now()}`,
          userId,
          userName: user.userName,
          content: data.content,
          timestamp: new Date().toISOString(),
          type: "chat",
        };

        addMessageToHistory(chatMsg);
        console.log(`💬 Chat from ${user.userName}: ${data.content}`);

        broadcastToAll({
          type: "chatMessage",
          message: chatMsg,
        });

        break;
      }

      // ========== EMERGENCY ALERT ==========
      case "emergency": {
        if (!userId) break;

        const user = connectedUsers.get(userId);
        if (!user) break;

        const emergencyMsg = {
          id: `emergency_${Date.now()}`,
          userId,
          userName: user.userName,
          content: "🚨 EMERGENCY ALERT: Traffic stopped for emergency vehicle",
          timestamp: new Date().toISOString(),
          type: "emergency",
        };

        addMessageToHistory(emergencyMsg);
        trafficData = getTrafficStatus();

        console.log(`🚨 EMERGENCY from ${user.userName}!`);

        broadcastToAll({
          type: "emergency",
          message: emergencyMsg,
          traffic: trafficData,
        });

        break;
      }

      // ========== LOCATION UPDATE ==========
      case "location": {
        if (!userId) break;

        const user = connectedUsers.get(userId);
        if (!user) break;

        user.location = {
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy,
          areaName: data.areaName,
          timestamp: new Date().toISOString(),
        };

        console.log(
          `📍 Location: ${user.userName} at ${data.areaName || `${data.latitude}, ${data.longitude}`}`,
        );

        broadcastToAll({
          type: "locationUpdate",
          userId,
          userName: user.userName,
          location: user.location,
        });

        break;
      }

      // ========== TYPING INDICATOR ==========
      case "typing": {
        if (!userId) break;
        const user = connectedUsers.get(userId);
        if (!user) break;

        broadcastToAll({
          type: "userTyping",
          userId,
          userName: user.userName,
          isTyping: data.isTyping,
        });

        break;
      }

      default:
        console.warn(`⚠️ Unknown message type: ${data.type}`);
    }
  });

  // ============ CONNECTION CLOSE ==========
  ws.on("close", () => {
    if (userId && connectedUsers.has(userId)) {
      const user = connectedUsers.get(userId);
      console.log(`👋 User disconnected: ${user.userName}`);

      connectedUsers.delete(userId);

      broadcastToAll({
        type: "userLeft",
        userId,
        userName: user.userName,
        users: getConnectedUsersList(),
      });
    }

    console.log(`❌ Connection closed - Remaining: ${wss.clients.size}`);
  });

  // ============ ERROR HANDLER ==========
  ws.on("error", (error) => {
    console.error(`❌ WebSocket error: ${error.message}`);
    if (userId && connectedUsers.has(userId)) {
      connectedUsers.delete(userId);
    }
  });

  // ============ HEARTBEAT (keep-alive) ==========
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });
});

// Heartbeat interval to detect stale connections
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // Every 30 seconds

// ============ REST ENDPOINTS ============

// Get all messages
app.get("/api/messages", (req, res) => {
  res.json({
    success: true,
    messages: messageHistory.slice(-100),
    count: messageHistory.length,
  });
});

// Get connected users
app.get("/api/users", (req, res) => {
  res.json({
    success: true,
    users: getConnectedUsersList(),
    count: connectedUsers.size,
  });
});

// Get traffic status
app.get("/api/traffic", (req, res) => {
  res.json(trafficData);
});

// Update traffic density
app.post("/api/density/:direction", (req, res) => {
  const { direction } = req.params;
  const { density } = req.body;
  const ok = setDensity(direction, density);
  if (ok) {
    trafficData = getTrafficStatus();
    res.json({ success: true, direction, density });
  } else {
    res.status(400).json({ success: false, message: "Invalid direction" });
  }
});

// AI Assistant endpoint
app.post("/api/assistant", (req, res) => {
  try {
    const { prompt } = req.body || {};
    const status = getTrafficStatus();

    let lines = [];
    let suggestions = [];

    Object.entries(status).forEach(([dir, info]) => {
      const density = info.density || 0;
      const vols = info.volumes || { total: 0 };
      const firstETA = info.firstGroup?.estimatedTimeToReach || 0;
      const secondETA = info.secondGroup?.estimatedTimeToReach || 0;

      lines.push(
        `${dir}: density ${density} veh/km, total ${vols.total} vehicles; first ETA ${firstETA}s, second ETA ${secondETA}s`,
      );

      if (density >= 40 || vols.total >= 70) {
        suggestions.push(`${dir}: high density — consider reducing inflow`);
      } else if (density >= 25) {
        suggestions.push(`${dir}: moderate density — monitor traffic`);
      }
    });

    let reply = `📊 Traffic Summary:\n${lines.join("\n")}`;
    if (suggestions.length) {
      reply += `\n\n💡 Recommendations:\n- ${suggestions.join("\n- ")}`;
    }

    if (prompt && prompt.toLowerCase().includes("congestion")) {
      reply = `🚨 Congestion Alert:\n${lines.join("\n")}\n\n${reply}`;
    }

    console.log("🤖 AI Assistant processed request");
    res.json({ reply, suggestions, traffic: status });
  } catch (error) {
    console.error("❌ AI error:", error);
    res
      .status(500)
      .json({ reply: "Error processing request", error: error.message });
  }
});

// ============ SERVER START ==========
server.listen(port, () => {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`✅ SERVER STARTED`);
  console.log(`📡 Express: http://localhost:${port}`);
  console.log(`🔌 WebSocket: ws://localhost:${port}`);
  console.log(`${"=".repeat(50)}\n`);
});

// Cleanup on shutdown
process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down...");
  clearInterval(heartbeatInterval);
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});
