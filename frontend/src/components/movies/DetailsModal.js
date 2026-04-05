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

  useEffect(() => {
    // Lock scroll when modal is open
    document.body.style.overflow = 'hidden';

    const endpoint = item.media_type === 'anime'
      ? `/anime/details/${item.id}`
      : `/movies/details/${item.id}?type=${item.media_type || 'movie'}`;

    api.get(endpoint)
      .then((res) => {
        setDetails({ ...res.data, hideTrailer });
      })
      .catch((err) => {
        console.error('Details fetch failed:', err);
        setError('Could not load details.');
      })
      .finally(() => setLoading(false));

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [item]);

  useEffect(() => {
    if (activeTab === 'encyclopedia' && !wikiData && details) {
      fetchWiki();
    }
  }, [activeTab, wikiLang, details]);

  const fetchWiki = async () => {
    setWikiLoading(true);
    try {
      const title = details?.title || details?.name || item.title || item.name;
      const res = await api.get(`/wiki/wiki?title=${encodeURIComponent(title)}&lang=${wikiLang}`);
      setWikiData(res.data);
    } catch (err) {
      console.error("Wiki fetch failed");
    } finally {
      setWikiLoading(false);
    }
  };

  if (!item) return null;

  const currentVideoId = details?.activeVideoId || details?.trailerId || details?.relatedScenes?.[0]?.id || details?.fanVideos?.[0]?.id || details?.generalVideos?.[0]?.id;

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
              <button className={activeTab === 'preview' ? 'active' : ''} onClick={() => setActiveTab('preview')}>
                Cinematic Preview
              </button>
              <button className={activeTab === 'encyclopedia' ? 'active' : ''} onClick={() => setActiveTab('encyclopedia')}>
                Encyclopedia 📜
              </button>
              <button className={activeTab === 'ai' ? 'active' : ''} onClick={() => {
                setActiveTab('ai');
                // AIRA integration handled here or via specialized component
              }}>
                Ask AIRA 🔮
              </button>
            </div>

            <div className="modal-body-content">
              {activeTab === 'preview' && (
                <div className="preview-tab animate-fade">
                  {/* YouTube Player */}
                  <div className="player-wrapper">
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
                        <div className="no-video-overlay"><span>Artifact Record Locked</span></div>
                      </div>
                    )}
                  </div>

                  {/* Scene Selector */}
                  <div className="discovery-grid animate-up">
                    {[
                      ...(details.trailerId ? [{ id: details.trailerId, title: 'Official Trailer', type: 'Trailer' }] : []),
                      ...(details.relatedScenes || []).map(s => ({ ...s, type: 'Moment' })),
                      ...(details.fanVideos || []).map(s => ({ ...s, type: 'Fan-Edit' })),
                      ...(details.generalVideos || []).map(s => ({ ...s, type: 'Related' }))
                    ].map((v, i) => (
                      <div 
                        key={i} 
                        className={`discovery-card ${currentVideoId === v.id ? 'active' : ''}`}
                        onClick={() => setDetails({ ...details, activeVideoId: v.id })}
                      >
                        <img src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`} alt="thumb" />
                        <div className="card-info">
                          <span className="tag">{v.type}</span>
                          <p>{v.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="info-panel">
                    <h2 className="title-display">{details.title || details.name}</h2>
                    <div className="meta-info">
                       <span className="rating">⭐ {details.vote_average?.toFixed(1)}</span>
                       <span className="year">{ (details.release_date || details.first_air_date || '').slice(0, 4) }</span>
                    </div>
                    <p className="description-text">{details.overview}</p>
                  </div>
                </div>
              )}

              {activeTab === 'encyclopedia' && (
                <div className="encyclopedia-tab animate-fade">
                  <div className="ency-controls">
                    {['en', 'hi', 'ja'].map(l => (
                      <button key={l} className={wikiLang === l ? 'active' : ''} onClick={() => { setWikiData(null); setWikiLang(l); }}>
                        {l === 'en' ? 'English' : l === 'hi' ? 'हिंदी' : '日本語'}
                      </button>
                    ))}
                  </div>

                  {wikiLoading ? (
                    <div className="ency-loading"><div className="spinner" /></div>
                  ) : wikiData?.error ? (
                    <div className="ency-error">Archives for this title are currently sealed.</div>
                  ) : (
                    <div className="ency-article">
                      {wikiData?.thumbnail && <img src={wikiData.thumbnail} className="article-poster" alt="Wiki" />}
                      <h3 className="article-title">{wikiData.title}</h3>
                      <p className="article-summary">{wikiData.summary}</p>
                      
                      <div className="article-content" dangerouslySetInnerHTML={{ __html: wikiData.content }} />
                      
                      <div className="article-footer">
                        <h4>External References</h4>
                        <div className="links-row">
                          <a href={wikiData.wikiUrl} target="_blank" rel="noreferrer" className="btn-wiki">Wikipedia Entry 🏛️</a>
                          {wikiData.externalLinks?.map((link, i) => (
                            <a key={i} href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noreferrer" className="btn-wiki secondary">
                              Reference {i + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="ai-tab animate-fade">
                   <p className="ai-teaser">Ask AIRA for mystical cinematic insights about {details?.title || details?.name}...</p>
                   {/* GeminiOracle component should be integrated here or logic triggered */}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
