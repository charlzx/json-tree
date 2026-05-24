# json-editor

A modern, browser-based JSON editor built specifically for creating, editing, and visualizing professional JSON structures. Features a split-pane interface with a code editor, live tree/graph preview, schema validation, and full project management — all running locally in your browser.

**Live Demo:** [json.charlz.dev](https://json.charlz.dev)

---

## Features

- **Split-pane editor & preview** — Resizable panels with Monaco editor (the same engine powering VS Code) on the left and a live-rendered interactive tree or graph preview on the right.
- **Multi-project management** — Create, rename, and delete multiple JSON projects. All data persists in your browser's local storage — nothing is ever sent to a server.
- **Rich JSON toolbar** — Format JSON with custom indentation (2 spaces, 4 spaces, tabs), minify JSON with a single click, copy to clipboard, and clear editor.
- **Premium Graph Visualizer** — Custom-built interactive graph rendering with a dotted infinite pattern canvas. Highlight ancestor paths up to the root in glowing colors when you click on a node.
- **Interactive Tree View** — Hierarchical tree representation of JSON structure with expand and collapse toggle states.
- **Schema validation** — Validate JSON against custom JSON schemas.
- **Dark & light themes** — Switch between light and dark mode; preference is saved locally.
- **Import & export** — Open existing `.json` files from your computer or drag and drop files directly.
- **Desktop-first design** — Optimized for tablet landscape, laptop, and desktop screens due to the split-pane layout.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 with TypeScript |
| Build tool | Vite 6 |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Layout / Panels | `react-resizable-panels` |
| Styling | Tailwind CSS 3 with custom Vercel dark theme variables |
| Animations | Framer Motion |
| Icons | Lucide React |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/charlzx/json-editor.git
cd json-editor

# Install dependencies
pnpm install
```

### Development

```bash
pnpm dev
```

Opens the app in development mode with hot module replacement (HMR). Visit `http://localhost:5173` in your browser.

### Build

```bash
pnpm build
```

Compiles TypeScript and builds the production bundle to the `dist/` directory.

### Preview production build

```bash
pnpm preview
```

### Lint

```bash
pnpm lint
```

Runs ESLint on the codebase.

---

## Project Structure

```
json-editor/
├── src/
│   ├── components/      # UI and JSON helper components
│   ├── hooks/           # useProjects, useTheme and custom React hooks
│   ├── lib/             # JSON utility and parsing modules
│   ├── pages/           # Home dashboard and Editor route pages
│   ├── App.tsx          # Main application router and shell
│   ├── main.tsx         # Entry point
│   └── index.css        # Tailwind CSS + custom theme variables
├── public/              # Favicon and static assets
├── index.html           # HTML shell
├── package.json         # Dependencies and scripts
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── eslint.config.js     # ESLint configuration
```

---

## Usage Guide

### Creating a JSON Project

Click **New blank JSON** on the home screen to open a blank `{}` project immediately, or **Import JSON** to load a local `.json` file.

### Editing

Use the Monaco editor on the left to write JSON. Real-time stats and validation are displayed dynamically on the status bar below. Use the split view to observe live tree structure updates, graph connections, or schema violations.

### Managing projects

All projects are listed on the home screen, sorted by most recently updated. Use the search bar to filter projects. Click the trash icon to delete a project (with confirmation dialog).

### Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Save project name in header |
| `Escape` | Cancel name rename or exit fullscreen |

---

## Browser Support

The editor requires a modern browser with support for:

- Local Storage
- FileReader API
- ResizeObserver
- CSS Grid & Custom Properties

Works best on Chrome, Firefox, Safari, and Edge on desktop or tablet landscape. Mobile screens are not supported due to the split-pane layout — a friendly "Desktop Required" message is shown on small screens.

---

Built by [Charlz](https://charlz.dev)
