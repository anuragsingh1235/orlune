const express = require('express');
const router  = express.Router();
const axios   = require('axios');

// ── COBALT PREMIUM API CONFIG ─────────────────────────────
// Mirror: Night City (Current Active Stable Instance)
const COBALT_API = 'https://cobalt.night-city.top/api/json';


const detectPlatform = (url) => {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  return 'other';
};

router.get('/info', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const platform = detectPlatform(url);

    // We make a request to Cobalt to see if the link is valid and get metadata
    const cobaltRes = await axios.post(COBALT_API, {
      url: url,
      vQuality: '1080',
      aFormat: 'mp3',
      isAudioOnly: false,
      isNoTTWatermark: true,
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    const data = cobaltRes.data;

    // Cobalt returns 'picker' if there are multiple files (like an Insta carousel)
    // or 'url'/'stream' if it's a single video.
    if (data.status === 'error') {
      throw new Error(data.text || 'Extraction failed');
    }

    if (data.status === 'redirect' || data.url) {
      // Single video/photo
      return res.json({
        title: platform === 'youtube' ? 'YouTube Media' : 'Instagram Media',
        thumbnail: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&q=80', // Cobalt doesn't always return thumbs, so we use a pro placeholder
        author: 'Orlune Extractor',
        platform: platform,
        formats: [
          {
            itag: 'cobalt-hd',
            quality: 'High Quality (MP4)',
            container: 'mp4',
            size: 'Auto',
            directUrl: data.url
          }
        ]
      });
    }

    if (data.status === 'picker') {
      // Multiple items (Insta Carousel)
      return res.json({
        title: 'Multi-Media Content',
        thumbnail: data.picker[0].url,
        author: 'Orlune Extractor',
        platform: platform,
        formats: data.picker.map((item, i) => ({
          itag: `item-${i}`,
          quality: `Media Item ${i+1}`,
          container: 'media',
          size: 'Auto',
          directUrl: item.url
        }))
      });
    }

    throw new Error("Unknown response status from extraction engine.");

  } catch (err) {
    console.error('Cobalt Error:', err.response?.data || err.message);
    const msg = err.response?.data?.text || err.message;
    return res.status(500).json({ error: `Orlune Engine Error: ${msg}` });
  }
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
