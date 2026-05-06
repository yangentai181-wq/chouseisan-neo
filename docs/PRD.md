# 調整さんネオ 製品要件定義書 (PRD)

> 実装AIへの引き継ぎ用ドキュメント
> 作成日: 2026-05-06

---

## 1. プロダクト概要

### 1.1 ポジショニング

**「ログイン不要のTimeRex」**または**「カレンダー連携付きの調整さん」**

| 比較軸         | 調整さん | TimeRex      | 調整さんネオ               |
| -------------- | -------- | ------------ | -------------------------- |
| ログイン       | 不要     | 必須         | **不要**                   |
| 投票形式       | ○△×      | 空き時間選択 | **◎○△×（4段階）**          |
| カレンダー連携 | なし     | 双方向同期   | **エクスポートのみ**       |
| モード         | 単一     | 単一         | **3モード**                |
| ターゲット     | 全般     | ビジネス     | **プライベート・課外活動** |

### 1.2 ターゲットユーザー

- **プライベート利用**: 友人との飲み会、旅行計画、趣味の集まり
- **課外活動**: サークル、PTA、町内会、ボランティア
- **小規模チーム**: 非公式ミーティング、勉強会

**共通特性**: ログインの手間を嫌う、ツール導入コストを避けたい

### 1.3 コアバリュー

1. **完全ログイン不要** — 主催者も参加者も登録なしで利用可能
2. **3モード対応** — シーンに応じた最適な調整方式
3. **4段階評価** — より細かいニュアンスを表現（◎○△×）
4. **軽量・高速** — 過剰機能を排除したシンプル設計

---

## 2. 現行実装状況

### 2.1 技術スタック

| レイヤー       | 技術                  | バージョン |
| -------------- | --------------------- | ---------- |
| フレームワーク | Next.js (App Router)  | 16.2.4     |
| UI             | React                 | 19.2.4     |
| スタイリング   | Tailwind CSS          | v4         |
| DB/Auth        | Supabase (PostgreSQL) | -          |
| バリデーション | Zod                   | -          |
| ID生成         | nanoid                | -          |
| テスト         | Playwright            | -          |
| デプロイ       | Vercel (想定)         | -          |

### 2.2 ディレクトリ構成

```
src/
├── app/                    # Next.js App Router
│   ├── api/events/         # REST API
│   ├── e/[eventId]/        # イベント詳細ページ
│   └── page.tsx            # トップ（イベント作成）
├── components/
│   ├── event/              # EventCreateForm等
│   ├── voting/             # VotingForm, VotingGrid等
│   ├── share/              # ShareButtons
│   └── calendar/           # CalendarLinks
├── lib/
│   ├── supabase/           # クライアント設定
│   ├── utils/              # nanoid等
│   └── validation.ts       # Zodスキーマ
├── types/                  # TypeScript型定義
supabase/
└── schema.sql              # DDL
```

### 2.3 データモデル

```
events
├── id: TEXT (PK, nanoid 10文字)
├── host_token: TEXT (UNIQUE, 21文字)
├── title: TEXT
├── description: TEXT?
├── mode: 'regular' | 'meeting' | 'event'
├── duration_minutes: INTEGER? (meetingモード用)
├── status: 'open' | 'finalized'
├── finalized_candidate_id: TEXT?
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ

candidates
├── id: TEXT (PK)
├── event_id: TEXT (FK → events)
├── date: DATE
├── start_time: TIME? (null = 終日)
├── end_time: TIME?
└── position: INTEGER

votes
├── id: TEXT (PK)
├── event_id: TEXT (FK → events)
├── participant_name: TEXT
├── participant_token: TEXT (編集用)
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ
└── UNIQUE(event_id, participant_name)

vote_details
├── id: TEXT (PK)
├── vote_id: TEXT (FK → votes)
├── candidate_id: TEXT (FK → candidates)
├── availability: 'preferred' | 'available' | 'maybe' | 'unavailable'
└── preference: INTEGER? (1-3, regularモード用)
```

### 2.4 実装済み機能

| 機能             | 状態    | 備考                      |
| ---------------- | ------- | ------------------------- |
| イベント作成     | ✅ 完了 | 3モード対応               |
| 候補日時設定     | ✅ 完了 | 日付・時間・終日対応      |
| 投票（◎○△×）     | ✅ 完了 | イベントモード            |
| 投票（空き時間） | ✅ 完了 | 全員集合モード            |
| 投票（希望順位） | ✅ 完了 | 定例モード                |
| リアルタイム更新 | ✅ 完了 | Supabase Realtime         |
| 結果表示         | ✅ 完了 | モード別最適候補          |
| URL共有          | ✅ 完了 | コピー機能                |
| カレンダー連携   | ✅ 完了 | Google/Apple/TimeTree/ICS |
| ホストPIN認証    | ✅ 完了 | 4桁PIN                    |
| 回答期限         | ✅ 完了 | オプション設定            |

---

## 3. 追加機能要件（優先度順）

### 3.1 Phase 1: 共有・UX強化（高優先度）

