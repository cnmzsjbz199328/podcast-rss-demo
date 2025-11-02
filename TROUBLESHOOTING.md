# 🔧 Cloudflare 部署故障排除

## 认证错误解决指南

### 错误：Unable to authenticate request [code: 10001]

这个错误表示 Cloudflare API 认证失败。

#### 🔍 诊断步骤

1. **检查 Account ID**
   ```bash
   # 确认 wrangler.toml 中的 account_id
   cat wrangler.toml | grep account_id
   # 应该显示：account_id = "e5bb181bf10eddf30de93f35885a5479"
   ```

2. **检查 API Token**
   ```bash
   # 检查环境变量（不要直接显示token）
   echo $CLOUDFLARE_API_TOKEN | wc -c
   # 应该显示 token 长度（通常 > 40 个字符）
   ```

3. **验证 Token 权限**
   - 登录 Cloudflare Dashboard
   - 前往：https://dash.cloudflare.com/profile/api-tokens
   - 确认你的 token 包含以下权限：
     - `Account: Cloudflare Workers:Edit`
     - `Account: Cloudflare Workers:Read`

#### 🛠️ 解决方案

##### 方案1：使用环境变量（推荐）

1. 编辑 `.env` 文件：
   ```env
   CLOUDFLARE_ACCOUNT_ID=e5bb181bf10eddf30de93f35885a5479
   CLOUDFLARE_API_TOKEN=你的真实API_Token
   ```

2. 重新加载环境变量：
   ```bash
   source .env
   # 或者重启终端
   ```

3. 测试部署：
   ```bash
   npm run deploy
   ```

##### 方案2：使用有效的 API Token（推荐）

1. **获取 API Token**：
   - 访问：https://dash.cloudflare.com/profile/api-tokens
   - 点击 "Create Token"
   - 选择 "Edit Cloudflare Workers" 模板
   - 或创建自定义 token，包含以下权限：
     - `Account: Cloudflare Workers:Edit`
     - `Account: Cloudflare Workers:Read`

2. **设置环境变量**：
   ```bash
   # 编辑 .env 文件，将 token 填入
   CLOUDFLARE_API_TOKEN=你的真实API_Token
   ```

3. **测试部署**：
   ```bash
   npm run check:deploy  # 检查配置
   npm run deploy        # 部署
   ```

##### 方案3：使用 wrangler 登录（仅限有浏览器环境）

如果你的环境支持浏览器：

1. 清除环境变量：
   ```bash
   unset CLOUDFLARE_API_TOKEN
   ```

2. 使用浏览器登录：
   ```bash
   npx wrangler login
   ```
   - 会打开浏览器让你登录 Cloudflare
   - 选择你的账户并授权

3. 然后部署：
   ```bash
   npm run deploy
   ```

##### 方案3：检查 wrangler 版本

```bash
# 更新 wrangler 到最新版本
npm install -g wrangler@latest

# 检查版本
wrangler --version
```

#### 🔍 进一步调试

1. **查看详细日志**：
   ```bash
   # 启用详细日志
   WRANGLER_LOG=debug npm run deploy
   ```

2. **检查 wrangler 配置**：
   ```bash
   # 查看 wrangler 状态
   npx wrangler whoami
   ```

3. **清理缓存**：
   ```bash
   # 清除 wrangler 缓存
   rm -rf ~/.wrangler
   rm -rf node_modules/.cache/wrangler
   ```

### 其他常见错误

#### 错误：A request to the Cloudflare API failed [code: 7003]

**原因**：Account ID 格式错误

**解决**：
```bash
# Account ID 应该是32个字符的十六进制字符串
# 格式类似：e5bb181bf10eddf30de93f35885a5479
```

#### 错误：Workers requires a paid plan

**原因**：免费账户无法部署 Workers

**解决**：
- 升级到付费计划
- 或使用本地开发模式：`npm run dev:local`

#### 错误：Script exceeds CPU time limit

**原因**：Worker 执行时间过长

**解决**：
- 优化代码性能
- 分离大任务到多个请求
- 考虑使用 Durable Objects

### 🚀 快速验证步骤

运行以下命令验证配置：

```bash
# 1. 检查 wrangler 状态
npx wrangler whoami

# 2. 检查配置
npx wrangler dev --dry-run

# 3. 本地测试
npm run dev:local
```

### 📞 获取帮助

如果问题仍然存在：

1. **检查 Cloudflare 状态页面**：https://www.cloudflare.com/status/
2. **查看 Wrangler 文档**：https://developers.cloudflare.com/workers/wrangler/
3. **提交 Issue**：https://github.com/cloudflare/workers-sdk/issues

### 🎯 成功部署标志

部署成功时你会看到：
```
✨ Successfully published your script to
   https://podcast-rss-demo.your-subdomain.workers.dev
```

然后你可以访问：
- `GET https://your-worker-url/rss.xml` - 获取RSS Feed
- `POST https://your-worker-url/generate?style=guo-de-gang` - 生成播客
