import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import './Lab.css';

const TABS = [
  { id: 'sort',      icon: '📊', label: 'Sort Studio',    desc: 'Merge · Quick · Heap · Radix' },
  { id: 'graph',     icon: '🗺️', label: 'Genre Graph',    desc: 'Dijkstra · BFS · DFS · MST' },
  { id: 'optimizer', icon: '♟️', label: 'Optimizer',      desc: '0/1 Knapsack · Greedy · DP' },
  { id: 'pattern',   icon: '🔍', label: 'Pattern Detect', desc: 'KMP · Rabin-Karp · Boyer-Moore' },
  { id: 'backtrack', icon: '🧩', label: 'Backtracking',   desc: 'N-Queens · Topo Sort · Subsets' },
];

const ALGO_COLORS = {
  merge:    '#5E81AC', quick:  '#88C0D0', heap:    '#B48EAD',
  bubble:   '#BF616A', counting:'#A3BE8C', radix:  '#EBCB8B',
};

// ─── SORT STUDIO ─────────────────────────────────────────────────────────────
function SortStudio() {
  const [algorithms, setAlgorithms]   = useState(['merge', 'quick', 'heap']);
  const [dataType,   setDataType]     = useState('random');
  const [size,       setSize]         = useState(60);
  const [results,    setResults]      = useState(null);
  const [rawData,    setRawData]      = useState([]);
  const [loading,    setLoading]      = useState(false);
  const [animBars,   setAnimBars]     = useState([]);

  const toggleAlgo = (a) => setAlgorithms(prev =>
    prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
  );

  const run = async () => {
    if (!algorithms.length) return;
    setLoading(true); setResults(null);
    try {
      const { data } = await api.post('/lab/sort', { algorithms, size, dataType });
      setRawData(data.rawData);
      setResults(data.results);
      // Animate — show unsorted then sorted
      setAnimBars(data.rawData);
      setTimeout(() => {
        const firstSorted = data.results[algorithms[0]]?.sorted;
        if (firstSorted) setAnimBars(firstSorted);
      }, 600);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const max = Math.max(...(animBars.length ? animBars : [1]));

  return (
    <div className="lab-section">
      <div className="lab-section-header">
        <h2 className="lab-section-title">📊 Sorting Algorithm Studio</h2>
        <p className="lab-section-sub">Runs selected algorithms simultaneously on the same dataset. Compare real metrics.</p>
      </div>

      {/* Controls */}
      <div className="sort-controls glass-card">
        <div className="sort-ctrl-row">
          <div className="sort-ctrl-group">
            <label>Dataset Type</label>
            <div className="lab-pills">
              {[['random','🎲 Random'],['nearly','〰️ Nearly Sorted'],['reverse','🔃 Reversed'],['sorted','✅ Already Sorted']].map(([v,l]) => (
                <button key={v} className={`lab-pill ${dataType===v?'active':''}`} onClick={()=>setDataType(v)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="sort-ctrl-group">
            <label>Array Size: <strong>{size}</strong></label>
            <input type="range" min="20" max="200" value={size} onChange={e=>setSize(+e.target.value)} className="lab-slider" />
          </div>
        </div>

        <div className="sort-ctrl-group">
          <label>Algorithms</label>
          <div className="lab-pills">
            {[['merge','Merge'],['quick','Quick'],['heap','Heap'],['bubble','Bubble'],['counting','Counting'],['radix','Radix']].map(([v,l]) => (
              <button key={v}
                className={`lab-pill algo-pill ${algorithms.includes(v)?'active':''}`}
                style={algorithms.includes(v)?{background:ALGO_COLORS[v]+'33', borderColor:ALGO_COLORS[v], color:ALGO_COLORS[v]}:{}}
                onClick={()=>toggleAlgo(v)}
              >{l} Sort</button>
            ))}
          </div>
        </div>

        <button className="lab-run-btn" onClick={run} disabled={loading || !algorithms.length}>
          {loading ? <span className="lab-spinner"/> : '▶'} {loading ? 'Running...' : 'Run Race'}
        </button>
      </div>

      {/* Bar visualization */}
      {animBars.length > 0 && (
        <div className="sort-viz glass-card">
          <div className="sort-bars-wrap">
            {animBars.map((v, i) => (
              <div key={i} className="sort-bar-col" style={{ height: `${(v / max) * 100}%`, background: `hsl(${220 + v * 15}, 60%, 55%)` }} title={v} />
            ))}
          </div>
          <p className="sort-viz-label">Array visualization ({animBars.length} elements)</p>
        </div>
      )}

      {/* Results table */}
      {results && (
        <div className="sort-results glass-card">
          <h3 className="sort-results-title">⚡ Results</h3>
          <div className="sort-table-wrap">
            <table className="sort-table">
              <thead>
                <tr>
                  <th>Algorithm</th><th>Time (ms)</th><th>Comparisons</th><th>Swaps</th>
                  <th>Stable</th><th>Best Case</th><th>Avg Case</th><th>Worst Case</th><th>Space</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(results).map(([key, r]) => (
                  <tr key={key} className="sort-row">
                    <td><span className="algo-badge" style={{background:ALGO_COLORS[key]+'22',borderColor:ALGO_COLORS[key],color:ALGO_COLORS[key]}}>{r.name}</span></td>
                    <td className="mono">{r.timeMs}</td>
                    <td className="mono">{r.comparisons?.toLocaleString()}</td>
                    <td className="mono">{r.swaps?.toLocaleString()}</td>
                    <td>{r.stable ? '✅ Yes' : '❌ No'}</td>
                    <td className="mono complexity">{r.bestCase}</td>
                    <td className="mono complexity">{r.avgCase}</td>
                    <td className="mono complexity">{r.worstCase}</td>
                    <td className="mono complexity">{r.spaceComplexity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Winner callout */}
          {(() => {
            const winner = Object.entries(results).sort((a,b)=>a[1].timeMs-b[1].timeMs)[0];
            return winner ? (
              <div className="sort-winner">
                🏆 Fastest: <strong style={{color:ALGO_COLORS[winner[0]]}}>{winner[1].name}</strong> — {winner[1].timeMs}ms
                &nbsp;|&nbsp; {winner[1].description}
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}

// ─── GENRE GRAPH ─────────────────────────────────────────────────────────────
function GenreGraph() {
  const canvasRef = useRef(null);
  const [graphData, setGraphData]   = useState(null);
  const [source,    setSource]      = useState('action');
  const [target,    setTarget]      = useState('romance');
  const [algorithm, setAlgorithm]   = useState('dijkstra');
  const [result,    setResult]      = useState(null);
  const [mst,       setMst]         = useState(null);
  const [artPts,    setArtPts]      = useState(null);
  const [fw,        setFw]          = useState(null);
  const [loading,   setLoading]     = useState(false);
  const [mode,      setMode]        = useState('path'); // 'path' | 'mst' | 'floyd' | 'art'

  useEffect(() => {
    api.get('/lab/graph/data').then(r => setGraphData(r.data)).catch(()=>{});
  }, []);

  const drawGraph = useCallback((path = [], mstEdges = [], artPoints = []) => {
    const canvas = canvasRef.current;
    if (!canvas || !graphData) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const nodePos = {};
    graphData.nodes.forEach(n => { nodePos[n.id] = { x: n.x * W, y: n.y * H }; });

    const pathSet = new Set();
    for (let i = 0; i < path.length - 1; i++) pathSet.add(`${path[i]}-${path[i+1]}`);
    const pathSetR = new Set([...pathSet].map(s => s.split('-').reverse().join('-')));
    const mstSet = new Set((mstEdges || []).map(e => `${e.from}-${e.to}`));
    const mstSetR = new Set([...mstSet].map(s => s.split('-').reverse().join('-')));
    const artSet = new Set(artPoints);

    // Draw edges
    graphData.edges.forEach(e => {
      const a = nodePos[e.from], b = nodePos[e.to];
      const isPath = pathSet.has(`${e.from}-${e.to}`) || pathSetR.has(`${e.from}-${e.to}`);
      const isMst  = mstSet.has(`${e.from}-${e.to}`)  || mstSetR.has(`${e.from}-${e.to}`);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = isPath ? '#5E81AC' : isMst ? '#A3BE8C' : 'rgba(255,255,255,0.08)';
      ctx.lineWidth   = isPath || isMst ? 2.5 : 1;
      ctx.stroke();
      // Weight label
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      ctx.fillStyle = isPath ? '#88C0D0' : 'rgba(255,255,255,0.3)';
      ctx.font = '11px Inter';
      ctx.fillText(e.weight, mx + 3, my - 3);
    });

    // Draw nodes
    graphData.nodes.forEach(n => {
      const { x, y } = nodePos[n.id];
      const isInPath = path.includes(n.id);
      const isArt    = artSet.has(n.id);
      const isSrc    = n.id === source;
      const isTgt    = n.id === target;
      ctx.beginPath();
      ctx.arc(x, y, isSrc || isTgt ? 22 : 16, 0, Math.PI * 2);
      ctx.fillStyle = isSrc ? '#5E81AC' : isTgt ? '#B48EAD' : isArt ? '#BF616A' : isInPath ? '#88C0D066' : 'rgba(255,255,255,0.05)';
      ctx.fill();
      ctx.strokeStyle = isInPath ? '#5E81AC' : isArt ? '#BF616A' : 'rgba(255,255,255,0.15)';
      ctx.lineWidth = isInPath || isArt ? 2 : 1;
      ctx.stroke();
      ctx.fillStyle = '#E5E9F0';
      ctx.font = `${isSrc||isTgt?'bold ':''} 11px Inter`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(n.label, x, y);
    });
  }, [graphData, source, target]);

  useEffect(() => {
    if (mode === 'path') drawGraph(result?.path || [], [], []);
    if (mode === 'mst')  drawGraph([], mst?.mstEdges || [], []);
    if (mode === 'art')  drawGraph([], [], artPts?.articulationPoints || []);
    if (mode === 'floyd') drawGraph([], [], []);
  }, [graphData, result, mst, artPts, mode, drawGraph]);

  const runPath = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/lab/graph/path', { source, target, algorithm });
      setResult(data); setMode('path');
    } catch(e){}
    setLoading(false);
  };

  const runMST = async () => {
    const { data } = await api.get('/lab/graph/mst');
    setMst(data); setMode('mst');
  };

  const runArt = async () => {
    const { data } = await api.get('/lab/graph/articulation');
    setArtPts(data); setMode('art');
  };

  const runFloyd = async () => {
    const { data } = await api.get('/lab/graph/floyd');
    setFw(data); setMode('floyd');
  };

  const nodeIds = graphData?.nodes?.map(n => n.id) || [];

  return (
    <div className="lab-section">
      <div className="lab-section-header">
        <h2 className="lab-section-title">🗺️ Genre Graph Navigator</h2>
        <p className="lab-section-sub">10 movie genres as nodes, similarity as weighted edges. Run graph algorithms live.</p>
      </div>

      <div className="graph-layout">
        {/* Left — controls */}
        <div className="graph-controls glass-card">
          <div className="lab-pills" style={{marginBottom:16}}>
            {[['path','🛤 Path'],['mst','🌳 MST'],['art','📍 Articulation'],['floyd','📐 Floyd-Warshall']].map(([v,l])=>(
              <button key={v} className={`lab-pill ${mode===v?'active':''}`} onClick={()=>setMode(v)}>{l}</button>
            ))}
          </div>

          {mode === 'path' && (
            <>
              <div className="form-group">
                <label>From Genre</label>
                <select value={source} onChange={e=>setSource(e.target.value)} className="lab-select">
                  {nodeIds.map(id=><option key={id} value={id}>{id.charAt(0).toUpperCase()+id.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>To Genre</label>
                <select value={target} onChange={e=>setTarget(e.target.value)} className="lab-select">
                  {nodeIds.map(id=><option key={id} value={id}>{id.charAt(0).toUpperCase()+id.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Algorithm</label>
                <div className="lab-pills">
                  {[['dijkstra','Dijkstra'],['bellmanFord','Bellman-Ford'],['bfs','BFS'],['dfs','DFS']].map(([v,l])=>(
                    <button key={v} className={`lab-pill ${algorithm===v?'active':''}`} onClick={()=>setAlgorithm(v)}>{l}</button>
                  ))}
                </div>
              </div>
              <button className="lab-run-btn" onClick={runPath} disabled={loading}>
                {loading ? <span className="lab-spinner"/> : '▶'} Find Path
              </button>
            </>
          )}
          {mode === 'mst'   && <button className="lab-run-btn" onClick={runMST}>▶ Run Kruskal's MST</button>}
          {mode === 'art'   && <button className="lab-run-btn" onClick={runArt}>▶ Find Articulation Points</button>}
          {mode === 'floyd' && <button className="lab-run-btn" onClick={runFloyd}>▶ Run Floyd-Warshall</button>}

          {/* Result info panel */}
          {mode === 'path' && result && (
            <div className="graph-result-panel">
              <div className="graph-badge">{result.algorithm}</div>
              <div className="graph-path-display">
                {result.path?.map((n,i) => (
                  <span key={n}>{n.charAt(0).toUpperCase()+n.slice(1)}{i < result.path.length-1 ? <span className="arrow"> → </span> : ''}</span>
                ))}
              </div>
              <div className="graph-stat">Distance: <strong>{result.distance ?? '∞'}</strong></div>
              <div className="graph-stat">Steps: <strong>{result.steps?.length}</strong></div>
              <div className="complexity-box">
                <span>{result.complexity?.time}</span>
                <span>{result.complexity?.space}</span>
              </div>
              <p className="graph-desc">{result.description}</p>
            </div>
          )}
          {mode === 'mst' && mst && (
            <div className="graph-result-panel">
              <div className="graph-badge" style={{background:'#A3BE8C22',borderColor:'#A3BE8C',color:'#A3BE8C'}}>Kruskal's MST</div>
              <div className="graph-stat">Total Weight: <strong>{mst.totalWeight}</strong></div>
              <div className="graph-stat">Edges in MST: <strong>{mst.mstEdges?.length}</strong></div>
              <div className="complexity-box"><span>O(E log E)</span><span>O(V)</span></div>
              <p className="graph-desc">{mst.description}</p>
            </div>
          )}
          {mode === 'art' && artPts && (
            <div className="graph-result-panel">
              <div className="graph-badge" style={{background:'#BF616A22',borderColor:'#BF616A',color:'#BF616A'}}>Articulation Points</div>
              <div className="graph-stat">Critical Nodes: <strong>{artPts.articulationPoints?.join(', ')}</strong></div>
              <div className="graph-stat">Bridges: <strong>{artPts.bridges?.length}</strong></div>
              <p className="graph-desc">{artPts.description}</p>
            </div>
          )}
        </div>

        {/* Right — canvas */}
        <div className="graph-canvas-wrap glass-card">
          <canvas ref={canvasRef} width={520} height={420} className="genre-canvas" />
          <div className="graph-legend">
            <span style={{color:'#5E81AC'}}>● Source</span>
            <span style={{color:'#B48EAD'}}>● Target</span>
            <span style={{color:'#A3BE8C'}}>— Path / MST</span>
            <span style={{color:'#BF616A'}}>● Art. Point</span>
          </div>
        </div>
      </div>

      {/* Floyd-Warshall matrix */}
      {mode === 'floyd' && fw && (
        <div className="fw-matrix glass-card">
          <h3 style={{marginBottom:12,color:'var(--text-secondary)'}}>All-Pairs Shortest Paths Matrix</h3>
          <div style={{overflowX:'auto'}}>
            <table className="sort-table">
              <thead>
                <tr><th>↘</th>{fw.nodeLabels?.map(l=><th key={l}>{l}</th>)}</tr>
              </thead>
              <tbody>
                {fw.matrix?.map((row, i) => (
                  <tr key={i}>
                    <td style={{color:'var(--accent)',fontWeight:700}}>{fw.nodeLabels?.[i]}</td>
                    {row.map((v,j)=>(
                      <td key={j} className="mono" style={{color: v===0?'var(--text-muted)': v===1e9?'var(--text-muted)':'var(--text-primary)'}}>{v>=1e9?'∞':v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="complexity-box" style={{marginTop:12}}><span>O(V³)</span><span>O(V²)</span></div>
        </div>
      )}
    </div>
  );
}

// ─── OPTIMIZER (Knapsack + LCS) ───────────────────────────────────────────────
function Optimizer() {
  const [budget, setBudget]   = useState(180);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView]       = useState('dp');

  const SAMPLE_ITEMS = [
    { title:'Inception',       weight:148, value:8.8, poster:null },
    { title:'Interstellar',    weight:169, value:8.6, poster:null },
    { title:'The Dark Knight', weight:152, value:9.0, poster:null },
    { title:'Parasite',        weight:132, value:8.6, poster:null },
    { title:'Joker',           weight:122, value:8.4, poster:null },
    { title:'Avengers',        weight:143, value:8.0, poster:null },
    { title:'3 Idiots',        weight:170, value:8.4, poster:null },
    { title:'DDLJ',            weight:189, value:8.0, poster:null },
  ];

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/lab/knapsack', { items: SAMPLE_ITEMS, capacity: budget });
      setResult(data);
    } catch(e){}
    setLoading(false);
  };

  return (
    <div className="lab-section">
      <div className="lab-section-header">
        <h2 className="lab-section-title">♟️ Watchlist Optimizer</h2>
        <p className="lab-section-sub">Given a time budget, find the best movies to maximize your enjoyment. 0/1 Knapsack vs Greedy.</p>
      </div>

      <div className="optim-layout">
        <div className="optim-controls glass-card">
          <div className="form-group">
            <label>⏱ Time Budget: <strong>{Math.floor(budget/60)}h {budget%60}m</strong></label>
            <input type="range" min="60" max="600" step="10" value={budget} onChange={e=>setBudget(+e.target.value)} className="lab-slider" />
          </div>

          <div className="optim-items">
            <label style={{marginBottom:10,display:'block'}}>Movies Dataset</label>
            {SAMPLE_ITEMS.map((it, i) => (
              <div key={i} className="optim-item">
                <span className="optim-item-title">{it.title}</span>
                <span className="optim-item-meta">{it.weight}min</span>
                <span className="optim-item-meta">⭐{it.value}</span>
              </div>
            ))}
          </div>
          <button className="lab-run-btn" onClick={run} disabled={loading}>
            {loading ? <span className="lab-spinner"/> : '▶'} Optimize
          </button>
        </div>

        {result && (
          <div className="optim-results">
            <div className="lab-pills" style={{marginBottom:16}}>
              <button className={`lab-pill ${view==='dp'?'active':''}`} onClick={()=>setView('dp')}>0/1 DP Result</button>
              <button className={`lab-pill ${view==='greedy'?'active':''}`} onClick={()=>setView('greedy')}>Greedy Result</button>
              <button className={`lab-pill ${view==='table'?'active':''}`} onClick={()=>setView('table')}>DP Table</button>
              <button className={`lab-pill ${view==='code'?'active':''}`} onClick={()=>setView('code')} style={{color:'#88C0D0', borderColor: view==='code'?'#88C0D0':'transparent'}}>{'</>'} Source Code</button>
            </div>

            {view === 'dp' && (
              <div className="optim-result-card glass-card">
                <div className="optim-header">
                  <span className="graph-badge">0/1 Knapsack — DP</span>
                  <span className="optim-value">Value: {result.dp01?.maxValue?.toFixed(1)}&nbsp;pts</span>
                  <span className="optim-weight">{result.dp01?.totalWeight}&nbsp;min used</span>
                </div>
                <div className="optim-selected">
                  {result.dp01?.selected?.map((it,i)=>(
                    <div key={i} className="optim-selected-item">
                      <span className="optim-item-title">✅ {it.title}</span>
                      <span className="optim-item-meta">{it.weight}min · ⭐{it.value}</span>
                    </div>
                  ))}
                </div>
                <div className="complexity-box" style={{marginTop:12}}>
                  <span>{result.dp01?.complexity?.time}</span>
                  <span>{result.dp01?.complexity?.space}</span>
                </div>
                <div style={{ marginTop: 16 }}>
                  <p style={{color:'var(--text-secondary)',fontSize:'0.85rem',marginBottom:8}}>Recurrence Relation:</p>
                  <code className="recurrence" style={{ display: 'block', padding: 12, background: 'rgba(0,0,0,0.4)', borderRadius: 8 }}>{result.dp01?.recurrence}</code>
                </div>
              </div>
            )}

            {view === 'code' && (
              <div className="code-panel glass-card" style={{ padding: 16, background: '#1e1e24', border: '1px solid #333' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ color: '#88C0D0', fontWeight: 600, fontSize: '0.9rem' }}>0/1 Knapsack (C++)</span>
                  <span style={{ color: '#A3BE8C', fontWeight: 600, fontSize: '0.9rem' }}>Fractional Knapsack (C++)</span>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <pre style={{ flex: 1, margin: 0, padding: 12, background: '#111', borderRadius: 8, fontSize: '0.75rem', color: '#c5c8c6', overflowX: 'auto' }}>
{`int knapsack01(int W, int wt[], int val[], int n) {
  vector<vector<int>> dp(n + 1, vector<int>(W + 1));
  for (int i = 0; i <= n; i++) {
    for (int w = 0; w <= W; w++) {
      if (i == 0 || w == 0)
        dp[i][w] = 0;
      else if (wt[i - 1] <= w)
        dp[i][w] = max(val[i - 1] + dp[i - 1][w - wt[i - 1]],
                       dp[i - 1][w]);
      else
        dp[i][w] = dp[i - 1][w];
    }
  }
  return dp[n][W];
}`}
                  </pre>
                  <pre style={{ flex: 1, margin: 0, padding: 12, background: '#111', borderRadius: 8, fontSize: '0.75rem', color: '#c5c8c6', overflowX: 'auto' }}>
{`struct Item { int value, weight; };
bool cmp(Item a, Item b) {
  return (double)a.value / a.weight > (double)b.value / b.weight;
}
double fractionalKnapsack(int W, Item arr[], int n) {
  sort(arr, arr + n, cmp);
  double finalVal = 0.0;
  for (int i = 0; i < n; i++) {
    if (arr[i].weight <= W) {
      W -= arr[i].weight;
      finalVal += arr[i].value;
    } else {
      finalVal += arr[i].value * ((double)W / arr[i].weight);
      break;
    }
  }
  return finalVal;
}`}
                  </pre>
                </div>
              </div>
            )}

            {view === 'greedy' && (
              <div className="optim-result-card glass-card">
                <div className="optim-header">
                  <span className="graph-badge" style={{background:'#A3BE8C22',borderColor:'#A3BE8C',color:'#A3BE8C'}}>Fractional Knapsack — Greedy</span>
                  <span className="optim-value">Value: {result.greedy?.maxValue?.toFixed(1)}&nbsp;pts</span>
                </div>
                <div className="optim-selected">
                  {result.greedy?.selected?.map((it,i)=>(
                    <div key={i} className="optim-selected-item">
                      <span className="optim-item-title">{it.fraction < 1 ? `⚡ ${(it.fraction*100).toFixed(0)}%` : '✅'} {it.title}</span>
                      <span className="optim-item-meta">ratio: {it.ratio?.toFixed(2)} · taken: {it.takenValue?.toFixed(1)}pts</span>
                    </div>
                  ))}
                </div>
                <div className="complexity-box" style={{marginTop:12}}><span>O(n log n)</span><span>O(n)</span></div>
                <p className="graph-desc">Greedy sorts by value/weight ratio. Allows fractions. NOT valid for 0/1 items.</p>
              </div>
            )}

            {view === 'table' && (
              <div className="dp-table-card glass-card">
                <p style={{color:'var(--text-secondary)',marginBottom:12,fontSize:'0.85rem'}}>DP Table — rows = items, cols = capacity (sampled). Cell = max value achievable.</p>
                <div style={{overflowX:'auto',maxHeight:320,overflowY:'auto'}}>
                  <table className="sort-table dp-table">
                    <thead><tr><th>Item</th>{result.dp01?.dpTable?.[0]?.map((_,j)=><th key={j}>{j}</th>)}</tr></thead>
                    <tbody>
                      {result.dp01?.dpTable?.map((row,i)=>(
                        <tr key={i}>
                          <td style={{color:'var(--accent)',fontWeight:600,whiteSpace:'nowrap',maxWidth:80,overflow:'hidden',textOverflow:'ellipsis'}}>
                            {i===0?'—':result.items?.[i-1]?.title||`Item ${i}`}
                          </td>
                          {row.map((v,j)=><td key={j} className="mono" style={{fontSize:'0.7rem',color:v>0?'var(--text-primary)':'var(--text-muted)'}}>{v}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PATTERN DETECTOR ─────────────────────────────────────────────────────────
function PatternDetector() {
  const [text,      setText]      = useState('The Dark Knight Rises in the darkest night, the knight stands tall.');
  const [pattern,   setPattern]   = useState('knight');
  const [algorithms,setAlgorithms]= useState(['kmp','rabin','boyer','naive']);
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);

  const toggle = (a) => setAlgorithms(prev => prev.includes(a) ? prev.filter(x=>x!==a) : [...prev,a]);

  const run = async () => {
    if (!text || !pattern) return;
    setLoading(true);
    try {
      const { data } = await api.post('/lab/pattern', { text, pattern, algorithms });
      setResult(data);
    } catch(e){}
    setLoading(false);
  };

  const highlightText = (text, matches) => {
    if (!matches?.length) return text;
    const pLen = pattern.length;
    const parts = [];
    let last = 0;
    [...matches].sort((a,b)=>a-b).forEach(idx => {
      parts.push(text.slice(last, idx));
      parts.push(<mark key={idx} className="pattern-match">{text.slice(idx, idx+pLen)}</mark>);
      last = idx + pLen;
    });
    parts.push(text.slice(last));
    return parts;
  };

  const resultList = result ? Object.entries(result.results) : [];
  const firstMatches = resultList[0]?.[1]?.matches || [];

  return (
    <div className="lab-section">
      <div className="lab-section-header">
        <h2 className="lab-section-title">🔍 Pattern Detection Engine</h2>
        <p className="lab-section-sub">KMP, Rabin-Karp, Boyer-Moore, and Naive — same search, different strategies.</p>
      </div>

      <div className="pattern-layout">
        <div className="pattern-controls glass-card">
          <div className="form-group">
            <label>Text to Search</label>
            <textarea className="lab-textarea" rows={4} value={text} onChange={e=>setText(e.target.value)} placeholder="Enter text..." />
          </div>
          <div className="form-group">
            <label>Pattern</label>
            <input className="lab-input" value={pattern} onChange={e=>setPattern(e.target.value)} placeholder="e.g. knight" />
          </div>
          <div className="form-group">
            <label>Algorithms</label>
            <div className="lab-pills">
              {[['kmp','KMP'],['rabin','Rabin-Karp'],['boyer','Boyer-Moore'],['naive','Naive']].map(([v,l])=>(
                <button key={v} className={`lab-pill ${algorithms.includes(v)?'active':''}`} onClick={()=>toggle(v)}>{l}</button>
              ))}
            </div>
          </div>
          <button className="lab-run-btn" onClick={run} disabled={loading}>
            {loading ? <span className="lab-spinner"/> : '▶'} Search
          </button>
        </div>

        <div className="pattern-results-col">
          {result && (
            <>
              <div className="pattern-text-display glass-card">
                <p className="pattern-text-content">
                  {highlightText(result.text, firstMatches)}
                </p>
                <p style={{color:'var(--text-muted)',fontSize:'0.78rem',marginTop:8}}>
                  {firstMatches.length} match{firstMatches.length!==1?'es':''} found for "{pattern}"
                </p>
              </div>

              <div className="pattern-compare glass-card">
                <table className="sort-table">
                  <thead>
                    <tr><th>Algorithm</th><th>Matches</th><th>Comparisons</th><th>Time (ms)</th><th>Time Complexity</th><th>Space</th></tr>
                  </thead>
                  <tbody>
                    {resultList.map(([key, r]) => (
                      <tr key={key}>
                        <td><span className="algo-badge">{r.algorithm}</span></td>
                        <td className="mono">{r.matches?.length}</td>
                        <td className="mono">{r.comparisons}</td>
                        <td className="mono">{r.timeMs}</td>
                        <td className="mono complexity">{r.complexity?.time}</td>
                        <td className="mono complexity">{r.complexity?.space}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result.results?.kmp?.failureFunction && (
                <div className="kmp-failure glass-card">
                  <p style={{color:'var(--text-secondary)',marginBottom:8,fontSize:'0.85rem'}}>KMP Failure Function for pattern "<strong>{pattern}</strong>"</p>
                  <div className="ff-row">
                    {pattern.split('').map((c,i)=>(
                      <div key={i} className="ff-cell">
                        <div className="ff-char">{c}</div>
                        <div className="ff-val">{result.results.kmp.failureFunction[i]}</div>
                      </div>
                    ))}
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

// ─── BACKTRACKING ──────────────────────────────────────────────────────────────
function BacktrackLab() {
  const [mode, setMode]       = useState('nqueens');
  const [n,    setN]          = useState(6);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [franchise, setFranchise] = useState('mcu');
  const [franchises, setFranchises] = useState([]);
  const [subArr, setSubArr]   = useState([2,3,6,9,12,15,18]);
  const [subTarget, setSubTarget] = useState(18);

  useEffect(() => {
    api.get('/lab/franchises').then(r=>setFranchises(r.data)).catch(()=>{});
  }, []);

  const run = async () => {
    setLoading(true); setResult(null);
    try {
      if (mode === 'nqueens') {
        const { data } = await api.post('/lab/nqueens', { n });
        setResult(data);
      } else if (mode === 'topo') {
        const { data } = await api.post('/lab/topo', { franchise });
        setResult(data);
      } else if (mode === 'subsets') {
        const { data } = await api.post('/lab/sumsubsets', { arr: subArr, target: subTarget });
        setResult(data);
      }
    } catch(e){}
    setLoading(false);
  };

  return (
    <div className="lab-section">
      <div className="lab-section-header">
        <h2 className="lab-section-title">🧩 Backtracking Laboratory</h2>
        <p className="lab-section-sub">N-Queens, Topological Sort, and Sum-of-Subsets — visualizing recursive exhaustive search.</p>
      </div>

      <div className="lab-pills" style={{marginBottom:20}}>
        {[['nqueens','♛ N-Queens'],['topo','📋 Topo Sort'],['subsets','∑ Sum of Subsets']].map(([v,l])=>(
          <button key={v} className={`lab-pill ${mode===v?'active':''}`} onClick={()=>{setMode(v);setResult(null);}}>{l}</button>
        ))}
      </div>

      <div className="backtrack-layout">
        <div className="glass-card" style={{padding:24,minWidth:260}}>
          {mode === 'nqueens' && (
            <div className="form-group">
              <label>Board Size N: <strong>{n}×{n}</strong></label>
              <input type="range" min="4" max="9" value={n} onChange={e=>setN(+e.target.value)} className="lab-slider" />
              <p style={{color:'var(--text-muted)',fontSize:'0.8rem',marginTop:8}}>Place {n} queens so none attack each other.</p>
            </div>
          )}
          {mode === 'topo' && (
            <div className="form-group">
              <label>Franchise Watch Order</label>
              <select value={franchise} onChange={e=>setFranchise(e.target.value)} className="lab-select">
                {franchises.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
              <p style={{color:'var(--text-muted)',fontSize:'0.8rem',marginTop:8}}>Detects circular dependencies & gives valid watch order.</p>
            </div>
          )}
          {mode === 'subsets' && (
            <div className="form-group">
              <label>Target Sum: <strong>{subTarget}</strong></label>
              <input type="range" min="5" max="50" value={subTarget} onChange={e=>setSubTarget(+e.target.value)} className="lab-slider" />
              <p style={{color:'var(--text-muted)',fontSize:'0.8rem',marginTop:8}}>Array: [{subArr.join(', ')}]</p>
            </div>
          )}
          <button className="lab-run-btn" style={{marginTop:16}} onClick={run} disabled={loading}>
            {loading?<span className="lab-spinner"/>:'▶'} Solve
          </button>
        </div>

        {result && (
          <div className="backtrack-results glass-card">
            {mode === 'nqueens' && (
              <>
                <div className="bt-stat-row">
                  <div className="bt-stat"><strong>{result.solutionCount}</strong><span>Solutions</span></div>
                  <div className="bt-stat"><strong>{result.backtracks}</strong><span>Backtracks</span></div>
                  <div className="bt-stat"><strong>{result.totalSteps}</strong><span>Total Steps</span></div>
                  <div className="bt-stat"><strong>{result.timeMs}ms</strong><span>Time</span></div>
                </div>
                <div className="complexity-box"><span>{result.complexity?.time}</span><span>{result.complexity?.space}</span></div>
                <p className="graph-desc" style={{marginTop:8}}>{result.description}</p>
                {result.solutions?.[0] && (
                  <div style={{marginTop:16}}>
                    <p style={{color:'var(--text-secondary)',marginBottom:8,fontSize:'0.85rem'}}>First Solution:</p>
                    <div className="nqueens-board" style={{gridTemplateColumns:`repeat(${n},1fr)`}}>
                      {Array.from({length:n*n},(_,idx)=>{
                        const r=Math.floor(idx/n), c=idx%n;
                        return (
                          <div key={idx} className={`nqueens-cell ${(r+c)%2===0?'light':'dark'} ${result.solutions[0][r]===c?'queen':''}`}>
                            {result.solutions[0][r]===c?'♛':''}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
            {mode === 'topo' && (
              <>
                <div className={`topo-status ${result.hasCycle?'error':'success'}`}>
                  {result.hasCycle ? '⚠️ Cycle Detected! No valid order.' : '✅ Valid topological order found!'}
                </div>
                {!result.hasCycle && (
                  <div className="topo-order">
                    {result.order?.map((node,i)=>(
                      <div key={i} className="topo-node">
                        <span className="topo-num">{i+1}</span>
                        <span className="topo-label">{node}</span>
                        {i < result.order.length-1 && <span className="topo-arrow">→</span>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="complexity-box" style={{marginTop:16}}><span>{result.complexity?.time}</span><span>{result.complexity?.space}</span></div>
                <p className="graph-desc">{result.description}</p>
              </>
            )}
            {mode === 'subsets' && (
              <>
                <div className="bt-stat-row">
                  <div className="bt-stat"><strong>{result.solutionCount}</strong><span>Subsets</span></div>
                  <div className="bt-stat"><strong>{result.backtracks}</strong><span>Backtracks</span></div>
                  <div className="bt-stat"><strong>{result.timeMs}ms</strong><span>Time</span></div>
                </div>
                <div className="subset-solutions">
                  {result.solutions?.map((s,i)=>(
                    <div key={i} className="subset-row glass-card">
                      [{s.join(' + ')}] = {subTarget}
                    </div>
                  ))}
                </div>
                <div className="complexity-box" style={{marginTop:12}}><span>{result.complexity?.time}</span><span>{result.complexity?.space}</span></div>
                <p className="graph-desc">{result.description}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN LAB PAGE ────────────────────────────────────────────────────────────
export default function Lab() {
  const [activeTab, setActiveTab] = useState('sort');

  return (
    <div className="lab-page animate-fade">
      <div className="lab-hero">
        <div className="lab-hero-glow" />
        <p className="lab-eyebrow">ORLUNE · ALGORITHM ENGINE</p>
        <h1 className="lab-title">Intelligence <span>Core</span></h1>
        <p className="lab-subtitle">
          Real algorithms powering this platform — visualized live.
          <br/>Sorting · Graph Theory · Dynamic Programming · String Matching · Backtracking
        </p>
      </div>

      <div className="lab-tabs-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`lab-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="lab-tab-icon">{t.icon}</span>
            <span className="lab-tab-label">{t.label}</span>
            <span className="lab-tab-desc">{t.desc}</span>
          </button>
        ))}
      </div>

      <div className="lab-body container">
        {activeTab === 'sort'      && <SortStudio />}
        {activeTab === 'graph'     && <GenreGraph />}
        {activeTab === 'optimizer' && <Optimizer />}
        {activeTab === 'pattern'   && <PatternDetector />}
        {activeTab === 'backtrack' && <BacktrackLab />}
      </div>
    </div>
  );
}
