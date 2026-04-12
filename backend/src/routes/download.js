const express = require('express');
const router  = express.Router();
const axios   = require('axios');

// ── COBALT PREMIUM API CONFIG ─────────────────────────────
// Mirror: Night City (Current Active Stable Instance)
const COBALT_INSTANCES = [
  'https://cobalt.night-city.top/api/json',
  'https://cobalt-api.v0.pw/api/json', // Mirror 1
  'https://co.wuk.sh/api/json',        // Legacy
  'https://api.cobalt.tools/api/json', // Official (Rate limited)
  'https://cobalt.hyra.workers.dev/api/json'
];

const detectPlatform = (url) => {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  return 'other';
};

router.get('/info', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });

  let lastError = null;
  for (const instance of COBALT_INSTANCES) {
    try {
      const platform = detectPlatform(url);
      const cobaltRes = await axios.post(instance, {
        url: url,
        vQuality: '720', // Faster extraction
        isNoTTWatermark: true,
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 8000
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
      lastError = err.response?.data?.text || err.message;
      continue;
    }
  }

  return res.status(500).json({ error: `Extraction failed: ${lastError}` });
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
