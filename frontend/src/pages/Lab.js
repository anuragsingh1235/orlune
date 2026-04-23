import { useState, useEffect } from 'react';
import api from '../utils/api';
import './Lab.css';

const TABS = [
  { id: 'sort',      icon: '📊', label: 'Data Race',     desc: 'Sort algorithm benchmark' },
  { id: 'optimizer', icon: '🍿', label: 'Binge Planner', desc: '0/1 Knapsack optimizer' },
  { id: 'pattern',   icon: '🔍', label: 'Script Search', desc: 'Pattern matching engine' },
  { id: 'backtrack', icon: '🧩', label: 'Logic Puzzles',  desc: 'Backtracking visualizer' },
];

const ALGO_COLORS = {
  merge:'#88C0D0', quick:'#5E81AC', heap:'#B48EAD',
  bubble:'#BF616A', counting:'#A3BE8C', radix:'#EBCB8B',
};
const ALGO_INFO = {
  merge:    { best:'O(n log n)', avg:'O(n log n)', worst:'O(n log n)', space:'O(n)',     stable:true,  note:'Divide & Conquer — always consistent. Best for linked lists & external sort.' },
  quick:    { best:'O(n log n)', avg:'O(n log n)', worst:'O(n²)',      space:'O(log n)', stable:false, note:'Partition-based. Fastest in practice due to cache efficiency. Bad pivot = O(n²).' },
  heap:     { best:'O(n log n)', avg:'O(n log n)', worst:'O(n log n)', space:'O(1)',     stable:false, note:'In-place using Max-Heap. Consistent but poor cache performance.' },
  bubble:   { best:'O(n)',       avg:'O(n²)',       worst:'O(n²)',      space:'O(1)',     stable:true,  note:'Simplest sort. O(n) best case with early-exit. Rarely used in production.' },
  counting: { best:'O(n+k)',     avg:'O(n+k)',      worst:'O(n+k)',     space:'O(k)',     stable:true,  note:'Non-comparison. Perfect for small integer ranges like movie ratings (0-10).' },
  radix:    { best:'O(nk)',      avg:'O(nk)',       worst:'O(nk)',      space:'O(n+k)',   stable:true,  note:'Digit-by-digit sort. k = digits. Extremely fast for fixed-length integers.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// 📊 SORT STUDIO
// ─────────────────────────────────────────────────────────────────────────────
function SortStudio() {
  const [algorithms, setAlgorithms] = useState(['merge','quick','heap']);
  const [dataType,   setDataType]   = useState('random');
  const [size,       setSize]       = useState(80);
  const [results,    setResults]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [animBars,   setAnimBars]   = useState([]);
  const [phase,      setPhase]      = useState('idle');

  const toggleAlgo = (a) => setAlgorithms(prev =>
    prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
  );

  const run = async () => {
    if (!algorithms.length) return;
    setLoading(true); setResults(null); setPhase('running');
    try {
      const { data } = await api.post('/lab/sort', { algorithms, size, dataType });
      setAnimBars(data.rawData);
      setTimeout(() => {
        const firstSorted = data.results[algorithms[0]]?.sorted;
        if (firstSorted) setAnimBars(firstSorted);
        setResults(data.results);
        setPhase('done');
      }, 700);
    } catch(e) { console.error(e); setPhase('idle'); }
    setLoading(false);
  };

  const max = Math.max(...(animBars.length ? animBars : [1]));
  const winner = results ? Object.entries(results).sort((a,b)=>a[1].timeMs-b[1].timeMs)[0] : null;
  const maxTime = results ? Math.max(...Object.values(results).map(r=>r.timeMs)) : 1;

  return (
    <div className="lab-section">
      <div className="lab-section-header">
        <div className="lab-section-badge">⚡ DAA — Sorting Algorithms</div>
        <h2 className="lab-section-title">The Algorithm Speed Race</h2>
        <p className="lab-section-sub">Benchmark 6 sorting algorithms simultaneously on real-world movie rating datasets. Compare time complexity, operations, and memory usage live.</p>
      </div>

      <div className="sort-controls glass-card">
        <div className="sort-ctrl-row">
          <div className="sort-ctrl-group">
            <label>Dataset Type</label>
            <div className="lab-pills">
              {[['random','🎲 Random'],['nearly','〰️ Nearly Sorted'],['reverse','🔃 Reversed'],['sorted','✅ Pre-Sorted']].map(([v,l]) => (
                <button key={v} className={`lab-pill ${dataType===v?'active':''}`} onClick={()=>setDataType(v)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="sort-ctrl-group">
            <label>Array Size: <strong style={{color:'#88C0D0'}}>{size}</strong> elements</label>
            <input type="range" min="20" max="200" value={size} onChange={e=>setSize(+e.target.value)} className="lab-slider"/>
          </div>
        </div>
        <div className="sort-ctrl-group">
          <label>Select Algorithms</label>
          <div className="lab-pills">
            {Object.keys(ALGO_INFO).map(v => (
              <button key={v}
                className={`lab-pill algo-pill ${algorithms.includes(v)?'active':''}`}
                style={algorithms.includes(v)?{background:ALGO_COLORS[v]+'18',borderColor:ALGO_COLORS[v],color:ALGO_COLORS[v]}:{}}
                onClick={()=>toggleAlgo(v)}>
                {v.charAt(0).toUpperCase()+v.slice(1)} Sort
              </button>
            ))}
          </div>
        </div>
        <button className="lab-run-btn" onClick={run} disabled={loading||!algorithms.length}>
          {loading?<span className="lab-spinner"/>:'▶'} {loading?'Racing...':'Start Race'}
        </button>
      </div>

      {animBars.length > 0 && (
        <div className="sort-viz glass-card">
          <div className="sort-bars-wrap">
            {animBars.map((v,i) => (
              <div key={i} className="sort-bar-col"
                style={{height:`${(v/max)*100}%`, background: phase==='done' ? `hsl(${190+i*0.5},55%,58%)` : `hsl(${220+v*12},50%,50%)`}}
                title={v}/>
            ))}
          </div>
          <p className="sort-viz-label">{phase==='done'?'✅ Sorted — ':'⏳ Raw data — '}{animBars.length} elements</p>
        </div>
      )}

      {results && (
        <>
          {winner && (
            <div className="glass-card" style={{padding:20,marginBottom:20}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <h3 style={{fontSize:'0.82rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'1.5px'}}>⚡ Speed Comparison</h3>
                <span style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>Lower = Faster</span>
              </div>
              {Object.entries(results).sort((a,b)=>a[1].timeMs-b[1].timeMs).map(([key,r]) => (
                <div key={key} className="speed-bar-wrap">
                  <span className="speed-bar-label" style={{color:ALGO_COLORS[key]}}>{r.name?.split(' ')[0]}</span>
                  <div className="speed-bar-track">
                    <div className="speed-bar-fill" style={{width:`${(r.timeMs/maxTime)*100}%`,background:`linear-gradient(90deg,${ALGO_COLORS[key]}88,${ALGO_COLORS[key]})`}}/>
                  </div>
                  <span className="speed-bar-val">{r.timeMs}ms</span>
                </div>
              ))}
              <div className="sort-winner" style={{marginTop:14}}>
                🏆 Winner: <strong style={{color:ALGO_COLORS[winner[0]],marginLeft:4}}>{winner[1].name}</strong>
                <span style={{marginLeft:8,color:'var(--text-muted)'}}>— {winner[1].timeMs}ms · {winner[1].description}</span>
              </div>
            </div>
          )}

          <div className="sort-results glass-card">
            <h3 className="sort-results-title">📋 Detailed Results</h3>
            <div className="sort-table-wrap">
              <table className="sort-table">
                <thead>
                  <tr><th>Algorithm</th><th>Time (ms)</th><th>Comparisons</th><th>Swaps</th><th>Stable</th><th>Best</th><th>Average</th><th>Worst</th><th>Space</th></tr>
                </thead>
                <tbody>
                  {Object.entries(results).map(([key,r]) => {
                    const info = ALGO_INFO[key]||{};
                    return (
                      <tr key={key}>
                        <td><span className="algo-badge" style={{background:ALGO_COLORS[key]+'18',borderColor:ALGO_COLORS[key]+'55',color:ALGO_COLORS[key]}}>{r.name}</span></td>
                        <td className="mono">{r.timeMs}</td>
                        <td className="mono">{r.comparisons?.toLocaleString()}</td>
                        <td className="mono">{r.swaps?.toLocaleString()}</td>
                        <td style={{color:r.stable?'#A3BE8C':'#BF616A'}}>{r.stable?'✓ Yes':'✗ No'}</td>
                        <td className="mono complexity">{info.best}</td>
                        <td className="mono complexity">{info.avg}</td>
                        <td className="mono complexity" style={{color:info.worst?.includes('²')?'#BF616A88':''}}>{info.worst}</td>
                        <td className="mono complexity">{info.space}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14,marginTop:16}}>
            {Object.entries(results).map(([key]) => {
              const info = ALGO_INFO[key]; if (!info) return null;
              return (
                <div key={key} className="algo-info-card">
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                    <div style={{width:10,height:10,borderRadius:3,background:ALGO_COLORS[key],flexShrink:0}}/>
                    <span style={{fontWeight:700,fontSize:'0.85rem',color:ALGO_COLORS[key]}}>{key.charAt(0).toUpperCase()+key.slice(1)} Sort</span>
                    {info.stable
                      ? <span style={{marginLeft:'auto',fontSize:'0.65rem',color:'#A3BE8C',border:'1px solid #A3BE8C55',padding:'2px 8px',borderRadius:20}}>STABLE</span>
                      : <span style={{marginLeft:'auto',fontSize:'0.65rem',color:'#BF616A',border:'1px solid #BF616A55',padding:'2px 8px',borderRadius:20}}>UNSTABLE</span>}
                  </div>
                  <p style={{fontSize:'0.78rem',color:'var(--text-muted)',lineHeight:1.6,marginBottom:8}}>{info.note}</p>
                  <div className="complexity-box"><span>Best: {info.best}</span><span>Space: {info.space}</span></div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🍿 BINGE OPTIMIZER
// ─────────────────────────────────────────────────────────────────────────────
function Optimizer() {
  const [budget,  setBudget]  = useState(240);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [view,    setView]    = useState('dp');

  const SAMPLE_ITEMS = [
    {title:'Inception',        weight:148, value:8.8},
    {title:'Interstellar',     weight:169, value:8.6},
    {title:'The Dark Knight',  weight:152, value:9.0},
    {title:'Parasite',         weight:132, value:8.6},
    {title:'Joker',            weight:122, value:8.4},
    {title:'Avengers Endgame', weight:181, value:8.4},
    {title:'3 Idiots',         weight:170, value:8.4},
    {title:'DDLJ',             weight:189, value:8.0},
    {title:'Fight Club',       weight:139, value:8.8},
    {title:'Pulp Fiction',     weight:154, value:8.9},
  ];

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/lab/knapsack', { items: SAMPLE_ITEMS, capacity: budget });
      setResult(data);
    } catch(e){}
    setLoading(false);
  };

  const dpScore  = result?.dp01?.maxValue?.toFixed(1);
  const grdScore = result?.greedy?.maxValue?.toFixed(1);
  const dpWins   = result && parseFloat(dpScore) > parseFloat(grdScore);

  return (
    <div className="lab-section">
      <div className="lab-section-header">
        <div className="lab-section-badge">⚡ DAA — Dynamic Programming</div>
        <h2 className="lab-section-title">Smart Binge Planner</h2>
        <p className="lab-section-sub"><strong>0/1 Knapsack Problem</strong> — Set your free time and find the mathematically optimal movie marathon using bottom-up DP with backtracking. Guaranteed highest total rating.</p>
      </div>

      <div className="optim-layout">
        <div className="optim-controls glass-card">
          <div className="form-group">
            <label>⏱ Time Budget</label>
            <div style={{fontSize:'1.4rem',fontWeight:900,color:'#88C0D0',marginBottom:6}}>{Math.floor(budget/60)}h {budget%60}m</div>
            <input type="range" min="60" max="600" step="10" value={budget} onChange={e=>setBudget(+e.target.value)} className="lab-slider"/>
          </div>
          <div>
            <label style={{fontSize:'0.72rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8,display:'block'}}>Movie Dataset</label>
            <div className="optim-items">
              {SAMPLE_ITEMS.map((it,i) => (
                <div key={i} className="optim-item">
                  <span style={{width:20,height:20,borderRadius:6,background:'rgba(136,192,208,0.1)',border:'1px solid rgba(136,192,208,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.6rem',fontWeight:800,color:'#88C0D0',flexShrink:0}}>{i+1}</span>
                  <span className="optim-item-title">{it.title}</span>
                  <span className="optim-item-meta">{it.weight}m</span>
                  <span className="optim-item-meta">⭐{it.value}</span>
                </div>
              ))}
            </div>
          </div>
          <button className="lab-run-btn" onClick={run} disabled={loading}>
            {loading?<span className="lab-spinner"/>:'▶'} {loading?'Computing DP...':'Optimize Marathon'}
          </button>
          <div className="algo-info-card" style={{marginTop:16}}>
            <div style={{fontWeight:700,fontSize:'0.78rem',color:'#88C0D0',marginBottom:8}}>Algorithm: 0/1 Knapsack (C++)</div>
            <div className="algo-info-row"><span className="algo-info-label">Strategy</span><span className="algo-info-val">Bottom-Up Dynamic Programming</span></div>
            <div className="algo-info-row"><span className="algo-info-label">Approach</span><span className="algo-info-val">Build DP table, then backtrack for selected items</span></div>
            <div className="complexity-box" style={{marginTop:8}}><span>Time: O(N×W)</span><span>Space: O(N×W)</span></div>
          </div>
        </div>

        <div className="optim-results">
          {!result ? (
            <div className="glass-card" style={{padding:48,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,textAlign:'center',minHeight:300}}>
              <div style={{fontSize:'3rem'}}>🎬</div>
              <h3 style={{fontWeight:700,color:'var(--text-secondary)'}}>Set Your Time Budget</h3>
              <p style={{color:'var(--text-muted)',fontSize:'0.88rem',maxWidth:320}}>The algorithm fills an N×W table bottom-up, then backtracks to find the exact movies that maximize your rating score.</p>
              <div className="complexity-box" style={{justifyContent:'center'}}><span>Recurrence: T[i][w] = max(T[i-1][w], val[i] + T[i-1][w-wt[i]])</span></div>
            </div>
          ) : (
            <>
              <div className="glass-card" style={{padding:20,display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:12,alignItems:'center'}}>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'0.7rem',fontWeight:700,color:'#88C0D0',textTransform:'uppercase',letterSpacing:'2px',marginBottom:6}}>0/1 Knapsack (DP)</div>
                  <div style={{fontSize:'2rem',fontWeight:900,color:dpWins?'#A3BE8C':'var(--text-primary)'}}>{dpScore} <span style={{fontSize:'0.9rem',fontWeight:400,color:'var(--text-muted)'}}>pts</span></div>
                  <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:2}}>{result.dp01?.totalWeight}m used</div>
                </div>
                <div style={{textAlign:'center',padding:'0 8px'}}>
                  <div style={{fontSize:'0.75rem',color:'var(--text-muted)',fontWeight:700}}>VS</div>
                  {dpWins && <div style={{marginTop:6,fontSize:'0.65rem',color:'#A3BE8C',fontWeight:700,border:'1px solid #A3BE8C55',borderRadius:20,padding:'2px 8px'}}>DP WINS ✓</div>}
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'0.7rem',fontWeight:700,color:'#A3BE8C88',textTransform:'uppercase',letterSpacing:'2px',marginBottom:6}}>Fractional (Greedy)</div>
                  <div style={{fontSize:'2rem',fontWeight:900,color:'var(--text-secondary)'}}>{grdScore} <span style={{fontSize:'0.9rem',fontWeight:400,color:'var(--text-muted)'}}>pts</span></div>
                  <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:2}}>allows fractions</div>
                </div>
              </div>

              <div className="lab-pills">
                {[['dp','✅ 0/1 DP Result'],['greedy','⚡ Greedy Result'],['table','📐 DP Table'],['code','</> C++ Code']].map(([v,l]) => (
                  <button key={v} className={`lab-pill ${view===v?'active':''}`} onClick={()=>setView(v)}>{l}</button>
                ))}
              </div>

              {view==='dp' && (
                <div className="optim-result-card glass-card">
                  <div className="optim-header">
                    <span className="graph-badge">Optimal Marathon — 0/1 Knapsack DP</span>
                    <span className="optim-value">{dpScore} Rating Points</span>
                    <span className="optim-weight">{result.dp01?.totalWeight} min / {budget} min used</span>
                  </div>
                  <div className="optim-selected">
                    {result.dp01?.selected?.map((it,i) => (
                      <div key={i} className="optim-selected-item">
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{color:'#A3BE8C',fontWeight:700}}>✓</span>
                          <strong style={{color:'var(--text-primary)'}}>{it.title}</strong>
                        </div>
                        <div style={{display:'flex',gap:10,alignItems:'center'}}>
                          <span className="optim-item-meta">{it.weight} min</span>
                          <span style={{color:'#EBCB8B',fontWeight:700}}>⭐ {it.value}</span>
                        </div>
                      </div>
                    ))}
                    {!result.dp01?.selected?.length && <p style={{color:'var(--text-muted)',textAlign:'center',padding:20}}>No movies fit within this time budget.</p>}
                  </div>
                  <div style={{marginTop:16}}>
                    <p style={{color:'var(--text-muted)',fontSize:'0.78rem',marginBottom:6}}>Recurrence Relation:</p>
                    <code className="recurrence">{result.dp01?.recurrence}</code>
                  </div>
                  <div className="complexity-box" style={{marginTop:12}}>
                    <span>{result.dp01?.complexity?.time}</span><span>{result.dp01?.complexity?.space}</span><span>Optimal: Guaranteed ✓</span>
                  </div>
                </div>
              )}

              {view==='greedy' && (
                <div className="optim-result-card glass-card">
                  <div className="optim-header">
                    <span className="graph-badge" style={{background:'#A3BE8C22',borderColor:'#A3BE8C55',color:'#A3BE8C'}}>Fractional Knapsack — Greedy</span>
                    <span className="optim-value" style={{color:'var(--text-secondary)'}}>{grdScore} pts</span>
                  </div>
                  <div className="optim-selected">
                    {result.greedy?.selected?.map((it,i) => (
                      <div key={i} className="optim-selected-item">
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{color:it.fraction<1?'#EBCB8B':'#A3BE8C',fontWeight:700}}>{it.fraction<1?'⚡':'✓'}</span>
                          <strong>{it.title}</strong>
                          {it.fraction<1 && <span style={{fontSize:'0.7rem',background:'rgba(235,203,139,0.15)',color:'#EBCB8B',padding:'2px 8px',borderRadius:20,border:'1px solid rgba(235,203,139,0.3)'}}>{(it.fraction*100).toFixed(0)}% fraction</span>}
                        </div>
                        <span className="optim-item-meta">ratio: {it.ratio?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:14,padding:12,borderRadius:8,background:'rgba(191,97,106,0.08)',border:'1px solid rgba(191,97,106,0.2)'}}>
                    <p style={{fontSize:'0.8rem',color:'#BF616A',fontWeight:600}}>⚠️ Why Greedy Fails for 0/1 Items</p>
                    <p style={{fontSize:'0.75rem',color:'var(--text-muted)',marginTop:4}}>Greedy allows fractional items (e.g. 73% of a movie — impossible in real life!). For whole items, greedy misses better combinations that DP guarantees.</p>
                  </div>
                  <div className="complexity-box" style={{marginTop:12}}><span>O(n log n)</span><span>O(n)</span><span>⚠️ NOT optimal for 0/1</span></div>
                </div>
              )}

              {view==='table' && (
                <div className="dp-table-card glass-card">
                  <p style={{color:'var(--text-secondary)',marginBottom:12,fontSize:'0.85rem'}}><strong>DP Table</strong> — rows = movies, cols = time capacity. Each cell = max rating achievable. Algorithm reads bottom-right → top-left to find selected items.</p>
                  <div style={{overflowX:'auto',maxHeight:340,overflowY:'auto',borderRadius:8,border:'1px solid rgba(255,255,255,0.06)'}}>
                    <table className="sort-table dp-table">
                      <thead><tr><th>Movie</th>{result.dp01?.dpTable?.[0]?.map((_,j)=><th key={j}>{j}</th>)}</tr></thead>
                      <tbody>
                        {result.dp01?.dpTable?.map((row,i) => (
                          <tr key={i}>
                            <td style={{color:'#88C0D0',fontWeight:600,whiteSpace:'nowrap',maxWidth:90,overflow:'hidden',textOverflow:'ellipsis',fontSize:'0.72rem'}}>{i===0?'— base —':result.items?.[i-1]?.title||`Item ${i}`}</td>
                            {row.map((v,j) => <td key={j} className="mono" style={{fontSize:'0.68rem',color:v>0?'var(--text-primary)':'var(--text-muted)',background:v>0?`rgba(136,192,208,${Math.min(v/100,0.15)})`:'transparent'}}>{v}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p style={{fontSize:'0.72rem',color:'var(--text-muted)',marginTop:8}}>Final answer at cell [n][W] = {result.dp01?.maxValue?.toFixed(1)} pts</p>
                </div>
              )}

              {view==='code' && (
                <div className="glass-card" style={{padding:20,background:'#0d0d14',border:'1px solid rgba(255,255,255,0.08)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                    <div>
                      <span style={{color:'#88C0D0',fontWeight:700,fontSize:'0.88rem'}}>C++ Implementation</span>
                      <p style={{fontSize:'0.72rem',color:'var(--text-muted)',marginTop:2}}>File: <code style={{color:'#A3BE8C'}}>backend/binge_optimizer.cpp</code></p>
                    </div>
                    <span style={{fontSize:'0.65rem',color:'#A3BE8C',border:'1px solid #A3BE8C55',padding:'3px 10px',borderRadius:20}}>PRODUCTION READY</span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div>
                      <p style={{fontSize:'0.7rem',color:'#88C0D0',fontWeight:700,marginBottom:6,textTransform:'uppercase',letterSpacing:'1px'}}>0/1 Knapsack (DP)</p>
                      <pre style={{margin:0,padding:14,background:'rgba(0,0,0,0.5)',borderRadius:8,fontSize:'0.72rem',color:'#c5c8c6',overflowX:'auto',border:'1px solid rgba(255,255,255,0.05)'}}>
{`int knapsack01(int W, int wt[],
               int val[], int n) {
  vector<vector<int>> dp(
    n+1, vector<int>(W+1, 0));
  for (int i = 1; i <= n; i++) {
    for (int w = 0; w <= W; w++) {
      dp[i][w] = dp[i-1][w];
      if (wt[i-1] <= w)
        dp[i][w] = max(dp[i][w],
          val[i-1]+dp[i-1][w-wt[i-1]]);
    }
  }
  // Backtrack to find items
  int w = W;
  for (int i = n; i > 0; i--) {
    if (dp[i][w] != dp[i-1][w]) {
      selected.push_back(i-1);
      w -= wt[i-1];
    }
  }
  return dp[n][W];
}`}
                      </pre>
                    </div>
                    <div>
                      <p style={{fontSize:'0.7rem',color:'#A3BE8C',fontWeight:700,marginBottom:6,textTransform:'uppercase',letterSpacing:'1px'}}>Fractional (Greedy)</p>
                      <pre style={{margin:0,padding:14,background:'rgba(0,0,0,0.5)',borderRadius:8,fontSize:'0.72rem',color:'#c5c8c6',overflowX:'auto',border:'1px solid rgba(255,255,255,0.05)'}}>
{`struct Item { int value, weight; };
bool cmp(Item a, Item b) {
  return (double)a.value/a.weight >
         (double)b.value/b.weight;
}
double fractionalKnapsack(
    int W, Item arr[], int n) {
  sort(arr, arr+n, cmp);
  double finalVal = 0.0;
  for (int i = 0; i < n; i++) {
    if (arr[i].weight <= W) {
      W -= arr[i].weight;
      finalVal += arr[i].value;
    } else {
      finalVal += arr[i].value *
        ((double)W/arr[i].weight);
      break;
    }
  }
  return finalVal;
}`}
                      </pre>
                    </div>
                  </div>
                  <div style={{marginTop:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div style={{padding:10,borderRadius:8,background:'rgba(136,192,208,0.05)',border:'1px solid rgba(136,192,208,0.15)',fontSize:'0.75rem'}}>
                      <strong style={{color:'#88C0D0'}}>0/1 Knapsack</strong>
                      <div style={{color:'var(--text-muted)',marginTop:4}}>Complexity: <code>O(N×W)</code> time, <code>O(N×W)</code> space. Guaranteed optimal. Each item: include OR exclude (no fractions).</div>
                    </div>
                    <div style={{padding:10,borderRadius:8,background:'rgba(163,190,140,0.05)',border:'1px solid rgba(163,190,140,0.15)',fontSize:'0.75rem'}}>
                      <strong style={{color:'#A3BE8C'}}>Fractional Knapsack</strong>
                      <div style={{color:'var(--text-muted)',marginTop:4}}>Complexity: <code>O(N log N)</code> — just sort by ratio. Allows fractions. NOT valid for movies (can't watch half a film).</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔍 PATTERN DETECTOR
// ─────────────────────────────────────────────────────────────────────────────
function PatternDetector() {
  const [text,       setText]       = useState('The Dark Knight rises in the darkest night. The knight stands tall and fights against the darkness, reclaiming the night for Gotham.');
  const [pattern,    setPattern]    = useState('knight');
  const [algorithms, setAlgorithms] = useState(['kmp','rabin','boyer','naive']);
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);

  const toggle = (a) => setAlgorithms(prev => prev.includes(a)?prev.filter(x=>x!==a):[...prev,a]);

  const run = async () => {
    if (!text||!pattern) return;
    setLoading(true);
    try { const {data} = await api.post('/lab/pattern',{text,pattern,algorithms}); setResult(data); }
    catch(e){}
    setLoading(false);
  };

  const ALGO_META = {
    kmp:   {color:'#88C0D0', full:'KMP',         time:'O(n+m)',     space:'O(m)',    detail:'Precomputes Failure Function to skip redundant comparisons. Never re-scans matched characters.'},
    rabin: {color:'#B48EAD', full:'Rabin-Karp',  time:'O(n+m) avg', space:'O(1)',   detail:'Rolling hash — updates in O(1) per window slide. Excellent for multi-pattern search.'},
    boyer: {color:'#A3BE8C', full:'Boyer-Moore', time:'O(n/m) best',space:'O(α)',   detail:'Scans RIGHT to LEFT. Bad-character heuristic allows skipping large text sections.'},
    naive: {color:'#BF616A', full:'Naive',        time:'O(n×m)',     space:'O(1)',   detail:'Brute force — checks every position. Shown only for comparison to demonstrate why KMP matters.'},
  };

  const firstMatches = result ? Object.values(result.results)[0]?.matches||[] : [];
  const maxComp = result ? Math.max(...Object.values(result.results).map(r=>r.comparisons||0)) : 1;

  const highlightText = (text, matches) => {
    if (!matches?.length) return text;
    const pLen = pattern.length;
    const parts = [];
    let last = 0;
    [...matches].sort((a,b)=>a-b).forEach(idx => {
      parts.push(text.slice(last, idx));
      parts.push(<mark key={idx} className="pattern-match">{text.slice(idx,idx+pLen)}</mark>);
      last = idx+pLen;
    });
    parts.push(text.slice(last));
    return parts;
  };

  return (
    <div className="lab-section">
      <div className="lab-section-header">
        <div className="lab-section-badge">⚡ DAA — String Matching Algorithms</div>
        <h2 className="lab-section-title">Script Pattern Search Engine</h2>
        <p className="lab-section-sub">Run <strong>KMP, Rabin-Karp, Boyer-Moore,</strong> and <strong>Naive Search</strong> simultaneously. See exactly how many comparisons each saves — with the KMP Failure Function table visualized.</p>
      </div>

      <div className="pattern-layout">
        <div className="pattern-controls glass-card">
          <div className="form-group">
            <label>Text to Search</label>
            <textarea className="lab-textarea" rows={5} value={text} onChange={e=>setText(e.target.value)}/>
          </div>
          <div className="form-group">
            <label>Search Pattern</label>
            <input className="lab-input" value={pattern} onChange={e=>setPattern(e.target.value)} placeholder="e.g. knight"/>
          </div>
          <div className="form-group">
            <label>Algorithms</label>
            <div className="lab-pills">
              {Object.entries(ALGO_META).map(([v,meta]) => (
                <button key={v} className={`lab-pill ${algorithms.includes(v)?'active':''}`}
                  style={algorithms.includes(v)?{background:meta.color+'18',borderColor:meta.color,color:meta.color}:{}}
                  onClick={()=>toggle(v)}>{meta.full}</button>
              ))}
            </div>
          </div>
          <button className="lab-run-btn" onClick={run} disabled={loading}>
            {loading?<span className="lab-spinner"/>:'🔍'} {loading?'Searching...':'Run Search'}
          </button>
          <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:8}}>
            {algorithms.map(a => {
              const meta = ALGO_META[a]; if (!meta) return null;
              return (
                <div key={a} className="algo-info-card" style={{padding:12}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                    <div style={{width:8,height:8,borderRadius:2,background:meta.color,flexShrink:0}}/>
                    <strong style={{fontSize:'0.78rem',color:meta.color}}>{meta.full}</strong>
                    <span className="mono" style={{marginLeft:'auto',fontSize:'0.66rem',color:'var(--text-muted)'}}>{meta.time}</span>
                  </div>
                  <p style={{fontSize:'0.72rem',color:'var(--text-muted)',lineHeight:1.5}}>{meta.detail}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pattern-results-col">
          {!result && (
            <div className="glass-card" style={{padding:48,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,textAlign:'center',minHeight:280}}>
              <div style={{fontSize:'2.5rem'}}>🔍</div>
              <p style={{color:'var(--text-muted)',fontSize:'0.9rem'}}>Run the search to see KMP, Rabin-Karp, Boyer-Moore and Naive results side-by-side</p>
            </div>
          )}
          {result && (
            <>
              <div className="pattern-text-display glass-card">
                <p className="pattern-text-content">{highlightText(result.text, firstMatches)}</p>
                <div style={{marginTop:10,display:'flex',gap:12,alignItems:'center'}}>
                  <span style={{fontSize:'0.78rem',color:'var(--text-muted)'}}><strong style={{color:'#88C0D0'}}>{firstMatches.length}</strong> match{firstMatches.length!==1?'es':''} for "{pattern}"</span>
                  <span style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>n={result.text?.length}, m={pattern.length}</span>
                </div>
              </div>

              <div className="glass-card" style={{padding:20}}>
                <h3 style={{fontSize:'0.82rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:14}}>Comparisons Made (Less = Smarter)</h3>
                {Object.entries(result.results).map(([key,r]) => {
                  const meta = ALGO_META[key];
                  return (
                    <div key={key} className="speed-bar-wrap">
                      <span className="speed-bar-label" style={{color:meta?.color}}>{meta?.full}</span>
                      <div className="speed-bar-track"><div className="speed-bar-fill" style={{width:`${(r.comparisons/maxComp)*100}%`,background:`linear-gradient(90deg,${meta?.color}55,${meta?.color})`}}/></div>
                      <span className="speed-bar-val">{r.comparisons}</span>
                    </div>
                  );
                })}
              </div>

              <div className="pattern-compare glass-card">
                <div style={{overflowX:'auto',borderRadius:8,border:'1px solid rgba(255,255,255,0.05)'}}>
                  <table className="sort-table">
                    <thead><tr><th>Algorithm</th><th>Matches</th><th>Comparisons</th><th>Time (ms)</th><th>Time Complexity</th><th>Space</th></tr></thead>
                    <tbody>
                      {Object.entries(result.results).map(([key,r]) => {
                        const meta = ALGO_META[key];
                        return (
                          <tr key={key}>
                            <td><span className="algo-badge" style={{background:meta?.color+'18',borderColor:meta?.color+'55',color:meta?.color}}>{r.algorithm}</span></td>
                            <td className="mono" style={{color:'#A3BE8C',fontWeight:700}}>{r.matches?.length}</td>
                            <td className="mono">{r.comparisons}</td>
                            <td className="mono">{r.timeMs}</td>
                            <td className="mono complexity">{r.complexity?.time}</td>
                            <td className="mono complexity">{r.complexity?.space}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {result.results?.kmp?.failureFunction && (
                <div className="kmp-failure glass-card">
                  <h3 style={{fontSize:'0.82rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:4}}>KMP Failure Function</h3>
                  <p style={{color:'var(--text-muted)',fontSize:'0.75rem',marginBottom:12,lineHeight:1.6}}>For pattern "<strong style={{color:'#88C0D0'}}>{pattern}</strong>" — tells the algorithm where to restart after a mismatch to avoid re-scanning already-matched characters.</p>
                  <div className="ff-row">
                    {pattern.split('').map((c,i) => (
                      <div key={i} className="ff-cell">
                        <div className="ff-char">{c}</div>
                        <div className="ff-val">{result.results.kmp.failureFunction[i]}</div>
                      </div>
                    ))}
                  </div>
                  <p style={{fontSize:'0.7rem',color:'var(--text-muted)',marginTop:10}}>Value 0 = restart from beginning. Value n = skip n characters on mismatch.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🧩 BACKTRACKING LAB
// ─────────────────────────────────────────────────────────────────────────────
function BacktrackLab() {
  const [mode,       setMode]       = useState('nqueens');
  const [n,          setN]          = useState(6);
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [franchise,  setFranchise]  = useState('mcu');
  const [franchises, setFranchises] = useState([]);
  const [subArr]                    = useState([2,3,6,9,12,15,18]);
  const [subTarget,  setSubTarget]  = useState(18);

  useEffect(() => {
    api.get('/lab/franchises').then(r=>setFranchises(r.data)).catch(()=>{});
  }, []);

  const run = async () => {
    setLoading(true); setResult(null);
    try {
      if (mode==='nqueens') { const {data} = await api.post('/lab/nqueens',{n}); setResult(data); }
      else if (mode==='topo') { const {data} = await api.post('/lab/topo',{franchise}); setResult(data); }
      else if (mode==='subsets') { const {data} = await api.post('/lab/sumsubsets',{arr:subArr,target:subTarget}); setResult(data); }
    } catch(e){}
    setLoading(false);
  };

  const MODE_INFO = {
    nqueens: {time:'O(N!)',   space:'O(N)',   desc:'Place N queens so no two attack each other. Recursive backtracking — tries each column per row, backs up on any conflict.'},
    topo:    {time:'O(V+E)', space:'O(V)',   desc:"Kahn's BFS-based topological sort on the franchise DAG. Finds valid watch order and detects circular dependencies."},
    subsets: {time:'O(2ⁿ)', space:'O(N)',   desc:'Find all subsets summing to target. Prunes branches early when running sum > target — far faster than brute force.'},
  };

  return (
    <div className="lab-section">
      <div className="lab-section-header">
        <div className="lab-section-badge">⚡ DAA — Backtracking Algorithms</div>
        <h2 className="lab-section-title">Strategic Logic Puzzles</h2>
        <p className="lab-section-sub">Visualize how computers solve complex problems through <strong>recursive decision trees</strong>. See every attempt, backtrack, and the final solution in real time.</p>
      </div>

      <div className="lab-pills" style={{marginBottom:24}}>
        {[['nqueens','♛ N-Queens'],['topo','📋 Topological Sort'],['subsets','∑ Sum of Subsets']].map(([v,l]) => (
          <button key={v} className={`lab-pill ${mode===v?'active':''}`} onClick={()=>{setMode(v);setResult(null);}}>{l}</button>
        ))}
      </div>

      <div className="backtrack-layout">
        <div className="glass-card" style={{padding:24}}>
          {mode==='nqueens' && (
            <div className="form-group">
              <label>Board Size</label>
              <div style={{fontSize:'1.8rem',fontWeight:900,color:'#EBCB8B',marginBottom:6,textAlign:'center'}}>{n} × {n}</div>
              <input type="range" min="4" max="9" value={n} onChange={e=>setN(+e.target.value)} className="lab-slider"/>
              <p style={{color:'var(--text-muted)',fontSize:'0.78rem',marginTop:8,lineHeight:1.6}}>Place {n} queens on a {n}×{n} board so no two share a row, column, or diagonal.</p>
            </div>
          )}
          {mode==='topo' && (
            <div className="form-group">
              <label>Franchise</label>
              <select value={franchise} onChange={e=>setFranchise(e.target.value)} className="lab-select">
                {franchises.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
              <p style={{color:'var(--text-muted)',fontSize:'0.78rem',marginTop:8,lineHeight:1.6}}>Computes the correct watch order for a movie franchise using Kahn's algorithm on a DAG.</p>
            </div>
          )}
          {mode==='subsets' && (
            <div>
              <div className="form-group">
                <label>Target Sum: <strong style={{color:'#88C0D0'}}>{subTarget}</strong></label>
                <input type="range" min="5" max="50" value={subTarget} onChange={e=>setSubTarget(+e.target.value)} className="lab-slider"/>
              </div>
              <p style={{color:'var(--text-muted)',fontSize:'0.78rem',lineHeight:1.6}}>Array: <code style={{color:'#A3BE8C'}}>[{subArr.join(', ')}]</code></p>
            </div>
          )}

          <button className="lab-run-btn" style={{marginTop:16}} onClick={run} disabled={loading}>
            {loading?<span className="lab-spinner"/>:'▶'} {loading?'Solving...':'Solve'}
          </button>

          <div className="algo-info-card" style={{marginTop:16}}>
            <div className="complexity-box" style={{marginBottom:10}}><span>Time: {MODE_INFO[mode].time}</span><span>Space: {MODE_INFO[mode].space}</span></div>
            <p style={{fontSize:'0.78rem',color:'var(--text-muted)',lineHeight:1.6}}>{MODE_INFO[mode].desc}</p>
          </div>
        </div>

        <div>
          {!result && !loading && (
            <div className="glass-card" style={{padding:48,textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:12,minHeight:300,justifyContent:'center'}}>
              <div style={{fontSize:'2.5rem'}}>{mode==='nqueens'?'♛':mode==='topo'?'📋':'∑'}</div>
              <p style={{color:'var(--text-muted)',fontSize:'0.9rem'}}>Configure above and click Solve to run the algorithm</p>
            </div>
          )}

          {result && (
            <div className="backtrack-results glass-card">
              {mode==='nqueens' && (
                <>
                  <div className="bt-stat-row">
                    <div className="bt-stat"><strong>{result.solutionCount}</strong><span>Solutions</span></div>
                    <div className="bt-stat"><strong style={{color:'#BF616A'}}>{result.backtracks}</strong><span>Backtracks</span></div>
                    <div className="bt-stat"><strong>{result.totalSteps}</strong><span>Steps</span></div>
                    <div className="bt-stat"><strong style={{color:'#A3BE8C'}}>{result.timeMs}ms</strong><span>Time</span></div>
                  </div>
                  <div className="complexity-box" style={{marginBottom:14}}><span>{result.complexity?.time}</span><span>{result.complexity?.space}</span></div>
                  <p style={{color:'var(--text-muted)',fontSize:'0.78rem',marginBottom:16,lineHeight:1.6}}>{result.description}</p>
                  {result.solutions?.[0] && (
                    <div>
                      <p style={{color:'var(--text-secondary)',fontWeight:600,fontSize:'0.8rem',marginBottom:10}}>Solution 1 of {result.solutionCount}:</p>
                      <div className="nqueens-board" style={{gridTemplateColumns:`repeat(${n},1fr)`}}>
                        {Array.from({length:n*n},(_,idx) => {
                          const r=Math.floor(idx/n), c=idx%n;
                          return <div key={idx} className={`nqueens-cell ${(r+c)%2===0?'light':'dark'} ${result.solutions[0][r]===c?'queen':''}`}>{result.solutions[0][r]===c?'♛':''}</div>;
                        })}
                      </div>
                    </div>
                  )}
                  <div style={{marginTop:20,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    {Array.from({length:Math.min(result.solutionCount,20)}).map((_,i) => (
                      <div key={i} style={{width:10,height:10,borderRadius:2,background:i===0?'#EBCB8B':'rgba(235,203,139,0.3)',border:'1px solid rgba(235,203,139,0.4)'}}/>
                    ))}
                    {result.solutionCount > 20 && <span style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>+{result.solutionCount-20} more</span>}
                  </div>
                </>
              )}

              {mode==='topo' && (
                <>
                  <div className={`topo-status ${result.hasCycle?'error':'success'}`}>
                    {result.hasCycle ? '⚠️ Cycle Detected! No valid topological order exists.' : `✅ Valid watch order found — ${result.order?.length} movies`}
                  </div>
                  {!result.hasCycle && (
                    <div className="topo-order" style={{marginBottom:16}}>
                      {result.order?.map((node,i) => (
                        <div key={i} className="topo-node">
                          <span className="topo-num">{i+1}</span>
                          <span className="topo-label">{node}</span>
                          {i < result.order.length-1 && <span className="topo-arrow">→</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="complexity-box">
                    <span>O(V+E)</span><span>O(V)</span>
                    <span style={{color:result.hasCycle?'#BF616A':'#A3BE8C'}}>{result.hasCycle?'Cycle Found':'Valid DAG'}</span>
                  </div>
                  <p style={{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:10,lineHeight:1.6}}>{result.description}</p>
                </>
              )}

              {mode==='subsets' && (
                <>
                  <div className="bt-stat-row">
                    <div className="bt-stat"><strong style={{color:'#A3BE8C'}}>{result.solutionCount}</strong><span>Subsets Found</span></div>
                    <div className="bt-stat"><strong style={{color:'#BF616A'}}>{result.backtracks}</strong><span>Branches Pruned</span></div>
                    <div className="bt-stat"><strong>{result.timeMs}ms</strong><span>Time</span></div>
                  </div>
                  <div className="subset-solutions">
                    {result.solutions?.map((s,i) => <div key={i} className="subset-row">[{s.join(' + ')}] = {subTarget}</div>)}
                    {!result.solutions?.length && <p style={{color:'#BF616A',padding:12}}>No subset sums to {subTarget}.</p>}
                  </div>
                  <div className="complexity-box" style={{marginTop:12}}><span>{result.complexity?.time}</span><span>{result.complexity?.space}</span><span>Pruning applied ✓</span></div>
                  <p style={{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:10,lineHeight:1.6}}>{result.description}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🚀 MAIN LAB PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function Lab() {
  const [activeTab, setActiveTab] = useState('sort');

  return (
    <div className="lab-page animate-fade">
      <div className="lab-hero">
        <p className="lab-eyebrow">ORLUNE · ALGORITHM ENGINE</p>
        <h1 className="lab-title">Intelligence <span>Core</span></h1>
        <p className="lab-subtitle">
          Real DAA algorithms powering this platform — visualized live.<br/>
          Sorting · Dynamic Programming · String Matching · Backtracking
        </p>
        <div className="lab-hero-stats">
          <div className="lab-hero-stat"><span className="lab-hero-stat-num">17</span><span className="lab-hero-stat-label">Algorithms</span></div>
          <div className="lab-hero-stat"><span className="lab-hero-stat-num">4</span><span className="lab-hero-stat-label">DAA Categories</span></div>
          <div className="lab-hero-stat"><span className="lab-hero-stat-num">Live</span><span className="lab-hero-stat-label">Real API</span></div>
          <div className="lab-hero-stat"><span className="lab-hero-stat-num">C++</span><span className="lab-hero-stat-label">Core Engine</span></div>
        </div>
      </div>

      <div className="lab-tabs-bar">
        {TABS.map(t => (
          <button key={t.id} className={`lab-tab ${activeTab===t.id?'active':''}`} onClick={()=>setActiveTab(t.id)}>
            <span className="lab-tab-icon">{t.icon}</span>
            <span className="lab-tab-label">{t.label}</span>
            <span className="lab-tab-desc">{t.desc}</span>
          </button>
        ))}
      </div>

      <div className="lab-body container">
        {activeTab==='sort'      && <SortStudio/>}
        {activeTab==='optimizer' && <Optimizer/>}
        {activeTab==='pattern'   && <PatternDetector/>}
        {activeTab==='backtrack' && <BacktrackLab/>}
      </div>
    </div>
  );
}
