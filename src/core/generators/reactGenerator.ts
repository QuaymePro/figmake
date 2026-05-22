import { extractNodeStyles } from "../extractors/styleExtractor";
import { PluginConfig, DEFAULT_CONFIG } from "../config";
import { generateHandlers } from "./handlerGenerator";
import { extractAnimations } from "../extractors/animationExtractor";

function generateHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "_").replace(/^([0-9])/, "_$1");
}

function toPascalCase(name: string, naming?: string): string {
  return sanitizeName(name)
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

export function generateReactComponent(node: any, options: { componentName?: string, getNodeById?: (id: string) => any, config?: PluginConfig, nameOverrides?: Map<string, string> } = {}): { code: string, files: Record<string, string>, hasAnimations: boolean, hash: string } {
  const config = options.config || DEFAULT_CONFIG;
  const files: Record<string, string> = {};
  const componentName = options.nameOverrides?.get(node.id) || options.componentName || toPascalCase(node.name, config.naming);
  const getNodeById = options.getNodeById;
  let hasAnimations = false;
  const allHandlerDeclarations: string[] = [];

  const generateNodeCode = (n: any, indent: string = "  ", parentAnimations?: any): string => {
    if (!n.animations && n.reactions) {
       n.animations = extractAnimations(n, getNodeById);
    }
    const styles = extractNodeStyles(n, config);
    const motionProps: any = {};
    const eventHandlers: Record<string, string> = {};
    
    if (n.animations && n.animations.interactions.length > 0) {
      if (config.animations !== 'css') {
        hasAnimations = true;
      }
      const { functionDeclarations, propMappings } = generateHandlers(n.id, n.name, n.animations.interactions, config);
      allHandlerDeclarations.push(...functionDeclarations);
      Object.assign(eventHandlers, propMappings);

      n.animations.interactions.forEach((interaction: any) => {
        if (interaction.trigger === "whileHover") motionProps.whileHover = { scale: 1.05 };
        else if (interaction.trigger === "whileTap") motionProps.whileTap = { scale: 0.95 };
      });
    }

    if (parentAnimations) {
      const interaction = parentAnimations.interactions.find((i: any) => i.childDeltas);
      if (interaction && interaction.childDeltas[n.name]) {
        hasAnimations = true;
        const delta = interaction.childDeltas[n.name];
        motionProps.layoutId = sanitizeName(n.name).toLowerCase();
        const initial: any = {};
        if (delta.x !== undefined) initial.x = -delta.x;
        if (delta.y !== undefined) initial.y = -delta.y;
        if (delta.opacity !== undefined) initial.opacity = 0;
        if (Object.keys(initial).length > 0) {
          motionProps.initial = initial;
          motionProps.animate = { x: 0, y: 0, opacity: 1 };
        }
      }
    }

    if (n.layoutMode === "HORIZONTAL" || n.layoutMode === "VERTICAL") {
      styles.display = "flex";
      styles.flexDirection = n.layoutMode === "HORIZONTAL" ? "row" : "column";
      styles.gap = `${n.itemSpacing || 0}px`;
      styles.padding = `${n.paddingTop || 0}px ${n.paddingRight || 0}px ${n.paddingBottom || 0}px ${n.paddingLeft || 0}px`;
    } else if (n.type !== "GROUP" && n.type !== "DOCUMENT" && n.type !== "PAGE") {
      styles.position = "absolute";
      styles.left = `${n.x}px`;
      styles.top = `${n.y}px`;
      styles.width = `${n.width}px`;
      styles.height = `${n.height}px`;
    }

    const styleAttr = `style={${JSON.stringify(styles, null, 2).replace(/"([^"]+)":/g, '$1:')}}`;
    const motionAttr = Object.keys(motionProps).length > 0 ? ` ${Object.entries(motionProps).map(([k, v]) => `${k}={${JSON.stringify(v)}}`).join(" ")}` : "";
    const handlerAttr = Object.keys(eventHandlers).length > 0 ? ` ${Object.entries(eventHandlers).map(([k, v]) => `${k}={${v}}`).join(" ")}` : "";
    const syncAttrs = `data-figma-id="${n.id}"`;
    const tagPrefix = Object.keys(motionProps).length > 0 ? "motion." : "";

    if (n.type === "TEXT") return `${indent}<${tagPrefix}span ${syncAttrs}${handlerAttr} ${styleAttr}${motionAttr}>${n.characters}</${tagPrefix}span>`;
    if (n.type === "VECTOR" || n.type === "STAR" || n.type === "POLYGON" || (n.type === "ELLIPSE" && !n.cornerRadius)) return `${indent}<${tagPrefix}div ${syncAttrs}${handlerAttr} ${styleAttr}${motionAttr}>/* SVG Placeholder */</${tagPrefix}div>`;

    const childrenCode = n.children ? n.children.map((child: any) => generateNodeCode(child, indent + "  ", n.animations)).join("\n") : "";
    let tag = "div";
    if (n.type === "GROUP") return childrenCode;
    if (n.type === "SECTION") tag = "section";
    return `${indent}<${tagPrefix}${tag} ${syncAttrs}${handlerAttr} ${styleAttr}${motionAttr}>\n${childrenCode}\n${indent}</${tagPrefix}${tag}>`;
  };

  const nodeCode = generateNodeCode(node, "    ");
  const contentHash = generateHash(nodeCode);
  const imports = ["import React from 'react';"];
  if (hasAnimations) imports.push("import { motion, AnimatePresence } from 'framer-motion';");

  const finalCode = `
${imports.join("\n")}

/**
 * Figma Layer: ${node.name}
 * ID: ${node.id}
 * Hash: ${contentHash}
 */
export const ${componentName}: React.FC = () => {
${Array.from(new Set(allHandlerDeclarations)).join("\n\n")}

  return (
    ${hasAnimations ? '<AnimatePresence mode="wait">' : ''}
${nodeCode}
    ${hasAnimations ? '</AnimatePresence>' : ''}
  );
};
`;

  files[`${componentName}.tsx`] = finalCode;
  return { code: finalCode, files, hasAnimations, hash: contentHash };
}
