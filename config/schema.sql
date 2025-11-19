-- Podcast剧集表
CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  style TEXT NOT NULL,  -- 风格: guo-de-gang, news-anchor 等
  audio_url TEXT,  -- R2 中的音频文件 URL（异步生成完成后填充）
  audio_key TEXT,  -- R2 中的文件 key（异步生成完成后填充）
  duration INTEGER,  -- 时长（秒）
  file_size INTEGER,  -- 文件大小（字节）
  transcript TEXT,  -- 文本脚本
  created_at TEXT NOT NULL,  -- ISO 8601 格式
  published_at TEXT,  -- 发布时间
  status TEXT DEFAULT 'draft',  -- draft, published, archived
  metadata TEXT,  -- JSON 格式的额外元数据
  tts_event_id TEXT,  -- IndexTTS异步处理的event_id
  tts_status TEXT DEFAULT 'pending',  -- 音频生成状态: pending, processing, completed, failed
  tts_error TEXT  -- 音频生成失败时的错误信息
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_episodes_created_at ON episodes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_status ON episodes(status);
CREATE INDEX IF NOT EXISTS idx_episodes_style ON episodes(style);
CREATE INDEX IF NOT EXISTS idx_episodes_published_at ON episodes(published_at DESC);

-- News源表（记录已处理的News）
CREATE TABLE IF NOT EXISTS news_sources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  episode_id TEXT,  -- 关联到 episodes 表
  FOREIGN KEY (episode_id) REFERENCES episodes(id)
);

CREATE INDEX IF NOT EXISTS idx_news_sources_processed_at ON news_sources(processed_at DESC);

-- 生成任务表（记录Podcast生成任务）
CREATE TABLE IF NOT EXISTS generation_tasks (
  id TEXT PRIMARY KEY,
  style TEXT NOT NULL,
  status TEXT NOT NULL,  -- pending, processing, completed, failed
  started_at TEXT NOT NULL,
  completed_at TEXT,
  error_message TEXT,
  episode_id TEXT,
  metadata TEXT,  -- JSON 格式的任务参数
  FOREIGN KEY (episode_id) REFERENCES episodes(id)
);

CREATE INDEX IF NOT EXISTS idx_generation_tasks_status ON generation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_started_at ON generation_tasks(started_at DESC);
