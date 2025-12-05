# 环境变量统一管理计划

## 📋 概述

为了规范后端 API 地址的管理，我们采用了环境变量驱动的配置方案，确保：
- **安全性**: API地址不硬编码在代码中
- **灵活性**: 支持多个部署环境（开发、测试、生产）
- **可维护性**: 集中管理配置，易于维护和更新

---

## 🔐 安全原则

### 1. **绝不硬编码敏感配置**
- ❌ 不要在源代码中硬编码 API URL
- ✅ 使用环境变量管理所有环境相关配置

### 2. **.env 文件管理**
- 本地 `.env` 文件用于开发环境，**不提交到版本控制**
- `.env.example` 作为模板，包含所有必需的配置项说明
- CI/CD 中通过密钥管理系统（如 Secrets）注入真实值

### 3. **环境隔离**
```
开发环境: http://localhost:8787 或自定义开发地址
测试环境: 专用测试 URL
生产环境: https://podcasts.badtom.dpdns.org
```

---

## 📝 配置文件说明

### `.env.example` (提交到版本控制)
提供配置模板和说明，**不包含真实值**：
```env
# Backend API Configuration
# 更改为自己的后端地址
VITE_API_BASE_URL=https://podcasts.badtom.dpdns.org

# 开发环境 (可选覆盖)
# VITE_API_BASE_URL_DEV=http://localhost:8787

# 生产环境 (可选覆盖)
# VITE_API_BASE_URL_PROD=https://podcasts.badtom.dpdns.org
```

### `.env` (不提交到版本控制)
实际开发/部署时使用的配置文件，包含真实值：
```env
# Backend API Configuration
VITE_API_BASE_URL=https://podcasts.badtom.dpdns.org
```

### `.env.local` (可选，本地覆盖)
用于本地开发时覆盖默认配置：
```env
VITE_API_BASE_URL=http://localhost:8787
```

---

## 🛠️ 实现细节

### Vite 环境变量前缀
- 所有前缀为 `VITE_` 的变量会被 Vite 暴露给浏览器端代码
- 其他环境变量只在构建时可用，不会暴露到客户端

### 代码中的使用

#### 1. `src/utils/constants.ts`
```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://podcasts.badtom.dpdns.org'
```
- 优先使用环境变量
- 未设置时使用默认值作为回退

#### 2. `src/services/api.ts`
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://podcasts.badtom.dpdns.org'
```
- 运行时读取环境变量

#### 3. `vite.config.ts` (代理配置)
```typescript
server: {
  proxy: {
    '/api': {
      target: process.env.VITE_API_BASE_URL || 'https://podcasts.badtom.dpdns.org',
    },
  },
}
```
- 开发服务器代理使用环境变量

---

## 🚀 部署流程

### 本地开发
```bash
cd FrontEnd

# 1. 复制配置模板
cp .env.example .env

# 2. 编辑 .env，设置开发环境 API 地址（可选）
# VITE_API_BASE_URL=http://localhost:8787

# 3. 启动开发服务器
npm run dev
```

### Cloudflare Workers 生产部署
```bash
# 构建时自动使用 .env 中的配置
npm run build

# 部署
wrangler deploy
```

**环境变量注入方式**:
1. **方式 A**: 在 `.env` 中设置（简单但不安全）
2. **方式 B**: 使用 Cloudflare Secrets 管理（推荐）
   ```bash
   wrangler secret put VITE_API_BASE_URL
   ```

### Docker 部署（如适用）
```dockerfile
ARG VITE_API_BASE_URL=https://podcasts.badtom.dpdns.org

RUN npm run build
```

---

## ✅ 检查清单

### 代码检查
- [x] 移除所有硬编码的 API URL
- [x] 使用 `import.meta.env.VITE_API_BASE_URL` 读取环境变量
- [x] 提供合理的默认值作为回退
- [x] 更新所有文档中的 URL 引用

### 配置文件检查
- [x] 创建 `.env.example` 模板文件
- [x] 创建本地 `.env` 文件
- [x] 确认 `.gitignore` 包含 `.env` 和 `.env.local`

### 文档检查
- [x] 更新 `README.md` - 添加环境变量配置步骤
- [x] 更新 `API-DOCUMENTATION.md` - 替换 API 基础 URL
- [x] 更新 `test.html` - 使用新的默认 URL
- [x] 创建本文档

---

## 📋 变量参考表

| 变量名 | 类型 | 说明 | 示例 | 必需 |
|--------|------|------|------|------|
| `VITE_API_BASE_URL` | string | 后端 API 基础地址 | `https://podcasts.badtom.dpdns.org` | ✅ |

---

## 🔄 后续修改指南

### 更换 API 地址
1. 编辑 `.env` 文件，修改 `VITE_API_BASE_URL` 的值
2. 重启开发服务器（`npm run dev`）或重新构建（`npm run build`）
3. 不需要修改任何源代码

### 添加新的环境变量
1. 在 `.env.example` 中添加注释说明
2. 创建 `.env` 或 `.env.local` 并设置实际值
3. 在代码中使用 `import.meta.env.VITE_YOUR_VAR` 读取
4. 提供合理的默认值或错误提示

### 环境特定配置
```typescript
// 在代码中根据环境选择配置
const isDev = import.meta.env.DEV
const isProduction = import.meta.env.PROD

const API_URL = isDev 
  ? import.meta.env.VITE_API_BASE_URL_DEV || 'http://localhost:8787'
  : import.meta.env.VITE_API_BASE_URL_PROD || 'https://podcasts.badtom.dpdns.org'
```

---

## 🔗 相关文件

- 环境变量定义: `.env` 和 `.env.example`
- 常量配置: `src/utils/constants.ts`
- API 服务: `src/services/api.ts`
- Vite 配置: `vite.config.ts`
- 开发指南: `FrontEnd/AGENTS.md`

---

*最后更新: 2025-12-05*
