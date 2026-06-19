#!/usr/bin/env node
import * as readline from 'readline';
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
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;
const UP_ONE = `${ESC}[A`;
const DOWN_ONE = `${ESC}[B`;

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

function printBanner(): void {
  showBanner();
  console.log(chalk.dim('  Type ') + chalk.cyan('/help') + chalk.dim(' for commands, ') + chalk.cyan('Tab') + chalk.dim(' to complete, ') + chalk.cyan('↑↓') + chalk.dim(' for history'));
  console.log(chalk.dim('  Press ') + chalk.cyan('/') + chalk.dim(' to browse commands, ') + chalk.cyan('Ctrl+R') + chalk.dim(' for history search\n'));
  console.log(getStatusLine());
}

function printPrompt(): void {
  const prompt = chalk.hex('#8B5CF6')('◧') + ' ';
  const displayInput = input || chalk.dim('Type /help for commands...');
  process.stdout.write('\r' + CLEAR_LINE + prompt + displayInput + CLEAR_LINE);
}

function getMenuLines(): number {
  if (!showMenu || menuItems.length === 0) return 0;
  return Math.min(menuItems.length, 8) + 4;
}

interface MenuItem {
  cmd: string;
  desc: string;
  shortcut?: string;
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
    }));
}

function printMenu(): void {
  if (!showMenu || menuItems.length === 0) return;

  const width = 58;
  const visibleItems = menuItems.slice(0, 8);

  let menu = '\n' + chalk.dim('┌') + '─'.repeat(width) + chalk.dim('┐') + '\n';
  menu += chalk.dim('│') + chalk.bold.cyan(' Commands ') + chalk.dim(' '.repeat(width - 10) + '│') + '\n';
  menu += chalk.dim('├') + '─'.repeat(width) + chalk.dim('┤') + '\n';

  visibleItems.forEach((item, idx) => {
    const isSelected = idx === menuIndex;
    const shortcut = item.shortcut ? chalk.dim(' ') + chalk.cyan(`[${item.shortcut}]`) : '';

    if (isSelected) {
      menu += chalk.dim('│') + chalk.hex('#8B5CF6').bold(' ▶ ') +
              chalk.hex('#8B5CF6').bold(item.cmd.padEnd(12)) +
              shortcut + ' ' + chalk.dim(item.desc.slice(0, 28).padEnd(28)) +
              chalk.dim('│') + '\n';
    } else {
      menu += chalk.dim('│') + '   ' + chalk.cyan(item.cmd.padEnd(12)) +
              shortcut + ' ' + chalk.dim(item.desc.slice(0, 28).padEnd(28)) +
              chalk.dim('│') + '\n';
    }
  });

  menu += chalk.dim('└') + '─'.repeat(width) + chalk.dim('┘');
  process.stdout.write(menu);
}

function printReverseSearch(): void {
  reverseSearchResults = commandHistory.filter(h => h.toLowerCase().includes(reverseSearchQuery.toLowerCase()));
  const currentMatch = reverseSearchResults.length > 0
    ? reverseSearchResults[reverseSearchResults.length - 1 - reverseSearchIndex]
    : null;

  let display = chalk.hex('#8B5CF6')('◧') + ' ' + chalk.dim('(reverse-search) ') + reverseSearchQuery;
  if (currentMatch) {
    display += '\n' + chalk.dim('→ ') + chalk.green(currentMatch);
  } else if (reverseSearchQuery.length > 0) {
    display += '\n' + chalk.dim('(no matches)');
  }
  process.stdout.write('\r' + CLEAR_DOWN + display + CLEAR_DOWN);
}

