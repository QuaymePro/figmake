import { extractPalette, ExtractedPalette } from './extractPalette';
import { extractTypography, ExtractedTypography } from './extractTypography';
import { extractSpacing, ExtractedSpacing } from './extractSpacing';
import { extractShadows, ExtractedShadows } from './extractShadows';

export interface ExtractedDesignTokens {
  colors: ExtractedPalette;
  typography: ExtractedTypography;
  spacing: ExtractedSpacing;
  shadows: ExtractedShadows;
  borderRadius: {
    scale: string[];
  };
}

export function extractDesignTokens(nodes: any[]): ExtractedDesignTokens {
  return {
    colors: extractPalette(nodes),
    typography: extractTypography(nodes),
    spacing: extractSpacing(nodes),
    shadows: extractShadows(nodes),
    borderRadius: {
      scale: ['0px', '2px', '4px', '8px', '12px', '16px', '24px', '9999px'],
    }
  };
}
