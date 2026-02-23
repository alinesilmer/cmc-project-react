# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://127.0.0.1:5173
npm run build     # Production build (outputs to dist/)
npm run lint      # Run ESLint
npm run preview   # Preview the production build
```

No test runner is configured.

## Architecture Overview

This is a React 19 + TypeScript + Vite application that serves **two distinct frontends** from a single codebase:

### 1. Public Website (`src/website/`)
A public-facing institutional site (Spanish content) with pages like home, news, services, gallery, courses, etc. Uses lazy loading for most routes. The router wraps all pages in a shared `<Header>` and `<Footer>`. Contains an `/admin` section for web editors protected by `RequireWebEditor`.

### 2. Admin Panel (`src/app/`)
An authenticated management panel reachable at `/panel/*`. Protected by `RequireAuth` which redirects to `/panel/login` if unauthenticated.

### Entry Point
`src/main.tsx` renders `RootRoutes` (from `src/routes.tsx`) wrapped in:
- `BrowserRouter`
- `QueryClientProvider` (TanStack Query)
- `AuthProvider`

`src/routes.tsx` is the canonical route definition file. `src/App.tsx` is an older layout file (legacy, routes still exist there but the app now uses `routes.tsx`).

### Authentication (`src/app/auth/`)
- **`AuthProvider.tsx`**: Context providing `user`, `login`, `logout`, `ready`. On mount, checks for `csrf_token` cookie to attempt a token refresh via `POST /auth/refresh`.
- **`api.ts`**: `login()`, `logout()`, `me()` — uses `httpBare` (no interceptor) for auth calls to avoid refresh loops.
- **`token.ts`**: In-memory + sessionStorage token store. `getCookie()` reads `csrf_token` from document.cookie.
- **`RequireAuth.tsx`**: Route guard — waits for `ready`, redirects to `/panel/login` if no user.
- **`RequirePermission.tsx`**: Inline guard component; accepts `scope`, `anyOf`, or `allOf` props against `user.scopes[]`.
- **`roles.ts`**: `isWebEditor(scopes)` checks for web editor scopes.

### HTTP Layer (`src/app/lib/http.ts`)
Two Axios instances:
- **`http`**: Main instance with request interceptor (injects `Authorization: Bearer <token>`) and response interceptor (auto-refreshes on 401, queues concurrent requests during refresh).
- **`httpBare`**: No interceptors, used for auth endpoints.

Helper functions: `getJSON`, `postJSON`, `putJSON`, `patchJSON`, `delJSON`, `postForm`, `getJSONLong` (for long-running requests with configurable timeout).

### API Proxy (dev)
`vite.config.ts` proxies `/auth`, `/api`, and `/uploads` to `http://127.0.0.1:8000`. In production, `VITE_API_URL` env var sets the base URL.

### Panel Layout
Authenticated panel routes use `AppLayout` (sidebar + `<Outlet>`). The `Sidebar` component handles navigation. Panel layout lives at `/panel` with nested routes.

### Notifications
`useNotify()` hook (`src/app/hooks/useNotify.tsx`) wraps RSuite's `toaster` for `success`, `info`, `warning`, `error`, `loading`, and `remove`/`clear` operations.

### Key Dependencies
- **UI**: MUI v7 + RSuite v6 + Emotion + Sass (SCSS modules)
- **Routing**: React Router v7
- **Data fetching**: TanStack Query v5
- **Animations**: Framer Motion
- **Rich text**: Quill v2
- **Document export**: jsPDF + jsPDF-autotable, ExcelJS, file-saver, xlsx
- **Document parsing**: mammoth (Word), pdfjs-dist

### Path Alias
`@` resolves to `./src` (configured in `vite.config.ts` and tsconfig).

### Styling
SCSS modules per component. Global styles at `src/app/styles/globals.scss`. RSuite toaster overrides at `src/app/styles/rsuite-toaster-overrides.css`.
