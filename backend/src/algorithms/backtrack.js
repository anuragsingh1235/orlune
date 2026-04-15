'use strict';

// ─── N-QUEENS (Backtracking) ──────────────────────────────────────────────────
function nQueens(n) {
  const solutions = [];
  const steps = [];
  let backtracks = 0;

  function isSafe(board, row, col) {
    for (let i = 0; i < row; i++) {
      if (board[i] === col) return false;
      if (Math.abs(board[i] - col) === Math.abs(i - row)) return false;
    }
    return true;
  }

  function solve(board, row) {
    if (row === n) { solutions.push([...board]); return; }
    for (let col = 0; col < n; col++) {
      if (isSafe(board, row, col)) {
        board[row] = col;
        steps.push({ type: 'place',     row, col, board: [...board] });
        solve(board, row + 1);
        steps.push({ type: 'backtrack', row, col, board: [...board] });
        board[row] = -1;
        backtracks++;
      }
    }
  }

  const board = new Array(n).fill(-1);
  const start = Date.now();
  solve(board, 0);

  return {
    algorithm: 'N-Queens Backtracking',
    n,
    solutionCount: solutions.length,
    solutions: solutions.slice(0, 3), // first 3 solutions
    totalSteps: steps.length,
    backtracks,
    stepSample: steps.slice(0, 60),   // first 60 steps for animation
    timeMs: Math.max(Date.now() - start, 0.1),
    complexity: { time: 'O(n!)', space: 'O(n)' },
    description: `Backtracking — places queens row by row, backs up on conflicts. Found ${solutions.length} solutions for ${n}×${n} board.`,
  };
}

// ─── TOPOLOGICAL SORT + CYCLE DETECTION ──────────────────────────────────────
function topologicalSort(nodes, edges) {
  // Build adjacency list
  const adj = {};
  const inDegree = {};
  nodes.forEach(n => { adj[n] = []; inDegree[n] = 0; });
  edges.forEach(({ from, to }) => {
    if (adj[from]) { adj[from].push(to); inDegree[to] = (inDegree[to] || 0) + 1; }
  });

  const start = Date.now();
  // Kahn's Algorithm (BFS-based topo sort)
  const queue = nodes.filter(n => inDegree[n] === 0);
  const order = [];
  const steps = [];

  while (queue.length) {
    queue.sort(); // deterministic
    const u = queue.shift();
    order.push(u);
    steps.push({ processed: u, queue: [...queue], orderSoFar: [...order] });
    for (const v of (adj[u] || [])) {
      inDegree[v]--;
      if (inDegree[v] === 0) queue.push(v);
    }
  }

  const hasCycle = order.length !== nodes.length;

  return {
    algorithm: 'Topological Sort (Kahn\'s BFS)',
    order,
    hasCycle,
    cycleNodes: hasCycle ? nodes.filter(n => !order.includes(n)) : [],
    steps,
    timeMs: Math.max(Date.now() - start, 0.1),
    complexity: { time: 'O(V + E)', space: 'O(V)' },
    description: hasCycle
      ? '⚠️ Cycle detected! Topological sort not possible for cyclic graphs.'
      : 'Kahn\'s algorithm — removes zero in-degree nodes iteratively. Valid for DAGs only.',
  };
}

// ─── SUM OF SUBSETS (Backtracking) ───────────────────────────────────────────
function sumOfSubsets(arr, target) {
  const solutions = [];
  const steps = [];
  let backtracks = 0;
  const sorted = [...arr].sort((a, b) => a - b);

  function backtrack(start, current, remaining) {
    if (remaining === 0) {
      solutions.push([...current]);
      steps.push({ type: 'found', subset: [...current], remaining });
      return;
    }
    for (let i = start; i < sorted.length; i++) {
      if (sorted[i] > remaining) break; // pruning
      if (i > start && sorted[i] === sorted[i - 1]) continue; // skip duplicates
      current.push(sorted[i]);
      steps.push({ type: 'include', value: sorted[i], subset: [...current], remaining: remaining - sorted[i] });
      backtrack(i + 1, current, remaining - sorted[i]);
      current.pop();
      backtracks++;
      steps.push({ type: 'backtrack', value: sorted[i], remaining });
    }
  }

  const start = Date.now();
  backtrack(0, [], target);

  return {
    algorithm: 'Sum of Subsets (Backtracking)',
    target,
    solutions: solutions.slice(0, 5),
    solutionCount: solutions.length,
    backtracks,
    stepSample: steps.slice(0, 50),
    timeMs: Math.max(Date.now() - start, 0.1),
    complexity: { time: 'O(2ⁿ) worst', space: 'O(n)' },
    description: `Finds all subsets summing to ${target}. Pruning cuts branches early when running sum exceeds target.`,
  };
}

// ─── PREDEFINED FRANCHISE GRAPH (for Topo Sort demo) ─────────────────────────
const FRANCHISE_GRAPHS = {
  mcu: {
    label: 'MCU Watch Order',
    nodes: ['Iron Man', 'Hulk', 'Thor', 'Avengers', 'Iron Man 3', 'Thor 2', 'Winter Soldier', 'Guardians', 'Age of Ultron', 'Ant-Man'],
    edges: [
      { from: 'Iron Man',       to: 'Avengers'      },
      { from: 'Hulk',           to: 'Avengers'      },
      { from: 'Thor',           to: 'Avengers'      },
      { from: 'Avengers',       to: 'Iron Man 3'    },
      { from: 'Avengers',       to: 'Thor 2'        },
      { from: 'Avengers',       to: 'Winter Soldier'},
      { from: 'Iron Man 3',     to: 'Age of Ultron' },
      { from: 'Thor 2',         to: 'Age of Ultron' },
      { from: 'Winter Soldier', to: 'Age of Ultron' },
      { from: 'Guardians',      to: 'Age of Ultron' },
      { from: 'Age of Ultron',  to: 'Ant-Man'       },
    ],
  },
  darkKnight: {
    label: 'Dark Knight Trilogy',
    nodes: ['Batman Begins', 'The Dark Knight', 'The Dark Knight Rises'],
    edges: [
      { from: 'Batman Begins',    to: 'The Dark Knight'       },
      { from: 'The Dark Knight',  to: 'The Dark Knight Rises' },
    ],
  },
  fastSaga: {
    label: 'Fast & Furious Saga',
    nodes: ['Fast & Furious', 'Fast Five', 'Fast 6', 'Fast 7', 'Fate of the Furious'],
    edges: [
      { from: 'Fast & Furious', to: 'Fast Five'            },
      { from: 'Fast Five',      to: 'Fast 6'               },
      { from: 'Fast 6',         to: 'Fast 7'               },
      { from: 'Fast 7',         to: 'Fate of the Furious'  },
    ],
  },
};

module.exports = { nQueens, topologicalSort, sumOfSubsets, FRANCHISE_GRAPHS };
