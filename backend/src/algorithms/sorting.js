'use strict';

// ─── MERGE SORT ─────────────────────────────────────────────────────────────
function mergeSort(inputArr) {
  let comparisons = 0, swaps = 0;
  const arr = [...inputArr];

  function merge(a, l, m, r) {
    const L = a.slice(l, m + 1), R = a.slice(m + 1, r + 1);
    let i = 0, j = 0, k = l;
    while (i < L.length && j < R.length) {
      comparisons++;
      if (L[i] <= R[j]) { a[k++] = L[i++]; }
      else { a[k++] = R[j++]; swaps++; }
    }
    while (i < L.length) a[k++] = L[i++];
    while (j < R.length) a[k++] = R[j++];
  }

  function sort(a, l, r) {
    if (l >= r) return;
    const m = Math.floor((l + r) / 2);
    sort(a, l, m); sort(a, m + 1, r); merge(a, l, m, r);
  }

  const start = Date.now();
  sort(arr, 0, arr.length - 1);
  const timeMs = Math.max(Date.now() - start, 0.1);

  return {
    name: 'Merge Sort', sorted: arr, comparisons, swaps, timeMs,
    stable: true,
    bestCase: 'O(n log n)', avgCase: 'O(n log n)', worstCase: 'O(n log n)',
    spaceComplexity: 'O(n)',
    description: 'Divide & Conquer — splits array recursively, merges in sorted order.',
  };
}

// ─── QUICK SORT ──────────────────────────────────────────────────────────────
function quickSort(inputArr) {
  let comparisons = 0, swaps = 0;
  const arr = [...inputArr];

  function partition(a, lo, hi) {
    const pivot = a[hi];
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      comparisons++;
      if (a[j] <= pivot) {
        i++;
        [a[i], a[j]] = [a[j], a[i]]; swaps++;
      }
    }
    [a[i + 1], a[hi]] = [a[hi], a[i + 1]]; swaps++;
    return i + 1;
  }

  function sort(a, lo, hi) {
    if (lo >= hi) return;
    const p = partition(a, lo, hi);
    sort(a, lo, p - 1); sort(a, p + 1, hi);
  }

  const start = Date.now();
  sort(arr, 0, arr.length - 1);
  const timeMs = Math.max(Date.now() - start, 0.1);

  return {
    name: 'Quick Sort', sorted: arr, comparisons, swaps, timeMs,
    stable: false,
    bestCase: 'O(n log n)', avgCase: 'O(n log n)', worstCase: 'O(n²)',
    spaceComplexity: 'O(log n)',
    description: 'Partition-based — pivot divides array. Fast in practice, worst case O(n²).',
  };
}

// ─── HEAP SORT ───────────────────────────────────────────────────────────────
function heapSort(inputArr) {
  let comparisons = 0, swaps = 0;
  const arr = [...inputArr];
  const n = arr.length;

  function heapify(a, n, i) {
    let largest = i, l = 2 * i + 1, r = 2 * i + 2;
    if (l < n) { comparisons++; if (a[l] > a[largest]) largest = l; }
    if (r < n) { comparisons++; if (a[r] > a[largest]) largest = r; }
    if (largest !== i) {
      [a[i], a[largest]] = [a[largest], a[i]]; swaps++;
      heapify(a, n, largest);
    }
  }

  const start = Date.now();
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(arr, n, i);
  for (let i = n - 1; i > 0; i--) {
    [arr[0], arr[i]] = [arr[i], arr[0]]; swaps++;
    heapify(arr, i, 0);
  }
  const timeMs = Math.max(Date.now() - start, 0.1);

  return {
    name: 'Heap Sort', sorted: arr, comparisons, swaps, timeMs,
    stable: false,
    bestCase: 'O(n log n)', avgCase: 'O(n log n)', worstCase: 'O(n log n)',
    spaceComplexity: 'O(1)',
    description: 'Max-Heap based — builds heap then extracts max repeatedly. In-place.',
  };
}

// ─── BUBBLE SORT ─────────────────────────────────────────────────────────────
function bubbleSort(inputArr) {
  let comparisons = 0, swaps = 0;
  const arr = [...inputArr];

  const start = Date.now();
  for (let i = 0; i < arr.length - 1; i++) {
    let swapped = false;
    for (let j = 0; j < arr.length - i - 1; j++) {
      comparisons++;
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]; swaps++; swapped = true;
      }
    }
    if (!swapped) break;
  }
  const timeMs = Math.max(Date.now() - start, 0.1);

  return {
    name: 'Bubble Sort', sorted: arr, comparisons, swaps, timeMs,
    stable: true,
    bestCase: 'O(n)', avgCase: 'O(n²)', worstCase: 'O(n²)',
    spaceComplexity: 'O(1)',
    description: 'Adjacent swap — simple but slow. Best case O(n) with early termination.',
  };
}

