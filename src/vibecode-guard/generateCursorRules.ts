import { ExtractedDesignTokens } from '../design-system/extractDesignTokens';

export function generateCursorRules(tokens: ExtractedDesignTokens): string {
  return `---
description: Design system constraints — DO NOT HALLUCINATE STYLES
globs: **/*.tsx,**/*.jsx,**/*.css
alwaysApply: true
---

# Design System Rules

## Colors — USE EXACTLY THESE, DO NOT INVENT
- Primary: ${tokens.colors.primary[500]} (500), ${tokens.colors.primary[600]} (600)
- Secondary: ${tokens.colors.secondary[500]} (500)
- Background: ${tokens.colors.background.primary} (primary), ${tokens.colors.background.secondary} (secondary)
- Text: ${tokens.colors.text.primary} (primary), ${tokens.colors.text.secondary} (secondary)

## Typography — EXACT VALUES
- Font: ${tokens.typography.fontFamilies.primary}
- Headings: ${tokens.typography.scale['2xl'].fontSize}/${tokens.typography.scale['2xl'].lineHeight} (h1), ${tokens.typography.scale.xl.fontSize} (h2)
- Body: ${tokens.typography.scale.base.fontSize}/${tokens.typography.scale.base.lineHeight}

## Spacing Scale — USE THESE, NOT RANDOM VALUES
- Base unit: ${tokens.spacing.unit}px
- Scale: ${Object.values(tokens.spacing.scale).join(', ')}

## When Building Components:
1. ALWAYS import colors from the design token file
2. NEVER use arbitrary color values
3. NEVER change font families
4. USE the spacing scale for all padding/margin/gap
5. MATCH border-radius to the design system (${Object.values(tokens.borderRadius.scale).join(', ')})
6. WHEN IN DOUBT, reference the .figmake.lock file
`;
}
