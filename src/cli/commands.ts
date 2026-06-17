import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { success, error, warning, info, codeBlock, createSpinner, summaryBox, filePath, componentName, theme } from './output';
import { MOCK_FIGMA_FILE } from './demoData';
import { generateReactComponent } from '../core/generators/reactGenerator';
import { extractDesignTokens } from '../design-system/extractDesignTokens';
import { DEFAULT_CONFIG } from '../core/config';
import { runConfigWizard } from './config-wizard';
import { buildNodeMap, extractFileKey, fetchFigmaFile } from './figma-helpers';
import { generateCursorRules } from '../vibecode-guard/generateCursorRules';
import { generateClaudeRules } from '../vibecode-guard/generateClaudeRules';
import { generateCopilotInstructions } from '../vibecode-guard/generateCopilotInstructions';
import { generatePromptContext } from '../vibecode-guard/generatePromptContext';
import { generateLockfile } from '../vibecode-guard/generateLockfile';
import { showBanner } from './banner';

export interface CommandDef {
  name: string;
  aliases: string[];
  description: string;
  usage?: string;
  handler: (args: string[]) => Promise<void | 'exit'>;
}

const commands: CommandDef[] = [
  {
    name: '/convert',
    aliases: ['/c', '/run'],
    description: 'Convert a Figma file to React components',
    usage: '/convert <figma-url> <token> [output-dir]',
    handler: async (args) => {
      let url = '';
      let token = '';
      let outputDir = './figmake-output';

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--token' && i + 1 < args.length) {
          token = args[++i];
        } else if (args[i] === '--output' && i + 1 < args.length) {
          outputDir = args[++i];
        } else if (args[i] === '--framework' && i + 1 < args.length) {
          i++;
        } else if (args[i] === '--styling' && i + 1 < args.length) {
          i++;
        } else if (!url && !args[i].startsWith('--')) {
          url = args[i];
        } else if (url && !token && !args[i].startsWith('--')) {
          token = args[i];
        }
      }

      if (!url) {
        error('Missing Figma URL', 'Usage: /convert <figma-url> [--token <token>] [--output <dir>]');
        return;
      }

      if (!token) {
        warning('No Figma token provided. Run /config to set one, or pass --token <your-token>\n  Get a token at: https://www.figma.com/settings \u2192 Personal Access Tokens');
        return;
      }

      await runConvert(url, token, outputDir);
    },
  },
  {
    name: '/plugin',
    aliases: ['/p'],
    description: 'Open the Figma plugin directory',
    usage: '/plugin',
    handler: async () => {
      const pluginDir = path.resolve(__dirname, '../plugin');
      const manifestPath = path.join(pluginDir, 'manifest.json');

      info(`Plugin directory: ${filePath(pluginDir)}`);

      const manifestExists = await fs.pathExists(manifestPath);
      if (manifestExists) {
        success('Plugin manifest found');

        codeBlock(`To import in Figma:
1. Open Figma → Plugins → Development → Import plugin from manifest...
2. Navigate to: ${pluginDir}
3. Select manifest.json`);

        try {
          const { default: clipboard } = await import('clipboardy');
          await clipboard.write(manifestPath);
          success('Plugin path copied to clipboard!');
        } catch {
          warning('clipboardy not available. Copy the path manually.');
        }
      } else {
        warning('Plugin manifest not found. Build the plugin first with: npm run build:plugin');
      }
    },
  },
  {
    name: '/config',
    aliases: ['/cfg'],
    description: 'Interactive configuration setup',
    usage: '/config',
    handler: async () => {
      await runConfigWizard();
    },
  },
  {
    name: '/demo',
    aliases: ['/d'],
    description: 'Generate demo components without a Figma token',
    usage: '/demo [output-dir]',
    handler: async (args) => {
      const output = args[0] || './figmake-demo';
      const spinner = createSpinner('Generating demo components...');

      try {
        const fileData = MOCK_FIGMA_FILE;
        const nodeMap = buildNodeMap(fileData.document);
        const getNodeById = (id: string) => nodeMap.get(id);
        const firstPage = fileData.document.children[0];
        const frames = firstPage.children.filter((c: any) => c.type === 'FRAME' || c.type === 'COMPONENT');

        await fs.ensureDir(output);
        const componentList: string[] = [];
        let totalLines = 0;

        for (const frame of frames) {
          spinner.text = `Generating ${frame.name}...`;
          const { files } = generateReactComponent(frame, { getNodeById, config: DEFAULT_CONFIG });
          for (const [filename, content] of Object.entries(files)) {
            await fs.writeFile(path.join(output, filename), content);
            totalLines += content.split('\n').length;
            componentList.push(filename.replace('.tsx', ''));
          }
        }

        spinner.succeed(chalk.green('Demo generated successfully!'));

        summaryBox('🎨 Demo Preview', {
          'Output directory': filePath(path.resolve(output)),
          'Components': frames.length,
          'Files generated': componentList.length,
          'Total lines': totalLines,
        });

        info(`Generated components: ${componentList.map(n => componentName(n)).join(', ')}`);
        info(`Open ${filePath(path.resolve(output))} to see the generated code`);

      } catch (e: any) {
        spinner.fail(chalk.red('Demo generation failed'));
        error(e.message);
      }
    },
  },
  {
    name: '/help',
    aliases: ['/h', '/?'],
    description: 'Show all available commands',
    usage: '/help [command]',
    handler: async (args) => {
      const cmdName = args[0];
      if (cmdName) {
        const cmd = commands.find(c => c.name === cmdName || c.aliases.includes(cmdName));
        if (cmd) {
          info(`Command: ${theme.primary(cmd.name)}`);
          console.log(`  ${chalk.dim('Description:')} ${cmd.description}`);
          if (cmd.usage) console.log(`  ${chalk.dim('Usage:')} ${chalk.cyan(cmd.usage)}`);
          console.log(`  ${chalk.dim('Aliases:')} ${cmd.aliases.map(a => chalk.yellow(a)).join(', ')}`);
          return;
        }
        error(`Unknown command: ${cmdName}`, 'Type /help to see all commands');
        return;
      }

      console.log(`\n  ${chalk.bold('Available Commands')}\n`);
      for (const cmd of commands) {
        const aliases = cmd.aliases.length > 1
          ? ` ${chalk.dim('(' + cmd.aliases.slice(1).join(', ') + ')')}`
          : '';
        console.log(`  ${theme.primary(cmd.name.padEnd(10))} ${cmd.description}${aliases}`);
      }
      console.log();
      info(`Tip: Press ${chalk.cyan('Tab')} to autocomplete commands`);
      info(`Tip: Press ${chalk.cyan('↑/↓')} to navigate command history`);
    },
  },
  {
    name: '/clear',
    aliases: ['/cls'],
    description: 'Clear the terminal',
    usage: '/clear',
    handler: async () => {
      console.clear();
      showBanner();
    },
  },
  {
    name: '/exit',
    aliases: ['/quit', '/q'],
    description: 'Exit the CLI',
    usage: '/exit',
    handler: async () => {
      console.log(`\n ${chalk.hex('#FF6B35')('👋')} Thanks for using Figmake!`);
      return 'exit';
    },
  },
  {
    name: '/version',
    aliases: ['/v'],
    description: 'Show version info',
    usage: '/version',
    handler: async () => {
      const pkg = await fs.readJson(path.resolve(__dirname, '../../package.json'));
      success(`Figmake Pro ${chalk.bold(pkg.version)}`);
      console.log(`  ${chalk.dim('License:')} ${pkg.license}`);
      console.log(`  ${chalk.dim('Node:')} ${process.version}`);
      console.log(`  ${chalk.dim('Platform:')} ${process.platform}`);
    },
  },
];

