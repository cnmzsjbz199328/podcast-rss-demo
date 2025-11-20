-- ============================================
-- Topic_Podcasts table creation migration
-- 创建主题播客表，用于存储基于主题的播客剧集
-- ============================================

-- 创建topic_podcasts表
CREATE TABLE topic_podcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER NOT NULL,
  episode_id TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'processing',
  audio_url TEXT,
  duration INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  tts_event_id TEXT,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

-- 创建索引以提高查询性能
CREATE INDEX idx_topic_podcasts_topic_id ON topic_podcasts(topic_id);
CREATE INDEX idx_topic_podcasts_episode_id ON topic_podcasts(episode_id);
CREATE INDEX idx_topic_podcasts_status ON topic_podcasts(status);
CREATE INDEX idx_topic_podcasts_created_at ON topic_podcasts(created_at DESC);
CREATE INDEX idx_topic_podcasts_updated_at ON topic_podcasts(updated_at DESC);
CREATE INDEX idx_topic_podcasts_tts_event_id ON topic_podcasts(tts_event_id);

-- 插入迁移记录
INSERT INTO _migration_metadata (version, description, field_mappings, applied_at) VALUES (
  2,
  'Create topic_podcasts table for theme-based podcast episodes',
  '{
    "topic_podcasts": {
      "id": "AUTO_INCREMENT",
      "topic_id": "INTEGER NOT NULL REFERENCES topics(id)",
      "episode_id": "TEXT NOT NULL UNIQUE",
      "status": "TEXT DEFAULT processing",
      "audio_url": "TEXT",
      "duration": "INTEGER",
      "created_at": "TEXT NOT NULL",
      "updated_at": "TEXT NOT NULL",
      "tts_event_id": "TEXT"
    }
  }',
  datetime('now')
);
