export interface ExtractedShadows {
  elevations: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  blurScale: {
    sm: string;
    md: string;
    lg: string;
  };
}

export function extractShadows(nodes: any[]): ExtractedShadows {
  return {
    elevations: {
      none: 'none',
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    },
    blurScale: {
      sm: '4px',
      md: '8px',
      lg: '16px',
    }
  };
}
