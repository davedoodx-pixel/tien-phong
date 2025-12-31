/***********************
 * TIÊN PHONG - script.js (PRO)
 * - Search/Filter/Sort
 * - 98 & 99 (oto + xe máy) => Bắc Ninh
 * - Status: sold/available + hide sold
 * - Detail modal + share link (#plate=...)
 * - Zalo prefilled message
 ************************/

/* ====== CẤU HÌNH LIÊN HỆ ====== */
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQYZuewLsaj81zpC4qUTcDxLRwHhU5kf8739QCbaDP88m0PWsyWM1Dc8M0zhRZBSXTnWKOztPeFLk0t/pub?output=tsv";
async function fetchCSV(url){
  const res = await fetch(url, { cache: "no-store" });
  return await res.text();
}

function parseCSV(csv){
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines[0].split(",");

  return lines.slice(1).map(line => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, i) => row[h.trim()] = (cols[i] || "").trim());

    row.priceMillion = Number(row.priceMillion || 0);
    row.sold = row.sold === "1";

    return row;
  }).filter(r => r.plate);
}

const ZALO_URL = "https://zalo.me/0396298999"; // <-- đổi số
const HOTLINE  = "0396298999";                // <-- đổi số

/* ====== HELPERS ====== */
const $ = (id) => document.getElementById(id);

