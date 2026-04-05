const axios = require('axios');

exports.getWikiData = async (req, res) => {
  const { title, lang = 'en' } = req.query;
  if (!title) return res.status(400).json({ error: 'Title required' });

  try {
    // 1. Precise Search
    const searchRes = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
      params: {
        action: 'query',
        list: 'search',
        srsearch: `${title} film series anime`,
        format: 'json',
        origin: '*'
      }
    });

    const searchResults = searchRes.data.query.search;
    if (!searchResults.length) return res.json({ error: 'Archive Entry Not Found' });

    const pageTitle = searchResults[0].title;

    // 2. Fetch Summary & High-Res Artifacts
    const summaryRes = await axios.get(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`);
    
    // 3. Fetch Advanced Sections & Metadata
    const contentRes = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
      params: {
        action: 'parse',
        page: pageTitle,
        prop: 'sections|text|images|templates',
        format: 'json',
        disabletoc: 1
      }
    });

    const sections = contentRes.data.parse.sections.filter(s => 
      !['References', 'External links', 'See also', 'Notes', 'Bibliography'].includes(s.line) && s.toclevel === 1
    );

    // 4. Extract Section Content (More Precise Parsing)
    const fullHtml = contentRes.data.parse.text['*'];
    const parsedSections = sections.map((s, i) => {
      const nextSection = sections[i + 1];
      const startTag = `id="${s.anchor}"`;
      const endTag = nextSection ? `id="${nextSection.anchor}"` : '<!--';
      
      const startIndex = fullHtml.indexOf(startTag);
      const endIndex = fullHtml.indexOf(endTag);
      
      let sectionContent = fullHtml.slice(startIndex, endIndex === -1 ? undefined : endIndex);
      // Clean up the sliced HTML
      sectionContent = sectionContent.substring(sectionContent.indexOf('</h2>') + 5);

      return {
        title: s.line,
        anchor: s.anchor,
        content: sectionContent.trim()
      };
    });

    res.json({
      title: pageTitle,
      summary: summaryRes.data.extract,
      thumbnail: summaryRes.data.thumbnail?.source,
      originalImage: summaryRes.data.originalimage?.source,
      sections: parsedSections,
      wikiUrl: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`
    });

  } catch (err) {
    console.error('WIKI PARSE ERROR:', err.message);
    res.status(500).json({ error: 'Archive failure. Seek later, seeker.' });
  }
};
