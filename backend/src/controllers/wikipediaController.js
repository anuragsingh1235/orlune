const axios = require('axios');

exports.getWikiData = async (req, res) => {
  const { title, lang = 'en' } = req.query;
  if (!title) return res.status(400).json({ error: 'Title required' });

  try {
    // 1. Search for the most relevant wikipedia page
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
    if (!searchResults.length) return res.json({ error: 'No archive found' });

    const pageTitle = searchResults[0].title;

    // 2. Get Summary and Thumbnail via REST API
    const summaryRes = await axios.get(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`);
    
    // 3. Get Full Sections (Plot, Production, Reception, Cast)
    const contentRes = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
      params: {
        action: 'parse',
        page: pageTitle,
        prop: 'sections|text|images|externallinks',
        format: 'json'
      }
    });

    const sections = contentRes.data.parse.sections;
    const fullText = contentRes.data.parse.text['*'];

    res.json({
      title: pageTitle,
      summary: summaryRes.data.extract,
      thumbnail: summaryRes.data.thumbnail?.source,
      originalImage: summaryRes.data.originalimage?.source,
      description: summaryRes.data.description,
      sections: sections.map(s => ({ index: s.index, title: s.line })),
      content: fullText,
      wikiUrl: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
      externalLinks: contentRes.data.parse.externallinks.slice(0, 5)
    });

  } catch (err) {
    console.error('WIKI ERROR:', err.message);
    res.status(500).json({ error: 'Failed to access the archives' });
  }
};
