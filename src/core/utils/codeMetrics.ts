export interface CodeMetrics {
  totalLines: number;
  totalCharacters: number;
  fileCount: number;
  jsxElements: number;
  styleProperties: number;
  handlers: number;
  animations: number;
  collisions: number;
  complexity: 'simple' | 'moderate' | 'complex' | 'very-complex';
}

export function calculateMetrics(nodes: any[]): CodeMetrics {
  let totalLines = 0;
  let totalCharacters = 0;
  let jsxElements = 0;
  let styleProperties = 0;
  let handlers = 0;
  let animations = 0;

  nodes.forEach(node => {
    if (node.reactCode) {
      totalLines += node.reactCode.split('\n').length;
      totalCharacters += node.reactCode.length;
      
      // Heuristic counting
      jsxElements += (node.reactCode.match(/<[a-zA-Z]/g) || []).length;
      handlers += (node.reactCode.match(/handle[A-Z]/g) || []).length;
      if (node.hasAnimations) animations++;
    }
    
    // Recurse into styles if possible or use count from properties
    if (node.css) {
      styleProperties += (node.css.match(/:/g) || []).length;
    }
  });

  let complexity: CodeMetrics['complexity'] = 'simple';
  if (totalLines > 500 || jsxElements > 20) complexity = 'moderate';
  if (totalLines > 1000 || jsxElements > 50) complexity = 'complex';
  if (totalLines > 2000) complexity = 'very-complex';

  return {
    totalLines,
    totalCharacters,
    fileCount: nodes.length,
    jsxElements,
    styleProperties,
    handlers,
    animations,
    collisions: 0, // Set externally
    complexity
  };
}
