import React from "react";
import { extractNodeStyles } from "./figmaStylesToCSS";
/**
 * Simple hash function for browser/plugin compatibility.
 */
function generateHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}

/**
 * Sanitizes a string to be a valid JavaScript identifier.
 */
function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "_").replace(/^([0-9])/, "_$1");
}

/**
 * Converts a name to PascalCase for component names.
 */
function toPascalCase(name: string): string {
  return sanitizeName(name)
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

import { PluginConfig, DEFAULT_CONFIG } from "./config";
import { generateHandlers } from "./generateHandlers";

/**
 * Recursively generates React TSX code for a Figma node.
 */
export function generateReactComponent(node: any, options: { componentName?: string, getNodeById?: (id: string) => any, config?: PluginConfig } = {}): { code: string, files: Record<string, string>, hasAnimations: boolean, hash: string } {
  const config = options.config || DEFAULT_CONFIG;
  const files: Record<string, string> = {};
  const componentName = options.componentName || toPascalCase(node.name, config.naming);
  const getNodeById = options.getNodeById;
  let hasAnimations = false;
  const allHandlerDeclarations: string[] = [];

  const generateNodeCode = (n: any, indent: string = "  ", parentAnimations?: any): string => {
    // ... animation extraction ...
    const styles = extractNodeStyles(n);
    const motionProps: any = {};
    const eventHandlers: Record<string, string> = {};
    
    if (n.animations && n.animations.interactions.length > 0) {
      if (config.animations !== 'css') {
        hasAnimations = true;
        // Handle Framer Motion or GSAP...
      }
      
      const { functionDeclarations, propMappings } = generateHandlers(n.id, n.name, n.animations.interactions, config);
      allHandlerDeclarations.push(...functionDeclarations);
      Object.assign(eventHandlers, propMappings);
    }
    // ... rest of generation logic ...

    // ... layout logic ...

    const styleAttr = `style={${JSON.stringify(styles, null, 2).replace(/"([^"]+)":/g, '$1:')}}`;
    const motionAttr = Object.keys(motionProps).length > 0 
      ? ` ${Object.entries(motionProps).map(([k, v]) => `${k}={${JSON.stringify(v)}}`).join(" ")}` 
      : "";
    const handlerAttr = Object.keys(eventHandlers).length > 0
      ? ` ${Object.entries(eventHandlers).map(([k, v]) => `${k}={${v}}`).join(" ")}`
      : "";
    const syncAttrs = `data-figma-id="${n.id}"`;

    const tagPrefix = Object.keys(motionProps).length > 0 ? "motion." : "";

    if (n.type === "TEXT") {
      return `${indent}<${tagPrefix}span ${syncAttrs}${handlerAttr} ${styleAttr}${motionAttr}>${n.characters}</${tagPrefix}span>`;
    }

    if (n.type === "VECTOR" || n.type === "STAR" || n.type === "POLYGON" || n.type === "ELLIPSE" && !n.cornerRadius) {
        return `${indent}<${tagPrefix}div ${syncAttrs}${handlerAttr} ${styleAttr}${motionAttr}>/* SVG Placeholder */</${tagPrefix}div>`;
    }

    const childrenCode = n.children ? n.children.map((child: any) => generateNodeCode(child, indent + "  ", n.animations)).join("\n") : "";

    let tag = "div";
    if (n.type === "GROUP") return childrenCode;
    if (n.type === "SECTION") tag = "section";

    return `${indent}<${tagPrefix}${tag} ${syncAttrs}${handlerAttr} ${styleAttr}${motionAttr}>\n${childrenCode}\n${indent}</${tagPrefix}${tag}>`;
  };

  const nodeCode = generateNodeCode(node, "    ");
  const uniqueHandlers = Array.from(new Set(allHandlerDeclarations));
  // ... rest of imports and finalCode ...
  const finalCode = `
${imports.join("\n")}

/**
 * Figma Layer: ${node.name}
 * ID: ${node.id}
 * Hash: ${contentHash}
 */
export const ${componentName}: React.FC = () => {
${uniqueHandlers.join("\n\n")}

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
