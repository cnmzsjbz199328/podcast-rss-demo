# 🎙️ 主题播客功能扩展计划

## 📋 项目概述

在现有的新闻播客系统基础上，扩展主题播客功能，实现多个主题的自动内容生成和管理。主题播客与新闻播客并行运行，共用核心基础设施，但保持独立的内容创作逻辑。

## 🏗️ 架构设计

### 核心原则
- **模块化设计**: 主题播客与新闻播客并行，共享抽象接口
- **可扩展性**: 支持未来添加更多内容类型
- **数据一致性**: 统一的数据存储和管理
- **创作连续性**: 基于历史内容延续创作

## 📊 数据库设计

### 1. 主题表 (topics)
```sql
CREATE TABLE topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,           -- 主题名称，如"雅思考试策略"
  description TEXT,                    -- 主题描述
  is_active BOOLEAN DEFAULT true,      -- 是否激活
  prompt_template TEXT,                -- AI提示词模板

  -- 时间戳
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- 生成配置
  last_generated_at DATETIME,          -- 最后生成时间
  episodes_per_day INTEGER DEFAULT 1,  -- 每日生成集数

  -- 统计信息
  total_episodes INTEGER DEFAULT 0     -- 总集数
);
```

### 2. 主题播客表 (topic_podcasts)
```sql
CREATE TABLE topic_podcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER NOT NULL,           -- 外键关联主题
  episode_number INTEGER NOT NULL,     -- 特定主题的集数

  title TEXT NOT NULL,                 -- 标题
  keywords TEXT,                       -- 关键词组
  description TEXT,                    -- 详细描述

  -- 内容链接
  script_url TEXT,                     -- 脚本链接
  audio_url TEXT,                      -- 音频链接
  srt_url TEXT,                        -- 字幕链接
  vtt_url TEXT,                        -- VTT字幕链接

  -- 元数据
  duration INTEGER,                    -- 时长(秒)
  file_size INTEGER,                   -- 文件大小(bytes)
  word_count INTEGER,                  -- 字数统计

  -- 状态管理
  status TEXT DEFAULT 'draft',         -- draft/published/failed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME,

  -- TTS异步处理
  tts_event_id TEXT,                   -- 异步TTS事件ID
  tts_status TEXT DEFAULT 'pending',   -- pending/processing/completed/failed

  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  UNIQUE(topic_id, episode_number)      -- 同一主题的集数唯一
);
```

### 3. 索引优化
```sql
-- 主题表索引
CREATE INDEX idx_topics_active ON topics(is_active);
CREATE INDEX idx_topics_last_generated ON topics(last_generated_at);

-- 主题播客表索引
CREATE INDEX idx_topic_podcasts_topic_id ON topic_podcasts(topic_id);
CREATE INDEX idx_topic_podcasts_episode_number ON topic_podcasts(topic_id, episode_number);
CREATE INDEX idx_topic_podcasts_status ON topic_podcasts(status);
CREATE INDEX idx_topic_podcasts_tts_status ON topic_podcasts(tts_status);
CREATE INDEX idx_topic_podcasts_published_at ON topic_podcasts(published_at);
CREATE INDEX idx_topic_podcasts_created_at ON topic_podcasts(created_at);
```

## 🔄 接口设计

### 抽象接口 (IPodcastService)
```javascript
interface IPodcastService {
  // 生成播客
  async generatePodcast(context): Promise<PodcastResult>

  // 获取播客列表
  async getPodcasts(options): Promise<PodcastList>

  // 获取单个播客
  async getPodcastById(id): Promise<Podcast>

  // 轮询异步生成状态
  async pollGeneration(episodeId, eventId): Promise<PollResult>
}
```

### 具体实现
- **NewsPodcastService**: 继承IPodcastService，实现新闻播客逻辑
- **TopicPodcastService**: 继承IPodcastService，实现主题播客逻辑

## 🔧 核心组件

### 1. TopicPodcastGenerator
```javascript
class TopicPodcastGenerator {
  constructor(services, config) {
    this.services = services;
    this.workflow = new TopicPodcastWorkflow();
  }

  async generateForActiveTopics() {
    // 1. 获取所有激活的主题
    // 2. 为每个主题生成播客
    // 3. 返回生成结果
  }

  async generateForTopic(topicId) {
    // 1. 检查主题是否存在且激活
    // 2. 获取主题的历史播客
    // 3. 生成新的播客内容
    // 4. 保存到数据库
  }
}
```

### 2. TopicPodcastWorkflow
```javascript
class TopicPodcastWorkflow {
  async executeWorkflow(context) {
    const steps = [
      { name: 'analyzeHistory', fn: this._analyzeHistory.bind(this) },
      { name: 'generateScript', fn: this._generateScript.bind(this) },
      { name: 'generateAudio', fn: this._generateAudio.bind(this) },
      { name: 'generateSubtitles', fn: this._generateSubtitles.bind(this) },
      { name: 'storeFiles', fn: this._storeFiles.bind(this) },
      { name: 'saveMetadata', fn: this._saveMetadata.bind(this) }
    ];
  }
}
```

