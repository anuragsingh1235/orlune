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

        const [sum, content, links] = await Promise.all([
            axios.get(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pTitle)}`, { headers }),
            axios.get(`https://${lang}.wikipedia.org/w/api.php`, { params: { action: 'parse', page: pTitle, prop: 'sections|text|images', format: 'json' }, headers }),
            axios.get(`https://${lang}.wikipedia.org/w/api.php`, { params: { action: 'query', titles: pTitle, prop: 'langlinks', lllimit: 50, format: 'json' }, headers })
        ]);

        const fullHtml = content.data.parse.text['*'];
        const sections = content.data.parse.sections.filter(s => s.toclevel === 1);
        
        // 🗺️ LOCALIZE ARCHIVE: Map same film titles across languages
        const localizedTitles = {};
        const pLinks = Object.values(links.data.query.pages)[0]?.langlinks;
        if (pLinks) pLinks.forEach(l => { localizedTitles[l.lang] = l['*']; });

        const parsed = await Promise.all(sections.map(async (s, i) => {
            const rawStart = fullHtml.indexOf(`id="${s.anchor}"`);
            const end = i < sections.length - 1 ? fullHtml.indexOf(`id="${sections[i+1].anchor}"`) : undefined;
            const start = fullHtml.indexOf('>', rawStart) + 1; // 🛠️ SURGICAL CUT: Start after attributes
            let body = fullHtml.slice(start, end);
            
            const sectionImages = [];
            const imgMatch = body.match(/src="([^"]+)"/g);
            if (imgMatch) {
                imgMatch.forEach(src => {
                    const cleanSrc = src.replace('src="', '').replace('"', '');
                    if (cleanSrc.includes('wikipedia') || cleanSrc.includes('wikimedia')) {
                       sectionImages.push(cleanSrc.startsWith('//') ? `https:${cleanSrc}` : cleanSrc);
                    }
                });
            }

            body = body
                .replace(/id="[^"]*"/g, '')
                .replace(/class="[^"]*"/g, '')
                .replace(/<span[^>]*>\[edit\]<\/span>/g, '')
                .replace(/\[\d+\]/g, '')
                .replace(/\[note \d+\]/g, '')
                .replace(/>\w+\[edit\]/g, '>')
                .replace(/\[edit\]/g, '');

            const isCast = s.line.toLowerCase().includes('cast');
            const members = [];
            if (isCast) {
                const li = body.match(/<li>(.*?)<\/li>/g);
                if (li) for (const item of li.slice(0, 15)) {
                    const txt = item.replace(/<[^>]*>?/gm, '');
                    const pts = txt.split(/ as |: /);
                    if (pts.length >= 2) {
                        const photo = await getActorHeadshot(pts[0].trim());
                        members.push({ name: pts[0].trim(), character: pts[1].trim(), photo });
                    }
                }
            }
            return { title: s.line, content: body, members, sectionImages: sectionImages.slice(0, 5) };
        }));

        res.json({ 
            title: pTitle, 
            summary: sum.data.extract, 
            thumbnail: sum.data.thumbnail?.source, 
            sections: parsed, 
            localizedTitles, // ⚓ Anchor for global sync
            wikiUrl: `https://${lang}.wikipedia.org/wiki/${pTitle}` 
        });
    } catch { res.status(500).send(); }
};
