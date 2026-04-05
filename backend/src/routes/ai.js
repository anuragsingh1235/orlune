const express = require("express");
const axios = require("axios");
const router = express.Router();

const cleanKey = (k) => k?.trim().replace(/['"\s\n\r]+/g, '');
const GEMINI_API_KEY = cleanKey(process.env.GEMINI_API_KEY);

router.post("/oracle", async (req, res) => {
  const { prompt } = req.body;
  if (!GEMINI_API_KEY) return res.json({ reply: "AIRA Vault is Locked: Key is missing in Vercel. Check Settings." });
  
  if (!GEMINI_API_KEY.startsWith("AIza")) {
      return res.json({ reply: `AIRA Vault Locked: Key format invalid (Starts with ${GEMINI_API_KEY.slice(0,4)}...). Must start with AIza.` });
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: `${prompt}` }] }] },
      { timeout: 10000 }
    );

    const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.json({ reply: reply || "The archives are silent." });
  } catch (err) {
    console.error("AIRA ERROR:", err.response?.data || err.message);
    const code = err.response?.status;
    res.json({ reply: `The connection to the archives is veiled (${code === 403 ? 'Key Disabled/Enable API' : 'Connection Lost'}). Seek again, traveler.` });
  }
});

module.exports = router;
