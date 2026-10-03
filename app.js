/* =====================================================
   Challenge 2: Top K Popular Products
   popularity = rating × reviews
   A min-heap of size K keeps only the current best K,
   so the full list is never sorted.
   ===================================================== */

const $ = id => document.getElementById(id);

/* ---------- Show errors on the page (no console needed) ---------- */
function showError(msg) {
  const el = $("error");
  el.textContent = "⚠️ " + msg;
  el.classList.remove("hidden");
}
window.addEventListener("error", e => showError(`${e.message} (line ${e.lineno})`));

/* ---------- 1. Flatten nested data ---------- */
function flattenProducts(store) {
  const out = [];
  for (const category of store.categories) {
    for (const sub of category.subcategories) out.push(...sub.products);
  }
  return out;
}

/* ---------- 2. Min-heap ---------- */
class MinHeap {
  constructor(compare) {
    this.data = [];
    this.compare = compare;               // negative if a belongs above b
  }
  size() { return this.data.length; }
  peek() { return this.data[0]; }

  push(item) {
    this.data.push(item);
    this._siftUp(this.data.length - 1);
  }

  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length) {
      this.data[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  replaceRoot(item) {                     // drop the weakest, then fix the heap
    this.data[0] = item;
    this._siftDown(0);
  }

  _siftUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(this.data[i], this.data[parent]) >= 0) break;
      [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
      i = parent;
    }
  }

  _siftDown(i) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.compare(this.data[l], this.data[smallest]) < 0) smallest = l;
      if (r < n && this.compare(this.data[r], this.data[smallest]) < 0) smallest = r;
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }
}

/* ---------- 3. Top K ---------- */
const popularity = p => p.rating * p.reviews;

function findTopK(products, k) {
  const heap = new MinHeap((a, b) => a.score - b.score);   // weakest on top
  let updates = 0;

  for (const product of products) {
    const score = popularity(product);
    if (heap.size() < k) {
      heap.push({ product, score });
      updates++;
    } else if (score > heap.peek().score) {
      heap.replaceRoot({ product, score });
      updates++;
    }                                                      // otherwise: skip
  }

  const items = [];
  while (heap.size()) items.push(heap.pop());              // weakest -> strongest
  items.reverse();                                         // strongest first
  return { items, updates };
}

