import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { Command } from 'commander';
import { generateReactComponent } from './generateReactCode';
import { figmaToCSS } from './figmaToCSS';
import dotenv from 'dotenv';
import { diffLines } from 'diff';

dotenv.config();

const program = new Command();

program
  .name('figma-to-react')
  .description('CLI to convert Figma files to React components')
  .version('1.0.0');

program
  .command('export')
  .description('Export Figma frames to React components')
  .requiredOption('-u, --url <url>', 'Figma file URL')
  .requiredOption('-t, --token <token>', 'Figma Personal Access Token')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-w, --watch', 'Watch mode')
  .action(async (options) => {
    // ... (existing export logic)
  });

program
  .command('sync')
  .description('Sync existing React components with Figma')
  .requiredOption('-u, --url <url>', 'Figma file URL')
  .requiredOption('-t, --token <token>', 'Figma Personal Access Token')
  .option('-d, --dir <dir>', 'Components directory', './output')
  .action(async (options) => {
    const { url, token, dir } = options;
    const fileKey = extractFileKey(url);
    if (!fileKey) return console.error('Invalid URL');

    try {
      const fileData = await fetchFigmaFile(fileKey, token);
      const nodeMap = buildNodeMap(fileData.document);
      const getNodeById = (id: string) => nodeMap.get(id);

      const files = await fs.readdir(dir);
      for (const file of files) {
        if (!file.endsWith('.tsx')) continue;
        
        const filePath = path.join(dir, file);
        const currentCode = await fs.readFile(filePath, 'utf-8');
        
        const figmaIdMatch = currentCode.match(/ID: ([^\n]+)/);
        const hashMatch = currentCode.match(/Hash: ([^\n]+)/);
        
        if (figmaIdMatch) {
          const figmaId = figmaIdMatch[1].trim();
          const localHash = hashMatch ? hashMatch[1].trim() : '';
          const figmaNode = getNodeById(figmaId);
          
          if (figmaNode) {
            console.log(`🔍 Checking ${file}...`);
            const { code: newGeneratedCode, hash: newHash } = generateReactComponent(figmaNode, { getNodeById });
            
            if (newHash !== localHash) {
              console.log(`⚠️ Design drift detected in ${file}!`);
              // Implement surgical merge or prompt for overwrite
              // For now, let's log the diff or overwrite
              await fs.writeFile(filePath, newGeneratedCode);
              console.log(`✅ Updated ${file}`);
            } else {
              console.log(`✨ ${file} is up to date.`);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Sync error:', error.message);
    }
  });

// ... helper functions ...
