import { input, select, confirm } from '@inquirer/prompts';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { PluginConfig, DEFAULT_CONFIG } from '../core/config';
import { success, info, theme } from './output';

const CONFIG_PATH = path.join(os.homedir(), '.figmakerc');

function renderQuestion(label: string): string {
  return `${theme.primary('◇')} ${chalk.bold(label)}`;
}

export async function runConfigWizard(): Promise<PluginConfig> {
  console.log(`\n ${theme.primary('◇')} ${chalk.bold('Figmake Configuration')}`);
  console.log(` ${theme.secondary('│')}`);
  console.log();

  const styling = await select({
    message: renderQuestion('Styling preference:'),
    default: DEFAULT_CONFIG.styling as any,
    choices: [
      { name: 'Inline Styles', value: 'inline' },
      { name: 'CSS Modules', value: 'modules' },
      { name: 'Styled Components', value: 'styled' },
    ],
    theme: {
      prefix: ' ',
    },
  });

  const animations = await select({
    message: renderQuestion('Animation library:'),
    default: DEFAULT_CONFIG.animations as any,
    choices: [
      { name: 'None (CSS)', value: 'css' },
      { name: 'Framer Motion', value: 'framer-motion' },
      { name: 'GSAP', value: 'gsap' },
    ],
    theme: {
      prefix: ' ',
    },
  });

  const typescript = await select({
    message: renderQuestion('TypeScript:'),
    default: DEFAULT_CONFIG.typescript as any,
    choices: [
      { name: 'Yes (interfaces)', value: 'interfaces' },
      { name: 'Yes (types)', value: 'types' },
      { name: 'No', value: 'none' },
    ],
    theme: {
      prefix: ' ',
    },
  });

  const exportFormat = await select({
    message: renderQuestion('Export format:'),
    default: DEFAULT_CONFIG.exportFormat as any,
    choices: [
      { name: 'Single file', value: 'single' },
      { name: 'One file per component', value: 'multiple' },
      { name: 'Barrel exports', value: 'barrel' },
    ],
    theme: {
      prefix: ' ',
    },
  });

  const routing = await select({
    message: renderQuestion('Routing library:'),
    default: DEFAULT_CONFIG.routing as any,
    choices: [
      { name: 'useState (simple)', value: 'useState' },
      { name: 'React Router', value: 'react-router' },
      { name: 'Next.js App Router', value: 'nextjs' },
    ],
    theme: {
      prefix: ' ',
    },
  });

  const naming = await select({
    message: renderQuestion('Component naming convention:'),
    default: DEFAULT_CONFIG.naming as any,
    choices: [
      { name: 'PascalCase', value: 'PascalCase' },
      { name: 'camelCase', value: 'camelCase' },
      { name: 'kebab-case', value: 'kebab-case' },
    ],
    theme: {
      prefix: ' ',
    },
  });

  const saveConfig = await confirm({
    message: `${theme.primary('◇')} ${chalk.bold('Save configuration?')}`,
    default: true,
    theme: { prefix: ' ' },
  });

  const config: PluginConfig = {
    styling,
    routing,
    typescript,
    animations,
    pattern: DEFAULT_CONFIG.pattern,
    naming,
    exportFormat,
    imageMode: DEFAULT_CONFIG.imageMode,
  };

  if (saveConfig) {
    await fs.writeJson(CONFIG_PATH, config, { spaces: 2 });
    success(`Configuration saved to ${chalk.underline(CONFIG_PATH)}`);
  } else {
    info('Configuration will be used for this session only');
  }

  return config;
}

export async function loadConfig(): Promise<PluginConfig> {
  try {
    if (await fs.pathExists(CONFIG_PATH)) {
      return await fs.readJson(CONFIG_PATH);
    }
  } catch {}
  return DEFAULT_CONFIG;
}
