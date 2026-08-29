// カレンダーアプリのエントリーポイント
import { supabase } from "./supabaseClient.js";

// Supabase への接続を確認し、結果を画面に表示する
async function checkConnection(main) {
  const status = document.createElement("p");
  status.className = "status";
  status.textContent = "Supabase に接続中...";
  main.appendChild(status);

  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .order("start_at", { ascending: true });

  if (error) {
    status.classList.add("status--error");
    status.textContent = `接続エラー: ${error.message}`;
    console.error("Supabase error:", error);
    return;
  }

  status.classList.add("status--ok");
  status.textContent = `Supabase 接続成功 — 予定 ${data.length} 件`;
  console.log("events:", data);
}

document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("main");
  checkConnection(main);
});
