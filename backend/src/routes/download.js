const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/info', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: 'Video ID required' });

  const instances = [
    'https://invidious.projectsegfau.lt',
    'https://iv.ggtyler.dev',
    'https://invidious.asir.dev',
    'https://yewtu.be'
  ];

  for (const inst of instances) {
    try {
      const response = await axios.get(`${inst}/api/v1/videos/${videoId}`, { timeout: 5000 });
      if (response.data) {
        return res.json({
          title: response.data.title,
          thumbnail: response.data.videoThumbnails?.find(t => t.quality === 'high')?.url || response.data.videoThumbnails?.[0]?.url,
          options: response.data.formatStreams.map(s => ({
            label: `${s.qualityLabel} - ${s.container.toUpperCase()}`,
            url: s.url,
            quality: s.qualityLabel
          }))
        });
      }
    } catch (e) {
      console.warn(`Backend: Instance ${inst} failed for ID ${videoId}`);
    }
  }

  res.status(500).json({ error: 'All extraction engines are busy. Try again later!' });
});

module.exports = router;
