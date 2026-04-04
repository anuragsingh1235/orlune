const axios = require("axios");

/**
 * ─── ANIME CONTROLLER (Jikan API v4) ──────────────────────────────
 * Using Jikan, the open-source MyAnimeList API, to bring in high-end 
 * anime data without requiring keys.
 */

// Mapping Jikan -> Orlune Card Structure
function jikanToOrlune(a) {
  return {
    id: a.mal_id,
    title: a.title_english || a.title,
    overview: a.synopsis || "No synopsis available in the archive.",
    poster_path: a.images?.webp?.large_image_url || a.images?.jpg?.large_image_url,
    backdrop_path: null,
    release_date: a.aired?.from ? a.aired.from.split('T')[0] : a.year?.toString(),
    vote_average: a.score || 0,
    genre_ids: a.genres?.map(g => g.name) || [],
    media_type: "anime",
    _api_source: "jikan"
  };
}

// Search YouTube fallback using provided key
async function getYoutubeTrailer(title, year = "") {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.REACT_APP_YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    const query = encodeURIComponent(`${title} anime official trailer`);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&videoEmbeddable=true&maxResults=1&key=${apiKey}`;
    const response = await axios.get(url, { timeout: 4000 });
    
    if (response.data.items?.length > 0) {
      return response.data.items[0].id.videoId;
    }
  } catch (err) {
    console.error("YouTube Anime search error:", err.message);
  }
  return null;
}

exports.getTrending = async (req, res) => {
  try {
    const response = await axios.get("https://api.jikan.moe/v4/top/anime", {
      timeout: 8000,
      params: { filter: "bypopularity", sfw: true, limit: 12 }
    });
    const results = (response.data.data || []).map(jikanToOrlune);
    res.json(results);
  } catch (err) {
    console.error("Jikan API error:", err.message);
    const fallback = [
        { id: 52991, title: "Frieren: Beyond Journey's End", vote_average: 9.4, poster_path: "https://cdn.myanimelist.net/images/anime/1015/138064l.jpg" },
        { id: 5114, title: "Fullmetal Alchemist: Brotherhood", vote_average: 9.1, poster_path: "https://cdn.myanimelist.net/images/anime/1223/96541l.jpg" }
    ].map(m => ({ ...m, _api_source: "jikan", media_type: "anime" }));
    res.json(fallback);
  }
};

exports.search = async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    try {
        const response = await axios.get(`https://api.jikan.moe/v4/anime`, {
            timeout: 8000,
            params: { q, limit: 15, sfw: true, order_by: "popularity" }
        });
        const results = (response.data.data || []).map(jikanToOrlune);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: "Search unavailable." });
    }
};

// Search YouTube for related iconic scenes
async function getYoutubeScenes(title, year = "") {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.REACT_APP_YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const query = encodeURIComponent(`${title} anime iconic moments epic scenes`);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&videoEmbeddable=true&maxResults=4&key=${apiKey}`;
    const response = await axios.get(url, { timeout: 4000 });
    
    return (response.data.items || []).map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url
    }));
  } catch (err) {
    console.error("YouTube Anime Scenes error:", err.message);
  }
  return [];
}

// ─── ANIME DETAILS (Jikan + YouTube Trailer + Scenes) ────────────────────
exports.getDetails = async (req, res) => {
  const { id } = req.params;
  
  try {
    const response = await axios.get(`https://api.jikan.moe/v4/anime/${id}/full`, { timeout: 6000 });
    const a = response.data.data;
    if (!a) return res.status(404).json({ error: "Anime not found." });

    const title = a.title_english || a.title;
    let trailerId = a.trailer?.youtube_id || null;

    // Use Promise.allSettled to ensure YouTube failures don't block metadata
    const [trailerRes, scenesRes] = await Promise.allSettled([
      !trailerId ? getYoutubeTrailer(title) : Promise.resolve(trailerId),
      getYoutubeScenes(title)
    ]);

    const finalTrailerId = trailerRes.status === 'fulfilled' ? trailerRes.value : trailerId;
    const finalScenes = scenesRes.status === 'fulfilled' ? scenesRes.value : [];

    res.json({
      ...jikanToOrlune(a),
      trailerId: finalTrailerId,
      relatedScenes: finalScenes,
      episodes: a.episodes,
      status: a.status,
      duration: a.duration,
      rating: a.rating,
      studios: a.studios?.map(s => s.name) || [],
      genres: a.genres?.map(g => g.name) || [],
    });
  } catch (err) {
    console.error("Anime detail error:", err.message);
    // Return a skeleton if MAL is partially down but search worked
    res.status(500).json({ error: "The series legacy is momentarily veiled. Try again shortly." });
  }
};
