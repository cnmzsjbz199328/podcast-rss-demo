# Podcast RSS Frontend

A modern React TypeScript frontend for the AI-generated Podcast RSS system, featuring a complete single-page application with full API integration.

## Project Overview

This frontend provides a comprehensive user interface for interacting with the Podcast RSS API, including:

- **Home Page**: Overview and latest episodes with generation controls
- **Podcast Player Page**: Full-featured audio playback with episode details
- **Topic List Page**: Browse and manage available podcast topics
- **Topic Details Page**: Detailed view with statistics and episode generation
- **Create Topic Page**: Form-based interface for creating new podcast topics

## Technology Stack

- **React 18**: Modern component-based UI framework
- **TypeScript**: Type-safe development with full IntelliSense
- **Vite**: Fast build tool with HMR and optimized production builds
- **React Router**: Client-side routing for SPA navigation
- **ESLint + Prettier**: Code quality and formatting
- **Vitest**: Fast unit testing framework
- **Fetch API**: HTTP requests to backend with error handling

## Architecture

```
FrontEnd/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Generic components (Button, Card, etc.)
│   │   ├── podcast/        # Podcast-specific components
│   │   └── topic/          # Topic-specific components
│   ├── pages/              # Route-level page components
│   │   ├── Home/
│   │   ├── PodcastPlayer/
│   │   ├── TopicList/
│   │   ├── TopicDetail/
│   │   └── CreateTopic/
│   ├── services/           # API service layer
│   │   ├── api.ts          # Base API configuration
│   │   ├── podcastApi.ts   # Podcast endpoints
│   │   └── topicApi.ts     # Topic endpoints
│   ├── types/              # TypeScript type definitions
│   │   ├── index.ts        # Type exports
│   │   ├── podcast.ts      # Podcast types
│   │   └── topic.ts        # Topic types
│   ├── utils/              # Utility functions
│   │   ├── constants.ts    # App constants
│   │   ├── helpers.ts      # General helpers
│   │   └── formatters.ts   # Data formatters
│   ├── hooks/              # Custom React hooks
│   ├── styles/             # Styling files
│   │   ├── global.css      # Global styles
│   │   ├── components/     # Component-specific styles
│   │   └── themes/         # Theme variables
│   ├── assets/             # Static assets
│   │   ├── images/
│   │   └── icons/
│   ├── App.tsx             # Main app component
│   └── main.tsx            # React entry point
├── public/                 # Public static files
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
├── index.html              # HTML entry point
├── AGENTS.md               # Development guidelines
├── API-DOCUMENTATION.md    # Backend API docs
└── README.md               # This file
```

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Install dependencies**:
   ```bash
   cd FrontEnd
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Backend API**: Ensure Podcast RSS API is running at `https://podcast-rss-demo.tj15982183241.workers.dev`

### Available Scripts

- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run type-check` - TypeScript type checking

## Usage

### Navigation

- `/` - Home page with latest episodes
- `/podcast/:episodeId` - Individual podcast player
- `/topics` - Topic management
- `/topics/:topicId` - Topic details
- `/topics/create` - Create new topic

### API Integration

The frontend integrates with all backend API endpoints:

- **Podcasts**: Fetch, generate, and play episodes
- **Topics**: CRUD operations and series generation
- **Real-time**: Async generation with polling
- **Error Handling**: Comprehensive error states

### Key Features

- **Responsive Design**: Mobile-first approach
- **Audio Playback**: HTML5 audio with custom controls
- **Form Validation**: TypeScript-powered form handling
- **Loading States**: User-friendly loading indicators
- **Error Boundaries**: Graceful error handling
- **Type Safety**: Full TypeScript coverage

## Development Guidelines

See [AGENTS.md](AGENTS.md) for detailed coding standards.

### Code Quality Standards

- Files ≤ 200 lines (split large components)
- Strict TypeScript (no `any` types)
- ESLint + Prettier configuration
- Comprehensive test coverage
- Semantic commit messages

### Architecture Principles

- **High Cohesion**: Single responsibility per module
- **Low Coupling**: Clear interfaces between layers
- **Layered Structure**: Presentation → Application → Infrastructure
- **Type Safety**: Full type coverage for API responses
- **Error Handling**: Proper error types and user feedback

## Testing

```bash
# Run all tests
npm run test

# Run tests with UI
npm run test:ui

# Run type checking
npm run type-check
```

## Deployment

The frontend builds to static files served through Cloudflare Workers:

```bash
# Build for production
npm run build

# Deploy via root wrangler
cd ..
wrangler deploy
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow [AGENTS.md](AGENTS.md) guidelines
2. Write tests for new features
3. Ensure TypeScript strict mode compliance
4. Keep components under 200 lines
5. Use semantic commit messages

## Migration from Static Prototype

This TypeScript version replaces the previous static HTML prototype in `stitch_/`:

- Converted HTML pages to React components
- Added full TypeScript type definitions
- Implemented proper state management
- Added comprehensive error handling
- Integrated with build tools and testing

## Related Documentation

- [Backend API Documentation](API-DOCUMENTATION.md)
- [Root Project README](../../README.md)
- [AGENTS.md](AGENTS.md) - Development guidelines

## License

See root project license.
