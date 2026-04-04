const express = require("express");
const axios = require("axios");
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AlzaSyC6iBa08j6iMrpY6bt9PvBsaRtJJy1bt8Q";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

router.post("/oracle", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const response = await axios.post(API_URL, {
      contents: [{
        parts: [{ text: `You are AIRA, a high-end cinematic AI. You help users find movies, discuss theories, and appreciate film history. Be professional, slightly mystical, and deeply knowledgeable. User says: ${prompt}` }]
      }]
    }, {
      headers: { "Content-Type": "application/json" }
    });

    const aiResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "The archives are veiled. Seek me again when the light returns.";
    res.json({ response: aiResponse });
  } catch (error) {
    console.error("AIRA Error:", error.response?.data || error.message);
    res.status(500).json({ error: "AIRA connection failed" });
  }
});

module.exports = router;
