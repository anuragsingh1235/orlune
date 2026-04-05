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
    const query = encodeURIComponent(`${title} anime official trailer 4k cinematic`);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&videoEmbeddable=true&maxResults=1&key=${apiKey}`;
    const response = await axios.get(url, { timeout: 4000 });
    
    if (response.data.items?.length > 0) {
      return response.data.items[0].id.videoId;
    }
  } catch (err) { return null; }
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
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&videoEmbeddable=true&maxResults=10&key=${apiKey}`;
    const response = await axios.get(url, { timeout: 4000 });
    
    return (response.data.items || []).map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url
    }));
  } catch (err) { return []; }
}

// Search YouTube for fan-made content (AMVs, Edits)
async function getYoutubeFanMade(title) {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.REACT_APP_YOUTUBE_API_KEY;
  if (!apiKey) return [];
  try {
    const query = encodeURIComponent(`${title} anime AMV fan edit tribute compilation`);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=10&key=${apiKey}`;
    const response = await axios.get(url, { timeout: 4000 });
    return (response.data.items || []).map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url
    }));
  } catch (err) { return []; }
}

// Search YouTube for general related content
async function getYoutubeGeneralSearch(title) {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.REACT_APP_YOUTUBE_API_KEY;
  if (!apiKey) return [];
  try {
     const query = encodeURIComponent(`${title} anime full episodes clips related`);
     const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=10&key=${apiKey}`;
     const response = await axios.get(url, { timeout: 4000 });
     return (response.data.items || []).map(item => ({
       id: item.id.videoId,
       title: item.snippet.title,
       thumbnail: item.snippet.thumbnails?.medium?.url
     }));
  } catch (err) { return []; }
}

// ─── ANIME DETAILS (Jikan + YouTube Trailer + Scenes + Fan Hub) ────────────────────
exports.getDetails = async (req, res) => {
  const { id } = req.params;
  const tmdbKey = process.env.TMDB_API_KEY;
  
  try {
    let a = null;
    let title = "";
    let baseData = {};

    // 1) Primary: Jikan (MAL)
    try {
      const response = await axios.get(`https://api.jikan.moe/v4/anime/${id}/full`, { timeout: 5000 });
      a = response.data.data;
      if (a) {
        title = a.title_english || a.title;
        baseData = {
          ...jikanToOrlune(a),
          episodes: a.episodes,
          status: a.status,
          duration: a.duration,
          rating: a.rating,
          studios: a.studios?.map(s => s.name) || [],
          genres: a.genres?.map(g => g.name) || [],
        };
      }
    } catch (jikanErr) {
      console.warn("Jikan Details Failed, checking TMDB...");
    }

    // 2) Fallback: TMDB (if Jikan is rate-limited)
    if (!a && tmdbKey) {
      try {
        const tmdbSearch = await axios.get(`https://api.themoviedb.org/3/search/tv?api_key=${tmdbKey}&query=${id}`, { timeout: 4000 });
        if (tmdbSearch.data.results?.length > 0) {
           const t = tmdbSearch.data.results[0];
           title = t.name;
           baseData = { id, title, overview: t.overview, poster_path: t.poster_path, media_type: 'anime', vote_average: t.vote_average };
        }
      } catch (err) {}
    }

    if (!title) return res.status(404).json({ error: "Narrative lost in the archives." });

    let trailerId = a?.trailer?.youtube_id || null;

    // 3) Multi-Layered YouTube Discovery
    const [trailerRes, scenesRes, fanRes, generalRes] = await Promise.allSettled([
      !trailerId ? getYoutubeTrailer(title) : Promise.resolve(trailerId),
      getYoutubeScenes(title),
      getYoutubeFanMade(title),
      getYoutubeGeneralSearch(title)
    ]);

    res.json({
      ...baseData,
      trailerId: trailerRes.status === 'fulfilled' ? trailerRes.value : trailerId,
      relatedScenes: scenesRes.status === 'fulfilled' ? scenesRes.value : [],
      fanVideos: fanRes.status === 'fulfilled' ? fanRes.value : [],
      generalVideos: generalRes.status === 'fulfilled' ? generalRes.value : []
    });
  } catch (err) {
    console.error("Critical Anime error:", err.message);
    res.status(500).json({ error: "The series legacy is momentarily veiled." });
  }
};