async function executeCommand(cmd: string): Promise<void> {
  const trimmed = cmd.trim();
  if (!trimmed) return;

  commandHistory.push(trimmed);
  saveHistory();
  historyIndex = -1;

  // Handle /convert
  if (trimmed.startsWith('/convert') || trimmed.startsWith('/c ') || trimmed === '/c') {
    const parts = trimmed.split(/\s+/);
    const url = parts.find(p => p.includes('figma.com'));
    const tokenIdx = parts.indexOf('--token');
    const token = tokenIdx !== -1 && tokenIdx + 1 < parts.length ? parts[tokenIdx + 1] : null;
    const outputIdx = parts.indexOf('--output');
    const outputDir = outputIdx !== -1 && outputIdx + 1 < parts.length ? parts[outputIdx + 1] : './figmake-output';

    if (!url) {
      console.log(chalk.red('✗') + ' Error: No Figma URL provided');
      console.log(chalk.dim('   Usage: /convert <figma-url> --token <token> [--output <dir>]'));
    } else if (!token) {
      console.log(chalk.yellow('⚠') + ' No token. Get one at: https://www.figma.com/settings');
    } else {
      await runConvert(url, token, outputDir);
    }
    return;
  }

  // Handle /help
  if (trimmed.startsWith('/help')) {
    const [, cmdName] = trimmed.split(/\s+/);
    if (cmdName) {
      const cmdDef = getAllCommands().find(c =>
        c.name === cmdName || c.name === '/' + cmdName || c.aliases.includes(cmdName)
      );
      if (cmdDef) {
        console.log(chalk.bold.cyan(`\n ${cmdDef.name}`));
        console.log(chalk.dim('   ' + cmdDef.description));
        if (cmdDef.usage) console.log(chalk.dim('   Usage: ') + chalk.yellow(cmdDef.usage));
        if (cmdDef.aliases.length > 1) console.log(chalk.dim('   Aliases: ') + chalk.cyan(cmdDef.aliases.slice(1).join(', ')));
        console.log();
        return;
      }
    }
    console.log(chalk.bold.cyan('\n  Available Commands\n'));
    for (const cmd of getAllCommands()) {
      const aliases = cmd.aliases.length > 1 ? chalk.dim(` (${cmd.aliases.slice(1).join(', ')})`) : '';
      console.log(`  ${chalk.cyan(cmd.name.padEnd(10))}${aliases}  ${cmd.description}`);
    }
    console.log();
    return;
  }

  // Execute command
  const result = findCommand(trimmed);
  if (result) {
    try {
      const exitVal = await result.cmd.handler(result.args);
      if (exitVal === 'exit') process.exit(0);
    } catch (e: any) {
      console.log(chalk.red('✗') + ' ' + (e.message || 'Command failed'));
    }
    return;
  }

  console.log(chalk.red('✗') + ` Unknown command: ${trimmed.split(/\s+/)[0]}`);
  console.log('Type ' + chalk.cyan('/help') + ' for available commands.');
}

