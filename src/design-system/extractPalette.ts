export interface ColorScale {
  '50': string;
  '100': string;
  '200': string;
  '300': string;
  '400': string;
  '500': string;
  '600': string;
  '700': string;
  '800': string;
  '900': string;
}

export interface ExtractedPalette {
  primary: ColorScale;
  secondary: ColorScale;
  tertiary: ColorScale;
  accent: ColorScale;
  neutrals: ColorScale;
  semantic: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  text: {
    primary: string;
    secondary: string;
    disabled: string;
    inverse: string;
  };
}

export function extractPalette(nodes: any[]): ExtractedPalette {
  // Logic to collect colors, group by hue, and build scales
  // This is a simplified implementation as requested
  const colors: string[] = [];
  
  const traverse = (node: any) => {
    if (node.fills) {
      node.fills.forEach((fill: any) => {
        if (fill.type === 'SOLID') {
          const { r, g, b } = fill.color;
          const hex = `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`;
          colors.push(hex);
        }
      });
    }
    if (node.children) node.children.forEach(traverse);
  };

  nodes.forEach(traverse);

  // Frequency analysis and grouping would happen here
  // Returning a mock/placeholder structure that follows the interface
  return {
    primary: createScale(colors[0] || '#6366f1'),
    secondary: createScale(colors[1] || '#ec4899'),
    tertiary: createScale(colors[2] || '#14b8a6'),
    accent: createScale(colors[3] || '#f59e0b'),
    neutrals: createScale('#6b7280'),
    semantic: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    background: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tertiary: '#f3f4f6',
    },
    text: {
      primary: '#111827',
      secondary: '#4b5563',
      disabled: '#9ca3af',
      inverse: '#ffffff',
    },
  };
}

function createScale(baseColor: string): ColorScale {
  return {
    '50': baseColor, '100': baseColor, '200': baseColor, '300': baseColor, '400': baseColor,
    '500': baseColor, '600': baseColor, '700': baseColor, '800': baseColor, '900': baseColor,
  };
}
