-- Migration: Enhance topic_podcasts table for series information
-- Description: Add full episode information fields for series management
-- Date: 2025-11-20

-- 为 topic_podcasts 表添加完整剧集信息字段

-- 添加剧集基本信息字段
ALTER TABLE topic_podcasts ADD COLUMN episode_number INTEGER DEFAULT 1;
ALTER TABLE topic_podcasts ADD COLUMN title TEXT;
ALTER TABLE topic_podcasts ADD COLUMN keywords TEXT;
ALTER TABLE topic_podcasts ADD COLUMN abstract TEXT;

-- 添加文件链接字段
ALTER TABLE topic_podcasts ADD COLUMN script_url TEXT;
ALTER TABLE topic_podcasts ADD COLUMN srt_url TEXT;
ALTER TABLE topic_podcasts ADD COLUMN vtt_url TEXT;
ALTER TABLE topic_podcasts ADD COLUMN json_url TEXT;

-- 为现有记录分配剧集编号（按创建时间排序）
-- 使用子查询为每个主题的播客分配连续的剧集编号
UPDATE topic_podcasts
SET episode_number = (
  SELECT COUNT(*) + 1
  FROM topic_podcasts AS tp2
  WHERE tp2.topic_id = topic_podcasts.topic_id
    AND tp2.created_at < topic_podcasts.created_at
);

-- 如果上面的更新没有生效（可能因为没有created_at字段），使用更简单的方法
-- 为没有剧集编号的记录分配默认值
UPDATE topic_podcasts
SET episode_number = 1
WHERE episode_number IS NULL OR episode_number = 0;

-- 创建唯一约束（确保每个主题的剧集编号唯一）
-- 注意：这可能会失败如果已有重复数据，届时需要手动清理
CREATE UNIQUE INDEX IF NOT EXISTS idx_topic_episode_number ON topic_podcasts(topic_id, episode_number);

-- 创建其他索引
CREATE INDEX IF NOT EXISTS idx_topic_podcasts_episode_number ON topic_podcasts(episode_number);
CREATE INDEX IF NOT EXISTS idx_topic_podcasts_title ON topic_podcasts(title);
CREATE INDEX IF NOT EXISTS idx_topic_podcasts_keywords ON topic_podcasts(keywords);

-- Migration completed successfully
-- Version: 5
-- Applied at: 2025-11-20
