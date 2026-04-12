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

// ── ROBUST YOUTUBE AGENT ──────────────────────────────
const getInfoWithBypass = async (url) => {
  // Use a temporary directory for any potential internal cache/debug writes
  // though ytdl should not write files by default.
  const commonOptions = {
    requestOptions: {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
      }
    }
  };

  try {
    // Try Chrome
    return await ytdl.getInfo(url, {
      ...commonOptions,
      requestOptions: {
        headers: {
          ...commonOptions.requestOptions.headers,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        }
      }
    });
  } catch (e1) {
    // Try Android
    console.warn("Retrying with Android Client...");
    return await ytdl.getInfo(url, {
      ...commonOptions,
      requestOptions: {
        headers: {
          ...commonOptions.requestOptions.headers,
          'User-Agent': 'com.google.android.youtube/19.05.35 (Linux; U; Android 11; Pixel 4 XL)',
          'X-YouTube-Client-Name': '3',
          'X-YouTube-Client-Version': '19.05.35',
        }
      }
    });
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
      const info = await getInfoWithBypass(url);
      
      const videoFormats = ytdl.filterFormats(info.formats, 'videoonly');
      const combinedFormats = ytdl.filterFormats(info.formats, 'videoandaudio');

      const results = [];
      const uniqueQualities = new Set();

      combinedFormats.forEach(f => {
        if (!uniqueQualities.has(f.qualityLabel)) {
          uniqueQualities.add(f.qualityLabel);
          results.push({ itag: f.itag, quality: f.qualityLabel || 'Auto', container: f.container, size: f.contentLength ? `${(f.contentLength / 1e6).toFixed(1)} MB` : '~ MB', hasAudio: true });
        }
      });

      videoFormats.forEach(f => {
        if (!uniqueQualities.has(f.qualityLabel)) {
          uniqueQualities.add(f.qualityLabel);
          results.push({ itag: f.itag, quality: f.qualityLabel, container: f.container, size: f.contentLength ? `${(f.contentLength / 1e6).toFixed(1)} MB` : '~ MB', hasAudio: false });
        }
      });

      return res.json({
        title: info.videoDetails.title,
        thumbnail: info.videoDetails.thumbnails?.slice(-1)[0]?.url,
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
        formats: links.url_list.map((link, i) => ({ itag: `insta-${i}`, quality: i === 0 ? 'Original Quality' : `Mirror ${i+1}`, container: 'mp4', size: 'Auto', directUrl: link }))
      });
    }

    return res.status(400).json({ error: 'Unsupported platform' });
  } catch (err) {
    const errorMsg = err.message || 'Unknown error';
    if (errorMsg.includes('Sign in')) {
      return res.status(500).json({ error: "YouTube detection wall. Try a different video." });
    }
    // Handle the EROFS error specifically - it usually means ytdl tried to dump a debug file because it failed
    if (errorMsg.includes('EROFS')) {
       return res.status(500).json({ error: "High security detected. YouTube is preventing this extraction." });
    }
    return res.status(500).json({ error: `Extraction error: ${errorMsg}` });
  }
});

router.get('/stream', async (req, res) => {
  const { url, itag } = req.query;
  try {
    const platform = detectPlatform(url);
    if (platform === 'youtube') {
      const info = await getInfoWithBypass(url);
      const title = info.videoDetails.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const format = info.formats.find(f => String(f.itag) === String(itag));
      res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
      
      if (format && format.hasAudio) {
        ytdl(url, { itag }).pipe(res);
      } else {
        const videoStream = ytdl(url, { quality: itag });
        const audioStream = ytdl(url, { quality: 'highestaudio' });
        ffmpeg().input(videoStream).input(audioStream).videoCodec('copy').audioCodec('aac').format('mp4').pipe(res);
      }
    } else if (platform === 'instagram') {
      const links = await instagramGetUrl(url);
      const response = await axios({ method: 'get', url: links.url_list[0], responseType: 'stream' });
      res.header('Content-Disposition', `attachment; filename="instagram_media.mp4"`);
      response.data.pipe(res);
    }
  } catch (err) {
    if (!res.headersSent) res.status(500).send('Stream error');
  }
});

module.exports = router;
