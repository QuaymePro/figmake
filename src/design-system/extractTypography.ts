export interface TextStyle {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface ExtractedTypography {
  fontFamilies: {
    primary: string;
    secondary: string;
    mono: string;
  };
  scale: {
    xs: TextStyle;
    sm: TextStyle;
    base: TextStyle;
    lg: TextStyle;
    xl: TextStyle;
    '2xl': TextStyle;
    '3xl': TextStyle;
    '4xl': TextStyle;
  };
  weights: {
    light: number;
    regular: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeights: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

export function extractTypography(nodes: any[]): ExtractedTypography {
  // Logic to analyze text nodes and build typography scale
  return {
    fontFamilies: {
      primary: 'Inter',
      secondary: 'system-ui',
      mono: 'JetBrains Mono',
    },
    scale: {
      xs: { fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: 1.5, letterSpacing: '0px' },
      sm: { fontFamily: 'Inter', fontSize: '14px', fontWeight: 400, lineHeight: 1.5, letterSpacing: '0px' },
      base: { fontFamily: 'Inter', fontSize: '16px', fontWeight: 400, lineHeight: 1.5, letterSpacing: '0px' },
      lg: { fontFamily: 'Inter', fontSize: '18px', fontWeight: 600, lineHeight: 1.4, letterSpacing: '0px' },
      xl: { fontFamily: 'Inter', fontSize: '20px', fontWeight: 600, lineHeight: 1.4, letterSpacing: '0px' },
      '2xl': { fontFamily: 'Inter', fontSize: '24px', fontWeight: 700, lineHeight: 1.2, letterSpacing: '0px' },
      '3xl': { fontFamily: 'Inter', fontSize: '30px', fontWeight: 700, lineHeight: 1.2, letterSpacing: '0px' },
      '4xl': { fontFamily: 'Inter', fontSize: '36px', fontWeight: 800, lineHeight: 1.1, letterSpacing: '0px' },
    },
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  };
}
