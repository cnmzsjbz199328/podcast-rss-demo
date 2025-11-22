# 快速开始指南

## 开发工作流

### 1. 启动开发服务器
```bash
npm run dev
# 服务器将运行在 http://localhost:5173
```

### 2. 编写代码时的实时反馈
- 修改 React 组件时自动刷新 (HMR)
- Tailwind CSS 类名自动补全
- TypeScript 实时类型检查

### 3. 提交前检查
```bash
npm run type-check  # 类型检查
npm run lint        # 代码规范检查
npm run build       # 完整构建测试
```

---

## 添加新页面

### 步骤 1: 创建页面文件
```bash
mkdir src/pages/NewPage
touch src/pages/NewPage/index.tsx
```

### 步骤 2: 编写页面组件
```typescript
// src/pages/NewPage/index.tsx
const NewPage = () => {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* 你的内容 */}
    </div>
  );
};

export default NewPage;
```

### 步骤 3: 添加路由
```typescript
// src/App.tsx
import NewPage from '@/pages/NewPage';

<Route path="/new-page" element={<NewPage />} />
```

---

## 创建新组件

### 通用组件示例
```typescript
// src/components/common/MyComponent.tsx
interface MyComponentProps {
  title: string;
  onClick?: () => void;
}

const MyComponent = ({ title, onClick }: MyComponentProps) => {
  return (
    <div 
      className="rounded-lg bg-white dark:bg-card-dark p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <h3 className="font-bold text-slate-900 dark:text-white">
        {title}
      </h3>
    </div>
  );
};

export default MyComponent;
```

### 使用 Button 组件
```typescript
import Button from '@/components/common/Button';

<Button 
  variant="primary"
  size="medium"
  onClick={() => console.log('clicked')}
>
  Click me
</Button>
```

### 使用 Card 组件
```typescript
import Card from '@/components/common/Card';

<Card padding="md" shadow clickable>
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</Card>
```

---

## 样式最佳实践

### ✅ 推荐做法

1. **使用 Tailwind 类名**
```typescript
<div className="flex items-center justify-between gap-4 p-4">
  {/* 内容 */}
</div>
```

2. **使用自定义颜色变量**
```typescript
// 深色主题推荐
<div className="bg-background-dark text-secondary-text-dark">
<div className="bg-surface-dark">
<div className="bg-primary hover:bg-primary/90">
```

3. **响应式设计**
```typescript
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
  {/* 移动: 1列，平板: 2列，桌面: 4列 */}
</div>
```

4. **深色模式**
```typescript
<div className="bg-white dark:bg-card-dark text-gray-900 dark:text-white">
  {/* 自动支持深色模式 */}
</div>
```

### ❌ 避免做法

1. **内联样式**
```typescript
// 不要这样做
<div style={{ backgroundColor: 'blue', padding: '10px' }} />
```

2. **硬编码颜色**
```typescript
// 不要这样做
<div className="bg-[#ff5733]" />
```

3. **混合使用 CSS 和 Tailwind**
```typescript
// 不要这样做
<div className="bg-red-500" style={{ color: 'blue' }} />
```

---

## 添加新的 API 服务

### 步骤 1: 定义类型
```typescript
// src/types/myApi.ts
export interface MyData {
  id: string;
  name: string;
}

export interface MyApiResponse {
  success: boolean;
  data: MyData[];
}
```

### 步骤 2: 创建 API 服务
```typescript
// src/services/myApi.ts
import { api } from './api';
import type { MyApiResponse } from '@/types';

export const myApi = {
  async fetchData(): Promise<MyApiResponse> {
    return api.get('/my-endpoint');
  },

  async createData(data: MyData): Promise<MyApiResponse> {
    return api.post('/my-endpoint', data);
  },
};
```

### 步骤 3: 在组件中使用
```typescript
import { myApi } from '@/services/myApi';
import { useState, useEffect } from 'react';

const MyComponent = () => {
  const [data, setData] = useState<MyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await myApi.fetchData();
        if (response.success) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>加载中...</div>;
  if (data.length === 0) return <div>暂无数据</div>;

  return (
    <div>
      {data.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
};
```

---

## 颜色参考速查表

```
深色主题推荐颜色:
  背景:           #101d22 (bg-background-dark)
  表面/卡片:      #192d33 (bg-surface-dark)
  卡片背景:       #1a2c33 (dark:bg-card-dark)
  边框:           #325a67 (dark:border-border-dark)
  主文字:         #ffffff (text-white)
  二级文字:       #92bbc9 (text-secondary-text-dark)
  
主色调:
  默认:           #13b6ec (bg-primary)
  浅色:           #3A86FF (bg-primary-light)
  悬停:           #13b6ec/90 (hover:bg-primary/90)
  
中立色:
  Slate 100:      #f1f5f9
  Slate 300:      #cbd5e1
  Slate 500:      #64748b
  Slate 700:      #334155
  Slate 800:      #1e293b
```

---

## 常见问题

### Q: 如何在深色模式中测试？
A: 打开浏览器 DevTools，按 Esc 打开 Console，运行：
```javascript
document.documentElement.classList.toggle('dark')
```

### Q: Material Icons 图标名称在哪里找？
A: https://fonts.google.com/icons

### Q: 如何添加新的自定义颜色？
A: 编辑 `tailwind.config.js`：
```javascript
theme: {
  extend: {
    colors: {
      'my-color': '#abc123',
    },
  },
}
```

### Q: CSS 文件太大怎么办？
A: Tailwind CSS 会自动清除未使用的类。确保：
1. 只在 HTML/JSX 中使用类名
2. 不要动态生成类名
3. 运行 `npm run build` 生成生产版本

### Q: 如何修改字体大小？
A: 使用 Tailwind 类：
```typescript
text-xs      // 12px
text-sm      // 14px
text-base    // 16px
text-lg      // 18px
text-xl      // 20px
text-2xl     // 24px
```

---

## 部署

### Cloudflare Workers 部署
```bash
# 在根目录执行
wrangler deploy
```

### 预构建检查
```bash
npm run build      # 验证构建成功
npm run type-check # 验证无类型错误
npm run lint       # 验证代码规范
```

---

## 调试技巧

### 1. React DevTools
- 安装 React Developer Tools 浏览器扩展
- 检查组件树和 Props
- 性能分析

### 2. TypeScript 检查
```bash
npm run type-check --watch
```

### 3. 网络请求调试
- 打开浏览器 DevTools
- 查看 Network 标签页中的 API 请求

### 4. Tailwind 类名验证
在浏览器中使用 Tailwind CSS IntelliSense 扩展

---

## 更新日志

### Version 1.0.0 (2025-11-22)
- ✨ 完整设计系统实现
- ✨ 5 个主要页面重构
- ✨ Tailwind CSS 集成
- ✨ 深色模式支持
- ✨ TypeScript 严格模式

---

**需要帮助？** 查看 DESIGN_IMPLEMENTATION.md 和 STITCH_COMPLIANCE.md
