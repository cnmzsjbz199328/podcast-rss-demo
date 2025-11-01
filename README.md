# Podcast RSS Demo

一个用于展示 Podcast RSS Feed 最小实现的演示项目。音频和字幕文件托管在 Cloudflare R2 对象存储上。

## 项目结构

```
podcast-rss-demo/
├── public/              # 存放音频和字幕测试文件的目录
│   ├── audio/          # 音频文件（.mp3, .m4a 等）
│   └── subtitles/      # 字幕文件（.vtt, .srt 等）
├── index.js            # RSS Feed 生成器主文件
├── rss.xml             # 生成的 RSS Feed 文件
└── README.md           # 项目说明文档
```

## 功能特性

- ✅ 自动生成符合 Podcast 标准的 RSS Feed
- ✅ 支持音频文件（MP3 格式）
- ✅ 支持字幕文件（VTT 格式）
- ✅ 音频和字幕文件托管在 Cloudflare R2
- ✅ 包含 iTunes 标签支持
- ✅ 易于扩展和自定义

## 快速开始

### 1. 安装依赖

本项目使用 Node.js 标准库，无需安装额外依赖。

### 2. 配置

编辑 `index.js` 文件中的配置部分：

```javascript
const config = {
  title: 'My Podcast Demo',
  description: 'A minimal podcast implementation demo',
  link: 'https://your-domain.com',
  language: 'zh-CN',
  author: 'Podcast Author',
  email: 'podcast@example.com',
  category: 'Technology',
  imageUrl: 'https://your-r2-bucket.r2.cloudflarestorage.com/podcast-cover.jpg',
  baseUrl: 'https://your-r2-bucket.r2.cloudflarestorage.com'
};
```

**重要：** 将 `your-r2-bucket.r2.cloudflarestorage.com` 替换为你的 Cloudflare R2 桶域名。

### 3. 生成 RSS Feed

```bash
node index.js
```

这将生成 `rss.xml` 文件，可以直接用于 Podcast 平台。

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

### 方案 1: 静态托管 + R2 存储

1. **音频/字幕存储**：使用 Cloudflare R2 存储所有媒体文件
2. **RSS Feed 托管**：将生成的 `rss.xml` 部署到：
   - Cloudflare Pages
   - GitHub Pages
   - Vercel/Netlify
   - 或任何静态文件托管服务

### 方案 2: 动态生成 (推荐)

1. 使用 Cloudflare Workers 动态生成 RSS Feed
2. 从 R2 桶读取音频文件元数据
3. 自动更新 RSS Feed，无需手动重新生成

### 方案 3: 自动化部署

```yaml
# .github/workflows/deploy.yml
name: Generate and Deploy RSS
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Generate RSS
        run: node index.js
      - name: Deploy to Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: .
```

## RSS Feed 验证

生成 RSS Feed 后，可以使用以下工具验证：

- [Cast Feed Validator](https://castfeedvalidator.com/)
- [Podbase RSS Validator](https://podba.se/validate/)
- [W3C Feed Validation Service](https://validator.w3.org/feed/)

## 添加新剧集

在 `index.js` 的 `episodes` 数组中添加新对象：

```javascript
{
  title: 'Episode 3: Your New Episode',
  description: 'Episode description here',
  pubDate: new Date('2024-02-01').toUTCString(),
  audioUrl: `${config.baseUrl}/audio/episode-003.mp3`,
  audioLength: 20123456, // 文件大小（字节）
  duration: '35:20',
  subtitleUrl: `${config.baseUrl}/subtitles/episode-003.vtt`,
  guid: 'episode-003'
}
```

然后重新运行 `node index.js` 生成新的 RSS Feed。

## 技术栈

- **Node.js**: RSS Feed 生成
- **Cloudflare R2**: 音频和字幕文件存储
- **RSS 2.0**: Podcast 标准格式
- **iTunes Podcast Namespace**: 增强的 Podcast 支持

## 注意事项

1. **文件大小**：`audioLength` 需要填写实际的音频文件字节大小
2. **时长格式**：`duration` 使用 `HH:MM:SS` 或 `MM:SS` 格式
3. **GUID**：每个剧集的 `guid` 必须唯一且不能改变
4. **发布日期**：`pubDate` 应使用 RFC 2822 格式（已在代码中处理）

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！