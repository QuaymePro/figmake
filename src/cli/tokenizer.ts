export interface Token {
  raw: string;
  type: 'command' | 'flag' | 'url' | 'path' | 'quoted' | 'word' | 'space';
}

export function tokenizeInput(text: string): Token[] {
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

export function getCurrentToken(text: string, cursor: number): { token: string; start: number } {
  const before = text.slice(0, cursor);
  const spaceIdx = before.lastIndexOf(' ');
  const start = spaceIdx === -1 ? 0 : spaceIdx + 1;
  return { token: text.slice(start, cursor), start };
}

export function replaceCurrentToken(text: string, cursor: number, replacement: string): { text: string; cursor: number } {
  const { start } = getCurrentToken(text, cursor);
  return {
    text: text.slice(0, start) + replacement + text.slice(cursor),
    cursor: start + replacement.length,
  };
}
