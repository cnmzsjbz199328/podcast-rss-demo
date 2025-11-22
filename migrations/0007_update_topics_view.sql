-- ============================================
-- Update topics view migration
-- 更新v_topics视图，移除status字段，添加is_active字段
-- ============================================

-- 删除旧的视图
DROP VIEW IF EXISTS v_topics;

-- 重新创建兼容性视图（移除status字段，添加is_active字段）
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
  7,
  'Update v_topics view: remove status field, add is_active field',
  datetime('now')
);
