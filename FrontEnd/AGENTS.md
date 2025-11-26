# Podcast RSS Frontend Agent Guide

## Build/Lint/Test Commands
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run lint` - Run ESLint for code quality
- `npm run preview` - Preview production build locally
- `npm run test` - Run Vitest unit tests
- `npm run test:ui` - Run tests with UI
- `npm run type-check` - Run TypeScript type checking
- Deploy via root `wrangler deploy` (serves built files)

## Architecture
- **React + TypeScript**: Modern frontend with type safety
- **Vite**: Fast build tool with HMR and optimized production builds
- **React Router**: Client-side routing for SPA navigation
- **Layered Architecture**: Clear separation of concerns
  - **Presentation Layer**: Pages and Components
  - **Application Layer**: Services, Hooks, and Utils
  - **Infrastructure Layer**: API calls and external integrations
- **Backend Integration**: RESTful API calls to Podcast RSS backend
- **Responsive Design**: Mobile-first CSS with modern styling

## Directory Structure
```
src/
├── components/          # Reusable UI components
│   ├── common/         # Generic components (Button, Card, etc.)
│   ├── podcast/        # Podcast-specific components
│   │   ├── PlaybackControls.tsx     # 播放/暂停/快进快退按钮 (~70行)
│   │   ├── SleepTimerButton.tsx     # 定时按钮组件 (~60行)
│   │   ├── SubtitleViewer.tsx       # 字幕显示组件 (~100行)
│   │   ├── SubtitleViewer.css       # 字幕样式
│   │   ├── TranscriptViewer.tsx     # 脚本显示组件 (~70行)
│   │   └── TranscriptViewer.css     # 脚本样式
│   └── topic/          # Topic-specific components
├── hooks/              # Custom React hooks (新增)
│   ├── useAudioController.ts  # 音频控制逻辑 (~130行)
│   ├── useTranscriptSync.ts   # 脚本时间同步 (~150行)
│   ├── useSubtitleSync.ts     # 字幕时间同步 (~140行)
│   └── index.ts               # Hook导出
├── pages/              # Route-level page components
│   ├── Home/
│   ├── PodcastPlayer/ (~290行)  # 主播放页面
│   ├── TopicList/
│   ├── TopicDetail/
│   └── CreateTopic/
├── services/           # API service layer
│   ├── api.ts          # Base API configuration
│   ├── podcastApi.ts   # Podcast endpoints
│   └── topicApi.ts     # Topic endpoints
├── types/              # TypeScript type definitions
│   ├── index.ts        # Type exports
│   ├── podcast.ts      # Podcast types
│   └── topic.ts        # Topic types
├── utils/              # Utility functions
│   ├── constants.ts    # App constants
│   ├── helpers.ts      # General helpers
│   └── formatters.ts   # Data formatters
├── hooks/              # Custom React hooks
├── styles/             # Styling files
│   ├── global.css      # Global styles
│   ├── components/     # Component-specific styles
│   └── themes/         # Theme variables
└── assets/             # Static assets
    ├── images/
    └── icons/
```

## 核心功能实现 (v1.0.0)

### 字幕高亮显示 ✅
- **Hook**: `useSubtitleSync` - 字幕时间同步和高亮逻辑
- **支持格式**: VTT、SRT、JSON
- **特性**: 自动滚动、实时高亮、虚拟滚动优化

### 定时按钮 ✅
- **组件**: `SleepTimerButton` - 定时功能UI
- **Hook**: `useAudioController.setSleepTimer()` - 定时逻辑
- **选项**: null, 5min, 10min, 15min, 30min, 45min, 60min

### 前进后退按钮 ✅
- **组件**: `PlaybackControls` - 播放控制UI
- **Hook**: `useAudioController.skipForward()` / `skipBackward()`
- **功能**: 后退10秒、前进30秒、边界保护

### 脚本同步 ✅
- **Hook**: `useTranscriptSync` - 脚本时间同步
- **算法**: 按字符长度加权分配时间
- **特性**: 自动分段、实时高亮、自动滚动

## Code Style Guidelines
- **Imports**: Use absolute imports with `@/` alias for src directory
- **Conventions**: camelCase for variables/functions, PascalCase for components/classes
- **Formatting**: 2-space indentation, semicolons required
- **Types**: Strict TypeScript with no `any` types
- **Naming**: Descriptive names; e.g., `fetchEpisodes()` not `getData()`
- **Error Handling**: Try-catch with proper error types, user-friendly messages
- **Best Practices**:
  - High cohesion (single responsibility per module)
  - Low coupling (clear interfaces between layers)
  - Files ≤ 200 lines (split large components) ✅ 已实现
  - Layered structure (Presentation → Application → Infrastructure) ✅ 已实现
  - Functional components with hooks ✅ 已实现
  - Custom hooks for shared logic ✅ 已实现
  - Service layer for API calls ✅ 已实现
  - Type-safe API responses ✅ 已实现
