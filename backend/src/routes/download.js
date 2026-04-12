const express = require('express');
const router = express.Router();
const ytdl = require('@distube/ytdl-core');

router.get('/', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const isValid = ytdl.validateURL(videoUrl);
    if (!isValid) {
       // Just send a placeholder if it's not a youtube URL (e.g. instagram bypass mock)
       // Since we're doing a direct download for whatever, we'd normally use other tools.
       // But user wanted YouTube to work directly.
       const buf = Buffer.from("Direct download simulation for " + videoUrl);
       res.setHeader('Content-Disposition', `attachment; filename="Media_Download.txt"`);
       res.setHeader('Content-Type', 'text/plain');
       return res.send(buf);
    }

    const info = await ytdl.getInfo(videoUrl);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, '').split(' ').join('_') || 'YouTube_Video';

    res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
    res.header('Content-Type', 'video/mp4');

    ytdl(videoUrl, {
      filter: 'audioandvideo',
      quality: 'highest'
    }).pipe(res);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to extract media' });
  }
});

module.exports = router;
