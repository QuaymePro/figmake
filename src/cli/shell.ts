#!/usr/bin/env node
import readline, { createInterface } from 'readline';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { findCommand, runConvert, getAllCommands, getCommandArgs } from './commands';
import { showBanner } from './banner';

const HISTORY_FILE = path.join(os.homedir(), '.figmake_history');
const MAX_HISTORY = 200;
const CONFIG_FILE = path.join(os.homedir(), '.figmake_config');

// State
let commandHistory: string[] = [];
let historyIndex = -1;
let savedInput = '';
let input = '';
let cursorPosition = 0;
let showMenu = false;
let menuIndex = 0;
let hasToken = false;
let reverseSearchActive = false;
let reverseSearchQuery = '';
let reverseSearchResults: string[] = [];
let reverseSearchIndex = 0;

// ANSI escape codes
const ESC = '\x1b';
const CLEAR_LINE = `${ESC}[K`;
const CLEAR_DOWN = `${ESC}[J`;
const CLEAR_UP = `${ESC}[1J`;
const MOVE_CURSOR = (row: number, col: number) => `${ESC}[${row};${col}H`;
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;
const UP_ONE = `${ESC}[A`;
const DOWN_ONE = `${ESC}[B`;
const RIGHT_ONE = `${ESC}[C`;
const LEFT_ONE = `${ESC}[D`;

function loadHistory(): void {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      commandHistory = fs.readFileSync(HISTORY_FILE, 'utf-8').split('\n').filter(Boolean).slice(-MAX_HISTORY);
    }
  } catch {}
}

function saveHistory(): void {
  try {
    fs.writeFileSync(HISTORY_FILE, commandHistory.slice(-MAX_HISTORY).join('\n'));
  } catch {}
}

function loadConfig(): void {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      hasToken = !!config.token;
    }
  } catch {}
}

function getStatusLine(): string {
  const historyCount = commandHistory.length;
  const tokenStatus = hasToken
    ? chalk.green('●') + chalk.dim(' token')
    : chalk.yellow('○') + chalk.dim(' no token');
  return chalk.dim(' ─ '.repeat(30)) + chalk.dim(` ${historyCount} cmds │ ${tokenStatus}`);
}

function printReverseSearch(): void {
  if (!reverseSearchActive) return;

  const prompt = chalk.hex('#8B5CF6')('◧') + ' ';
  const searchPrompt = chalk.dim('(reverse-search)') + ' ';

  // Find matching history entries
  reverseSearchResults = commandHistory.filter(h => h.toLowerCase().includes(reverseSearchQuery.toLowerCase()));
  reverseSearchIndex = Math.min(reverseSearchIndex, Math.max(0, reverseSearchResults.length - 1));

  const currentMatch = reverseSearchResults[reverseSearchResults.length - 1 - reverseSearchIndex];

  let display = prompt + searchPrompt + reverseSearchQuery;
  if (currentMatch) {
    display += '\n' + chalk.dim('→ ') + chalk.green(currentMatch);
  } else {
    display += '\n' + chalk.dim('(no matches)');
  }

  process.stdout.write('\r' + CLEAR_LINE + display + CLEAR_DOWN);
}

function printBanner(): void {
  showBanner();
  console.log(chalk.dim('  Type ') + chalk.cyan('/help') + chalk.dim(' for commands, ') + chalk.cyan('Tab') + chalk.dim(' to complete, ') + chalk.cyan('↑↓') + chalk.dim(' for history'));
  console.log(chalk.dim('  Press ') + chalk.cyan('/') + chalk.dim(' to browse commands, ') + chalk.cyan('Ctrl+R') + chalk.dim(' for history search\n'));
  console.log(getStatusLine());
}

function printPromptWithInput(): void {
  const prompt = chalk.hex('#8B5CF6')('◧') + ' ';
  const displayInput = input || chalk.dim('Type /help for commands...');
  process.stdout.write(prompt + displayInput + CLEAR_LINE);
}

function clearMenu(lines: number): void {
  for (let i = 0; i < lines; i++) {
    process.stdout.write(UP_ONE + CLEAR_LINE);
  }
}

function getMenuLines(): number {
  if (!showMenu || menuItems.length === 0) return 0;
  return Math.min(menuItems.length, 8) + 4; // header + footer + items
}

