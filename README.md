# カレンダー

シンプルなカレンダーアプリです。

## 使い方

`index.html` をブラウザで開いてください。

## 構成

- `index.html` — 画面のマークアップ
- `style.css` — スタイル
- `app.js` — アプリのロジック
- `supabaseClient.js` — Supabase クライアントの初期化
- `schema.sql` — Supabase 側のテーブル定義（SQL Editor で実行）

## Supabase のセットアップ

1. Supabase ダッシュボード → SQL Editor で `schema.sql` を実行し、`events` テーブルを作成する
2. 画面を開くと、上部に「Supabase 接続成功 — 予定 N 件」と表示されれば接続完了

接続情報（プロジェクトURL / anon キー）は `supabaseClient.js` に記載しています。
anon キーは公開前提のキーで、アクセス制御は RLS で行います。DB パスワードや
service_role キーはフロントエンドに置かないでください。

## 現状

空の画面 + Supabase 接続確認までを用意しています。ここからカレンダー機能を追加していきます。
