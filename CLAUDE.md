# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NursED Admin is a nursing education management system built with React + Vite + Tauri. It migrated from Next.js to a desktop application architecture, combining a React frontend with a Rust backend via Tauri.

**Tech Stack:**
- **Frontend**: React 18 + Vite + React Router + Tailwind CSS v4
- **Backend**: Tauri 2 with Rust (SQLx for SQLite, LanceDB for vector search)
- **Key Libraries**: TipTap (rich text editor), date-fns, jsPDF, AI SDK (Google/OpenAI)

## Development Commands

```bash
# Frontend development (Vite dev server on port 1420)
npm run dev

# Build TypeScript and frontend assets
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Tauri commands (build desktop app, run in dev mode)
npm run tauri dev
npm run tauri build
```

## Architecture

### Dual-Process Architecture

The application runs two separate processes:
1. **Frontend (React/Vite)**: UI rendered in Tauri's webview
2. **Backend (Rust/Tauri)**: Native desktop app managing database and system integration

Communication happens via **Tauri IPC** using the `invoke()` function from `@tauri-apps/api/core`.

### Frontend Structure

- **Entry**: `src/App.tsx` - React Router setup with sidebar navigation
- **Database Layer**: `src/lib/db.ts` - All Tauri command invocations to Rust backend
- **Pages**: `src/pages/` - Route components (Home, Students, Clinicals, Calendar, etc.)
- **Components**: `src/components/` - Reusable UI components
- **Types**: `src/types/index.ts` - TypeScript interfaces matching Rust models
- **Path Alias**: `@/` maps to `./src/`

### Backend Structure

- **Entry**: `src-tauri/src/lib.rs` - Tauri app initialization
- **Database**: `src-tauri/src/db.rs` - SQLite schema and connection pool
- **Models**: `src-tauri/src/models.rs` - Rust structs with Serde serialization
- **Commands**: `src-tauri/src/commands.rs` - Tauri command handlers exposed to frontend
- **Vector Store**: `src-tauri/src/vector_store.rs` - LanceDB vector search with FastEmbed
- **Menu/Tray**: `src-tauri/src/menu.rs` + `tray.rs` - Native menus and system tray

### Data Flow Pattern

```
Frontend (React) → invoke('command_name', { args })
    ↓
Tauri IPC
    ↓
Rust Command Handler (commands.rs)
    ↓
Database (SQLx) / Vector Store (LanceDB)
```

Example: `src/lib/db.ts:loadStudents()` → `invoke('get_all_students')` → `commands.rs:get_all_students()` → SQLx query

### Database Schema

**SQLite tables** (defined in `src-tauri/src/db.rs:init_db()`):
- `students` - Student records with clinical hours, skills (JSON array), NCLEX scores
- `grades` - Student grades linked by `student_id` foreign key
- `clinical_logs` - Clinical site logs with competencies (JSON array), status, feedback
- `calendar_events` - Events with type, location, proctor, status

**Vector Store** (LanceDB):
- `knowledge_base` table with 384-dimensional embeddings (FastEmbed AllMiniLML6V2 model)
- Schema: `id`, `text`, `vector` (FixedSizeList[Float32])

### Data Type Handling

**Critical**: Rust models use `sqlx::types::Json<Vec<String>>` for JSON columns (`skills_completed`, `mapped_competencies`). TypeScript sees these as `string[]` but Rust serializes/deserializes automatically.

**Date handling**: Frontend sends ISO strings, Rust stores as TEXT in SQLite.

## Key Architectural Patterns

### State Management
- Frontend uses Tauri commands as data layer (no Redux/Zustand)
- Database state lives in Rust via `DbState` managed state
- Vector store uses singleton pattern with `Mutex<Option<VectorStore>>`

### Menu System
- Native menus defined in `src-tauri/src/menu.rs`
- System tray in `src-tauri/src/tray.rs`
- Events handled in `src-tauri/src/event_handlers.rs`
- Frontend listens via `useMenuEvents` hook

### Window State
- Window position/size persisted in `src-tauri/src/window_state.rs`
- Restored on app launch

## Common Development Patterns

### Adding a New Tauri Command

1. Define Rust struct in `src-tauri/src/models.rs` if needed
2. Add command handler in `src-tauri/src/commands.rs`
3. Register in `src-tauri/src/lib.rs` `invoke_handler![]` macro
4. Add TypeScript function in `src/lib/db.ts` using `invoke('command_name')`
5. Import and use in React components

### Database Changes

Database tables are created in `src-tauri/src/db.rs:init_db()`. Modify SQL there and ensure corresponding changes in:
- Rust models (`models.rs`)
- TypeScript types (`src/types/index.ts`)
- Command handlers (`commands.rs`)

**Note**: No migration system exists - schema changes require manual DB deletion or ALTER statements.

### Vector Search Usage

1. Initialize: `invoke('init_vector_store')` on app start
2. Index: `invoke('index_document', { id, text })` - embeds and stores in LanceDB
3. Search: `invoke('search_documents', { query })` - returns top 5 semantic matches

Used in Knowledge Base feature for semantic document search.

## TypeScript Configuration

- Path mapping: `@/*` → `./src/*`
- Strict mode enabled
- React JSX transform

## Building and Distribution

```bash
# Development (hot reload both frontend and Rust)
npm run tauri dev

# Production build (creates platform-specific installers)
npm run tauri build
```

Build output in `src-tauri/target/release/bundle/`

## Important Notes

- **Database location**: App data directory (platform-specific), file named `nursed.db`
- **LanceDB location**: App data directory under `lancedb/` subdirectory
- **Seed data**: Triggered in `src/lib/db.ts:loadStudents()` if no students exist
- **Foreign key cascades**: Student deletion manually cascades to grades and clinical logs (see `commands.rs:delete_student()`)

## Known Constraints

- No test suite currently exists
- README.md is outdated (references Next.js instead of Tauri)
- Vector store uses 384-dimensional embeddings (cannot be changed without recreation)
- SQLite connection pool limited to 5 connections