interface MenuItem {
  cmd: string;
  desc: string;
  shortcut?: string;
  match: boolean;
}

let menuItems: MenuItem[] = [];

function filterMenu(searchTerm: string): MenuItem[] {
  const cmds = getAllCommands();
  const term = searchTerm.toLowerCase().replace('/', '');

  return cmds
    .filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.aliases.some(a => a.toLowerCase().includes(term)) ||
      c.description.toLowerCase().includes(term)
    )
    .map(c => ({
      cmd: c.name,
      desc: c.description,
      shortcut: c.aliases.length > 1 ? c.aliases[1] : undefined,
      match: c.name.toLowerCase().startsWith(term)
    }));
}

function printMenu(): void {
  if (!showMenu || menuItems.length === 0) return;

  const width = 58;
  const maxVisible = 8;
  const visibleItems = menuItems.slice(0, maxVisible);

  // Adjust menuIndex to keep selection visible
  if (menuIndex >= maxVisible) {
    menuIndex = maxVisible - 1;
  }

  let menu = '';
  menu += '\n' + chalk.dim('┌') + '─'.repeat(width) + chalk.dim('┐') + '\n';
  menu += chalk.dim('│') + chalk.bold.cyan(' Commands ') + chalk.dim(' '.repeat(width - 11) + '│') + '\n';
  menu += chalk.dim('├') + '─'.repeat(width) + chalk.dim('┤') + '\n';

  visibleItems.forEach((item, idx) => {
    const isSelected = idx === menuIndex;
    const shortcut = item.shortcut ? chalk.dim(' ') + chalk.cyan(`[${item.shortcut}]`) : '';

    if (isSelected) {
      menu += chalk.dim('│') + chalk.hex('#8B5CF6').bold(' ▶ ') +
              chalk.hex('#8B5CF6').bold(item.cmd.padEnd(14)) +
              shortcut +
              chalk.dim(item.desc.slice(0, 32).padEnd(32)) +
              chalk.dim('│') + '\n';
    } else {
      menu += chalk.dim('│') + '   ' +
              chalk.cyan(item.cmd.padEnd(14)) +
              shortcut +
              chalk.dim(item.desc.slice(0, 32).padEnd(32)) +
              chalk.dim('│') + '\n';
    }
  });

  menu += chalk.dim('└') + '─'.repeat(width) + chalk.dim('┘');

  process.stdout.write(menu);
}

function highlightInput(text: string): string {
  // Syntax highlighting for input
  const parts = text.split(/(\s+)/);
  return parts.map((part, idx) => {
    if (part.startsWith('/')) {
      // Check if it's a known command
      const cmds = getAllCommands();
      const cmd = cmds.find(c => c.name === part || c.aliases.includes(part));
      if (cmd) return chalk.cyan(part);
    }
    if (part.startsWith('--')) return chalk.yellow(part);
    if (part.includes('figma.com')) return chalk.blue.underline(part);
    if (part.startsWith('./') || part.includes('/')) return chalk.green(part);
    return part;
  }).join('');
}

function redraw(): void {
  const menuLines = getMenuLines();
  if (menuLines > 0) {
    // Move cursor to after prompt, clear menu area, redraw
    process.stdout.write(`${ESC}[${menuLines + 1}A` + CLEAR_DOWN);
  }
  printPromptWithInput();
  if (showMenu) {
    printMenu();
  }
}

