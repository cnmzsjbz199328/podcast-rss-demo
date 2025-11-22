-- ============================================
-- Update topics view after table recreation
-- 重新创建v_topics视图以匹配新的topics表结构
-- ============================================

-- 删除旧的视图
DROP VIEW IF EXISTS v_topics;

-- 重新创建兼容性视图（匹配新的topics表结构）
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

-- 插入迁移记录
INSERT INTO _migration_metadata (version, description, applied_at) VALUES (
  9,
  'Update v_topics view to match recreated topics table structure',
  datetime('now')
);
