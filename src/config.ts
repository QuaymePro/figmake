export interface PluginConfig {
  styling: 'inline' | 'modules' | 'styled';
  routing: 'useState' | 'react-router' | 'nextjs';
  typescript: 'interfaces' | 'types' | 'none';
  animations: 'framer-motion' | 'gsap' | 'css';
  pattern: 'functional' | 'arrow';
  naming: 'PascalCase' | 'kebab-case' | 'camelCase';
  exportFormat: 'single' | 'multiple' | 'barrel';
  imageMode: 'placeholder' | 'base64' | 'url' | 'none';
}

export const DEFAULT_CONFIG: PluginConfig = {
  styling: 'inline',
  routing: 'useState',
  typescript: 'interfaces',
  animations: 'framer-motion',
  pattern: 'arrow',
  naming: 'PascalCase',
  exportFormat: 'multiple',
  imageMode: 'placeholder',
};
