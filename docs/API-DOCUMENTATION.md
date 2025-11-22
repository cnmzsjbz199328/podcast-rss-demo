# Podcast RSS API 文档

**版本**: 2.0.0  
**基础URL**: `https://podcast-rss-demo.tj15982183241.workers.dev`  
**协议**: HTTPS  
**内容类型**: JSON / XML (RSS)

---

## 📋 目录

1. [概述](#概述)
2. [认证](#认证)
3. [News播客 API](#news播客-api)
4. [主题播客 API](#主题播客-api)
5. [Feed & 系统 API](#feed--系统-api)
6. [测试 & 调试 API](#测试--调试-api)
7. [错误处理](#错误处理)
8. [数据模型](#数据模型)
9. [前端集成示例](#前端集成示例)

---

## 概述

这是一个由AI驱动的智能播客生成系统，支持两种模式：

- **News播客**: 基于BBC RSS源自动生成新闻播客
- **主题播客**: 基于用户定义主题生成系列播客，支持智能延续

### 支持的播客风格

| 风格 | 代码 | 描述 | 适用场景 |
|------|------|------|----------|
| 新闻主播 | `news-anchor` | 专业新闻播报风格 | News播客（默认） |
| 主题讲解 | `topic-explainer` | 深度讲解风格 | 主题播客（默认） |

### 音频生成模式

| 模式 | 参数 | 特点 | 适用场景 |
|------|------|------|----------|
| 同步生成 | `useAsyncTts=false` | 立即返回音频URL | 测试、小规模使用 |
| 异步生成 | `useAsyncTts=true` | 返回事件ID，需轮询 | 生产环境（默认） |

---

## 认证

当前版本为**公开API**，无需认证。所有接口支持CORS跨域访问。

**响应头**:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## News播客 API

### 1. 生成News播客

**端点**: `POST /generate`

**描述**: 从BBC RSS源获取最新新闻，生成播客内容并转换为音频。

**查询参数**:

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `style` | string | 否 | `news-anchor` | 播报风格 |
| `useAsyncTts` | boolean | 否 | `false` | 是否使用异步TTS |

**请求示例**:
```bash
# 同步生成（测试推荐）
curl -X POST "https://podcast-rss-demo.tj15982183241.workers.dev/generate?style=news-anchor&useAsyncTts=false"

# 异步生成（生产推荐）
curl -X POST "https://podcast-rss-demo.tj15982183241.workers.dev/generate?style=news-anchor&useAsyncTts=true"
```

**响应示例（同步）**:
```json
{
  "success": true,
  "episodeId": "episode-1732291200000",
  "title": "BBC News Podcast - November 22, 2024",
  "audioUrl": "https://pub-xxx.r2.dev/audio/episode-1732291200000.mp3",
  "scriptUrl": "https://pub-xxx.r2.dev/scripts/episode-1732291200000.txt",
  "subtitles": {
    "vtt": "https://pub-xxx.r2.dev/subtitles/episode-1732291200000.vtt",
    "srt": "https://pub-xxx.r2.dev/subtitles/episode-1732291200000.srt",
    "json": "https://pub-xxx.r2.dev/subtitles/episode-1732291200000.json"
  },
  "duration": 185,
  "wordCount": 523,
  "style": "news-anchor",
  "createdAt": "2024-11-22T14:00:00Z"
}
```

**响应示例（异步）**:
```json
{
  "success": true,
  "episodeId": "episode-1732291200000",
  "eventId": "async-audio-event-123456",
  "message": "Audio generation started. Use /episodes/{episodeId}/poll-audio?eventId={eventId} to check status",
  "pollUrl": "/episodes/episode-1732291200000/poll-audio?eventId=async-audio-event-123456"
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "Failed to fetch RSS feed",
  "details": "Network timeout"
}
```

---

### 2. 获取News播客列表

**端点**: `GET /episodes`

**描述**: 获取所有播客剧集列表（包含News和主题播客）。

**查询参数**:

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `limit` | number | 否 | `20` | 每页数量（1-100） |
| `offset` | number | 否 | `0` | 偏移量 |
| `style` | string | 否 | - | 风格过滤 (`news-anchor` / `topic-explainer`) |

**请求示例**:
```bash
# 获取前10个剧集
curl "https://podcast-rss-demo.tj15982183241.workers.dev/episodes?limit=10&offset=0"

# 仅获取News播客
curl "https://podcast-rss-demo.tj15982183241.workers.dev/episodes?style=news-anchor&limit=5"
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "episodes": [
      {
        "id": "episode-1732291200000",
        "title": "BBC News Podcast - November 22, 2024",
        "description": "Latest news from BBC covering politics, technology...",
        "audioUrl": "https://pub-xxx.r2.dev/audio/episode-1732291200000.mp3",
        "style": "news-anchor",
        "duration": 185,
        "fileSize": 0,
        "publishedAt": "2024-11-22T14:00:00Z",
        "createdAt": "2024-11-22T14:00:00Z"
      }
    ],
    "pagination": {
      "limit": 10,
      "offset": 0,
      "total": 42
    },
    "stats": {
      "totalEpisodes": 42,
      "publishedEpisodes": 38,
      "processingEpisodes": 4
    }
  }
}
```

---

### 3. 获取单个News播客详情

**端点**: `GET /episodes/{episodeId}`

**描述**: 获取指定剧集的详细信息。

**路径参数**:

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `episodeId` | string | 是 | 剧集ID |

**请求示例**:
```bash
curl "https://podcast-rss-demo.tj15982183241.workers.dev/episodes/episode-1732291200000"
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "episode": {
      "id": "episode-1732291200000",
      "title": "BBC News Podcast - November 22, 2024",
      "description": "Latest news from BBC covering politics...",
      "script": "Welcome to today's BBC news podcast...",
      "audioUrl": "https://pub-xxx.r2.dev/audio/episode-1732291200000.mp3",
      "scriptUrl": "https://pub-xxx.r2.dev/scripts/episode-1732291200000.txt",
      "subtitles": {
        "vtt": "https://pub-xxx.r2.dev/subtitles/episode-1732291200000.vtt",
        "srt": "https://pub-xxx.r2.dev/subtitles/episode-1732291200000.srt",
        "json": "https://pub-xxx.r2.dev/subtitles/episode-1732291200000.json"
      },
      "style": "news-anchor",
      "duration": 185,
      "wordCount": 523,
      "publishedAt": "2024-11-22T14:00:00Z",
      "createdAt": "2024-11-22T14:00:00Z",
      "sourceUrl": "https://feeds.bbci.co.uk/news/rss.xml",
      "keywords": ["politics", "technology", "economy"]
    }
  }
}
```

---

### 4. 轮询音频生成状态

**端点**: `GET /episodes/{episodeId}/poll-audio`

**描述**: 用于异步生成模式，轮询音频生成状态。

**路径参数**:

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `episodeId` | string | 是 | 剧集ID |

**查询参数**:

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `eventId` | string | 是 | 异步事件ID |

**请求示例**:
```bash
curl "https://podcast-rss-demo.tj15982183241.workers.dev/episodes/episode-1732291200000/poll-audio?eventId=async-audio-event-123456"
```

**响应示例（处理中）**:
```json
{
  "status": "processing",
  "message": "Audio generation in progress",
  "progress": 45,
  "estimatedTime": 30
}
```

**响应示例（完成）**:
```json
{
  "status": "completed",
  "audioUrl": "https://pub-xxx.r2.dev/audio/episode-1732291200000.mp3",
  "duration": 185,
  "fileSize": 2457600
}
```

**响应示例（失败）**:
```json
{
  "status": "failed",
  "error": "TTS service timeout",
  "retryable": true
}
```

---

## 主题播客 API

### 1. 创建主题

**端点**: `POST /topics`

**描述**: 创建新的主题播客系列。

**请求体**:
```json
{
  "title": "人工智能基础",
  "description": "从零开始学习AI的系列播客，涵盖机器学习、深度学习等核心概念",
  "is_active": true,
  "generation_interval_hours": 24,
  "category": "technology",
  "tags": ["AI", "机器学习", "深度学习"]
}
```

**字段说明**:

| 字段 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `title` | string | 是 | - | 主题标题（1-200字符） |
| `description` | string | 否 | - | 主题描述 |
| `is_active` | boolean | 否 | `true` | 是否激活 |
| `generation_interval_hours` | number | 否 | `24` | 生成间隔（小时） |
| `category` | string | 否 | - | 分类 |
| `tags` | string[] | 否 | - | 标签 |

**请求示例**:
```bash
curl -X POST "https://podcast-rss-demo.tj15982183241.workers.dev/topics" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "人工智能基础",
    "description": "从零开始学习AI",
    "is_active": true,
    "generation_interval_hours": 24
  }'
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "topic": {
      "id": 1,
      "title": "人工智能基础",
      "description": "从零开始学习AI",
      "is_active": true,
      "generation_interval_hours": 24,
      "episode_count": 0,
      "created_at": "2024-11-22T14:00:00Z",
      "last_generated_at": null
    }
  }
}
```

---

### 2. 获取主题列表

**端点**: `GET /topics`

**描述**: 获取所有主题及其统计信息。

**查询参数**:

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `status` | string | 否 | - | 状态过滤 (`active` / `inactive`) |
| `category` | string | 否 | - | 分类过滤 |
| `limit` | number | 否 | `20` | 每页数量 |
| `offset` | number | 否 | `0` | 偏移量 |

**请求示例**:
```bash
curl "https://podcast-rss-demo.tj15982183241.workers.dev/topics?status=active&limit=10"
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "topics": [
      {
        "id": 1,
        "title": "人工智能基础",
        "description": "从零开始学习AI",
        "is_active": true,
        "generation_interval_hours": 24,
        "episode_count": 5,
        "created_at": "2024-11-20T10:00:00Z",
        "last_generated_at": "2024-11-22T10:00:00Z",
        "stats": {
          "totalEpisodes": 5,
          "totalDuration": 925,
          "avgDuration": 185,
          "lastEpisodeTitle": "Episode 5: 深度学习入门"
        }
      }
    ],
    "pagination": {
      "limit": 10,
      "offset": 0,
      "total": 15
    }
  }
}
```

---

### 3. 获取主题详情

**端点**: `GET /topics/{topicId}`

**描述**: 获取主题详细信息和统计数据。

**路径参数**:

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `topicId` | number | 是 | 主题ID |

**请求示例**:
```bash
curl "https://podcast-rss-demo.tj15982183241.workers.dev/topics/1"
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "topic": {
      "id": 1,
      "title": "人工智能基础",
      "description": "从零开始学习AI",
      "is_active": true,
      "generation_interval_hours": 24,
      "episode_count": 5,
      "created_at": "2024-11-20T10:00:00Z",
      "last_generated_at": "2024-11-22T10:00:00Z"
    },
    "stats": {
      "totalEpisodes": 5,
      "totalDuration": 925,
      "avgDuration": 185,
      "totalWordCount": 2615,
      "avgWordCount": 523,
      "recentEpisodes": [
        {
          "episodeNumber": 5,
          "title": "深度学习入门",
          "keywords": "神经网络,反向传播,梯度下降",
          "createdAt": "2024-11-22T10:00:00Z"
        }
      ]
    }
  }
}
```

---

### 4. 生成主题播客（单集）

**端点**: `POST /topics/{topicId}/generate`

**描述**: 为指定主题生成单集播客（不考虑系列延续）。

**路径参数**:

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `topicId` | number | 是 | 主题ID |

**查询参数**:

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `style` | string | 否 | `topic-explainer` | 播报风格 |
| `useAsyncTts` | boolean | 否 | `false` | 是否异步生成 |

**请求示例**:
```bash
curl -X POST "https://podcast-rss-demo.tj15982183241.workers.dev/topics/1/generate?style=topic-explainer"
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "episodeId": "topic-podcast-1-1732291200000",
    "topicId": 1,
    "title": "机器学习算法概览",
    "audioUrl": "https://pub-xxx.r2.dev/audio/topic-podcast-1-1732291200000.mp3",
    "scriptUrl": "https://pub-xxx.r2.dev/scripts/topic-podcast-1-1732291200000.txt",
    "duration": 210,
    "createdAt": "2024-11-22T14:00:00Z"
  }
}
```

---

### 5. 生成下一集（智能系列延续）

**端点**: `POST /topics/{topicId}/generate-next`

**描述**: 基于历史剧集智能生成下一集，自动去重关键词，确保内容延续性。

**路径参数**:

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `topicId` | number | 是 | 主题ID |

**查询参数**:

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `style` | string | 否 | `topic-explainer` | 播报风格 |

**请求示例**:
```bash
curl -X POST "https://podcast-rss-demo.tj15982183241.workers.dev/topics/1/generate-next?style=topic-explainer"
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "episodeNumber": 6,
    "episodeId": "topic-podcast-1-ep6",
    "topicId": 1,
    "title": "卷积神经网络详解",
    "keywords": ["CNN", "卷积层", "池化层", "特征提取", "图像识别"],
    "abstract": "本集深入讲解卷积神经网络的结构和工作原理，涵盖卷积层、池化层等核心概念...",
    "audioUrl": "https://pub-xxx.r2.dev/audio/topic-podcast-1-ep6.mp3",
    "duration": 195,
    "message": "Successfully generated episode 6",
    "previousKeywords": ["神经网络", "反向传播", "梯度下降", "激活函数", "损失函数"]
  }
}
```

**特性**:
- ✅ 自动分析前10集的关键词
- ✅ 智能去重，避免重复内容
- ✅ 延续系列主题，保持连贯性
- ✅ 检查生成间隔，防止频繁调用

---

### 6. 获取主题的播客列表

**端点**: `GET /topics/{topicId}/podcasts`

**描述**: 获取指定主题的所有播客剧集。

**路径参数**:

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `topicId` | number | 是 | 主题ID |

**请求示例**:
```bash
curl "https://podcast-rss-demo.tj15982183241.workers.dev/topics/1/podcasts"
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "topicId": 1,
    "topicTitle": "人工智能基础",
    "podcasts": [
      {
        "episodeId": "topic-podcast-1-ep6",
        "episodeNumber": 6,
        "title": "卷积神经网络详解",
        "keywords": "CNN,卷积层,池化层",
        "abstract": "本集深入讲解卷积神经网络...",
        "audioUrl": "https://pub-xxx.r2.dev/audio/topic-podcast-1-ep6.mp3",
        "duration": 195,
        "createdAt": "2024-11-22T14:00:00Z"
      }
    ],
    "total": 6
  }
}
```

---

### 7. 更新主题

**端点**: `PUT /topics/{topicId}`

**描述**: 更新主题信息。

**路径参数**:

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `topicId` | number | 是 | 主题ID |

**请求体**:
```json
{
  "title": "人工智能进阶",
  "description": "深入探讨AI前沿技术",
  "is_active": true,
  "generation_interval_hours": 48
}
```

**请求示例**:
```bash
curl -X PUT "https://podcast-rss-demo.tj15982183241.workers.dev/topics/1" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "人工智能进阶",
    "generation_interval_hours": 48
  }'
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "topic": {
      "id": 1,
      "title": "人工智能进阶",
      "description": "深入探讨AI前沿技术",
      "is_active": true,
      "generation_interval_hours": 48,
      "updated_at": "2024-11-22T14:30:00Z"
    }
  }
}
```

---

### 8. 删除主题

**端点**: `DELETE /topics/{topicId}`

**描述**: 删除主题（软删除，仅标记为非活跃）。

**路径参数**:

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `topicId` | number | 是 | 主题ID |

**请求示例**:
```bash
curl -X DELETE "https://podcast-rss-demo.tj15982183241.workers.dev/topics/1"
```

**响应示例**:
```json
{
  "success": true,
  "message": "Topic deactivated successfully"
}
```

---

### 9. 轮询主题播客音频状态

**端点**: `GET /topics/podcasts/{episodeId}/poll-audio`

**描述**: 轮询主题播客异步生成状态。

**路径参数**:

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `episodeId` | string | 是 | 剧集ID |

**查询参数**:

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `eventId` | string | 是 | 异步事件ID |

**请求示例**:
```bash
curl "https://podcast-rss-demo.tj15982183241.workers.dev/topics/podcasts/topic-podcast-1-ep6/poll-audio?eventId=async-123"
```

**响应示例**: 同News播客轮询接口

---

## Feed & 系统 API

### 1. RSS Feed

**端点**: `GET /rss.xml`

**描述**: 获取符合标准的RSS 2.0 Feed，可导入播客应用。

**请求示例**:
```bash
curl "https://podcast-rss-demo.tj15982183241.workers.dev/rss.xml"
```

**响应示例** (XML):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>AI Generated Podcast</title>
    <description>AI-powered news and topic podcasts</description>
    <language>zh-cn</language>
    <link>https://podcast-rss-demo.tj15982183241.workers.dev</link>
    <item>
      <title>BBC News Podcast - November 22, 2024</title>
      <description>Latest news from BBC...</description>
      <enclosure url="https://pub-xxx.r2.dev/audio/episode-123.mp3" 
                 type="audio/mpeg" 
                 length="2457600"/>
      <pubDate>Fri, 22 Nov 2024 14:00:00 GMT</pubDate>
      <guid>episode-1732291200000</guid>
    </item>
  </channel>
</rss>
```

---

### 2. 健康检查

**端点**: `GET /health`

**描述**: 检查系统健康状态。

**请求示例**:
```bash
curl "https://podcast-rss-demo.tj15982183241.workers.dev/health"
```

**响应示例（健康）**:
```json
{
  "status": "healthy",
  "timestamp": "2024-11-22T14:00:00Z",
  "services": {
    "database": "healthy",
    "storage": "healthy",
    "totalEpisodes": 42,
    "publishedEpisodes": 38
  }
}
```

**响应示例（不健康）**:
```json
{
  "status": "unhealthy",
  "timestamp": "2024-11-22T14:00:00Z",
  "services": {
    "database": "unhealthy",
    "storage": "healthy",
    "totalEpisodes": 0,
    "publishedEpisodes": 0
  },
  "error": "Database connection failed"
}
```

---

### 3. 系统统计

**端点**: `GET /stats`

**描述**: 获取系统统计信息。

**请求示例**:
```bash
curl "https://podcast-rss-demo.tj15982183241.workers.dev/stats"
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "episodes": {
      "total": 42,
      "published": 38,
      "processing": 4,
      "failed": 0
    },
    "topics": {
      "total": 15,
      "active": 12,
      "inactive": 3
    },
    "storage": {
      "totalAudioFiles": 42,
      "totalScriptFiles": 42,
      "totalSubtitleFiles": 126,
      "estimatedSize": "125.4 MB"
    },
    "generation": {
      "last24Hours": 5,
      "last7Days": 28,
      "avgDuration": 185
    }
  }
}
```

---

### 4. API信息

**端点**: `GET /info`

**描述**: 获取API元信息和使用文档。

**请求示例**:
```bash
curl "https://podcast-rss-demo.tj15982183241.workers.dev/info"
```

**响应示例**:
```json
{
  "name": "Podcast RSS API",
  "version": "2.0.0",
  "description": "由AI生成的Podcast服务，支持多种播报风格",
  "endpoints": {
    "POST /generate": {
      "description": "生成Podcast",
      "parameters": {"style": "news-anchor"},
      "example": "https://podcast-rss-demo.tj15982183241.workers.dev/generate?style=news-anchor"
    }
  },
  "styles": ["news-anchor - News主播风格", "topic-explainer - 主题讲解风格"]
}
```

---

### 5. OPML导出

**端点**: `GET /opml.xml`

**描述**: 导出OPML格式的订阅列表，方便批量导入播客应用。

**请求示例**:
```bash
curl "https://podcast-rss-demo.tj15982183241.workers.dev/opml.xml"
```

**响应示例** (XML):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>My Podcasts</title>
  </head>
  <body>
    <outline text="AI Generated Podcast" 
             type="rss" 
             xmlUrl="https://podcast-rss-demo.tj15982183241.workers.dev/rss.xml"/>
  </body>
</opml>
```

---

## 测试 & 调试 API

### 1. TTS测试

**端点**: `POST /test/tts`

**描述**: 测试TTS服务，直接生成音频（同步）。

**请求体**:
```json
{
  "text": "这是一段测试文本，用于验证TTS服务是否正常工作。",
  "provider": "kokoro"
}
```

**请求示例**:
```bash
curl -X POST "https://podcast-rss-demo.tj15982183241.workers.dev/test/tts" \
  -H "Content-Type: application/json" \
  -d '{"text": "测试文本", "provider": "kokoro"}'
```

**响应示例**:
```json
{
  "success": true,
  "audioUrl": "https://pub-xxx.r2.dev/test/audio-test-123.mp3",
  "duration": 3.5,
  "provider": "kokoro"
}
```

---

### 2. RSS测试

**端点**: `GET /test/rss`

**描述**: 测试RSS源抓取。

**请求示例**:
```bash
curl "https://podcast-rss-demo.tj15982183241.workers.dev/test/rss"
```

**响应示例**:
```json
{
  "success": true,
  "newsCount": 10,
  "latestNews": [
    {
      "title": "Latest tech news...",
      "link": "https://...",
      "pubDate": "2024-11-22T14:00:00Z"
    }
  ]
}
```

---

### 3. 脚本生成测试

**端点**: `POST /test/script`

**描述**: 测试AI脚本生成服务。

**请求体**:
```json
{
  "title": "人工智能简介",
  "content": "人工智能（AI）是计算机科学的一个分支..."
}
```

**请求示例**:
```bash
curl -X POST "https://podcast-rss-demo.tj15982183241.workers.dev/test/script" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AI简介",
    "content": "人工智能是..."
  }'
```

**响应示例**:
```json
{
  "success": true,
  "script": "欢迎收听今天的播客...",
  "wordCount": 523,
  "provider": "gemini"
}
```

---

### 4. 环境变量调试

**端点**: `GET /debug/env`

**描述**: 查看环境变量配置（仅开发环境）。

**请求示例**:
```bash
curl "https://podcast-rss-demo.tj15982183241.workers.dev/debug/env"
```

**响应示例**:
```json
{
  "environment": {
    "GEMINI_API_KEY": "***24chars***",
    "NODE_ENV": "development",
    "BBC_RSS_URL": "https://feeds.bbci.co.uk/news/rss.xml"
  }
}
```

---

## 错误处理

### 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "success": false,
  "error": "错误描述",
  "details": "详细错误信息（可选）",
  "code": "ERROR_CODE"
}
```

### HTTP状态码

| 状态码 | 含义 | 示例场景 |
|--------|------|----------|
| `200` | 成功 | 正常响应 |
| `400` | 请求错误 | 参数缺失、格式错误 |
| `404` | 未找到 | 资源不存在 |
| `500` | 服务器错误 | 内部错误、服务故障 |
| `503` | 服务不可用 | 依赖服务故障 |

### 常见错误代码

| 错误代码 | 描述 | 解决方案 |
|----------|------|----------|
| `INVALID_PARAMETER` | 参数无效 | 检查参数格式和范围 |
| `RESOURCE_NOT_FOUND` | 资源未找到 | 确认资源ID是否正确 |
| `RSS_FETCH_FAILED` | RSS抓取失败 | 检查网络或源状态 |
| `SCRIPT_GENERATION_FAILED` | 脚本生成失败 | 重试或检查AI服务 |
| `TTS_GENERATION_FAILED` | 音频生成失败 | 重试或切换TTS提供商 |
| `STORAGE_ERROR` | 存储错误 | 检查R2存储配置 |
| `DATABASE_ERROR` | 数据库错误 | 检查D1数据库连接 |

### 错误示例

**参数错误**:
```json
{
  "success": false,
  "error": "Invalid parameter",
  "details": "style must be one of: news-anchor, topic-explainer",
  "code": "INVALID_PARAMETER"
}
```

**资源未找到**:
```json
{
  "success": false,
  "error": "Topic not found",
  "details": "Topic with ID 999 does not exist",
  "code": "RESOURCE_NOT_FOUND"
}
```

**服务故障**:
```json
{
  "success": false,
  "error": "TTS service unavailable",
  "details": "Hugging Face API timeout after 30s",
  "code": "TTS_GENERATION_FAILED"
}
```

---

## 数据模型

### Episode (剧集)

```typescript
interface Episode {
  id: string;                    // 唯一标识符
  title: string;                 // 标题
  description: string;           // 描述
  script: string;                // 播客脚本
  audioUrl: string;              // 音频URL
  scriptUrl?: string;            // 脚本文件URL
  subtitles?: {                  // 字幕文件
    vtt: string;
    srt: string;
    json: string;
  };
  style: string;                 // 风格 (news-anchor / topic-explainer)
  duration: number;              // 时长（秒）
  wordCount: number;             // 字数
  fileSize: number;              // 文件大小（字节）
  publishedAt: string;           // 发布时间（ISO 8601）
  createdAt: string;             // 创建时间（ISO 8601）
  sourceUrl?: string;            // 来源URL
  keywords?: string[];           // 关键词
  topicId?: number;              // 所属主题ID（主题播客）
  episodeNumber?: number;        // 集数（主题播客）
}
```

### Topic (主题)

```typescript
interface Topic {
  id: number;                    // 主题ID
  title: string;                 // 标题
  description?: string;          // 描述
  is_active: boolean;            // 是否激活
  generation_interval_hours: number;  // 生成间隔（小时）
  episode_count: number;         // 剧集数量
  created_at: string;            // 创建时间
  last_generated_at?: string;    // 最后生成时间
  category?: string;             // 分类
  tags?: string[];               // 标签
}
```

### TopicStats (主题统计)

```typescript
interface TopicStats {
  totalEpisodes: number;         // 总集数
  totalDuration: number;         // 总时长（秒）
  avgDuration: number;           // 平均时长
  totalWordCount: number;        // 总字数
  avgWordCount: number;          // 平均字数
  recentEpisodes: {              // 最近剧集
    episodeNumber: number;
    title: string;
    keywords: string;
    createdAt: string;
  }[];
}
```

### SystemStats (系统统计)

```typescript
interface SystemStats {
  episodes: {
    total: number;               // 总剧集数
    published: number;           // 已发布数
    processing: number;          // 处理中数
    failed: number;              // 失败数
  };
  topics: {
    total: number;               // 总主题数
    active: number;              // 激活数
    inactive: number;            // 非激活数
  };
  storage: {
    totalAudioFiles: number;     // 音频文件数
    totalScriptFiles: number;    // 脚本文件数
    totalSubtitleFiles: number;  // 字幕文件数
    estimatedSize: string;       // 估计大小
  };
  generation: {
    last24Hours: number;         // 24小时内生成数
    last7Days: number;           // 7天内生成数
    avgDuration: number;         // 平均时长
  };
}
```

---

## 前端集成示例

### React 示例

```typescript
import { useState, useEffect } from 'react';

const API_BASE = 'https://podcast-rss-demo.tj15982183241.workers.dev';

// 获取剧集列表
export function EpisodeList() {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/episodes?limit=10`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEpisodes(data.data.episodes);
        }
        setLoading(false);
      });
  }, []);

  if (loading) return <div>加载中...</div>;

  return (
    <ul>
      {episodes.map(ep => (
        <li key={ep.id}>
          <h3>{ep.title}</h3>
          <audio src={ep.audioUrl} controls />
          <p>{ep.description}</p>
        </li>
      ))}
    </ul>
  );
}

// 生成News播客
export function GenerateButton() {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/generate?style=news-anchor`, {
        method: 'POST'
      });
      const data = await res.json();
      
      if (data.success) {
        alert(`生成成功！剧集ID: ${data.episodeId}`);
      } else {
        alert(`生成失败: ${data.error}`);
      }
    } catch (error) {
      alert(`错误: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button onClick={handleGenerate} disabled={generating}>
      {generating ? '生成中...' : '生成News播客'}
    </button>
  );
}

// 主题管理
export function TopicManager() {
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/topics`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTopics(data.data.topics);
        }
      });
  }, []);

  const createTopic = async (title: string, description: string) => {
    const res = await fetch(`${API_BASE}/topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description })
    });
    const data = await res.json();
    
    if (data.success) {
      setTopics([...topics, data.data.topic]);
    }
  };

  const generateNext = async (topicId: number) => {
    const res = await fetch(`${API_BASE}/topics/${topicId}/generate-next`, {
      method: 'POST'
    });
    const data = await res.json();
    
    if (data.success) {
      alert(`生成第 ${data.data.episodeNumber} 集成功！`);
    }
  };

  return (
    <div>
      <h2>我的主题</h2>
      {topics.map(topic => (
        <div key={topic.id}>
          <h3>{topic.title}</h3>
          <p>共 {topic.episode_count} 集</p>
          <button onClick={() => generateNext(topic.id)}>
            生成下一集
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Vue 示例

```vue
<template>
  <div>
    <h2>播客列表</h2>
    <div v-if="loading">加载中...</div>
    <ul v-else>
      <li v-for="episode in episodes" :key="episode.id">
        <h3>{{ episode.title }}</h3>
        <audio :src="episode.audioUrl" controls></audio>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  data() {
    return {
      episodes: [],
      loading: true
    };
  },
  mounted() {
    this.fetchEpisodes();
  },
  methods: {
    async fetchEpisodes() {
      try {
        const res = await fetch('https://podcast-rss-demo.tj15982183241.workers.dev/episodes?limit=10');
        const data = await res.json();
        
        if (data.success) {
          this.episodes = data.data.episodes;
        }
      } catch (error) {
        console.error('获取失败:', error);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
```

### 原生JavaScript示例

```javascript
// 获取剧集列表
async function fetchEpisodes() {
  try {
    const response = await fetch('https://podcast-rss-demo.tj15982183241.workers.dev/episodes?limit=10');
    const data = await response.json();
    
    if (data.success) {
      const episodeList = document.getElementById('episode-list');
      episodeList.innerHTML = '';
      
      data.data.episodes.forEach(episode => {
        const li = document.createElement('li');
        li.innerHTML = `
          <h3>${episode.title}</h3>
          <audio src="${episode.audioUrl}" controls></audio>
          <p>${episode.description}</p>
        `;
        episodeList.appendChild(li);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// 生成播客
async function generatePodcast() {
  const button = document.getElementById('generate-btn');
  button.disabled = true;
  button.textContent = '生成中...';
  
  try {
    const response = await fetch('https://podcast-rss-demo.tj15982183241.workers.dev/generate?style=news-anchor', {
      method: 'POST'
    });
    const data = await response.json();
    
    if (data.success) {
      alert(`生成成功！剧集ID: ${data.episodeId}`);
      fetchEpisodes(); // 刷新列表
    } else {
      alert(`生成失败: ${data.error}`);
    }
  } catch (error) {
    alert(`错误: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = '生成News播客';
  }
}

// 页面加载时获取数据
window.addEventListener('DOMContentLoaded', fetchEpisodes);
```

---

## 常见使用场景

### 场景1: 构建播客网站

1. **首页**: 调用 `GET /episodes` 显示最新剧集
2. **播放页**: 调用 `GET /episodes/{id}` 获取详情和音频
3. **RSS订阅**: 使用 `GET /rss.xml` 提供订阅链接
4. **生成按钮**: 调用 `POST /generate` 手动生成播客

### 场景2: 主题播客管理后台

1. **主题列表**: 调用 `GET /topics` 显示所有主题
2. **创建主题**: 调用 `POST /topics` 添加新主题
3. **生成剧集**: 调用 `POST /topics/{id}/generate-next` 智能生成下一集
4. **查看统计**: 调用 `GET /topics/{id}` 查看主题详情和数据

### 场景3: 移动应用集成

1. **列表展示**: 分页加载剧集 `GET /episodes?limit=20&offset=0`
2. **音频播放**: 使用返回的 `audioUrl` 直接播放
3. **字幕显示**: 使用 `subtitles.vtt` 或 `subtitles.json`
4. **离线下载**: 下载 `audioUrl` 和 `scriptUrl` 缓存

### 场景4: 自动化工作流

1. **定时生成**: 使用Cron定时调用 `POST /generate`
2. **监控健康**: 定期调用 `GET /health` 检查服务状态
3. **数据分析**: 调用 `GET /stats` 获取统计数据
4. **批量处理**: 遍历主题调用 `POST /topics/{id}/generate-next`

---

## 附录

### A. 速率限制

当前无速率限制，但建议：
- News生成: 每小时不超过10次
- 主题生成: 每主题每24小时不超过1次
- 查询接口: 建议每秒不超过5次

### B. 数据保留

- 音频文件: 永久保留
- 脚本文件: 永久保留
- 字幕文件: 永久保留
- 数据库记录: 永久保留

### C. 浏览器兼容性

支持所有现代浏览器：
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### D. 支持与反馈

如有问题或建议，请联系：
- 项目仓库: [GitHub](https://github.com/cnmzsjbz199328/podcast-rss-demo)
- 问题反馈: 通过GitHub Issues

---

**文档版本**: 1.0.0  
**最后更新**: 2024-11-22  
**API版本**: 2.0.0
