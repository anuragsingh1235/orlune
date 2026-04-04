const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const authRoutes = require("./routes/auth");
const movieRoutes = require("./routes/movies");
const watchlistRoutes = require("./routes/watchlist");
const battleRoutes = require("./routes/battles");
const animeRoutes = require("./routes/anime");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ ALL ROUTES ADD KARO
app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/anime", animeRoutes);
app.use("/api/battles", battleRoutes);
app.use("/api/watchlist", watchlistRoutes);

// Serve React build only when NOT on Vercel (Vercel handles frontend separately)
if (!process.env.VERCEL) {
  const buildPath = path.join(__dirname, "../../frontend/build");
  app.use(express.static(buildPath));

  // For all other routes, let React Router handle the UI rendering
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;