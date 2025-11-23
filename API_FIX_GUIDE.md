# 后端 API 修复指南

## 问题总结

当前后端 `handleEpisodeDetail()` 只支持News播客ID格式，对主题播客ID格式（`topic-1-ep-44-*`）处理不当，导致500错误且响应缺少scriptUrl字段。

---

## 需要修改的文件

### 文件位置
`src/handlers/EpisodeApiHandler.js` (第144-206行)

### 修改目标

1. ✅ 支持主题播客ID查询
2. ✅ 返回scriptUrl字段
3. ✅ 返回script字段
4. ✅ 动态设置style（不硬编码）
5. ✅ 错误响应补全CORS头

---

## 修复方案

### 步骤1：识别episodeId类型

```javascript
function identifyEpisodeType(episodeId) {
  if (!episodeId) return null;
  
  if (episodeId.startsWith('news-')) return 'news';
  if (episodeId.startsWith('topic-')) return 'topic';
  // 默认按news处理（向后兼容）
  return 'news';
}
```

### 步骤2：分别查询对应数据源

```javascript
async function getEpisodeData(episodeId, services) {
  const type = identifyEpisodeType(episodeId);
  
  if (type === 'topic') {
    // 从Topic Service查询
    return await services.topicPodcastRepository.getById(episodeId);
  } else {
    // 从News Service查询
    return await services.newsPodcastService.getPodcastById(episodeId);
  }
}
```

### 步骤3：规范化响应格式

```javascript
function normalizeEpisodeData(episode, type) {
  if (!episode) return null;
  
  // 不同数据源的字段映射
  const newsFields = {
    episodeId: episode.episodeId || episode.id,
    title: episode.title,
    description: episode.description,
    audioUrl: episode.audioUrl || episode.audio_url,
    scriptUrl: episode.scriptUrl || episode.transcript,  // ← 重点
    script: episode.script || episode.script_content,
    style: 'news-anchor',
    duration: episode.duration,
    publishedAt: episode.publishedAt || episode.published_at,
    createdAt: episode.createdAt || episode.created_at,
    ttsEventId: episode.ttsEventId,
    ttsError: episode.ttsError || episode.tts_error
  };
  
  const topicFields = {
    episodeId: episode.episode_id,
    title: episode.title,
    description: episode.abstract || episode.description,
    audioUrl: episode.audio_url,
    scriptUrl: episode.script_url || episode.transcript,  // ← 重点
    script: episode.script || episode.script_content,
    style: 'topic-explainer',  // ← 动态设置
    duration: episode.duration,
    publishedAt: episode.updated_at || episode.created_at,
    createdAt: episode.created_at,
    topicId: episode.topic_id,
    episodeNumber: episode.episode_number
  };
  
  return type === 'topic' ? topicFields : newsFields;
}
```

### 步骤4：完整的handleEpisodeDetail实现

```javascript
async handleEpisodeDetail(request, services, params) {
  try {
    const episodeId = params[0];

    if (!episodeId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Episode ID is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    this.logger.info('Fetching episode detail', { episodeId });

    // 1. 识别ID类型
    const type = identifyEpisodeType(episodeId);
    
    // 2. 根据类型获取数据
    let episodeData;
    try {
      if (type === 'topic') {
        episodeData = await services.topicPodcastRepository.getById(episodeId);
      } else {
        episodeData = await services.newsPodcastService.getPodcastById(episodeId);
      }
    } catch (queryError) {
      this.logger.warn(`Failed to query ${type} episode`, queryError);
      episodeData = null;
    }

    // 3. 检查是否找到
    if (!episodeData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Episode not found',
        details: `No ${type} episode with ID: ${episodeId}`
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 4. 规范化数据
    const normalized = normalizeEpisodeData(episodeData, type);

    // 5. 返回响应
    return new Response(JSON.stringify({
      success: true,
      data: {
        id: normalized.episodeId,
        title: normalized.title,
        description: normalized.description,
        audioUrl: normalized.audioUrl,
        scriptUrl: normalized.scriptUrl,      // ← 新增
        script: normalized.script,            // ← 新增（可选）
        style: normalized.style,              // ← 动态设置
        duration: normalized.duration,
        fileSize: 0,
        publishedAt: normalized.publishedAt,
        createdAt: normalized.createdAt,
        ttsEventId: normalized.ttsEventId,
        ttsError: normalized.ttsError,
        // 主题播客额外字段
        ...(type === 'topic' && {
          topicId: normalized.topicId,
          episodeNumber: normalized.episodeNumber
        })
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    this.logger.error('Episode detail fetch failed', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch episode detail',
      details: error.message  // ← 返回错误详情便于调试
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'  // ← 补全CORS头
      }
    });
  }
}
```

---

## 数据库字段检查清单

修改前需确认数据库中的实际字段名：

