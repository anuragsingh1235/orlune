const express = require("express");
const axios = require("axios");
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim().replace(/['"]+/g, '');
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

router.post("/oracle", async (req, res) => {
  const { prompt } = req.body;
  if (!GEMINI_API_KEY) return res.json({ reply: "AIRA Key is missing in Vercel." });

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      { contents: [{ role: "user", parts: [{ text: `You are AIRA, a mystical cinematic guide. Answer atmosphericly: ${prompt}` }] }] },
      { timeout: 10000 }
    );

    const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.json({ reply: reply || "The archives are silent." });
  } catch (err) {
    console.error("AIRA ERROR:", err.response?.data || err.message);
    res.json({ reply: "The connection to the archives is momentarily veiled. Seek your answer again, traveler." });
  }
});

module.exports = router;
