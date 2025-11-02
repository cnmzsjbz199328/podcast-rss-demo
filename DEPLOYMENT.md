# 🚀 Cloudflare Worker 部署指南

## 前置要求

### 1. Cloudflare 账户
- 注册 Cloudflare 账户：https://dash.cloudflare.com/

### 2. 获取 API 凭据

#### 获取 Account ID
1. 登录 Cloudflare Dashboard
2. 点击右上角的账户名称
3. 选择 "My Profile"
4. 在 API Tokens 页面，找到 "Account ID"

#### 获取 API Token
1. 登录 Cloudflare Dashboard
2. 前往：https://dash.cloudflare.com/profile/api-tokens
3. 点击 "Create Token"
4. 选择 "Edit Cloudflare Workers" 模板
5. 或者创建自定义 token，包含以下权限：
   - Account: Cloudflare Workers:Edit
   - Zone: Zone:Read (如果需要域名绑定)

### 3. R2 存储设置（可选）

如果需要文件存储功能：

1. 在 Cloudflare Dashboard 中启用 R2
2. 创建存储桶
3. 生成 R2 API 令牌

## 部署步骤

### 步骤1：配置环境变量

编辑 `.env` 文件，填入真实的 Cloudflare 凭据：

```env
# Cloudflare 配置
CLOUDFLARE_ACCOUNT_ID=你的真实账户ID
CLOUDFLARE_API_TOKEN=你的真实API令牌

# R2 存储（如果需要）
R2_ACCESS_KEY_ID=你的R2访问密钥
R2_SECRET_ACCESS_KEY=你的R2秘密密钥
R2_BUCKET_NAME=你的存储桶名称
R2_BASE_URL=https://你的存储桶域名

# 其他配置保持不变
GEMINI_API_KEY=你的Gemini密钥
```

### 步骤2：更新 wrangler.toml

编辑 `wrangler.toml` 文件：

```toml
name = "podcast-rss-demo"
main = "worker.js"
compatibility_flags = ["nodejs_compat"]
compatibility_date = "2025-10-11"

# 设置你的真实账户ID
account_id = "你的真实Cloudflare账户ID"
```

### 步骤3：本地测试

在部署前，先进行本地测试：

```bash
# 安装 wrangler
npm install -g wrangler

# 登录 Cloudflare（可选，会自动从环境变量读取）
wrangler auth login

# 本地开发模式
npm run dev:local

# 或者连接到远程环境
npm run dev
```

### 步骤4：部署到生产环境

```bash
# 部署 Worker
npm run deploy

# 查看部署状态
wrangler tail
```

## 部署后的配置

### 自定义域名（可选）

1. 在 Cloudflare Dashboard 中添加域名
2. 配置 Worker 路由：
   ```bash
   wrangler routes put your-domain.com/rss.xml --script=podcast-rss-demo
   ```

### 环境变量设置

生产环境中设置环境变量：

```bash
# 设置 Worker 环境变量
wrangler secret put GEMINI_API_KEY
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
```

## API 端点

部署成功后，可用的 API 端点：

- `GET /rss.xml` - 获取 RSS Feed
- `POST /generate?style=guo-de-gang` - 生成指定风格的播客
- `GET /health` - 健康检查

## 故障排除

### 常见问题

#### 1. 部署失败：Invalid account ID
```
错误：Could not route to /client/v4/accounts/your_cloudflare_account_id/...
```
**解决**：检查 `wrangler.toml` 中的 `account_id` 是否正确

#### 2. 部署失败：Authentication error
```
错误：Invalid API token
```
**解决**：检查 API token 权限，确保包含 Workers 编辑权限

#### 3. Worker 无法访问外部 API
```
错误：Network request failed
```
**解决**：检查 Cloudflare 账户是否为付费计划

### 调试命令

```bash
# 查看 Worker 日志
wrangler tail

# 查看部署信息
wrangler deployments list

# 删除 Worker
wrangler delete
```

## 监控和维护

### 性能监控
- Cloudflare Analytics 查看请求统计
- 设置告警监控错误率

### 定期维护
- 监控 API 使用量
- 定期清理旧的播客文件
- 更新依赖包版本

## 本地开发替代方案

如果没有 Cloudflare 账户，可以使用本地开发模式：

```bash
# 本地运行（模拟环境）
npm run dev:local

# 或者直接运行 Node.js 版本
npm run start
```

本地模式不支持所有 Cloudflare 特有的功能，但可以测试核心逻辑。

## 生产环境注意事项

1. **安全性**：
   - 不要在代码中硬编码敏感信息
   - 使用 `wrangler secret` 设置敏感环境变量

2. **性能优化**：
   - 合理设置缓存策略
   - 监控 API 调用频率

3. **成本控制**：
   - 监控 Workers 请求数量
   - 定期清理不需要的资源

## 技术支持

如果遇到部署问题，请检查：
1. Cloudflare 账户状态和配额
2. API 令牌权限设置
3. 网络连接和防火墙设置
4. 环境变量格式是否正确

更多信息：https://developers.cloudflare.com/workers/
