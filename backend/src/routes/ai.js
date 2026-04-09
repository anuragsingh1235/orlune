const express = require("express");
const axios = require("axios");
const router = express.Router();

const cleanKey = (k) => k?.trim().replace(/['"\s\n\r]+/g, '');
const GEMINI_API_KEY = cleanKey(process.env.GEMINI_API_KEY);

router.post("/oracle", async (req, res) => {
  const { prompt, history } = req.body;
  if (!GEMINI_API_KEY) return res.json({ reply: "AIRA Vault is Locked: GEMINI_API_KEY is missing in Vercel environment variables." });
  
  if (!GEMINI_API_KEY.startsWith("AIza")) {
      return res.json({ reply: `AIRA Vault Locked: Key format invalid (Starts with ${GEMINI_API_KEY.slice(0,4)}...). Must start with AIza.` });
  }

  try {
    // Build conversation turns for context
    const contents = [];
    if (Array.isArray(history)) {
      history.forEach(turn => {
        if (turn.role === 'user') contents.push({ role: 'user', parts: [{ text: turn.content }] });
        if (turn.role === 'aira') contents.push({ role: 'model', parts: [{ text: turn.content }] });
      });
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      { contents },
      { timeout: 15000 }
    );

    const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.json({ reply: reply || "The archives are silent." });
  } catch (err) {
    console.error("AIRA ERROR:", err.response?.data || err.message);
    const code = err.response?.status;
    const detail = err.response?.data?.error?.message || err.message;
    if (code === 403) return res.json({ reply: `AIRA: API Key disabled. Enable Gemini API in Google Cloud Console.` });
    if (code === 429) return res.json({ reply: `AIRA: Rate limit hit. Try again in a moment, traveler.` });
    res.json({ reply: `AIRA connection lost. (${detail || 'Network error'})` });
  }
});

module.exports = router;
