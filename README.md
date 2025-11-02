# Podcast RSS Demo

一个自动化生成新闻播客的演示项目。通过BBC RSS获取热点新闻，使用Gemini API整理成各种风格的脚本，通过语音克隆API生成音频，并将脚本和音频文件存储在Cloudflare R2中。最后，通过Cloudflare Worker动态生成RSS Feed，实现Podcast频道订阅。

## 项目结构

```
podcast-rss-demo/
├── src/
│   ├── rss-fetcher.js      # BBC RSS 获取模块
│   ├── script-generator.js # Gemini API 脚本生成模块
│   ├── voice-cloner.js     # 语音克隆 API 模块
│   └── rss-generator.js    # RSS Feed 生成器
├── worker.js               # Cloudflare Worker 主文件
├── index.js                # 本地测试和演示脚本
├── rss.xml                 # 生成的 RSS Feed 示例文件
├── config.js               # 配置文件（API 密钥等）
└── README.md               # 项目说明文档
```

## 功能特性

- ✅ 从 BBC RSS 获取实时热点新闻
- ✅ 使用 Gemini API 将新闻整理成各种风格的脚本（如郭德纲相声风格）
- ✅ 通过语音克隆 API 生成不同风格的音频（如郭德纲风格的声音）
- ✅ 自动生成符合 Podcast 标准的 RSS Feed
- ✅ 支持音频文件（MP3 格式）和字幕文件（VTT 格式）
- ✅ 脚本和音频文件存储在 Cloudflare R2
- ✅ 通过 Cloudflare Worker 动态生成 RSS，实现 Podcast 订阅
- ✅ 包含 iTunes 标签支持
- ✅ 易于扩展和自定义

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置

创建 `config.js` 文件并配置 API 密钥：

```javascript
module.exports = {
  // Podcast 配置
  podcast: {
    title: '新闻播客',
    description: '每日热点新闻播报',
    link: 'https://your-worker.yourdomain.workers.dev',
    language: 'zh-CN',
    author: 'AI 播客生成器',
    email: 'podcast@example.com',
    category: 'News',
    imageUrl: 'https://your-r2-bucket.r2.cloudflarestorage.com/podcast-cover.jpg',
    baseUrl: 'https://your-r2-bucket.r2.cloudflarestorage.com'
  },
  // API 配置
  apis: {
    gemini: {
      apiKey: 'your-gemini-api-key',
      model: 'gemini-pro'
    },
    voiceClone: {
      apiKey: 'your-voice-clone-api-key',
      endpoint: 'https://api.voiceclone.com/generate'
    }
  },
  // BBC RSS 来源
  bbcRssUrl: 'https://feeds.bbci.co.uk/news/rss.xml',
  // Cloudflare 配置
  cloudflare: {
    r2: {
      accountId: 'your-account-id',
      accessKeyId: 'your-access-key-id',
      secretAccessKey: 'your-secret-access-key',
      bucketName: 'your-bucket-name'
    },
    worker: {
      scriptName: 'podcast-rss-demo'
    }
  }
};
```

### 3. 本地测试

运行本地演示脚本：

```bash
node index.js
```

这将从 BBC 获取新闻，使用 Gemini 生成脚本，使用语音克隆生成音频，并生成示例 RSS Feed。

### 4. 部署到 Cloudflare Worker

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 部署 Worker
wrangler deploy
```

部署后，你的 Podcast RSS Feed 将在 `https://your-worker.yourdomain.workers.dev/rss.xml` 可用。

## Cloudflare R2 配置

### 创建 R2 桶

1. 登录 Cloudflare Dashboard
2. 导航到 R2 Object Storage
3. 创建新的 R2 桶（例如：`my-podcast-files`）
4. 配置公开访问（如果需要）或使用自定义域名

### 上传文件结构

将你的音频和字幕文件按以下结构上传到 R2 桶：

```
your-r2-bucket/
├── audio/
│   ├── episode-001.mp3
│   └── episode-002.mp3
├── subtitles/
│   ├── episode-001.vtt
│   └── episode-002.vtt
└── podcast-cover.jpg
```

### 配置自定义域名（推荐）

在 R2 桶设置中绑定自定义域名，例如：
- `https://cdn.yourpodcast.com`
- `https://files.yourpodcast.com`

