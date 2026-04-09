import { useEffect, useState } from 'react';
import api from '../../utils/api';
import './DetailsModal.css';

/**
 * ─── DETAILS MODAL (Premium Encyclopedia View) ─────────────────────
 * A cinematic hub for trailers, wikipedia deep-dives, and AI insights.
 */
export default function DetailsModal({ item, onClose, hideTrailer }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('preview'); // 'preview', 'encyclopedia', 'ai'
  
  // Wikipedia State
  const [wikiData, setWikiData] = useState(null);
  const [wikiLang, setWikiLang] = useState('en');
  const [wikiLoading, setWikiLoading] = useState(false);
  const [activeWikiSection, setActiveWikiSection] = useState(-1);

  // Global Wiki Search
  const [wikiSearch, setWikiSearch] = useState('');
  const [wikiSearchResults, setWikiSearchResults] = useState([]);
  const [isSearchingWiki, setIsSearchingWiki] = useState(false);

  // AIRA State
  const [airaInput, setAiraInput] = useState('');
  const [airaChat, setAiraChat] = useState([]);
  const [airaLoading, setAiraLoading] = useState(false);

  // Streaming State
  const [providerFilter, setProviderFilter] = useState('all');

  useEffect(() => {
    // Lock scroll when modal is open
    document.body.style.overflow = 'hidden';

    const endpoint = item.media_type === 'anime'
      ? `/anime/details/${item.id}`
      : `/movies/details/${item.id}?type=${item.media_type || 'movie'}`;

    api.get(endpoint)
      .then((res) => {
        setDetails({ ...res.data, hideTrailer });
        document.title = `${res.data.title || res.data.name} - Watchlist Wars`;
      })
      .catch((err) => {
        console.error('Details fetch failed:', err);
        setError('Could not load details.');
      })
      .finally(() => setLoading(false));

    return () => {
      document.body.style.overflow = 'auto';
      document.title = "Watchlist Wars | Orlune";
    };
  }, [item]);

  useEffect(() => {
    if (activeTab === 'encyclopedia' && !isSearchingWiki && details) {
      // If language changed or wikiData is missing, fetch
      if (!wikiData || (wikiData && wikiData.lang !== wikiLang)) {
        fetchWiki();
      }
    }
  }, [activeTab, wikiLang, details]);

  const fetchWiki = async (specificTitle = null) => {
    setWikiLoading(true);
    setIsSearchingWiki(false);
    // 🛡️ WATCHDOG TIMER: Stop spinning after 12s no matter what
    const watchdog = setTimeout(() => {
        if (wikiLoading) {
            setWikiLoading(false);
            setWikiData({ error: "Archives veiled." });
        }
    }, 12000);

    try {
      const localizedTitle = wikiData?.localizedTitles?.[wikiLang];
      const titleStr = specificTitle || localizedTitle || details?.title || details?.name || item.title || item.name;
      const res = await api.get(`/wiki/wiki?title=${encodeURIComponent(titleStr)}&lang=${wikiLang}&_cb=${Date.now()}`);
      clearTimeout(watchdog);
      setWikiData(res.data);
      setActiveWikiSection(-1);
    } catch (err) {
      clearTimeout(watchdog);
      console.error("Wiki fetch failed");
    } finally {
      setWikiLoading(false);
    }
  };

  const searchGlobalWiki = async (e) => {
    e.preventDefault();
    if (!wikiSearch.trim()) return;
    setWikiLoading(true);
    setIsSearchingWiki(true);
    try {
      const res = await api.get(`/wiki/search?query=${encodeURIComponent(wikiSearch)}&lang=${wikiLang}`);
      setWikiSearchResults(res.data.results || []);
    } catch (err) {
      console.error("Wiki search failed");
    } finally {
      setWikiLoading(false);
    }
  };

  const askAIRA = async (e) => {
    e.preventDefault();
    if (!airaInput.trim()) return;
    const prompt = airaInput;
    setAiraChat(prev => [...prev, { role: 'user', content: prompt }]);
    setAiraInput('');
    setAiraLoading(true);

    try {
        const titleName = details?.title || details?.name || item.title || item.name;
        const res = await api.post('/ai/oracle', { 
            prompt: `(Response Style: Natural Hinglish/Hindustani, cool and engaging, avoid formal article style). About ${titleName}: ${prompt}`,
            history: airaChat
        });
        setAiraChat(prev => [...prev, { role: 'aira', content: res.data.reply }]);
    } catch (err) {
        setAiraChat(prev => [...prev, { role: 'aira', content: "Archives veiled. Thoda wait karo, network issue lag raha hai." }]);
    } finally {
        setAiraLoading(false);
    }
  };

  if (!item) return null;

  const currentVideoId = details?.activeVideoId || details?.trailerId || details?.relatedScenes?.[0]?.id || details?.fanVideos?.[0]?.id || details?.generalVideos?.[0]?.id;

  // Prepare Premium Watch Providers
  let globalProviders = [];
  let watchLink = '';
  if (details && details['watch/providers']?.results) {
    const seen = new Set();
    const regions = Object.values(details['watch/providers'].results);
    regions.forEach(r => {
      if (!watchLink && r.link) watchLink = r.link;
      
      const compile = (list, type, cost) => {
         (list || []).forEach(p => {
           const id = p.provider_id + cost;
           if (!seen.has(id)) {
              seen.add(id);
              globalProviders.push({ ...p, offerType: type, costCat: cost });
           }
         });
      };

      compile(r.free, 'Free', 'free');
      compile(r.ads, 'Ads', 'free');
      compile(r.flatrate, 'Subscription', 'paid');
      compile(r.rent, 'Rent', 'paid');
      compile(r.buy, 'Buy', 'paid');
    });
  }

  // Fallback: If TMDB has no data but title is released, provide Universal Search checks
  let isFallback = false;
  if (globalProviders.length === 0) {
    isFallback = true;
    globalProviders.push(
      { provider_id: 991, provider_name: 'Netflix', logo_path: '/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg', offerType: 'Search', costCat: 'all' },
      { provider_id: 992, provider_name: 'Amazon Prime', logo_path: '/ifrXBSXWZ51EY7X6wV2QyZlK78c.jpg', offerType: 'Search', costCat: 'all' },
      { provider_id: 993, provider_name: 'YouTube', logo_path: '/p3Z12gKq2qvJaUOMeKNU2mzKVI9.jpg', offerType: 'Search', costCat: 'all' }
    );
    if (item?.media_type === 'tv' || item?.media_type === 'movie') {
       globalProviders.push({ provider_id: 994, provider_name: 'Disney+', logo_path: '/7rwgEs15tFwyR9NPQ5vqvtIJo61.jpg', offerType: 'Search', costCat: 'all' });
    }
    if (item?.media_type === 'anime') {
       globalProviders.push({ provider_id: 995, provider_name: 'Crunchyroll', logo_path: '/mXeC4TrcgdU6ltE9bCBCEORwSQR.jpg', offerType: 'Search', costCat: 'all' });
    }
  }

  const filteredProviders = globalProviders.filter(p => providerFilter === 'all' || p.costCat === providerFilter || p.costCat === 'all');

  // Instant Deep-Link Generator
  const getDirectLink = (providerName, fallbackLink) => {
    const titleObj = details?.title || details?.name || item?.title || item?.name || '';
    const title = encodeURIComponent(titleObj);
    const name = providerName.toLowerCase();
    
    if (name.includes('netflix')) return `https://www.netflix.com/search?q=${title}`;
    if (name.includes('amazon') || name.includes('prime')) return `https://www.amazon.com/s?k=${title}&i=instant-video`;
    if (name.includes('disney')) return `https://www.disneyplus.com/search?q=${title}`;
    if (name.includes('hulu')) return `https://www.hulu.com/search?q=${title}`;
    if (name.includes('max') || name.includes('hbo')) return `https://play.max.com/search?q=${title}`;
    if (name.includes('crunchyroll')) return `https://www.crunchyroll.com/search?q=${title}`;
    if (name.includes('apple')) return `https://tv.apple.com/search?term=${title}`;
    if (name.includes('youtube')) return `https://www.youtube.com/results?search_query=${title}+movie`;
    if (name.includes('peacock')) return `https://www.peacocktv.com/watch/search?q=${title}`;
    if (name.includes('paramount')) return `https://www.paramountplus.com/search/?q=${title}`;

    return fallbackLink || `https://www.google.com/search?q=Watch+${title}+on+${encodeURIComponent(providerName)}`;
  };

  return (
    <div className="modal-overlay animate-fade" onClick={onClose}>
      <div className="modal-content glass-card animate-scale" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>

        {loading ? (
          <div className="modal-loader"><div className="spinner" /></div>
        ) : error ? (
          <div className="modal-error">{error}</div>
        ) : details ? (
          <div className="details-container custom-scrollbar">
            
            {/* 🎥 NAVIGATION TABS */}
            <div className="modal-nav">
              {['preview', 'encyclopedia', 'ai'].map(t => (
                <button 
                  key={t}
                  className={activeTab === t ? 'active' : ''} 
                  onClick={() => setActiveTab(t)}
                >
                  {t === 'preview' ? 'Discovery 🎥' : t === 'encyclopedia' ? 'Encyclopedia 📜' : 'Ask AIRA 🔮'}
                </button>
              ))}
            </div>

            <div className="modal-body-content">
              {activeTab === 'preview' && (
                <div className="preview-tab animate-fade">
                  {/* YouTube Player */}
                  <div className="player-wrapper glass-card">
                    {currentVideoId && !details.hideTrailer ? (
                      <iframe
                        className="main-iframe"
                        src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&rel=0`}
                        title="Discovery"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="no-video-placeholder" style={{ backgroundImage: `url(https://image.tmdb.org/t/p/w780${item.poster_path})` }}>
                        <div className="no-video-overlay"><span>Record Encrypted</span></div>
                      </div>
                    )}
                  </div>

                  {/* 📺 WATCH PLATFORMS (Premium UI) Directly Below Trailer */}
                  <div className="watch-platforms-container animate-up">
                    <div className="platforms-header">
                       <h3 className="platforms-title">
                         {isFallback ? 'Check Availability' : 'Streaming On'} 
                         <span>({isFallback ? 'Global Search' : 'Global Archives'})</span>
                       </h3>
                       {!isFallback && globalProviders.length > 0 && (
                         <div className="platforms-filter">
                           <button className={providerFilter === 'all' ? 'active' : ''} onClick={() => setProviderFilter('all')}>All</button>
                           <button className={providerFilter === 'free' ? 'active' : ''} onClick={() => setProviderFilter('free')}>Free</button>
                           <button className={providerFilter === 'paid' ? 'active' : ''} onClick={() => setProviderFilter('paid')}>Paid</button>
                         </div>
                       )}
                    </div>
                    
                    {globalProviders.length > 0 ? (
                      <div className="platforms-grid custom-scrollbar">
                         {filteredProviders.map((p, idx) => (
                            <a 
                              key={`${p.provider_id}-${p.costCat}`} 
                              href={getDirectLink(p.provider_name, watchLink)} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="platform-card glass-card" 
                              style={{ animationDelay: `${idx * 0.05}s` }}
                              title={`Watch on ${p.provider_name}`}
                            >
                              <div className="platform-logo-wrapper">
                                 <img src={`https://image.tmdb.org/t/p/original${p.logo_path}`} alt={p.provider_name} />
                              </div>
                              <div className="platform-info">
                                 <span className="platform-name">{p.provider_name}</span>
                                 <span className={`platform-type-badge ${p.offerType.toLowerCase()}`}>{p.offerType}</span>
                              </div>
                              <div className="watch-now-btn">{isFallback ? 'Search Link' : 'Watch Now'}</div>
                            </a>
                         ))}
                         {filteredProviders.length === 0 && (
                            <div className="no-platforms-filtered">No platforms found for this filter.</div>
                         )}
                      </div>
                    ) : null}
                  </div>

                  {/* Scene Selector */}
                  <div className="discovery-grid animate-up">
                    {[
                      ...(details.trailerId ? [{ id: details.trailerId, title: 'Official Trailer', type: 'Official' }] : []),
                      ...(details.relatedScenes || []).map(s => ({ ...s, type: 'Epic' })),
                      ...(details.fanVideos || []).map(s => ({ ...s, type: 'Edit' })),
                      ...(details.generalVideos || []).map(s => ({ ...s, type: 'Related' }))
                    ].map((v, i) => (
                      <div 
                        key={i} 
                        className={`discovery-card ${currentVideoId === v.id ? 'active' : ''}`}
                        onClick={() => setDetails({ ...details, activeVideoId: v.id })}
                      >
                        <img src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`} alt="thumb" />
                        <div className="card-info"><span className="tag">{v.type}</span></div>
                      </div>
                    ))}
                  </div>

                  <div className="info-panel glass-card">
                    <h2 className="title-display">{details.title || details.name}</h2>
                    <div className="meta-info meta-gap">
                       <span className="rating gold">⭐ {details.vote_average?.toFixed(1)}</span>
                       <span className="meta-divider">|</span>
                       <span className="year">{ (details.release_date || details.first_air_date || '').slice(0, 4) }</span>
                    </div>
                    <p className="description-text">{details.overview}</p>
                  </div>

                </div>
              )}

              {activeTab === 'encyclopedia' && (
                <div className="encyclopedia-tab animate-fade">
                  <div className="ency-header">
                    <form className="wiki-search-bar" onSubmit={searchGlobalWiki}>
                       <input type="text" placeholder="Search Global Archives (any film in history)..." value={wikiSearch} onChange={(e) => setWikiSearch(e.target.value)} />
                       <button type="submit">🔍</button>
                    </form>
                    <div className="ency-lang-bar">
                      {[
                        { id: 'en', label: 'English' },
                        { id: 'hi', label: 'हिंदी' },
                        { id: 'ja', label: '日本語' },
                        { id: 'fr', label: 'Français' },
                        { id: 'es', label: 'Español' },
                        { id: 'ko', label: '한국어' },
                        { id: 'de', label: 'Deutsch' }
                      ].map((lang, idx) => (
                        <button 
                          key={lang.id} 
                          className={`lang-pill ${wikiLang === lang.id ? 'active-emerald' : ''} animate-stagger`} 
                          style={{ animationDelay: `${idx * 0.05}s` }}
                          onClick={() => { 
                            setWikiLang(lang.id); 
                            setWikiData(null); 
                            fetchWiki(null, lang.id); 
                          }}
                        >
                          {lang.label}
                        </button>
                      ))}
                      {isSearchingWiki && <button className="btn-back-wiki animate-fade" onClick={() => fetchWiki()}>Back to {item.title || item.name}</button>}
                    </div>
                  </div>

                  {wikiLoading ? (
                    <div className="ency-loading"><div className="spinner" /></div>
                  ) : isSearchingWiki ? (
                    <div className="wiki-search-results animate-up custom-scrollbar">
                       {wikiSearchResults.map(res => (
                         <div key={res.id} className="wiki-res-card glass-card" onClick={() => fetchWiki(res.title)}>
                            {res.thumbnail && <img src={res.thumbnail} alt="thumb" />}
                            <div className="res-info">
                               <h4>{res.title}</h4>
                               <p>{res.overview?.slice(0, 120)}...</p>
                            </div>
                         </div>
                       ))}
                    </div>
                  ) : wikiData?.error ? (
                    <div className="ency-error">{wikiData.error}</div>
                  ) : wikiData ? (
                    <div className="ency-workspace">
                      {/* Left: Section Menu */}
                      <div className="ency-section-menu custom-scrollbar">
                        <button className={activeWikiSection === -1 ? 'active' : ''} onClick={() => setActiveWikiSection(-1)}>📜 Overview</button>
                        {wikiData?.sections?.map((s, i) => (
                          <button key={i} className={activeWikiSection === i ? 'active' : ''} onClick={() => setActiveWikiSection(i)}>
                            {s.title}
                          </button>
                        ))}
                      </div>

                      {/* Right: Section Content */}
                      <div className="ency-section-content custom-scrollbar">
                        {activeWikiSection === -1 || !wikiData?.sections?.[activeWikiSection] ? (
                          <div className="section-article animate-slide-right">
                              <h3 className="section-h">{wikiData?.title} {wikiLang === 'hi' ? 'संग्रह' : 'Archive'}</h3>
                             {wikiData?.originalImage && <img src={wikiData.originalImage} className="section-poster glass-card" alt="poster" />}
                             <p className="section-p">{wikiData?.summary}</p>
                             
                             {/* Gallery artifacts */}
                             <div className="wiki-gallery">
                                {wikiData?.images?.map((img, i) => ( <img key={i} src={img} alt="artifact" className="gallery-img glass-card" /> ))}
                             </div>
                          </div>
                        ) : (
                          <div className="section-article animate-slide-right" key={activeWikiSection}>
                             <h3 className="section-h">{wikiData?.sections?.[activeWikiSection]?.title}</h3>
                             
                             {/* 🎞️ SECTION-SPECIFIC VISUAL ARCHIVE STRIP */}
                             {wikiData?.sections?.[activeWikiSection]?.sectionImages?.length > 0 && (
                               <div className="section-images-strip custom-scrollbar">
                                  {wikiData.sections[activeWikiSection].sectionImages.map((src, idx) => (
                                    <img key={idx} src={src} alt="archive-still" className="strip-img glass-card" />
                                  ))}
                               </div>
                             )}

                             {wikiData?.sections?.[activeWikiSection]?.members?.length > 0 ? (
                               <div className="visual-cast-grid">
                                  {wikiData.sections[activeWikiSection].members.map((m, i) => (
                                    <div key={i} className="cast-profile-card glass-card animate-up" style={{ animationDelay: `${i * 0.1}s` }}>
                                       <div className="actor-photo-wrap">
                                          {m.photo ? <img src={m.photo} alt={m.name} /> : <div className="photo-placeholder">👤</div>}
                                       </div>
                                       <div className="cast-info">
                                          <h4 className="actor-name">{m.name}</h4>
                                          <span className="char-tag">as {m.character}</span>
                                       </div>
                                    </div>
                                  ))}
                               </div>
                             ) : (
                               <div 
                                 className={`wiki-parsed-html ${wikiLoading ? 'animate-pulse opacity-50' : 'animate-fade'}`} 
                                 dangerouslySetInnerHTML={{ __html: wikiData?.sections?.[activeWikiSection]?.content }} 
                               />
                             )}
                          </div>
                        )}
                        
                        {wikiData?.wikiUrl && (
                          <a href={wikiData.wikiUrl} target="_blank" rel="noreferrer" className="wiki-btn-link">
                            Explore Full Wikipedia Original Archive 🏛️
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="ency-loading"><div className="spinner" /></div>
                  )}
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="ai-modal-tab animate-fade">
                   <div className="ai-oracle-header">
                      <div className="oracle-aura animate-pulse" />
                      <div className="oracle-info">
                         <h3>Ask AIRA Vault</h3>
                         <p>Direct Oracle Link: {details?.title || details?.name}</p>
                      </div>
                   </div>

                   <div className="ai-modal-chat custom-scrollbar">
                      {airaChat.length === 0 ? (
                        <div className="ai-empty-state">
                           <div className="ai-icon">🔮</div>
                           <p>Seek your wisdom from AIRA. Ask me anything about this cinematic archive.</p>
                        </div>
                      ) : (
                        airaChat.map((msg, i) => (
                          <div key={i} className={`ai-msg ${msg.role}`}>
                             <div className="msg-content glass-card">{msg.content}</div>
                          </div>
                        ))
                      )}
                      {airaLoading && <div className="aira-writing">AIRA is decrypting...</div>}
                   </div>

                   <form className="ai-modal-input" onSubmit={askAIRA}>
                      <input 
                        type="text" 
                        placeholder="Seek cinematic wisdom..." 
                        value={airaInput}
                        onChange={(e) => setAiraInput(e.target.value)}
                        disabled={airaLoading}
                      />
                      <button type="submit" disabled={airaLoading}>➤</button>
                   </form>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
