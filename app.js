// ふたりのカレンダー — 月表示の描画
import { supabase } from "./supabaseClient.js";

// 月曜始まり（土=index5, 日=index6）
const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

// 連続スクロール表示で用意する月の範囲（今月を基準に前後）
const WINDOW_BACK = 12;
const WINDOW_FWD = 24;

// 表示中の月（その月の1日を基準に持つ）
let viewDate = new Date();
viewDate.setDate(1);

// スワイプ設定（"horizontal" = 左右で1ヶ月ずつ / "vertical" = 上下に連続スクロール）
let swipeAxis = loadSwipeAxis();

// 日本の祝日 { "YYYY-MM-DD": "祝日名" }。まずはキャッシュ、その後ネットで更新
let holidays = loadHolidaysCache();

// 連続スクロール用の状態
const scrollState = { built: false, sections: [] };

// 予定 { "YYYY-MM-DD": [ {id, owner, category, title, time, all_day} ] }
let eventsByDate = {};
// 日別シートで開いている日付
let selectedDate = null;

// 「次に追加する予定」の人・種類（ペン）
let penOwner = "hayato";
let penCategory = "play";

// 表示の絞り込み（人ごと）
const filters = { hayato: true, shiori: true, both: true };

// 表示メタ
const OWNERS = { hayato: "はやと", shiori: "しおり", both: "二人" };
const CATS = { play: "遊び", work: "仕事" };
function normOwner(o) {
  if (o === "partner") return "shiori";
  if (o === "me") return "hayato";
  return o in OWNERS ? o : "hayato";
}

const el = {
  year: document.getElementById("year"),
  month: document.getElementById("month"),
  weekdays: document.getElementById("weekdays"),
  grid: document.getElementById("grid"),
  conn: document.getElementById("conn"),
  settings: document.getElementById("settings"),
  daySheet: document.getElementById("day-sheet"),
  addSheet: document.getElementById("add-sheet"),
};

// ---- 設定の保存/読み込み ----
function loadSwipeAxis() {
  try {
    return localStorage.getItem("swipeAxis") || "horizontal";
  } catch {
    return "horizontal";
  }
}
function saveSwipeAxis(value) {
  try {
    localStorage.setItem("swipeAxis", value);
  } catch {
    /* localStorage が使えない環境では保存を諦める */
  }
}

// ---- 祝日 ----
function ymd(d) {
  return (
    `${d.getFullYear()}-` +
    `${String(d.getMonth() + 1).padStart(2, "0")}-` +
    `${String(d.getDate()).padStart(2, "0")}`
  );
}
function loadHolidaysCache() {
  try {
    return JSON.parse(localStorage.getItem("holidays") || "{}");
  } catch {
    return {};
  }
}
async function loadHolidays() {
  try {
    const res = await fetch("https://holidays-jp.github.io/api/v1/date.json");
    if (!res.ok) return;
    const data = await res.json();
    holidays = data;
    try {
      localStorage.setItem("holidays", JSON.stringify(data));
    } catch {
      /* 保存できなくても表示には使う */
    }
    render(); // 取得できたら再描画して赤を反映
  } catch {
    /* オフライン等はキャッシュのみで表示 */
  }
}

// ---- 共通ヘルパ ----
function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// 1日ぶんのマスを作る
function makeCell(date, outOfMonth) {
  const cell = document.createElement("div");
  cell.className = "cell";
  if (outOfMonth) cell.classList.add("cell--out");
  if (isSameDay(date, new Date())) cell.classList.add("cell--today");

  const num = document.createElement("span");
  num.className = "date";
  const dow = date.getDay(); // 0=日 ... 6=土
  const holidayName = holidays[ymd(date)];
  if (holidayName) num.classList.add("holiday");
  else if (dow === 0) num.classList.add("sun");
  else if (dow === 6) num.classList.add("sat");
  num.textContent = date.getDate();
  cell.appendChild(num);

  const slots = document.createElement("div");
  slots.className = "slots";
  if (holidayName && !outOfMonth) {
    const tag = document.createElement("span");
    tag.className = "holiday-name";
    tag.textContent = holidayName;
    slots.appendChild(tag);
  }

  // 予定チップ（最大3件＋残りは +N）※絞り込みを反映
  const list = (eventsByDate[ymd(date)] || []).filter((ev) => filters[ev.owner]);
  if (list.length) {
    list.slice(0, 3).forEach((ev) => {
      const chip = document.createElement("span");
      chip.className = "chip chip--" + normOwner(ev.owner);
      if (ev.category) {
        const badge = document.createElement("i");
        badge.className = "chip-cat";
        badge.textContent = ev.category === "work" ? "仕" : "遊";
        chip.appendChild(badge);
      }
      chip.appendChild(
        document.createTextNode((ev.time ? ev.time + " " : "") + ev.title)
      );
      slots.appendChild(chip);
    });
    if (list.length > 3) {
      const more = document.createElement("span");
      more.className = "chip-more";
      more.textContent = `+${list.length - 3}`;
      slots.appendChild(more);
    }
  }

  cell.appendChild(slots);

  const dayDate = new Date(date);
  cell.addEventListener("click", () => openDay(dayDate));
  return cell;
}
function makeBlank() {
  const cell = document.createElement("div");
  cell.className = "cell cell--blank";
  return cell;
}

