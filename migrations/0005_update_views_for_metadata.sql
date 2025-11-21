-- ============================================
-- Update views for topic metadata support
-- 更新视图以支持主题元数据字段
-- ============================================

-- 更新 v_topics 视图，添加缺失的字段
DROP VIEW IF EXISTS v_topics;
CREATE VIEW v_topics AS
SELECT
  id,
  title,
  description,
  keywords,
  category,
  status,
  is_active,
  generation_interval_hours,
  last_generated_at,
  created_at,
  updated_at
FROM topics;

-- 更新 v_topic_podcasts 视图，添加元数据字段
DROP VIEW IF EXISTS v_topic_podcasts;
CREATE VIEW v_topic_podcasts AS
SELECT
  tp.id,
  tp.topic_id,
  tp.episode_id,
  tp.episode_number,
  tp.title,
  tp.keywords,
  tp.abstract,
  tp.status,
  tp.audio_url,
  tp.srt_url,
  tp.vtt_url,
  tp.json_url,
  tp.duration,
  tp.created_at,
  tp.updated_at,
  tp.tts_event_id,
  t.title as topic_title,
  t.category as topic_category
FROM topic_podcasts tp
JOIN topics t ON tp.topic_id = t.id;

-- 插入迁移记录
INSERT INTO _migration_metadata (version, description, applied_at) VALUES (
  5,
  'Update views to include topic metadata fields (last_generated_at, is_active, title, keywords, abstract)',
  datetime('now')
);
