import { ExtractedDesignTokens } from '../design-system/extractDesignTokens';

export function generateLockfile(projectName: string, fileId: string, tokens: ExtractedDesignTokens): string {
  const lockfile = {
    version: "2.0.0",
    figmaFile: projectName,
    figmaFileId: fileId,
    extractedAt: new Date().toISOString(),
    designTokens: tokens,
    componentLibrary: {}, // Would be populated by analyzing component sets
    constraints: {
      maxWidth: "1200px",
      gridColumns: 12,
      gutterWidth: "24px"
    }
  };

  return JSON.stringify(lockfile, null, 2);
}
