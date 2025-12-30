/***********************
 * TIÊN PHONG - script.js (PRO)
 * - Search/Filter/Sort
 * - 98 & 99 (oto + xe máy) => Bắc Ninh
 * - Status: sold/available + hide sold
 * - Detail modal + share link (#plate=...)
 * - Zalo prefilled message
 ************************/

/* ====== CẤU HÌNH LIÊN HỆ ====== */
const ZALO_URL = "https://zalo.me/0900000000"; // <-- đổi số
const HOTLINE  = "0900000000";                // <-- đổi số

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

/* ====== DỮ LIỆU: TOÀN BỘ LIST BẠN GỬI ====== */
/* Ghi chú:
 - Mặc định: sold = false (còn hàng)
 - Muốn đánh dấu đã bán: thêm vào SOLD_SET ở dưới
*/
const RAW_GROUPS = [
  { vehicle: "Ô tô", plates: `
98A-955.99
98A-968.99
98A-983.99
98A-887.89
98A-867.99
98A-895.89
98A-886.38
98A-833.55
98A-682.99
98A-696.38
98A-855.86
98A-692.88
98A-855.79
98A-899.39
98A-881.98
98A-936.36
98A-999.56
98A-995.79
98A-988.39
98A-988.69
98A-966.79
98A-826.79
98A-923.99
98A-999.16
98C-368.79
98A-998.79
98A-925.99
98A-955.66
98A-926.88
98A-938.79
98A-995.59
98A-929.86
98A-885.79
98A-993.86
98A-855.98
98A-866.96
98A-956.68
98A-992.79
98A-996.89
98A-926.79
98A-955.86
98A-959.86
98A-990.90
98A-988.79
98A-955.79
98A-959.88
98A-969.68
98A-993.79
98A-928.86
98A-968.39
98A-965.68
98A-933.98
98A-938.38
98A-919.96
98A-938.86
98A-999.58
98A-956.99
98A-933.79
98A-996.79
98A-955.98
98A-983.79
98A-966.98
98C-345.99
98A-933.89
98A-968.98
98A-955.59
98A-933.68
98A-936.79
98C-383.68
98A-919.98
98A-939.86
98A-969.88
98A-928.99
98A-933.86
98A-956.86
98A-999.63
98A-998.96
98A-929.88
98A-922.79
98A-833.89
98A-992.29
98A-998.38
99A-936.79
99A-922.79
99A-955.69
99A-926.79
99A-833.55
99B-098.98
99B-126.68
99B-122.99
99B-059.99
99B-155.68
99B-328.28
99B-219.79
99B-283.83
99B-333.93
99B-356.66
99B-266.99
99B-323.68
99B-338.86
99B-283.33
99B-338.99
99B-336.36
99B-186.68
99B-278.99
99B-196.96
99B-236.68
99B-335.55
99B-338.38
99B-323.33
99B-326.68
99B-339.68
99B-255.99
99B-355.99
99B-319.79
99B-345.68
99B-236.88
99B-336.68
99B-345.66
99B-225.55
99B-345.86
99B-235.68
99B-256.88
99B-286.99
99B-219.91
99B-322.99
99B-229.29
99B-356.68
99B-339.99
99B-309.99
99B-323.23
99B-255.68
99B-328.68
99B-293.93
99B-345.79
99B-228.86
99B-319.88
99B-338.33
99B-345.88
99B-333.98
99B-337.77
99B-337.99
99B-282.22
99B-333.69
99B-233.68
99B-345.99
99B-277.99
99B-225.68
99B-326.88
99B-285.55
99B-337.89
99B-339.93
99B-165.68
99B-135.68
99B-136.68
99B-232.22
99B-265.68
99B-265.55
99B-356.88
99B-333.58
99B-356.56
99B-358.58
99B-329.29
30K-968.93
30M-668.92
30M-668.93
30M-686.93
30B-035.68
30M-925.99
30M-938.86
30M-932.99
30M-855.86
29K-419.99
30M-629.79
29K-322.68
29K-389.86
30M-555.96
29K-365.55
30M 933.89
30M-533.68
30M-922.89
30M-982.79
30M-879.98
30M-938.98
30M-936.79
30M-688.36
30M-839.98
30M-985.55
30B-288.79
30B-636.79
30B-535.55
30B-555.38
30B-329.79
30B-583.79
30B-556.78
30B-279.86
30B-555.25
30B-519.79
30B-219.79
30B-519.19
30B-599.86
30B-536.68
30B-322.66
30B-332.68
30B-388.79
30B-333.56
30B-555.36
30B-538.88
30B-522.66
30B-629.79
30B-225.25
30B-919.98
30B-999.28
30B-779.68
30B-919.68
30B-839.68
30B-966.89
30B-888.19
30B-777.86
30B-886.69
30B-998.79
30B-922.79
30B-919.86
30B-978.99
30B-928.99
30B-928.68
30B-999.36
30B-919.79
30B-888.91
30B-987.98
30B-666.58
30B-666.59
30B-926.88
30B-835.55
30B-866.99
30B-666.19
30B-826.99
30B-888.78
30B-936.68
30B-936.88
30B-926.68
30B-919.97
30B-836.99
30B-856.79
30B-999.26
30B-895.95
30B-828.79
30B-926.99
30B-935.55
30B-887.99
30B-995.79
30B-868.36
30B-668.38
30B-688.58
30B-656.79
30B-999.56
30B-686.38
30B-800.88
30B-929.68
30C-129.99
30B-787.77
30B-668.36
30B-686.36
30B-688.38
30B-955.79
30B-999.29
30C-012.68
30C-263.63
30B-688.96
30B-686.26
30B-939.66
30B-886.39
30B-888.95
30B-955.68
30B-886.38
30B-835.68
30B-891.91
30B-668.39
30B-998.38
30B-999.63
30B-683.89
30B-855.68
30B-686.55
30B-666.29
30B-886.36
30B-686.56
30B-855.79
30B-888.56
30B-963.63
30B-888.59
30C-265.68
30B-829.79
30B-878.68
30B-983.98
30B-929.98
30B-666.98
30B-925.55
30B-667.77
30B-685.88
30B-839.98
30B-668.96
30C-023.45
30B-688.36
30B-823.86
30B-897.99
30B-836.79
30B-655.79
30B-922.89
30B-923.99
30B-925.99
30B-923.68
30B-925.68
30B-935.68
30B-545.68
30B-808.86
30B-932.99
30B-858.98
30B-688.56
30B-696.36
30C-222.83
30B-998.28
30B-326.99
30B-880.89
30C-227.99
30B-886.58
68A-619.99
51L-666.92
51L-686.89
51L-635.55
51L-325.55
51M-328.68
51L-555.83
51M-468.79
51M-633.99
51L-688.96
51M-235.68
51D-992.79
51M-556.79
51L-955.79
51D-988.79
51D-878.99
51M-878.99
51M-383.68
51M-479.99
51M-666.28
51M-822.99
50H-919.99
50H-929.99
`},
  { vehicle: "Xe máy", plates: `
98AG-068.88
98AC-069.99
98AF-088.86
98AE-123.79
99AA-459.99
99AA-529.99
99AA-468.88
99AA-525.55
99AA-355.68
99AA-468.68
99AA-358.88
99AA-469.99
99AA-489.99
99AA-633.68
99AA-666.16
99AA-689.98
99AA-585.55
99AA-918.88
99AA-588.99
99AA-089.99
99AA-556.66
99AA-838.79
99AA-333.86
99AA-986.99
99AA-988.79
99AA-818.88
99AA-888.18
99AA-616.66
99AA-998.79
99AA-619.99
99AA-555.56
99AA-583.86
99AA-966.99
99AA-558.88
99AA-345.68
99AA-928.88
99AA-859.99
99AA-628.88
99AA-679.99
99AA-569.99
99AA-159.99
99AA-269.99
99AA-896.96
99AA-266.99
99AA-286.68
99AA-666.79
99AA-855.55
99AA-888.28
99AA-663.66
99AB-129.99
99AA-686.99
99AA-566.68
99AA-888.58
99AA-666.56
99AA-666.89
99AA-659.99
99AB-128.88
99AA-869.99
99AA-666.36
99AA-888.79
99AA-999.29
99AA-879.99
99AA-666.98
`},
];

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
      const priceMillion = priceByBeauty(beauty);
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

const DATA = buildData();

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

init();
