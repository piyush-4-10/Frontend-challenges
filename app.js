/* ---------- Data: flatten + sort once ---------- */
function flattenProducts(store) {
  const out = [];
  for (const category of store.categories) {
    for (const sub of category.subcategories) out.push(...sub.products);
  }
  return out;
}

const sortedProducts = flattenProducts(storeData).sort((a, b) => a.price - b.price);

/* ---------- Binary search ---------- */
function lowerBound(arr, value) {          // first index with price >= value
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].price < value) lo = mid + 1; else hi = mid;
  }
  return lo;
}

function upperBound(arr, value) {          // first index with price > value
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].price <= value) lo = mid + 1; else hi = mid;
  }
  return lo;
}

function findClosest(arr, target, k = 3) {
  const result = [];
  let right = lowerBound(arr, target);
  let left = right - 1;
  while (result.length < k && (left >= 0 || right < arr.length)) {
    const l = left >= 0 ? target - arr[left].price : Infinity;
    const r = right < arr.length ? arr[right].price - target : Infinity;
    if (l <= r) result.push(arr[left--]); else result.push(arr[right++]);
  }
  return result.sort((a, b) => a.price - b.price);
}

function findInRange(arr, min, max) {
  return arr.slice(lowerBound(arr, min), upperBound(arr, max));
}

/* ---------- UI helpers ---------- */
const $ = id => document.getElementById(id);
const formatINR = n => "₹" + Number(n).toLocaleString("en-IN");
const esc = s => String(s ?? "").replace(/[&<>"']/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const discount = p => Math.round((1 - p.price / p.originalPrice) * 100);

function renderProducts(products, title) {
  $("message").textContent = "";
  if (!products.length) {
    $("resultHead").classList.add("hidden");
    $("results").innerHTML = "";
    $("message").textContent = "No products found for that search.";
    return;
  }
  $("resultTitle").textContent = title;
  $("resultCount").textContent = products.length + (products.length === 1 ? " product" : " products");
  $("resultHead").classList.remove("hidden");

  $("results").innerHTML = products.map(p => `
    <article class="card">
      <span class="tag">${esc(p.subcategory)}</span>
      <h3>${esc(p.name)}</h3>
      <div class="brand">by ${esc(p.brand)}</div>
      <div class="price-row">
        <span class="price">${formatINR(p.price)}</span>
        <span class="old">${formatINR(p.originalPrice)}</span>
        <span class="off">${discount(p)}% off</span>
      </div>
      <div class="rating">⭐ ${p.rating} · ${p.reviews.toLocaleString("en-IN")} reviews</div>
      <div class="stock ${p.stock <= 5 ? "low" : "ok"}">
        ${p.stock <= 5 ? "Only " + p.stock + " left!" : p.stock + " in stock"}
      </div>
      <button data-id="${esc(p.id)}">View Product</button>
    </article>`).join("");
}

/* ---------- Actions ---------- */
function runSearch() {
  const target = parseFloat($("targetPrice").value);
  if (Number.isNaN(target) || target < 0) {
    $("message").textContent = "Please enter a valid price.";
    return;
  }
  renderProducts(findClosest(sortedProducts, target, 3),
                 "Closest to " + formatINR(target));
}

function runRange() {
  const min = parseFloat($("minPrice").value);
  const max = parseFloat($("maxPrice").value);
  if (Number.isNaN(min) || Number.isNaN(max) || min > max) {
    $("message").textContent = "Enter a valid range (min must not exceed max).";
    return;
  }
  renderProducts(findInRange(sortedProducts, min, max),
                 formatINR(min) + " – " + formatINR(max));
}

function openModal(p) {
  const specs = Object.entries(p.specifications)
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("");
  $("modalBody").innerHTML = `
    <span class="tag">${esc(p.category)} › ${esc(p.subcategory)}</span>
    <h3>${esc(p.name)}</h3>
    <div class="brand">by ${esc(p.brand)}</div>
    <div class="price-row" style="margin:.6rem 0">
      <span class="price">${formatINR(p.price)}</span>
      <span class="old">${formatINR(p.originalPrice)}</span>
      <span class="off">${discount(p)}% off</span>
    </div>
    <div class="rating">⭐ ${p.rating} · ${p.reviews.toLocaleString("en-IN")} reviews · ${p.stock} in stock</div>
    <table class="specs">${specs}</table>`;
  $("modal").classList.remove("hidden");
}
const closeModal = () => $("modal").classList.add("hidden");

/* ---------- Events ---------- */
$("searchBtn").addEventListener("click", runSearch);
$("rangeBtn").addEventListener("click", runRange);
$("targetPrice").addEventListener("keydown", e => { if (e.key === "Enter") runSearch(); });
$("maxPrice").addEventListener("keydown", e => { if (e.key === "Enter") runRange(); });

$("results").addEventListener("click", e => {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;
  openModal(sortedProducts.find(p => p.id === btn.dataset.id));
});
$("modalClose").addEventListener("click", closeModal);
$("modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });