/***********************
 * TIÊN PHONG - script.js (CLEAN PRO)
 * - Load data from Google Sheet (TSV/CSV)
 * - Auto set beauty from digits (no beauty column needed)
 * - Filters / Sort / Hide sold
 * - Detail modal + share link (#plate=...)
 * - Zalo one tap (prefill)
 * - Back to top
 ************************/

/* ====== CẤU HÌNH ====== */
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1jui0UXcZamr3LF2nKL4M0dsLyBS9bdA17gCHpPfqGck/edit?usp=drivesdk
1vROIThG1QbSzDINvJapE6L08TEuSlzRpapJjON7RiMjatiorkdfNdxp
VoB3psWh_mpgfTwDiOfqcC-s/pub?output=tsv1vQYZuewLsaj81zpC4qUTcDxLRwHhU5kf8739QCbaDP88m0PWsyWM1Dc8M0zhRZBSXTnWKOztPeFLk0t/pub?output=tsv";

const ZALO_PHONE = "0396298999";
const ZALO_BASE  = `https://zalo.me/${ZALO_PHONE}`;
const HOTLINE    = "0396298999";

/* ====== DOM HELPERS ====== */
const $ = (id) => document.getElementById(id);

function normalize(s){
  return (s || "")
    .toString().trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function digitsOnly(plate){
  return (plate || "").replace(/\D/g, "");
}

/* ====== REGION RULE ====== */
function detectRegion(plate){
  // Theo yêu cầu: 98 & 99 (cả ô tô + xe máy) => Bắc Ninh
  if (plate.startsWith("98") || plate.startsWith("99")) return "Bắc Ninh";
  if (plate.startsWith("30") || plate.startsWith("29")) return "Hà Nội";
  if (plate.startsWith("50") || plate.startsWith("51")) return "HCM";
  return "Khác";
}

/* ====== BEAUTY AUTO ====== */
function beautyFromDigits(d){
  if (/(\d)\1{4}/.test(d)) return "Ngũ quý";
  if (/(\d)\1{3}/.test(d)) return "Tứ quý";
  if (/(\d)\1{2}/.test(d)) return "Tam hoa";
  if (/(01234|12345|23456|34567|45678|56789)/.test(d)) return "Sảnh tiến";
  if (/(68|86)/.test(d)) return "Lộc phát";
  if (/(39|79)/.test(d)) return "Thần tài";
  if (/(\d)(\d)\2\1/.test(d)) return "Gánh";
  return "Độc lạ";
}

function beautyDesc(beauty){
  const map = {
    "Ngũ quý": "5 số giống nhau (độ hiếm cao).",
    "Tứ quý": "4 số giống nhau, rất dễ nhớ.",
    "Tam hoa": "3 số giống nhau, đẹp và cân đối.",
    "Sảnh tiến": "Dãy số tiến (12345, 56789…).",
    "Lộc phát": "Có 68/86 (lộc phát).",
    "Thần tài": "Có 39/79 (thần tài).",
    "Gánh": "Dạng đối xứng ABBA (cân đối).",
    "Độc lạ": "Dạng đẹp theo gu riêng, dễ tạo dấu ấn."
  };
  return map[beauty] || "Dạng đẹp theo gu riêng.";
}

function priceByBeauty(beauty){
  switch (beauty) {
    case "Ngũ quý": return 650;
    case "Tứ quý":  return 420;
    case "Tam hoa": return 260;
    case "Sảnh tiến": return 230;
    case "Thần tài": return 190;
    case "Lộc phát": return 180;
    case "Gánh": return 160;
    default: return 140;
  }
}

// ưu tiên giá sheet, thiếu thì fallback theo beauty
function getPriceMillion(p){
  const sheetPrice = Number(p.priceMillion || 0);
  if (sheetPrice > 0) return sheetPrice;
  return priceByBeauty(p.beauty);
}

/* ====== GOOGLE SHEET LOAD ====== */
async function fetchText(url){
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Không tải được dữ liệu Google Sheet");
  return await res.text();
}

// Tự nhận biết TSV hoặc CSV
function parseTable(text){
  const raw = (text || "").trim();
  if (!raw) return [];

  const lines = raw.split(/\r?\n/);
  const delimiter = lines[0].includes("\t") ? "\t" : ",";

  const headers = lines[0].split(delimiter).map(s => s.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++){
    const cols = lines[i].split(delimiter).map(s => (s ?? "").trim());
    const obj = {};
    headers.forEach((h, idx) => obj[h] = cols[idx] ?? "");
    rows.push(obj);
  }

  return rows;
}

function normalizePlate(plate){
  // chuẩn hoá đơn giản: bỏ khoảng trắng, viết hoa, thêm dấu - nếu thiếu
  let s = (plate || "").trim().toUpperCase().replace(/\s+/g, "");
  // dạng 30M933.89 => 30M-933.89
  const m = s.match(/^([0-9]{2}[A-Z]{1,3})(\d{3}\.\d{2})$/);
  if (m) s = `${m[1]}-${m[2]}`;
  return s;
}

function isPlate(s){
  return /^[0-9]{2}[A-Z]{1,3}-\d{3}\.\d{2}$/.test(s);
}

async function loadFromSheet(){
  const text = await fetchText(SHEET_URL);
  const rows = parseTable(text);

  // map sheet rows => items
  const items = rows
    .map(r => {
      const plate = normalizePlate(r.plate);
      if (!plate || !isPlate(plate)) return null;

      const digits = digitsOnly(plate);
      const beauty = beautyFromDigits(digits);

      const region = (r.region && r.region.trim()) ? r.region.trim() : detectRegion(plate);
      const vehicle = (r.vehicle && r.vehicle.trim()) ? r.vehicle.trim() : "Ô tô";

      const priceMillion = Number(r.priceMillion || 0);
      const sold = String(r.sold || "0").trim() === "1";

      return { plate, digits, beauty, region, vehicle, priceMillion, sold };
    })
    .filter(Boolean);

  // loại trùng theo plate (plate cuối cùng sẽ đè)
  const map = new Map();
  items.forEach(p => map.set(p.plate, p));
  return Array.from(map.values());
}

/* ====== ZALO ONE TAP ====== */
function setZaloOneTap(text){
  const a = $("zaloOneTap");
  if (!a) return;
  a.href = `${ZALO_BASE}?text=${encodeURIComponent(text)}`;
}

// khi chạm vào card: cập nhật “zalo 1 chạm” theo biển đó
function updateOneTapForPlate(p){
  const price = getPriceMillion(p);
  const priceText = price > 0 ? `${price} triệu` : "Liên hệ";
  const msg = `Mình quan tâm biển ${p.plate} (${priceText}). Cho mình xin tư vấn giúp ạ.`;
  setZaloOneTap(msg);
}

/* ====== MODAL ====== */
function openModal(p){
  $("mPlate").textContent = p.plate;
  $("mMeta").textContent = `${p.region} • ${p.vehicle} • ${p.beauty}`;

  const price = getPriceMillion(p);
  $("mPrice").textContent = price > 0 ? `${price} triệu` : "Liên hệ";

  $("mDesc").textContent = `${beautyDesc(p.beauty)} ${p.sold ? "Biển này đã bán." : "Biển này đang còn hàng, bạn có thể liên hệ để giữ chỗ."}`;

  const badges = [];
  badges.push(p.sold
    ? `<span class="badge badge--sold">ĐÃ BÁN</span>`
    : `<span class="badge badge--available">CÒN HÀNG</span>`);
  badges.push(`<span class="badge badge--available">${p.beauty}</span>`);
  $("mBadges").innerHTML = badges.join("");

  // nút chat zalo trong modal
  const msg = `Mình quan tâm biển ${p.plate}. Cho mình xin giá & tư vấn giúp ạ.`;
  $("mZalo").href = `${ZALO_BASE}?text=${encodeURIComponent(msg)}`;

  // hash share
  const hash = `#plate=${encodeURIComponent(p.plate)}`;
  history.replaceState(null, "", hash);

  $("mCopy").onclick = async () => {
    const url = location.href;
    try{
      await navigator.clipboard.writeText(url);
      alert("Đã copy link: " + url);
    }catch{
      alert("Copy không được. Link: " + url);
    }
  };

  $("modal").classList.remove("hidden");

  // cập nhật one tap theo biển đang xem
  updateOneTapForPlate(p);
}

function closeModal(){
  $("modal").classList.add("hidden");
  if (location.hash.startsWith("#plate=")) history.replaceState(null, "", "#");
}

/* ====== DATA + RENDER ====== */
let DATA = [];

function setHint(text){ const el = $("hint"); if (el) el.textContent = text || "Đang hiển thị tất cả."; }
function setCount(n){ const el = $("count"); if (el) el.textContent = String(n); }

function render(list){
  const wrap = $("list");
  const empty = $("empty");
  if (!wrap) return;

  wrap.innerHTML = "";
  setCount(list.length);

  if (!list.length){
    empty && empty.classList.remove("hidden");
    return;
  }
  empty && empty.classList.add("hidden");

  list.forEach(p => {
    const card = document.createElement("div");
    card.className = "item" + (p.sold ? " sold" : "");

    const statusBadge = p.sold
      ? `<span class="badge badge--sold">ĐÃ BÁN</span>`
      : `<span class="badge badge--available">CÒN HÀNG</span>`;

    const price = getPriceMillion(p);
    const priceText = price > 0 ? `${price} triệu` : "Liên hệ";

    card.innerHTML = `
      <div class="item__top">
        <div>
          <div class="plate">${p.plate}</div>
          <div class="tags">
            <span>${p.region}</span><span>•</span>
            <span>${p.vehicle}</span><span>•</span>
            <span>${p.beauty}</span>
          </div>
        </div>
        ${statusBadge}
      </div>

      <div class="item__bottom">
        <div class="price">${priceText}</div>
        <div class="actions">
          <button class="btn btn--ghost" data-view="${p.plate}">Xem chi tiết</button>
          ${
            p.sold
              ? `<span class="muted">Đã bán</span>`
              : `<a class="btn btn--primary" href="${ZALO_BASE}?text=${encodeURIComponent(`Mình quan tâm biển ${p.plate} (${priceText}). Cho mình xin tư vấn giúp ạ.`)}" target="_blank">Chat Zalo</a>`
          }
        </div>
      </div>
    `;

    // chạm card => cập nhật zalo 1 chạm
    card.addEventListener("click", () => updateOneTapForPlate(p));

    wrap.appendChild(card);
  });

  wrap.querySelectorAll("button[data-view]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // không trigger card click
      const plate = btn.dataset.view;
      const p = DATA.find(x => x.plate === plate);
      if (p) openModal(p);
    });
  });
}

/* ====== FILTER/SORT ====== */
function apply(){
  const q = normalize($("q")?.value);
  const region = $("region")?.value || "";
  const vehicle = $("vehicle")?.value || "";
  const beauty = $("beauty")?.value || "";
  const status = $("status")?.value || "";
  const hideSold = $("hideSold")?.checked ?? true;
  const sort = $("sort")?.value || "";

  let out = DATA.filter(p => {
    const hay = normalize(`${p.plate} ${p.region} ${p.vehicle} ${p.beauty} ${p.digits}`);
    if (q && !hay.includes(q)) return false;
    if (region && p.region !== region) return false;
    if (vehicle && p.vehicle !== vehicle) return false;
    if (beauty && p.beauty !== beauty) return false;

    if (hideSold && p.sold) return false;
    if (status === "sold" && !p.sold) return false;
    if (status === "available" && p.sold) return false;

    return true;
  });

  if (sort === "plateAsc") out.sort((a,b)=>a.plate.localeCompare(b.plate));
  if (sort === "plateDesc") out.sort((a,b)=>b.plate.localeCompare(a.plate));
  if (sort === "priceAsc") out.sort((a,b)=>getPriceMillion(a) - getPriceMillion(b));
  if (sort === "priceDesc") out.sort((a,b)=>getPriceMillion(b) - getPriceMillion(a));

  const applied = [];
  const qRaw = $("q")?.value?.trim() || "";
  if (qRaw) applied.push(`Từ khóa: "${qRaw}"`);
  if (region) applied.push(`Khu vực: ${region}`);
  if (vehicle) applied.push(`Loại: ${vehicle}`);
  if (beauty) applied.push(`Dạng: ${beauty}`);
  if (status) applied.push(`Trạng thái: ${status === "sold" ? "Đã bán" : "Còn hàng"}`);
  if (hideSold) applied.push("Đang ẩn đã bán");

  setHint(applied.length ? applied.join(" • ") : "Đang hiển thị tất cả.");
  render(out);
}

/* ====== EVENTS + INIT ====== */
function bindEvents(){
  // link liên hệ
  const zaloFab = $("zaloFab");   if (zaloFab) zaloFab.href = ZALO_BASE;
  const zaloBtnTop = $("zaloBtnTop"); if (zaloBtnTop) zaloBtnTop.href = ZALO_BASE;
  const callBtn = $("callBtn");   if (callBtn) callBtn.href = `tel:${HOTLINE}`;
  const callFab = $("callFab");   if (callFab) callFab.href = `tel:${HOTLINE}`;

  // default one tap text
  setZaloOneTap("Mình muốn tư vấn biển số đẹp. Nhờ bạn hỗ trợ giúp ạ.");

  $("btnSearch")?.addEventListener("click", apply);
  $("btnReset")?.addEventListener("click", () => {
    if ($("q")) $("q").value = "";
    if ($("region")) $("region").value = "";
    if ($("vehicle")) $("vehicle").value = "";
    if ($("beauty")) $("beauty").value = "";
    if ($("status")) $("status").value = "";
    if ($("hideSold")) $("hideSold").checked = true;
    if ($("sort")) $("sort").value = "";
    setHint("Đang hiển thị tất cả.");
    render(DATA);
  });

  ["region","vehicle","beauty","status","sort","hideSold"].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("change", apply);
  });

  $("q")?.addEventListener("input", () => {
    clearTimeout(window.__tp_t);
    window.__tp_t = setTimeout(apply, 200);
  });

  // modal close
  $("modalClose")?.addEventListener("click", closeModal);
  $("modalX")?.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // back to top (safe)
  const backToTop = $("backToTop");
  if (backToTop) {
    window.addEventListener("scroll", () => {
      backToTop.style.display = window.scrollY > 300 ? "flex" : "none";
    });
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
}

async function boot(){
  try{
    DATA = await loadFromSheet();
  }catch(err){
    console.error(err);
    DATA = [];
  }

  bindEvents();
  setHint("Đang hiển thị tất cả.");
  render(DATA);

  // mở modal từ hash #plate=
  if (location.hash.startsWith("#plate=")) {
    const plate = decodeURIComponent(location.hash.replace("#plate=",""));
    const p = DATA.find(x => x.plate === plate);
    if (p) openModal(p);
  }
}

boot();
// ===== PIN TOPBAR =====
const topbar = document.querySelector(".topbar");

function pinTopbar(){
  if(!topbar) return;
  if(window.scrollY > 10){
    topbar.classList.add("is-scrolled");
  }else{
    topbar.classList.remove("is-scrolled");
  }
}

window.addEventListener("scroll", pinTopbar);
pinTopbar();

