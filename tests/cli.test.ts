import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';

describe('figmake-pro', () => {
  it('should have a built CLI', () => {
    const cliPath = resolve(__dirname, '../dist/cli/index.js');
    expect(existsSync(cliPath)).toBe(true);
  });

  it('should have a built plugin', () => {
    expect(existsSync(resolve(__dirname, '../dist/plugin/code.js'))).toBe(true);
    expect(existsSync(resolve(__dirname, '../dist/plugin/ui.html'))).toBe(true);
  });

  it('should have a valid package.json', () => {
    const pkg = require('../package.json');
    expect(pkg.name).toBe('figmake-pro');
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(pkg.bin).toBeDefined();
  });
});
