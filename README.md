
# Context Studio

**Tech Stack:**
*   **Backend:** **Tauri 2.0** (latest stable) for native performance and file system access via Rust.
*   **Frontend:** **React** + **Vite** + **TypeScript**.
*   **Styling:** **Tailwind CSS**.
*   **Package Manager:** **pnpm**.
*   **Key Libraries:** `tiktoken` (for token estimation), `zustand` (state management), and `lucide-react` (icons).

---

**Full Feature List:**
1.  **Project Root Selector:** Native folder picker to set the working directory.
2.  **Checkbox File Tree:** Interactive tree view to selectively include/exclude files and folders.
3.  **Smart Ignore Engine:** 
    *   Hardcoded defaults (`node_modules`, `.git`, etc.).
    *   Automatic parsing of `.gitignore`, `.dockerignore`, and `.aiignore`.
4.  **Context Formatter:** 
    *   Output starts with the directory tree.
    *   Each file is labeled with its path and wrapped in triple backticks with language auto-detection.
    *   Supports both Markdown and XML output formats.
5.  **Token Counter:** A live badge showing the total token count of the current selection (using GPT-4 encoding standard).
6.  **Privacy Filter:** Toggleable regex-based masking for secrets (API Keys, SSH keys, `.env` values).
7.  **Prompt Templates:** A library of "System Instruction" headers (e.g., "Review for bugs", "Refactor for performance") to prepend to the output.
8.  **Context Organizer:** Drag-and-drop reordering to optimize file order for AI attention (primacy/recency effects).
9.  **Output:** One-click "Copy to Clipboard" and "Save as .md".

