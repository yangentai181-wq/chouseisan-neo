# 調整さんネオ

シンプルで使いやすい日程調整アプリ。3つのモードで様々な調整シーンに対応。

## 3つのモード

| モード       | 用途                   | 投票方法             | 決定ロジック         |
| ------------ | ---------------------- | -------------------- | -------------------- |
| **イベント** | 最多参加者の日を探す   | ○△×                  | 最多○の候補          |
| **全員集合** | 全員参加できる日を探す | 来れない時間のみ入力 | 全員OKの枠を自動検出 |
| **定例**     | 毎週の固定時間を決める | 希望順位（1〜3位）   | 加重平均で最適解     |

## 技術スタック

- **フロントエンド**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **バックエンド**: Next.js App Router (API Routes)
- **データベース**: Supabase (PostgreSQL)
- **バリデーション**: Zod

## セットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/yourusername/chouseisan-neo.git
cd chouseisan-neo
```

### 2. 依存関係をインストール

```bash
npm install
```

### 3. Supabaseプロジェクトを作成

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. SQL Editorで `supabase/schema.sql` を実行
3. マイグレーションファイルがあれば `supabase/migrations/` 内のSQLも順番に実行

### 4. 環境変数を設定

```bash
cp .env.example .env.local
```

`.env.local` を編集:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 5. 開発サーバーを起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアプリにアクセス。

## デプロイ

### Vercel

1. GitHubリポジトリをVercelに接続
2. 環境変数を設定（`NEXT_PUBLIC_BASE_URL` は本番URLに変更）
3. デプロイ

### その他のプラットフォーム

Next.jsの標準的なビルドコマンドを使用:

```bash
npm run build
npm run start
```

## ディレクトリ構成

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   └── events/        # イベント関連API
│   ├── e/[eventId]/       # イベントページ
│   └── page.tsx           # トップページ（イベント作成）
├── components/            # Reactコンポーネント
│   ├── event/            # イベント作成関連
│   ├── voting/           # 投票関連
│   ├── share/            # 共有機能
│   └── calendar/         # カレンダー連携
├── lib/                   # ユーティリティ
│   ├── supabase/         # Supabaseクライアント
│   ├── utils/            # nanoid等
│   └── validation.ts     # Zodスキーマ
└── types/                 # TypeScript型定義
```

## 主な機能

- **イベント作成**: タイトル、説明、候補日時を設定
- **3モード対応**: イベント/全員集合/定例から選択
- **投票**: 候補日ごとに参加可否を入力
- **リアルタイム更新**: Supabase Realtimeで即時反映
- **結果表示**: モード別に最適な候補を表示
- **共有**: LINE/X/URLコピーで簡単共有
- **カレンダー連携**: Google/Apple/Outlookに追加

## ライセンス

MIT License
