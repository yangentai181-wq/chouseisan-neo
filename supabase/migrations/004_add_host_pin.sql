-- ホスト用PIN（4桁）を追加
ALTER TABLE events ADD COLUMN IF NOT EXISTS host_pin TEXT;
COMMENT ON COLUMN events.host_pin IS 'ホスト認証用4桁PIN。管理画面アクセス時に使用';
