const express = require("express");
const axios = require("axios");
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim().replace(/^['"](.*)['"]$/, '$1');
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

router.post("/oracle", async (req, res) => {
  const { prompt, history } = req.body;
  
  if (!GEMINI_API_KEY) {
    return res.json({ reply: "The AIRA key is not detected. Please verify your Vercel settings." });
  }

  try {
    const response = await axios.post(API_URL, {
      contents: [
        { 
          role: "user", 
          parts: [{ text: `You are AIRA, a mystical cinematic assistant. Answer this query atmosphericly: ${prompt}` }] 
        }
      ]
    }, { timeout: 10000 });

    const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error("The archives are silent.");
    res.json({ reply });
  } catch (err) {
    const googleError = err.response?.data?.error?.message || err.message;
    console.error("AIRA ERROR:", googleError);
    res.json({ reply: `AIRA LINK ERROR: ${googleError}. Ensure you hit 'REDEPLOY' on Vercel after adding the key.` });
  }
});

module.exports = router;
