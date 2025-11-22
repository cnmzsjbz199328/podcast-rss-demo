-- ============================================
-- Recreate topics table without redundant fields
-- 重新创建topics表，移除冗余字段status，只保留is_active
-- ============================================

-- 删除旧的topics表
DROP TABLE IF EXISTS topics;

-- 重新创建topics表（移除status字段）
CREATE TABLE topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  keywords TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT 1,
  generation_interval_hours INTEGER DEFAULT 24,
  last_generated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_topics_category ON topics(category);
CREATE INDEX IF NOT EXISTS idx_topics_is_active ON topics(is_active);
CREATE INDEX IF NOT EXISTS idx_topics_last_generated ON topics(last_generated_at);
CREATE INDEX IF NOT EXISTS idx_topics_created_at ON topics(created_at DESC);

-- 插入测试数据：IELTS Test Strategies主题
INSERT INTO topics (
  title,
  description,
  keywords,
  category,
  is_active,
  generation_interval_hours,
  created_at,
  updated_at
) VALUES (
  'IELTS Test Strategies',
  'Master IELTS test-taking strategies including listening, reading, writing, and speaking techniques. Learn proven methods to improve your score and achieve your target band.',
  'IELTS, test strategies, exam preparation, English proficiency, listening skills, reading comprehension, writing techniques, speaking practice',
  'education',
  1,
  48,
  datetime('now'),
  datetime('now')
);

-- 插入迁移记录
INSERT INTO _migration_metadata (version, description, applied_at) VALUES (
  8,
  'Recreate topics table without redundant status field, add IELTS test strategies topic',
  datetime('now')
);
