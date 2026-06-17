import chalk from 'chalk';

export interface PopupItem {
  label: string;
  description: string;
  insertText: string;
  type?: 'command' | 'flag' | 'value' | 'history';
}

export class Popup {
  private _allItems: PopupItem[] = [];
  private _filtered: PopupItem[] = [];
  private _selectedIndex: number = 0;
  private _visible: boolean = false;

  get visible(): boolean {
    return this._visible;
  }

  get filteredCount(): number {
    return this._filtered.length;
  }

  get selectedIndex(): number {
    return this._selectedIndex;
  }

  get hasItems(): boolean {
    return this._filtered.length > 0;
  }

  getSelected(): PopupItem | null {
    if (this._filtered.length === 0) return null;
    return this._filtered[this._selectedIndex] ?? null;
  }

  getSelectedInsertText(): string | null {
    const item = this.getSelected();
    return item ? item.insertText : null;
  }

  setItems(items: PopupItem[]): void {
    this._allItems = items;
    this._filtered = [...items];
    this._selectedIndex = 0;
  }

  show(): void {
    this._visible = true;
    this._selectedIndex = 0;
  }

  hide(): void {
    this._visible = false;
  }

  updateFilter(query: string): void {
    const lower = query.toLowerCase();
    this._filtered = this._allItems.filter(item => {
      if (item.label.toLowerCase().includes(lower)) return true;
      if (item.description.toLowerCase().includes(lower)) return true;
      return false;
    });
    if (this._selectedIndex >= this._filtered.length) {
      this._selectedIndex = 0;
    }
  }

  selectNext(): void {
    if (this._filtered.length === 0) return;
    this._selectedIndex = (this._selectedIndex + 1) % this._filtered.length;
  }

  selectPrev(): void {
    if (this._filtered.length === 0) return;
    this._selectedIndex =
      (this._selectedIndex - 1 + this._filtered.length) % this._filtered.length;
  }

  selectFirst(): void {
    this._selectedIndex = 0;
  }

  get renderedLines(): string[] {
    if (!this._visible || this._filtered.length === 0) return [];

    const maxVisible = 10;
    const count = Math.min(this._filtered.length, maxVisible);
    const half = Math.floor(count / 2);
    let startIndex = this._selectedIndex - half;
    startIndex = Math.max(
      0,
      Math.min(startIndex, this._filtered.length - count)
    );

    const visible = this._filtered.slice(startIndex, startIndex + count);
    const lines: string[] = [];

    for (const item of visible) {
      const actualIndex = startIndex + visible.indexOf(item);
      const isSelected = actualIndex === this._selectedIndex;
      const typeColor = item.type === 'history' ? chalk.dim.hex('#888') : chalk.dim;

      const labelStr =
        item.type === 'command'
          ? chalk.bold.hex('#FF6B35')(item.label)
          : item.type === 'flag'
            ? chalk.cyan(item.label)
            : item.type === 'history'
              ? chalk.white(item.label)
              : chalk.white(item.label);

      const content = ` ${labelStr}  ${typeColor(item.description)}`;

      if (isSelected) {
        lines.push(chalk.bgCyan(' ' + content + ' '));
      } else {
        lines.push(' ' + content);
      }
    }

    if (this._filtered.length > maxVisible) {
      const remaining = this._filtered.length - maxVisible;
      lines.push(chalk.dim(` \u2514 and ${remaining} more...`));
    }

    return lines;
  }
}
