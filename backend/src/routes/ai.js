const express = require("express");
const axios = require("axios");
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

router.post("/oracle", async (req, res) => {
  const { prompt, history } = req.body;
  
  if (!GEMINI_API_KEY) {
    return res.json({ reply: "The AIRA key is missing in the Vercel vault." });
  }

  try {
    const formattedHistory = (history || []).map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }));

    const response = await axios.post(API_URL, {
      contents: [
        ...formattedHistory,
        { role: "user", parts: [{ text: `System Instruction: You are AIRA, a mystical cinematic guide. Answer clearly and concisely. \n\n User Query: ${prompt}` }] }
      ]
    }, { timeout: 10000 });

    const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error("The archives are silent.");
    res.json({ reply });
  } catch (err) {
    const errorDetail = err.response?.data?.error?.message || err.message;
    console.error("AIRA ERROR:", errorDetail);
    res.json({ reply: `DEBUG ERROR: ${errorDetail}. Please check your Key on Vercel.` });
  }
});

module.exports = router;