function renderWeekdays() {
  el.weekdays.innerHTML = "";
  WEEKDAYS.forEach((label, i) => {
    const span = document.createElement("span");
    span.textContent = label;
    if (i === 5) span.classList.add("sat");
    if (i === 6) span.classList.add("sun");
    el.weekdays.appendChild(span);
  });
}

function setLabel(year, month) {
  el.year.textContent = `${year}年`;
  el.month.textContent = `${month + 1}月`;
}

// ---- 左右モード：1ヶ月ぶんのグリッド ----
function renderPaged() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  setLabel(year, month);

  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);

  el.grid.className = "grid grid--paged";
  el.grid.innerHTML = "";
  for (let i = 0; i < 42; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    el.grid.appendChild(makeCell(date, date.getMonth() !== month));
  }
}

// ---- 上下モード：連続スクロール ----
function makeMonthSection(year, month) {
  const sec = document.createElement("section");
  sec.className = "month-block";

  const head = document.createElement("div");
  head.className = "month-block-head";
  head.textContent = month === 0 ? `${year}年 1月` : `${month + 1}月`;
  sec.appendChild(head);

  const g = document.createElement("div");
  g.className = "month-block-grid";

  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  for (let i = 0; i < offset; i++) g.appendChild(makeBlank());

  const days = daysInMonth(year, month);
  for (let d = 1; d <= days; d++) {
    g.appendChild(makeCell(new Date(year, month, d), false));
  }

  const total = offset + days;
  const trailing = (7 - (total % 7)) % 7;
  for (let i = 0; i < trailing; i++) g.appendChild(makeBlank());

  sec.appendChild(g);
  return { year, month, el: sec };
}

function buildScroll() {
  el.grid.className = "grid grid--scroll";
  el.grid.innerHTML = "";
  scrollState.sections = [];

  const base = new Date();
  base.setDate(1);
  for (let k = -WINDOW_BACK; k <= WINDOW_FWD; k++) {
    const d = new Date(base.getFullYear(), base.getMonth() + k, 1);
    const s = makeMonthSection(d.getFullYear(), d.getMonth());
    el.grid.appendChild(s.el);
    scrollState.sections.push(s);
  }
  scrollState.built = true;
}

function scrollToMonth(year, month, smooth) {
  const s = scrollState.sections.find(
    (x) => x.year === year && x.month === month
  );
  if (!s) return;
  el.grid.scrollTo({
    top: s.el.offsetTop,
    behavior: smooth ? "smooth" : "auto",
  });
}

// スクロール位置から「今どの月を見ているか」を判定してラベル更新
function updateVisibleMonth() {
  const top = el.grid.scrollTop + 8;
  let cur = scrollState.sections[0];
  for (const s of scrollState.sections) {
    if (s.el.offsetTop <= top) cur = s;
    else break;
  }
  if (cur) {
    setLabel(cur.year, cur.month);
    viewDate = new Date(cur.year, cur.month, 1);
  }
}

let visibleRaf = 0;
function scheduleUpdateVisible() {
  if (visibleRaf) return;
  visibleRaf = requestAnimationFrame(() => {
    visibleRaf = 0;
    updateVisibleMonth();
  });
}

// ---- モードに応じて描画 ----
function render() {
  if (swipeAxis === "vertical") {
    buildScroll();
    // レイアウト確定後に目的の月へスクロール
    requestAnimationFrame(() => {
      scrollToMonth(viewDate.getFullYear(), viewDate.getMonth(), false);
      updateVisibleMonth();
    });
  } else {
    scrollState.built = false;
    renderPaged();
  }
}

