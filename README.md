# Figmake

> Design-to-code compiler with AI agent guardrails.  
> Extract Figma designs as pixel-perfect React code. Generate design lockfiles that keep vibecoding agents from hallucinating styles.

## Why Figmake?

AI coding agents are powerful but they hallucinate design. Colors drift. Spacing breaks. Fonts get replaced. Your carefully crafted design system dissolves with every prompt.

Figmake extracts the **ground truth** from your Figma files and generates:

1. **Pixel-perfect React components** with exact styles
2. **Design lockfiles** that any AI agent can reference
3. **Prompt context** that forces agents to respect your design system

## Quick Start

### Figma Plugin
1. Install from Figma Community: [link]
2. Select any frame
3. Copy React code or export full project

### CLI
```bash
npx figmake init
npx figmake export "https://figma.com/file/..." --token YOUR_TOKEN
npx figmake lockfile  # Generate design constraints for AI agents
```

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
