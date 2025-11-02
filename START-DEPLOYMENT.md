# 🚀 实施指南 - 立即开始部署

这是一个**立即可执行**的指南，让您在 5-15 分钟内完成部署。

---

## 第0步：前置检查（2分钟）

```bash
# 检查 Node.js
node --version          # 应该 >= v16

# 检查 npm
npm --version           # 应该 >= v8

# 检查是否已安装 wrangler
wrangler --version

# 如果未安装，先安装
npm install -g wrangler
```

---

## 第1步：获取凭证（2-3分钟）

### 1.1 获取 Cloudflare Account ID

打开这个链接: https://dash.cloudflare.com/profile/api-tokens

**操作**:
1. 登录 Cloudflare 账户
2. 向下滚动找到 **Account ID** 部分
3. **复制** 32 位的 ID（例如: `e5bb181bf10eddf30de93f35885a5479`）
4. 保存到某个地方

### 1.2 创建 Cloudflare API Token

继续在同一个页面（https://dash.cloudflare.com/profile/api-tokens）

**操作**:
1. 点击 **"Create Token"** 按钮
2. 选择 **"Edit Cloudflare Workers"** 模板
3. 下一页检查权限：
   - ✓ Account > Cloudflare Workers Scripts > Edit
4. 下一页选择账户范围（通常选 "All accounts"）
5. 点击 **"Create Token"**
6. **立即复制 Token**（只显示一次！）
7. 保存到某个地方

### 1.3 获取 Gemini API Key

打开这个链接: https://makersuite.google.com/app/apikey

**操作**:
1. 登录 Google 账户
2. 点击 **"Get API Key"** 或 **"Create API Key"**
3. 选择项目（或创建新项目）
4. **复制** API Key
5. 保存到某个地方

✅ 现在您有 3 个凭证：Account ID、API Token、Gemini API Key

---

## 第2步：配置环境（2分钟）

```bash
# 进入项目目录
cd /Users/tangjiang/podcast-rss-demo

# 复制环境变量模板
cp .env.example .env

# 用编辑器打开 .env
# 在 macOS 上:
open -a "Visual Studio Code" .env

# 或用 nano
nano .env

# 或用 vim
vim .env
```

**在编辑器中**，找到以下行并替换：

```bash
# 替换这一行:
CLOUDFLARE_ACCOUNT_ID=你的账户ID

# 替换这一行:
CLOUDFLARE_API_TOKEN=your_api_token_here
# 改为复制的 Token

# 替换这一行:
GEMINI_API_KEY=your_gemini_api_key
# 改为复制的 Gemini Key
```

**保存文件** (Ctrl+S 或 Cmd+S)

---

## 第3步：验证配置（2分钟）

```bash
# 运行部署前检查
npm run deploy:check
```

**应该看到**:
```
✅ Node.js 版本
✅ npm 依赖
✅ 文件结构
✅ wrangler.toml 配置
✅ Wrangler CLI
✅ 环境变量
✅ Cloudflare 连接

成功率: 100%
✨ 所有检查通过！可以开始部署。
```

❌ 如果有失败项：
1. 读取错误消息
2. 按照提示修复
3. 重新运行 `npm run deploy:check`

---

## 第4步：部署到生产（3分钟）

### 方案 A：自动化部署（推荐）

```bash
# 运行交互式部署
npm run deploy:interactive
```

**按照提示操作**:
1. 确认先决条件 ✓
2. 选择环境：输入 **production**
3. 确认部署：输入 **y**
4. 等待部署完成

### 方案 B：快速部署

```bash
# 直接部署
npm run deploy:prod
```

### 方案 C：手动部署（如前两种失败）

```bash
# 显式设置 API Token
export CLOUDFLARE_API_TOKEN=$(cat .env | grep CLOUDFLARE_API_TOKEN | cut -d'=' -f2)

# 部署
wrangler deploy

# 查看日志
wrangler tail
```

---

## 第5步：验证部署成功（2分钟）

**看到类似的输出**:
```
✨ Success! Your worker was published to:
https://podcast-rss-demo.your-domain.workers.dev
```

**记下这个 URL**，这是您的 Worker 地址。

### 测试端点