export interface FlagValue {
  value: string;
  description: string;
}

export interface FlagCompletion {
  flag: string;
  description: string;
  values?: FlagValue[];
}

const commandArgs: Record<string, FlagCompletion[]> = {
  '/convert': [
    { flag: '--output', description: 'Output directory path' },
    { flag: '--token', description: 'Figma personal access token' },
    { flag: '--framework', description: 'Target framework', values: [
      { value: 'react', description: 'React (default)' },
      { value: 'nextjs', description: 'Next.js' },
      { value: 'remix', description: 'Remix' },
    ]},
    { flag: '--styling', description: 'Styling approach', values: [
      { value: 'inline', description: 'Inline styles' },
      { value: 'css-modules', description: 'CSS Modules' },
      { value: 'styled-components', description: 'Styled Components' },
    ]},
  ],
  '/demo': [
    { flag: '--output', description: 'Output directory path' },
  ],
};

export function getCommandArgs(cmdName: string): FlagCompletion[] {
  for (const [name, args] of Object.entries(commandArgs)) {
    if (name === cmdName) return args;
    const cmd = commands.find(c => c.name === cmdName);
    if (cmd && cmd.name === name) return args;
  }
  return [];
}

export async function runConvert(
  url: string,
  token: string,
  outputDir: string
): Promise<void> {
  const spinner = createSpinner('Connecting to Figma API...');

  try {
    const fileKey = extractFileKey(url);
    if (!fileKey) {
      spinner.fail('Invalid Figma URL');
      error('Expected format: https://www.figma.com/file/KEY/... or /design/KEY/... or /board/KEY/...');
      return;
    }

    spinner.text = 'Downloading Figma file...';
    const fileData = await fetchFigmaFile(fileKey, token);

    spinner.text = 'Extracting nodes and styles...';
    const nodeMap = buildNodeMap(fileData.document);
    const getNodeById = (id: string) => nodeMap.get(id);
    const firstPage = fileData.document.children[0];
    const frames = firstPage.children.filter(
      (c: any) => c.type === 'FRAME' || c.type === 'COMPONENT'
    );

    if (frames.length === 0) {
      spinner.fail('No frames or components found');
      warning('The Figma file must contain at least one Frame or Component');
      return;
    }

    await fs.ensureDir(outputDir);
    spinner.text = `Converting ${frames.length} component(s)...`;

    let totalLines = 0;
    const componentList: string[] = [];

    spinner.text = 'Generating React components...';
    for (const frame of frames) {
      const { files } = generateReactComponent(frame, {
        getNodeById,
        config: DEFAULT_CONFIG,
      });
      for (const [filename, content] of Object.entries(files)) {
        await fs.writeFile(path.join(outputDir, filename), content);
        totalLines += content.split('\n').length;
        componentList.push(filename.replace('.tsx', ''));
      }
    }

    spinner.succeed(chalk.green('Conversion complete!'));

    summaryBox('\u{1F4E6} Export Summary', {
      'Output directory': filePath(path.resolve(outputDir)),
      Components: frames.length,
      'Files generated': componentList.length,
      'Total lines': totalLines,
      'File key': fileKey,
    });

    info(`Components: ${componentList.map((n) => componentName(n)).join(', ')}`);
  } catch (e: any) {
    spinner.fail('Conversion failed');
    error(
      e.message,
      e.response?.status
        ? `HTTP ${e.response.status}: Check your token and URL`
        : undefined
    );
  }
}

