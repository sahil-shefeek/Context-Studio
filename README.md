# Context Studio

A desktop application for assembling AI-friendly project context. It scans a local codebase, lets you selectively pick files, and outputs a well-formatted context document ready to paste into any LLM conversation.

## Tech Stack

- **Backend:** Tauri 2.0 (Rust) -- native performance, file system access, and cross-platform builds.
- **Frontend:** React + TypeScript, bundled with Vite.
- **Styling:** Tailwind CSS 4.
- **Package Manager:** pnpm.
- **Key Libraries:** tiktoken (token estimation), zustand (state management), lucide-react (icons), Radix UI (accessible primitives), CodeMirror (editor), dnd-kit (drag-and-drop).

## Features

1. **Project Root Selector** -- native folder picker to set the working directory.
2. **Checkbox File Tree** -- interactive tree view to include or exclude files and folders.
3. **Smart Ignore Engine**
   - Hardcoded defaults for common directories (`node_modules`, `.git`, etc.).
   - Automatic parsing of `.gitignore`, `.dockerignore`, and `.aiignore`.
4. **Context Formatter**
   - Starts output with a directory tree overview.
   - Wraps each file in fenced code blocks with automatic language detection.
   - Supports both Markdown and XML output formats.
5. **Live Token Counter** -- real-time badge showing the total token count of the current selection (GPT-4 encoding).
6. **Privacy Filter** -- toggleable regex-based masking for API keys, SSH keys, `.env` values, and other secrets.
7. **Prompt Templates** -- a library of system instruction headers (e.g., "Review for bugs", "Refactor for performance") that prepend to the output.
8. **Context Organizer** -- drag-and-drop reordering of files to optimize attention order (primacy/recency effects).
9. **File Preview** -- click any file in the tree to preview its contents in a modal with syntax highlighting.
10. **Output Actions** -- one-click copy to clipboard or save as `.md`.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + O` | Open folder |
| `Ctrl/Cmd + ,` | Open settings |
| `Ctrl/Cmd + K` | Clear file tree |
| `Ctrl/Cmd + C` | Copy context (when not editing) |

## Getting Started

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (stable)
- [Node.js](https://nodejs.org/) (LTS)
- [pnpm](https://pnpm.io/installation)
- System dependencies for Tauri: see the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/)

### Development

```sh
pnpm install
pnpm tauri dev
```

### Production Build

```sh
pnpm tauri build
```

Output binaries are written to `src-tauri/target/release/bundle/`.

## Project Structure

```
context-studio/
  src/                  # React frontend
    components/         # UI components (Sidebar, MainContent, TitleBar, etc.)
    store/              # Zustand state management
    lib/                # Utility functions
  src-tauri/            # Tauri/Rust backend
    src/                # Rust source (lib.rs, main.rs)
    capabilities/       # Tauri permission declarations
    icons/              # Application icons
```

## License

See [LICENSE](LICENSE) for details.
