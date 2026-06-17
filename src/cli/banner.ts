import gradient from 'gradient-string';
import chalk from 'chalk';

const ASCII_ART = `
███████╗██╗ ██████╗ ███╗   ███╗ █████╗ ██╗  ██╗███████╗
██╔════╝██║██╔════╝ ████╗ ████║██╔══██╗██║  ██╔╝██╔════╝
█████╗  ██║██║  ███╗██╔████╔██║███████║█████╔╝ █████╗  
██╔══╝  ██║██║   ██║██║╚██╔╝██║██╔══██║██╔═██╗ ██╔══╝  
██║     ██║╚██████╔╝██║ ╚═╝ ██║██║  ██║██║  ██╗███████╗
╚═╝     ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
`;

const gradientTheme = gradient(['#FF6B35', '#8B5CF6']);

export function showBanner(): void {
  console.log();
  console.log(gradientTheme(ASCII_ART));
  console.log(chalk.dim('  Figma → Pixel-Perfect React'));
  console.log();
}
