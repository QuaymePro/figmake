export type ImageExportMode = 'placeholder' | 'base64' | 'url' | 'none';

export interface ImageExportConfig {
  mode: ImageExportMode;
  maxBase64Size: number;
  placeholderStyle: 'gradient' | 'solid' | 'blurred' | 'labeled';
}

export function handleImage(fill: any, config: ImageExportConfig): { style: any, comment: string } {
  const style: any = {};
  let comment = "";

  if (config.mode === 'none') {
    style.backgroundColor = '#f0f0f0';
    comment = "TODO: Replace with actual image asset";
    return { style, comment };
  }

  if (fill.imageHash) {
    if (config.mode === 'placeholder') {
      style.backgroundImage = `url(data:image/png;base64,iVBOR...)`; // Placeholder
      style.backgroundSize = 'cover';
      style.filter = 'blur(20px)';
      comment = `TODO: Replace with real asset. Hash: ${fill.imageHash}`;
    } else if (config.mode === 'base64') {
      // In plugin mode, we'd fetch the actual bytes. 
      // For now, we'll return a placeholder that the code.ts will replace if it has bytes.
      style.backgroundImage = `url(IMAGE_HASH_${fill.imageHash})`;
      style.backgroundSize = 'cover';
    }
  }

  return { style, comment };
}
