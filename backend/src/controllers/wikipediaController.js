const axios = require('axios');

exports.getWikiData = async (req, res) => {
  let { title, lang = 'en' } = req.query;
  if (!title) return res.status(400).json({ error: 'Title required' });

  // 🧪 CLEAN TITLE (Remove colons/subtitles for better matching)
  const cleanTitle = title.split(':')[0].trim();

  try {
    // 📡 1. Aggressive Search
    const searchRes = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
      params: {
        action: 'query',
        list: 'search',
        srsearch: `${title} film series anime` || `${cleanTitle} film`,
        format: 'json',
        origin: '*'
      },
      timeout: 5000
    });

    let searchResults = searchRes.data.query.search;
    
    // Backup search if exact title fails
    if (!searchResults.length) {
        const backupRes = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
            params: { action: 'query', list: 'search', srsearch: cleanTitle, format: 'json', origin: '*' }
        });
        searchResults = backupRes.data.query.search;
    }

    if (!searchResults.length) return res.json({ error: 'Archive Entry Not Found in this sector.' });

    const pageTitle = searchResults[0].title;

    // 📡 2. MULTI-THREADED FETCH (Summary & Content)
    const [summaryRes, contentRes] = await Promise.all([
      axios.get(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`, { timeout: 8000 }).catch(() => ({ data: {} })),
      axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
        params: { action: 'parse', page: pageTitle, prop: 'sections|text', format: 'json', disabletoc: 1 },
        timeout: 8000
      }).catch(() => null)
    ]);

    if (!contentRes) return res.json({ error: 'Archive data is currently encrypted.' });

    // 🎯 3. Advanced Article Splicing
    const sections = contentRes.data.parse.sections.filter(s => 
      !['References', 'External links', 'See also', 'Notes', 'Bibliography'].includes(s.line) && s.toclevel === 1
    );

    const fullHtml = contentRes.data.parse.text['*'];
    const parsedSections = sections.map((s, i) => {
      const nextSection = sections[i + 1];
      const startTag = `id="${s.anchor}"`;
      const endTag = nextSection ? `id="${nextSection.anchor}"` : '<!--';
      
      const startIndex = fullHtml.indexOf(startTag);
      const endIndex = fullHtml.indexOf(endTag);
      
      let sectionContent = fullHtml.slice(startIndex, endIndex === -1 ? undefined : endIndex);
      sectionContent = sectionContent.substring(sectionContent.indexOf('</h2>') + 5);

      return { title: s.line, content: sectionContent.trim() };
    });

    res.json({
      title: pageTitle,
      summary: summaryRes.data.extract || "Archives describe this artifact as a legendary cinematic work.",
      thumbnail: summaryRes.data.thumbnail?.source,
      originalImage: summaryRes.data.originalimage?.source,
      sections: parsedSections,
      wikiUrl: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`
    });

  } catch (err) {
    console.error('WIKI CRITICAL ERROR:', err.message);
    res.json({ error: 'The connection to the archives is momentarily veiled. Seek again later.' });
  }
};