### 3. TopicScriptService
```javascript
class TopicScriptService {
  async generateScript(topic, historyPodcasts) {
    // 1. 构建提示词（包含主题信息和历史内容）
    // 2. 调用AI生成脚本
    // 3. 返回脚本内容和元数据
  }

  _buildPrompt(topic, historyPodcasts) {
    // 基于主题配置和历史播客构建AI提示词
  }
}
```

## 📋 API端点设计

### 主题管理API
```
GET    /api/topics              - 获取主题列表
POST   /api/topics              - 创建新主题
GET    /api/topics/:id          - 获取主题详情
PUT    /api/topics/:id          - 更新主题
DELETE /api/topics/:id          - 删除主题
POST   /api/topics/:id/toggle   - 切换主题激活状态

GET    /api/topics/:id/podcasts - 获取主题的播客列表
POST   /api/topics/:id/generate - 手动生成主题播客
GET    /api/topics/:id/podcasts/:episode/poll - 轮询生成状态
```

### RSS Feed API
```
GET    /rss/topics/:topicId.xml  - 主题专属RSS Feed
GET    /rss/topics.xml           - 所有主题的综合RSS Feed
```

## 🔄 工作流程

### 定时任务执行流程
```
1. Cron Trigger 触发 (阿德莱德时区)
2. 扫描激活的主题
3. 对每个激活主题:
   a. 检查是否需要生成新播客
   b. 获取最近10集历史内容
   c. 生成新的剧集内容
   d. 保存到数据库和存储
4. 发送通知/日志记录
```

### 手动生成流程
```
1. 用户请求生成特定主题播客
2. 验证主题存在且激活
3. 执行生成工作流
4. 返回生成结果或异步任务ID
5. 用户可轮询生成状态
```

## 🎯 实现步骤

### Phase 1: 数据库和基础架构 (3天)
1. 创建数据库迁移脚本
2. 实现TopicRepository和TopicPodcastRepository
3. 更新ServiceInitializer添加主题相关服务
4. 创建基础的TopicPodcastService抽象

### Phase 2: 核心生成逻辑 (4天)
1. 实现TopicScriptService（AI提示词构建）
2. 实现TopicPodcastWorkflow
3. 实现TopicPodcastGenerator
4. 添加主题播客的存储和验证逻辑

### Phase 3: API接口开发 (3天)
1. 实现主题管理API端点
2. 实现主题播客生成API
3. 实现RSS Feed生成
4. 添加API文档和测试

### Phase 4: 定时任务集成 (2天)
1. 修改定时任务同时处理新闻和主题播客
2. 实现主题激活状态检查
3. 添加错误处理和日志记录
4. 性能优化和监控

### Phase 5: 测试和部署 (2天)
1. 单元测试和集成测试
2. 端到端测试
3. 部署到生产环境
4. 监控和优化

## ⚠️ 风险评估

### 技术风险
- **AI提示词质量**: 主题内容的连续性和质量需要精心设计提示词
- **数据库性能**: 多主题并发生成可能造成数据库压力
- **存储成本**: 主题播客文件数量增长迅速

### 业务风险
- **内容重复**: 基于历史的延续创作可能导致内容重复
- **主题管理**: 需要定期维护和更新主题配置
- **用户体验**: 多主题RSS Feed可能造成信息过载

### 缓解措施
1. **提示词优化**: 实现动态提示词调整机制
2. **缓存策略**: 实现历史内容缓存减少数据库查询
3. **配额管理**: 设置每个主题的每日生成上限
4. **监控告警**: 实现生成质量和性能监控

## 📈 预期收益

### 功能扩展
- 支持无限主题播客创作
- 内容创作的连续性和专业性
- 用户定制化内容体验

### 技术价值
- 模块化架构的可扩展性
- 统一的接口设计模式
- AI创作流程的优化经验

### 业务价值
- 内容多样化提升用户粘性
- 自动化内容生产降低成本
- 数据驱动的内容创作优化

## 🔍 验收标准

### 功能验收
- [ ] 主题创建和管理功能正常
- [ ] 主题播客自动生成定时执行
- [ ] 基于历史内容的连续创作
- [ ] RSS Feed正确生成
- [ ] API接口完整且文档化

### 性能验收
- [ ] 生成响应时间<5分钟
- [ ] 数据库查询性能优化
- [ ] 存储成本控制合理
- [ ] 并发生成稳定性

### 质量验收
- [ ] 内容质量评分>8分
- [ ] 音频文件完整无损
- [ ] 字幕同步准确
- [ ] 错误处理完善

---

**总工期**: 约14个工作日
**风险等级**: 中等 (主要风险在AI内容质量控制)
**优先级**: 高 (扩展核心功能，增加用户价值)

请审阅此计划，如认可，我们将开始Phase 1的实施。</content>
</xai:function_call/>
<xai:function_call name="read_web_page">
<parameter name="url">/Users/tangjiang/podcast-rss-demo/TOPIC-PODCAST-PLANS.md