function normalize(s){
  return (s || "")
    .toString().trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function digitsOnly(plate){
  return (plate || "").replace(/\D/g, "");
}

function normalizePlateLine(line){
  let s = (line || "").trim();
  if (!s) return "";
  const up = s.toUpperCase();
  if (up === "HÀ NỘI" || up === "HA NOI" || up === "HCM" || up === "XE MÁY" || up === "XE MAY") return "";
  s = s.replace(/\s+/g, " ");

  // "30M 933.89" => "30M-933.89"
  const m = s.match(/^([0-9]{2}[A-Z]{1,3})\s+(\d{3}\.\d{2})$/);
  if (m) s = `${m[1]}-${m[2]}`;

  // "30M933.89" => "30M-933.89"
  const m2 = s.match(/^([0-9]{2}[A-Z]{1,3})(\d{3}\.\d{2})$/);
  if (m2) s = `${m2[1]}-${m2[2]}`;

  return s.toUpperCase();
}

function isPlate(s){
  return /^[0-9]{2}[A-Z]{1,3}-\d{3}\.\d{2}$/.test(s);
}

function parsePlates(multiline){
  return (multiline || "")
    .split("\n")
    .map(normalizePlateLine)
    .filter(Boolean)
    .filter(isPlate);
}

function detectRegion(plate){
  // Theo yêu cầu: 98 & 99 (cả ô tô + xe máy) => Bắc Ninh
  if (plate.startsWith("98") || plate.startsWith("99")) return "Bắc Ninh";
  if (plate.startsWith("30") || plate.startsWith("29")) return "Hà Nội";
  if (plate.startsWith("50") || plate.startsWith("51")) return "HCM";
  return "Khác";
}

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
// Ưu tiên giá trong Google Sheet, nếu không có thì dùng giá theo beauty
function getPriceMillion(p){
  const sheetPrice = Number(p.priceMillion || 0);
  if (sheetPrice > 0) return sheetPrice;

  if (!p.beauty) return 0; // không có beauty -> 0 => "Liên hệ"
  return priceByBeauty(p.beauty);
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

function buildZaloLink(plate){
  const msg = `Mình quan tâm biển ${plate}. Cho mình xin giá & tư vấn giúp ạ.`;
  // Với zalo.me thường không có param chuẩn chung, nên dùng cách an toàn: mở Zalo, người dùng paste nhanh.
  // Mình vẫn tạo text để copy khi cần (modal có link + copy).
  // Nếu bạn dùng OA/Link hỗ trợ text param, mình sẽ tối ưu theo link bạn dùng.
  return ZALO_URL + ""; 
}
let DATA = [];

/* ====== ĐÁNH DẤU ĐÃ BÁN Ở ĐÂY ======
   Chỉ cần thêm biển vào danh sách SOLD_SET là nó tự hiện "ĐÃ BÁN"
*/
const SOLD_SET = new Set([
  // ví dụ:
  // "98A-999.56",
  // "99AA-888.79",
]);

function buildData(){
  const map = new Map();
  RAW_GROUPS.forEach(g => {
    const plates = parsePlates(g.plates);
    plates.forEach(plate => {
      if (map.has(plate)) return;
      const digits = digitsOnly(plate);
      const beauty = beautyFromDigits(digits);
const price = getPriceMillion(p);
const priceText = price > 0 ? `${price} triệu` : "Liên hệ";

      const region = detectRegion(plate);
      const sold = SOLD_SET.has(plate);

      map.set(plate, {
        plate, vehicle: g.vehicle, region,
        beauty, digits, priceMillion,
        sold,
      });
    });
  });
  return Array.from(map.values());
}

const FALLBACK_DATA = buildData();let DATA = [...FALLBACK_DATA];

/* ====== MODAL DETAIL ====== */
function openModal(p){
  $("mPlate").textContent = p.plate;
  $("mMeta").textContent = `${p.region} • ${p.vehicle} • ${p.beauty}`;
  $("mPrice").textContent = `${p.priceMillion} triệu`;
  $("mDesc").textContent  = `${beautyDesc(p.beauty)} ${p.sold ? "Biển này đã bán." : "Biển này đang còn hàng, bạn có thể liên hệ để giữ chỗ."}`;

  const badges = [];
  badges.push(p.sold
    ? `<span class="badge badge--sold">ĐÃ BÁN</span>`
    : `<span class="badge badge--available">CÒN HÀNG</span>`);
  badges.push(`<span class="badge badge--available">${p.beauty}</span>`);
  $("mBadges").innerHTML = badges.join("");

  // Zalo prefill: tạo 1 nút và copy text nhanh bằng cách copy link + nội dung trên modal
  $("mZalo").href = buildZaloLink(p.plate);

  // link share dùng hash
  const hash = `#plate=${encodeURIComponent(p.plate)}`;
  history.replaceState(null, "", hash);

  // copy link
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
}

function closeModal(){
  $("modal").classList.add("hidden");
  if (location.hash.startsWith("#plate=")) history.replaceState(null, "", "#");
}

/* ====== RENDER LIST ====== */
function setHint(text){ $("hint").textContent = text || "Đang hiển thị tất cả."; }
function setCount(n){ $("count").textContent = String(n); }

function render(list){
  const wrap = $("list");
  const empty = $("empty");
  wrap.innerHTML = "";
  setCount(list.length);

  if (!list.length){
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  list.forEach(p => {
    const card = document.createElement("div");
    card.className = "item" + (p.sold ? " sold" : "");

    const statusBadge = p.sold
      ? `<span class="badge badge--sold">ĐÃ BÁN</span>`
      : `<span class="badge badge--available">CÒN HÀNG</span>`;

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
        <div class="price">${p.priceMillion} triệu</div>
        <div class="actions">
          <button class="btn btn--ghost" data-view="${p.plate}">Xem chi tiết</button>
          ${
            p.sold
              ? `<span class="muted">Đã bán</span>`
              : `<a class="btn btn--primary" href="${buildZaloLink(p.plate)}" target="_blank">Chat Zalo</a>`
          }
        </div>
      </div>
    `;
    wrap.appendChild(card);
  });

  wrap.querySelectorAll("button[data-view]").forEach(btn => {
    btn.addEventListener("click", () => {
      const plate = btn.dataset.view;
      const p = DATA.find(x => x.plate === plate);
      if (p) openModal(p);
    });
  });
}

/* ====== FILTER/SORT ====== */
function apply(){
  const q = normalize($("q").value);
  const region = $("region").value;
  const vehicle = $("vehicle").value;
  const beauty = $("beauty").value;
  const status = $("status").value;
  const hideSold = $("hideSold").checked;
  const sort = $("sort").value;

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
  if (sort === "priceAsc") out.sort((a,b)=>a.priceMillion - b.priceMillion);
  if (sort === "priceDesc") out.sort((a,b)=>b.priceMillion - a.priceMillion);

  // Hint
  const applied = [];
  if ($("q").value.trim()) applied.push(`Từ khóa: "${$("q").value.trim()}"`);
  if (region) applied.push(`Khu vực: ${region}`);
  if (vehicle) applied.push(`Loại: ${vehicle}`);
  if (beauty) applied.push(`Dạng: ${beauty}`);
  if (status) applied.push(`Trạng thái: ${status === "sold" ? "Đã bán" : "Còn hàng"}`);
  if (hideSold) applied.push("Đang ẩn đã bán");
  setHint(applied.length ? applied.join(" • ") : "Đang hiển thị tất cả.");

  render(out);
}

/* ====== INIT ====== */
function init(){
  // link liên hệ
  $("zaloFab").href = ZALO_URL;
  $("zaloBtnTop").href = ZALO_URL;
  $("callBtn").href = `tel:${HOTLINE}`;
  $("callFab").href = `tel:${HOTLINE}`;

  // events
  $("btnSearch").addEventListener("click", apply);
  $("btnReset").addEventListener("click", () => {
    $("q").value = "";
    $("region").value = "";
    $("vehicle").value = "";
    $("beauty").value = "";
    $("status").value = "";
    $("hideSold").checked = true;
    $("sort").value = "newest";
    setHint("Đang hiển thị tất cả.");
    render(DATA);
  });

  ["region","vehicle","beauty","status","sort","hideSold"].forEach(id => {
    $(id).addEventListener(id === "hideSold" ? "change" : "change", apply);
  });

  $("q").addEventListener("input", () => {
    clearTimeout(window.__tp_t);
    window.__tp_t = setTimeout(apply, 200);
  });

  // modal close
  $("modalClose").addEventListener("click", closeModal);
  $("modalX").addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // open modal from hash #plate=
  if (location.hash.startsWith("#plate=")) {
    const plate = decodeURIComponent(location.hash.replace("#plate=",""));
    const p = DATA.find(x => x.plate === plate);
    if (p) openModal(p);
  }

  setHint("Đang hiển thị tất cả.");
  render(DATA);
}

function initApp(){
  render(DATA);
  bindEvents();
}
;
/***** BACK TO TOP *****/
const backToTop = document.getElementById("backToTop");

// hiện nút khi kéo xuống
window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    backToTop.style.display = "flex";
  } else {
    backToTop.style.display = "none";
  }
});

// bấm → lên đầu trang mượt
backToTop.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});
const ZALO_PHONE = "0396298999"; // đổi số bạn

function setZaloOneTap(text){
  const a = document.getElementById("zaloOneTap");
  if (!a) return;
  a.href = `https://zalo.me/${ZALO_PHONE}?text=${encodeURIComponent(text)}`;
}

setZaloOneTap("Tôi muốn tư vấn biển số đẹp");

function bindCardUpdateZalo(cardEl, plate, priceText){
  cardEl.addEventListener("click", () => {
    const msg = priceText
      ? `Tôi quan tâm biển ${plate} (${priceText}). Nhờ tư vấn giúp tôi.`
      : `Tôi quan tâm biển ${plate}. Nhờ tư vấn giúp tôi.`;
    setZaloOneTap(msg);
  });
}
const backToTop = document.getElementById("backToTop");

if (backToTop) {
  window.addEventListener("scroll", () => {
    backToTop.style.display = window.scrollY > 300 ? "flex" : "none";
  });

  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
window.addEventListener("scroll", ()=>{ btt.style.display = window.scrollY>300 ? "block":"none"; });
btt?.addEventListener("click", ()=>window.scrollTo({top:0,behavior:"smooth"}));
const SHEET_CSV_URL = "DAN_LINK_CSV_O_DAY"; // link publish CSV

async function fetchCSV(url){
  const res = await fetch(url, { cache: "no-store" });
  if(!res.ok) throw new Error("Không tải được CSV");
  return await res.text();
}

function parseCSV(csv){
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map(s=>s.trim());
  return lines.slice(1).map(line=>{
    const cols = line.split(",").map(s=>s.trim());
    const row = {};
    headers.forEach((h,i)=> row[h] = cols[i] ?? "");
    row.priceMillion = Number(row.priceMillion || 0);
    row.sold = row.sold === "1" || row.sold === "true" || row.sold === "TRUE";
    return row;
  }).filter(r=>r.plate);
}

/** Trộn theo plate: Sheet ưu tiên, fallback chỉ thêm nếu Sheet thiếu */
function mergeByPlate(fallback, sheet){
  const map = new Map();
  // 1) đưa fallback vào trước
  fallback.forEach(p => map.set(p.plate, p));
  // 2) sheet đè lên (ưu tiên sheet)
  sheet.forEach(p => map.set(p.plate, { ...map.get(p.plate), ...p }));
  return Array.from(map.values());
}
async function boot(){
  // 1) Luôn có list ngay (fallback)
  DATA = [...FALLBACK_DATA];
  initApp(); // hoặc render/applyFilters của bạn

  // 2) Sau đó tải sheet và cập nhật
  try{
    const csv = await fetchCSV(SHEET_CSV_URL);
    const sheetData = parseCSV(csv);
    DATA = mergeByPlate(FALLBACK_DATA, sheetData);
    initApp(); // render lại lần nữa với data mới
  }catch(e){
    console.warn("Không tải được Google Sheet, dùng fallback", e);
  }
}

boot();

async function boot(){
  const csv = await fetchCSV(SHEET_CSV_URL);
  DATA = parseCSV(csv);
  initApp();
}

boot();
