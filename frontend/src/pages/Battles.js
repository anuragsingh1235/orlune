import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './Battles.css';

const GENRES = ['All','Hollywood','Bollywood','KDrama','CDrama','Anime','Action','Romance','Thriller','Horror','Sci-Fi','Comedy','Drama'];

const GENRE_ICONS = {
  All:'🌍', Hollywood:'🎬', Bollywood:'🎭', KDrama:'🇰🇷', CDrama:'🇨🇳',
  Anime:'⛩️', Action:'💥', Romance:'💕', Thriller:'🔪', Horror:'👻',
  'Sci-Fi':'🚀', Comedy:'😂', Drama:'🎭'
};

export default function Battles() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('upcoming');

  // ── UPCOMING STATE
  const [upcoming, setUpcoming] = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [upGenre, setUpGenre] = useState('All');
  const [reminders, setReminders] = useState(new Set());
  const [reminderLoading, setReminderLoading] = useState(new Set());

  // ── TODAY STATE
  const [todayMovies, setTodayMovies] = useState([]);
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayGenre, setTodayGenre] = useState('All');
  const [ratings, setRatings] = useState({}); // tmdb_id -> {avg, count, userRating, submitCount}
  const [sliderVals, setSliderVals] = useState({}); // tmdb_id -> slider value
  const [ratingSubmitting, setRatingSubmitting] = useState(new Set());

  const filteredToday = todayMovies.filter(m => {
    if (todayGenre === 'All') return true;
    if (todayGenre === 'Hollywood') return m.original_language === 'en';
    if (todayGenre === 'Bollywood') return ['hi','te','ta','ml','kn'].includes(m.original_language);
    if (todayGenre === 'KDrama') return m.original_language === 'ko';
    if (todayGenre === 'CDrama') return m.original_language === 'zh';
    if (todayGenre === 'Anime') return m.original_language === 'ja';
    return true; // add more mapping if needed
  });

  // ── ARENA STATE
  const [arenaChallenges, setArenaChallenges] = useState([]);
  const [arenaLoading, setArenaLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createGenre, setCreateGenre] = useState('All');
  const [opponentSearch, setOpponentSearch] = useState('');
  const [opponentResults, setOpponentResults] = useState([]);
  const [myVotes, setMyVotes] = useState({}); // challenge_id -> voted_for
  const [winner, setWinner] = useState(null); // battle that just ended (for animation)

  // ── FETCH UPCOMING
  const fetchUpcoming = useCallback(async (genre) => {
    setUpcomingLoading(true);
    try {
      const { data } = await api.get('/arena/upcoming', { params: { genre } });
      setUpcoming(data.results || []);
    } catch { setUpcoming([]); }
    setUpcomingLoading(false);
  }, []);

  useEffect(() => { fetchUpcoming(upGenre); }, [upGenre, fetchUpcoming]);

  useEffect(() => {
    if (user) {
      api.get('/arena/reminders').then(r => setReminders(new Set(r.data.reminders)));
    }
  }, [user]);

  // ── FETCH TODAY
  useEffect(() => {
    if (activeTab !== 'today') return;
    setTodayLoading(true);
    api.get('/arena/today').then(async ({ data }) => {
      setTodayMovies(data.results || []);
      // Fetch ratings for each
      const ratingsMap = {};
      await Promise.all((data.results || []).map(async m => {
        try {
          const headers = user ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {};
          const r = await api.get(`/arena/rating/${m.id}`, { headers });
          ratingsMap[m.id] = r.data;
        } catch {}
      }));
      setRatings(ratingsMap);
      setTodayLoading(false);
    }).catch(() => setTodayLoading(false));
  }, [activeTab, user]);

  // ── FETCH ARENA
  const fetchArena = useCallback(async () => {
    setArenaLoading(true);
    try {
      const { data } = await api.get('/arena/feed');
      setArenaChallenges(data);
      // Fetch my votes for active ones
      if (user) {
        const voteMap = {};
        await Promise.all(data.filter(c => c.status === 'active').map(async c => {
          try {
            const r = await api.get(`/arena/challenge/${c.id}/my-vote`);
            if (r.data.voted) voteMap[c.id] = r.data.votedFor;
          } catch {}
        }));
        setMyVotes(voteMap);
      }
    } catch { setArenaChallenges([]); }
    setArenaLoading(false);
  }, [user]);

  useEffect(() => {
    if (activeTab === 'arena') fetchArena();
  }, [activeTab, fetchArena]);

  // ── OPPONENT SEARCH
  useEffect(() => {
    if (!opponentSearch.trim()) { setOpponentResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/battles/users/search', { params: { q: opponentSearch } });
        setOpponentResults(data);
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [opponentSearch]);

  // ── TOGGLE REMINDER
  const toggleReminder = async (movie) => {
    if (!user) return alert('Please log in to set reminders');
    const id = movie.id;
    setReminderLoading(prev => new Set([...prev, id]));
    try {
      const { data } = await api.post('/arena/reminder', {
        tmdb_id: id, media_type: 'movie',
        title: movie.title, release_date: movie.release_date,
        poster_path: movie.poster_path
      });
      setReminders(prev => {
        const next = new Set(prev);
        if (data.active) next.add(id); else next.delete(id);
        return next;
      });
    } catch {}
    setReminderLoading(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  // ── SUBMIT RATING
  const submitRating = async (movie) => {
    if (!user) return alert('Please log in to rate movies');
    const id = movie.id;
    const val = sliderVals[id] || 5;
    const r = ratings[id];
    if (r?.userSubmitCount >= 2) return;

    if (r?.userSubmitCount === 1) {
      const confirm = window.confirm('⚠️ WARNING: This is your LAST CHANCE to rate this movie. Your previous rating will be replaced. Are you sure?');
      if (!confirm) return;
    }

    setRatingSubmitting(prev => new Set([...prev, id]));
    try {
      const res = await api.post('/arena/rating', {
        tmdb_id: id, media_type: 'movie', title: movie.title, rating: val
      });
      // Refresh rating
      const updated = await api.get(`/arena/rating/${id}`);
      setRatings(prev => ({ ...prev, [id]: updated.data }));
    } catch {}
    setRatingSubmitting(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  // ── CREATE CHALLENGE — multi-step state
  const [createStep, setCreateStep] = useState(1); // 1=genre, 2=movie, 3=opponent
  const [myMovie, setMyMovie] = useState(null); // { id, title, poster_path }
  const [movieSearchQ, setMovieSearchQ] = useState('');
  const [movieSearchResults, setMovieSearchResults] = useState([]);
  const [movieSearching, setMovieSearching] = useState(false);

  // Search movies for battle pick
  useEffect(() => {
    if (!movieSearchQ.trim()) { setMovieSearchResults([]); return; }
    const t = setTimeout(async () => {
      setMovieSearching(true);
      try {
        const { data } = await api.get('/movies/search', { params: { q: movieSearchQ, type: 'movie' } });
        setMovieSearchResults((data.results || []).slice(0, 8));
      } catch {}
      setMovieSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [movieSearchQ]);

  const resetCreateModal = () => {
    setShowCreateModal(false);
    setCreateStep(1);
    setCreateGenre('All');
    setMyMovie(null);
    setMovieSearchQ('');
    setMovieSearchResults([]);
    setOpponentSearch('');
    setOpponentResults([]);
  };

  const createChallenge = async (opponentId) => {
    if (!myMovie) return alert('Please pick your movie first!');
    try {
      await api.post('/arena/challenge', {
        genre: createGenre,
        opponentId,
        creatorMovieId: myMovie.id,
        creatorMovieTitle: myMovie.title || myMovie.name,
        creatorMoviePoster: myMovie.poster_path
      });
      resetCreateModal();
      if (activeTab === 'arena') fetchArena();
      alert('⚔️ Challenge launched! Waiting for an opponent...');
    } catch { alert('Failed to create challenge'); }
  };

  // ── DELETE/CANCEL CHALLENGE
  const cancelBattle = async (id) => {
    if (!window.confirm("Abort this mission? This battle record will be deleted.")) return;
    try {
      await api.delete(`/arena/challenge/${id}`);
      fetchArena();
    } catch { alert('Failed to cancel'); }
  };

  // ── RESPOND TO CHALLENGE
  const respondChallenge = async (id, action) => {
    try {
      await api.put(`/arena/challenge/${id}/respond`, { action });
      fetchArena();
    } catch {}
  };

  // ── VOTE
  const voteChallenge = async (challengeId, side) => {
    if (!user) return alert('Log in to vote');
    if (myVotes[challengeId]) return;
    try {
      const { data } = await api.post(`/arena/challenge/${challengeId}/vote`, { votedFor: side });
      setMyVotes(prev => ({ ...prev, [challengeId]: side === 'creator' ? arenaChallenges.find(c=>c.id===challengeId)?.creator_id : arenaChallenges.find(c=>c.id===challengeId)?.opponent_id }));
      setArenaChallenges(prev => prev.map(c => c.id === challengeId ? { ...c, creator_votes: data.creatorVotes, opponent_votes: data.opponentVotes } : c));
    } catch {}
  };

  // ── RENDER UPCOMING TAB
  const renderUpcoming = () => (
    <div className="arena-section">
      <div className="arena-section-header">
        <h2 className="arena-section-title">🚀 Upcoming Releases</h2>
        <p className="arena-section-sub">Set reminders before they drop</p>
      </div>
      <div className="genre-filters">
        {GENRES.map(g => (
          <button key={g} className={`genre-pill ${upGenre === g ? 'active' : ''}`} onClick={() => setUpGenre(g)}>
            {GENRE_ICONS[g]} {g}
          </button>
        ))}
      </div>
      {upcomingLoading ? (
        <div className="arena-skeleton-grid">
          {[...Array(6)].map((_,i) => <div key={i} className="skeleton-card"><div className="skeleton-poster"/><div className="skeleton-line"/><div className="skeleton-line short"/></div>)}
        </div>
      ) : upcoming.length === 0 ? (
        <div className="arena-empty">
          <div className="arena-empty-icon">🎬</div>
          <h3>No upcoming titles found</h3>
          <p>Try a different genre filter</p>
        </div>
      ) : (
        <div className="upcoming-grid">
          {upcoming.map(movie => {
            const isReminded = reminders.has(movie.id);
            const isLoading = reminderLoading.has(movie.id);
            const releaseDate = new Date(movie.release_date);
            const daysUntil = Math.ceil((releaseDate - new Date()) / (1000*60*60*24));
            return (
              <div key={movie.id} className="upcoming-card glass-card">
                <div className="upcoming-poster-wrap">
                  <img
                    src={movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Poster'}
                    alt={movie.title}
                    className="upcoming-poster"
                  />
                  <div className="upcoming-overlay">
                    <button
                      className={`reminder-btn ${isReminded ? 'active' : ''} ${isLoading ? 'loading' : ''}`}
                      onClick={() => toggleReminder(movie)}
                      title={isReminded ? 'Remove reminder' : 'Set reminder'}
                    >
                      {isLoading ? '⏳' : isReminded ? '🔔' : '🔕'}
                    </button>
                    <div className="countdown-badge">{daysUntil === 1 ? '1 day' : `${daysUntil} days`}</div>
                  </div>
                </div>
                <div className="upcoming-info">
                  <h4 className="upcoming-title">{movie.title}</h4>
                  <div className="upcoming-meta">
                    <span className="release-date">📅 {new Date(movie.release_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span>
                    {movie.vote_average > 0 && <span className="up-rating">⭐ {movie.vote_average.toFixed(1)}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── RENDER TODAY TAB
  const renderToday = () => (
    <div className="arena-section">
      <div className="arena-section-header">
        <h2 className="arena-section-title">🎉 Released Today</h2>
        <p className="arena-section-sub">Rate today's drops — only 2 chances per title!</p>
      </div>

      <div className="genre-filters">
        {['All','Hollywood','Bollywood','KDrama','CDrama','Anime'].map(g => (
          <button key={g} className={`genre-pill ${todayGenre === g ? 'active' : ''}`} onClick={() => setTodayGenre(g)}>
            {GENRE_ICONS[g]} {g}
          </button>
        ))}
      </div>

      {todayLoading ? (
        <div className="arena-skeleton-grid">
          {[...Array(4)].map((_,i) => <div key={i} className="skeleton-card"><div className="skeleton-poster"/><div className="skeleton-line"/><div className="skeleton-line short"/></div>)}
        </div>
      ) : filteredToday.length === 0 ? (
        <div className="arena-empty">
          <div className="arena-empty-icon">📅</div>
          <h3>Empty Slate</h3>
          <p>No major drops matching "{todayGenre}" today</p>
        </div>
      ) : (
        <div className="today-grid">
          {filteredToday.map(movie => {
            const r = ratings[movie.id] || {};
            const sliderVal = sliderVals[movie.id] ?? 5;
            const pct = ((r.avgRating || 0) / 10) * 100;
            const isLocked = r.userSubmitCount >= 2;
            const isSubmitting = ratingSubmitting.has(movie.id);
            const lineColor = pct >= 50 ? `rgba(16,185,129,${0.3 + (pct/100)*0.7})` : `rgba(239,68,68,${0.3 + ((1-pct/100))*0.7})`;
            return (
              <div key={movie.id} className="today-card glass-card">
                <div className="today-poster-wrap">
                  <img src={movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Poster'} alt={movie.title} className="today-poster" />
                  <div className="today-badge">NEW</div>
                </div>
                <div className="today-info">
                  <h4 className="today-title">{movie.title}</h4>
                  <div className="today-meta">
                    {movie.vote_average > 0 && <span className="tmdb-r">⭐ {movie.vote_average.toFixed(1)} TMDB</span>}
                    {r.count > 0 && <span className="user-r">👥 {r.count} ratings</span>}
                  </div>

                  {/* Rating Slider */}
                  {user && !isLocked && (
                    <div className="rating-zone">
                      <div className="slider-label">
                        <span>Your Rating</span>
                        <span className="slider-val">{sliderVal}/10</span>
                      </div>
                      <input
                        type="range" min="1" max="10" step="1"
                        value={sliderVal}
                        onChange={e => setSliderVals(prev => ({ ...prev, [movie.id]: parseInt(e.target.value) }))}
                        className="rating-slider"
                        style={{ '--val': `${(sliderVal-1)/9*100}%` }}
                      />
                      <div className="slider-ticks">{[1,2,3,4,5,6,7,8,9,10].map(n=><span key={n}>{n}</span>)}</div>
                      {r.userSubmitCount === 1 && (
                        <div className="last-chance-warn">⚠️ Last chance! Previous rating: {r.userRating}/10</div>
                      )}
                      <button className={`submit-rating-btn ${isSubmitting ? 'loading' : ''}`} onClick={() => submitRating(movie)} disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : r.userSubmitCount === 1 ? '🔥 Final Submit' : '✅ Submit Rating'}
                      </button>
                    </div>
                  )}
                  {isLocked && (
                    <div className="rating-locked">🔒 You've rated this: <strong>{r.userRating}/10</strong> — Rating locked</div>
                  )}
                  {!user && (
                    <div className="rating-login">🔐 <Link to="/login">Log in</Link> to rate</div>
                  )}

                  {/* Avg Rating Bar */}
                  <div className="avg-rating-section">
                    <div className="avg-rating-label">
                      <span>Avg Score</span>
                      <span style={{ color: pct >= 50 ? '#10b981' : '#ef4444' }}>{r.avgRating?.toFixed(1) || '—'}/10</span>
                    </div>
                    <div className="avg-bar-track">
                      <div className="avg-bar-fill" style={{ width: `${pct}%`, background: lineColor, boxShadow: `0 0 12px ${lineColor}` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── RENDER ARENA TAB
  const renderArena = () => (
    <div className="arena-section">
      <div className="arena-section-header">
        <h2 className="arena-section-title">⚔️ Movie Battle Arena</h2>
        <p className="arena-section-sub">Challenge someone — let the community decide who picked better</p>
        {user && (
          <button className="create-challenge-btn" onClick={() => setShowCreateModal(true)}>
            ⚡ Create Challenge
          </button>
        )}
      </div>

      {arenaLoading ? (
        <div className="arena-skeleton-grid">
          {[...Array(3)].map((_,i) => <div key={i} className="skeleton-card wide"><div className="skeleton-line"/><div className="skeleton-line long"/><div className="skeleton-line short"/></div>)}
        </div>
      ) : arenaChallenges.length === 0 ? (
        <div className="arena-empty">
          <div className="arena-empty-icon">⚔️</div>
          <h3>No battles yet</h3>
          <p>Be the first to create a challenge!</p>
        </div>
      ) : (
        <div className="arena-feed">
          {arenaChallenges.map(ch => {
            const isCreator = user?.id === ch.creator_id;
            const isOpponent = user?.id === ch.opponent_id;
            const isParticipant = isCreator || isOpponent;
            const total = (ch.creator_votes || 0) + (ch.opponent_votes || 0);
            const cPct = total ? Math.round((ch.creator_votes / total) * 100) : 50;
            const oPct = 100 - cPct;
            const myVote = myVotes[ch.id];
            const timeLeft = ch.ends_at ? Math.max(0, Math.ceil((new Date(ch.ends_at) - new Date()) / (1000*60*60))) : null;
            const isExpired = ch.ends_at && new Date(ch.ends_at) < new Date();

            return (
              <div key={ch.id} className={`arena-card glass-card ${ch.status}`}>
                {/* Header */}
                <div className="arena-card-header">
                  <div className="arena-genre-tag">{GENRE_ICONS[ch.genre] || '🎬'} {ch.genre}</div>
                  <div className="arena-status-info">
                    {isCreator && (ch.status === 'pending' || ch.status === 'active') && (
                      <button className="arena-cancel-btn" onClick={() => cancelBattle(ch.id)} title="Cancel Battle">
                        ✕ Cancel
                      </button>
                    )}
                    {ch.status === 'active' && timeLeft !== null && (
                      <span className="arena-timer">⏱ {timeLeft}h left</span>
                    )}
                    <span className={`arena-badge ${ch.status}`}>{ch.status === 'pending' ? '⏳ Pending' : ch.status === 'active' ? '⚔️ Live' : '🏆 Ended'}</span>
                  </div>
                </div>

                {/* VS Layout */}
                <div className="arena-vs-wrap">
                  {/* Creator Side */}
                  <div className="arena-side" style={{ '--side-color': ch.creator_color }}>
                    <div className="arena-avatar" style={{ background: ch.creator_color }}>
                      {ch.creator_avatar ? <img src={ch.creator_avatar} alt={ch.creator_name}/> : ch.creator_name?.[0]?.toUpperCase()}
                    </div>
                    <Link to={`/profile/${ch.creator_id}`} className="arena-username">{ch.creator_name}</Link>
                    {ch.creator_movie_poster && (
                      <img src={`https://image.tmdb.org/t/p/w200${ch.creator_movie_poster}`} alt={ch.creator_movie_title} className="arena-movie-poster"/>
                    )}
                    {ch.creator_movie_title && <p className="arena-movie-title">{ch.creator_movie_title}</p>}
                    {isCreator && ch.status === 'active' && !ch.creator_movie_id && (
                      <MoviePicker challengeId={ch.id} side="creator" onPicked={fetchArena}/>
                    )}
                    {ch.status === 'active' && ch.creator_movie_id && ch.opponent_movie_id && !isParticipant && (
                      <button
                        className={`vote-btn ${myVote ? 'voted' : ''}`}
                        style={{ borderColor: ch.creator_color, color: myVote ? '#fff' : ch.creator_color, background: myVote && myVote === ch.creator_id ? ch.creator_color : 'transparent' }}
                        onClick={() => !myVote && voteChallenge(ch.id, 'creator')}
                      >
                        {myVote ? (myVote === ch.creator_id ? '✅ Voted' : '—') : `Vote A`}
                      </button>
                    )}
                    <div className="arena-vote-count" style={{ color: ch.creator_color }}>{ch.creator_votes || 0} votes</div>
                  </div>

                  <div className="arena-vs-badge">VS</div>

                  {/* Opponent Side */}
                  <div className="arena-side" style={{ '--side-color': ch.opponent_color }}>
                    {ch.opponent_id ? (
                      <>
                        <div className="arena-avatar" style={{ background: ch.opponent_color }}>
                          {ch.opponent_avatar ? <img src={ch.opponent_avatar} alt={ch.opponent_name}/> : ch.opponent_name?.[0]?.toUpperCase()}
                        </div>
                        <Link to={`/profile/${ch.opponent_id}`} className="arena-username">{ch.opponent_name}</Link>
                        {ch.opponent_movie_poster && (
                          <img src={`https://image.tmdb.org/t/p/w200${ch.opponent_movie_poster}`} alt={ch.opponent_movie_title} className="arena-movie-poster"/>
                        )}
                        {ch.opponent_movie_title && <p className="arena-movie-title">{ch.opponent_movie_title}</p>}
                        {isOpponent && ch.status === 'active' && !ch.opponent_movie_id && (
                          <MoviePicker challengeId={ch.id} side="opponent" onPicked={fetchArena}/>
                        )}
                        {ch.status === 'active' && ch.creator_movie_id && ch.opponent_movie_id && !isParticipant && (
                          <button
                            className={`vote-btn ${myVote ? 'voted' : ''}`}
                            style={{ borderColor: ch.opponent_color, color: myVote ? '#fff' : ch.opponent_color, background: myVote && myVote === ch.opponent_id ? ch.opponent_color : 'transparent' }}
                            onClick={() => !myVote && voteChallenge(ch.id, 'opponent')}
                          >
                            {myVote ? (myVote === ch.opponent_id ? '✅ Voted' : '—') : `Vote B`}
                          </button>
                        )}
                        <div className="arena-vote-count" style={{ color: ch.opponent_color }}>{ch.opponent_votes || 0} votes</div>
                      </>
                    ) : (
                      <div className="waiting-opponent">
                        <div className="arena-avatar pulse">?</div>
                        <p>Waiting for challenger...</p>
                        {!isCreator && user && (
                          <button className="accept-open-btn" onClick={() => respondChallenge(ch.id, 'accept')}>⚡ Join Battle</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Accept/Ignore for direct challenges */}
                {ch.status === 'pending' && isOpponent && (
                  <div className="arena-respond-row">
                    <button className="arena-accept-btn" onClick={() => respondChallenge(ch.id, 'accept')}>✅ Accept</button>
                    <button className="arena-ignore-btn" onClick={() => respondChallenge(ch.id, 'ignore')}>❌ Ignore</button>
                  </div>
                )}

                {/* Vote Bar */}
                {ch.status === 'active' && total > 0 && (
                  <div className="arena-vote-bar-wrap">
                    <div className="arena-vote-bar">
                      <div className="arena-bar-a" style={{ width: `${cPct}%`, background: ch.creator_color, boxShadow: `0 0 12px ${ch.creator_color}88` }}/>
                      <div className="arena-bar-b" style={{ width: `${oPct}%`, background: ch.opponent_color, boxShadow: `0 0 12px ${ch.opponent_color}88` }}/>
                    </div>
                    <div className="arena-bar-labels">
                      <span style={{ color: ch.creator_color }}>{cPct}%</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{total} total votes</span>
                      <span style={{ color: ch.opponent_color }}>{oPct}%</span>
                    </div>
                  </div>
                )}

                {/* Winner State */}
                {ch.status === 'completed' && ch.winner_id && (
                  <div className="arena-result">
                    {ch.winner_id === user?.id ? (
                      <div className="winner-banner">🏆 You Won! +{total} points awarded</div>
                    ) : (
                      <div className="loser-banner">😞 Better luck next time</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MULTI-STEP CREATE MODAL */}
      {showCreateModal && (
        <div className="arena-modal-overlay" onClick={resetCreateModal}>
          <div className="arena-modal glass-card" onClick={e => e.stopPropagation()}>
            <button className="arena-modal-close" onClick={resetCreateModal}>×</button>
            <div className="modal-stepper">
              <div className={`step-dot ${createStep >= 1 ? 'active' : ''}`} />
              <div className={`step-dot ${createStep >= 2 ? 'active' : ''}`} />
              <div className={`step-dot ${createStep >= 3 ? 'active' : ''}`} />
            </div>

            {createStep === 1 && (
              <div className="step-content animate-fade">
                <h2 className="modal-title">1. Choose Category</h2>
                <div className="modal-genre-grid">
                  {GENRES.map(g => (
                    <button key={g} className={`modal-genre-btn ${createGenre === g ? 'active' : ''}`} onClick={() => setCreateGenre(g)}>
                      {GENRE_ICONS[g]} {g}
                    </button>
                  ))}
                </div>
                <button className="create-next-btn" onClick={() => setCreateStep(2)}>Choose Movie →</button>
              </div>
            )}

            {createStep === 2 && (
              <div className="step-content animate-fade">
                <h2 className="modal-title">2. Choose Your Rep</h2>
                <input
                  className="arena-search-input"
                  placeholder="Universal archive search..."
                  value={movieSearchQ}
                  onChange={e => setMovieSearchQ(e.target.value)}
                  autoFocus
                />
                <div className="picker-results custom-scrollbar">
                  {movieSearching && <p className="loading-text pulse">Scanning dimensions...</p>}
                  {!movieSearching && movieSearchResults.length === 0 && movieSearchQ && <p className="loading-text">No records found.</p>}
                  {movieSearchResults.map(m => (
                    <div 
                      key={m.id} 
                      className={`picker-item ${myMovie?.id === m.id ? 'selected' : ''}`} 
                      onClick={() => setMyMovie(m)}
                    >
                      <div className="picker-thumb-wrap">
                        {m.poster_path ? (
                           <img src={m.poster_path.startsWith('http') ? m.poster_path : `https://image.tmdb.org/t/p/w92${m.poster_path}`} alt="p"/>
                        ) : (
                          <div className="picker-thumb-none">🎞️</div>
                        )}
                        {myMovie?.id === m.id && <div className="picker-check">✓</div>}
                      </div>
                      <div className="picker-item-info">
                        <span className="picker-item-title">{m.title || m.name}</span>
                        <span className="picker-item-year">{(m.release_date || m.first_air_date || '').slice(0,4)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="modal-nav-btns">
                  <button className="create-back-btn" onClick={() => setCreateStep(1)}>Back</button>
                  <button className="create-next-btn" onClick={() => setCreateStep(3)} disabled={!myMovie}>
                    {myMovie ? `Confirm: ${myMovie.title || myMovie.name}` : 'Select a Movie'} →
                  </button>
                </div>
              </div>
            )}

            {createStep === 3 && (
              <div className="step-content animate-fade">
                <h2 className="modal-title">3. Finalize Duel</h2>
                <p className="modal-sub">Confirming battle for {createGenre} | Choice: <strong>{myMovie?.title || myMovie?.name}</strong></p>
                <div className="opponent-section">
                  <input
                    className="arena-search-input"
                    placeholder="Duel a specific user (type name) or leave empty for Open Challenge"
                    value={opponentSearch}
                    onChange={e => setOpponentSearch(e.target.value)}
                  />
                  <div className="opponent-results">
                    {opponentResults.map(u => (
                      <div key={u.id} className="opponent-result">
                        <div className="opp-avatar">{u.username?.[0]?.toUpperCase()}</div>
                        <span className="opp-name">{u.username}</span>
                        <button className="opp-challenge-btn" onClick={() => createChallenge(u.id)}>DUEL</button>
                      </div>
                    ))}
                  </div>
                  {!opponentSearch && (
                    <button className="create-open-btn" onClick={() => createChallenge(null)}>
                      🔥 LAUNCH OPEN CHALLENGE
                    </button>
                  )}
                </div>
                <button className="create-back-btn" onClick={() => setCreateStep(2)} style={{marginTop: 15}}>Back to Movie</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="battles-premium-page">
      {/* Hero */}
      <div className="battles-hero">
        <div className="battles-hero-glow"/>
        <h1 className="battles-hero-title">⚔️ Battle <span>Arena</span></h1>
        <p className="battles-hero-sub">Upcoming drops · Today's releases · Live movie battles</p>
      </div>

      {/* Tabs */}
      <div className="battles-tabs">
        {[
          { id: 'upcoming', label: '🚀 Upcoming', desc: 'Coming soon' },
          { id: 'today', label: '🎉 Today', desc: 'Fresh drops' },
          { id: 'arena', label: '⚔️ Arena', desc: 'Battle' },
        ].map(t => (
          <button key={t.id} className={`battles-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            <span className="tab-label">{t.label}</span>
            <span className="tab-desc">{t.desc}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="battles-content">
        {activeTab === 'upcoming' && renderUpcoming()}
        {activeTab === 'today' && renderToday()}
        {activeTab === 'arena' && renderArena()}
      </div>
    </div>
  );
}

// ── Movie Picker Sub-component
function MoviePicker({ challengeId, side, onPicked }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/movies/search', { params: { q: query, type: 'movie' } });
        setResults((data.results || []).slice(0, 6));
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const confirm = async () => {
    if (!selected) return;
    setConfirming(true);
    try {
      await api.put(`/arena/challenge/${challengeId}/movie`, {
        movie_id: selected.id, movie_title: selected.title || selected.name,
        movie_poster: selected.poster_path
      });
      onPicked();
    } catch {}
    setConfirming(false);
  };

  if (!open) return (
    <button className="pick-movie-btn" onClick={() => setOpen(true)}>🎬 Pick Your Movie</button>
  );

  return (
    <div className="movie-picker glass-card" onClick={e => e.stopPropagation()}>
      <h4>Pick Your Movie</h4>
      <input className="picker-input" placeholder="Search movie..." value={query} onChange={e => { setQuery(e.target.value); setSelected(null); }} autoFocus/>
      <div className="picker-results">
        {results.map(m => (
          <div key={m.id} className={`picker-item ${selected?.id === m.id ? 'selected' : ''}`} onClick={() => setSelected(m)}>
            {m.poster_path && <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} alt={m.title}/>}
            <span>{m.title || m.name}</span>
          </div>
        ))}
      </div>
      {selected && (
        <button className="picker-confirm-btn" onClick={confirm} disabled={confirming}>
          {confirming ? 'Locking...' : `🔒 Lock: ${selected.title}`}
        </button>
      )}
    </div>
  );
}
