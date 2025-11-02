# 🚀 Cloudflare Worker 部署 - 快速参考

## ⚡ 五分钟快速部署

### 1️⃣ 获取凭证（5分钟）

```bash
# 获取 Account ID
# 访问: https://dash.cloudflare.com/profile/api-tokens
# 向下滚动找到 "Account ID" 部分

# 创建 API Token
# 访问: https://dash.cloudflare.com/profile/api-tokens
# 点击 "Create Token" → 选择 "Edit Cloudflare Workers"

# 获取 Gemini API Key
# 访问: https://makersuite.google.com/app/apikey
```

### 2️⃣ 配置环境变量（2分钟）

```bash
# 复制模板
cp .env.example .env

# 编辑 .env 文件，填入：
# CLOUDFLARE_ACCOUNT_ID=...
# CLOUDFLARE_API_TOKEN=...
# GEMINI_API_KEY=...
```

### 3️⃣ 检查配置（1分钟）

```bash
npm run deploy:check
```

应该看到所有项都是 ✅

### 4️⃣ 部署（1分钟）

```bash
npm run deploy:prod
```

### 5️⃣ 验证部署（1分钟）

```bash
curl https://your-domain.workers.dev/health
```

---

## 📋 完整部署流程

```
┌─────────────────────────────────────────┐
│ 第1步: 获取凭证                         │
│ ✓ Account ID                            │
│ ✓ API Token                             │
│ ✓ Gemini API Key                        │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│ 第2步: 配置环境                         │
│ ✓ cp .env.example .env                  │
│ ✓ 编辑 .env 填入凭证                    │
│ ✓ 更新 wrangler.toml account_id         │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│ 第3步: 本地验证                         │
│ ✓ npm run deploy:check                  │
│ ✓ npm run test:api                      │
│ ✓ wrangler dev                          │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│ 第4步: 部署到生产                       │
│ ✓ npm run deploy:prod                   │
│ ✓ 或 npm run deploy:interactive         │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│ 第5步: 验证和配置                       │
│ ✓ curl /health 检查健康状态             │
│ ✓ wrangler tail 查看日志                │
│ ✓ 配置自定义域名（可选）               │
└─────────────────────────────────────────┘
```

---

## 🔧 常用命令

### 部署相关

```bash
# 检查部署前准备
npm run deploy:check

# 本地开发
npm run dev

# 本地开发（离线模式）
npm run dev:local

# 直接部署
npm run deploy

# 检查部署（包括检查脚本）
npm run deploy:prod

# 交互式部署
npm run deploy:interactive

# 查看部署日志
npm run deploy:logs

# 查看部署历史
npm run deploy:verify
```

### 测试相关

```bash
# 测试 API 端点
npm run test:api

# 单元测试
npm run test:unit

# 集成测试
npm run test:voice

# 所有测试
npm run test:all
```

### R2 存储相关

```bash
# 列出存储桶
npm run r2:list

# 查看存储桶信息
npm run r2:info
```

### 环境变量相关

```bash
# 查看所有 secrets
npm run secrets:list

# 设置 secret（交互式）
wrangler secret put GEMINI_API_KEY
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
```

---

## 🔑 凭证获取速查表

| 凭证 | 用途 | 获取方式 |
|------|------|---------|
| Account ID | Cloudflare 账户识别 | https://dash.cloudflare.com/profile/api-tokens (底部) |
| API Token | 授权 wrangler 部署 | https://dash.cloudflare.com/profile/api-tokens (Create Token) |
| Gemini API Key | AI 脚本生成 | https://makersuite.google.com/app/apikey |
| R2 Access Key | 文件存储（可选） | Cloudflare Dashboard → R2 → API Tokens |
| R2 Secret Key | 文件存储（可选） | 同上 |

---

## 🌐 API 端点

部署后可用的端点：

```
GET  /health              - 健康检查
GET  /rss.xml             - RSS Feed
POST /generate?style=...  - 生成播客
```

### 示例

```bash
# 健康检查
curl https://your-domain.workers.dev/health

# 获取 RSS
curl https://your-domain.workers.dev/rss.xml > podcast.xml

# 生成播客
curl -X POST \
  https://your-domain.workers.dev/generate?style=guo-de-gang
```

---

## 🐛 故障排除

### 部署前检查失败

```bash
# 检查各项
npm run deploy:check

# 常见问题：
# ❌ Account ID 不正确 → 查看 wrangler.toml
# ❌ API Token 不正确 → 重新创建 Token
# ❌ 环境变量未设置 → 检查 .env 文件
```

### 部署失败

```bash
# 查看详细日志
npm run deploy:logs

# 验证凭证
echo $CLOUDFLARE_API_TOKEN
echo $CLOUDFLARE_ACCOUNT_ID

# 重新登录
wrangler login
```

### Worker 无法访问

```bash
# 查看部署状态
npm run deploy:verify

# 查看最新日志
wrangler tail

# 测试本地版本
npm run dev
```

---

## 📊 环境配置对照表

### 开发环境

```bash
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
```

### 测试环境

```bash
NODE_ENV=staging
DEBUG=false
LOG_LEVEL=info
```

### 生产环境

```bash
NODE_ENV=production
DEBUG=false
LOG_LEVEL=warn
```

---

## 💡 最佳实践

### ✅ DO

- ✓ 使用 `wrangler secret` 存储敏感信息
- ✓ 定期检查 Worker 日志
- ✓ 使用版本控制管理配置
- ✓ 设置监控和告警
- ✓ 定期备份和更新依赖

### ❌ DON'T

- ✗ 不要在代码中硬编码密钥
- ✗ 不要将 `.env` 提交到 git
- ✗ 不要分享 API Token
- ✗ 不要忽略部署检查
- ✗ 不要在生产环境测试关键功能

---

## 🔄 部署后配置

### 1. 设置环境变量（Secrets）

```bash
wrangler secret put GEMINI_API_KEY
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
```

### 2. 配置自定义域名

在 Cloudflare Dashboard 中：
1. 添加你的域名
2. 配置 Worker 路由
3. 设置 DNS 记录

### 3. 启用监控

在 Cloudflare Analytics 中：
1. 查看请求统计
2. 设置错误告警
3. 监控性能指标

### 4. 定时任务（可选）

在 `wrangler.toml` 中配置：
```toml
[[triggers.crons]]
crons = ["0 0 * * *"]
```

---

## 📞 获取帮助

- 📖 完整指南: 查看 `DEPLOYMENT-GUIDE.md`
- 📝 测试说明: 查看 `TESTING.md`
- 🔗 官方文档: https://developers.cloudflare.com/workers/
- 💬 社区: Cloudflare Community

---

**关键术语**

- **Worker**: Cloudflare 的无服务器函数
- **Wrangler**: Cloudflare Workers 命令行工具
- **Account ID**: 你的 Cloudflare 账户唯一标识
- **API Token**: 授权 wrangler 操作的令牌
- **Secret**: 存储在 Cloudflare 的敏感信息
- **R2**: Cloudflare 的对象存储服务

---

**最后更新**: 2024-11-03