async function executeCommand(cmd: string): Promise<void> {
  const trimmed = cmd.trim();
  if (!trimmed) return;

  commandHistory.push(trimmed);
  saveHistory();
  historyIndex = -1;

  // Handle /convert and aliases
  if (trimmed.startsWith('/convert') || trimmed.startsWith('/c ') || trimmed === '/c' ||
      trimmed.startsWith('convert')) {
    const parts = trimmed.split(/\s+/);
    const url = parts.find(p => p.includes('figma.com'));
    const tokenIdx = parts.indexOf('--token');
    const token = tokenIdx !== -1 && tokenIdx + 1 < parts.length ? parts[tokenIdx + 1] : null;
    const outputIdx = parts.indexOf('--output');
    const outputDir = outputIdx !== -1 && outputIdx + 1 < parts.length ? parts[outputIdx + 1] : './figmake-output';

    if (!url) {
      console.log(chalk.red('✗') + ' Error: No Figma URL provided');
      console.log('   Usage: /convert <figma-url> --token <token> [--output <dir>]');
    } else if (!token) {
      console.log(chalk.yellow('⚠') + ' No token provided. Get one at: https://www.figma.com/settings → Personal Access Tokens');
    } else {
      await runConvert(url, token, outputDir);
    }
    return;
  }

  // Handle /help with command
  if (trimmed.startsWith('/help ') || trimmed === '/help') {
    const [, cmdName] = trimmed.split(/\s+/);
    if (cmdName) {
      const cmdDef = getAllCommands().find(c =>
        c.name === cmdName || c.name === '/' + cmdName || c.aliases.includes(cmdName) || c.aliases.includes('/' + cmdName)
      );
      if (cmdDef) {
        console.log(chalk.bold.cyan(`\n ${cmdDef.name}`));
        console.log(chalk.dim('   ' + cmdDef.description));
        if (cmdDef.usage) {
          console.log(chalk.dim('   Usage: ') + chalk.yellow(cmdDef.usage));
        }
        if (cmdDef.aliases.length > 1) {
          console.log(chalk.dim('   Aliases: ') + chalk.cyan(cmdDef.aliases.slice(1).join(', ')));
        }
        console.log();
        return;
      }
    }
  }

  // Execute command
  const result = findCommand(trimmed);
  if (result) {
    try {
      const exitVal = await result.cmd.handler(result.args);
      if (exitVal === 'exit') {
        process.exit(0);
      }
    } catch (e: any) {
      console.log(chalk.red('✗') + ' ' + (e.message || 'Command failed'));
    }
    return;
  }

  // Unknown command
  console.log(chalk.red('✗') + ` Unknown command: ${trimmed.split(/\s+/)[0]}`);
  console.log('Type ' + chalk.cyan('/help') + ' for available commands.');
}

