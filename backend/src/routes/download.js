const express = require('express');
const router  = express.Router();
const axios   = require('axios');

// ── COBALT PREMIUM API CONFIG ─────────────────────────────
// Mirror: Night City (Current Active Stable Instance)
const COBALT_INSTANCES = [
  'https://cobalt-api.v0.pw/api/json',
  'https://cobalt.k00.dev/api/json',    // Stable v10
  'https://co.wuk.sh/api/json',
  'https://cobalt.night-city.top/api/json',
  'https://cobalt.api.unv.me/api/json'
];

const detectPlatform = (url) => {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  return 'other';
};

router.get('/info', async (req, res) => {
  let { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('instagram.com')) {
      url = `${urlObj.origin}${urlObj.pathname}`;
    }
  } catch (e) {}

  let lastError = null;
  for (const instance of COBALT_INSTANCES) {
    try {
      const platform = detectPlatform(url);
      const cobaltRes = await axios.post(instance, {
        url: url,
        videoQuality: '720',    // v10 spec
        filenameStyle: 'nerdy', // v10 spec
        downloadMode: 'video', 
        isNoTTWatermark: true,
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 15000
      });

      const data = cobaltRes.data;

      if (data.status === 'error') throw new Error(data.text);

      if (data.url || data.status === 'redirect' || data.status === 'stream') {
        return res.json({
          title: platform === 'youtube' ? 'YouTube Media' : 'Social Media',
          thumbnail: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&q=80',
          author: 'Orlune Node',
          platform: platform,
          url: data.url, // Directly return URL for RIC
          formats: [{ itag: 'hd', quality: 'HD', directUrl: data.url }]
        });
      }

      if (data.status === 'picker') {
        return res.json({
          title: 'Gallery Stream',
          url: data.picker[0].url,
          formats: data.picker.map((item, i) => ({ itag: i, quality: `Item ${i+1}`, directUrl: item.url }))
        });
      }
    } catch (err) {
      console.error(`Cobalt Instance [${instance}] failed:`, err.message);
      lastError = err.response?.data?.text || err.message;
      if (lastError.includes('404')) {
        lastError = "Media not found or link is private (Error 404)";
      }
      continue;
    }
  }

  return res.status(500).json({ error: `Extraction Failed: ${lastError}. Ensure the link is public.` });
});

// Since Cobalt gives a direct download URL that handles headers, we can just redirect
// or we can proxy if we want to obscure the source. Redirecting is faster for the user.
router.get('/stream', async (req, res) => {
  const { directUrl } = req.query;
  if (!directUrl) return res.status(400).send('No direct URL provided');
  
  // Cobalt's links usually expire quickly or need regular browser download behavior.
  // We will redirect the user to the final file link.
  res.redirect(directUrl);
});

module.exports = router;
