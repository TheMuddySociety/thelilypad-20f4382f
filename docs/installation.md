# Installation & Setup

This guide covers how to set up The Lily Pad for local development.

## Prerequisites

- Node.js 18+ or Bun
- Git
- A code editor (VS Code recommended)
- MetaMask browser extension

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/the-lily-pad.git
cd the-lily-pad
```

### 2. Install Dependencies

Using npm:
```bash
npm install
```

Using bun:
```bash
bun install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

### 4. Start Development Server

```bash
npm run dev
# or
bun dev
```

Visit `http://localhost:5173` in your browser.

## Project Configuration

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... more colors
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

## Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### 2. Configure Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref
```

### 3. Deploy Edge Functions

```bash
supabase functions deploy content-moderation
supabase functions deploy alchemy-rpc
```

### 4. Set Secrets

```bash
supabase secrets set ALCHEMY_API_KEY=your_alchemy_key
supabase secrets set LOVABLE_API_KEY=your_lovable_key
```

## Alchemy Setup

### 1. Create Alchemy Account

1. Go to [alchemy.com](https://alchemy.com)
2. Create an account
3. Create a new app for Monad

### 2. Get API Key

1. Navigate to your app
2. Copy the API key
3. Add to environment variables

### 3. Configure RPC

```typescript
// src/config/alchemy.ts
export const ALCHEMY_API_KEY = "your_key_here";
// In production, use environment variable
```

## Development Workflow

### Running Locally

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Code Quality

```bash
# Lint code
npm run lint

# Type check
npm run typecheck

# Format code
npm run format
```

## Common Issues

### Port Already in Use

```bash
# Kill process on port 5173
lsof -i :5173
kill -9 <PID>
```

### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
```

### TypeScript Errors

```bash
# Regenerate types
npm run typecheck
```

### Supabase Connection Issues

1. Check environment variables
2. Verify project is active
3. Check network connectivity

## IDE Setup

### VS Code Extensions

Recommended extensions:
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Hero
- Error Lens

### Settings

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Docker Setup (Optional)

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 5173
CMD ["npm", "run", "preview"]
```

```bash
# Build and run
docker build -t lily-pad .
docker run -p 5173:5173 lily-pad
```

## Next Steps

- [Quick Start Guide](./quick-start.md)
- [Architecture Overview](./architecture.md)
- [Contributing Guide](./contributing.md)