## 测试音频和字幕链接示例

项目中已包含两个测试剧集的占位链接：

1. **Episode 1: Introduction to Podcasting**
   - 音频：`https://your-r2-bucket.r2.cloudflarestorage.com/audio/episode-001.mp3`
   - 字幕：`https://your-r2-bucket.r2.cloudflarestorage.com/subtitles/episode-001.vtt`

2. **Episode 2: Advanced Podcast Techniques**
   - 音频：`https://your-r2-bucket.r2.cloudflarestorage.com/audio/episode-002.mp3`
   - 字幕：`https://your-r2-bucket.r2.cloudflarestorage.com/subtitles/episode-002.vtt`

## 部署思路

### 主要部署方案：Cloudflare Worker + R2 存储 (推荐)

1. **自动化流程**：
   - Worker 定时触发（或按需）从 BBC RSS 获取新闻
   - 使用 Gemini API 生成不同风格的脚本
   - 调用语音克隆 API 生成对应风格的音频
   - 将脚本和音频上传到 R2 存储
   - 动态生成包含最新剧集的 RSS Feed

2. **存储结构**：
   ```
   your-r2-bucket/
   ├── scripts/         # 脚本文件（.txt 或 .json）
   │   ├── 2024-01-01-guo-de-gang.txt
   │   └── 2024-01-02-news-anchor.txt
   ├── audio/           # 音频文件
   │   ├── 2024-01-01-guo-de-gang.mp3
   │   └── 2024-01-02-news-anchor.mp3
   └── podcast-cover.jpg
   ```

3. **Worker 端点**：
   - `GET /rss.xml` - 生成 RSS Feed
   - `POST /generate` - 手动触发新剧集生成

### GitHub Actions 自动化部署

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Worker
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy Worker
        uses: cloudflare/wrangler-action@2.0.0
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
```

## RSS Feed 验证

生成 RSS Feed 后，可以使用以下工具验证：

- [Cast Feed Validator](https://castfeedvalidator.com/)
- [Podbase RSS Validator](https://podba.se/validate/)
- [W3C Feed Validation Service](https://validator.w3.org/feed/)

## 剧集生成流程

项目采用全自动化生成，不需要手动添加剧集：

1. **新闻获取**：定时从 BBC RSS 拉取最新热点新闻
2. **脚本生成**：使用 Gemini API 将新闻整理成指定风格的播客脚本（如相声、新闻播报等）
3. **音频生成**：调用语音克隆 API，使用对应风格的声音生成音频文件
4. **存储上传**：将脚本和音频文件上传到 Cloudflare R2
5. **RSS 更新**：Worker 动态生成包含最新剧集的 RSS Feed

### 自定义风格配置

在 `config.js` 中添加新的播客风格：

```javascript
styles: [
  {
    name: 'guo-de-gang',
    description: '郭德纲相声风格',
    prompt: '请用郭德纲的相声风格讲述这些新闻...',
    voiceId: 'guo-de-gang-clone'
  },
  {
    name: 'news-anchor',
    description: '专业新闻播报',
    prompt: '请用专业新闻播报员的风格整理这些新闻...',
    voiceId: 'news-anchor-clone'
  }
]
```

## 技术栈

- **Node.js**: 后端逻辑和脚本处理
- **Cloudflare Workers**: 动态 RSS 生成和 API 调用
- **Cloudflare R2**: 脚本和音频文件存储
- **Gemini API**: AI 脚本生成
- **语音克隆 API**: 音频生成和语音合成
- **BBC RSS**: 新闻数据源
- **RSS 2.0**: Podcast 标准格式
- **iTunes Podcast Namespace**: 增强的 Podcast 支持

## 注意事项

1. **API 密钥安全**：妥善保管 Gemini 和语音克隆 API 的密钥，不要提交到版本控制
2. **R2 存储费用**：注意音频文件存储和传输产生的费用
3. **Worker 限制**：Cloudflare Worker 有执行时间和内存限制
4. **RSS 更新频率**：避免过于频繁生成新剧集，以免违反 API 限制
5. **内容合规**：确保生成的播客内容符合相关法律法规和平台政策
6. **版权考虑**：新闻内容的使用应注意版权问题

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！