export async function runShell(): Promise<void> {
  loadHistory();
  loadConfig();

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  // Hide cursor
  process.stdout.write(HIDE_CURSOR);

  printBanner();
  printPromptWithInput();

  // Handle input
  rl.on('line', async (line) => {
    if (showMenu && menuItems.length > 0 && menuItems[menuIndex]) {
      // Execute selected command from menu
      await executeCommand(menuItems[menuIndex].cmd);
    } else if (input.trim()) {
      await executeCommand(input);
    }

    // Reset state
    input = '';
    cursorPosition = 0;
    showMenu = false;
    menuIndex = 0;
    menuItems = [];

    printPromptWithInput();
  });

  rl.on('close', () => {
    process.stdout.write(SHOW_CURSOR);
    console.log(chalk.hex('#FF6B35')('\n👋') + ' Thanks for using Figmake!');
    process.exit(0);
  });

  rl.on('SIGINT', () => {
    process.stdout.write(SHOW_CURSOR);
    console.log(chalk.hex('#FF6B35')('\n👋') + ' Exiting...');
    rl.close();
    process.exit(0);
  });

  // Raw keypress handling
  process.stdin.on('keypress', (str, key) => {
    // Handle reverse search mode
    if (reverseSearchActive) {
      if (key?.name === 'enter') {
        // Accept current match
        reverseSearchActive = false;
        if (reverseSearchResults.length > 0) {
          input = reverseSearchResults[reverseSearchResults.length - 1 - reverseSearchIndex];
        } else {
          input = reverseSearchQuery;
        }
        cursorPosition = input.length;
        printPromptWithInput();
        return;
      }
      if (key?.name === 'up') {
        reverseSearchIndex = Math.min(reverseSearchIndex + 1, reverseSearchResults.length - 1);
        printReverseSearch();
        return;
      }
      if (key?.name === 'down') {
        reverseSearchIndex = Math.max(0, reverseSearchIndex - 1);
        printReverseSearch();
        return;
      }
      if (key?.name === 'escape') {
        reverseSearchActive = false;
        input = savedInput;
        cursorPosition = input.length;
        printPromptWithInput();
        return;
      }
      if (str && !key?.ctrl) {
        reverseSearchQuery += str;
        reverseSearchIndex = 0;
        printReverseSearch();
        return;
      }
      return;
    }

    // Character typed
    if (str && !key?.ctrl && !key?.meta) {
      input = input.slice(0, cursorPosition) + str + input.slice(cursorPosition);
      cursorPosition += str.length;
    }

    // Handle special keys
    if (key) {
      if (key.name === 'backspace') {
        if (cursorPosition > 0) {
          input = input.slice(0, cursorPosition - 1) + input.slice(cursorPosition);
          cursorPosition--;
        }
      } else if (key.name === 'delete') {
        if (cursorPosition < input.length) {
          input = input.slice(0, cursorPosition) + input.slice(cursorPosition + 1);
        }
      } else if (key.name === 'left') {
        cursorPosition = Math.max(0, cursorPosition - 1);
      } else if (key.name === 'right') {
        cursorPosition = Math.min(input.length, cursorPosition + 1);
      } else if (key.name === 'home') {
        cursorPosition = 0;
      } else if (key.name === 'end') {
        cursorPosition = input.length;
      } else if (key.name === 'tab') {
        if (showMenu && menuItems.length > 0) {
          input = menuItems[menuIndex].cmd;
          cursorPosition = input.length;
          showMenu = false;
          menuItems = [];
        } else if (input.startsWith('/')) {
          const matches = filterMenu(input);
          if (matches.length === 1) {
            input = matches[0].cmd;
            cursorPosition = input.length;
          } else if (matches.length > 1) {
            showMenu = true;
            menuItems = matches;
            menuIndex = 0;
          }
        }
      } else if (key.name === 'up') {
        if (showMenu) {
          menuIndex = Math.max(0, menuIndex - 1);
        } else {
          if (commandHistory.length > 0) {
            if (historyIndex === -1) savedInput = input;
            historyIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
            input = commandHistory[commandHistory.length - 1 - historyIndex];
            cursorPosition = input.length;
          }
        }
      } else if (key.name === 'down') {
        if (showMenu) {
          menuIndex = Math.min(menuItems.length - 1, menuIndex + 1);
        } else {
          if (historyIndex > 0) {
            historyIndex--;
            input = commandHistory[commandHistory.length - 1 - historyIndex];
            cursorPosition = input.length;
          } else if (historyIndex === 0) {
            historyIndex = -1;
            input = savedInput;
            cursorPosition = input.length;
          }
        }
      } else if (key.name === 'enter') {
        if (showMenu && menuItems.length > 0) {
          input = menuItems[menuIndex].cmd;
          showMenu = false;
          menuItems = [];
          rl.emit('line', input);
          return;
        }
        if (input.trim()) {
          rl.emit('line', input);
          return;
        }
      } else if (key.ctrl && key.name === 'r') {
        // Ctrl+R: Reverse history search
        if (!reverseSearchActive) {
          reverseSearchActive = true;
          reverseSearchQuery = '';
          reverseSearchIndex = 0;
          savedInput = input;
          input = '';
          cursorPosition = 0;
          showMenu = false;
          menuItems = [];
          printReverseSearch();
        }
        return;
      } else if (key.ctrl && key.name === 'c') {
        if (reverseSearchActive) {
          reverseSearchActive = false;
          input = savedInput;
          cursorPosition = input.length;
          printPromptWithInput();
        } else {
          process.stdout.write(SHOW_CURSOR + '\n');
          rl.close();
          process.exit(0);
        }
        return;
      }
    }

    // Handle / for menu trigger
    if (input === '/') {
      showMenu = true;
      menuItems = filterMenu('');
      menuIndex = 0;
    } else if (showMenu && input.startsWith('/')) {
      menuItems = filterMenu(input);
      menuIndex = 0;
      if (menuItems.length === 0) {
        showMenu = false;
      }
    } else if (showMenu && !input.startsWith('/')) {
      showMenu = false;
      menuItems = [];
    }

    // Redraw
    const prevMenuLines = getMenuLines();
    if (prevMenuLines > 0) {
      process.stdout.write(`${ESC}[${prevMenuLines + 1}A` + CLEAR_DOWN);
    }
    printPromptWithInput();
    if (showMenu) {
      printMenu();
    }
  });
}