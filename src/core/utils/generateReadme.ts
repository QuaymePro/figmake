export interface ReadmeConfig {
  projectName: string;
  figmaFileName: string;
  figmaPageName: string;
  components: any[];
  hasAnimations: boolean;
  hasTypescript: boolean;
  handlerCount: number;
  imageCount: number;
  generatedAt: string;
  pluginVersion: string;
}

export function generateReadme(config: ReadmeConfig): string {
  const componentTable = config.components.map(c => 
    `| ${c.name} | ${c.type} | ${c.hasAnimations ? 'Yes' : 'No'} | ${c.handlers || 0} |`
  ).join('\n');

  return `# ${config.projectName}
Generated from Figma on ${config.generatedAt.split('T')[0]}

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
\`\`\`bash
npm install
\`\`\`

### Dependencies
This project requires:
- react: ^18.2.0
- react-dom: ^18.2.0
${config.hasAnimations ? '- framer-motion: ^11.0.0' : ''}

## Project Structure
components/
${config.components.map(c => `├── ${c.name}.tsx`).join('\n')}

## Components Overview
| Component | Type | Animations | Handlers |
|-----------|------|------------|----------|
${componentTable}

## Usage
\`\`\`tsx
import { ${config.components[0]?.name || 'Component'} } from './components';

function App() {
  return (
    <div>
      <${config.components[0]?.name || 'Component'} />
    </div>
  );
}
\`\`\`

## Generated From
- Figma File: ${config.figmaFileName}
- Page: ${config.figmaPageName}
- Conversion Date: ${config.generatedAt}
- Plugin Version: ${config.pluginVersion}

---
Made with ❤️ by Figmake
`;
}
