const axios = require('axios');
const headers = { 'User-Agent': 'OrluneHub/3.0' };
const TMDB_KEY = process.env.TMDB_API_KEY;

const getActorHeadshot = async (name) => {
    if (!TMDB_KEY) return null;
    try {
        const r = await axios.get(`https://api.themoviedb.org/3/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(name)}`);
        return r.data.results?.[0]?.profile_path ? `https://image.tmdb.org/t/p/w185${r.data.results[0].profile_path}` : null;
    } catch { return null; }
};

exports.searchWiki = async (req, res) => {
    const { query, lang = 'en' } = req.query;
    try {
        const r = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, { params: { action: 'query', generator: 'search', gsrsearch: `${query} film`, gsrlimit: 10, prop: 'pageimages|extracts', piprop: 'thumbnail', pithumbsize: 400, exintro: 1, explaintext: 1, format: 'json', origin: '*' }, headers });
        const pages = r.data.query?.pages;
        res.json({ results: pages ? Object.values(pages).map(p => ({ id: p.pageid, title: p.title, thumbnail: p.thumbnail?.source, overview: p.extract })) : [] });
    } catch { res.status(500).send(); }
};

exports.getWikiData = async (req, res) => {
    const { title, lang = 'en' } = req.query;
    try {
        const sRes = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, { params: { action: 'query', list: 'search', srsearch: `${title} film`, format: 'json', origin: '*' }, headers });
        const pTitle = sRes.data.query.search[0]?.title;
        if (!pTitle) return res.json({ error: 'Not found' });

        const [sum, content] = await Promise.all([
            axios.get(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pTitle)}`, { headers }),
            axios.get(`https://${lang}.wikipedia.org/w/api.php`, { params: { action: 'parse', page: pTitle, prop: 'sections|text|images', format: 'json' }, headers })
        ]);

        const fullHtml = content.data.parse.text['*'];
        const sections = content.data.parse.sections.filter(s => s.toclevel === 1);
        
        const parsed = await Promise.all(sections.map(async (s, i) => {
            const start = fullHtml.indexOf(`id="${s.anchor}"`);
            const end = i < sections.length - 1 ? fullHtml.indexOf(`id="${sections[i+1].anchor}"`) : undefined;
            const body = fullHtml.slice(start, end);
            const isCast = s.line.toLowerCase().includes('cast');
            const members = [];
            if (isCast) {
                const li = body.match(/<li>(.*?)<\/li>/g);
                if (li) for (const item of li.slice(0, 10)) {
                    const txt = item.replace(/<[^>]*>?/gm, '');
                    const pts = txt.split(/ as |: /);
                    if (pts.length >= 2) {
                        const photo = await getActorHeadshot(pts[0].trim());
                        members.push({ name: pts[0].trim(), character: pts[1].trim(), photo });
                    }
                }
            }
            return { title: s.line, content: body, members };
        }));

        res.json({ title: pTitle, summary: sum.data.extract, thumbnail: sum.data.thumbnail?.source, sections: parsed, wikiUrl: `https://${lang}.wikipedia.org/wiki/${pTitle}` });
    } catch { res.status(500).send(); }
};
