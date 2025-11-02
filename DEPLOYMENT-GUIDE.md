# 🚀 Cloudflare Worker 部署完整指南

一个分步骤的完整部署指南，从零开始到上线。

## 📋 目录

1. [前置要求和准备](#前置要求和准备)
2. [第1步：获取 Cloudflare 凭证](#第1步获取-cloudflare-凭证)
3. [第2步：配置环境变量](#第2步配置环境变量)
4. [第3步：本地验证](#第3步本地验证)
5. [第4步：部署到生产](#第4步部署到生产)
6. [第5步：验证部署](#第5步验证部署)
7. [第6步：生产环境配置](#第6步生产环境配置)
8. [故障排除](#故障排除)

---

## 前置要求和准备

### 检查清单

- [ ] 已注册 Cloudflare 账户（https://dash.cloudflare.com/）
- [ ] Node.js >= 16 已安装
- [ ] 已克隆项目代码到本地
- [ ] 已运行 `npm install`

### 验证环境

```bash
# 检查 Node.js 版本
node --version  # 应该 >= v16

# 检查 npm 版本
npm --version   # 应该 >= 8

# 检查依赖是否已安装
npm ls @gradio/client @aws-sdk/client-s3 @google/genai
```

---

## 第1步：获取 Cloudflare 凭证

### 1.1 获取 Account ID

1. 访问 https://dash.cloudflare.com/
2. 登录你的 Cloudflare 账户
3. 点击右上角的账户名称
4. 选择 "My Profile" 或直接访问 https://dash.cloudflare.com/profile/api-tokens
5. 向下滚动到 "Account ID" 部分
6. 复制你的 **Account ID**（看起来像：`e5bb181bf10eddf30de93f35885a5479`）

**保存**: 稍后会用到

### 1.2 创建 API Token

1. 访问 https://dash.cloudflare.com/profile/api-tokens
2. 点击 **"Create Token"** 按钮
3. 在模板中选择 **"Edit Cloudflare Workers"**
4. 或者自定义权限配置：
   - **权限**: Account > Cloudflare Workers Scripts > Edit
   - **账户资源**: 选择所有账户（All accounts）或特定账户
5. 点击 "Continue to summary"
6. 点击 "Create Token"
7. **立即复制 Token**（只会显示一次！）

**保存**: 这个 Token 非常重要，不要分享！

### 1.3 获取 Gemini API Key

1. 访问 https://makersuite.google.com/app/apikey
2. 点击 **"Create API Key"** 或 **"Get API Key"**
3. 选择创建新项目或选择现有项目
4. 复制生成的 **API Key**

**保存**: 记下这个密钥

### 1.4 设置 R2 存储（推荐，可选）

如果需要存储播客文件：

1. 在 Cloudflare Dashboard 中启用 R2
2. 创建存储桶（例如：`podcast-files`）
3. 生成 R2 API 令牌：
   - 访问 Dashboard -> R2 -> API Tokens
   - 点击 "Create API token"
   - 选择适当的权限
4. 记下 Access Key ID 和 Secret Access Key

---

## 第2步：配置环境变量

### 2.1 创建 .env 文件

```bash
# 从模板复制
cp .env.example .env

# 用编辑器打开
nano .env
# 或
code .env
```

### 2.2 填写必需的配置

编辑 `.env` 文件，填写以下信息：

```bash
# 必需的 Cloudflare 凭证
CLOUDFLARE_ACCOUNT_ID=e5bb181bf10eddf30de93f35885a5479    # 从第1步复制
CLOUDFLARE_API_TOKEN=your_actual_api_token_here           # 从第1步复制

# 必需的 AI 服务配置
GEMINI_API_KEY=your_actual_gemini_key_here                # 从第1步复制

# R2 存储配置（如果不使用，可以留空）
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=podcast-files
R2_BASE_URL=https://podcast-files.r2.dev

# 其他配置（可选）
NODE_ENV=production
LOG_LEVEL=info
DEBUG=false
```

### 2.3 验证 wrangler.toml

检查 `wrangler.toml` 文件中的 account_id：

```bash
cat wrangler.toml | grep account_id
```

应该看到：
```toml
account_id = "e5bb181bf10eddf30de93f35885a5479"
```

如果不正确，用 Step 1.1 中的 Account ID 更新。

### 2.4 保证文件安全

确保 `.env` 已在 `.gitignore` 中：

```bash
cat .gitignore | grep ".env"
```

应该看到 `.env` 的条目。

---

## 第3步：本地验证

### 3.1 运行部署前检查

```bash
# 检查所有必需的配置和依赖
node scripts/check-deployment.js
```

应该看到所有检查项都是 ✅

### 3.2 测试 API 连接

```bash
# 验证 API 端点
npm run test:api
```

应该看到：
```
✅ 连接成功
✅ /on_method_select 端点可用
✅ /on_input_text_change 端点可用
✅ /update_prompt_audio 端点可用
✅ /gen_single 端点可用
```

### 3.3 运行语音克隆测试

```bash
# 测试语音生成功能
npm run test:unit
```

应该看到大部分测试通过。

### 3.4 本地测试 Worker

```bash
# 在本地运行 Worker
wrangler dev
```

访问 http://localhost:8787/health 来测试健康检查端点。

应该返回：
```json
{
  "status": "healthy",
  "timestamp": "2024-11-03T...",
  "services": {...}
}
```

---

## 第4步：部署到生产

### 4.1 使用自动化部署脚本

```bash
# 运行交互式部署脚本
npm run deploy:interactive
```

或使用 npm 脚本：

```bash
# 直接部署
npm run deploy:prod
```

### 4.2 手动部署

如果你更喜欢手动过程：

```bash
# 首先登录 Cloudflare
wrangler login

# 或者直接使用 API Token（无需 login）
export CLOUDFLARE_API_TOKEN=your_token_here

# 部署到生产环境
wrangler deploy

# 查看部署日志
wrangler tail
```

### 4.3 验证部署

部署完成后应该看到类似的输出：

```
✓ Deployed worker to https://podcast-rss-demo.your-domain.workers.dev
```

---

## 第5步：验证部署

### 5.1 测试 Health 端点

```bash
curl https://your-domain.workers.dev/health
```

应该返回 200 状态和健康信息。

### 5.2 测试 RSS 端点

```bash
curl https://your-domain.workers.dev/rss.xml
```

应该返回有效的 RSS XML。

### 5.3 查看 Worker 日志

```bash
# 实时查看日志
wrangler tail

# 查看部署历史
wrangler deployments list

# 查看特定部署的详情
wrangler deployments view <deployment_id>
```

### 5.4 检查部署信息

```bash
# 列出所有已部署的 Workers
wrangler list

# 查看特定 Worker 的信息
wrangler info podcast-rss-demo
```

---

## 第6步：生产环境配置

### 6.1 设置敏感环境变量

对于生产环境，推荐使用 Cloudflare Secrets 而不是在 .env 中存储敏感信息：

```bash
# 设置 Gemini API Key
wrangler secret put GEMINI_API_KEY

# 设置 R2 凭证
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY

# 设置其他敏感数据
wrangler secret put INDEXTTS_HF_TOKEN  # 如果需要
```

**注意**: 这些命令会提示你输入值（不会在终端显示）

### 6.2 配置自定义域名

如果想使用自定义域名而不是 workers.dev 域名：

1. 在 Cloudflare Dashboard 中添加你的域名
2. 配置 Worker 路由：
   ```bash
   wrangler routes put your-domain.com/podcast/* --script=podcast-rss-demo
   ```

或者在 `wrangler.toml` 中配置：

```toml
[[routes]]
pattern = "your-domain.com/podcast/*"
zone_id = "your_zone_id"
```

### 6.3 设置定时任务（可选）

在 `wrangler.toml` 中配置定时生成播客：

```toml
[[triggers.crons]]
crons = ["0 0 * * *"]  # 每天午夜 UTC 执行
```

### 6.4 配置监控和告警

在 Cloudflare Analytics 中：

1. 设置错误率告警
2. 监控请求数量
3. 跟踪 Worker 性能

---

## 故障排除

### 问题 1: 部署失败 - Invalid account ID

**错误信息**:
```
Could not route to /client/v4/accounts/your_account_id/workers/scripts
```

**解决方案**:
- 检查 `wrangler.toml` 中的 account_id 是否正确
- 在 https://dash.cloudflare.com/profile/api-tokens 中验证
- 尝试重新复制 Account ID

### 问题 2: 部署失败 - Authentication error

**错误信息**:
```
Invalid API token or insufficient permissions
```

**解决方案**:
- 检查 CLOUDFLARE_API_TOKEN 环境变量是否设置
- 验证 Token 是否有 Workers Edit 权限
- 重新创建新的 Token
- 确保 Token 未过期

### 问题 3: Worker 无法访问外部 API

**错误信息**:
```
Network request failed
```

**解决方案**:
- 验证网络连接
- 检查防火墙设置
- 确认 Cloudflare 账户是否为付费计划
- 查看 Worker 日志: `wrangler tail`

### 问题 4: RSS 端点返回错误

**解决方案**:
```bash
# 查看详细日志
wrangler tail --format pretty

# 检查 R2 配置
wrangler r2 bucket list

# 测试 R2 连接
wrangler r2 bucket-metadata get podcast-files
```

### 问题 5: 性能问题或超时

**解决方案**:
- 检查生成参数（在 `src/config/index.js` 中）
- 增加超时时间：`REQUEST_TIMEOUT=60000`
- 查看 Cloudflare Analytics 中的性能指标
- 考虑使用更少的并发请求

---

## 后续维护

### 定期检查

```bash
# 每周检查一次
npm run deploy:check

# 查看使用统计
wrangler analytics

# 清理旧的部署
wrangler delete old-deployment-id
```

### 更新依赖

```bash
# 检查过期的包
npm outdated

# 更新所有包
npm update

# 重新部署
npm run deploy:prod
```

### 备份和恢复

```bash
# 查看所有部署
wrangler deployments list

# 回滚到特定版本
wrangler deployments rollback <deployment_id>
```

---

## 📞 获取帮助

如果遇到问题，请：

1. 查看 Cloudflare 文档: https://developers.cloudflare.com/workers/
2. 查看项目文档: 本仓库的 DEPLOYMENT.md
3. 查看日志: `wrangler tail`
4. 检查环境变量: `printenv | grep CLOUDFLARE`

---

**最后更新**: 2024-11-03
**维护者**: 项目团队
