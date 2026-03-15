# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a full-stack React + Hono application deployed on Cloudflare Workers. It uses React Router for client-side routing, ShadCN UI for components, and Tailwind CSS for styling.

## Development Commands

```bash
# Start development server
npm run dev

# Build the application
npm run build

# Deploy to Cloudflare Workers
npm run deploy

# Type checking (generates CF types, React Router types, and runs TypeScript)
npm run typecheck

# Generate Cloudflare types only
npm run cf-typegen

# Preview production build locally
npm run preview
```

## Architecture

### Backend (Hono on Cloudflare Workers)
- Entry point: `workers/app.ts`
- Hono app handles all requests, with React Router integration for SPA serving
- Add API routes directly in the Hono app before the catch-all route
- Access Cloudflare bindings via `c.env` and execution context via `c.executionCtx`
- Environment variables defined in `wrangler.jsonc`

### Frontend (React + React Router)
- Single Page Application (SPA) mode
- Entry: `app/root.tsx` and `app/entry.server.tsx`
- Routes defined in `app/routes/` directory and configured in `app/routes.ts`
- React Router handles client-side routing
- Built with Vite using the Cloudflare plugin

### Styling
- Tailwind CSS configured with @tailwindcss/vite plugin
- Global styles in `app/app.css`
- ShadCN UI components can be added as needed

## Important Configuration Files
- `wrangler.jsonc` - Cloudflare Workers configuration, bindings, and environment variables
- `vite.config.ts` - Build configuration with Cloudflare, React Router, and Tailwind plugins
- `tsconfig.json` - TypeScript configuration
- `react-router.config.ts` - React Router configuration

## Adding New Features

### API Endpoints
Add new API routes in `workers/app.ts` before the catch-all route:
```typescript
app.get("/api/example", (c) => {
  return c.json({ message: "Hello from Hono" });
});
```

### React Routes
Create new route files in `app/routes/` directory. React Router will automatically pick them up based on file naming conventions.

### Environment Variables
Add to `wrangler.jsonc` under `vars` for non-sensitive values, or use `wrangler secret` for sensitive data.

## Authentication (Clerk) - Template Setup

### Configuration
- Package: `@clerk/react-router` (already in package.json)
- Root loader: `rootAuthLoader` in `app/root.tsx`
- ClerkProvider wraps the app in `app/root.tsx`
- Auth helpers in `app/lib/auth.server.ts`
- **TODO: Delete Clerk code if not using authentication**

### Setup Steps
1. Create a Clerk account at https://dashboard.clerk.com
2. Get your API keys from the Clerk Dashboard
3. Add keys to configuration:
   - `VITE_CLERK_PUBLISHABLE_KEY` in `wrangler.jsonc` (public)
   - `CLERK_SECRET_KEY` via `npx wrangler secret put CLERK_SECRET_KEY` (production)
   - For local dev, create `.dev.vars` with `CLERK_SECRET_KEY`

### Example Routes
- `/dashboard` - Protected route example
- `/sign-in/*` - Sign-in page (Clerk component)
- `/sign-up/*` - Sign-up page (Clerk component)

### Using Authentication

#### In React Router Loaders/Actions
```typescript
import { requireAuth } from "~/lib/auth.server";
const { userId } = await requireAuth(args);
```

#### In Hono API Routes
```typescript
import { clerkAuth, getAuth } from "./middleware/auth";
app.get("/api/protected", clerkAuth, async (c) => {
  const { userId } = getAuth(c);
  // Use userId...
});
```

#### In React Components
```typescript
// For UI state
import { useAuth } from "@clerk/react-router";
const { isSignedIn, userId } = useAuth();

// For API calls
import { useAuthenticatedFetch } from "~/lib/api";
const { authFetch } = useAuthenticatedFetch();
const data = await authFetch('/api/me');
```

## When to Use Loaders vs Hono API Routes

### Use React Router Loaders When:
- **Initial page data** - Data needed to render the page
- **SEO-critical content** - Must be in HTML for search engines
- **Server-side rendering** - Data should be ready before page loads
- **Direct database access** - Can use D1/KV/DO directly without HTTP overhead
- **Navigation data** - Data that changes when user navigates

Examples:
- User profile data for profile page
- Blog post content
- Product listings
- Dashboard metrics

### Use Hono API Routes When:
- **Client-side interactions** - Data fetched after page load
- **Real-time updates** - Polling or WebSocket connections
- **Form submissions** - POST/PUT/DELETE operations
- **External API access** - Webhooks, third-party integrations
- **Mobile app API** - Shared API with mobile apps
- **File uploads** - Handling multipart forms
- **Incremental data** - Loading more items, pagination

Examples:
- Like/unlike actions
- Comment submissions
- Search autocomplete
- File uploads to R2
- Refresh data without navigation
- API endpoints for mobile apps

## Cloudflare Bindings (Configured as Template)

### Durable Objects
- Binding: `BACKEND_DO` - Stateful, single-threaded JavaScript objects
- Class: `BackendDurableObject` in `workers/durableObjects/`
- Example route: `/api/do/:id`
- **TODO: Delete from wrangler.jsonc and code if not needed**

### D1 Database
- Binding: `DB` - SQLite database at the edge
- Setup: Run `npx wrangler d1 create <database-name>` and update wrangler.jsonc
- Example route: `/api/d1/example`
- **TODO: Delete from wrangler.jsonc and code if not needed**

### R2 Storage
- Binding: `BUCKET` - Object storage compatible with S3 API
- Setup: Run `npx wrangler r2 bucket create <bucket-name>` and update wrangler.jsonc
- Example routes: `/api/r2/upload` (POST), `/api/r2/:key` (GET)
- **TODO: Delete from wrangler.jsonc and code if not needed**