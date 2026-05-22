# Figmake 🚀

> **Design-to-code compiler with AI agent guardrails.**  
> Extract Figma designs as pixel-perfect React code. Generate design lockfiles that keep vibecoding agents from hallucinating styles.

---

## 🛡️ The Vibecode Guard

AI coding agents are powerful but they hallucinate design. Colors drift. Spacing breaks. Fonts get replaced. Your carefully crafted design system dissolves with every prompt.

Figmake extracts the **ground truth** from your Figma files and generates:

1.  **Pixel-perfect React components** with exact styles (no rounding, no opinionated scales).
2.  **Design lockfiles** (`.figmake.lock`) that any AI agent can reference.
3.  **Prompt context** and **Agent Rules** (Cursor, Claude, Copilot) that force agents to respect your design system.

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
3.  Select `src/plugin/manifest.json`.

---

## 💻 CLI Usage

### Export Designs
Extract top-level frames into React components:
```bash
figmake export --url "FIGMA_FILE_URL" --token "YOUR_PAT" --output "./src/components"
```

### Generate Design Lockfile
Create a source of truth for your AI agents:
```bash
figmake lockfile --url "FIGMA_FILE_URL" --token "YOUR_PAT"
```

### AI Agent Guardrails
Generate rules for your favorite AI editor:
```bash
figmake guard --agent cursor  # Generates .cursor/rules/design-system.mdc
figmake guard --agent prompt  # Outputs context to paste into any chat
```

---

## ✨ Features

-   ✅ **Pixel-perfect conversion:** Auto Layout → Flexbox/Grid with exact values.
-   ✅ **Framer Motion animations:** Extracted directly from Figma prototypes.
-   ✅ **Event handlers:** Functional logic for navigation and state updates.
-   ✅ **Design token extraction:** Palette, typography, spacing, and shadows.
-   ✅ **AI Agent Lockfiles:** Compatible with Cursor, Claude, Copilot, and more.
-   ✅ **Visual Validation:** In-plugin pixel-diffing comparison.

---

## 🤝 Contributing
Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License
MIT License. Built with ❤️ for the design and developer community.
