# Figmake 🚀

**Figmake** is an advanced Figma-to-React conversion pipeline that bridges the gap between design and production-ready code. It includes a Figma plugin, a powerful CLI tool, and a synchronization protocol to keep your code in sync with your designs.

---

## ✨ Key Features

-   **🎨 Precise Property Extraction:** Recursively extracts every Figma property: geometry, layout, fills, strokes, effects, and text attributes.
-   **📐 Auto Layout to CSS:** Converts Figma's Auto Layout into high-precision CSS Flexbox and Grid (including wrapping and complex layout grids).
-   **⚛️ React TSX Generation:** Produces clean, functional React components with customizable styling (Inline, CSS Modules, Styled Components).
-   **🎭 Animation Engine:** Maps Figma prototype interactions to **Framer Motion** (whileHover, whileTap, layoutId, AnimatePresence).
-   **⚡ Event Handler Logic:** Generates functional handlers for navigation, state updates, and external links based on Figma interactions.
-   **🔄 Sync Protocol:** Detects "Design Drift" by embedding content hashes and node IDs. The `figmake sync` command updates code without losing manual developer logic.
-   **✅ Visual Validation:** A built-in validation mode compares rendered React components against Figma reference images using pixel-by-pixel diffing.
-   **🛠️ Custom CLI:** A global `figmake` command for headless export, synchronization, and automated workflows.

---

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/QuaymePro/figmake.git
cd figmake

# Install dependencies
npm install

# Build and Link the CLI globally
npm run build
npm link
```

### 2. Figma Plugin Setup
1.  Open Figma Desktop.
2.  Go to **Plugins** -> **Development** -> **Import plugin from manifest...**.
3.  Select the `manifest.json` file in the project root.

---

## 💻 CLI Usage

Use the `figmake` command just like you use `claude` or `git`.

### Export Designs
Extract top-level frames into React components:
```bash
figmake export --url "FIGMA_FILE_URL" --token "YOUR_PAT" --output "./src/components"
```

### Sync Changes
Detect and apply design updates to existing code:
```bash
figmake sync --url "FIGMA_FILE_URL" --token "YOUR_PAT" --dir "./src/components"
```

### Options
-   `-u, --url`: Figma file URL.
-   `-t, --token`: Figma Personal Access Token.
-   `-o, --output`: Directory to save components.
-   `-w, --watch`: Poll Figma for changes and regenerate instantly.

---

## 🛠️ Configuration

Figmake is highly customizable via the plugin's **Settings** panel:
-   **Styling:** Inline Styles, CSS Modules, Styled Components.
-   **Routing:** None (useState), React Router, Next.js.
-   **Animations:** Framer Motion, GSAP, CSS Transitions.
-   **TS Strictness:** Interfaces, Types, or JavaScript.

---

## 📦 Project Structure

-   `src/cli.ts`: Entry point for the `figmake` command.
-   `src/code.ts`: Core Figma plugin logic.
-   `src/generateReactCode.ts`: The main conversion engine.
-   `src/syncProtocol.ts`: Logic for hashing and drift detection.
-   `src/ui.html`: The plugin's user interface.

---

## 📄 License

ISC License. Built with ❤️ for the Figma and React communities.
