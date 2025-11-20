-- ============================================
-- Topics table creation migration
-- 创建主题表，用于存储主题播客的主题信息
-- ============================================

-- 先创建迁移元数据表（如果不存在）
CREATE TABLE IF NOT EXISTS _migration_metadata (
  version INTEGER PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at TEXT,
  field_mappings TEXT
);

-- 创建topics表
CREATE TABLE topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  keywords TEXT,
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 创建索引以提高查询性能
CREATE INDEX idx_topics_category ON topics(category);
CREATE INDEX idx_topics_status ON topics(status);
CREATE INDEX idx_topics_created_at ON topics(created_at DESC);

-- 插入迁移记录
INSERT INTO _migration_metadata (version, description, field_mappings, applied_at) VALUES (
  1,
  'Create topics table for theme-based podcasts',
  '{
    "topics": {
      "id": "AUTO_INCREMENT",
      "title": "TEXT NOT NULL",
      "description": "TEXT",
      "keywords": "TEXT",
      "category": "TEXT DEFAULT general",
      "status": "TEXT DEFAULT active",
      "created_at": "TEXT NOT NULL",
      "updated_at": "TEXT NOT NULL"
    }
  }',
  datetime('now')
);