// ---- 月の移動 ----
function moveMonth(delta) {
  const target = new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1);
  if (swipeAxis === "vertical") {
    viewDate = target;
    scrollToMonth(target.getFullYear(), target.getMonth(), true);
  } else {
    viewDate = target;
    renderPaged();
  }
}
function goToday() {
  const now = new Date();
  viewDate = new Date(now.getFullYear(), now.getMonth(), 1);
  if (swipeAxis === "vertical") {
    scrollToMonth(viewDate.getFullYear(), viewDate.getMonth(), true);
  } else {
    renderPaged();
  }
}

// ---- スワイプ操作（左右モードのみ）----
const SWIPE_THRESHOLD = 45;
let startX = 0;
let startY = 0;

el.grid.addEventListener(
  "touchstart",
  (e) => {
    const t = e.changedTouches[0];
    startX = t.clientX;
    startY = t.clientY;
  },
  { passive: true }
);
el.grid.addEventListener(
  "touchend",
  (e) => {
    if (swipeAxis !== "horizontal") return; // 上下モードは端末の標準スクロールに任せる
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      moveMonth(dx < 0 ? 1 : -1); // 左へ払う=次の月
    }
  },
  { passive: true }
);

// 連続スクロール中はラベルを更新
el.grid.addEventListener(
  "scroll",
  () => {
    if (swipeAxis === "vertical" && scrollState.built) scheduleUpdateVisible();
  },
  { passive: true }
);

// ---- 設定画面 ----
function openSettings() {
  document
    .querySelectorAll('input[name="swipeAxis"]')
    .forEach((r) => (r.checked = r.value === swipeAxis));
  el.settings.hidden = false;
}
function closeSettings() {
  el.settings.hidden = true;
}

document.getElementById("open-settings").addEventListener("click", openSettings);
document.getElementById("close-settings").addEventListener("click", closeSettings);

document.querySelectorAll('input[name="swipeAxis"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    if (!radio.checked) return;
    swipeAxis = radio.value;
    saveSwipeAxis(swipeAxis);
    render(); // モードを切り替えて描画し直す
  });
});

// ---- 予定（Supabase）----
const JP_WEEK = ["日", "月", "火", "水", "木", "金", "土"];

async function fetchEvents() {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .order("start_at", { ascending: true });

  if (error) {
    el.conn.classList.add("conn--error");
    el.conn.title = `接続エラー: ${error.message}`;
    console.error("Supabase error:", error);
    return;
  }
  el.conn.classList.remove("conn--error");
  el.conn.classList.add("conn--ok");
  el.conn.title = "Supabase に接続済み";

  eventsByDate = {};
  for (const ev of data || []) {
    const d = new Date(ev.start_at);
    const key = ymd(d);
    const time = ev.all_day
      ? ""
      : `${String(d.getHours()).padStart(2, "0")}:${String(
          d.getMinutes()
        ).padStart(2, "0")}`;
    (eventsByDate[key] ||= []).push({
      id: ev.id,
      owner: normOwner(ev.owner),
      category: ev.category || null,
      title: ev.title,
      time,
      all_day: ev.all_day,
    });
  }
  render();
  if (!el.daySheet.hidden) renderDayList();
}

async function addEvent(dateObj, owner, category, title, time) {
  let start_at, all_day;
  if (time) {
    const [hh, mm] = time.split(":").map(Number);
    start_at = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate(),
      hh,
      mm
    ).toISOString();
    all_day = false;
  } else {
    start_at = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate()
    ).toISOString();
    all_day = true;
  }
  const { error } = await supabase
    .from("calendar_events")
    .insert({ owner, category, title, start_at, all_day });
  if (error) {
    alert("保存に失敗しました: " + error.message);
    return false;
  }
  await fetchEvents();
  return true;
}

async function deleteEvent(id) {
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id);
  if (error) {
    alert("削除に失敗しました: " + error.message);
    return;
  }
  await fetchEvents();
}

// ---- 登録フォームの選択状態（人・種類）----
function setPenOwner(owner) {
  penOwner = owner;
  document.querySelectorAll(".own-btn").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.owner === owner);
  });
}
function setPenCategory(cat) {
  penCategory = cat;
  document.querySelectorAll(".cat-btn").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.cat === cat);
  });
}

