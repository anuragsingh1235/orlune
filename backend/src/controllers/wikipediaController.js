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
        // Search for the keyword broadly, not just films
        const r = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, { params: { 
            action: 'query', 
            generator: 'search', 
            gsrsearch: query, 
            gsrlimit: 12, 
            prop: 'pageimages', 
            piprop: 'thumbnail', 
            pithumbsize: 500, 
            format: 'json', 
            origin: '*' 
        }, headers });
        
        const pages = r.data.query?.pages;
        let results = pages ? Object.values(pages).map(p => ({ id: p.pageid, title: p.title, thumbnail: p.thumbnail?.source })) : [];
        
        // Filter out results without images to give the user better options
        results = results.filter(res => res.thumbnail);
        
        res.json({ results });
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
            const startMarker = `id="${s.anchor}"`;
            const endMarker = i < sections.length - 1 ? `id="${sections[i+1].anchor}"` : null;
            
            const rawStartIndex = fullHtml.indexOf(startMarker);
            if (rawStartIndex === -1) return { title: s.line, content: '', members: [], sectionImages: [] };

            // Find end of current header tag (e.g. </h2>)
            const headerClosingJump = fullHtml.indexOf('</h', rawStartIndex);
            const start = fullHtml.indexOf('>', headerClosingJump) + 1;

            let end;
            if (endMarker) {
                const nextIdIndex = fullHtml.indexOf(endMarker);
                // Backtrack to find the start of the next header tag (e.g. <h2...)
                const nextHeaderStartIndex = fullHtml.lastIndexOf('<h', nextIdIndex);
                end = nextHeaderStartIndex !== -1 ? nextHeaderStartIndex : nextIdIndex;
            }

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
                .replace(/\[edit\]/g, '')
                .trim();

            const isCast = /cast|starring|कलाकार|पात्र|reparto|casting|besetzung/i.test(s.line);
            const members = [];
            if (isCast) {
                const li = body.match(/<li>(.*?)<\/li>/g);
                if (li) for (const item of li.slice(0, 15)) {
                    const txt = item.replace(/<[^>]*>?/gm, '');
                    const pts = txt.split(/ as |: | - | – /);
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
            lang: lang,
            wikiUrl: `https://${lang}.wikipedia.org/wiki/${pTitle}` 
        });
    } catch { res.status(500).send(); }
};
