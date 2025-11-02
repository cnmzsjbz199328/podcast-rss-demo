# 🎯 快速部署指南

## ⚡ 即时开始（3分钟内）

### 步骤1：配置API密钥

编辑 `.env` 文件：

```bash
# 必需：Gemini API密钥（用于AI脚本生成）
GEMINI_API_KEY=你的真实Gemini_API密钥

# 可选：Cloudflare配置（用于部署）
CLOUDFLARE_ACCOUNT_ID=你的Cloudflare账户ID
CLOUDFLARE_API_TOKEN=你的Cloudflare_API令牌
```

### 步骤2：运行测试

```bash
# 安装依赖
npm install

# 运行核心功能测试
npm run test:functions

# 或者运行完整集成测试
npm run test:integration
```

### 步骤3：本地开发

```bash
# 本地运行Worker（需要Cloudflare账户）
npm run dev

# 或者本地模拟运行
npm run start
```

### 步骤4：生产部署

```bash
# 部署到Cloudflare（需要真实账户）
npm run deploy
```

## 📋 配置清单

### ✅ 必需配置

- [ ] **Gemini API Key** - 从 Google AI Studio 获取
- [ ] **Node.js 18+** - 检查版本：`node --version`

### 🔧 可选配置

- [ ] **Cloudflare Account ID** - 从 Dashboard 获取
- [ ] **Cloudflare API Token** - 从 API Tokens 页面创建
- [ ] **R2 Storage** - 如果需要文件存储功能

## 🚀 立即测试

运行以下命令验证一切正常：

```bash
# 快速验证
node index.js --validate

# 如果成功，运行完整测试
node test-functions.js --full
```

## 🎉 成功标志

看到这些输出即表示成功：

```
✅ All services validated successfully
✅ 新闻提取功能测试通过
✅ Gemini脚本生成测试通过
✅ 语音克隆合成测试通过
```

## 🔍 故障排除

### 问题：API密钥无效
```bash
错误：Invalid Gemini API key
```
**解决**：检查 `.env` 文件中的 `GEMINI_API_KEY`

### 问题：部署失败
```bash
错误：Invalid account ID
```
**解决**：检查 `wrangler.toml` 和 `.env` 中的 Cloudflare 配置

### 问题：网络连接失败
```bash
错误：Failed to fetch
```
**解决**：检查网络连接和防火墙设置

## 📞 获取帮助

1. **检查文档**：查看 `DEPLOYMENT.md` 详细指南
2. **运行诊断**：`npm run validate`
3. **查看日志**：检查控制台错误信息

## 🎯 下一步

部署成功后，你将拥有：
- 📡 自动新闻聚合
- 🤖 AI脚本生成
- 🎵 语音播客合成
- 📱 RSS订阅支持

开始你的AI播客之旅！🚀
