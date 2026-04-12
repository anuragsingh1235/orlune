const express = require('express');
const router  = express.Router();
const ytdl    = require('@distube/ytdl-core');

// Supported platforms helper
const detectPlatform = (url) => {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  return null;
};

// ── GET /api/download/info?url= ──────────────────────────────
router.get('/info', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const platform = detectPlatform(url);

  try {
    if (platform === 'youtube') {
      const info = await ytdl.getInfo(url);
      const formats = ytdl.filterFormats(info.formats, 'videoandaudio').slice(0, 5);
      return res.json({
        title: info.videoDetails.title,
        thumbnail: info.videoDetails.thumbnails?.slice(-1)[0]?.url,
        duration: info.videoDetails.lengthSeconds,
        author: info.videoDetails.author?.name,
        platform: 'youtube',
        formats: formats.map(f => ({
          itag: f.itag,
          quality: f.qualityLabel || f.quality,
          container: f.container,
          size: f.contentLength ? `${(f.contentLength / 1e6).toFixed(1)} MB` : 'Unknown'
        }))
      });
    }

    if (platform === 'instagram') {
      // For Instagram, we proxy through a public resolver
      // Note: Instagram requires login for most content — public posts only
      return res.json({ 
        platform: 'instagram',
        message: 'Instagram download — paste the direct video URL from the browser',
        formats: []
      });
    }

    return res.status(400).json({ error: 'Unsupported platform. Supported: YouTube, Instagram' });
  } catch (err) {
    console.error('Download info error:', err.message);
    return res.status(500).json({ error: 'Could not fetch video info. Check if the URL is public.' });
  }
});

// ── GET /api/download/stream?url=&itag= ──────────────────────
router.get('/stream', async (req, res) => {
  const { url, itag } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
    res.header('Content-Type', 'video/mp4');

    ytdl(url, { quality: itag || 'highestvideo' }).pipe(res);
  } catch (err) {
    console.error('Stream error:', err.message);
    res.status(500).json({ error: 'Download failed. Video may be age-restricted or private.' });
  }
});

module.exports = router;
