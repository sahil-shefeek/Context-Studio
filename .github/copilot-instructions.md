# Context Catcher - AI Coding Instructions

## Project Overview
A **Tauri 2.0 desktop app** that aggregates project files into AI-friendly markdown context. The app scans directories, lets users select files via a tree UI, and exports formatted context with token counting.

## Architecture

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite (port 1420) + Tailwind CSS v4
- **Backend**: Rust via Tauri 2.0 for native filesystem access
- **State**: Zustand store (`src/store/appStore.ts`) - single source of truth
- **Package Manager**: pnpm (required)

### Two-Process Model
```
┌─────────────────┐     invoke()      ┌──────────────────┐
│  React Frontend │ ◄──────────────► │  Rust Backend    │
│  src/           │   @tauri-apps/api │  src-tauri/src/  │
└─────────────────┘                   └──────────────────┘
```

- **Frontend→Backend**: Use `invoke<T>("command_name", { args })` from `@tauri-apps/api/core`
- **Add new commands**: Define in `src-tauri/src/lib.rs`, register in `invoke_handler![]`

### Key Files
| File | Purpose |
|------|---------|
| `src/store/appStore.ts` | Zustand store with FileNode types matching Rust structs |
| `src-tauri/src/lib.rs` | Tauri commands (`get_file_tree`), FileNode struct, smart ignore logic |
| `src/components/Sidebar.tsx` | File tree with recursive `FileTreeNode` component |
| `src/components/MainContent.tsx` | Output preview and export actions |

## Development Commands
```bash
pnpm install          # Install dependencies
pnpm tauri dev        # Run app in dev mode (starts both Vite + Tauri)
pnpm tauri build      # Production build
```

## Code Patterns

### Tauri Command Pattern
```rust
// In lib.rs - define command with #[tauri::command]
#[tauri::command]
fn my_command(arg: String) -> Result<ReturnType, String> { ... }

// Register in run(): .invoke_handler(tauri::generate_handler![my_command])
```
```typescript
// In frontend - call with invoke
const result = await invoke<ReturnType>("my_command", { arg: "value" });
```

### Component Structure
- Components use named exports, re-exported through `src/components/index.ts`
- All components receive state from `useAppStore()` hook
- Styling: Inline Tailwind classes with custom CSS variables from `index.css`

### Smart Ignore System
Built-in ignore patterns in `lib.rs::SMART_IGNORE` constant. Currently hardcoded:
`node_modules`, `.git`, `target`, `dist`, `build`, `.env`, etc.

## Conventions

### TypeScript/React
- Functional components only
- Interface names match Rust struct names (e.g., `FileNode`)
- Use `lucide-react` for icons

### Rust/Tauri
- Commands return `Result<T, String>` for error handling
- Use `serde` derive macros for IPC serialization
- FileNode children use `Option<Vec<FileNode>>` with `skip_serializing_if`

### Styling
- Dark theme with CSS variables in `:root` (see `index.css`)
- Color palette: `#0a0a0f` (bg), `#3b82f6` (accent/blue), `#e4e4e7` (text)

## Planned Features (from README)
- Token counting with `@dqbd/tiktoken`
- Privacy filter for secrets
- Prompt templates library
- `.gitignore`/`.aiignore` parsing

## Gotchas
- Vite runs on port **1420** (fixed, required by Tauri)
- `src-tauri/target/` is the Rust build cache - can be large, safe to delete
- The lib crate has suffix `_lib` to avoid Windows naming conflicts
