#!/usr/bin/env node
import dotenv from 'dotenv';
import { showBanner } from './banner';
import { findCommand, runConvert } from './commands';
import { error } from './output';

dotenv.config();

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // If no arguments provided, start shell mode
  if (args.length === 0) {
    const { runShell } = await import('./shell');
    await runShell();
    return;
  }

  // If arguments are passed, run command directly and exit
  const firstArg = args[0].toLowerCase();

  /* ── Direct convert mode: "figmake convert <url> --token <tok>" ── */
  if (firstArg === 'convert') {
    const url = args[1];
    const tokenIdx = args.indexOf('--token');
    const token = tokenIdx !== -1 ? args[tokenIdx + 1] : null;
    const outputIdx = args.indexOf('--output');
    const output = outputIdx !== -1 ? args[outputIdx + 1] : './figmake-output';

    if (!url) {
      console.log('\n ✗ Error: No Figma URL provided');
      console.log('   Usage: figmake convert <figma-url> --token <token> [--output <dir>]\n');
      process.exit(1);
    }
    if (!token) {
      console.log('\n ⚠ No token provided. Set one with /config or pass --token');
      console.log('   Get a token at: https://www.figma.com/settings → Personal Access Tokens\n');
      process.exit(1);
    }

    await runConvert(url, token, output);
    process.exit(0);
  }

  /* ── Check for direct mode flags ── */
  if (firstArg === '--help' || firstArg === '-h') {
    showBanner();
    const helpCmd = findCommand('/help');
    if (helpCmd) await helpCmd.cmd.handler([]);
    process.exit(0);
  } else if (firstArg === '--version' || firstArg === '-v') {
    const versionCmd = findCommand('/version');
    if (versionCmd) await versionCmd.cmd.handler([]);
    process.exit(0);
  } else if (firstArg === '--demo') {
    const demoCmd = findCommand('/demo');
    if (demoCmd) await demoCmd.cmd.handler(args.slice(1));
    process.exit(0);
  } else if (firstArg === '--config') {
    const configCmd = findCommand('/config');
    if (configCmd) await configCmd.cmd.handler([]);
    process.exit(0);
  } else if (firstArg === '--plugin') {
    const pluginCmd = findCommand('/plugin');
    if (pluginCmd) await pluginCmd.cmd.handler([]);
    process.exit(0);
  }

  /* ── Generic command dispatch for slash-prefixed args ── */
  const cmdStr = args.join(' ');
  const result = findCommand(cmdStr);
  if (result) {
    try {
      const exitVal = await result.cmd.handler(result.args);
      if (exitVal === 'exit') process.exit(0);
    } catch (e: any) {
      error(e.message || 'Command failed');
      process.exit(1);
    }
    process.exit(0);
  } else {
    error(`Unknown command: ${args[0]}`, 'Run figmake --help to see all commands');
    process.exit(1);
  }
}

// Handle unexpected errors gracefully
process.on('uncaughtException', (err) => {
  console.error(`\n ✗ Unexpected error: ${err.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (err: any) => {
  console.error(`\n ✗ Unexpected rejection: ${err.message}`);
  process.exit(1);
});

main().catch(() => process.exit(1));