# AI 播客生成系统 - 完整指南

> **基于 Cloudflare Workers + R2 + D1 的全自动播客生成系统**

## 📋 目录

- [项目概述](#项目概述)
- [快速开始](#快速开始)
- [架构设计](#架构设计)
- [部署指南](#部署指南)
- [API 文档](#api-文档)
- [测试说明](#测试说明)
- [故障排除](#故障排除)
- [开发指南](#开发指南)

---

## 项目概述

### 功能特性

✅ **自动化播客生成**
- 从 BBC RSS 自动获取最新新闻
- 使用 Google Gemini AI 生成播客脚本
- 使用 IndexTTS 进行语音合成
- 自动上传到 Cloudflare R2 存储
- 自动保存元数据到 D1 数据库

✅ **多种播报风格**
- `news-anchor` - 专业新闻主播风格
- `guo-de-gang` - 郭德纲相声风格
- `emotional` - 情感化播报风格

✅ **完整的 API 接口**
- RESTful API 设计
- RSS Feed 自动生成
- 剧集列表查询
- 剧集详情查询
- 健康检查接口

✅ **生产级别部署**
- Cloudflare Workers 边缘计算
- R2 对象存储（无限存储空间）
- D1 SQLite 数据库
- 全球 CDN 加速

### 技术栈

- **运行环境**: Cloudflare Workers (V8 Isolates)
- **编程语言**: JavaScript (ES Modules)
- **AI 服务**: Google Gemini 1.5 Flash
- **语音合成**: IndexTTS v2 (HuggingFace)
- **存储**: Cloudflare R2 (S3 兼容)
- **数据库**: Cloudflare D1 (SQLite)
- **部署工具**: Wrangler CLI

### 项目结构

```
podcast-rss-demo/
├── src/                          # 源代码
│   ├── core/                     # 核心业务逻辑
│   │   ├── NewsProcessor.js      # 新闻处理器
│   │   └── PodcastGenerator.js   # 播客生成器
│   ├── implementations/          # 服务实现
│   │   ├── BbcRssService.js      # BBC RSS 服务
│   │   ├── GeminiScriptService.js    # Gemini 脚本生成
│   │   ├── IndexTtsVoiceServiceHttp.js # TTS 语音服务
│   │   ├── R2StorageServiceWorker.js   # R2 存储服务
│   │   └── D1DatabaseService.js  # D1 数据库服务
│   ├── services/                 # 服务接口定义
│   ├── utils/                    # 工具函数
│   └── types/                    # 类型定义
├── worker.js                     # Worker 入口文件
├── schema.sql                    # D1 数据库 Schema
├── wrangler.toml                 # Wrangler 配置
├── package.json                  # 项目配置
└── test-production-e2e.js        # E2E 测试

docs/                             # 文档（已归档）
scripts/                          # 部署脚本（已归档）
tests/                            # 单元测试（已归档）
```

---

## 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm >= 8.0.0
- Cloudflare 账户
- Wrangler CLI (`npm install -g wrangler`)

### 环境变量配置

1. **登录 Cloudflare**:
```bash
npx wrangler login
```

2. **配置环境变量** (`.env`):
```bash
# Gemini AI API Key (必需)
GEMINI_API_KEY=your_gemini_api_key

# BBC RSS URL (可选，已有默认值)
BBC_RSS_URL=https://feeds.bbci.co.uk/news/rss.xml
```

3. **设置 Worker Secrets**:
```bash
# Gemini API Key
npx wrangler secret put GEMINI_API_KEY
```

### 一键部署

```bash
# 1. 安装依赖
npm install

# 2. 创建 R2 Bucket
npx wrangler r2 bucket create podcast-files

# 3. 创建 D1 数据库
npx wrangler d1 create podcast-database
# 复制输出的 database_id 到 wrangler.toml

# 4. 运行数据库迁移
npx wrangler d1 execute podcast-database --remote --file=./schema.sql

# 5. 部署到生产环境
npx wrangler deploy

# 6. 测试部署
npm run test:production
```

### 本地开发

```bash
# 启动本地开发服务器
npm run dev

# 访问 http://localhost:8787
# 测试 API
curl http://localhost:8787/health
```

---

## 架构设计

### 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                  Cloudflare Workers                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │            worker.js (入口)                     │   │
│  │  ┌───────────────────────────────────────────┐  │   │
│  │  │      PodcastGenerator (核心)              │  │   │
│  │  │  ┌─────────────────────────────────────┐  │  │   │
│  │  │  │  1. BBC RSS Service (新闻获取)     │  │  │   │
│  │  │  │     ↓                               │  │  │   │
│  │  │  │  2. Gemini Script Service (AI脚本)  │  │  │   │
│  │  │  │     ↓                               │  │  │   │
│  │  │  │  3. IndexTTS Voice Service (语音)   │  │  │   │
│  │  │  │     ↓                               │  │  │   │
│  │  │  │  4. R2 Storage Service (存储)       │  │  │   │
│  │  │  │     ↓                               │  │  │   │
│  │  │  │  5. D1 Database Service (元数据)    │  │  │   │
│  │  │  └─────────────────────────────────────┘  │  │   │
│  │  └───────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
           │                            │
           ↓                            ↓
    ┌─────────────┐            ┌──────────────┐
    │ R2 Storage  │            │ D1 Database  │
    │ (音频文件)   │            │ (剧集元数据)  │
    └─────────────┘            └──────────────┘
```

### 数据流

1. **新闻获取**: BBC RSS → XML 解析 → 新闻列表
2. **脚本生成**: 新闻列表 → Gemini AI → 播客脚本
3. **语音合成**: 播客脚本 → IndexTTS → 音频文件
4. **文件存储**: 音频文件 → R2 Bucket → 公开 URL
5. **元数据保存**: 剧集信息 → D1 Database → 持久化
6. **RSS 生成**: D1 查询 → XML 生成 → RSS Feed

### 数据库设计

**episodes 表** (播客剧集):
```sql
CREATE TABLE episodes (
  id TEXT PRIMARY KEY,              -- 剧集唯一ID
  title TEXT NOT NULL,              -- 标题
  description TEXT,                 -- 描述
  style TEXT NOT NULL,              -- 风格
  audio_url TEXT NOT NULL,          -- 音频URL
  audio_key TEXT NOT NULL,          -- R2存储键
  duration INTEGER DEFAULT 0,       -- 时长(秒)
  file_size INTEGER DEFAULT 0,      -- 文件大小(字节)
  transcript TEXT,                  -- 文字稿
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT,                -- 发布时间
  status TEXT DEFAULT 'draft',      -- 状态
  metadata TEXT                     -- JSON元数据
);
```

---

## 部署指南

### 第一步：创建 R2 Bucket

```bash
# 创建 bucket
npx wrangler r2 bucket create podcast-files

# 查看 bucket 列表
npx wrangler r2 bucket list
```

**配置公网访问**:
1. 登录 Cloudflare Dashboard
2. 进入 R2 → podcast-files
3. 点击 "Settings" → "Public Access"
4. 启用 "Allow Access" 或配置自定义域名
5. 复制 Public URL，更新到 `wrangler.toml` 的 `R2_BASE_URL`

### 第二步：创建 D1 数据库

```bash
# 创建数据库
npx wrangler d1 create podcast-database

# 输出示例:
# database_id = "35f75221-6253-4202-8aa7-a285a29432fb"
```

**更新 wrangler.toml**:
```toml
[[d1_databases]]
binding = "DB"
database_name = "podcast-database"
database_id = "35f75221-6253-4202-8aa7-a285a29432fb"  # 替换为实际ID
```

### 第三步：运行数据库迁移

```bash
# 远程执行
npx wrangler d1 execute podcast-database --remote --file=./schema.sql

# 验证表创建
npx wrangler d1 execute podcast-database --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

### 第四步：配置环境变量

**wrangler.toml** (公开配置):
```toml
[vars]
BBC_RSS_URL = "https://feeds.bbci.co.uk/news/rss.xml"
NODE_ENV = "production"
R2_BASE_URL = "https://pub-xxxxx.r2.dev"
```

**Secrets** (敏感配置):
```bash
# Gemini API Key
npx wrangler secret put GEMINI_API_KEY
# 输入时会隐藏，粘贴后按回车
```

### 第五步：部署

```bash
# 部署到生产
npx wrangler deploy

# 输出:
# Deployed podcast-rss-demo
# https://podcast-rss-demo.your-account.workers.dev
```

### 第六步：验证部署

```bash
# 方法1：使用测试脚本
npm run test:production

# 方法2：手动测试
export WORKER_URL="https://podcast-rss-demo.your-account.workers.dev"

# 健康检查
curl $WORKER_URL/health

# 查看剧集列表
curl $WORKER_URL/episodes

# 生成播客（耗时约30秒）
curl -X POST "$WORKER_URL/generate?style=news-anchor"

# RSS Feed
curl $WORKER_URL/rss.xml
```

---

## API 文档

### 基础信息

**Base URL**: `https://podcast-rss-demo.your-account.workers.dev`

**认证**: 无需认证（公开API）

**响应格式**: JSON / XML (RSS)

### 端点列表

#### 1. 获取 API 信息

```http
GET /
```

**响应示例**:
```json
{
  "name": "Podcast RSS API",
  "version": "2.0.0",
  "description": "由AI生成的新闻播客服务，支持多种播报风格",
  "endpoints": {
    "GET /rss.xml": { "description": "获取RSS Feed" },
    "POST /generate": { "description": "生成播客" },
    "GET /episodes": { "description": "获取剧集列表" },
    "GET /episodes/:id": { "description": "获取剧集详情" },
    "GET /health": { "description": "健康检查" }
  }
}
```

#### 2. 健康检查

```http
GET /health
```

**响应示例**:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-03T12:00:00.000Z",
  "services": {
    "database": true,
    "storage": true,
    "databaseStats": {
      "totalEpisodes": 10,
      "publishedEpisodes": 8
    },
    "storageStats": {
      "audioFiles": 8,
      "totalSize": 52428800
    }
  }
}
```

#### 3. 生成播客

```http
POST /generate?style={style}
```

**参数**:
- `style` (必需): 播报风格
  - `news-anchor` - 专业新闻主播
  - `guo-de-gang` - 郭德纲相声风格
  - `emotional` - 情感化播报

**响应示例**:
```json
{
  "success": true,
  "data": {
    "episodeId": "news-anchor-2025-11-03T12-00-00-abc123",
    "title": "今日热点播报 - 11月3日",
    "description": "今日热点新闻...",
    "style": "news-anchor",
    "newsCount": 10,
    "duration": 373,
    "audioUrl": "https://pub-xxxxx.r2.dev/audio/...",
    "scriptUrl": "https://pub-xxxxx.r2.dev/scripts/...",
    "generatedAt": "2025-11-03T12:00:00.000Z"
  }
}
```

**耗时**: 约 25-35 秒

#### 4. 获取剧集列表

```http
GET /episodes?limit={limit}&offset={offset}&style={style}
```

**参数**:
- `limit` (可选): 每页数量，默认 20
- `offset` (可选): 偏移量，默认 0
- `style` (可选): 按风格筛选

**响应示例**:
```json
{
  "success": true,
  "data": {
    "episodes": [
      {
        "id": "news-anchor-2025-11-03...",
        "title": "今日热点播报",
        "description": "...",
        "audioUrl": "https://...",
        "style": "news-anchor",
        "duration": 373,
        "fileSize": 5242880,
        "publishedAt": "2025-11-03T12:00:00.000Z",
        "createdAt": "2025-11-03T12:00:00.000Z"
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 10
    }
  }
}
```

#### 5. 获取剧集详情

```http
GET /episodes/{id}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "news-anchor-2025-11-03...",
    "title": "今日热点播报",
    "description": "...",
    "audioUrl": "https://...",
    "scriptUrl": "https://...",
    "style": "news-anchor",
    "duration": 373,
    "fileSize": 5242880,
    "transcript": "各位听众...",
    "metadata": {
      "newsCount": 10,
      "generatedAt": "2025-11-03T12:00:00.000Z"
    },
    "publishedAt": "2025-11-03T12:00:00.000Z",
    "createdAt": "2025-11-03T12:00:00.000Z"
  }
}
```

#### 6. RSS Feed

```http
GET /rss.xml
```

**响应**: RSS 2.0 XML 格式

**使用方式**:
- 将 URL 添加到播客客户端（Apple Podcasts, Spotify 等）
- 自动获取最新剧集

---

## 测试说明

### 端到端测试

```bash
# 快速测试（跳过播客生成）
npm run test:production

# 完整测试（包含播客生成，约3分钟）
npm run test:production:full
```

### 测试覆盖

✅ **基础设施测试**
- Worker 部署验证
- R2 存储连接
- D1 数据库连接
- 健康检查接口

✅ **功能测试**
- 新闻获取 (BBC RSS)
- AI 脚本生成 (Gemini)
- 语音合成 (IndexTTS)
- 文件上传 (R2)
- 数据库存储 (D1)
- 剧集查询 API
- RSS Feed 生成

✅ **集成测试**
- 完整播客生成流程
- 端到端数据流验证
- API 响应格式验证

### 手动测试命令

```bash
# 设置 Worker URL
export WORKER_URL="https://your-worker.workers.dev"

# 1. 健康检查
curl $WORKER_URL/health | jq '.'

# 2. 生成播客
curl -X POST "$WORKER_URL/generate?style=news-anchor" | jq '.'

# 3. 查看剧集列表
curl "$WORKER_URL/episodes?limit=5" | jq '.'

# 4. 查看 RSS Feed
curl $WORKER_URL/rss.xml | head -50

# 5. 查询数据库
npx wrangler d1 execute podcast-database --remote \
  --command="SELECT id, title, style, created_at FROM episodes LIMIT 5;"

# 6. 查看 R2 文件
npx wrangler r2 object list podcast-files --limit 10
```

---

## 故障排除

### 常见问题

#### 1. 播客生成失败

**症状**: 
```
POST /generate 返回 500 错误
```

**可能原因**:
- Gemini API Key 未配置或无效
- IndexTTS 服务超时
- 网络连接问题

**解决方案**:
```bash
# 检查 Secret
npx wrangler secret list

# 重新设置 API Key
npx wrangler secret put GEMINI_API_KEY

# 查看实时日志
npx wrangler tail --format pretty
```

#### 2. 数据库连接失败

**症状**:
```
GET /health 返回 database: false
```

**解决方案**:
```bash
# 验证数据库配置
npx wrangler d1 list

# 检查 wrangler.toml 中的 database_id 是否正确

# 测试数据库连接
npx wrangler d1 execute podcast-database --remote \
  --command="SELECT 1;"
```

#### 3. R2 文件访问失败

**症状**:
```
音频 URL 返回 403 或 404
```

**解决方案**:
```bash
# 1. 检查 R2 公网访问配置
npx wrangler r2 bucket list

# 2. 在 Cloudflare Dashboard 启用 Public Access

# 3. 更新 wrangler.toml 中的 R2_BASE_URL

# 4. 重新部署
npx wrangler deploy
```

#### 4. 剧集未保存到数据库

**症状**:
```
播客生成成功但 GET /episodes 返回空列表
```

**调试步骤**:
```bash
# 1. 查看实时日志
npx wrangler tail

# 2. 在生成播客时观察日志输出，寻找 "Episode saved to database" 或错误信息

# 3. 手动查询数据库
npx wrangler d1 execute podcast-database --remote \
  --command="SELECT COUNT(*) as count FROM episodes;"

# 4. 检查 worker.js 中的数据库保存逻辑
```

### 查看日志

```bash
# 实时日志（推荐）
npx wrangler tail --format pretty

# 在另一个终端生成播客
curl -X POST "https://your-worker.workers.dev/generate?style=news-anchor"

# 日志输出示例:
# [INFO] Starting podcast generation...
# [INFO] Fetched 10 news items
# [INFO] Script generated successfully
# [INFO] Voice synthesis completed
# [INFO] Files uploaded to R2
# [INFO] Episode saved to database  ← 关键日志
```

### 调试技巧

1. **启用详细日志**: 在 `.env` 中设置 `LOG_LEVEL=debug`

2. **使用本地开发模式**:
```bash
npm run dev
# 可以直接在代码中添加 console.log
```

3. **检查 Worker 版本**:
```bash
npx wrangler deployments list
# 查看最近的部署记录
```

4. **回滚到上一版本**:
```bash
npx wrangler rollback
```

---

## 开发指南

### 本地开发

```bash
# 1. 克隆项目
git clone <repository-url>
cd podcast-rss-demo

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 添加 GEMINI_API_KEY

# 4. 启动开发服务器
npm run dev

# 5. 访问
# http://localhost:8787
```

### 代码结构说明

**核心类**:
- `PodcastGenerator`: 播客生成主控制器
- `NewsProcessor`: 新闻内容处理
- `*Service`: 各种服务的接口定义
- `*ServiceImpl`: 服务的具体实现

**工具函数**:
- `logger.js`: 日志工具
- `retryUtils.js`: 重试逻辑
- `validator.js`: 数据验证
- `fileUtils.js`: 文件处理

### 添加新的播报风格

1. 在 `src/implementations/GeminiScriptService.js` 添加风格配置
2. 在 `src/implementations/IndexTtsVoiceServiceHttp.js` 添加语音配置
3. 更新 API 文档

### 性能优化建议

1. **使用 Cron Trigger 定时生成**:
```toml
# wrangler.toml
[triggers]
crons = ["0 8 * * *"]  # 每天早上8点
```

2. **启用 R2 Cache**:
```javascript
// 在 R2 上传时设置缓存
httpMetadata: {
  cacheControl: 'public, max-age=31536000'
}
```

3. **数据库索引优化**:
```sql
CREATE INDEX idx_episodes_style ON episodes(style);
CREATE INDEX idx_episodes_published_at ON episodes(published_at DESC);
```

---

## 附录

### 相关链接

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare R2 文档](https://developers.cloudflare.com/r2/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Google Gemini API](https://ai.google.dev/)
- [IndexTTS Demo](https://huggingface.co/spaces/IndexTeam/IndexTTS-2-Demo)

### License

MIT

### 作者

tangjiang

### 最后更新

2025年11月3日
