# 🎙️ AI Podcast Generator

> **基于 Cloudflare Workers 的全自动Podcast生成系统**

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ⚡ 快速开始

这是一个完全自动化的Podcast生成系统，从News获取到语音合成，一键完成。

### 核心特性

- 🤖 **AI 驱动**: 使用 Google Gemini AI 生成Podcast脚本
- 🎵 **语音合成**: 采用 IndexTTS 进行自然语音转换
- 📡 **RSS 支持**: 自动生成 RSS Feed，兼容所有Podcast客户端
- 🌍 **边缘计算**: 基于 Cloudflare Workers，全球低延迟
- 💾 **云端存储**: R2 + D1 存储，无限容量
- 🎨 **多种风格**: News主播、相声风格、情感播报等

### 一键部署

```bash
# 1. 克隆项目
git clone <repository-url>
cd podcast-rss-demo

# 2. 安装依赖
npm install

# 3. 登录 Cloudflare
npx wrangler login

# 4. 创建基础设施
npx wrangler r2 bucket create podcast-files
npx wrangler d1 create podcast-database
# 复制 database_id 到 wrangler.toml

# 5. 初始化数据库
npx wrangler d1 execute podcast-database --remote --file=./schema.sql

# 6. 配置 API Key
npx wrangler secret put GEMINI_API_KEY

# 7. 部署上线
npx wrangler deploy

# 8. 测试
npm run test:production
```

### 快速测试

```bash
# 健康检查
curl https://your-worker.workers.dev/health

# 生成Podcast（约30秒）
curl -X POST "https://your-worker.workers.dev/generate?style=news-anchor"

# 查看剧集列表
curl https://your-worker.workers.dev/episodes

# RSS Feed
curl https://your-worker.workers.dev/rss.xml
```

## 📖 完整文档

详细使用说明请查看：**[PROJECT-GUIDE.md](./PROJECT-GUIDE.md)**

包含以下内容：
- 🏗️ 架构设计
- 🚀 部署指南
- 📡 API 文档
- 🧪 测试说明
- 🔧 故障排除
- 💻 开发指南

## 📂 项目结构

```
podcast-rss-demo/
├── src/                      # 源代码
│   ├── core/                 # 核心业务逻辑
│   ├── implementations/      # 服务实现
│   ├── services/             # 接口定义
│   └── utils/                # 工具函数
├── worker.js                 # Worker 入口
├── schema.sql                # D1 数据库 Schema
├── wrangler.toml             # Cloudflare 配置
├── test-production-e2e.js    # E2E 测试
└── PROJECT-GUIDE.md          # 完整文档
```

## 🛠️ 技术栈

- **运行时**: Cloudflare Workers (V8 Isolates)
- **AI**: Google Gemini 1.5 Flash
- **TTS**: IndexTTS v2
- **存储**: Cloudflare R2 (S3 兼容)
- **数据库**: Cloudflare D1 (SQLite)
- **语言**: JavaScript (ES Modules)

## 📊 系统状态

部署后可访问健康检查接口：

```bash
GET /health
```

返回示例：
```json
{
  "status": "healthy",
  "services": {
    "database": true,
    "storage": true
  }
}
```

## 📝 License

MIT

## 👤 Author

tangjiang
