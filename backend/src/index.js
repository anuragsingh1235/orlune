const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const movieRoutes = require("./routes/movies");
const battleRoutes = require("./routes/battles");
const watchlistRoutes = require("./routes/watchlist");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ ALL ROUTES ADD KARO
app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/battles", battleRoutes);
app.use("/api/watchlist", watchlistRoutes);

const path = require("path");

// Serve React build from the compiled frontend directory
const buildPath = path.join(__dirname, "../../frontend/build");
app.use(express.static(buildPath));

// For all other routes, let React Router handle the UI rendering
app.get("*", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
} else {
  // Try listening for environments like Render, but also export for Vercel Serverless
  app.listen(PORT, () => console.log(`🚀 Production server on port ${PORT}`));
}

module.exports = app;