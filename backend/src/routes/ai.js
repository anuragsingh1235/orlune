const express = require("express");
const axios = require("axios");
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim().replace(/['"]+/g, '');
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

router.post("/oracle", async (req, res) => {
  const { prompt } = req.body;
  if (!GEMINI_API_KEY) return res.json({ reply: "AIRA Key is missing in Vercel." });

  try {
    const response = await axios.post(API_URL, {
      contents: [{ role: "user", parts: [{ text: `Mystical answer: ${prompt}` }] }]
    }, { timeout: 10000 });

    const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.json({ reply: reply || "The archives are silent." });
  } catch (err) {
    const googleMsg = err.response?.data?.error?.message || err.message;
    const keyFingerprint = `${GEMINI_API_KEY.slice(0, 4)}...${GEMINI_API_KEY.slice(-4)}`;
    res.json({ 
      reply: `AIRA LINK ERROR: ${googleMsg} (Key Fingerprint: ${keyFingerprint}). Verify this matches your Vercel key.` 
    });
  }
});

module.exports = router;
