# 异步流式语音生成功能使用指南

## 概述

异步流式TTS功能允许处理超长文本（>5分钟音频）的语音生成，通过后台流式处理和状态轮询来避免长时间阻塞用户请求。

## 功能特性

- **流式处理**: 支持分块处理长文本，避免内存溢出
- **异步轮询**: 客户端可以轮询生成状态，无需长时间等待
- **状态管理**: 完整的数据库状态跟踪和错误处理
- **向下兼容**: 不影响现有的同步TTS功能

## API 使用方法

### 1. 发起异步播客生成

```bash
curl -X POST "https://podcast-rss-demo.tj15982183241.workers.dev/generate?style=news-anchor&useAsyncTts=true"
```

响应示例：
```json
{
  "success": true,
  "data": {
    "episodeId": "news-anchor-2025-11-14T12-00-00-abc123",
    "title": "今日热点播报 - 2025/11/14",
    "isAsync": true,
    "eventId": "gradio-event-12345",
    "status": "processing",
    "ttsStatus": "processing"
  }
}
```

### 2. 轮询生成状态

```bash
curl "https://podcast-rss-demo.tj15982183241.workers.dev/episodes/{episodeId}/poll-audio"
```

响应示例：

- 处理中：
```json
{
  "success": true,
  "status": "processing",
  "message": "Audio generation in progress. Please wait at least 60-90 seconds after generation before polling.",
  "estimatedWaitTime": 30,
  "createdAt": "2025-11-14T12:00:00.000Z"
}
```

- 完成：
```json
{
  "success": true,
  "status": "completed",
  "audioUrl": "https://pub-d5b744245f574abcac229cefccabaa2f.r2.dev/audio/2025-11-14-streaming-test.wav"
}
```

- 失败：
```json
{
  "success": false,
  "status": "failed",
  "error": "Audio generation failed: connection timeout"
}
```

### 3. 获取剧集详情

```bash
curl "https://podcast-rss-demo.tj15982183241.workers.dev/episodes/{episodeId}"
```

## 工作流程

1. **脚本生成**: 使用 Gemini API 生成播客脚本
2. **异步发起**: 调用 Kokoro-TTS 流式 API 发起生成任务
3. **状态记录**: 在数据库中记录 event_id 和 processing 状态
4. **流式处理**: 后台接收音频块并合并
5. **上传存储**: 将完整音频上传到 R2 存储
6. **状态更新**: 更新数据库状态为 completed

## 技术实现

### 核心组件

- **AsyncStreamingTtsService**: 异步流式TTS服务类
- **PodcastWorkflow**: 支持异步工作流的编排器
- **EpisodeApiHandler**: 处理轮询请求的API处理器

### 数据库字段

- `tts_event_id`: 流式API的事件ID
- `tts_status`: 生成状态 (processing/completed/failed)
- `tts_provider`: TTS提供商 (kokoro-streaming)
- `tts_error`: 错误信息（失败时）

### 状态流转

```
发起异步生成 → processing → polling → completed/failed
```

## 最佳实践

1. **轮询间隔**: 建议至少等待60-90秒后再开始轮询
2. **超时处理**: 客户端应设置合理的超时时间（建议5-10分钟）
3. **错误处理**: 正确处理失败状态，提供用户友好的错误信息
4. **状态检查**: 生成前检查是否已有完成的音频，避免重复生成

## 故障排除

### 常见问题

1. **503 Service Unavailable**: Gemini API 服务过载，建议稍后重试
2. **Polling timeout**: 音频生成可能需要更长时间，增加轮询间隔
3. **Database errors**: 检查数据库连接和权限设置

### 调试信息

启用详细日志：
```bash
# 检查 Worker 日志
wrangler tail --format pretty
```

## 兼容性

- ✅ 向下兼容现有同步TTS功能
- ✅ 支持所有现有的播客风格
- ✅ 保持相同的API接口结构
- ✅ 不影响RSS feed和现有功能
