'use strict';

// ─── GENRE GRAPH DEFINITION ──────────────────────────────────────────────────
const NODES = [
  { id: 'action',   label: 'Action',   x: 0.50, y: 0.08 },
  { id: 'thriller', label: 'Thriller', x: 0.80, y: 0.28 },
  { id: 'scifi',    label: 'Sci-Fi',   x: 0.90, y: 0.55 },
  { id: 'horror',   label: 'Horror',   x: 0.72, y: 0.78 },
  { id: 'mystery',  label: 'Mystery',  x: 0.45, y: 0.90 },
  { id: 'fantasy',  label: 'Fantasy',  x: 0.18, y: 0.78 },
  { id: 'anime',    label: 'Anime',    x: 0.05, y: 0.52 },
  { id: 'comedy',   label: 'Comedy',   x: 0.15, y: 0.25 },
  { id: 'romance',  label: 'Romance',  x: 0.38, y: 0.10 },
  { id: 'drama',    label: 'Drama',    x: 0.50, y: 0.48 },
];

const EDGES = [
  { from: 'action',   to: 'thriller', weight: 2 },
  { from: 'action',   to: 'scifi',    weight: 4 },
  { from: 'action',   to: 'romance',  weight: 6 },
  { from: 'action',   to: 'drama',    weight: 5 },
  { from: 'thriller', to: 'mystery',  weight: 3 },
  { from: 'thriller', to: 'horror',   weight: 2 },
  { from: 'thriller', to: 'drama',    weight: 4 },
  { from: 'scifi',    to: 'fantasy',  weight: 3 },
  { from: 'scifi',    to: 'anime',    weight: 5 },
  { from: 'horror',   to: 'mystery',  weight: 2 },
  { from: 'horror',   to: 'fantasy',  weight: 4 },
  { from: 'mystery',  to: 'drama',    weight: 3 },
  { from: 'fantasy',  to: 'anime',    weight: 2 },
  { from: 'fantasy',  to: 'comedy',   weight: 5 },
  { from: 'anime',    to: 'comedy',   weight: 3 },
  { from: 'comedy',   to: 'romance',  weight: 2 },
  { from: 'comedy',   to: 'drama',    weight: 3 },
  { from: 'romance',  to: 'drama',    weight: 2 },
  { from: 'drama',    to: 'mystery',  weight: 4 },
];

// Build adjacency list (undirected)
function buildAdjList() {
  const adj = {};
  NODES.forEach(n => { adj[n.id] = []; });
  EDGES.forEach(e => {
    adj[e.from].push({ node: e.to,   weight: e.weight });
    adj[e.to  ].push({ node: e.from, weight: e.weight });
  });
  return adj;
}

// ─── DIJKSTRA ────────────────────────────────────────────────────────────────
function dijkstra(source, target) {
  const adj = buildAdjList();
  const dist = {}, prev = {}, visited = new Set();
  const steps = [];
  NODES.forEach(n => { dist[n.id] = Infinity; prev[n.id] = null; });
  dist[source] = 0;
  const pq = [{ node: source, cost: 0 }];

  while (pq.length) {
    pq.sort((a, b) => a.cost - b.cost);
    const { node: u } = pq.shift();
    if (visited.has(u)) continue;
    visited.add(u);
    steps.push({ visiting: u, distances: { ...dist }, visited: [...visited] });

    for (const { node: v, weight } of adj[u]) {
      if (visited.has(v)) continue;
      const newDist = dist[u] + weight;
      if (newDist < dist[v]) {
        dist[v] = newDist;
        prev[v] = u;
        pq.push({ node: v, cost: newDist });
      }
    }
  }

  // Reconstruct path
  const path = [];
  let cur = target;
  while (cur) { path.unshift(cur); cur = prev[cur]; }

  return {
    algorithm: 'Dijkstra',
    path: path[0] === source ? path : [],
    distance: dist[target] === Infinity ? null : dist[target],
    allDistances: dist,
    steps,
    complexity: { time: 'O((V + E) log V)', space: 'O(V)' },
    description: 'Greedy shortest path using priority queue. Guarantees optimal for non-negative weights.',
  };
}

