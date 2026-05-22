import { handleImage, ImageExportConfig } from "../utils/imageExporter";

export function figmaColorToCSS(color: any, opacity: number = 1): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function extractNodeStyles(node: any, config?: any): any {
  const styles: any = {};
  const imageConfig: ImageExportConfig = {
    mode: config?.imageMode || 'placeholder',
    maxBase64Size: 51200,
    placeholderStyle: 'blurred'
  };

  if (node.opacity !== undefined && node.opacity !== 1) styles.opacity = node.opacity;
  
  if (node.blendMode && node.blendMode !== "PASS_THROUGH") {
    const blendModeMap: Record<string, string> = { MULTIPLY: "multiply", SCREEN: "screen", OVERLAY: "overlay" };
    styles.mixBlendMode = blendModeMap[node.blendMode] || "normal";
  }

  if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
    const fill = node.fills.find((f: any) => f.visible !== false);
    if (fill) {
      if (fill.type === "SOLID") styles.backgroundColor = figmaColorToCSS(fill.color, fill.opacity);
      else if (fill.type === "IMAGE") {
        const { style: imageStyle, comment } = handleImage(fill, imageConfig);
        Object.assign(styles, imageStyle);
        if (comment) (styles as any).__comment = comment;
      }
    }
  }

  if (node.cornerRadius !== undefined && node.cornerRadius !== "mixed") styles.borderRadius = `${node.cornerRadius}px`;

  return styles;
}
