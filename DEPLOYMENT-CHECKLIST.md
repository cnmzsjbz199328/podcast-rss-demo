# 📋 Cloudflare Worker 部署清单

一个完整的分步骤清单，确保部署过程不遗漏任何重要步骤。

## 🎯 第一阶段：准备（1-2小时）

### 账户和凭证设置

- [ ] 已注册 Cloudflare 账户
- [ ] 已验证电子邮件
- [ ] 已启用双因素认证（推荐）
- [ ] 已获取 Account ID
  - [ ] 验证 Account ID 格式（32位16进制字符串）
  - [ ] 记录到安全的地方
- [ ] 已创建 Cloudflare API Token
  - [ ] 权限包含 "Workers Scripts - Edit"
  - [ ] 已设置账户范围或特定账户
  - [ ] 已复制 Token（只显示一次！）
  - [ ] 已保存到密码管理器
- [ ] 已获取 Google Gemini API Key
  - [ ] 启用了 Generative Language API
  - [ ] 已复制 API Key
  - [ ] 已验证可用配额
- [ ] R2 存储配置（可选）
  - [ ] 已在 Cloudflare 中启用 R2
  - [ ] 已创建存储桶（例如：podcast-files）
  - [ ] 已生成 R2 API 令牌
  - [ ] 已记下 Access Key 和 Secret Key

### 本地环境准备

- [ ] Node.js 版本 >= 16
  ```bash
  node --version
  ```
- [ ] npm 版本 >= 8
  ```bash
  npm --version
  ```
- [ ] 已安装 wrangler CLI
  ```bash
  npm install -g wrangler
  wrangler --version
  ```
- [ ] 已克隆项目代码
- [ ] 已运行 npm install
  ```bash
  npm install
  ```
- [ ] 已验证所有依赖已安装
  ```bash
  npm ls
  ```

---

## 🔧 第二阶段：本地配置（30分钟）

### 环境变量配置

- [ ] 创建 .env 文件
  ```bash
  cp .env.example .env
  ```
- [ ] 填写必需的变量：
  - [ ] `CLOUDFLARE_ACCOUNT_ID` - 从凭证获取
  - [ ] `CLOUDFLARE_API_TOKEN` - 从凭证获取
  - [ ] `GEMINI_API_KEY` - 从凭证获取
- [ ] 填写可选的 R2 变量（如果使用）：
  - [ ] `R2_ACCESS_KEY_ID`
  - [ ] `R2_SECRET_ACCESS_KEY`
  - [ ] `R2_BUCKET_NAME`
  - [ ] `R2_BASE_URL`
- [ ] 验证 .env 文件格式
  ```bash
  cat .env
  ```
- [ ] 确认 .env 在 .gitignore 中
  ```bash
  grep ".env" .gitignore
  ```

### Wrangler 配置

- [ ] 检查 wrangler.toml 中的 account_id
  ```bash
  grep account_id wrangler.toml
  ```
- [ ] account_id 与第一阶段获取的相符
- [ ] 验证其他配置项：
  - [ ] `name` = podcast-rss-demo
  - [ ] `main` = worker.js
  - [ ] `compatibility_flags` 包含 nodejs_compat
  - [ ] `compatibility_date` >= 2024-09-23
- [ ] 检查 workers_dev 配置（通常为 true）

### 代码验证

- [ ] 检查 worker.js 是否存在且有效
- [ ] 检查 src/ 目录结构完整
  ```bash
  ls -la src/
  ```
- [ ] 检查核心服务文件
  - [ ] src/factory.js
  - [ ] src/core/PodcastGenerator.js
  - [ ] src/implementations/IndexTtsVoiceService.js

---

## 🧪 第三阶段：本地测试（1小时）

### 部署前检查

- [ ] 运行部署检查脚本
  ```bash
  npm run deploy:check
  ```
- [ ] 所有检查项都显示 ✅
- [ ] 如有 ❌ 项，按提示修复

### API 连接测试

- [ ] 测试 API 端点可用性
  ```bash
  npm run test:api
  ```
- [ ] 验证以下端点都可访问：
  - [ ] `/on_method_select`
  - [ ] `/on_input_text_change`
  - [ ] `/update_prompt_audio`
  - [ ] `/gen_single`

### 功能测试

- [ ] 运行单元测试
  ```bash
  npm run test:unit
  ```
- [ ] 通过率 >= 85%
- [ ] 查看测试报告

- [ ] 运行集成测试（可选，时间较长）
  ```bash
  npm run test:voice
  ```

### 本地 Worker 测试

- [ ] 启动本地 Worker
  ```bash
  wrangler dev
  ```
- [ ] 测试健康检查端点
  ```bash
  curl http://localhost:8787/health
  ```
- [ ] 应返回 200 状态码
- [ ] 验证响应包含服务状态信息
- [ ] 按 Ctrl+C 停止本地 Worker

### 环境变量验证

- [ ] 验证环境变量已被正确加载
  ```bash
  echo $CLOUDFLARE_ACCOUNT_ID
  echo $GEMINI_API_KEY
  ```
- [ ] 所有必需的变量都已设置

---

## 🚀 第四阶段：部署到生产（15分钟）

### 部署前最终检查

- [ ] 所有本地测试都通过
- [ ] 没有未提交的重要更改
- [ ] 环境变量都已正确设置
- [ ] 已备份当前工作状态

### 执行部署

选择以下之一：

#### 方案 A：自动化交互式部署（推荐）
- [ ] 运行部署脚本
  ```bash
  npm run deploy:interactive
  ```