// ─── BELLMAN-FORD ─────────────────────────────────────────────────────────────
function bellmanFord(source, target) {
  const dist = {}, prev = {};
  const steps = [];
  NODES.forEach(n => { dist[n.id] = Infinity; prev[n.id] = null; });
  dist[source] = 0;

  for (let i = 0; i < NODES.length - 1; i++) {
    let relaxed = false;
    for (const e of EDGES) {
      // undirected — try both directions
      for (const [u, v] of [[e.from, e.to], [e.to, e.from]]) {
        if (dist[u] !== Infinity && dist[u] + e.weight < dist[v]) {
          dist[v] = dist[u] + e.weight;
          prev[v] = u;
          relaxed = true;
        }
      }
    }
    steps.push({ iteration: i + 1, distances: { ...dist } });
    if (!relaxed) break;
  }

  // Negative cycle check
  let hasCycle = false;
  for (const e of EDGES) {
    if (dist[e.from] !== Infinity && dist[e.from] + e.weight < dist[e.to]) { hasCycle = true; break; }
  }

  const path = [];
  let cur = target;
  while (cur) { path.unshift(cur); cur = prev[cur]; }

  return {
    algorithm: 'Bellman-Ford',
    path: path[0] === source ? path : [],
    distance: dist[target] === Infinity ? null : dist[target],
    allDistances: dist,
    steps,
    hasCycle,
    complexity: { time: 'O(V × E)', space: 'O(V)' },
    description: 'Relaxes all edges V-1 times. Handles negative weights. Detects negative cycles.',
  };
}

// ─── BFS ─────────────────────────────────────────────────────────────────────
function bfs(source, target) {
  const adj = buildAdjList();
  const visited = new Set([source]);
  const prev = { [source]: null };
  const queue = [source];
  const steps = [];
  let found = false;

  while (queue.length) {
    const u = queue.shift();
    steps.push({ visiting: u, queue: [...queue], visited: [...visited] });
    if (u === target) { found = true; break; }
    for (const { node: v } of adj[u]) {
      if (!visited.has(v)) {
        visited.add(v); prev[v] = u; queue.push(v);
      }
    }
  }

  const path = [];
  let cur = target;
  while (cur !== undefined && cur !== null) { path.unshift(cur); cur = prev[cur]; }

  return {
    algorithm: 'BFS',
    path: found ? path : [],
    visitedOrder: steps.map(s => s.visiting),
    steps,
    complexity: { time: 'O(V + E)', space: 'O(V)' },
    description: 'Level-by-level exploration. Finds shortest path by number of edges (unweighted).',
  };
}

// ─── DFS ─────────────────────────────────────────────────────────────────────
function dfs(source, target) {
  const adj = buildAdjList();
  const visited = new Set();
  const steps = [];
  let foundPath = null;

  function explore(node, path) {
    visited.add(node);
    steps.push({ visiting: node, path: [...path, node], visited: [...visited] });
    if (node === target) { foundPath = [...path, node]; return true; }
    for (const { node: next } of adj[node]) {
      if (!visited.has(next)) {
        if (explore(next, [...path, node])) return true;
      }
    }
    return false;
  }

  explore(source, []);

  return {
    algorithm: 'DFS',
    path: foundPath || [],
    visitedOrder: steps.map(s => s.visiting),
    steps,
    complexity: { time: 'O(V + E)', space: 'O(V)' },
    description: 'Depth-first exploration using recursion/stack. Explores as far as possible before backtracking.',
  };
}

// ─── FLOYD-WARSHALL (All-Pairs Shortest Path) ────────────────────────────────
function floydWarshall() {
  const n = NODES.length;
  const idx = {}; NODES.forEach((node, i) => { idx[node.id] = i; });
  const dist = Array.from({ length: n }, () => Array(n).fill(Infinity));
  const next = Array.from({ length: n }, () => Array(n).fill(null));

  NODES.forEach((_, i) => { dist[i][i] = 0; });
  EDGES.forEach(e => {
    const u = idx[e.from], v = idx[e.to];
    dist[u][v] = e.weight; dist[v][u] = e.weight;
    next[u][v] = e.to;     next[v][u] = e.from;
  });

  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
          next[i][j] = next[i][k];
        }

  const labels = NODES.map(n => n.label);
  return {
    algorithm: 'Floyd-Warshall',
    matrix: dist,
    nodeOrder: NODES.map(n => n.id),
    nodeLabels: labels,
    complexity: { time: 'O(V³)', space: 'O(V²)' },
    description: 'All-pairs shortest paths using DP. Works for negative weights (no negative cycles).',
  };
}

