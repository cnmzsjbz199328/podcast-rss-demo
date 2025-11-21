-- ============================================
-- User feedback tables creation migration
-- 创建用户反馈相关表
-- ============================================

-- 用户反馈主表
CREATE TABLE user_feedback (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL,
  user_id TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (episode_id) REFERENCES topic_podcasts(episode_id)
);

-- 用户反馈问题标签表
CREATE TABLE user_feedback_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feedback_id TEXT NOT NULL,
  issue TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (feedback_id) REFERENCES user_feedback(id) ON DELETE CASCADE
);

-- 创建索引以提高查询性能
CREATE INDEX idx_user_feedback_episode_id ON user_feedback(episode_id);
CREATE INDEX idx_user_feedback_rating ON user_feedback(rating);
CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at);
CREATE INDEX idx_user_feedback_issues_feedback_id ON user_feedback_issues(feedback_id);
CREATE INDEX idx_user_feedback_issues_issue ON user_feedback_issues(issue);

-- 插入迁移记录
INSERT INTO _migration_metadata (version, description, applied_at) VALUES (
  6,
  'Create user feedback tables for collecting and analyzing user feedback on podcast episodes',
  datetime('now')
);
