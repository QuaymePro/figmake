#!/usr/bin/env node
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { Command } from 'commander';
import { generateReactComponent } from '../core/generators/reactGenerator';
import { extractDesignTokens } from '../design-system/extractDesignTokens';
import { generateLockfile } from '../vibecode-guard/generateLockfile';
import { generateCursorRules } from '../vibecode-guard/generateCursorRules';
import { generateClaudeRules } from '../vibecode-guard/generateClaudeRules';
import { generatePromptContext } from '../vibecode-guard/generatePromptContext';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
  .name('figmake')
  .description('Design-to-code compiler with AI agent guardrails')
  .version('3.0.0');

program
  .command('export')
  .description('Export Figma frames to React components')
  .requiredOption('-u, --url <url>', 'Figma file URL')
  .requiredOption('-t, --token <token>', 'Figma Personal Access Token')
  .option('-o, --output <dir>', 'Output directory', './output')
  .action(async (options) => {
    const { url, token, output } = options;
    const fileKey = extractFileKey(url);
    if (!fileKey) return console.error('Invalid URL');

    try {
      const fileData = await fetchFigmaFile(fileKey, token);
      const nodeMap = buildNodeMap(fileData.document);
      const getNodeById = (id: string) => nodeMap.get(id);

      const firstPage = fileData.document.children[0];
      const frames = firstPage.children.filter((c: any) => c.type === 'FRAME' || c.type === 'COMPONENT');

      await fs.ensureDir(output);
      for (const frame of frames) {
        console.log(`📦 Generating ${frame.name}...`);
        const { files } = generateReactComponent(frame, { getNodeById });
        for (const [filename, content] of Object.entries(files)) {
          await fs.writeFile(path.join(output, filename), content);
        }
      }
      console.log('✅ Export complete!');
    } catch (e: any) {
      console.error('❌ Error:', e.message);
    }
  });

program
  .command('lockfile')
  .description('Generate a design system lockfile')
  .requiredOption('-u, --url <url>', 'Figma file URL')
  .requiredOption('-t, --token <token>', 'Figma Personal Access Token')
  .option('-o, --output <file>', 'Output filename', '.figmake.lock')
  .action(async (options) => {
    const { url, token, output } = options;
    const fileKey = extractFileKey(url);
    if (!fileKey) return;

    try {
      const fileData = await fetchFigmaFile(fileKey, token);
      const tokens = extractDesignTokens([fileData.document]);
      const lockfile = generateLockfile(fileData.name, fileKey, tokens);
      await fs.writeFile(output, lockfile);
      console.log(`✅ Lockfile generated: ${output}`);
    } catch (e: any) {
      console.error('❌ Error:', e.message);
    }
  });

program
  .command('guard')
  .description('Generate AI agent constraints')
  .requiredOption('-u, --url <url>', 'Figma file URL')
  .requiredOption('-t, --token <token>', 'Figma Personal Access Token')
  .option('--agent <type>', 'Agent type (cursor, claude, prompt)', 'cursor')
  .action(async (options) => {
    const { url, token, agent } = options;
    const fileKey = extractFileKey(url);
    if (!fileKey) return;

    try {
      const fileData = await fetchFigmaFile(fileKey, token);
      const tokens = extractDesignTokens([fileData.document]);
      
      if (agent === 'cursor') {
        const rules = generateCursorRules(tokens);
        await fs.ensureDir('.cursor/rules');
        await fs.writeFile('.cursor/rules/design-system.mdc', rules);
        console.log('🛡️ Cursor rules generated at .cursor/rules/design-system.mdc');
      } else if (agent === 'prompt') {
        console.log('\n--- PASTE THIS INTO YOUR AI CHAT ---\n');
        console.log(generatePromptContext(tokens));
      }
    } catch (e: any) {
      console.error('❌ Error:', e.message);
    }
  });

function extractFileKey(url: string): string | null {
  const match = url.match(/file\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

async function fetchFigmaFile(fileKey: string, token: string) {
  const response = await axios.get(`https://api.figma.com/v1/files/${fileKey}`, {
    headers: { 'X-Figma-Token': token }
  });
  return response.data;
}

function buildNodeMap(root: any) {
  const map = new Map<string, any>();
  const traverse = (node: any) => {
    map.set(node.id, node);
    if (node.children) node.children.forEach(traverse);
  };
  traverse(root);
  return map;
}

program.parse();
