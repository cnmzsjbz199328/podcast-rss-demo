# 数据库迁移方案

## 一、当前数据库状态

### 1.1 已存在的表

✅ **现有表**（在 `podcast-database` D1 数据库中）:
- `episodes` - 新闻播客剧集表
- `news_sources` - 新闻源记录表
- `generation_tasks` - 生成任务表
- `topics` - 主题表（已存在！）
- `topic_podcasts` - 主题播客表（已存在！）

### 1.2 现有表结构对比

#### Topics 表 - 现有结构
```sql
CREATE TABLE topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  prompt_template TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_generated_at DATETIME,
  episodes_per_day INTEGER DEFAULT 1,
  total_episodes INTEGER DEFAULT 0
)
```

#### Topics 表 - TOPIC-PODCAST-PLANS 期望结构
```sql
CREATE TABLE topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,           -- ❌ 现有是 name
  description TEXT,               -- ✅ 已有
  keywords TEXT,                  -- ❌ 缺失
  category TEXT,                  -- ❌ 缺失
  status TEXT DEFAULT 'active',   -- ❌ 现有是 is_active (BOOLEAN)
  created_at TEXT NOT NULL,       -- ✅ 已有（类型为 DATETIME）
  updated_at TEXT NOT NULL        -- ✅ 已有（类型为 DATETIME）
)
```

**差异分析**:
- ✅ **保留字段**: `description`, `created_at`, `updated_at`
- 🔄 **需要重命名**: `name` → `title`
- 🔄 **需要转换**: `is_active` (BOOLEAN) → `status` (TEXT)
- ➕ **需要新增**: `keywords`, `category`
- ➖ **可以保留**: `prompt_template`, `last_generated_at`, `episodes_per_day`, `total_episodes` (用于扩展功能)

#### Topic_Podcasts 表 - 现有结构
```sql
CREATE TABLE topic_podcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  keywords TEXT,
  description TEXT,
  script_url TEXT,
  audio_url TEXT,
  srt_url TEXT,
  vtt_url TEXT,
  duration INTEGER,
  file_size INTEGER,
  word_count INTEGER,
  status TEXT DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME,
  tts_event_id TEXT,
  tts_status TEXT DEFAULT 'pending',
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  UNIQUE(topic_id, episode_number)
)
```

#### Topic_Podcasts 表 - TOPIC-PODCAST-PLANS 期望结构
```sql
CREATE TABLE topic_podcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER NOT NULL,
  episode_id TEXT NOT NULL,         -- ❌ 现有是 episode_number (INTEGER)
  status TEXT DEFAULT 'processing', -- ✅ 已有
  audio_url TEXT,                   -- ✅ 已有
  duration INTEGER,                 -- ✅ 已有
  created_at TEXT NOT NULL,         -- ✅ 已有（类型为 DATETIME）
  updated_at TEXT NOT NULL,         -- ❌ 缺失
  tts_event_id TEXT,                -- ✅ 已有
  FOREIGN KEY (topic_id) REFERENCES topics(id)
)
```

**差异分析**:
- ✅ **完全匹配**: `topic_id`, `status`, `audio_url`, `duration`, `tts_event_id`
- 🔄 **字段冲突**: `episode_number` (INTEGER) vs `episode_id` (TEXT)
- ➕ **需要新增**: `updated_at`
- ➕ **额外有用字段**: `title`, `keywords`, `description`, `script_url`, `srt_url`, `vtt_url`, `file_size`, `word_count`, `published_at`, `tts_status` (可保留用于增强功能)

---

## 二、迁移策略

### 策略选择: **增量迁移 + 向后兼容**

**原则**:
1. ✅ **保留所有现有字段** - 不破坏已有数据
2. ✅ **新增必要字段** - 满足 TOPIC-PODCAST-PLANS 需求
3. ✅ **添加虚拟列/视图** - 提供兼容层
4. ✅ **使用别名查询** - 代码层面映射字段名

**优势**:
- 不需要重建表，避免数据丢失
- 保持已有功能正常运行
- 支持未来功能扩展（如 `episodes_per_day`, `prompt_template`）

---

## 三、迁移脚本

### 3.1 Topics 表迁移

**文件**: `migrations/0001_enhance_topics_table.sql`

```sql
-- ============================================
-- Topics 表增量迁移
-- 目标: 添加 keywords 和 category 字段
-- 策略: 保留现有字段，通过应用层映射
-- ============================================

-- 1. 添加缺失字段
ALTER TABLE topics ADD COLUMN keywords TEXT;
ALTER TABLE topics ADD COLUMN category TEXT DEFAULT 'general';

-- 2. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_topics_category ON topics(category);
CREATE INDEX IF NOT EXISTS idx_topics_status ON topics(is_active);

-- 3. 更新现有记录的默认值（如果有数据）
UPDATE topics SET category = 'general' WHERE category IS NULL;

-- 4. 添加注释（通过元数据表记录字段映射关系）
CREATE TABLE IF NOT EXISTS _migration_metadata (
  version INTEGER PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  field_mappings TEXT  -- JSON 格式的字段映射
);

INSERT INTO _migration_metadata (version, description, field_mappings) VALUES (
  1,
  'Topics table enhancement - add keywords and category',
  '{
    "topics": {
      "title": "name",
      "status": "is_active"
    }
  }'
);
```

