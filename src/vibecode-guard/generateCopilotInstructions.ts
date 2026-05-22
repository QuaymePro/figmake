import { ExtractedDesignTokens } from '../design-system/extractDesignTokens';

export function generateCopilotInstructions(tokens: ExtractedDesignTokens): string {
  return `# Copilot Instructions

This project's design system is enforced. Suggestions MUST respect these constraints.

## Style Rules
- Primary Color: ${tokens.colors.primary[500]}
- Font: ${tokens.typography.fontFamilies.primary}
- Spacing Unit: ${tokens.spacing.unit}px

## Implementation
- Import styles from design token files
- Use the spacing scale: ${Object.values(tokens.spacing.scale).join(', ')}
- Match component patterns exactly
`;
}
