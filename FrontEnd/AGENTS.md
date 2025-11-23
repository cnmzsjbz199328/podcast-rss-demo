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
│   │   ├── TranscriptViewer.tsx    # Script display with time-sync highlight
│   │   └── TranscriptViewer.css    # Transcript styles
│   └── topic/          # Topic-specific components
├── pages/              # Route-level page components
│   ├── Home/
│   ├── PodcastPlayer/
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
  - Files ≤ 200 lines (split large components)
  - Layered structure (Presentation → Application → Infrastructure)
  - Functional components with hooks
  - Custom hooks for shared logic
  - Service layer for API calls
  - Type-safe API responses