**字段映射说明**:
```javascript
// 在 TopicRepository 中使用别名
// name → title
// is_active → status (true/false → 'active'/'inactive')
```

### 3.2 Topic_Podcasts 表迁移

**文件**: `migrations/0002_enhance_topic_podcasts_table.sql`

```sql
-- ============================================
-- Topic_Podcasts 表增量迁移
-- 目标: 添加 updated_at 字段
-- 策略: 保留 episode_number，添加 episode_id 作为别名
-- ============================================

-- 1. 添加缺失字段
ALTER TABLE topic_podcasts ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE topic_podcasts ADD COLUMN episode_id TEXT;

-- 2. 为现有记录生成 episode_id（基于 topic_id 和 episode_number）
UPDATE topic_podcasts 
SET episode_id = 'topic-' || topic_id || '-ep-' || episode_number
WHERE episode_id IS NULL;

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_topic_podcasts_episode_id ON topic_podcasts(episode_id);
CREATE INDEX IF NOT EXISTS idx_topic_podcasts_updated_at ON topic_podcasts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_topic_podcasts_tts_status ON topic_podcasts(tts_status);

-- 4. 记录迁移元数据
INSERT INTO _migration_metadata (version, description, field_mappings) VALUES (
  2,
  'Topic_Podcasts table enhancement - add updated_at and episode_id',
  '{
    "topic_podcasts": {
      "episode_id": "generated from topic_id and episode_number"
    }
  }'
);
```

### 3.3 创建统一视图（可选）

**文件**: `migrations/0003_create_compatibility_views.sql`

```sql
-- ============================================
-- 创建兼容视图，提供统一的字段命名
-- 用途: 简化应用层代码
-- ============================================

-- Topics 兼容视图
CREATE VIEW IF NOT EXISTS v_topics AS
SELECT 
  id,
  name AS title,                                    -- 映射 name → title
  description,
  keywords,
  category,
  CASE WHEN is_active = 1 THEN 'active' 
       ELSE 'inactive' END AS status,               -- 映射 is_active → status
  created_at,
  updated_at,
  -- 额外字段
  prompt_template,
  last_generated_at,
  episodes_per_day,
  total_episodes
FROM topics;

-- Topic_Podcasts 兼容视图
CREATE VIEW IF NOT EXISTS v_topic_podcasts AS
SELECT 
  id,
  topic_id,
  episode_id,                                       -- 使用新增的 episode_id
  episode_number,                                   -- 保留原有字段
  title,
  keywords,
  description,
  script_url,
  audio_url,
  srt_url,
  vtt_url,
  duration,
  file_size,
  word_count,
  status,
  created_at,
  updated_at,
  published_at,
  tts_event_id,
  tts_status
FROM topic_podcasts;

-- 记录迁移
INSERT INTO _migration_metadata (version, description) VALUES (
  3,
  'Create compatibility views for unified field naming'
);
```

---

## 四、迁移执行流程

### 4.1 本地迁移（开发环境）

```bash
# 1. 执行迁移脚本（本地）
npx wrangler d1 execute podcast-database \
  --local \
  --file=migrations/0001_enhance_topics_table.sql

npx wrangler d1 execute podcast-database \
  --local \
  --file=migrations/0002_enhance_topic_podcasts_table.sql

npx wrangler d1 execute podcast-database \
  --local \
  --file=migrations/0003_create_compatibility_views.sql

# 2. 验证迁移结果
npx wrangler d1 execute podcast-database \
  --local \
  --command "SELECT * FROM _migration_metadata ORDER BY version;"

# 3. 测试视图查询
npx wrangler d1 execute podcast-database \
  --local \
  --command "SELECT id, title, status FROM v_topics LIMIT 5;"
```

### 4.2 生产迁移（远程数据库）

```bash
# ⚠️ 重要: 先备份生产数据库
# Cloudflare D1 会自动备份，但建议手动导出

# 1. 导出当前数据（备份）
npx wrangler d1 execute podcast-database \
  --remote \
  --command ".dump" > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 执行生产迁移
npx wrangler d1 execute podcast-database \
  --remote \
  --file=migrations/0001_enhance_topics_table.sql

npx wrangler d1 execute podcast-database \
  --remote \
  --file=migrations/0002_enhance_topic_podcasts_table.sql

npx wrangler d1 execute podcast-database \
  --remote \
  --file=migrations/0003_create_compatibility_views.sql

# 3. 验证生产环境
npx wrangler d1 execute podcast-database \
  --remote \
  --command "SELECT * FROM _migration_metadata ORDER BY version;"
```

