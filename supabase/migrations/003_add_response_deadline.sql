-- マイグレーション: 回答締め切り対応
-- 実行: SupabaseのSQL Editorでこのファイルの内容を実行

-- events テーブルに回答締め切りカラム追加
ALTER TABLE events ADD COLUMN IF NOT EXISTS response_deadline DATE;

-- コメント追加
COMMENT ON COLUMN events.response_deadline IS '回答締め切り日。NULLの場合は締め切りなし';
