'use strict';

// ─── KMP ALGORITHM ───────────────────────────────────────────────────────────
function buildFailureFunction(pattern) {
  const m = pattern.length;
  const fail = new Array(m).fill(0);
  let j = 0;
  for (let i = 1; i < m; i++) {
    while (j > 0 && pattern[i] !== pattern[j]) j = fail[j - 1];
    if (pattern[i] === pattern[j]) j++;
    fail[i] = j;
  }
  return fail;
}

function kmpSearch(text, pattern) {
  const t = text.toLowerCase(), p = pattern.toLowerCase();
  const n = t.length, m = p.length;
  if (!m) return { algorithm: 'KMP', matches: [], steps: 0, timeMs: 0, comparisons: 0, failureFunction: [] };

  const fail = buildFailureFunction(p);
  const matches = [];
  let j = 0, comparisons = 0;
  const start = Date.now();

  for (let i = 0; i < n; i++) {
    comparisons++;
    while (j > 0 && t[i] !== p[j]) { j = fail[j - 1]; comparisons++; }
    if (t[i] === p[j]) j++;
    if (j === m) { matches.push(i - m + 1); j = fail[j - 1]; }
  }

  return {
    algorithm: 'KMP',
    matches,
    comparisons,
    steps: comparisons,
    timeMs: Math.max(Date.now() - start, 0.01),
    failureFunction: fail,
    complexity: { time: 'O(n + m)', space: 'O(m)' },
    description: 'Knuth-Morris-Pratt — precomputes failure function to skip redundant comparisons.',
  };
}

// ─── RABIN-KARP ──────────────────────────────────────────────────────────────
function rabinKarpSearch(text, pattern) {
  const t = text.toLowerCase(), p = pattern.toLowerCase();
  const n = t.length, m = p.length;
  if (!m) return { algorithm: 'Rabin-Karp', matches: [], steps: 0, timeMs: 0, comparisons: 0 };

  const BASE = 31, MOD = 1e9 + 9;
  const matches = [], hashTrace = [];
  let comparisons = 0;
  const start = Date.now();

  function charCode(c) { return c.charCodeAt(0) - 'a'.charCodeAt(0) + 1; }

  let patHash = 0, winHash = 0, power = 1;
  for (let i = 0; i < m; i++) {
    patHash = (patHash * BASE + charCode(p[i])) % MOD;
    if (i > 0) power = (power * BASE) % MOD;
    winHash = (winHash * BASE + charCode(t[i] < 'a' ? 'a' : t[i])) % MOD;
  }

  for (let i = 0; i <= n - m; i++) {
    comparisons++;
    hashTrace.push({ window: t.slice(i, i + m), winHash, patHash, match: winHash === patHash });
    if (winHash === patHash) {
      // Verify character by character (handle hash collision)
      if (t.slice(i, i + m) === p) matches.push(i);
    }
    if (i < n - m) {
      const outChar = t[i] < 'a' ? 0 : charCode(t[i]);
      const inChar  = t[i + m] < 'a' ? 0 : charCode(t[i + m]);
      winHash = ((winHash - outChar * power % MOD + MOD) * BASE + inChar) % MOD;
    }
  }

  return {
    algorithm: 'Rabin-Karp',
    matches,
    comparisons,
    steps: comparisons,
    hashTrace: hashTrace.slice(0, 10), // first 10 for display
    timeMs: Math.max(Date.now() - start, 0.01),
    complexity: { time: 'O(n + m) avg', space: 'O(1)' },
    description: 'Rolling hash — computes hash of each window in O(1). Average O(n+m), O(nm) worst case.',
  };
}

// ─── BOYER-MOORE (Bad Character Heuristic) ────────────────────────────────────
function boyerMooreSearch(text, pattern) {
  const t = text.toLowerCase(), p = pattern.toLowerCase();
  const n = t.length, m = p.length;
  if (!m) return { algorithm: 'Boyer-Moore', matches: [], steps: 0, timeMs: 0, comparisons: 0 };

  // Bad character table
  const badChar = {};
  for (let i = 0; i < m; i++) badChar[p[i]] = i;

  const matches = [];
  let s = 0, comparisons = 0;
  const start = Date.now();

  while (s <= n - m) {
    let j = m - 1;
    while (j >= 0 && p[j] === t[s + j]) { j--; comparisons++; }
    comparisons++;
    if (j < 0) {
      matches.push(s);
      s += (s + m < n) ? m - (badChar[t[s + m]] ?? -1) : 1;
    } else {
      const shift = j - (badChar[t[s + j]] ?? -1);
      s += Math.max(1, shift);
    }
  }

  return {
    algorithm: 'Boyer-Moore',
    matches,
    comparisons,
    steps: comparisons,
    timeMs: Math.max(Date.now() - start, 0.01),
    complexity: { time: 'O(n/m) best', space: 'O(alphabet)' },
    description: 'Right-to-left scan with bad character heuristic — skips sections of text. Very fast in practice.',
  };
}

// ─── NAIVE SEARCH (for comparison) ───────────────────────────────────────────
function naiveSearch(text, pattern) {
  const t = text.toLowerCase(), p = pattern.toLowerCase();
  const n = t.length, m = p.length;
  const matches = [];
  let comparisons = 0;
  const start = Date.now();

  for (let i = 0; i <= n - m; i++) {
    let j = 0;
    while (j < m) { comparisons++; if (t[i + j] !== p[j]) break; j++; }
    if (j === m) matches.push(i);
  }

  return {
    algorithm: 'Naive Search',
    matches,
    comparisons,
    steps: comparisons,
    timeMs: Math.max(Date.now() - start, 0.01),
    complexity: { time: 'O(n × m)', space: 'O(1)' },
    description: 'Brute force — checks every position. Simple but inefficient.',
  };
}

// ─── RUN ALL PATTERN ALGORITHMS ──────────────────────────────────────────────
function runPatternSearch(text, pattern, algorithms = ['kmp', 'rabin', 'boyer', 'naive']) {
  const results = {};
  const map = { kmp: kmpSearch, rabin: rabinKarpSearch, boyer: boyerMooreSearch, naive: naiveSearch };
  for (const a of algorithms) {
    if (map[a]) results[a] = map[a](text, pattern);
  }
  return results;
}

module.exports = { kmpSearch, rabinKarpSearch, boyerMooreSearch, naiveSearch, buildFailureFunction, runPatternSearch };
