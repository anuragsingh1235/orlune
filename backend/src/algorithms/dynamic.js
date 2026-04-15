'use strict';

// ─── 0/1 KNAPSACK (Bottom-up DP) ────────────────────────────────────────────
function knapsack01(items, capacity) {
  const n = items.length;
  // dp[i][w] = max value using first i items with weight budget w
  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));
  const start = Date.now();

  for (let i = 1; i <= n; i++) {
    const { weight, value } = items[i - 1];
    const w = Math.round(weight);
    for (let cap = 0; cap <= capacity; cap++) {
      dp[i][cap] = dp[i - 1][cap]; // don't take item i
      if (w <= cap) {
        dp[i][cap] = Math.max(dp[i][cap], dp[i - 1][cap - w] + value);
      }
    }
  }

  // Backtrack to find selected items
  const selected = [];
  let cap = capacity;
  for (let i = n; i > 0; i--) {
    if (dp[i][cap] !== dp[i - 1][cap]) {
      selected.push(items[i - 1]);
      cap -= Math.round(items[i - 1].weight);
    }
  }

  // Compress dp table for transport (sample every column to keep size small)
  const step = Math.max(1, Math.floor(capacity / 20));
  const dpSample = dp.map(row => row.filter((_, j) => j % step === 0 || j === capacity));

  return {
    algorithm: '0/1 Knapsack (DP)',
    selected,
    maxValue: dp[n][capacity],
    totalWeight: selected.reduce((s, it) => s + Math.round(it.weight), 0),
    dpTable: dpSample,
    dpTableFull: dp,
    timeMs: Math.max(Date.now() - start, 0.1),
    complexity: { time: 'O(n × W)', space: 'O(n × W)' },
    recurrence: 'T[i][w] = max(T[i-1][w],  val[i] + T[i-1][w - wt[i]])',
    description: 'Dynamic programming — fills n×W table bottom-up. Exact optimal solution.',
  };
}

// ─── FRACTIONAL KNAPSACK (Greedy) ────────────────────────────────────────────
function fractionalKnapsack(items, capacity) {
  const start = Date.now();
  const sorted = items
    .map(it => ({ ...it, ratio: it.value / Math.max(it.weight, 0.001) }))
    .sort((a, b) => b.ratio - a.ratio);

  let remaining = capacity, totalValue = 0;
  const selected = [], steps = [];

  for (const item of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(item.weight, remaining);
    const fraction = take / item.weight;
    const takenValue = fraction * item.value;
    totalValue += takenValue;
    remaining -= take;
    selected.push({ ...item, fraction: parseFloat(fraction.toFixed(2)), takenValue: parseFloat(takenValue.toFixed(2)) });
    steps.push({ item: item.title, ratio: item.ratio.toFixed(2), fraction, remaining });
  }

  return {
    algorithm: 'Fractional Knapsack (Greedy)',
    selected,
    maxValue: parseFloat(totalValue.toFixed(2)),
    totalWeight: capacity - remaining,
    steps,
    timeMs: Math.max(Date.now() - start, 0.1),
    complexity: { time: 'O(n log n)', space: 'O(n)' },
    description: 'Greedy — sorts by value/weight ratio. Allows fractions of items. NOT valid for 0/1 items.',
  };
}

// ─── SUBSET SUM (DP) ─────────────────────────────────────────────────────────
function subsetSum(nums, target) {
  const n = nums.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(target + 1).fill(false));
  for (let i = 0; i <= n; i++) dp[i][0] = true;

  const start = Date.now();
  for (let i = 1; i <= n; i++) {
    const v = Math.round(nums[i - 1]);
    for (let s = 0; s <= target; s++) {
      dp[i][s] = dp[i - 1][s];
      if (v <= s) dp[i][s] = dp[i][s] || dp[i - 1][s - v];
    }
  }

  // Backtrack one solution
  const subset = [];
  if (dp[n][target]) {
    let s = target;
    for (let i = n; i > 0 && s > 0; i--) {
      if (!dp[i - 1][s]) { subset.push(nums[i - 1]); s -= Math.round(nums[i - 1]); }
    }
  }

  return {
    algorithm: 'Subset Sum (DP)',
    possible: dp[n][target],
    subset,
    timeMs: Math.max(Date.now() - start, 0.1),
    complexity: { time: 'O(n × target)', space: 'O(n × target)' },
    description: 'Boolean DP — can we reach exactly this sum? Classic partition problem.',
  };
}

// ─── LCS — Longest Common Subsequence ────────────────────────────────────────
function lcs(arr1, arr2) {
  const n = arr1.length, m = arr2.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  const start = Date.now();

  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      if (arr1[i - 1] === arr2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }

  // Backtrack LCS
  const result = [];
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) { result.unshift(arr1[i - 1]); i--; j--; }
    else if (dp[i - 1][j] > dp[i][j - 1]) i--;
    else j--;
  }

  return {
    algorithm: 'Longest Common Subsequence',
    lcsLength: dp[n][m],
    lcsItems: result,
    dpTable: dp,
    timeMs: Math.max(Date.now() - start, 0.1),
    complexity: { time: 'O(n × m)', space: 'O(n × m)' },
    description: 'DP — finds longest common subsequence of two arrays. Used for playlist similarity.',
  };
}

module.exports = { knapsack01, fractionalKnapsack, subsetSum, lcs };
