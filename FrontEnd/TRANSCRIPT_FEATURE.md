# 脚本显示功能文档

## 功能概述

在播客播放页面添加脚本显示功能，支持：
- 实时加载和显示播客脚本
- 根据播放时间自动高亮当前段落
- 脚本查看的开关控制
- 响应式设计和深色模式支持

---

## 核心组件

### TranscriptViewer (`src/components/podcast/TranscriptViewer.tsx`)

**Props**:
```typescript
interface TranscriptViewerProps {
  scriptUrl: string | null;      // 脚本URL，来自API的scriptUrl字段
  currentTime: number;            // 当前播放时间（秒）
  duration: number;               // 总时长（秒）
}
```

**功能**:
1. **脚本加载**: 从scriptUrl获取脚本文本
2. **段落解析**: 按句子分割脚本（以。！？为分隔符）
3. **时间映射**: 根据句子数量均匀分配播放时间
4. **动态高亮**: 
   - 已播放段落：灰色，较小透明度
   - 当前段落：蓝色背景，带脉冲动画
   - 未播放段落：正常颜色

**样式** (`src/components/podcast/TranscriptViewer.css`):
- 最大高度400px，超出自动滚动
- 深色模式自适应
- 脉冲动画效果（0.6秒循环）
- 自定义滚动条样式

---

## 集成到播放页面

### 文件: `src/pages/PodcastPlayer/index.tsx`

#### 1. 导入组件
```typescript
import TranscriptViewer from '@/components/podcast/TranscriptViewer';
```

#### 2. 添加状态
```typescript
const [showTranscript, setShowTranscript] = useState(true);
```

#### 3. 操作按钮
```tsx
<button
  onClick={() => setShowTranscript(!showTranscript)}
  className={`flex flex-col items-center justify-center gap-1 w-16 ${
    showTranscript ? 'text-primary-light' : 'text-slate-300 dark:text-slate-400 hover:text-white'
  }`}
>
  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
    description
  </span>
  <span className="text-xs">脚本</span>
</button>
```

#### 4. 脚本显示区域
```tsx
{showTranscript && episode?.scriptUrl && (
  <div className="px-6 pb-8">
    <h3 className="text-white text-sm font-semibold mb-4">播客脚本</h3>
    <TranscriptViewer
      scriptUrl={episode.scriptUrl}
      currentTime={currentTime}
      duration={duration}
    />
  </div>
)}
```

---

## API集成

### 数据流

```
播放页面 PodcastPlayer
  ↓ 获取episodeId
  ↓ podcastApi.getEpisode(episodeId)
  ↓ GET /episodes/{episodeId}
  ↓ 返回Episode对象 (包含scriptUrl)
  ↓
TranscriptViewer
  ↓ fetch(scriptUrl)
  ↓ 获取脚本文本
  ↓ 解析和时间映射
  ↓ 根据currentTime高亮
```

### Episode类型
```typescript
interface Episode {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  scriptUrl?: string;        // ← 新增脚本URL
  // ... 其他字段
}
```

---

## 用户交互流程

### 1. 进入播放页面
- 自动加载脚本（showTranscript默认为true）
- 如果scriptUrl不存在，脚本区域隐藏

### 2. 播放音频
- 脚本自动跟随播放进度
- 当前段落实时高亮，带脉冲动画

### 3. 隐藏/显示脚本
- 点击"脚本"按钮切换显示状态
- 按钮变色指示当前状态

### 4. 滚动查看
- 脚本区域可独立滚动
- 自定义滚动条样式

---

## 样式细节

### 颜色方案
```css
/* 未播放 */
color: rgba(203, 213, 225, 0.8);

/* 已播放 */
color: rgba(148, 163, 184, 0.5);

/* 当前（活跃） */
background: rgba(59, 130, 246, 0.2);
color: rgb(147, 197, 253);
box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
```

### 脉冲动画
```css
@keyframes pulse-active {
  0%, 100% {
    background: rgba(59, 130, 246, 0.2);
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
  }
  50% {
    background: rgba(59, 130, 246, 0.3);
    box-shadow: 0 0 12px rgba(59, 130, 246, 0.5);
  }
}
```

---

## 扩展建议

### 1. 支持SRT/VTT格式
```typescript
// 解析带时间戳的字幕格式
00:00:05,000 --> 00:00:10,000
播客第一个句子

00:00:10,000 --> 00:00:15,000
播客第二个句子
```

### 2. 字幕同步
```typescript
// 结合subtitle数据更精确的时间映射
async pollSubtitles(subtitlesUrl) {
  const response = await fetch(subtitlesUrl);
  const data = await response.json();
  // 使用精确的时间戳
}
```

### 3. 搜索功能
```typescript
const [searchTerm, setSearchTerm] = useState('');
const filteredSegments = segments.filter(seg =>
  seg.text.includes(searchTerm)
);
```

### 4. 跳转到特定位置
```typescript
// 点击脚本段落跳转到对应播放时间
const handleSegmentClick = (time: number) => {
  audioRef.current.currentTime = time;
  audioRef.current.play();
};
```

### 5. 导出功能
```typescript
// 导出脚本为TXT/Markdown
const exportTranscript = (format: 'txt' | 'md') => {
  const text = segments.map(s => s.text).join('\n');
  // 创建下载链接
};
```

---

## 错误处理

### 网络错误
```typescript
catch (err) {
  setError(err instanceof Error ? err.message : 'Failed to load transcript');
  setScriptText('');
}
```

显示用户友好的错误提示，不中断播放。

### 缺少脚本
```typescript
if (!scriptUrl) {
  return null; // 静默隐藏脚本区域
}
```

---

## 性能优化

### 1. 脚本缓存
```typescript
const scriptCache = useRef<Record<string, string>>({});

// 重复请求时使用缓存
if (scriptCache.current[scriptUrl]) {
  setScriptText(scriptCache.current[scriptUrl]);
} else {
  // 获取后缓存
  scriptCache.current[scriptUrl] = text;
}
```

### 2. 防抖处理
```typescript
const [debouncedTime] = useDebounce(currentTime, 100);

useEffect(() => {
  // 每100ms更新一次高亮，而非每帧
  setCurrentSegmentIndex(findIndex(debouncedTime));
}, [debouncedTime, segments]);
```

### 3. 虚拟滚动（大脚本）
```typescript
// 对于超长脚本，使用虚拟滚动库如react-window
// 只渲染可见部分，提升性能
```

---

## 浏览器兼容性

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

---

## 测试清单

- [ ] 脚本成功加载
- [ ] 高亮随时间变化
- [ ] 脉冲动画流畅
- [ ] 切换显示/隐藏正常
- [ ] 拖动进度条时高亮更新
- [ ] 暂停/继续播放后正常工作
- [ ] 深色模式显示正常
- [ ] 手机小屏幕显示正常
- [ ] scriptUrl缺失时不报错
- [ ] 网络错误时显示提示

---

**最后更新**: 2024-11-23  
**组件版本**: 1.0.0
