import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import useStdoutDimensions from 'ink-use-stdout-dimensions';
import gradient from 'gradient-string';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { runConvert, getAllCommands } from './commands';
import { CommandInput } from './command-input';
import { CommandMenu, buildPopupItems } from './command-menu';

const HISTORY_FILE = path.join(os.homedir(), '.figmake_history');
const MAX_HISTORY = 200;

const ASCII_ART = `
████████╗██╗ ██████╗ ███╗   ███╗ █████╗ ██╗  ██╗███████╗
╚══██╔══╝██║██╔════╝ ████╗ ████║██╔══██╗██║  ██╔╝██╔════╝
   ██║   ██║██║  ███╗██╔████╔██║███████║█████╔╝ █████╗  
   ██║   ██║██║   ██║██║╚██╔╝██║██╔══██║██╔═██╗ ██╔══╝  
   ██║   ██║╚██████╔╝██║ ╚═╝ ██║██║  ██║██║  ██╗███████╗
   ╚═╝   ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
`;

const gradientTheme = gradient(['#FF6B35', '#8B5CF6']);
const BANNER_TEXT = gradientTheme(ASCII_ART);

function loadHistory(): string[] {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return fs.readFileSync(HISTORY_FILE, 'utf-8').split('\n').filter(Boolean).slice(-MAX_HISTORY);
    }
  } catch {}
  return [];
}

function saveHistory(history: string[]): void {
  try {
    fs.writeFileSync(HISTORY_FILE, history.slice(-MAX_HISTORY).join('\n'));
  } catch {}
}

export async function runInkApp(): Promise<void> {
  const { render } = await import('ink');
  const { waitUntilExit } = render(<App />);
  await waitUntilExit();
}

