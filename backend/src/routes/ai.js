const express = require("express");
const axios = require("axios");
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

router.post("/oracle", async (req, res) => {
  const { prompt, history } = req.body;
  
  if (!GEMINI_API_KEY) {
    return res.json({ reply: "The AIRA key is missing in the Vercel vault. Please ensure GEMINI_API_KEY is set." });
  }

  try {
    const formattedHistory = (history || []).map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }));

    const response = await axios.post(API_URL, {
      system_instruction: { 
        parts: [{ text: "You are AIRA, a mystical cinematic assistant for the Orlune platform. Speak with atmospheric, professional depth. Keep responses concise and focused on movies, series, or anime." }] 
      },
      contents: [
        ...formattedHistory,
        { role: "user", parts: [{ text: prompt }] }
      ]
    }, { timeout: 10000 });

    const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error("The archives are silent.");
    res.json({ reply });
  } catch (err) {
    console.error("AIRA ERROR:", err.response?.data || err.message);
    res.json({ reply: "The connection to the archives is momentarily veiled. Verify your API key has enough quota or try again." });
  }
});

module.exports = router;
