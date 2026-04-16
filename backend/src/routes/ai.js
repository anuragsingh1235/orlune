const express = require("express");
const axios = require("axios");
const router = express.Router();

const cleanKey = (k) => k?.trim().replace(/['"\s\n\r]+/g, '');
const OPENROUTER_API_KEY = cleanKey(process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY);

router.post("/oracle", async (req, res) => {
  const { prompt, history } = req.body;
  if (!OPENROUTER_API_KEY) return res.json({ reply: "AIRA Vault is Locked: API Key is missing." });
  
  try {
    const messages = [
      { 
        role: "system", 
        content: "You are Orlune AI (AIRA), the intelligent cinematic authority. Your primary directive is to provide factual, specific information about movies and TV shows, including release dates and upcoming seasons. You communicate with professional elegance. Never use generic placeholders like [Series Name]; instead, identify the subject from the user's query. If you are unsure of a specific date, provide the best known release window (e.g., 'Late 2024')."
      }
    ];
    if (Array.isArray(history)) {
      history.forEach(turn => {
        messages.push({ role: turn.role === 'user' ? 'user' : 'assistant', content: turn.content });
      });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "google/gemini-2.0-flash-001",
        messages: messages
      },
      { 
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://orlune.vercel.app",
          "X-Title": "Orlune Watchlist Wars"
        },
        timeout: 20000 
      }
    );

    const reply = response.data.choices?.[0]?.message?.content;
    res.json({ reply: reply || "The archives are silent." });
  } catch (err) {
    console.error("AIRA ERROR:", err.response?.data || err.message);
    const detail = err.response?.data?.error?.message || err.message;
    res.json({ reply: `AIRA connection lost. (${detail || 'Check API Key/Quota'})` });
  }
});

module.exports = router;
