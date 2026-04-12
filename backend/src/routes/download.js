const express = require('express');
const router  = express.Router();
const ytdl    = require('@distube/ytdl-core');
const ffmpeg  = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

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
      
      // Filter for video formats
      const videoFormats = ytdl.filterFormats(info.formats, 'videoonly');
      const combinedFormats = ytdl.filterFormats(info.formats, 'videoandaudio');

      // We focus on video formats and will merge audio later
      const uniqueQualities = new Set();
      const results = [];

      // Add combined formats first
      combinedFormats.forEach(f => {
        if (!uniqueQualities.has(f.qualityLabel)) {
          uniqueQualities.add(f.qualityLabel);
          results.push({
            itag: f.itag,
            quality: f.qualityLabel || f.quality,
            container: f.container,
            size: f.contentLength ? `${(f.contentLength / 1e6).toFixed(1)} MB` : '~',
            hasAudio: true
          });
        }
      });

      // Add high quality video-only formats
      videoFormats.forEach(f => {
        if (!uniqueQualities.has(f.qualityLabel)) {
          uniqueQualities.add(f.qualityLabel);
          results.push({
            itag: f.itag,
            quality: f.qualityLabel,
            container: f.container,
            size: f.contentLength ? `${(f.contentLength / 1e6).toFixed(1)} MB` : '~',
            hasAudio: false
          });
        }
      });

      return res.json({
        title: info.videoDetails.title,
        thumbnail: info.videoDetails.thumbnails?.slice(-1)[0]?.url,
        duration: info.videoDetails.lengthSeconds,
        author: info.videoDetails.author?.name,
        platform: 'youtube',
        formats: results.sort((a,b) => parseInt(b.quality) - parseInt(a.quality)).slice(0, 8)
      });
    }

    if (platform === 'instagram') {
      return res.json({ 
        platform: 'instagram',
        message: 'Instagram downloader — ensure link is public.',
        formats: [{ itag: 'insta', quality: 'High Quality', container: 'mp4', size: 'Auto' }]
      });
    }

    return res.status(400).json({ error: 'Unsupported platform' });
  } catch (err) {
    return res.status(500).json({ error: 'Fetch failed. Link may be private.' });
  }
});

// ── GET /api/download/stream?url=&itag= ──────────────────────
// This route now uses ffmpeg to merge audio and video if needed
router.get('/stream', async (req, res) => {
  const { url, itag } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    const format = info.formats.find(f => String(f.itag) === String(itag));
    
    res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
    res.header('Content-Type', 'video/mp4');

    if (format && format.hasAudio) {
      // Direct stream for low quality combined formats
      ytdl(url, { format }).pipe(res);
    } else {
      // Merge high quality video with best audio using FFMPEG
      const videoStream = ytdl(url, { quality: itag });
      const audioStream = ytdl(url, { quality: 'highestaudio' });

      ffmpeg()
        .input(videoStream)
        .input(audioStream)
        .videoCodec('copy')
        .audioCodec('aac')
        .format('mp4')
        .on('error', err => console.error('FFMPEG Error:', err))
        .pipe(res, { end: true });
    }
  } catch (err) {
    res.status(500).send('Download failed');
  }
});

module.exports = router;