/* ---------- 4. Fake data generator (for big-data tests) ---------- */
function generateProducts(n, seed = 42) {
  let a = seed;
  const rand = () => {                                     // seeded random, same data every run
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const categoryOf = {
    Laptops: "Electronics", Mobiles: "Electronics", Accessories: "Electronics",
    Programming: "Books", DSA: "Books", "Gaming Accessories": "Gaming"
  };
  const subs = Object.keys(categoryOf);
  const out = new Array(n);

  for (let i = 0; i < n; i++) {
    const subcategory = subs[Math.floor(rand() * subs.length)];
    const price = Math.floor(500 + rand() * 120000);
    out[i] = {
      id: "g-" + i,
      name: "Product " + (i + 1),
      brand: "Brand " + (1 + Math.floor(rand() * 20)),
      price,
      originalPrice: Math.round(price * 1.15),
      rating: Math.round((3 + rand() * 2) * 10) / 10,      // 3.0 to 5.0
      reviews: Math.floor(rand() * 10000),                 // 0 to 9,999
      category: categoryOf[subcategory],
      subcategory
    };
  }
  return out;
}

/* ---------- 5. UI ---------- */
const formatINR = n => "₹" + Number(n).toLocaleString("en-IN");
const fmt = n => Number(n).toLocaleString("en-IN");
const esc = s => String(s ?? "").replace(/[&<>"']/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const ICONS = {
  Laptops: "💻", Mobiles: "📱", Accessories: "🎧",
  Programming: "📘", DSA: "🧠", "Gaming Accessories": "🎮"
};
const ACCENTS = {
  Laptops: "#38bdf8", Mobiles: "#a78bfa", Accessories: "#2dd4bf",
  Programming: "#fb923c", DSA: "#f472b6", "Gaming Accessories": "#f87171"
};

function startApp() {
  const baseProducts = flattenProducts(storeData);        // the 22 real products
  const cache = { 0: baseProducts };
  let current = baseProducts;

  const getK = () => parseInt($("kSelect").value, 10);

  function getDataset(size) {
    if (!cache[size]) cache[size] = generateProducts(size);
    return cache[size];
  }

  function render() {
    const k = getK();
    const t0 = performance.now();
    const { items, updates } = findTopK(current, k);
    const ms = performance.now() - t0;
    const best = items[0].score;

    $("stats").textContent =
      `Scanned ${fmt(current.length)} products in ${ms.toFixed(2)} ms · ` +
      `heap held only ${k} at a time · ${updates} heap updates`;

    $("popularGrid").innerHTML = items.map(({ product: p, score }, i) => {
      const rank = i + 1;
      const off = Math.round((1 - p.price / p.originalPrice) * 100);
      return `
        <article class="card r${rank}" style="--accent:${ACCENTS[p.subcategory] || "#38bdf8"};animation-delay:${i * 70}ms">
          <span class="bignum">${rank}</span>

          <div class="meta-row">
            <span class="rank-pill p${Math.min(rank, 4)}">#${rank}</span>
            <span class="cat">${esc(p.category)} › ${esc(p.subcategory)}</span>
          </div>

          <div class="card-top">
            <div class="icon-tile">${ICONS[p.subcategory] || "🛍️"}</div>
            <div>
              <h3>${esc(p.name)}</h3>
              <p class="brand">by ${esc(p.brand)}</p>
            </div>
          </div>

          <div class="rating-line">
            <span class="stars" style="--pct:${(p.rating / 5) * 100}%">★★★★★</span>
            <strong>${p.rating}</strong>
            <span class="reviews">· ${fmt(p.reviews)} reviews</span>
          </div>

          <div class="pop-meter">
            <div class="pop-label">
              <span>Popularity</span>
              <b>${fmt(Math.round(score))}</b>
            </div>
            <div class="pop-track">
              <div class="pop-fill" style="width:${(score / best) * 100}%"></div>
            </div>
          </div>

          <div class="foot">
            <span class="price">${formatINR(p.price)}</span>
            <span class="off">${off}% off</span>
          </div>
        </article>`;
    }).join("");
  }

  /* Top 3 / 5 / 10: no page reload */
  $("kSelect").addEventListener("change", render);

  /* Switch between the real data and generated big data */
  $("dataSelect").addEventListener("change", () => {
    const size = parseInt($("dataSelect").value, 10);
    $("stats").textContent = size ? `Generating ${fmt(size)} products…` : "";
    setTimeout(() => {                                     // let the message paint first
      current = size ? getDataset(size) : baseProducts;
      render();
    }, 30);
  });

  /* Heap vs full sort, timed side by side */
  $("compareBtn").addEventListener("click", () => {
    const k = getK();
    $("stats").textContent = "Running comparison…";
    setTimeout(() => {
      let t0 = performance.now();
      const heapRes = findTopK(current, k);
      const heapMs = performance.now() - t0;

      t0 = performance.now();
      const sorted = [...current].sort((a, b) => popularity(b) - popularity(a)).slice(0, k);
      const sortMs = performance.now() - t0;

      const same = heapRes.items.every((x, i) => x.score === popularity(sorted[i]));
      $("stats").textContent =
        `n = ${fmt(current.length)}, K = ${k} → min-heap: ${heapMs.toFixed(2)} ms · ` +
        `full sort: ${sortMs.toFixed(2)} ms · same top ${k}: ${same ? "✅ yes" : "❌ no"}`;
    }, 30);
  });

  render();                                                // Top 3 on page load
}

/* ---------- Start (guard against a missing data.js) ---------- */
if (typeof storeData === "undefined") {
  showError("data.js did not load. Save data.js in the same folder as index.html, with the full dataset pasted in.");
} else {
  startApp();
}