export async function runShell(): Promise<void> {
  loadHistory();
  loadConfig();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  // Enable raw mode
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  process.stdout.write(HIDE_CURSOR);
  printBanner();
  printPrompt();

  rl.on('line', async (line) => {
    if (reverseSearchActive) {
      reverseSearchActive = false;
      input = reverseSearchResults.length > 0
        ? reverseSearchResults[reverseSearchResults.length - 1 - reverseSearchIndex]
        : reverseSearchQuery;
      cursorPosition = input.length;
      printPrompt();
      return;
    }

    if (showMenu && menuItems.length > 0 && menuItems[menuIndex]) {
      await executeCommand(menuItems[menuIndex].cmd);
    } else if (input.trim()) {
      await executeCommand(input);
    }

    input = '';
    cursorPosition = 0;
    showMenu = false;
    menuIndex = 0;
    menuItems = [];
    printPrompt();
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
  rl.input.on('keypress', (str, key) => {
    // Reverse search mode
    if (reverseSearchActive) {
      if (key?.name === 'enter') {
        reverseSearchActive = false;
        input = reverseSearchResults.length > 0
          ? reverseSearchResults[reverseSearchResults.length - 1 - reverseSearchIndex]
          : reverseSearchQuery;
        cursorPosition = input.length;
        console.log('\n');
        printPrompt();
        return;
      }
      if (key?.name === 'up') {
        reverseSearchIndex = Math.min(reverseSearchIndex + 1, reverseSearchResults.length - 1);
        console.log(UP_ONE + UP_ONE);
        printReverseSearch();
        return;
      }
      if (key?.name === 'down') {
        reverseSearchIndex = Math.max(0, reverseSearchIndex - 1);
        console.log(UP_ONE + UP_ONE);
        printReverseSearch();
        return;
      }
      if (key?.name === 'escape') {
        reverseSearchActive = false;
        input = savedInput;
        cursorPosition = input.length;
        console.log('\r' + CLEAR_DOWN);
        printPrompt();
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

    // Ctrl+R: Reverse search
    if (key?.ctrl && key.name === 'r') {
      reverseSearchActive = true;
      reverseSearchQuery = '';
      reverseSearchIndex = 0;
      savedInput = input;
      input = '';
      cursorPosition = 0;
      showMenu = false;
      menuItems = [];
      console.log('\r' + CLEAR_DOWN);
      printReverseSearch();
      return;
    }

    // Ctrl+C: Exit
    if (key?.ctrl && key.name === 'c') {
      process.stdout.write(SHOW_CURSOR + '\n');
      rl.close();
      process.exit(0);
      return;
    }

    // Character typed
    if (str && !key?.ctrl && !key?.meta) {
      input = input.slice(0, cursorPosition) + str + input.slice(cursorPosition);
      cursorPosition += str.length;
      printPrompt();
    }

    // Handle special keys
    if (key) {
      if (key.name === 'backspace') {
        if (cursorPosition > 0) {
          input = input.slice(0, cursorPosition - 1) + input.slice(cursorPosition);
          cursorPosition--;
          printPrompt();
        }
      }
      if (key.name === 'delete') {
        if (cursorPosition < input.length) {
          input = input.slice(0, cursorPosition) + input.slice(cursorPosition + 1);
          printPrompt();
        }
      }
      if (key.name === 'left') {
        cursorPosition = Math.max(0, cursorPosition - 1);
        printPrompt();
      }
      if (key.name === 'right') {
        cursorPosition = Math.min(input.length, cursorPosition + 1);
        printPrompt();
      }
      if (key.name === 'home') {
        cursorPosition = 0;
        printPrompt();
      }
      if (key.name === 'end') {
        cursorPosition = input.length;
        printPrompt();
      }
      if (key.name === 'tab') {
        if (showMenu && menuItems.length > 0) {
          input = menuItems[menuIndex].cmd;
          cursorPosition = input.length;
          showMenu = false;
          menuItems = [];
          printPrompt();
        } else if (input.startsWith('/')) {
          const matches = filterMenu(input);
          if (matches.length === 1) {
            input = matches[0].cmd;
            cursorPosition = input.length;
            printPrompt();
          } else if (matches.length > 1) {
            showMenu = true;
            menuItems = matches;
            menuIndex = 0;
            console.log('\r' + CLEAR_DOWN);
            printPrompt();
            printMenu();
          }
        }
        return;
      }
      if (key.name === 'up') {
        if (showMenu) {
          menuIndex = Math.max(0, menuIndex - 1);
          const menuLines = getMenuLines();
          console.log(`${ESC}[${menuLines + 1}A` + CLEAR_DOWN);
          printPrompt();
          printMenu();
        } else {
          if (commandHistory.length > 0) {
            if (historyIndex === -1) savedInput = input;
            historyIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
            input = commandHistory[commandHistory.length - 1 - historyIndex];
            cursorPosition = input.length;
            printPrompt();
          }
        }
        return;
      }
      if (key.name === 'down') {
        if (showMenu) {
          menuIndex = Math.min(menuItems.length - 1, menuIndex + 1);
          const menuLines = getMenuLines();
          console.log(`${ESC}[${menuLines + 1}A` + CLEAR_DOWN);
          printPrompt();
          printMenu();
        } else {
          if (historyIndex > 0) {
            historyIndex--;
            input = commandHistory[commandHistory.length - 1 - historyIndex];
            cursorPosition = input.length;
            printPrompt();
          } else if (historyIndex === 0) {
            historyIndex = -1;
            input = savedInput;
            cursorPosition = input.length;
            printPrompt();
          }
        }
        return;
      }
      if (key.name === 'enter') {
        if (showMenu && menuItems.length > 0) {
          input = menuItems[menuIndex].cmd;
          showMenu = false;
          menuItems = [];
          console.log('\n');
          rl.emit('line', input);
          return;
        }
        if (input.trim()) {
          console.log('\n');
          rl.emit('line', input);
          return;
        }
      }
    }

    // Handle / for menu trigger
    if (input === '/') {
      showMenu = true;
      menuItems = filterMenu('');
      menuIndex = 0;
      console.log('\r' + CLEAR_DOWN);
      printPrompt();
      printMenu();
    } else if (showMenu && input.startsWith('/')) {
      menuItems = filterMenu(input);
      menuIndex = 0;
      if (menuItems.length === 0) {
        showMenu = false;
      }
      const menuLines = getMenuLines();
      console.log(`${ESC}[${menuLines + 1}A` + CLEAR_DOWN);
      printPrompt();
      if (showMenu) printMenu();
    } else if (showMenu && !input.startsWith('/')) {
      showMenu = false;
      menuItems = [];
      printPrompt();
    }
  });
}