-- Chouseisan Neo Database Schema

-- イベント
CREATE TABLE events (
  id TEXT PRIMARY KEY,                    -- nanoid 10文字
  host_token TEXT NOT NULL UNIQUE,        -- ホスト操作用 21文字
  title TEXT NOT NULL,
  description TEXT,
  mode TEXT NOT NULL DEFAULT 'event',     -- 'regular' | 'meeting' | 'event'
  duration_minutes INTEGER,               -- 全員集合モード用（会議の所要時間）
  status TEXT NOT NULL DEFAULT 'open',    -- 'open' | 'finalized'
  finalized_candidate_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 候補日時
CREATE TABLE candidates (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,                        -- null = 終日
  end_time TIME,
  position INTEGER NOT NULL DEFAULT 0
);

-- 投票
CREATE TABLE votes (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  participant_token TEXT NOT NULL,        -- 編集用
  comment TEXT,                           -- 全体コメント
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, participant_name)
);

-- 投票詳細
CREATE TABLE vote_details (
  id TEXT PRIMARY KEY,
  vote_id TEXT NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  availability TEXT NOT NULL,             -- 'available' | 'maybe' | 'unavailable'
  preference INTEGER,                     -- 定例モード: 1=第1希望, 2=第2希望, 3=第3希望, null=希望なし
  note TEXT,                              -- 候補別コメント
  UNIQUE(vote_id, candidate_id),
  CONSTRAINT valid_preference CHECK (preference IS NULL OR (preference >= 1 AND preference <= 3))
);

-- インデックス
CREATE INDEX idx_candidates_event_id ON candidates(event_id);
CREATE INDEX idx_votes_event_id ON votes(event_id);
CREATE INDEX idx_vote_details_vote_id ON vote_details(vote_id);
CREATE INDEX idx_vote_details_candidate_id ON vote_details(candidate_id);

-- RLS (Row Level Security)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_details ENABLE ROW LEVEL SECURITY;

-- anon ロールに全権限（認証なしアプリのため）
CREATE POLICY "Allow all for events" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for candidates" ON candidates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for votes" ON votes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for vote_details" ON vote_details FOR ALL USING (true) WITH CHECK (true);

-- Realtime 有効化
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE vote_details;

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER votes_updated_at
  BEFORE UPDATE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