#### F1-1: LINE共有ボタン

**背景**: 日本のプライベート利用では LINE が最も使われる連絡手段

**要件**:

- LINE 共有ボタンを ShareButtons に追加
- LINE URL Scheme を使用（`https://line.me/R/msg/text/?{encodedMessage}`）
- シェアメッセージは既存の shareMessage フォーマットを流用

**実装方針**:

```tsx
// src/components/share/ShareButtons.tsx に追加
const lineShareUrl = `https://line.me/R/msg/text/?${encodeURIComponent(shareMessage)}`;
```

**受け入れ基準**:

- [ ] LINE ボタンをクリックすると LINE アプリが開く（モバイル）
- [ ] PC では LINE 公式サイトの共有画面にリダイレクト
- [ ] シェアメッセージに イベントURL が含まれる

---

#### F1-2: 結果ページUI改善

**背景**: 現行の結果表示は情報量が多く、最適候補が一目でわかりにくい

**要件**:

1. **ベスト候補ハイライト**: 最適候補を視覚的に強調
2. **集計サマリー**: 「◎3 ○2 △1 ×0」形式で候補ごとの内訳表示
3. **参加者フィルター**: 特定参加者の回答のみ表示
4. **ソート機能**: 参加可能人数順/日時順 切り替え

**デザイン方針**:

- ベスト候補: teal-600 背景 + "BEST" バッジ
- 集計: コンパクトな横並びアイコン
- フィルター/ソート: ドロップダウン or チップ

**受け入れ基準**:

- [ ] 最多◎の候補に BEST バッジが表示される
- [ ] 各候補の ◎○△× 内訳が見える
- [ ] ソート切り替えで表示順が変わる

---

#### F1-3: コメント機能

**背景**: 「この日は午後なら行ける」等の補足情報を伝えたい

**要件**:

1. **投票時コメント**: VotingForm にコメント入力欄追加
2. **候補別コメント**: 各候補日に対する個別コメント（オプション）
3. **コメント表示**: 結果画面で参加者名の横にアイコン、ホバーで表示

**データモデル変更**:

```sql
-- votes テーブルに追加
ALTER TABLE votes ADD COLUMN comment TEXT;