export function findCommand(input: string): { cmd: CommandDef; args: string[] } | null {
  const parts = input.trim().split(/\s+/);
  const inputCmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  // Normalize: strip leading / if present, or add it back for matching
  const hasSlash = inputCmd.startsWith('/');
  const withoutSlash = hasSlash ? inputCmd.slice(1) : inputCmd;
  const withSlash = hasSlash ? inputCmd : '/' + inputCmd;

  for (const cmd of commands) {
    if (cmd.name === inputCmd || cmd.aliases.includes(inputCmd)) {
      return { cmd, args };
    }
    // Also check normalized forms
    if (cmd.name === withSlash || cmd.aliases.includes(withSlash)) {
      return { cmd, args };
    }
    if (cmd.name === withoutSlash || cmd.aliases.includes(withoutSlash)) {
      return { cmd, args };
    }
    // Check aliases without leading / for direct mode
    const aliasesWithoutSlash = cmd.aliases.map(a => a.startsWith('/') ? a.slice(1) : a);
    if (aliasesWithoutSlash.includes(inputCmd) || aliasesWithoutSlash.includes(withoutSlash)) {
      return { cmd, args };
    }
  }

  return null;
}

export function getCompletions(partial: string): string[] {
  const lower = partial.toLowerCase();
  // Normalize: if partial has / prefix, match with /; otherwise match without /
  const hasSlash = lower.startsWith('/');
  const names = commands.map(c => hasSlash ? c.name : c.name.slice(1));
  const aliases = commands.map(c => c.aliases.map(a => hasSlash ? a : a.startsWith('/') ? a.slice(1) : a)).flat();
  return [...names, ...aliases]
    .filter(c => c.startsWith(lower))
    .sort();
}

export function getAllCommands(): CommandDef[] {
  return commands;
}