### Episodes 表（News播客）
- [ ] 确认字段：`episodeId` / `id`
- [ ] 确认字段：`title`
- [ ] 确认字段：`description`
- [ ] 确认字段：`audioUrl` / `audio_url`
- [ ] 确认字段：`transcript` / `scriptUrl` / `script_url`
- [ ] 确认字段：`script` / `script_content`

### Topic_Podcasts 表（主题播客）
- [ ] 确认字段：`episode_id`
- [ ] 确认字段：`title`
- [ ] 确认字段：`abstract` / `description`
- [ ] 确认字段：`audio_url`
- [ ] 确认字段：`transcript` / `script_url`
- [ ] 确认字段：`script` / `script_content`
- [ ] 确认字段：`topic_id`
- [ ] 确认字段：`episode_number`

---

## 验证方式

### 方法1：curl测试

```bash
# 测试News播客
curl "https://podcast-rss-demo.tj15982183241.workers.dev/episodes/news-1732291200000-x9sd2we3k" \
  -H "Origin: http://localhost:3000"

# 测试Topic播客
curl "https://podcast-rss-demo.tj15982183241.workers.dev/episodes/topic-1-ep-44-1763895676139" \
  -H "Origin: http://localhost:3000"
```

### 方法2：浏览器开发工具

1. 打开 http://localhost:3000
2. 打开DevTools → Network标签
3. 点击主题播客进入播放页面
4. 查看 `/episodes/{episodeId}` 请求
5. 验证响应中有 `scriptUrl` 字段

### 预期响应

```json
{
  "success": true,
  "data": {
    "id": "topic-1-ep-44-1763895676139",
    "title": "...",
    "description": "...",
    "audioUrl": "https://pub-xxx.r2.dev/audio/...",
    "scriptUrl": "https://pub-xxx.r2.dev/scripts/...",
    "script": "播客脚本内容...",
    "style": "topic-explainer",
    "duration": 185,
    "publishedAt": "2024-11-23T...",
    "createdAt": "2024-11-23T...",
    "topicId": 1,
    "episodeNumber": 44
  }
}
```

---

## 测试清单（修复后）

- [ ] News播客正常返回（status 200）
- [ ] Topic播客正常返回（status 200）
- [ ] 响应包含 `scriptUrl`
- [ ] 响应包含 `script`（如果数据库有）
- [ ] News播客的 `style` 为 `news-anchor`
- [ ] Topic播客的 `style` 为 `topic-explainer`
- [ ] 404情况正确处理（不存在的ID）
- [ ] 错误响应包含 `Access-Control-Allow-Origin`
- [ ] 浏览器前端能加载脚本（TranscriptViewer）
- [ ] 脚本实时高亮跟随播放进度

---

## 其他可能需要修改的地方

### 1. handleEpisodes() 列表响应

当前（第102-112行）缺少scriptUrl：

```javascript
episodes: episodes.map(ep => ({
  id: ep.episodeId,
  title: ep.title,
  description: ep.description,
  audioUrl: ep.audioUrl,
  // ❌ 缺少 scriptUrl
  style: ep.style || 'news-anchor',
  duration: ep.duration,
  fileSize: 0,
  publishedAt: ep.publishedAt || ep.createdAt,
  createdAt: ep.createdAt
}))
```

**建议添加**:
```javascript
episodes: episodes.map(ep => ({
  id: ep.episodeId,
  title: ep.title,
  description: ep.description,
  audioUrl: ep.audioUrl,
  scriptUrl: ep.scriptUrl,  // ← 新增
  style: ep.style || 'news-anchor',
  duration: ep.duration,
  fileSize: 0,
  publishedAt: ep.publishedAt || ep.createdAt,
  createdAt: ep.createdAt
}))
```

### 2. 考虑添加debug端点

便于开发调试：

```javascript
async handleDebug(request, services) {
  const episodeId = new URL(request.url).searchParams.get('id');
  if (!episodeId) {
    return new Response('Missing id parameter', { status: 400 });
  }
  
  const type = identifyEpisodeType(episodeId);
  const data = await (type === 'topic' 
    ? services.topicPodcastRepository.getById(episodeId)
    : services.newsPodcastService.getPodcastById(episodeId));
  
  return new Response(JSON.stringify({
    episodeId,
    type,
    found: !!data,
    rawData: data,
    fields: data ? Object.keys(data) : []
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

## 实施顺序

1. **第1步**: 确认数据库实际字段名
2. **第2步**: 修改handleEpisodeDetail()
3. **第3步**: 修改handleEpisodes()列表响应
4. **第4步**: 本地测试验证
5. **第5步**: 部署到生产环境
6. **第6步**: 监控错误日志

---

## 回滚计划

如修复出现问题：

```bash
# 查看修改前的版本
git diff src/handlers/EpisodeApiHandler.js

# 快速回滚
git checkout src/handlers/EpisodeApiHandler.js

# 重新部署
wrangler deploy
```

---

**预计实施时间**: 30分钟  
**风险等级**: 低（向后兼容）  
**受影响功能**: 脚本显示（核心功能）
