# Figmake

[![npm version](https://img.shields.io/npm/v/figmake.svg)](https://www.npmjs.com/package/figmake)
[![CI](https://github.com/QuaymePro/figmake/actions/workflows/ci.yml/badge.svg)](https://github.com/QuaymePro/figmake/actions/workflows/ci.yml)
[![Windows Support](https://img.shields.io/badge/platform-windows%20%7C%20macos%20%7C%20linux-blue)](https://github.com/QuaymePro/figmake)
[![License](https://img.shields.io/badge/license-MIT-green)](https://github.com/QuaymePro/figmake/blob/main/LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/QuaymePro/figmake?label=latest&color=green)](https://github.com/QuaymePro/figmake/releases/tag/v3.0.5)

> Design-to-code compiler with AI agent guardrails.  
> Extract Figma designs as pixel-perfect React code. Generate design lockfiles that keep vibecoding agents from hallucinating styles.

## Why Figmake?

AI coding agents are powerful but they hallucinate design. Colors drift. Spacing breaks. Fonts get replaced. Your carefully crafted design system dissolves with every prompt.

Figmake extracts the **ground truth** from your Figma files and generates:

1. **Pixel-perfect React components** with exact styles
2. **Design lockfiles** that any AI agent can reference
3. **Prompt context** that forces agents to respect your design system

## Quick Start

![Figmake in action](https://raw.githubusercontent.com/QuaymePro/figmake/main/docs/demo.gif)

### 1. Install Figmake
```bash
npm install -g @sleonereed/figmake
```

### 2. Start Interactive Shell
```bash
figmake
```

The interactive shell provides:
- **Command menu** - Press `/` to browse all available commands with descriptions
- **Smart autocomplete** - Start typing any command and press `Tab` to complete
- **Command history** - Use `↑/↓` arrows to navigate previous commands
- **Syntax highlighting** - Commands, flags, and URLs are color-coded
- **Status line** - Shows history count and token status at a glance

**Quick commands:**
| Command | Description |
|---------|-------------|
| `/` | Open command menu |
| `/convert` | Convert Figma to React |
| `/demo` | Generate demo components |
| `/config` | Configuration wizard |
| `/help` | Show detailed help |
| `/clear` | Clear the screen |
| `/exit` | Exit the shell |

### 3. Or Use Direct Commands
```bash
# Show help
figmake --help

# Run demo (no token needed)
figmake --demo

# Convert a Figma file
figmake convert "https://figma.com/file/..." --token YOUR_TOKEN

# Interactive config
figmake --config
```

## Troubleshooting

### Token Issues
- **Error: 403 Forbidden**: Ensure your token has "Read-only" or "Read/Write" permissions for the file.
- **Error: 404 Not Found**: Check if the Figma URL is correct and the file key is valid.

### Export Issues
- **Missing Styles**: Ensure all elements are inside a Frame or Component. Groups are exported as containers but may not preserve all layout properties as well as Frames.
- **Image Placeholders**: By default, Figmake uses placeholders for SVGs and Vectors. To change this, update your configuration.

## Examples

Check the [examples/](./examples) directory for:
- [Basic React App](./examples/react-basic)
- [Next.js App Router](./examples/nextjs-app)
- [Sample Figma Library](./examples/figma-sample.md)

With Cursor/Claude/Copilot

```bash
figmake guard --output .cursor/rules/design-system.mdc
# Now your AI agent won't hallucinate styles
```

## Features

· ✅ Pixel-perfect conversion (no rounding, no opinionated scales)
· ✅ Auto Layout → Flexbox/Grid with exact values
· ✅ Framer Motion animations from Figma prototypes
· ✅ Event handlers for interactive elements
· ✅ Design token extraction (colors, typography, spacing, shadows)
· ✅ AI agent lockfiles (Cursor, Claude, Copilot, Windsurf)
· ✅ Component collision detection
· ✅ Code metrics and complexity analysis
· ✅ README generation on export
