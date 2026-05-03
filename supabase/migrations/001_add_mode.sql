-- マイグレーション: モード対応
-- 実行: SupabaseのSQL Editorでこのファイルの内容を実行

-- events テーブルにモードカラム追加
ALTER TABLE events ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'event';
-- mode: 'regular' (定例) | 'meeting' (全員集合) | 'event' (イベント)

-- events テーブルに所要時間カラム追加（全員集合モード用）
ALTER TABLE events ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- コメント追加
COMMENT ON COLUMN events.mode IS '調整モード: regular=定例, meeting=全員集合, event=イベント';
COMMENT ON COLUMN events.duration_minutes IS '会議の所要時間（分）。全員集合モードで使用';
