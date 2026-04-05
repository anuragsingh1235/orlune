const express = require("express");
const axios = require("axios");
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim().replace(/['"]+/g, '');
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

router.post("/oracle", async (req, res) => {
  const { prompt } = req.body;
  if (!GEMINI_API_KEY) return res.json({ reply: "AIRA Key is missing in Vercel." });

  // 🧪 SEQUENTIAL MODEL ATTEMPT
  const models = ["gemini-1.5-flash", "gemini-pro"];
  let lastError = "";

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const response = await axios.post(url, {
        contents: [{ role: "user", parts: [{ text: `Answer mysticly and short: ${prompt}` }] }]
      }, { timeout: 10000 });

      const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return res.json({ reply });
    } catch (err) {
      lastError = err.response?.data?.error?.message || err.message;
      console.warn(`Model ${model} failed:`, lastError);
    }
  }

  const keyFingerprint = `${GEMINI_API_KEY.slice(0, 4)}...${GEMINI_API_KEY.slice(-4)}`;
  res.json({ 
    reply: `AIRA LINK ERROR: ${lastError} (Fingerprint: ${keyFingerprint}). Action: Ensure 'Generative Language API' is ENABLED for project 788860256376.` 
  });
});

module.exports = router;
