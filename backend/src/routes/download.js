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

// ── INVIDIOUS INSTANCES (Fallback for Bot Detection) ──
const INVIDIOUS_INSTANCES = [
  'https://yewtu.be',
  'https://invidious.lunar.icu',
  'https://inv.riverside.rocks',
  'https://invidious.snopyta.org'
];

const getYouTubeInfoWithFallback = async (url) => {
  const videoIdMatch = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([^#&?]{11})/);
  const videoId = videoIdMatch ? videoIdMatch[1] : null;

  // 1. Try Standard YTDL Logic
  try {
    return await ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        }
      }
    });
  } catch (err) {
    if (!err.message.includes('Sign in') && !err.message.includes('bot')) throw err;
    
    console.warn("Blocked by YouTube. Switching to Invidious Fallback...");
    
    // 2. Try Invidious API (Public Instance Hopping)
    if (!videoId) throw new Error("Could not extract Video ID for fallback.");

    for (const instance of INVIDIOUS_INSTANCES) {
      try {
        const res = await axios.get(`${instance}/api/v1/videos/${videoId}`, { timeout: 5000 });
        if (res.data && res.data.title) {
          // Map Invidious response to a structure our frontend expects
          return {
            videoDetails: {
              title: res.data.title,
              thumbnails: res.data.videoThumbnails || [],
              author: { name: res.data.author },
              lengthSeconds: res.data.lengthSeconds
            },
            formats: res.data.formatStreams.map(s => ({
              itag: s.itag,
              quality: s.qualityLabel || s.quality,
              container: s.container || 'mp4',
              url: s.url,
              hasAudio: true,
              contentLength: 0
            }))
          };
        }
      } catch (e) {
        continue; // Try next instance
      }
    }
    throw new Error("YouTube and all fallback servers are currently blocking this request.");
  }
};

const detectPlatform = (url) => {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  return null;
};

router.get('/info', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const platform = detectPlatform(url);

  try {
    if (platform === 'youtube') {
      const info = await getYouTubeInfoWithFallback(url);
      
      let results = [];
      if (info.formats) {
        results = info.formats.map(f => ({
          itag: f.itag,
          quality: f.qualityLabel || f.quality || 'Auto',
          container: f.container || 'mp4',
          size: f.contentLength ? `${(f.contentLength / 1e6).toFixed(1)} MB` : '~ MB',
          hasAudio: f.hasAudio
        }));
      }

      return res.json({
        title: info.videoDetails.title,
        thumbnail: info.videoDetails.thumbnails?.slice(-1)[0]?.url || info.videoDetails.thumbnails?.[0]?.url,
        author: info.videoDetails.author?.name,
        formats: results.sort((a,b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0)).slice(0, 8)
      });
    }

    if (platform === 'instagram') {
      const links = await instagramGetUrl(url);
      return res.json({ 
        platform: 'instagram',
        title: 'Instagram Media',
        thumbnail: links.url_list[0],
        formats: links.url_list.map((link, i) => ({ itag: `insta-${i}`, quality: 'Original', container: 'mp4', size: 'Auto', directUrl: link }))
      });
    }

    return res.status(400).json({ error: 'Unsupported platform' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/stream', async (req, res) => {
  const { url, itag } = req.query;
  try {
    const platform = detectPlatform(url);
    if (platform === 'youtube') {
      const info = await getYouTubeInfoWithFallback(url);
      const title = info.videoDetails.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      // If we got the info from Invidious, we use their direct URL
      const targetFormat = info.formats.find(f => String(f.itag) === String(itag));
      if (targetFormat && targetFormat.url) {
        res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
        const response = await axios({ method: 'get', url: targetFormat.url, responseType: 'stream' });
        return response.data.pipe(res);
      }

      // Otherwise fall back to ytdl stream
      res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
      ytdl(url, { itag }).pipe(res);

    } else if (platform === 'instagram') {
      const links = await instagramGetUrl(url);
      const response = await axios({ method: 'get', url: links.url_list[0], responseType: 'stream' });
      res.header('Content-Disposition', `attachment; filename="instagram_media.mp4"`);
      response.data.pipe(res);
    }
  } catch (err) {
    if (!res.headersSent) res.status(500).send('Stream failed');
  }
});

module.exports = router;
