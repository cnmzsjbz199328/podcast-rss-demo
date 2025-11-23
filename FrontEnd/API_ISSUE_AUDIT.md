# API 链接拼接问题审查

## 问题描述
浏览器错误：
```
Origin http://localhost:3000 is not allowed by Access-Control-Allow-Origin. Status code: 500
Failed to load resource: https://podcast-rss-demo.tj15982183241.workers.dev/episodes/topic-1-ep-44-1763895676139
```

看似CORS跨域问题，但实际是后端**链接拼接错误**导致500返回。

---

## 根本原因分析

### 1. **后端handleEpisodeDetail() 缺陷**

**文件**: `src/handlers/EpisodeApiHandler.js` (144-206行)

**问题代码**:
```javascript
async handleEpisodeDetail(request, services, params) {
  const episodeId = params[0];  // ← 获取参数
  
  // ❌ 只调用 NewsPodcastService
  const podcastService = services.newsPodcastService;
  const episode = await podcastService.getPodcastById(episodeId);
  
  if (!episode) {
    return 404;  // ← 主题播客ID格式 topic-1-ep-44-* 找不到
  }
  
  // 返回的字段缺失！
  return {
    id: episode.episodeId,
    title: episode.title,
    description: episode.description,
    audioUrl: episode.audioUrl,
    // ❌ 缺少 scriptUrl!
    // ❌ 缺少 script!
    style: 'news-anchor',  // ← 硬编码，不支持主题播客
  }
}
```

### 2. **三个关键问题**

#### 问题A：不支持主题播客ID格式
- **News播客ID**: `news-1732291200000-x9sd2we3k` (通过NewsPodcastService)
- **主题播客ID**: `topic-1-ep-44-1763895676139` (不被NewsPodcastService处理)
- **结果**: 调用 `getPodcastById('topic-1-ep-44-...')` → 找不到 → 返回404/500

#### 问题B：scriptUrl字段完全缺失
API文档说返回scriptUrl：
```markdown
**响应示例**:
```json
{
  "id": "news-1732291200000-x9sd2we3k",
  "audioUrl": "https://pub-xxx.r2.dev/audio/...",
  "scriptUrl": "https://pub-xxx.r2.dev/scripts/...",  ← 文档说有
}
```
```

但实际代码(180行)：
```javascript
audioUrl: episode.audioUrl,
// ← scriptUrl 没有返回！
```

#### 问题C：硬编码style为news-anchor
```javascript
style: 'news-anchor',  // ← 第181行，硬编码
// 主题播客应该是 'topic-explainer'
```

### 3. **为什么显示CORS错误？**

1. 后端处理主题播客ID时抛异常
2. handleEpisodeDetail() 在第196行捕获异常
3. 返回500错误
4. 浏览器将500错误与CORS一起报告（因为没有允许的CORS头）

```javascript
} catch (error) {
  this.logger.error('Episode detail fetch failed', error);
  return new Response(JSON.stringify({
    success: false,
    error: 'Failed to fetch episode detail'
  }), {
    status: 500,
    // ❌ 这里缺少 'Access-Control-Allow-Origin': '*'
  });
}
```

---

## 链接拼接流程

### 前端拼接：正确✅
```typescript
// podcastApi.ts
async getEpisode(episodeId: string) {
  return apiRequest(`/episodes/${episodeId}`)
}

// 例如：episodeId = "topic-1-ep-44-1763895676139"
// 拼接结果：/episodes/topic-1-ep-44-1763895676139  ← 正确
```

### 后端处理：错误❌
```javascript
// EpisodeApiHandler.js
async handleEpisodeDetail(request, services, params) {
  const episodeId = params[0];  // ← "topic-1-ep-44-1763895676139"
  
  // ❌ 只从News Service查询
  const episode = await podcastService.getPodcastById(episodeId);
  
  if (!episode) {
    // ❌ 找不到，抛异常或返回404
    // ❌ 异常被catch，返回500
  }
}
```