export default function App() {
  const { exit } = useApp();
  const [cols, rows] = useStdoutDimensions();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [history, setHistory] = useState<string[]>(loadHistory);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedInput, setSavedInput] = useState('');

  const commands = getAllCommands();

  const addOutput = useCallback((...lines: string[]) => {
    setOutput(prev => [...prev, ...lines]);
  }, []);

  const handleSubmit = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setHistory(prev => {
      const updated = [...prev, trimmed];
      saveHistory(updated);
      return updated;
    });
    setHistoryIndex(-1);
    setShowMenu(false);

    addOutput(`> ${trimmed}`);

    if (trimmed.startsWith('/convert ') || trimmed === '/convert' || trimmed.startsWith('/c ') || trimmed === '/c') {
      try {
        const parts = trimmed.split(/\s+/);
        const url = parts[1];
        const tokenIdx = parts.indexOf('--token');
        const token = tokenIdx !== -1 ? parts[tokenIdx + 1] : null;
        const outputIdx = parts.indexOf('--output');
        const outputDir = outputIdx !== -1 ? parts[outputIdx + 1] : './figmake-output';

        if (!url) {
          addOutput('\u2717 Error: No Figma URL provided', '   Usage: /convert <figma-url> --token <token> [--output <dir>]');
        } else if (!token) {
          addOutput('\u26A0 No token provided. Get one at https://www.figma.com/settings');
        } else {
          await runConvert(url, token, outputDir);
        }
      } catch (error: any) {
        addOutput(`\u2717 Conversion failed: ${error.message}`);
      }
    } else if (trimmed === '/help' || trimmed === '/h' || trimmed === '/?') {
      addOutput('', '  Available commands:', '  /convert <url> --token <tok>   Convert Figma file to React', '  /demo                          Generate demo components', '  /plugin                        Show Figma plugin path', '  /config                        Interactive configuration', '  /clear                         Clear the terminal', '  /version                       Show version info', '  /help                          Show this help', '  /exit                          Exit CLI', '');
    } else if (trimmed === '/version' || trimmed === '/v') {
      try {
        const pkg = await fs.readJson(path.resolve(__dirname, '../../package.json'));
        addOutput(`figmake-pro v${pkg.version}`);
      } catch {
        addOutput('figmake-pro (version unknown)');
      }
    } else if (trimmed === '/demo' || trimmed === '/d') {
      addOutput('\u25C7 Generating demo components...');
      try {
        const { MOCK_FIGMA_FILE } = await import('./demoData');
        const { buildNodeMap } = await import('./figma-helpers');
        const { generateReactComponent } = await import('../core/generators/reactGenerator');
        const { DEFAULT_CONFIG } = await import('../core/config');
        const fileData = MOCK_FIGMA_FILE;
        const nodeMap = buildNodeMap(fileData.document);
        const getNodeById = (id: string) => nodeMap.get(id);
        const firstPage = fileData.document.children[0];
        const frames = firstPage.children.filter((c: any) => c.type === 'FRAME' || c.type === 'COMPONENT');
        await fs.ensureDir('./figmake-demo');
        for (const frame of frames) {
          const { files } = generateReactComponent(frame, { getNodeById, config: DEFAULT_CONFIG });
          for (const [filename, content] of Object.entries(files)) {
            await fs.writeFile(path.join('./figmake-demo', filename), content);
          }
        }
        addOutput(`\u2713 Demo generated in ./figmake-demo (${frames.length} components)`);
      } catch (e: any) {
        addOutput(`\u2717 Demo failed: ${e.message}`);
      }
    } else if (trimmed === '/clear' || trimmed === '/cls') {
      setOutput([]);
    } else if (trimmed === '/exit' || trimmed === '/quit' || trimmed === '/q') {
      addOutput('Goodbye!');
      setTimeout(() => exit(), 100);
    } else if (trimmed === '/plugin' || trimmed === '/p') {
      addOutput('Figma plugin located at:', `  ${path.resolve(__dirname, '../../dist/plugin/')}`, 'To install: Figma \u2192 Plugins \u2192 Development \u2192 Import plugin from manifest', `Select: ${path.resolve(__dirname, '../../dist/plugin/manifest.json')}`);
    } else if (trimmed === '/config' || trimmed === '/cfg') {
      addOutput('\u25C7 Starting configuration wizard...');
      try {
        const { runConfigWizard } = await import('./config-wizard');
        await runConfigWizard();
        addOutput('\u2713 Configuration saved');
      } catch (e: any) {
        addOutput(`\u2717 Configuration failed: ${e.message}`);
      }
    } else if (trimmed.startsWith('/')) {
      addOutput(`\u2717 Unknown command: ${trimmed.split(/\s+/)[0]}`, 'Type /help for available commands.');
    }

    setInput('');
  }, [addOutput, exit]);

  const handleInputChange = useCallback((newValue: string) => {
    setInput(newValue);
    if (newValue.startsWith('/')) {
      setShowMenu(true);
    } else {
      setShowMenu(false);
    }
  }, []);

  const handleSlash = useCallback(() => {
    setShowMenu(true);
  }, []);

  useInput((_input, key) => {
    if (key.upArrow) {
      if (history.length > 0) {
        if (historyIndex === -1) {
          setSavedInput(input);
        }
        const newIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      }
      return;
    }
    if (key.downArrow) {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput(savedInput);
      }
      return;
    }
    if (key.escape) {
      setShowMenu(false);
      return;
    }
    if (showMenu && key.tab) {
      const items = buildPopupItems(commands, input);
      if (items.length > 0) {
        setInput(items[0].label + ' ');
        setShowMenu(false);
      }
      return;
    }
    if (!showMenu && key.tab && input.length > 0) {
      const items = buildPopupItems(commands, input);
      if (items.length === 1) {
        setInput(items[0].label + ' ');
      }
      return;
    }
  });

  const menuItems = showMenu ? buildPopupItems(commands, input) : [];
  const menuSelected = 0;

  const maxOutputLines = rows - 15;
  const visibleOutput = output.slice(-maxOutputLines);

  return (
    <Box flexDirection="column" height={rows}>
      <Box flexDirection="column">
        <Text>{BANNER_TEXT}</Text>
        <Text dimColor>  Figma \u2192 Pixel-Perfect React</Text>
        <Text> </Text>
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        {visibleOutput.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>

      {menuItems.length > 0 && (
        <CommandMenu
          items={menuItems}
          selectedIndex={menuSelected}
          visible={showMenu}
        />
      )}

      <Box flexDirection="column" marginTop={1}>
        <Text color="#8B5CF6">{'\u25C7'} <Text bold>What would you like to do?</Text> <Text dimColor>(type /help for commands)</Text></Text>
        <Text color="#8B5CF6">{'\u2502'}</Text>
        <CommandInput
          value={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          onSlash={handleSlash}
        />
      </Box>
    </Box>
  );
}
