import * as readline from 'node:readline';
import { stdin, stdout } from 'node:process';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { theme } from './output';
import { runConvert, getAllCommands, getCommandArgs, type FlagCompletion } from './commands';
import { Popup, type PopupItem } from './popup';
import { showBanner } from './banner';

const HISTORY_FILE = path.join(os.homedir(), '.figmake_history');
const MAX_HISTORY = 200;
const BANNER_HEIGHT = 10;

/* ── Tokenizer for syntax highlighting ── */

interface Token {
  raw: string;
  type: 'command' | 'flag' | 'url' | 'path' | 'quoted' | 'word' | 'space';
}

function tokenizeInput(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);

    const spaceMatch = rest.match(/^(\s+)/);
    if (spaceMatch) {
      tokens.push({ raw: spaceMatch[1], type: 'space' });
      i += spaceMatch[1].length;
      continue;
    }

    const quotedMatch = rest.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/);
    if (quotedMatch) {
      tokens.push({ raw: quotedMatch[1], type: 'quoted' });
      i += quotedMatch[1].length;
      continue;
    }

    const urlMatch = rest.match(/^(https?:\/\/[^\s"')\]]+)/i);
    if (urlMatch) {
      tokens.push({ raw: urlMatch[1], type: 'url' });
      i += urlMatch[1].length;
      continue;
    }

    const flagMatch = rest.match(/^(--[\w-]+)/);
    if (flagMatch) {
      tokens.push({ raw: flagMatch[1], type: 'flag' });
      i += flagMatch[1].length;
      continue;
    }

    const pathMatch = rest.match(/^((?:\.?\/|~\/)[\w.\/\\-]+)/);
    if (pathMatch) {
      tokens.push({ raw: pathMatch[1], type: 'path' });
      i += pathMatch[1].length;
      continue;
    }

    const wordMatch = rest.match(/^(\S+)/);
    if (wordMatch) {
      tokens.push({ raw: wordMatch[1], type: 'word' });
      i += wordMatch[1].length;
      continue;
    }

    tokens.push({ raw: rest[0], type: 'word' });
    i++;
  }
  return tokens;
}

function highlightTokens(tokens: Token[], cmdHighlight: boolean): string {
  const commands = getAllCommands();
  let firstWord = true;
  return tokens.map(t => {
    if (t.type === 'space') return t.raw;
    if (t.type === 'quoted') return chalk.yellow(t.raw);
    if (t.type === 'url') return chalk.underline.blue(t.raw);
    if (t.type === 'flag') return chalk.cyan(t.raw);
    if (t.type === 'path') return chalk.green(t.raw);
    if (firstWord && cmdHighlight) {
      const lower = t.raw.toLowerCase();
      for (const cmd of commands) {
        if (cmd.name === lower || cmd.aliases.includes(lower)) {
          firstWord = false;
          return chalk.hex('#FF6B35').bold(cmd.name);
        }
      }
    }
    firstWord = false;
    return t.raw;
  }).join('');
}

function highlightInput(text: string): string {
  const tokens = tokenizeInput(text);
  return highlightTokens(tokens, true);
}

/* ── Fuzzy history matching ── */

function fuzzyMatch(query: string, text: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

/* ── Parsing helpers ── */

function getCurrentToken(text: string, cursor: number): { token: string; start: number } {
  const before = text.slice(0, cursor);
  const spaceIdx = before.lastIndexOf(' ');
  const start = spaceIdx === -1 ? 0 : spaceIdx + 1;
  return { token: text.slice(start, cursor), start };
}

function replaceCurrentToken(text: string, cursor: number, replacement: string): { text: string; cursor: number } {
  const { start } = getCurrentToken(text, cursor);
  return {
    text: text.slice(0, start) + replacement + text.slice(cursor),
    cursor: start + replacement.length,
  };
}

/* ── InteractiveShell ── */

type Mode = 'input' | 'search' | 'context-menu';

export class InteractiveShell {
  private history: string[] = [];
  private historyIndex: number = -1;
  private savedInput: string = '';
  private inputBuffer: string = '';
  private cursorPos: number = 0;
  private popup: Popup;
  private mode: Mode = 'input';
  private searchQuery: string = '';
  private searchResults: string[] = [];
  private searchSelected: number = 0;
  private running: boolean = false;
  private resolvePrompt: ((value: string) => void) | null = null;
  private keypressHandler: ((str: string, key: any) => void) | null = null;
  private pasteBuffer: string = '';
  private inPaste: boolean = false;
  private resizeHandler: (() => void) | null = null;
  private promptCleared: boolean = false;

  constructor() {
    this.popup = new Popup();
    this.loadHistory();
  }

  /* ── History persistence ── */

  private loadHistory(): void {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
        this.history = data.split('\n').filter(Boolean).slice(-MAX_HISTORY);
      }
    } catch {}
  }

  private saveHistory(): void {
    try {
      fs.writeFileSync(HISTORY_FILE, this.history.slice(-MAX_HISTORY).join('\n'));
    } catch {}
  }

  /* ── Scroll region management ── */

  private setupScrollRegion(): void {
    const rows = stdout.rows || 24;
    stdout.write(`\x1B[${BANNER_HEIGHT + 1};${rows}r`);
  }

  private resetScrollRegion(): void {
    const rows = stdout.rows || 24;
    stdout.write(`\x1B[1;${rows}r`);
  }

  /* ── Rendering helpers ── */

  private get availablePromptLines(): number {
    const rows = stdout.rows || 24;
    return Math.max(1, rows - BANNER_HEIGHT - 4);
  }

  /* ── Popup logic ── */

  private buildCommandItems(): PopupItem[] {
    return getAllCommands().map(cmd => ({
      label: cmd.name,
      description: cmd.description,
      insertText: cmd.name + ' ',
      type: 'command' as const,
    }));
  }

  private buildFlagItems(cmdName: string, currentToken: string): PopupItem[] {
    const args = getCommandArgs(cmdName);
    const items: PopupItem[] = [];
    for (const a of args) {
      items.push({
        label: a.flag,
        description: a.description,
        insertText: a.values ? a.flag + ' ' : a.flag + ' ',
        type: 'flag' as const,
      });
      if (a.values && currentToken === a.flag) {
        for (const v of a.values) {
          items.push({
            label: v.value,
            description: v.description,
            insertText: v.value + ' ',
            type: 'value' as const,
          });
        }
      }
    }
    return items;
  }

  private buildValueItems(flag: FlagCompletion): PopupItem[] {
    if (!flag.values) return [];
    return flag.values.map(v => ({
      label: v.value,
      description: v.description,
      insertText: v.value + ' ',
      type: 'value' as const,
    }));
  }

  private updatePopup(): void {
    if (this.mode === 'search') {
      this.updateSearchResults();
      return;
    }
    if (this.mode === 'context-menu') return;

    const trimmed = this.inputBuffer.trimStart();
    if (!trimmed.startsWith('/')) {
      this.popup.hide();
      return;
    }

    const parts = trimmed.split(/\s+/);
    const firstWord = parts[0]?.toLowerCase() ?? '';
    const matchingCmd = getAllCommands().find(
      c => c.name === firstWord || c.aliases.includes(firstWord)
    );

    if (!matchingCmd) {
      this.popup.setItems(this.buildCommandItems());
      this.popup.show();
      this.popup.updateFilter(trimmed);
      if (this.popup.filteredCount === 0) this.popup.hide();
      return;
    }

    if (parts.length < 2) {
      this.popup.hide();
      return;
    }

    const { token: currentToken } = getCurrentToken(this.inputBuffer, this.cursorPos);
    const args = getCommandArgs(matchingCmd.name);
    let items: PopupItem[] = [];

    /* Determine the token before the current one */
    const beforeCursor = this.inputBuffer.slice(0, this.cursorPos).trimEnd();
    const beforeParts = beforeCursor.split(/\s+/);
    const prevToken = beforeParts.length >= 2 ? beforeParts[beforeParts.length - 1] : '';
    const prevFlag = args.find(a => a.flag === prevToken);

    if (prevFlag && prevFlag.values) {
      /* After a flag with enum values — suggest values */
      items = this.buildValueItems(prevFlag);
    } else if (currentToken.startsWith('--')) {
      /* Typing a flag — suggest matching flags */
      items = this.buildFlagItems(matchingCmd.name, currentToken);
    }

    if (items.length === 0) { this.popup.hide(); return; }

    this.popup.setItems(items);
    this.popup.show();
    this.popup.updateFilter(currentToken.startsWith('--') ? currentToken : '');
    if (this.popup.filteredCount === 0) this.popup.hide();
  }

  /* ── Search mode ── */

  private get inputLines(): string[] {
    return this.inputBuffer.split('\n');
  }

  private updateSearchResults(): void {
    const q = this.searchQuery.toLowerCase();
    if (!q) { this.searchResults = []; this.searchSelected = 0; return; }
    this.searchResults = this.history.slice().reverse().filter(h => h.toLowerCase().includes(q));
    this.searchSelected = 0;
  }

  private enterSearchMode(): void {
    this.mode = 'search';
    this.searchQuery = '';
    this.searchResults = [];
    this.searchSelected = 0;
    this.popup.hide();
    this.render();
  }

  private exitSearchMode(selectResult: boolean): void {
    if (selectResult && this.searchResults.length > 0) {
      this.inputBuffer = this.searchResults[this.searchSelected] || this.inputBuffer;
      this.cursorPos = this.inputBuffer.length;
    }
    this.mode = 'input';
    this.searchQuery = '';
    this.searchResults = [];
    this.searchSelected = 0;
    this.updatePopup();
    this.render();
  }

  /* ── Context menu ── */

  private showContextMenu(): void {
    this.mode = 'context-menu';
    this.popup.hide();
    this.render();
  }

  private handleContextMenuAction(action: string): void {
    switch (action) {
      case 'paste':
        this.pasteFromClipboard();
        break;
      case 'clear':
        this.inputBuffer = '';
        this.cursorPos = 0;
        break;
      case 'history':
        this.mode = 'input';
        this.enterSearchMode();
        return;
    }
    this.mode = 'input';
    this.updatePopup();
    this.render();
  }

  private async pasteFromClipboard(): Promise<void> {
    try {
      const { default: clipboard } = await import('clipboardy');
      const text = await clipboard.read();
      if (text) {
        this.inputBuffer =
          this.inputBuffer.slice(0, this.cursorPos) + text + this.inputBuffer.slice(this.cursorPos);
        this.cursorPos += text.length;
        this.updatePopup();
        this.render();
      }
    } catch { this.render(); }
  }

  /* ── Rendering ── */

  private computeCursorLineCol(): { line: number; col: number } {
    const lines = this.inputLines;
    let remaining = this.cursorPos;
    for (let i = 0; i < lines.length; i++) {
      if (remaining <= lines[i].length) return { line: i, col: remaining };
      remaining -= lines[i].length + 1;
    }
    return { line: lines.length - 1, col: lines[lines.length - 1].length };
  }

  private renderNow(): void {
    stdout.write('\x1B[?25l');

    /* On first render (or after reAnchor), position below banner and clear.
       On subsequent renders, just write the prompt at the current cursor
       position (below any prior command output). */
    if (this.promptCleared) {
      stdout.cursorTo(0, BANNER_HEIGHT);
      stdout.clearScreenDown();
      this.promptCleared = false;
    }

    let y = BANNER_HEIGHT;

    /* ── Search overlay ── */
    if (this.mode === 'search') {
      y += this.renderSearchOverlay(y);
    }
    /* ── Context menu ── */
    else if (this.mode === 'context-menu') {
      y += this.renderContextMenu(y);
    }
    /* ── Popup (constrained to available space) ── */
    else if (this.popup.visible) {
      const maxLines = this.availablePromptLines;
      const lines = this.popup.renderedLines.slice(0, Math.max(0, maxLines));
      for (const line of lines) {
        stdout.write(line + '\n');
        y++;
      }
    }

    /* ── Prompt ── */
    const title = `${theme.primary('\u25C7')} ${chalk.bold('What would you like to do?')} ${chalk.dim('(type /help for commands)')}`;
    stdout.write(title + '\n');
    y++;

    stdout.write(`${theme.secondary('\u2502')}\n`);
    y++;

    const lines = this.inputLines;
    const { line: cursorLine, col: cursorCol } = this.computeCursorLineCol();

    for (let i = 0; i < lines.length; i++) {
      const prefix = i === 0 ? `${theme.secondary('\u2514\u2500')} ` : '  ';
      const tokens = tokenizeInput(lines[i]);
      const highlighted = highlightTokens(tokens, i === 0);
      stdout.write(prefix + highlighted);
      if (i < lines.length - 1) stdout.write('\n');
    }

    /* Position cursor at correct line & column */
    const totalInputLines = lines.length;
    const linesAfterCursor = totalInputLines - 1 - cursorLine;
    if (linesAfterCursor > 0) stdout.write(`\x1B[${linesAfterCursor}A`);

    const prefixLen = cursorLine === 0 ? 4 : 2;
    const targetCol = prefixLen + cursorCol + 1;
    if (targetCol > 1) stdout.write(`\x1B[${targetCol}G`);

    stdout.write('\x1B[?25h');
  }

  private renderSearchOverlay(startY: number): number {
    const overlayWidth = Math.min(stdout.columns || 80, 60);
    const sep = chalk.dim('\u2500'.repeat(overlayWidth));
    stdout.write(chalk.bold(' \u2315  history search') + '\n');
    stdout.write(` ${chalk.dim('>')} ${this.searchQuery || chalk.dim.italic('type to search...')}\n`);
    stdout.write(` ${sep}\n`);
    let count = 3;

    const results = this.searchResults;
    if (results.length > 0) {
      const maxShow = Math.min(results.length, this.availablePromptLines - 4);
      for (let i = 0; i < maxShow; i++) {
        const line = results[i].length > overlayWidth - 4
          ? results[i].slice(0, overlayWidth - 7) + '...'
          : results[i];
        stdout.write(i === 0 ? chalk.bgCyan(` ${line} `) + '\n' : chalk.dim(` ${line}`) + '\n');
        count++;
      }
      if (results.length > maxShow) {
        stdout.write(chalk.dim(` \u2514 and ${results.length - maxShow} more...`) + '\n');
        count++;
      }
    } else if (this.searchQuery) {
      stdout.write(chalk.dim(' (no matches)') + '\n');
      count++;
    }
    return count;
  }

  private renderContextMenu(startY: number): number {
    const items = [
      { key: 'p', label: 'Paste' },
      { key: 'c', label: 'Clear input' },
      { key: 'h', label: 'Command history' },
    ];
    stdout.write(chalk.bold(' \u2630  Menu') + '\n');
    let count = 1;
    for (const item of items) {
      stdout.write(`   ${chalk.cyan(item.key)}) ${item.label}\n`);
      count++;
    }
    stdout.write(chalk.dim(' \u2514 press a key to select') + '\n');
    count++;
    return count;
  }

  private render(): void {
    try {
      this.renderNow();
    } catch {}
  }

  /* ── Key handling ── */

  private handleKeypress(str: string, key: any): void {
    if (!key) return;

    if (this.inPaste) {
      if (str === '\x1B[201~') {
        this.inPaste = false;
        this.inputBuffer =
          this.inputBuffer.slice(0, this.cursorPos) +
          this.pasteBuffer +
          this.inputBuffer.slice(this.cursorPos);
        this.cursorPos += this.pasteBuffer.length;
        this.pasteBuffer = '';
        this.updatePopup();
        this.render();
        return;
      }
      if (key.name === 'escape') { this.inPaste = false; return; }
      this.pasteBuffer += str || '';
      return;
    }

    if (str === '\x1B[200~') { this.inPaste = true; this.pasteBuffer = ''; return; }

    if (key.ctrl && key.name === 'c') {
      this.teardown();
      stdout.write('\n');
      console.log(` ${theme.primary('\u{1F44B}')} Thanks for using Figmake!`);
      process.exit(0);
    }

    if (key.ctrl && key.name === 'r') {
      if (this.mode !== 'search') this.enterSearchMode();
      else this.exitSearchMode(false);
      return;
    }

    if (key.name === 'escape') {
      if (this.mode === 'search') { this.exitSearchMode(false); return; }
      if (this.mode === 'context-menu') {
        this.mode = 'input';
        this.updatePopup();
        this.render();
        return;
      }
      if (this.popup.visible) { this.popup.hide(); this.render(); }
      return;
    }

    if (this.mode === 'context-menu') {
      const ch = str?.toLowerCase();
      if (ch === 'p') { this.handleContextMenuAction('paste'); return; }
      if (ch === 'c') { this.handleContextMenuAction('clear'); return; }
      if (ch === 'h') { this.handleContextMenuAction('history'); return; }
      return;
    }

    if (this.mode === 'search') {
      this.handleSearchKeypress(str, key);
      return;
    }

    if (key.name === 'return' || key.name === 'enter') {
      if (key.alt || key.meta) {
        this.inputBuffer =
          this.inputBuffer.slice(0, this.cursorPos) + '\n' + this.inputBuffer.slice(this.cursorPos);
        this.cursorPos++;
        this.updatePopup();
        this.render();
        return;
      }

      if (this.running && this.resolvePrompt) {
        const resolved = this.inputBuffer.trim();
        this.inputBuffer = '';
        this.cursorPos = 0;
        this.running = false;
        this.popup.hide();
        stdout.write('\n');
        const resolve = this.resolvePrompt;
        this.resolvePrompt = null;
        resolve(resolved);
      }
      return;
    }

    if (key.name === 'tab') {
      if (this.popup.visible && this.popup.filteredCount > 0) {
        const insert = this.popup.getSelectedInsertText();
        if (insert) {
          const result = replaceCurrentToken(this.inputBuffer, this.cursorPos, insert);
          this.inputBuffer = result.text;
          this.cursorPos = result.cursor;
          this.popup.hide();
          this.render();
        }
      }
      return;
    }

    if (key.name === 'backspace') {
      if (this.cursorPos > 0) {
        this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos - 1) + this.inputBuffer.slice(this.cursorPos);
        this.cursorPos--;
        this.updatePopup();
        this.render();
      }
      return;
    }

    if (key.name === 'delete') {
      if (this.cursorPos < this.inputBuffer.length) {
        this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos) + this.inputBuffer.slice(this.cursorPos + 1);
        this.updatePopup();
        this.render();
      }
      return;
    }

    if (key.name === 'left') { if (this.cursorPos > 0) { this.cursorPos--; this.render(); } return; }
    if (key.name === 'right') { if (this.cursorPos < this.inputBuffer.length) { this.cursorPos++; this.render(); } return; }

    if (key.name === 'home') {
      const cursorLine = this.computeCursorLineCol().line;
      const lines = this.inputLines;
      let newPos = 0;
      for (let i = 0; i < cursorLine; i++) newPos += lines[i].length + 1;
      this.cursorPos = newPos;
      this.render();
      return;
    }

    if (key.name === 'end') {
      const cursorLine = this.computeCursorLineCol().line;
      const lines = this.inputLines;
      let newPos = 0;
      for (let i = 0; i <= cursorLine; i++) {
        if (i < cursorLine) newPos += lines[i].length + 1;
        else newPos += lines[i].length;
      }
      this.cursorPos = newPos;
      this.render();
      return;
    }

    if (key.name === 'up') {
      if (this.popup.visible && this.popup.filteredCount > 0) { this.popup.selectPrev(); this.render(); }
      else if (this.historyIndex < this.history.length - 1) {
        if (this.historyIndex === -1) this.savedInput = this.inputBuffer;
        this.historyIndex++;
        this.inputBuffer = this.history[this.history.length - 1 - this.historyIndex];
        this.cursorPos = this.inputBuffer.length;
        this.updatePopup();
        this.render();
      }
      return;
    }

    if (key.name === 'down') {
      if (this.popup.visible && this.popup.filteredCount > 0) { this.popup.selectNext(); this.render(); }
      else if (this.historyIndex >= 0) {
        this.historyIndex--;
        if (this.historyIndex < 0) { this.inputBuffer = this.savedInput; this.historyIndex = -1; }
        else { this.inputBuffer = this.history[this.history.length - 1 - this.historyIndex]; }
        this.cursorPos = this.inputBuffer.length;
        this.updatePopup();
        this.render();
      }
      return;
    }

    if (key.ctrl && key.name === 'u') { this.inputBuffer = ''; this.cursorPos = 0; this.updatePopup(); this.render(); return; }
    if (key.ctrl && key.name === 'k') { if (this.cursorPos < this.inputBuffer.length) { this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos); this.updatePopup(); this.render(); } return; }

    if (key.ctrl && key.name === 'w') {
      if (this.cursorPos > 0) {
        const after = this.inputBuffer.slice(this.cursorPos);
        const trimmed = this.inputBuffer.slice(0, this.cursorPos).replace(/\s*\S+\s*$/, '');
        this.inputBuffer = trimmed + after;
        this.cursorPos = trimmed.length;
        this.updatePopup();
        this.render();
      }
      return;
    }

    if (key.name === 'f2') { this.showContextMenu(); return; }

    if (str && str.length === 1) {
      this.inputBuffer =
        this.inputBuffer.slice(0, this.cursorPos) + str + this.inputBuffer.slice(this.cursorPos);
      this.cursorPos++;
      this.updatePopup();
      this.render();
    }
  }

  private handleSearchKeypress(str: string, key: any): void {
    if (key.name === 'return' || key.name === 'enter') { this.exitSearchMode(true); return; }
    if (key.name === 'escape') { this.exitSearchMode(false); return; }
    if (key.name === 'backspace') {
      if (this.searchQuery.length > 0) { this.searchQuery = this.searchQuery.slice(0, -1); this.updateSearchResults(); this.render(); }
      return;
    }
    if (str && str.length === 1) { this.searchQuery += str; this.updateSearchResults(); this.render(); }
  }

  /* ── Lifecycle ── */

  private setupKeypressHandler(): void {
    readline.emitKeypressEvents(stdin);
    if (stdin.isTTY) {
      stdin.setRawMode(true);
      stdout.write('\x1B[?2004h');
      this.setupScrollRegion();
    }
    this.resizeHandler = () => { try { this.render(); } catch {} };
    stdout.on('resize', this.resizeHandler);
    this.keypressHandler = (str: string, key: any) => { try { this.handleKeypress(str, key); } catch {} };
    stdin.on('keypress', this.keypressHandler);
  }

  private teardown(): void {
    if (this.keypressHandler) {
      stdin.removeListener('keypress', this.keypressHandler);
      this.keypressHandler = null;
    }
    if (this.resizeHandler) {
      stdout.removeListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    if (stdin.isTTY) {
      this.resetScrollRegion();
      stdout.write('\x1B[?2004l');
      stdin.setRawMode(false);
    }
    stdout.write('\x1B[?25h');
  }

  async prompt(): Promise<string> {
    return new Promise(resolve => {
      this.running = true;
      this.resolvePrompt = resolve;
      this.setupKeypressHandler();
      this.render();
    });
  }

  private reAnchor(): void {
    /* Re-anchor the banner by clearing the whole screen and re-showing it. */
    stdout.write('\x1B[?25l');
    stdout.cursorTo(0, 0);
    stdout.clearScreenDown();
    showBanner();
    this.promptCleared = true;
    this.render();
  }

  async run(): Promise<void> {
    console.log();

    /* Full-screen render once at startup (banner + first prompt) */
    this.reAnchor();

    while (true) {
      this.inputBuffer = '';
      this.cursorPos = 0;
      this.historyIndex = -1;
      this.savedInput = '';
      this.mode = 'input';
      this.searchQuery = '';
      this.searchResults = [];
      this.searchSelected = 0;
      this.popup.hide();

      /* Render the prompt at the current cursor position (below any prior
         command output), preserving visible output. */
      this.render();

      const input = await this.prompt();
      this.teardown();

      console.log('DEBUG: received line:', JSON.stringify(input));

      if (!input) continue;

      this.history.push(input);
      this.saveHistory();

      this.resetScrollRegion();
      stdout.write('\x1B[?25h');

      const trimmed = input.trim();

      /* ── Command routing (hardwired, no generic dispatcher) ── */

      // /convert or /c
      if (trimmed === '/convert' || trimmed.startsWith('/convert ') || trimmed === '/c' || trimmed.startsWith('/c ')) {
        try {
          const parts = trimmed.split(/\s+/);
          const url = parts[1];
          const tokenIdx = parts.indexOf('--token');
          const token = tokenIdx !== -1 ? parts[tokenIdx + 1] : null;
          const outputIdx = parts.indexOf('--output');
          const output = outputIdx !== -1 ? parts[outputIdx + 1] : './figmake-output';

          if (!url) {
            console.log('\n \u2717 Error: No Figma URL provided');
            console.log('   Usage: /convert <figma-url> --token <token> [--output <dir>]');
          } else if (!token) {
            console.log('\n \u26A0 No token provided. Get one at https://www.figma.com/settings');
          } else {
            await runConvert(url, token, output);
          }
        } catch (error: any) {
          console.log(`\n \u2717 Conversion failed: ${error.message}`);
        }

      // /help or /h or /?
      } else if (trimmed === '/help' || trimmed === '/h' || trimmed === '/?') {
        console.log('');
        console.log('  Available commands:');
        console.log('  /convert <url> --token <tok>   Convert Figma file to React');
        console.log('  /demo                          Generate demo components');
        console.log('  /plugin                        Show Figma plugin path');
        console.log('  /config                        Interactive configuration');
        console.log('  /clear                         Clear the terminal');
        console.log('  /version                       Show version info');
        console.log('  /help                          Show this help');
        console.log('  /exit                          Exit CLI');
        console.log('');

      // /version or /v
      } else if (trimmed === '/version' || trimmed === '/v') {
        try {
          const pkg = await fs.readJson(path.resolve(__dirname, '../../package.json'));
          console.log(`figmake-pro v${pkg.version}`);
        } catch {
          console.log('figmake-pro (version unknown)');
        }

      // /demo or /d
      } else if (trimmed === '/demo' || trimmed === '/d') {
        console.log('◇ Generating demo components...');
        const { MOCK_FIGMA_FILE } = await import('./demoData');
        const { buildNodeMap } = await import('./figma-helpers');
        const { generateReactComponent } = await import('../core/generators/reactGenerator');
        const { DEFAULT_CONFIG } = await import('../core/config');
        try {
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
          console.log(`✓ Demo generated in ./figmake-demo (${frames.length} components)`);
        } catch (e: any) {
          console.log(`✗ Demo failed: ${e.message}`);
        }

      // /clear or /cls
      } else if (trimmed === '/clear' || trimmed === '/cls') {
        this.reAnchor();

      // /exit or /quit or /q
      } else if (trimmed === '/exit' || trimmed === '/quit' || trimmed === '/q') {
        console.log('Goodbye!');
        this.teardown();
        process.exit(0);

      // /plugin or /p
      } else if (trimmed === '/plugin' || trimmed === '/p') {
        console.log('Figma plugin located at:');
        console.log(`  ${path.resolve(__dirname, '../../dist/plugin/')}`);
        console.log('To install: Figma → Plugins → Development → Import plugin from manifest');
        console.log(`Select: ${path.resolve(__dirname, '../../dist/plugin/manifest.json')}`);

      // /config or /cfg
      } else if (trimmed === '/config' || trimmed === '/cfg') {
        console.log('◇ Starting configuration wizard...');
        const { runConfigWizard } = await import('./config-wizard');
        try {
          await runConfigWizard();
          console.log('✓ Configuration saved');
        } catch (e: any) {
          console.log(`✗ Configuration failed: ${e.message}`);
        }

      // Unknown slash command
      } else if (trimmed.startsWith('/')) {
        console.log(`✗ Unknown command: ${trimmed.split(/\s+/)[0]}`);
        console.log('Type /help for available commands.');

      // Non-command input — ignore silently
      } else {
        // plain text, do nothing
      }
    }
  }

  close(): void {
    this.teardown();
  }
}