---

## 需要修复的内容

### 修复1：支持主题播客ID

**现在**（只支持News）:
```javascript
const episode = await services.newsPodcastService.getPodcastById(episodeId);
```

**应该**（先News后Topic）:
```javascript
let episode;

// 尝试从News Service获取
if (episodeId.startsWith('news-') || !episodeId.startsWith('topic-')) {
  episode = await services.newsPodcastService.getPodcastById(episodeId);
}

// 如果不是News或未找到，尝试从Topic Service获取
if (!episode && episodeId.startsWith('topic-')) {
  const topicData = await services.topicPodcastRepository.getById(episodeId);
  if (topicData) {
    episode = {
      episodeId: topicData.episode_id,
      title: topicData.title,
      audioUrl: topicData.audio_url,
      script: topicData.script,  // ← 如果存储
      scriptUrl: topicData.script_url,
      style: 'topic-explainer',
      // ... 其他字段
    };
  }
}
```

### 修复2：返回scriptUrl和script

**添加到响应**:
```javascript
return {
  success: true,
  data: {
    id: episode.episodeId,
    title: episode.title,
    description: episode.description,
    audioUrl: episode.audioUrl,
    scriptUrl: episode.scriptUrl || episode.script_url,  // ← 新增
    script: episode.script,  // ← 新增
    style: episode.style || 'news-anchor',  // ← 动态，不硬编码
    duration: episode.duration,
    fileSize: 0,
    publishedAt: episode.publishedAt,
    createdAt: episode.createdAt,
    ttsEventId: episode.ttsEventId,
    ttsError: episode.ttsError || episode.tts_error
  }
}
```

### 修复3：错误响应补全CORS头

```javascript
} catch (error) {
  this.logger.error('Episode detail fetch failed', error);
  return new Response(JSON.stringify({
    success: false,
    error: 'Failed to fetch episode detail',
    details: error.message
  }), {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'  // ← 补全
    }
  });
}
```

---

## 数据库字段映射

### News Episodes (episodes table)
```sql
- episodeId / id
- title
- description
- audioUrl / audio_url
- scriptUrl / transcript ← D1中的字段名
- script / script_content
- style (默认 'news-anchor')
- duration
- createdAt / created_at
```

### Topic Podcasts (topic_podcasts table)
```sql
- episode_id
- episode_number
- title
- abstract / description
- audio_url
- script / script_content
- script_url / transcript ← 可能的字段
- topic_id
- style (默认 'topic-explainer')
- duration
- created_at
- updated_at
```

---

## 修复优先级

| 优先级 | 修复项 | 影响范围 |
|--------|--------|----------|
| 🔴 P0 | 支持主题播客ID查询 | 所有主题播客无法播放 |
| 🔴 P0 | 返回scriptUrl字段 | 脚本显示功能无法工作 |
| 🟡 P1 | 动态style（不硬编码） | 显示错误风格 |
| 🟡 P1 | 错误响应补全CORS | 调试困难 |

---

## 测试验证清单

修复后应验证：

- [ ] News播客能正常获取（如 `episode-1732291200000`）
- [ ] Topic播客能正常获取（如 `topic-1-ep-44-1763895676139`）
- [ ] 响应包含 `scriptUrl` 字段
- [ ] 响应包含 `script` 字段（可选）
- [ ] News播客返回 `style: "news-anchor"`
- [ ] Topic播客返回 `style: "topic-explainer"`
- [ ] 错误响应包含CORS头
- [ ] TranscriptViewer能正确加载脚本

---

## 总结

**问题本质**: 后端handleEpisodeDetail()只支持News播客，不支持主题播客ID格式，导致查询失败、异常、500错误。表面看是CORS，实际是**链接处理逻辑缺陷**。

**症状**:
- 403/500错误（看起来像CORS）
- 但实际是后端找不到资源

**根治**: 修改handleEpisodeDetail()同时支持News和Topic ID格式，返回完整的scriptUrl字段。
