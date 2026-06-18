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

let commandHistory: string[] = [];
let historyIndex = -1;
let savedInput = '';

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

function printBanner(): void {
  showBanner();
}

function printPrompt(): void {
  process.stdout.write(chalk.hex('#8B5CF6')('◧') + ' ');
}

function completeCommand(input: string): string[] {
  const parts = input.split(' ');
  const first = parts[0];

  if (parts.length === 1 && (first.startsWith('/') || !first)) {
    const cmds = getAllCommands();
    const searchTerm = first.startsWith('/') ? first : '/' + first;
    const matches = cmds.filter(c =>
      c.name.toLowerCase().startsWith(searchTerm.toLowerCase()) ||
      c.aliases.some(a => a.toLowerCase().startsWith(searchTerm.toLowerCase()))
    );
    return matches.map(m => m.name);
  } else if (parts.length > 1) {
    const cmdName = parts[0];
    const cmd = findCommand(cmdName);
    if (cmd) {
      const args = getCommandArgs(cmd.cmd.name);
      const lastPart = parts[parts.length - 1];
      if (lastPart.startsWith('--')) {
        const flagMatches = args.filter(a => a.flag.startsWith(lastPart));
        return flagMatches.map(f => f.flag + ' ');
      }
    }
  }

  return [];
}

async function executeCommand(input: string): Promise<void> {
  const trimmed = input.trim();
  if (!trimmed) return;

  commandHistory.push(trimmed);
  saveHistory();
  historyIndex = -1;

  // Handle /convert and /c
  if (trimmed.startsWith('/convert ') || trimmed === '/convert' ||
      trimmed.startsWith('/c ') || trimmed === '/c' ||
      trimmed.startsWith('convert ') || trimmed === 'convert') {
    const parts = trimmed.split(/\s+/);
    const url = parts.find(p => !p.startsWith('/') && !p.startsWith('--') && !p.startsWith('-') && p.includes('figma.com'));
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

  // Handle direct command execution
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
  printBanner();

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  let input = '';
  let completionIndex = 0;
  let completions: string[] = [];

  rl.prompt = () => {
    process.stdout.write(chalk.hex('#8B5CF6')('◧') + ' ');
  };

  rl.on('line', async (line) => {
    const trimmed = line.trim();

    if (trimmed === 'exit' || trimmed === '/exit' || trimmed === '/quit' || trimmed === '/q') {
      console.log(chalk.hex('#FF6B35')('\n👋') + ' Thanks for using Figmake!');
      rl.close();
      process.exit(0);
    }

    if (trimmed === '/clear' || trimmed === '/cls') {
      console.clear();
      printBanner();
    } else {
      await executeCommand(trimmed);
    }

    input = '';
    completions = [];
    completionIndex = 0;
    printPrompt();
  });

  rl.on('SIGINT', () => {
    console.log('\n' + chalk.hex('#FF6B35')('👋') + ' Exiting...');
    rl.close();
    process.exit(0);
  });

  // Handle raw keypresses for tab completion and history
  process.stdin.on('keypress', (str, key) => {
    if (key && key.name === 'tab') {
      const line = (rl as any).line || input;
      if (line.length > 0) {
        if (completions.length === 0) {
          completions = completeCommand(line);
          completionIndex = 0;
        }
        if (completions.length > 0) {
          const completion = completions[completionIndex % completions.length];
          completionIndex++;

          // Replace current line with completion
          const parts = line.split(/\s+/);
          if (parts.length === 1) {
            rl.write('', { dx: -line.length });
            rl.write(completion);
            input = completion;
            (rl as any).line = completion;
          }
        }
      }
      return;
    }

    if (key && key.name === 'up') {
      if (commandHistory.length > 0) {
        if (historyIndex === -1) {
          savedInput = (rl as any).line || input;
        }
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        historyIndex = newIndex;
        const histEntry = commandHistory[commandHistory.length - 1 - newIndex];
        rl.write('', { dx: -((rl as any).line || '').length });
        rl.write(histEntry);
        (rl as any).line = histEntry;
      }
      return;
    }

    if (key && key.name === 'down') {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        historyIndex = newIndex;
        const histEntry = commandHistory[commandHistory.length - 1 - newIndex];
        rl.write('', { dx: -((rl as any).line || '').length });
        rl.write(histEntry);
        (rl as any).line = histEntry;
      } else if (historyIndex === 0) {
        historyIndex = -1;
        rl.write('', { dx: -((rl as any).line || '').length });
        rl.write(savedInput);
        (rl as any).line = savedInput;
      }
      return;
    }
  });

  printPrompt();
}