// ─── KRUSKAL'S MST ──────────────────────────────────────────────────────────
function kruskalMST() {
  const parent = {}, rank = {};
  NODES.forEach(n => { parent[n.id] = n.id; rank[n.id] = 0; });

  function find(x) {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }
  function union(x, y) {
    const px = find(x), py = find(y);
    if (px === py) return false;
    if (rank[px] < rank[py]) parent[px] = py;
    else if (rank[px] > rank[py]) parent[py] = px;
    else { parent[py] = px; rank[px]++; }
    return true;
  }

  const sorted = [...EDGES].sort((a, b) => a.weight - b.weight);
  const mstEdges = [], steps = [];
  let totalWeight = 0;

  for (const e of sorted) {
    if (union(e.from, e.to)) {
      mstEdges.push(e);
      totalWeight += e.weight;
      steps.push({ added: e, mstSoFar: [...mstEdges] });
    }
    if (mstEdges.length === NODES.length - 1) break;
  }

  return {
    algorithm: "Kruskal's MST",
    mstEdges,
    totalWeight,
    steps,
    complexity: { time: 'O(E log E)', space: 'O(V)' },
    description: 'Minimum Spanning Tree — greedily picks cheapest edge that does not form a cycle (Union-Find).',
  };
}

// ─── ARTICULATION POINTS & BRIDGES ──────────────────────────────────────────
function findArticulationPoints() {
  const adj = buildAdjList();
  const visited = {}, disc = {}, low = {}, parent = {};
  const artPoints = new Set(), bridges = [];
  let timer = 0;

  NODES.forEach(n => { visited[n.id] = false; parent[n.id] = null; });

  function dfsAP(u) {
    visited[u] = true;
    disc[u] = low[u] = ++timer;
    let childCount = 0;

    for (const { node: v } of adj[u]) {
      if (!visited[v]) {
        childCount++;
        parent[v] = u;
        dfsAP(v);
        low[u] = Math.min(low[u], low[v]);

        if (parent[u] === null && childCount > 1) artPoints.add(u);
        if (parent[u] !== null && low[v] >= disc[u]) artPoints.add(u);
        if (low[v] > disc[u]) bridges.push({ from: u, to: v, weight: EDGES.find(e => (e.from===u&&e.to===v)||(e.from===v&&e.to===u))?.weight });
      } else if (v !== parent[u]) {
        low[u] = Math.min(low[u], disc[v]);
      }
    }
  }

  NODES.forEach(n => { if (!visited[n.id]) dfsAP(n.id); });

  return {
    algorithm: 'Articulation Points & Bridges',
    articulationPoints: [...artPoints],
    bridges,
    complexity: { time: 'O(V + E)', space: 'O(V)' },
    description: 'Finds critical nodes and edges whose removal disconnects the graph (Tarjan\'s algorithm).',
  };
}

// ─── BFS RECOMMENDATION (for Home page "For You") ────────────────────────────
function getRecommendedGenres(topGenres = [], limit = 3) {
  const adj = buildAdjList();
  const visited = new Set(topGenres);
  const queue = [...topGenres];
  const discovered = [];

  while (queue.length && discovered.length < limit) {
    const u = queue.shift();
    const neighbors = adj[u] || [];
    neighbors.sort((a, b) => a.weight - b.weight);
    for (const { node: v } of neighbors) {
      if (!visited.has(v)) {
        visited.add(v);
        queue.push(v);
        discovered.push(v);
        if (discovered.length >= limit) break;
      }
    }
  }
  return discovered;
}

module.exports = {
  NODES, EDGES,
  dijkstra, bellmanFord, bfs, dfs,
  floydWarshall, kruskalMST, findArticulationPoints,
  getRecommendedGenres,
};
