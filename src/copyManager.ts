export interface CopyOptions {
  scope: 'component' | 'fullFile' | 'allComponents';
  includeImports: boolean;
  includeDependencies: boolean;
  includeTypes: boolean;
}

export function smartCopy(nodes: any[], options: CopyOptions): string {
  let output = "";

  if (options.includeDependencies) {
    output += "// Dependencies:\n";
    output += "//   npm install framer-motion@11.0.0 react@18.2.0 react-dom@18.2.0\n";
  }

  const generatedAt = new Date().toISOString();
  
  nodes.forEach(node => {
    output += `// Generated from Figma: ${node.name} (node: ${node.id})\n`;
    output += `// Generated at: ${generatedAt}\n\n`;

    if (options.scope === 'fullFile') {
      output += node.reactCode;
    } else if (options.scope === 'component') {
      // Extract just the component body (rough approximation)
      const match = node.reactCode.match(/export const[\s\S]*\};/);
      output += match ? match[0] : node.reactCode;
    }
    output += "\n\n";
  });

  return output.trim();
}