// ---- 日別シート ----
function openDay(date) {
  selectedDate = date;
  const heading = `${date.getMonth() + 1}月${date.getDate()}日（${
    JP_WEEK[date.getDay()]
  }）`;
  document.getElementById("day-title").textContent = heading;
  renderDayList();
  // フォームは現在のペンを反映
  document.getElementById("ev-title").value = "";
  document.getElementById("ev-time").value = "";
  setPenOwner(penOwner);
  setPenCategory(penCategory);
  el.daySheet.hidden = false;
}
function closeDay() {
  el.daySheet.hidden = true;
}
function renderDayList() {
  const listEl = document.getElementById("day-list");
  listEl.innerHTML = "";
  const items = (
    (selectedDate && eventsByDate[ymd(selectedDate)]) ||
    []
  ).filter((ev) => filters[ev.owner]);
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "day-empty";
    li.textContent = "予定はありません";
    listEl.appendChild(li);
    return;
  }
  items.forEach((ev) => {
    const li = document.createElement("li");
    li.className = "day-item";

    const dot = document.createElement("i");
    dot.className = "dot dot--" + ev.owner;
    li.appendChild(dot);

    const time = document.createElement("span");
    time.className = "di-time";
    time.textContent = ev.time || "終日";
    li.appendChild(time);

    const title = document.createElement("span");
    title.className = "di-title";
    const catLabel = ev.category ? `［${CATS[ev.category]}］` : "";
    title.textContent = `${OWNERS[ev.owner]} ${catLabel}${ev.title}`;
    li.appendChild(title);

    const del = document.createElement("button");
    del.className = "di-del";
    del.type = "button";
    del.textContent = "✕";
    del.setAttribute("aria-label", "削除");
    del.addEventListener("click", () => deleteEvent(ev.id));
    li.appendChild(del);

    listEl.appendChild(li);
  });
}

// ---- 下部バー：予定登録の小画面を開く ----
function openAdd() {
  const base = selectedDate || new Date();
  document.getElementById("q-date").value = ymd(base);
  document.getElementById("q-title").value = "";
  document.getElementById("q-time").value = "";
  setPenOwner(penOwner);
  setPenCategory(penCategory);
  el.addSheet.hidden = false;
}
function closeAdd() {
  el.addSheet.hidden = true;
}

document.querySelectorAll("#owner-bar .ob-btn").forEach((b) => {
  b.addEventListener("click", () => {
    setPenOwner(b.dataset.owner);
    openAdd();
  });
});

el.addSheet.querySelectorAll("[data-add-close]").forEach((n) => {
  n.addEventListener("click", closeAdd);
});
document.getElementById("quick-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const dv = document.getElementById("q-date").value;
  if (!dv) return;
  const [y, m, d] = dv.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const title =
    document.getElementById("q-title").value.trim() || CATS[penCategory];
  const time = document.getElementById("q-time").value;
  const ok = await addEvent(dateObj, penOwner, penCategory, title, time);
  if (ok) closeAdd();
});

// ---- 絞り込みバー ----
document.querySelectorAll("#filter-bar .fb-btn").forEach((b) => {
  b.addEventListener("click", () => {
    const o = b.dataset.owner;
    filters[o] = !filters[o];
    b.classList.toggle("is-active", filters[o]);
    render();
    if (!el.daySheet.hidden) renderDayList();
  });
});

// ---- 日別シートのフォーム ----
el.daySheet.querySelectorAll("[data-close]").forEach((n) => {
  n.addEventListener("click", closeDay);
});
document.querySelectorAll(".own-btn").forEach((b) => {
  b.addEventListener("click", () => setPenOwner(b.dataset.owner));
});
document.querySelectorAll(".cat-btn").forEach((b) => {
  b.addEventListener("click", () => setPenCategory(b.dataset.cat));
});
document.getElementById("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selectedDate) return;
  const title =
    document.getElementById("ev-title").value.trim() || CATS[penCategory];
  const time = document.getElementById("ev-time").value;
  const ok = await addEvent(selectedDate, penOwner, penCategory, title, time);
  if (ok) {
    document.getElementById("ev-title").value = "";
    document.getElementById("ev-time").value = "";
  }
});

// ---- ボタン ----
document.getElementById("prev").addEventListener("click", () => moveMonth(-1));
document.getElementById("next").addEventListener("click", () => moveMonth(1));
document.getElementById("today").addEventListener("click", goToday);

// ---- 起動 ----
renderWeekdays();
setPenOwner(penOwner);
setPenCategory(penCategory);
render();
loadHolidays();
fetchEvents();