```bash
# 测试健康检查
curl https://your-domain.workers.dev/health

# 应该看到 200 OK 和 JSON 响应
{
  "status": "healthy",
  "timestamp": "2024-11-03T...",
  "services": {...}
}
```

✅ 如果能看到上面的响应，说明部署成功了！

---

## 🎉 完成！

您已经成功部署了 Cloudflare Worker！

### 现在可以做什么

1. **查看日志**:
   ```bash
   npm run deploy:logs
   ```

2. **测试各个端点**:
   ```bash
   # RSS 源
   curl https://your-domain.workers.dev/rss.xml

   # 生成播客
   curl -X POST https://your-domain.workers.dev/generate?style=guo-de-gang
   ```

3. **配置自定义域名**（可选）:
   - 在 Cloudflare Dashboard 中配置路由

4. **设置敏感变量**（推荐）:
   ```bash
   wrangler secret put R2_ACCESS_KEY_ID
   wrangler secret put R2_SECRET_ACCESS_KEY
   ```

---

## 🐛 故障排除

### 问题 1: "Invalid account ID"

**解决**:
```bash
# 检查 wrangler.toml 中的 account_id
cat wrangler.toml | grep account_id

# 应该看到你的 32 位 ID
# 如果不对，编辑 wrangler.toml 并更正
```

### 问题 2: "Invalid API token"

**解决**:
```bash
# 重新创建 API Token
# 访问 https://dash.cloudflare.com/profile/api-tokens
# 生成新的 Token
# 更新 .env 文件
```

### 问题 3: 部署成功但无法访问

**解决**:
```bash
# 查看日志
npm run deploy:logs

# 等待几秒钟，部署可能还在初始化
sleep 5

# 再试一次
curl https://your-domain.workers.dev/health
```

### 问题 4: 其他错误

```bash
# 查看详细信息
wrangler tail --format pretty

# 检查所有配置
npm run deploy:check

# 重新部署
npm run deploy:prod
```

---

## 📚 获取帮助

如果遇到问题：

1. **查看日志**: `npm run deploy:logs`
2. **查看文档**: 
   - 完整指南: `DEPLOYMENT-GUIDE.md`
   - 快速参考: `DEPLOY-QUICK-REFERENCE.md`
   - 检查清单: `DEPLOYMENT-CHECKLIST.md`
3. **查看官方文档**: https://developers.cloudflare.com/workers/

---

## ✨ 下一步

部署完成后，您可以：

1. **监控性能**
   - 访问 Cloudflare Dashboard 查看 Analytics
   - 设置错误告警

2. **优化成本**
   - 监控 API 调用次数
   - 设置合理的缓存策略

3. **扩展功能**
   - 添加更多语音风格
   - 集成更多数据源
   - 优化生成质量

4. **自动化**
   - 设置定时任务自动生成播客
   - 配置 GitHub Actions 自动部署

---

## 🔐 安全提示

- ⚠️ **不要分享** API Token
- ⚠️ **不要提交** .env 文件到 git
- ⚠️ **定期轮换** API 密钥
- ✅ **使用** `wrangler secret` 存储敏感信息

---

## 📞 快速命令参考

```bash
# 部署
npm run deploy:interactive              # 交互式部署
npm run deploy:prod                    # 快速部署
npm run deploy:check                   # 检查部署

# 查看状态
npm run deploy:logs                    # 查看日志
npm run deploy:verify                  # 查看部署信息

# 测试
npm run test:api                       # 测试 API
npm run test:unit                      # 单元测试
npm run test:voice                     # 集成测试

# 本地开发
npm run dev                            # 本地 Worker
npm run dev:local                      # 离线 Worker
```

---

## 🎯 完成标志

当您看到以下结果时，部署是成功的：

✅ `npm run deploy:check` 所有项通过
✅ `npm run deploy:prod` 完成无错
✅ `curl /health` 返回 200 和 JSON
✅ `npm run deploy:logs` 没有错误
✅ 可以访问 https://your-domain.workers.dev/rss.xml

---

**恭喜！🎉 您已经成功部署了 Cloudflare Worker！**

如有任何问题，请参考完整的 `DEPLOYMENT-GUIDE.md` 或 `DEPLOYMENT-CHECKLIST.md`。

---

**创建时间**: 2024-11-03
**所需时间**: 15-20 分钟
**难度级别**: ⭐ 初级（只需复制粘贴）
