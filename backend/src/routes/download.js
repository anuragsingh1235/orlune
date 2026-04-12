const express = require('express');
const router  = express.Router();
const ytdl    = require('@distube/ytdl-core');
const instagramGetUrl = require('instagram-url-direct');
const ffmpeg  = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const axios   = require('axios');

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

// ── HEURISTICS TO BYPASS "SIGN IN TO CONFIRM YOU'RE NOT A BOT" ──
// We rotate some common headers and set specific client options
const YTDL_OPTIONS = {
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
    }
  }
};

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
      // Trying with 'IOS' client often bypasses the bot detection wall on shared server IPs
      const info = await ytdl.getInfo(url, YTDL_OPTIONS);
      
      const videoFormats = ytdl.filterFormats(info.formats, 'videoonly');
      const combinedFormats = ytdl.filterFormats(info.formats, 'videoandaudio');

      const uniqueQualities = new Set();
      const results = [];

      combinedFormats.forEach(f => {
        if (!uniqueQualities.has(f.qualityLabel)) {
          uniqueQualities.add(f.qualityLabel);
          results.push({
            itag: f.itag,
            quality: f.qualityLabel || f.quality || 'Auto',
            container: f.container,
            size: f.contentLength ? `${(f.contentLength / 1e6).toFixed(1)} MB` : '~ MB',
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
            size: f.contentLength ? `${(f.contentLength / 1e6).toFixed(1)} MB` : '~ MB',
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
      const links = await instagramGetUrl(url);
      if (!links || !links.url_list || links.url_list.length === 0) {
        throw new Error("Could not extract Instagram media. Profile might be private.");
      }

      return res.json({ 
        platform: 'instagram',
        title: 'Instagram Media',
        thumbnail: links.url_list[0],
        author: 'Instagram User',
        formats: links.url_list.map((link, i) => ({
          itag: `insta-${i}`,
          quality: i === 0 ? 'Original Quality' : `Mirror ${i+1}`,
          container: 'mp4',
          size: 'Auto',
          directUrl: link
        }))
      });
    }

    return res.status(400).json({ error: 'Unsupported platform' });
  } catch (err) {
    console.error('Download Info Error:', err.message);
    // If it mentions sign in, we give a more helpful message
    if (err.message.includes('Sign in')) {
      return res.status(500).json({ 
        error: "YouTube is blocking this request (Bot Detection). Try again in a few minutes or try another link." 
      });
    }
    return res.status(500).json({ error: `Extraction failed: ${err.message}` });
  }
});

// ── GET /api/download/stream?url=&itag= ──────────────────────
router.get('/stream', async (req, res) => {
  const { url, itag } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const platform = detectPlatform(url);

    if (platform === 'youtube') {
      const info = await ytdl.getInfo(url, YTDL_OPTIONS);
      const title = info.videoDetails.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const format = info.formats.find(f => String(f.itag) === String(itag));
      
      res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
      res.header('Content-Type', 'video/mp4');

      if (format && (format.hasAudio || format.audioCodec)) {
        ytdl(url, { ...YTDL_OPTIONS, format }).pipe(res);
      } else {
        const videoStream = ytdl(url, { ...YTDL_OPTIONS, quality: itag });
        const audioStream = ytdl(url, { ...YTDL_OPTIONS, quality: 'highestaudio' });

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
    } else if (platform === 'instagram') {
      const links = await instagramGetUrl(url);
      const directUrl = links.url_list[0];

      res.header('Content-Disposition', `attachment; filename="instagram_media.mp4"`);
      res.header('Content-Type', 'video/mp4');

      const response = await axios({
        method: 'get',
        url: directUrl,
        responseType: 'stream'
      });

      response.data.pipe(res);
    }
  } catch (err) {
    console.error('Download Stream Error:', err.message);
    if (!res.headersSent) res.status(500).send('Download failed: ' + err.message);
  }
});

module.exports = router;