### 4.3 使用 Wrangler Migrations（推荐）

Cloudflare D1 支持自动迁移管理：

**步骤**:
1. 将迁移脚本放入 `migrations/` 目录
2. 在 `wrangler.toml` 中配置迁移目录
3. 使用 `wrangler d1 migrations apply` 自动执行

**Wrangler.toml 配置**:
```toml
[[d1_databases]]
binding = "DB"
database_name = "podcast-database"
database_id = "35f75221-6253-4202-8aa7-a285a29432fb"
migrations_dir = "migrations"  # 指定迁移目录
```

**执行命令**:
```bash
# 本地应用迁移
npx wrangler d1 migrations apply podcast-database --local

# 生产应用迁移
npx wrangler d1 migrations apply podcast-database --remote
```

---

## 五、代码适配方案

### 5.1 TopicRepository 字段映射

**文件**: `src/repositories/TopicRepository.js`

```javascript
export class TopicRepository {
  constructor(db) {
    this.db = db;
    this.logger = new Logger('TopicRepository');
  }

  /**
   * 创建主题（使用原生字段名）
   */
  async create(topicData) {
    const { title, description, keywords, category, status = 'active' } = topicData;
    
    const result = await this.db.prepare(`
      INSERT INTO topics (name, description, keywords, category, is_active)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      title,                      // title → name
      description,
      keywords,
      category,
      status === 'active' ? 1 : 0 // status → is_active
    ).run();

    return result.meta.last_row_id;
  }

  /**
   * 查询主题（使用视图）
   */
  async getTopic(topicId) {
    const result = await this.db.prepare(`
      SELECT * FROM v_topics WHERE id = ?
    `).bind(topicId).first();

    return result; // 直接返回，字段已映射（title, status）
  }

  /**
   * 查询主题列表（使用视图）
   */
  async getTopics(filters = {}) {
    const { status, category, limit = 20, offset = 0 } = filters;
    
    let query = 'SELECT * FROM v_topics WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await this.db.prepare(query).bind(...params).all();
    return result.results;
  }
}
```

### 5.2 TopicPodcastRepository 适配

**文件**: `src/repositories/TopicPodcastRepository.js`

```javascript
export class TopicPodcastRepository {
  constructor(db) {
    this.db = db;
    this.logger = new Logger('TopicPodcastRepository');
  }

