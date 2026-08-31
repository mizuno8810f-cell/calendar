// ふたりのカレンダー — 月表示の描画
import { supabase } from "./supabaseClient.js";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// 表示中の月（その月の1日を基準に持つ）
let viewDate = new Date();
viewDate.setDate(1);

const el = {
  year: document.getElementById("year"),
  month: document.getElementById("month"),
  weekdays: document.getElementById("weekdays"),
  grid: document.getElementById("grid"),
  conn: document.getElementById("conn"),
};

// 同じ日か判定
function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// 曜日ヘッダーを描画（初回のみ）
function renderWeekdays() {
  el.weekdays.innerHTML = "";
  WEEKDAYS.forEach((label, i) => {
    const span = document.createElement("span");
    span.textContent = label;
    if (i === 0) span.classList.add("sun");
    if (i === 6) span.classList.add("sat");
    el.weekdays.appendChild(span);
  });
}

// 月グリッドを描画
function renderMonth() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-11

  el.year.textContent = `${year}年`;
  el.month.textContent = `${month + 1}月`;

  // その月の1日の曜日ぶんだけ前に戻し、日曜始まりの42マスを作る
  const start = new Date(year, month, 1);
  start.setDate(1 - start.getDay());

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
    const dow = date.getDay();
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

// Supabase 接続を静かに確認し、ヘッダーの点で表示
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

// 月を移動
function moveMonth(delta) {
  viewDate.setMonth(viewDate.getMonth() + delta);
  renderMonth();
}

function goToday() {
  viewDate = new Date();
  viewDate.setDate(1);
  renderMonth();
}

document.getElementById("prev").addEventListener("click", () => moveMonth(-1));
document.getElementById("next").addEventListener("click", () => moveMonth(1));
document.getElementById("today").addEventListener("click", goToday);

renderWeekdays();
renderMonth();
checkConnection();
