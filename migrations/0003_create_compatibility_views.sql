-- ============================================
-- Compatibility views creation migration
-- 创建兼容性视图，提供统一的字段命名和更好的查询接口
-- ============================================

-- Topics 兼容视图（直接使用原始字段名）
CREATE VIEW IF NOT EXISTS v_topics AS
SELECT
  id,
  title,
  description,
  keywords,
  category,
  is_active,
  generation_interval_hours,
  last_generated_at,
  created_at,
  updated_at
FROM topics;

-- Topic_Podcasts 兼容视图（提供关联查询）
CREATE VIEW IF NOT EXISTS v_topic_podcasts AS
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
  3,
  'Create compatibility views for unified field naming and enhanced queries',
  datetime('now')
);
