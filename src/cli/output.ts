import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';

export const theme = {
  primary: chalk.hex('#FF6B35'),
  secondary: chalk.hex('#8B5CF6'),
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  dim: chalk.dim,
  bold: chalk.bold,
  underline: chalk.underline,
};

export function success(msg: string): void {
  console.log(` ${chalk.green('✓')} ${msg}`);
}

export function error(msg: string, context?: string): void {
  const lines = [` ${chalk.red('✗')} ${msg}`];
  if (context) lines.push(`   ${chalk.dim(context)}`);
  console.log(lines.join('\n'));
}

export function warning(msg: string): void {
  console.log(` ${chalk.yellow('⚠')} ${msg}`);
}

export function info(msg: string): void {
  console.log(` ${chalk.blue('ℹ')} ${msg}`);
}

export function createSpinner(text: string) {
  return ora({
    text,
    color: 'yellow',
  }).start();
}

export function codeBlock(code: string): void {
  const lines = code.split('\n');
  const numbered = lines.map((line, i) => {
    const lineNum = String(i + 1).padStart(3, ' ');
    return `${chalk.dim(lineNum)} ${line}`;
  });
  console.log(
    boxen(numbered.join('\n'), {
      padding: 1,
      margin: 1,
      borderColor: 'gray',
      borderStyle: 'round',
    })
  );
}

export function filePath(p: string): string {
  return chalk.underline.cyan(p);
}

export function componentName(name: string): string {
  return chalk.bold.hex('#FF6B35')(name);
}

export function summaryBox(title: string, items: Record<string, string | number>): void {
  const content = Object.entries(items)
    .map(([key, val]) => ` ${chalk.dim(key)}: ${chalk.bold(String(val))}`)
    .join('\n');
  console.log(
    boxen(content, {
      title,
      padding: 1,
      margin: 1,
      borderColor: '#8B5CF6',
      borderStyle: 'round',
      titleAlignment: 'center',
    })
  );
}

export function clearScreen(): void {
  console.clear();
}
