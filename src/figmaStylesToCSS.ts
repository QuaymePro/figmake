import React from "react";
import { handleImage, ImageExportConfig } from "./imageExporter";

/**
 * Converts Figma color (0-1) and alpha to CSS rgba string.
 */
export function figmaColorToCSS(color: any, opacity: number = 1): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Extracts style properties from a Figma node and returns a React.CSSProperties object.
 */
export function extractNodeStyles(node: any, config?: any): React.CSSProperties {
  const styles: any = {};
  const imageConfig: ImageExportConfig = {
    mode: config?.imageMode || 'placeholder',
    maxBase64Size: 51200,
    placeholderStyle: 'blurred'
  };

  // 1. Opacity
  if (node.opacity !== undefined && node.opacity !== 1) {
    styles.opacity = node.opacity;
  }

  // 2. Blend Mode
  const blendModeMap: Record<string, string> = {
    PASS_THROUGH: "normal",
    NORMAL: "normal",
    MULTIPLY: "multiply",
    SCREEN: "screen",
    OVERLAY: "overlay",
    DARKEN: "darken",
    LIGHTEN: "lighten",
    COLOR_DODGE: "color-dodge",
    COLOR_BURN: "color-burn",
    HARD_LIGHT: "hard-light",
    SOFT_LIGHT: "soft-light",
    DIFFERENCE: "difference",
    EXCLUSION: "exclusion",
    HUE: "hue",
    SATURATION: "saturation",
    COLOR: "color",
    LUMINOSITY: "luminosity",
  };
  if (node.blendMode && node.blendMode !== "PASS_THROUGH") {
    styles.mixBlendMode = blendModeMap[node.blendMode] || "normal";
  }

  // 3. Fills
  if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
    const visibleFills = node.fills.filter((f: any) => f.visible !== false);
    if (visibleFills.length > 0) {
      const fill = visibleFills[0];
      if (fill.type === "SOLID") {
        styles.backgroundColor = figmaColorToCSS(fill.color, fill.opacity);
      } else if (fill.type === "IMAGE") {
        const { style: imageStyle, comment } = handleImage(fill, imageConfig);
        Object.assign(styles, imageStyle);
        if (comment) {
           (styles as any).__comment = comment;
        }
      } else if (fill.type === "GRADIENT_LINEAR") {
        styles.background = generateLinearGradient(fill);
      } else if (fill.type === "GRADIENT_RADIAL") {
        styles.background = generateRadialGradient(fill);
      } else if (fill.type === "GRADIENT_ANGULAR") {
        styles.background = generateConicGradient(fill);
      }
    }
  }

  // 4. Strokes
  if (node.strokes && Array.isArray(node.strokes) && node.strokes.length > 0) {
    const visibleStrokes = node.strokes.filter((s: any) => s.visible !== false);
    const weight = node.strokeWeight || 0;
    const align = node.strokeAlign || "INSIDE";

    if (visibleStrokes.length > 0 && weight > 0) {
      const stroke = visibleStrokes[0];
      const color = figmaColorToCSS(stroke.color, stroke.opacity);
      
      if (align === "CENTER") {
        styles.border = `${weight}px solid ${color}`;
      } else if (align === "INSIDE") {
        styles.boxShadow = `inset 0 0 0 ${weight}px ${color}`;
      } else if (align === "OUTSIDE") {
        styles.boxShadow = `0 0 0 ${weight}px ${color}`;
      }
    }
  }

  // 5. Effects (Shadows/Blurs)
  if (node.effects && Array.isArray(node.effects)) {
    const shadows: string[] = [];
    if (styles.boxShadow) shadows.push(styles.boxShadow);

    node.effects.filter((e: any) => e.visible !== false).forEach((effect: any) => {
      if (effect.type === "DROP_SHADOW") {
        shadows.push(`${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${effect.spread || 0}px ${figmaColorToCSS(effect.color, effect.color.a)}`);
      } else if (effect.type === "INNER_SHADOW") {
        shadows.push(`inset ${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${effect.spread || 0}px ${figmaColorToCSS(effect.color, effect.color.a)}`);
      } else if (effect.type === "LAYER_BLUR") {
        styles.filter = `blur(${effect.radius}px)`;
      } else if (effect.type === "BACKGROUND_BLUR") {
        styles.backdropFilter = `blur(${effect.radius}px)`;
      }
    });

    if (shadows.length > 0) {
      styles.boxShadow = shadows.join(", ");
    }
  }

  // 6. Corner Radius
  if (node.cornerRadius !== undefined && node.cornerRadius !== "mixed") {
    styles.borderRadius = `${node.cornerRadius}px`;
  } else if (node.topLeftRadius !== undefined) {
    styles.borderRadius = `${node.topLeftRadius}px ${node.topRightRadius}px ${node.bottomRightRadius}px ${node.bottomLeftRadius}px`;
  }

  return styles;
}

function generateLinearGradient(fill: any): string {
  const stops = fill.gradientStops.map((stop: any) => {
    return `${figmaColorToCSS(stop.color, stop.color.a)} ${Math.round(stop.position * 100)}%`;
  }).join(", ");
  return `linear-gradient(180deg, ${stops})`;
}

function generateRadialGradient(fill: any): string {
  const stops = fill.gradientStops.map((stop: any) => {
    return `${figmaColorToCSS(stop.color, stop.color.a)} ${Math.round(stop.position * 100)}%`;
  }).join(", ");
  return `radial-gradient(circle, ${stops})`;
}

function generateConicGradient(fill: any): string {
  const stops = fill.gradientStops.map((stop: any) => {
    return `${figmaColorToCSS(stop.color, stop.color.a)} ${Math.round(stop.position * 100)}%`;
  }).join(", ");
  return `conic-gradient(from 0deg, ${stops})`;
}
