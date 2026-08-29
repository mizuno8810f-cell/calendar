// Supabase クライアントの初期化
// supabase-js を CDN(ESM) から読み込みます。
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// プロジェクトURL と anon(public) キー。
// anon キーはクライアントに公開される前提のキーです。
// アクセス制御は Supabase 側の Row Level Security (RLS) で行います。
// ※ service_role キーや DB パスワードは絶対にここへ書かないこと。
export const SUPABASE_URL = "https://aoezinfahohlrhstjvjq.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvZXppbmZhaG9obHJoc3RqdmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NDMwNjgsImV4cCI6MjEwMjIxOTA2OH0.GZJt-ZTRY8lN6gLgDCYwZVNiM29par0rUQUKGF2mTYc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
