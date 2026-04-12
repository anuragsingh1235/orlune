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
      // Use a more realistic user agent to avoid bot detection
      const info = await ytdl.getInfo(url, {
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          }
        }
      });
      
      const videoFormats = ytdl.filterFormats(info.formats, 'videoonly');
      const combinedFormats = ytdl.filterFormats(info.formats, 'videoandaudio');

      const uniqueQualities = new Set();
      const results = [];

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
        formats: results.sort((a,b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0)).slice(0, 8)
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
    console.error('YTDL Info Error:', err.message);
    return res.status(500).json({ error: `Extraction failed: ${err.message}` });
  }
});

// ── GET /api/download/stream?url=&itag= ──────────────────────
router.get('/stream', async (req, res) => {
  const { url, itag } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const info = await ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      }
    });

    const title = info.videoDetails.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const format = info.formats.find(f => String(f.itag) === String(itag));
    
    res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
    res.header('Content-Type', 'video/mp4');

    const options = {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      }
    };

    if (format && (format.hasAudio || format.audioCodec)) {
      ytdl(url, { ...options, format }).pipe(res);
    } else {
      const videoStream = ytdl(url, { ...options, quality: itag });
      const audioStream = ytdl(url, { ...options, quality: 'highestaudio' });

      ffmpeg()
        .input(videoStream)
        .input(audioStream)
        .videoCodec('copy')
        .audioCodec('aac')
        .format('mp4')
        .on('error', err => {
          console.error('FFMPEG Error:', err);
          if (!res.headersSent) res.status(500).send('FFMPEG processing failed');
        })
        .pipe(res, { end: true });
    }
  } catch (err) {
    console.error('YTDL Stream Error:', err.message);
    if (!res.headersSent) res.status(500).send('Download failed: ' + err.message);
  }
});

module.exports = router;