  /**
   * 创建主题播客
   */
  async create(data) {
    const { topicId, episodeId, status, ttsEventId } = data;
    
    // 自动生成 episode_number（基于当前主题的播客数量）
    const countResult = await this.db.prepare(`
      SELECT COALESCE(MAX(episode_number), 0) + 1 as next_number
      FROM topic_podcasts WHERE topic_id = ?
    `).bind(topicId).first();

    const episodeNumber = countResult.next_number;

    await this.db.prepare(`
      INSERT INTO topic_podcasts (
        topic_id, episode_id, episode_number, status, tts_event_id
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(topicId, episodeId, episodeNumber, status, ttsEventId || null).run();

    return episodeId;
  }

  /**
   * 根据 episode_id 查询（使用视图）
   */
  async getById(episodeId) {
    const result = await this.db.prepare(`
      SELECT * FROM v_topic_podcasts WHERE episode_id = ?
    `).bind(episodeId).first();

    return result;
  }

  /**
   * 根据主题查询播客列表（使用视图）
   */
  async getByTopic(topicId, filters = {}) {
    const { status, limit = 10, offset = 0 } = filters;
    
    let query = 'SELECT * FROM v_topic_podcasts WHERE topic_id = ?';
    const params = [topicId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await this.db.prepare(query).bind(...params).all();
    return result.results;
  }
}
```

---

## 六、验证测试

### 6.1 迁移后数据验证

```bash
# 1. 检查迁移版本
npx wrangler d1 execute podcast-database --local \
  --command "SELECT * FROM _migration_metadata;"

# 2. 验证 topics 表结构
npx wrangler d1 execute podcast-database --local \
  --command "PRAGMA table_info(topics);"

# 3. 验证 topic_podcasts 表结构
npx wrangler d1 execute podcast-database --local \
  --command "PRAGMA table_info(topic_podcasts);"

# 4. 测试视图查询
npx wrangler d1 execute podcast-database --local \
  --command "SELECT id, title, status, category FROM v_topics LIMIT 3;"

# 5. 测试插入数据
npx wrangler d1 execute podcast-database --local \
  --command "INSERT INTO topics (name, description, keywords, category, is_active) 
             VALUES ('AI Technology', 'Latest AI trends', 'AI, ML, LLM', 'technology', 1);"

# 6. 验证视图映射
npx wrangler d1 execute podcast-database --local \
  --command "SELECT id, title, status FROM v_topics WHERE id = last_insert_rowid();"
```

### 6.2 Repository 集成测试

创建测试文件: `tests/integration/test-topic-repository.js`

```javascript
import { TopicRepository } from '../../src/repositories/TopicRepository.js';

// 测试用例
async function testTopicRepository(env) {
  const repo = new TopicRepository(env.DB);

  // 1. 创建主题
  const topicId = await repo.create({
    title: 'JavaScript Advanced',
    description: 'Deep dive into JS',
    keywords: 'JavaScript, ES6, TypeScript',
    category: 'programming',
    status: 'active'
  });
  
  console.log('Created topic:', topicId);

  // 2. 查询主题
  const topic = await repo.getTopic(topicId);
  console.log('Retrieved topic:', topic);

  // 验证字段映射
  assert(topic.title === 'JavaScript Advanced', 'Title should be mapped from name');
  assert(topic.status === 'active', 'Status should be mapped from is_active');

  // 3. 查询列表
  const topics = await repo.getTopics({ category: 'programming', limit: 5 });
  console.log('Topics list:', topics);

  console.log('✅ All tests passed!');
}
```

---

## 七、回滚方案

如果迁移出现问题，可以快速回滚：

### 7.1 删除新增字段（可选）

```sql
-- ⚠️ SQLite 不支持 ALTER TABLE DROP COLUMN
-- 如需完全回滚，需要重建表（不推荐，会丢失新数据）

-- 安全方案: 保留字段，只删除视图和索引
DROP VIEW IF EXISTS v_topics;
DROP VIEW IF EXISTS v_topic_podcasts;
DROP INDEX IF EXISTS idx_topics_category;
DROP INDEX IF EXISTS idx_topic_podcasts_episode_id;

-- 删除迁移记录
DELETE FROM _migration_metadata WHERE version >= 1;
```

### 7.2 从备份恢复（极端情况）

```bash
# 1. 停止所有写入操作
# 2. 从备份文件恢复
npx wrangler d1 execute podcast-database --remote --file=backup_20251119_220000.sql
```

---

## 八、执行清单

### ✅ 迁移前检查

- [ ] 确认数据库绑定正确 (`wrangler.toml`)
- [ ] 检查现有数据表结构 (`sqlite_master`)
- [ ] 备份生产数据库（导出 SQL）
- [ ] 在本地环境测试迁移脚本

### ✅ 迁移执行

- [ ] 创建 `migrations/` 目录
- [ ] 编写迁移脚本（0001, 0002, 0003）
- [ ] 本地执行迁移并验证
- [ ] 生产环境执行迁移
- [ ] 验证数据完整性

### ✅ 代码适配

- [ ] 实现 `TopicRepository` 字段映射
- [ ] 实现 `TopicPodcastRepository` 字段映射
- [ ] 更新 `ServiceInitializer` 注册 Repository
- [ ] 编写单元测试和集成测试

### ✅ 部署验证

- [ ] 本地测试通过
- [ ] 部署到生产环境
- [ ] 运行端到端测试
- [ ] 监控日志和错误

---

## 九、时间估算

| 阶段 | 任务 | 预计时间 |
|------|------|---------|
| 1 | 编写迁移脚本 | 30分钟 |
| 2 | 本地测试迁移 | 20分钟 |
| 3 | 实现 Repository 适配 | 1小时 |
| 4 | 编写集成测试 | 30分钟 |
| 5 | 生产环境迁移 | 15分钟 |
| 6 | 验证和监控 | 15分钟 |
| **总计** | | **约 2.5 小时** |

---

## 十、总结

### 优势

✅ **零数据丢失** - 增量迁移，保留所有现有字段  
✅ **向后兼容** - 通过视图和别名提供统一接口  
✅ **渐进式改造** - 可以逐步迁移代码，不需要一次性重写  
✅ **可扩展性** - 保留额外字段（如 `episodes_per_day`）支持未来功能  

### 风险

⚠️ **字段映射复杂性** - 需要在代码层维护映射关系  
⚠️ **性能开销** - 视图查询可能比直接表查询稍慢（可接受）  

### 建议

1. **优先使用视图** - 简化代码，统一字段命名
2. **记录映射关系** - 在 `_migration_metadata` 表中保存 JSON 映射
3. **逐步迁移代码** - 先实现 Repository，再改造 Service 层
4. **监控性能** - 如果视图查询慢，考虑创建物化视图或索引优化

---

**准备好开始迁移了吗？** 我可以帮你：
1. 创建迁移脚本文件
2. 在本地执行测试
3. 实现 Repository 代码适配
