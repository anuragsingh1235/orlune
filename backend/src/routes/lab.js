const express = require('express');
const router  = express.Router();

const { runAlgorithms, generateSampleData } = require('../algorithms/sorting');
const { dijkstra, bellmanFord, bfs, dfs, floydWarshall, kruskalMST, findArticulationPoints, NODES, EDGES, getRecommendedGenres } = require('../algorithms/graph');
const { runPatternSearch } = require('../algorithms/stringMatch');
const { knapsack01, fractionalKnapsack, subsetSum, lcs } = require('../algorithms/dynamic');
const { nQueens, topologicalSort, sumOfSubsets, FRANCHISE_GRAPHS } = require('../algorithms/backtrack');

// ────────────────────────────────────────────────
// SORT — POST /api/lab/sort
// ────────────────────────────────────────────────
router.post('/sort', (req, res) => {
  try {
    const { algorithms = ['merge', 'quick', 'heap'], size = 50, dataType = 'random', customData } = req.body;
    const data = customData?.length ? customData.map(Number) : generateSampleData(dataType, Math.min(size, 300));
    const results = runAlgorithms(data, algorithms);
    res.json({ rawData: data, results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ────────────────────────────────────────────────
// GRAPH DATA — GET /api/lab/graph/data
// ────────────────────────────────────────────────
router.get('/graph/data', (req, res) => {
  res.json({ nodes: NODES, edges: EDGES });
});

// ────────────────────────────────────────────────
// GRAPH PATH — POST /api/lab/graph/path
// ────────────────────────────────────────────────
router.post('/graph/path', (req, res) => {
  try {
    const { source, target, algorithm = 'dijkstra' } = req.body;
    const algoMap = { dijkstra, bellmanFord, bfs, dfs };
    const fn = algoMap[algorithm];
    if (!fn) return res.status(400).json({ error: 'Unknown algorithm' });
    const result = fn(source, target);
    res.json({ ...result, nodes: NODES, edges: EDGES });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ────────────────────────────────────────────────
// FLOYD-WARSHALL — GET /api/lab/graph/floyd
// ────────────────────────────────────────────────
router.get('/graph/floyd', (req, res) => {
  try { res.json(floydWarshall()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ────────────────────────────────────────────────
// MST — GET /api/lab/graph/mst
// ────────────────────────────────────────────────
router.get('/graph/mst', (req, res) => {
  try { res.json({ ...kruskalMST(), nodes: NODES, edges: EDGES }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ────────────────────────────────────────────────
// ARTICULATION POINTS — GET /api/lab/graph/articulation
// ────────────────────────────────────────────────
router.get('/graph/articulation', (req, res) => {
  try { res.json({ ...findArticulationPoints(), nodes: NODES, edges: EDGES }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ────────────────────────────────────────────────
// BFS RECOMMENDATION — POST /api/lab/recommend
// ────────────────────────────────────────────────
router.post('/recommend', (req, res) => {
  try {
    const { topGenres = [] } = req.body;
    const recommended = getRecommendedGenres(topGenres, 3);
    res.json({ topGenres, recommendedGenres: recommended, nodes: NODES, edges: EDGES });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ────────────────────────────────────────────────
// PATTERN SEARCH — POST /api/lab/pattern
// ────────────────────────────────────────────────
router.post('/pattern', (req, res) => {
  try {
    const { text, pattern, algorithms = ['kmp', 'rabin', 'boyer', 'naive'] } = req.body;
    if (!text || !pattern) return res.status(400).json({ error: 'text and pattern required' });
    const results = runPatternSearch(text, pattern, algorithms);
    res.json({ text, pattern, results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ────────────────────────────────────────────────
// KNAPSACK — POST /api/lab/knapsack
// ────────────────────────────────────────────────
router.post('/knapsack', (req, res) => {
  try {
    const { items, capacity = 180 } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'items required' });
    const cap = Math.min(Math.round(capacity), 600);
    const dp01   = knapsack01(items, cap);
    const greedy = fractionalKnapsack(items, cap);
    res.json({ capacity: cap, items, dp01, greedy });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ────────────────────────────────────────────────
// SUBSET SUM — POST /api/lab/subsetsum
// ────────────────────────────────────────────────
router.post('/subsetsum', (req, res) => {
  try {
    const { nums, target } = req.body;
    if (!nums?.length || target == null) return res.status(400).json({ error: 'nums and target required' });
    res.json(subsetSum(nums.map(Number), Math.round(target)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ────────────────────────────────────────────────
// LCS — POST /api/lab/lcs
// ────────────────────────────────────────────────
router.post('/lcs', (req, res) => {
  try {
    const { arr1, arr2 } = req.body;
    if (!arr1?.length || !arr2?.length) return res.status(400).json({ error: 'arr1 and arr2 required' });
    res.json(lcs(arr1, arr2));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ────────────────────────────────────────────────
// N-QUEENS — POST /api/lab/nqueens
// ────────────────────────────────────────────────
router.post('/nqueens', (req, res) => {
  try {
    const { n = 6 } = req.body;
    if (n < 1 || n > 10) return res.status(400).json({ error: 'n must be 1-10' });
    res.json(nQueens(n));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ────────────────────────────────────────────────
// TOPOLOGICAL SORT — POST /api/lab/topo
// ────────────────────────────────────────────────
router.post('/topo', (req, res) => {
  try {
    const { franchise, nodes, edges } = req.body;
    let n, e;
    if (franchise && FRANCHISE_GRAPHS[franchise]) {
      n = FRANCHISE_GRAPHS[franchise].nodes;
      e = FRANCHISE_GRAPHS[franchise].edges;
    } else if (nodes && edges) {
      n = nodes; e = edges;
    } else {
      // Default: MCU
      n = FRANCHISE_GRAPHS.mcu.nodes;
      e = FRANCHISE_GRAPHS.mcu.edges;
    }
    res.json({ ...topologicalSort(n, e), franchises: Object.keys(FRANCHISE_GRAPHS).map(k => ({ id: k, label: FRANCHISE_GRAPHS[k].label })) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ────────────────────────────────────────────────
// SUM OF SUBSETS — POST /api/lab/sumsubsets
// ────────────────────────────────────────────────
router.post('/sumsubsets', (req, res) => {
  try {
    const { arr, target } = req.body;
    if (!arr?.length || target == null) return res.status(400).json({ error: 'arr and target required' });
    res.json(sumOfSubsets(arr.map(Number), Number(target)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ────────────────────────────────────────────────
// FRANCHISE GRAPHS LIST — GET /api/lab/franchises
// ────────────────────────────────────────────────
router.get('/franchises', (req, res) => {
  res.json(Object.entries(FRANCHISE_GRAPHS).map(([id, g]) => ({ id, label: g.label, nodes: g.nodes, edges: g.edges })));
});

module.exports = router;
