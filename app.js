// ふたりのカレンダー — 月表示の描画
import { supabase } from "./supabaseClient.js";

// 月曜始まり（土=index5, 日=index6）
const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

// 表示中の月（その月の1日を基準に持つ）
let viewDate = new Date();
viewDate.setDate(1);

// スワイプ設定（"horizontal" = 左右 / "vertical" = 上下）
let swipeAxis = loadSwipeAxis();

const el = {
  year: document.getElementById("year"),
  month: document.getElementById("month"),
  weekdays: document.getElementById("weekdays"),
  grid: document.getElementById("grid"),
  conn: document.getElementById("conn"),
  settings: document.getElementById("settings"),
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

// ---- 描画 ----
function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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

function renderMonth() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-11

  el.year.textContent = `${year}年`;
  el.month.textContent = `${month + 1}月`;

  // 月曜始まりに合わせて先頭の曜日ぶん前に戻す（月=0 ... 日=6）
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);

  const today = new Date();
  el.grid.innerHTML = "";

  for (let i = 0; i < 42; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);

    const cell = document.createElement("div");
    cell.className = "cell";
    if (date.getMonth() !== month) cell.classList.add("cell--out");
    if (isSameDay(date, today)) cell.classList.add("cell--today");

    const num = document.createElement("span");
    num.className = "date";
    const dow = date.getDay(); // 0=日 ... 6=土
    if (dow === 0) num.classList.add("sun");
    if (dow === 6) num.classList.add("sat");
    num.textContent = date.getDate();
    cell.appendChild(num);

    // 予定を入れる場所（今は空。あとで自分/相手の予定を描画）
    const slots = document.createElement("div");
    slots.className = "slots";
    cell.appendChild(slots);

    el.grid.appendChild(cell);
  }
}

// ---- 月の移動 ----
function moveMonth(delta) {
  viewDate.setMonth(viewDate.getMonth() + delta);
  renderMonth();
}
function goToday() {
  viewDate = new Date();
  viewDate.setDate(1);
  renderMonth();
}

// ---- スワイプ操作 ----
const SWIPE_THRESHOLD = 45; // これ以上動いたらスワイプとみなす
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
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (swipeAxis === "horizontal") {
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        moveMonth(dx < 0 ? 1 : -1); // 左へ払う=次の月
      }
    } else {
      if (Math.abs(dy) > SWIPE_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
        moveMonth(dy < 0 ? 1 : -1); // 上へ払う=次の月
      }
    }
  },
  { passive: true }
);

// ---- 設定画面 ----
function openSettings() {
  // 現在の設定をラジオに反映
  document
    .querySelectorAll('input[name="swipeAxis"]')
    .forEach((r) => (r.checked = r.value === swipeAxis));
  el.settings.hidden = false;
}
function closeSettings() {
  el.settings.hidden = true;
}

document
  .getElementById("open-settings")
  .addEventListener("click", openSettings);
document
  .getElementById("close-settings")
  .addEventListener("click", closeSettings);

document.querySelectorAll('input[name="swipeAxis"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.checked) {
      swipeAxis = radio.value;
      saveSwipeAxis(swipeAxis);
    }
  });
});

// ---- Supabase 接続確認（ヘッダーの点で表示）----
async function checkConnection() {
  const { error } = await supabase
    .from("calendar_events")
    .select("id", { head: true, count: "exact" });

  if (error) {
    el.conn.classList.add("conn--error");
    el.conn.title = `接続エラー: ${error.message}`;
    console.error("Supabase error:", error);
  } else {
    el.conn.classList.add("conn--ok");
    el.conn.title = "Supabase に接続済み";
  }
}

// ---- ボタン ----
document.getElementById("prev").addEventListener("click", () => moveMonth(-1));
document.getElementById("next").addEventListener("click", () => moveMonth(1));
document.getElementById("today").addEventListener("click", goToday);

// ---- 起動 ----
renderWeekdays();
renderMonth();
checkConnection();