// ─── COUNTING SORT (integer-safe, for scores 0–10) ───────────────────────────
function countingSort(inputArr) {
  let comparisons = 0;
  // Scale floats to integers (multiply by 10 for 1 decimal precision)
  const scaled = inputArr.map(v => Math.round(v * 10));
  const min = Math.min(...scaled), max = Math.max(...scaled);
  const count = new Array(max - min + 1).fill(0);

  const start = Date.now();
  scaled.forEach(v => count[v - min]++);
  const sorted = [];
  count.forEach((c, i) => { for (let k = 0; k < c; k++) { sorted.push((i + min) / 10); comparisons++; } });
  const timeMs = Math.max(Date.now() - start, 0.1);

  return {
    name: 'Counting Sort', sorted, comparisons, swaps: 0, timeMs,
    stable: true,
    bestCase: 'O(n+k)', avgCase: 'O(n+k)', worstCase: 'O(n+k)',
    spaceComplexity: 'O(k)',
    description: 'Non-comparison sort — counts occurrences. O(n+k) where k = value range.',
  };
}

// ─── RADIX SORT (digit-by-digit, works on positive integers) ─────────────────
function radixSort(inputArr) {
  let comparisons = 0, passes = 0;
  // scale to integers
  const scale = 10;
  let arr = inputArr.map(v => Math.round(v * scale));

  function countingSortByDigit(a, exp) {
    const n = a.length, output = new Array(n), count = new Array(10).fill(0);
    for (let i = 0; i < n; i++) { count[Math.floor(a[i] / exp) % 10]++; comparisons++; }
    for (let i = 1; i < 10; i++) count[i] += count[i - 1];
    for (let i = n - 1; i >= 0; i--) {
      const d = Math.floor(a[i] / exp) % 10;
      output[count[d] - 1] = a[i]; count[d]--;
    }
    return output;
  }

  const start = Date.now();
  const max = Math.max(...arr);
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    arr = countingSortByDigit(arr, exp); passes++;
  }
  const sorted = arr.map(v => v / scale);
  const timeMs = Math.max(Date.now() - start, 0.1);

  return {
    name: 'Radix Sort', sorted, comparisons, swaps: 0, timeMs,
    stable: true,
    bestCase: 'O(nk)', avgCase: 'O(nk)', worstCase: 'O(nk)',
    spaceComplexity: 'O(n+k)',
    description: `Non-comparison sort — processes digit by digit. ${passes} passes made.`,
  };
}

// ─── RUN ALL / SELECTED ──────────────────────────────────────────────────────
const ALGO_MAP = {
  merge:    mergeSort,
  quick:    quickSort,
  heap:     heapSort,
  bubble:   bubbleSort,
  counting: countingSort,
  radix:    radixSort,
};

function runAlgorithms(data, algorithms = ['merge', 'quick', 'heap']) {
  const results = {};
  for (const name of algorithms) {
    if (!ALGO_MAP[name]) continue;
    try { results[name] = ALGO_MAP[name](data); }
    catch (e) { results[name] = { error: e.message }; }
  }
  return results;
}

// ─── GENERATE SAMPLE DATA ────────────────────────────────────────────────────
function generateSampleData(type = 'random', size = 50) {
  switch (type) {
    case 'random':   return Array.from({ length: size }, () => parseFloat((Math.random() * 10).toFixed(1)));
    case 'sorted':   return Array.from({ length: size }, (_, i) => parseFloat((i * 10 / size).toFixed(1)));
    case 'reverse':  return Array.from({ length: size }, (_, i) => parseFloat(((size - i) * 10 / size).toFixed(1)));
    case 'nearly':   {
      const a = Array.from({ length: size }, (_, i) => parseFloat((i * 10 / size).toFixed(1)));
      for (let k = 0; k < Math.floor(size * 0.1); k++) {
        const i = Math.floor(Math.random() * size), j = Math.floor(Math.random() * size);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    default: return Array.from({ length: size }, () => parseFloat((Math.random() * 10).toFixed(1)));
  }
}

module.exports = { mergeSort, quickSort, heapSort, bubbleSort, countingSort, radixSort, runAlgorithms, generateSampleData };
