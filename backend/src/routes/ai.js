const express = require("express");
const axios = require("axios");
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

router.post("/oracle", async (req, res) => {
  const { prompt, history } = req.body;
  
  if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith("REPLACE_ME")) {
    console.warn("AIRA: KEY MISSING. Using Limited Oracle Access.");
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
        parts: [{ text: "You are AIRA, a mystical, cinematic AI companion for the Orlune Cinematic Vault. You speak with high-fidelity professional depth and archival mystery. You are a curator of legends—movies, series, and anime. Help the seeker discover masterpieces. Keep responses concise, professional, and atmospheric. Never mention generic AI talk." }]
      }
    }, { timeout: 10000 });

    const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error("The archives are silent.");
    res.json({ reply });
  } catch (err) {
    console.error("AIRA ERROR:", err.response?.data || err.message);
    res.json({ reply: "The connection to the archives is momentarily veiled. Seek your answer again, traveler." });
  }
});

module.exports = router;
