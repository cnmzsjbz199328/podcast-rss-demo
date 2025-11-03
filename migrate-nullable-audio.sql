-- 重建episodes表，使audio_url和audio_key可为NULL
-- SQLite不支持ALTER COLUMN，需要重建表

-- 1. 创建新表结构
CREATE TABLE IF NOT EXISTS episodes_new (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  style TEXT NOT NULL,
  audio_url TEXT,  -- 改为可NULL
  audio_key TEXT,  -- 改为可NULL
  duration INTEGER,
  file_size INTEGER,
  transcript TEXT,
  created_at TEXT NOT NULL,
  published_at TEXT,
  status TEXT DEFAULT 'draft',
  metadata TEXT,
  tts_event_id TEXT,
  tts_status TEXT DEFAULT 'pending',
  tts_error TEXT
);

-- 2. 复制数据
INSERT INTO episodes_new 
SELECT 
  id, title, description, style, audio_url, audio_key,
  duration, file_size, transcript, created_at, published_at, status, metadata,
  tts_event_id, tts_status, tts_error
FROM episodes;

-- 3. 删除旧表
DROP TABLE episodes;

-- 4. 重命名新表
ALTER TABLE episodes_new RENAME TO episodes;

-- 5. 重建索引
CREATE INDEX IF NOT EXISTS idx_episodes_created_at ON episodes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_status ON episodes(status);
CREATE INDEX IF NOT EXISTS idx_episodes_style ON episodes(style);
CREATE INDEX IF NOT EXISTS idx_episodes_published_at ON episodes(published_at DESC);