-- 候補別コメントが必要なら vote_details に追加
ALTER TABLE vote_details ADD COLUMN note TEXT;
```

**受け入れ基準**:

- [ ] 投票フォームにコメント入力欄がある
- [ ] コメントが結果画面に表示される
- [ ] コメントは任意（空でも投票可能）

---

#### F1-4: 匿名投票オプション

**背景**: 参加者の名前を公開したくないケース（投票結果のみ見せたい）

**要件**:

1. **イベント作成時**: 「匿名モード」トグル追加
2. **結果表示**: 匿名モードでは参加者名を非表示（「参加者1」「参加者2」等）
3. **ホストには表示**: host_token があれば実名を確認可能

**データモデル変更**:

```sql
ALTER TABLE events ADD COLUMN anonymous_mode BOOLEAN DEFAULT FALSE;
```

**受け入れ基準**:

- [ ] 匿名モード ON のイベントでは参加者名が「参加者N」表示
- [ ] ホストは PIN 入力後に実名を確認できる
- [ ] 参加者自身は自分の名前のみ見える

---

### 3.2 Phase 2: 利便性向上（中優先度）

#### F2-1: カレンダーインポート（ICS URL）

**背景**: 既存の予定を見ながら回答したい

**要件**:

- **OAuth不要アプローチ**: Google Calendar の公開ICS URL を貼り付けて予定を取得
- 予定がある時間帯を自動で「×」にサジェスト（編集可能）

**実装方針**:

1. ICS URL 入力フォーム
2. サーバーサイドで ICS をパース（`ical.js` 等）
3. 候補日時と照合して availability をプリセット

**受け入れ基準**:

- [ ] ICS URL を入力すると予定が読み込まれる
- [ ] 候補日時と重複する予定は「×」がデフォルトで選択される
- [ ] ユーザーは手動で変更可能

---

#### F2-2: 自動リマインド（PWA）

**背景**: 回答期限前にリマインダーが欲しい

**要件**:

- PWA として Service Worker を登録
- 通知許可を取得し、期限24時間前にプッシュ通知
- サーバーレス環境を考慮し、クライアントサイドでスケジューリング

**受け入れ基準**:

- [ ] PWA としてインストール可能
- [ ] 通知許可を求めるプロンプトが表示される
- [ ] 期限前に通知が届く

---

#### F2-3: テンプレート機能

**背景**: 定例会議など、同じパターンのイベントを繰り返し作成する

**要件**:

- 「テンプレートとして保存」ボタン
- localStorage に保存（ログイン不要のため）
- テンプレート選択でフォームにプリセット

**受け入れ基準**:

- [ ] 作成済みイベントをテンプレートとして保存できる
- [ ] 次回作成時にテンプレートから開始できる
- [ ] テンプレートの編集・削除が可能

---

#### F2-4: 参加者グループ

**背景**: 「AさんとBさんは必須参加」等のグルーピング

**要件**:

- 参加者に「必須」「任意」タグ付け
- 結果表示で「必須メンバー全員OK」の候補を優先表示

**データモデル変更**:

```sql
ALTER TABLE votes ADD COLUMN is_required BOOLEAN DEFAULT FALSE;
```

**受け入れ基準**:

- [ ] 投票時に「この参加は必須」チェックボックスがある
- [ ] 必須メンバー全員参加可能な候補が強調される

---

### 3.3 Phase 3: 差別化機能（低優先度/将来検討）

| 機能              | 概要                                | 複雑度 |
| ----------------- | ----------------------------------- | ------ |
| 会場予約連携      | 空いてる日×空いてる会場をマッチング | 高     |
| AI日程提案        | 過去データから最適日時を推薦        | 高     |
| Slack/Discord Bot | チャットツール内で完結              | 中     |
| 多言語対応        | i18n（英語・中国語等）              | 中     |

---

## 4. 非機能要件

### 4.1 パフォーマンス

- **初回ロード**: < 3秒（3G回線）
- **API応答**: < 500ms（p95）
- **リアルタイム更新**: < 1秒

### 4.2 セキュリティ

- **host_token**: 推測困難な21文字ランダム文字列
- **participant_token**: 編集権限の認証に使用
- **RLS**: 有効化済み（現在は全許可、段階的に制限）
- **入力バリデーション**: Zod でサーバーサイド検証

### 4.3 アクセシビリティ

- **キーボード操作**: 全機能がキーボードで操作可能
- **スクリーンリーダー**: ARIA ラベル適切に設定
- **コントラスト**: WCAG AA 準拠

---

## 5. UI/UXガイドライン

**デザインシステム**: `~/.claude/rules/common/ui-design.md` を参照

### 主要カラー

| 用途           | カラーコード | Tailwind   |
| -------------- | ------------ | ---------- |
| Primary        | #0D9488      | teal-600   |
| Primary Hover  | #0F766E      | teal-700   |
| Accent         | #F97316      | orange-500 |
| Background     | #F8FAFC      | slate-50   |
| Card           | #FFFFFF      | white      |
| Border         | #E2E8F0      | slate-200  |
| Text Primary   | #0F172A      | slate-900  |
| Text Secondary | #64748B      | slate-500  |

### コンポーネント規約

- **カード**: `rounded-xl shadow-sm border border-slate-200`
- **ボタン**: `h-12 rounded-xl bg-teal-600 hover:bg-teal-700`
- **入力**: `h-12 rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-500`

---

## 6. 実装ロードマップ

```
Phase 1（〜2週間）
├── F1-1: LINE共有ボタン（1日）
├── F1-2: 結果ページUI改善（3日）
├── F1-3: コメント機能（2日）
└── F1-4: 匿名投票（2日）

Phase 2（〜1ヶ月）
├── F2-1: カレンダーインポート（5日）
├── F2-2: PWA/リマインド（5日）
├── F2-3: テンプレート（3日）
└── F2-4: 参加者グループ（2日）

Phase 3（将来）
└── 市場反応を見て決定
```

---

## 7. 実装時の注意事項

### 7.1 コーディング規約

- **イミュータビリティ**: オブジェクトを直接変更せず、新しいオブジェクトを返す
- **ファイルサイズ**: 200-400行を目安、800行以下
- **エラーハンドリング**: 全APIエンドポイントで明示的にエラー処理
- **型安全**: `any` を避け、Zod スキーマから型を推論

### 7.2 テスト

- **TDD**: テストを先に書く（RED → GREEN → REFACTOR）
- **カバレッジ**: 80%以上を目標
- **E2Eテスト**: Playwright で主要フローをカバー

### 7.3 Git

- **コミットメッセージ**: `<type>: <description>` 形式
  - feat, fix, refactor, docs, test, chore
- **ブランチ**: `feature/F1-1-line-share` のような命名

---

## 8. 参考資料

- **競合分析**: TimeRex, 調整さん, Calendly, Cal.com
- **デザインガイドライン**: `~/.claude/rules/common/ui-design.md`
- **コーディングスタイル**: `~/.claude/rules/common/coding-style.md`
- **テスト方針**: `~/.claude/rules/common/testing.md`

---

## 付録: 競合比較マトリクス

| 機能           | 調整さんネオ | TimeRex   | 調整さん | Calendly  |
| -------------- | ------------ | --------- | -------- | --------- |
| ログイン不要   | ◎            | ×         | ◎        | ×         |
| 投票形式       | ◎○△×         | 空き時間  | ○△×      | 空き時間  |
| カレンダー同期 | △(export)    | ◎         | ×        | ◎         |
| 複数モード     | ◎(3種)       | ×         | ×        | ×         |
| LINE共有       | △(実装中)    | ○         | ×        | ×         |
| 日本語UI       | ◎            | ◎         | ◎        | △         |
| 料金           | 無料         | 無料/有料 | 無料     | 無料/有料 |
