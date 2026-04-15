const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const authRoutes     = require("./routes/auth");
const movieRoutes    = require("./routes/movies");
const watchlistRoutes= require("./routes/watchlist");
const battleRoutes   = require("./routes/battles");
const animeRoutes    = require("./routes/anime");
const aiRoutes       = require("./routes/ai");
const socialRoutes   = require("./routes/social");
const chatRoutes     = require("./routes/chat");
const wikiRoutes     = require("./routes/wikipedia");
const arenaRoutes    = require("./routes/arena");
const downloadRoutes = require("./routes/download");
const channelRoutes  = require("./routes/channel");
const ricRoutes      = require("./routes/ric");
const labRoutes      = require("./routes/lab");
const triviaRoutes   = require("./routes/trivia");

const migrate = require("./config/migrate");
migrate();

const app    = express();
const server = http.createServer(app);

// ── Socket.io for WebRTC signaling ──────────────────────────
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// rooms: { roomId: Set<socketId> }
const rooms = {};

io.on("connection", (socket) => {
  socket.on("join-room", ({ roomId, userId, username }) => {
    if (!rooms[roomId]) rooms[roomId] = new Set();
    rooms[roomId].add(socket.id);
    socket.join(roomId);
    socket.to(roomId).emit("user-joined", { socketId: socket.id, userId, username });
    socket.data = { roomId, userId, username };
  });

  socket.on("offer",         ({ to, offer })         => io.to(to).emit("offer",         { from: socket.id, offer }));
  socket.on("answer",        ({ to, answer })        => io.to(to).emit("answer",        { from: socket.id, answer }));
  socket.on("ice-candidate", ({ to, candidate })     => io.to(to).emit("ice-candidate", { from: socket.id, candidate }));
  
  socket.on("media-status", ({ roomId, camOn, micOn, screenOn }) => {
    socket.to(roomId).emit("media-status", { from: socket.id, camOn, micOn, screenOn });
  });


  socket.on("disconnect", () => {
    const { roomId } = socket.data || {};
    if (roomId && rooms[roomId]) {
      rooms[roomId].delete(socket.id);
      if (rooms[roomId].size === 0) delete rooms[roomId];
    }
    socket.to(roomId).emit("user-left", { socketId: socket.id });
  });
});
// ─────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

app.use("/api/auth",      authRoutes);
app.use("/api/movies",    movieRoutes);
app.use("/api/anime",     animeRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/battles",   battleRoutes);
app.use("/api/ai",        aiRoutes);
app.use("/api/social",    socialRoutes);
app.use("/api/chat",      chatRoutes);
app.use("/api/wiki",      wikiRoutes);
app.use("/api/arena",     arenaRoutes);
app.use("/api/download",  downloadRoutes);
app.use("/api/channels",  channelRoutes);
app.use("/api/ric",       ricRoutes);
app.use("/api/lab",       labRoutes);
app.use("/api/trivia",    triviaRoutes);

// Serve React build only if files actually exist (not on Render backend-only)
const buildPath = path.join(__dirname, "../../frontend/build");
const fs = require("fs");
if (fs.existsSync(path.join(buildPath, "index.html"))) {
  app.use(express.static(buildPath));
  app.get("*", (req, res) => res.sendFile(path.join(buildPath, "index.html")));
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server + Socket.io on port ${PORT}`));

module.exports = app;