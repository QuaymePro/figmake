import { ExtractedDesignTokens } from '../design-system/extractDesignTokens';

export function generatePromptContext(tokens: ExtractedDesignTokens): string {
  return `
DESIGN SYSTEM (DO NOT DEVIATE):
- Primary: ${tokens.colors.primary[500]} (500), ${tokens.colors.primary[600]} (600)
- Secondary: ${tokens.colors.secondary[500]} (500)
- Font: ${tokens.typography.fontFamilies.primary}
- Spacing: ${tokens.spacing.unit}px base unit
- Radius: ${tokens.borderRadius.scale.join(', ')}

When building components for this project, use EXACTLY these values.
Do not approximate, round, or substitute. Reference the .figmake.lock file.
`;
}
