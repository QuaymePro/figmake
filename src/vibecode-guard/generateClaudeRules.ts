import { ExtractedDesignTokens } from '../design-system/extractDesignTokens';

export function generateClaudeRules(tokens: ExtractedDesignTokens): string {
  return `DESIGN SYSTEM CONSTRAINTS

COLORS:
primary-500: ${tokens.colors.primary[500]}
secondary-500: ${tokens.colors.secondary[500]}
bg-primary: ${tokens.colors.background.primary}
text-primary: ${tokens.colors.text.primary}

TYPOGRAPHY:
font: ${tokens.typography.fontFamilies.primary}
body: ${tokens.typography.scale.base.fontSize}/${tokens.typography.scale.base.lineHeight}

SPACING:
unit: ${tokens.spacing.unit}px
scale: [${Object.values(tokens.spacing.scale).join(', ')}]

VIOLATIONS TO AVOID:
- Do not invent new colors
- Do not use system fonts instead of ${tokens.typography.fontFamilies.primary}
- Do not use spacing values outside of the scale
`;
}
