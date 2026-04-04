const express = require("express");
const axios = require("axios");
const router = express.Router();

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "AIzaSyC6iBa08j6iMrpY6bt9PvBsaRtJJy1bt8Q";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

router.post("/oracle", async (req, res) => {
  const { prompt, history } = req.body;
  
  if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith("REPLACE_ME")) {
    console.error("AIRA ERROR: Gemini API Key is missing or invalid.");
    return res.status(500).json({ error: "The archives are momentarily veiled." });
  }

  try {
    const formattedHistory = (history || []).map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }));

    const response = await axios.post(API_URL, {
      contents: [
        ...formattedHistory,
        { role: "user", parts: [{ text: prompt }] }
      ],
      systemInstruction: {
        parts: [{ text: "You are AIRA, a mystical, cinematic AI companion for the Orlune Cinematic Vault. You speak with wisdom, professional depth, and a slight touch of archival mystery. You help users discover movies and anime, rate them, and build their legacy. Keep responses concise and deeply cinematic. Avoid brand names or generic assistant talk." }]
      }
    });

    const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.json({ reply });
  } catch (err) {
    console.error("AIRA DIAGNOSTIC:", err.response?.data || err.message);
    res.status(500).json({ error: "The archives are shrouded in mist. Attempt the connection again." });
  }
});

module.exports = router;
