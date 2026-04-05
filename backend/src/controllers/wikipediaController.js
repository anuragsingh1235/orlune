const axios = require('axios');

// 📡 WIKI-AGENT HEADERS (Essential for Wikipedia)
const headers = { 'User-Agent': 'OrluneCinematicHub/2.0 (anuragsingh1235@gmail.com) Axios/1.6.0' };

exports.searchWiki = async (req, res) => {
  const { query, lang = 'en' } = req.query;
  if (!query) return res.status(400).json({ error: 'Search query required' });

  try {
    const searchRes = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
      params: {
        action: 'query',
        generator: 'search',
        gsrsearch: `${query} film anime`,
        gsrlimit: 10,
        prop: 'pageimages|extracts',
        piprop: 'thumbnail',
        pithumbsize: 400,
        exintro: 1,
        explaintext: 1,
        exsentences: 2,
        format: 'json',
        origin: '*'
      },
      headers,
      timeout: 8000
    });

    const pages = searchRes.data.query?.pages;
    if (!pages) return res.json({ results: [] });

    const results = Object.values(pages).map(p => ({
      id: p.pageid,
      title: p.title,
      thumbnail: p.thumbnail?.source,
      overview: p.extract
    }));

    res.json({ results });
  } catch (err) {
    console.error('WIKI SEARCH ERROR:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
};

exports.getWikiData = async (req, res) => {
  let { title, lang = 'en' } = req.query;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const cleanTitle = title.split(':')[0].replace(/\(\d{4}\)/g, '').trim();

  try {
    // 📡 1. Aggressive Search
    const searchRes = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
      params: {
        action: 'query',
        list: 'search',
        srsearch: `${title} film series anime`,
        format: 'json',
        origin: '*'
      },
      headers,
      timeout: 8000
    });

    let searchResults = searchRes.data.query.search;
    if (!searchResults || !searchResults.length) {
        const backupRes = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
            params: { action: 'query', list: 'search', srsearch: cleanTitle, format: 'json', origin: '*' },
            headers,
            timeout: 8000
        });
        searchResults = backupRes.data.query.search;
    }

    if (!searchResults || !searchResults.length) return res.json({ error: 'Archive Entry Not Found.' });

    const pageTitle = searchResults[0].title;

    // 📡 2. Parallel Fetch (Summary, Content, Images)
    const [summaryRes, contentRes] = await Promise.all([
      axios.get(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`, { headers, timeout: 10000 }).catch(() => ({ data: {} })),
      axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
        params: { action: 'parse', page: pageTitle, prop: 'sections|text|images', format: 'json', disabletoc: 1 },
        headers,
        timeout: 10000
      }).catch(() => null)
    ]);

    if (!contentRes || !contentRes.data.parse) return res.json({ error: 'Archive data encrypted.' });

    const sections = contentRes.data.parse.sections.filter(s => 
      !['References', 'External links', 'See also', 'Notes', 'Bibliography'].includes(s.line) && s.toclevel === 1
    );

    const fullHtml = contentRes.data.parse.text['*'];
    
    // Improved Section Parsing (Splitting by H2)
    const parsedSections = sections.map((s, i) => {
      const nextSection = sections[i + 1];
      const startTag = `id="${s.anchor}"`;
      const endTag = nextSection ? `id="${nextSection.anchor}"` : '<!--';
      
      const startIndex = fullHtml.indexOf(startTag);
      const endIndex = fullHtml.indexOf(endTag);
      
      let sectionContent = fullHtml.slice(startIndex, endIndex === -1 ? undefined : endIndex);
      if (sectionContent.includes('</h2>')) {
        sectionContent = sectionContent.substring(sectionContent.indexOf('</h2>') + 5);
      }

      // 🎙️ Detect Dubbing/Cast Sections
      const isVoice = s.line.toLowerCase().includes('voice') || s.line.toLowerCase().includes('cast');

      return { 
        title: s.line, 
        content: sectionContent.trim(),
        type: isVoice ? 'cast' : 'info'
      };
    });

    res.json({
      title: pageTitle,
      summary: summaryRes.data.extract,
      thumbnail: summaryRes.data.thumbnail?.source,
      originalImage: summaryRes.data.originalimage?.source,
      sections: parsedSections,
      wikiUrl: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
      images: contentRes.data.parse.images.slice(0, 10).map(img => `https://${lang}.wikipedia.org/wiki/Special:FilePath/${img}`)
    });

  } catch (err) {
    console.error('WIKI ERROR:', err.message);
    res.json({ error: `Connection veiled. (${err.message})` });
  }
};
