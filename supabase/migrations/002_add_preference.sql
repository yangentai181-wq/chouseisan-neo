-- Add preference column to vote_details for 定例モード (regular mode)
-- preference: 1 = 第1希望, 2 = 第2希望, 3 = 第3希望, NULL = 希望なし

ALTER TABLE vote_details ADD COLUMN IF NOT EXISTS preference INTEGER;

-- Add constraint to ensure valid preference values
ALTER TABLE vote_details ADD CONSTRAINT valid_preference
  CHECK (preference IS NULL OR (preference >= 1 AND preference <= 3));
