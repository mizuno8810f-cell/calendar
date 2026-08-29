// Supabase クライアントの初期化
// supabase-js を CDN(ESM) から読み込みます。
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// プロジェクトURL と anon(public) キー。
// anon キーはクライアントに公開される前提のキーです。
// アクセス制御は Supabase 側の Row Level Security (RLS) で行います。
// ※ service_role キーや DB パスワードは絶対にここへ書かないこと。
export const SUPABASE_URL = "https://atmkflbtpeuyciljwtzp.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bWtmbGJ0cGV1eWNpbGp3dHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5OTYyMTQsImV4cCI6MjEwMzU3MjIxNH0.2c2uf-MqsUIzDZh3hzGPIBGWeChCuE6tsoMaKHYqmIY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