- [ ] 选择环境：production
- [ ] 确认部署

#### 方案 B：快速部署
- [ ] 运行部署命令
  ```bash
  npm run deploy:prod
  ```
- [ ] 等待部署完成

#### 方案 C：手动部署
- [ ] 运行检查
  ```bash
  npm run deploy:check
  ```
- [ ] 执行部署
  ```bash
  wrangler deploy
  ```

### 部署验证

- [ ] 部署完成，看到成功消息
- [ ] 输出中包含 Worker 的 URL
- [ ] 记下 URL 用于测试

---

## ✅ 第五阶段：部署验证（15分钟）

### 基础功能测试

- [ ] 测试 Health 端点
  ```bash
  curl https://your-domain.workers.dev/health
  ```
- [ ] 返回状态 200
- [ ] 包含所有服务状态信息

- [ ] 测试 RSS 端点
  ```bash
  curl https://your-domain.workers.dev/rss.xml
  ```
- [ ] 返回有效的 RSS XML
- [ ] 包含正确的频道信息

- [ ] 测试 Generate 端点
  ```bash
  curl -X POST https://your-domain.workers.dev/generate?style=news-anchor
  ```
- [ ] 返回 JSON 响应
- [ ] 包含生成的播客信息（或正在处理中）

### 日志检查

- [ ] 查看 Worker 日志
  ```bash
  wrangler tail
  ```
- [ ] 没有错误信息
- [ ] 日志显示请求被正确处理

### 部署信息验证

- [ ] 查看部署历史
  ```bash
  npm run deploy:verify
  ```
- [ ] 最新部署显示为活跃
- [ ] 部署时间戳正确

---

## 🔐 第六阶段：生产环境配置（30分钟）

### 敏感信息配置

- [ ] 设置 Gemini API Key
  ```bash
  wrangler secret put GEMINI_API_KEY
  ```
- [ ] 设置 R2 访问密钥（如果使用 R2）
  ```bash
  wrangler secret put R2_ACCESS_KEY_ID
  wrangler secret put R2_SECRET_ACCESS_KEY
  ```
- [ ] 验证 Secrets 已设置
  ```bash
  wrangler secret list
  ```

### 自定义域名配置（可选）

- [ ] 添加域名到 Cloudflare
- [ ] 配置 DNS 记录
- [ ] 验证域名 DNS 解析
- [ ] 配置 Worker 路由
  ```bash
  wrangler routes put your-domain.com/podcast/* --script=podcast-rss-demo
  ```
- [ ] 验证自定义域名可访问
  ```bash
  curl https://your-custom-domain/health
  ```

### 监控和告警设置

- [ ] 登录 Cloudflare Dashboard
- [ ] 导航到 Workers Analytics
- [ ] 查看请求统计
- [ ] 设置错误率告警（可选）
- [ ] 配置性能监控（可选）

### 定时任务配置（可选）

如果需要定时生成播客：

- [ ] 编辑 wrangler.toml
- [ ] 添加 cron 触发器
  ```toml
  [[triggers.crons]]
  crons = ["0 0 * * *"]
  ```
- [ ] 重新部署
  ```bash
  npm run deploy:prod
  ```

---

## 🎉 第七阶段：部署完成和文档（15分钟）

### 最终验证

- [ ] 所有端点都能正常访问
- [ ] 性能符合预期
- [ ] 错误率为 0%

### 文档更新

- [ ] 更新 README.md 中的 URL
- [ ] 记录生产环境 URL
- [ ] 更新团队文档
- [ ] 创建部署日志

### 备份和恢复计划

- [ ] 记录部署 ID
  ```bash
  wrangler deployments list
  ```
- [ ] 了解如何回滚
  ```bash
  wrangler deployments rollback <id>
  ```
- [ ] 保存紧急联系信息

### 团队通知

- [ ] 通知团队部署完成
- [ ] 分享生产 URL
- [ ] 提供测试说明
- [ ] 列出已知问题（如有）

---

## 🔄 后续维护检查清单

### 每日检查

- [ ] 查看错误日志
  ```bash
  wrangler tail --status ok=false
  ```
- [ ] 验证生成的播客质量
- [ ] 检查 R2 存储使用情况

### 每周检查

- [ ] 检查性能指标
- [ ] 更新依赖包（如需）
- [ ] 备份重要数据
- [ ] 审查使用统计

### 每月检查

- [ ] 更新依赖
  ```bash
  npm outdated
  npm update
  ```
- [ ] 重新部署更新
- [ ] 审查和优化成本
- [ ] 更新文档

---

## 🆘 故障排除快速参考

| 问题 | 症状 | 解决方案 |
|------|------|---------|
| 部署失败 | Invalid account ID | 检查 wrangler.toml 中的 account_id |
| 连接失败 | Authentication error | 验证 API Token 权限 |
| Worker 错误 | 500 Internal Server Error | 查看日志：`wrangler tail` |
| 性能问题 | 请求超时 | 检查生成参数，增加超时 |
| 存储问题 | R2 连接失败 | 验证 R2 凭证，检查桶配置 |

---

## 📝 签核

部署完成后请签核：

- [ ] 部署人员：___________________
- [ ] 审核人员：___________________
- [ ] 部署日期：___________________
- [ ] 部署时间：___________________
- [ ] 生产 URL：___________________
- [ ] 部署 ID：___________________
- [ ] 备注：
  ```
  
  
  ```

---

**文档版本**: 1.0
**最后更新**: 2024-11-03
**维护者**: 项目团队
