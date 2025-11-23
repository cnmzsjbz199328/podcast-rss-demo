# API 调用问题审查报告

## 问题描述
访问 `GET https://podcast-rss-demo.tj15982183241.workers.dev/episodes/topic-1-ep-28-1763813204676` 返回 500 (Internal Server Error)，但根据开发者文档，应该返回 `https://pub-xxx.r2.dev/audio/episode-1732291200000.mp3` 这类的R2存储URL。

---

## 问题根源分析

### 1. **端点映射不一致**

#### 前端代码（PodcastPlayer）：
```typescript
// src/pages/PodcastPlayer/index.tsx, 第25行
const response = await podcastApi.getEpisode(episodeId);
// → 调用 /episodes/{episodeId}
```

#### 前端API服务（podcastApi）：
```typescript
// src/services/podcastApi.ts, 第27-28行
async getEpisode(episodeId: string): Promise<EpisodeDetailResponse> {
  return apiRequest<EpisodeDetailResponse>(`/episodes/${episodeId}`)
}
```

### 2. **问题出现的位置**

当从主题播客列表（TopicDetail）点击一个主题播客时：
- **链接格式**: `/podcast/{episodeId}`
- **episodeId值**: `topic-1-ep-28-1763813204676`
- **实际请求**: `GET /episodes/topic-1-ep-28-1763813204676`

### 3. **后端路由配置不匹配**

根据topicApi.ts（第76-88行），后端支持的路由是：
```typescript
// 轮询主题播客音频状态
async pollTopicAudio(episodeId: string, eventId: string) {
  return apiRequest(`/topics/podcasts/${episodeId}/poll-audio?eventId=${eventId}`)
  //                 ↑
  //                 使用 /topics/podcasts/{episodeId} 路由，而非 /episodes/{episodeId}
}
```

### 4. **关键差异**

| 项目 | 前端当前实现 | 后端实际路由 |
|------|-----------|-----------|
| **News播客** | `GET /episodes/{episodeId}` | ✅ 正确 |
| **主题播客** | `GET /episodes/{episodeId}` | ❌ 应该用 `/topics/podcasts/{episodeId}` |
| **主题轮询** | `GET /topics/podcasts/{episodeId}/poll-audio` | ✅ 正确 |

---

## 核心问题

### 问题1：路由不统一
- **News播客**: 存储在通用 `/episodes` 表中
- **主题播客**: 也存储在 `/episodes` 表中，但前端试图用 `/episodes/{episodeId}` 获取，其中episodeId格式为 `topic-1-ep-28-1763813204676`

### 问题2：后端没有正确实现 `GET /episodes/{topicEpisodeId}` 
- 后端EpisodeApiHandler可能没有处理主题播客格式的episodeId
- 主题播客可能只能通过 `/topics/podcasts/{episodeId}` 获取

### 问题3：路由冲突
- `/episodes/{episodeId}` 被假设为News播客ID格式
- 主题播客的episodeId格式 `topic-1-ep-28-*` 不被识别

---

## 根本原因

**前端设计假设**：所有播客（News和主题）都可以通过统一的 `/episodes/{episodeId}` 端点获取

**后端实现**：
- News播客: `/episodes/{episodeId}` ✅ 
- 主题播客: `/topics/podcasts/{episodeId}` 或其他特殊路由 ❌ 不统一

---

## 验证方式

1. **检查后端EpisodeApiHandler**：
   - 看 `handleEpisodeDetail()` 是否能识别 `topic-1-ep-28-*` 格式

2. **检查后端route配置**：
   - 是否存在 `GET /episodes/topic-*` 的路由处理

3. **检查topicPodcasts数据**：
   - TopicPodcasts是否使用了不同的存储表或字段

---

## 推荐修复方向

**需要验证后端实现，但预期可能需要**：

1. **方案A - 统一后端路由**（推荐）
   - 改进 `/episodes/{episodeId}` 端点，支持两种格式
   - 在handler中判断episodeId格式并路由到正确的数据源

2. **方案B - 统一前端调用**
   - 检测episodeId格式，决定使用不同的API端点
   - News: `/episodes/{episodeId}`
   - 主题: `/topics/podcasts/{episodeId}`

3. **方案C - 检查数据库查询**
   - 确保episodes表中包含所有播客（News和主题）
   - episodeId应该在数据库中正确存储

---

## 检查清单

- [ ] 后端 EpisodeApiHandler 的 `handleEpisodeDetail()` 实现
- [ ] 后端 worker.js 中 `/episodes/*` 的路由配置
- [ ] 数据库查询是否区分News和主题播客
- [ ] TopicEpisode是否保存到episodes表还是topic_episodes表
- [ ] 日志输出：看后端返回什么样的错误信息（500通常意味着未捕获异常）
