# JSON Editor

A premium, modern, and feature-rich JSON editor, dashboard, and visualizer built with React, TypeScript, and Vite. Designed with a sleek Vercel-inspired dark-first aesthetic, it lets you seamlessly organize multiple JSON projects in local storage, validate structures in real time, and map complex relationships with a custom interactive graph system.

---

## ✨ Features

### 📁 Project Dashboard & Import
- **Vercel-style List View**: Browse and manage your local JSON projects with details on validity, size, and last updated time.
- **Local Persistence**: All projects are automatically saved locally inside your browser's `localStorage`.
- **Fast Import JSON**: Drop JSON files or click to import files directly, immediately creating a project.
- **One-click Blank Canvas**: Instant blank project creation with customizable smart templates (Empty Object, Empty Array, Sample User).

### ✍️ Core Editor & Visualization
- **Monaco JSON Editor**: Industrial-grade syntax highlighting, autocomplete, and real-time linting.
- **Infinite Grid Graph Showcase**: Custom-built interactive graph rendering with a dotted infinite pattern canvas. Highlight ancestor paths up to the root in glowing colors when you click on a node.
- **Interactive Tree View**: Traditional hierarchical tree representation with quick expand/collapse toggle states.
- **Format & Minify**: One-click code formatting (2 spaces, 4 spaces, tabs) and minification.
- **Schema Validator**: Validate JSON data structures against custom JSON Schemas.
- **Interactive Status Bar**: Real-time stats on depth, lines, byte size, and keys count.

### 📱 Responsive Desktop Experience
- **Desktop Required Overlay**: Built-in responsive block overlay for mobile and portrait tablet viewports (`lg:hidden`). Restricts usage to horizontal resolutions designed for advanced split editing.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/charlzx/json-tree.git
cd json-tree

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The app will launch at `http://localhost:5173`.

---

## 🛠️ Available Scripts

```bash
pnpm dev              # Start dev server with Hot Module Replacement
pnpm build            # Production build compilation
pnpm build:dev        # Development build compilation
pnpm preview          # Preview production build locally
pnpm lint             # Run ESLint check
```

---

## 📝 License

This project is licensed under the MIT License.

---

Made with 🖤 by [Charlzx](https://github.com/charlzx)