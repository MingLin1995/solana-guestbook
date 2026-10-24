-- 鏈上簽到牆快取
CREATE TABLE IF NOT EXISTS checkins (
    user_pubkey TEXT PRIMARY KEY,
    message TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    tx_signature TEXT NOT NULL UNIQUE
);

-- 建立時間戳記降冪索引，讀取前 50 筆最新留言
CREATE INDEX IF NOT EXISTS idx_checkins_timestamp ON checkins(timestamp DESC);
