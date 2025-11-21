-- Migration: Enhance topics table for series generation (minimalist design)
-- Description: Add fields for topic series management
-- Date: 2025-11-20

-- 为 topics 表添加系列生成相关字段（极简版）

-- 添加激活控制字段
ALTER TABLE topics ADD COLUMN is_active BOOLEAN DEFAULT 1;

-- 添加生成控制字段
ALTER TABLE topics ADD COLUMN last_generated_at TEXT;
ALTER TABLE topics ADD COLUMN generation_interval_hours INTEGER DEFAULT 24;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_topics_is_active ON topics(is_active);
CREATE INDEX IF NOT EXISTS idx_topics_last_generated ON topics(last_generated_at);

-- 更新现有记录：将 status='active' 的主题设置为激活
-- 注意：如果没有status字段，这个更新会失败但不影响迁移
UPDATE topics SET is_active = CASE WHEN status = 'active' THEN 1 ELSE 0 END WHERE status IS NOT NULL;

-- 注意：保留 keywords、category、episode_count 字段（如果存在）以保持向后兼容
-- 但新的业务逻辑不再使用这些冗余字段
-- episode_count 改为实时查询 topic_podcasts 表

-- Migration completed successfully
-- Version: 4
-- Applied at: 2025-11-20
