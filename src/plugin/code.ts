import { figmaToCSS } from "../core/converters/layoutConverter";
import { generateReactComponent } from "../core/generators/reactGenerator";
import { extractAnimations } from "../core/extractors/animationExtractor";
import { DEFAULT_CONFIG, PluginConfig } from "../core/config";
import { detectCollisions } from "../core/utils/collisionDetector";
import { calculateMetrics } from "../core/utils/codeMetrics";
import { extractDesignTokens } from "../design-system/extractDesignTokens";
import { generateLockfile } from "../vibecode-guard/generateLockfile";
import { generatePromptContext } from "../vibecode-guard/generatePromptContext";

let currentConfig: PluginConfig = DEFAULT_CONFIG;

figma.showUI(__html__, { width: 600, height: 800 });

figma.clientStorage.getAsync("plugin_settings").then((settings) => {
  if (settings) {
    currentConfig = { ...DEFAULT_CONFIG, ...settings };
  }
  figma.ui.postMessage({ type: "settings-loaded", config: currentConfig });
});

figma.ui.onmessage = async (msg) => {
  if (msg.type === "save-settings") {
    currentConfig = msg.config;
    figma.clientStorage.setAsync("plugin_settings", currentConfig);
    updateSelection();
  } else if (msg.type === "validate-node") {
    const selection = figma.currentPage.selection;
    if (selection.length > 0) {
      const node = selection[0];
      const bytes = await node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 1 } });
      figma.ui.postMessage({ type: "validation-image", bytes, width: node.width, height: node.height });
    }
  } else if (msg.type === "generate-guard") {
    const tokens = extractDesignTokens([figma.root]);
    const lockfile = generateLockfile(figma.root.name, figma.fileKey || 'local', tokens);
    const promptContext = generatePromptContext(tokens);
    figma.ui.postMessage({ type: "guard-data", lockfile, promptContext, tokens });
  }
};

function extractProperties(node: BaseNode): any {
  const props: any = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  if ("reactions" in node) {
    props.reactions = clone((node as any).reactions);
    props.animations = extractAnimations(node, figma.getNodeById);
  }

  if ("x" in node) props.x = node.x;
  if ("y" in node) props.y = node.y;
  if ("width" in node) props.width = node.width;
  if ("height" in node) props.height = node.height;
  if ("rotation" in node) props.rotation = node.rotation;

  if ("visible" in node) props.visible = node.visible;
  if ("opacity" in node) props.opacity = node.opacity;
  if ("blendMode" in node) props.blendMode = node.blendMode;

  if ("constraints" in node) props.constraints = node.constraints;

  if ("cornerRadius" in node) props.cornerRadius = node.cornerRadius === figma.mixed ? "mixed" : node.cornerRadius;
  if ("topLeftRadius" in node) props.topLeftRadius = node.topLeftRadius;
  if ("topRightRadius" in node) props.topRightRadius = node.topRightRadius;
  if ("bottomLeftRadius" in node) props.bottomLeftRadius = node.bottomLeftRadius;
  if ("bottomRightRadius" in node) props.bottomRightRadius = node.bottomRightRadius;

  if ("layoutMode" in node) props.layoutMode = node.layoutMode;
  if ("primaryAxisSizingMode" in node) props.primaryAxisSizingMode = node.primaryAxisSizingMode;
  if ("counterAxisSizingMode" in node) props.counterAxisSizingMode = node.counterAxisSizingMode;
  if ("primaryAxisAlignItems" in node) props.primaryAxisAlignItems = node.primaryAxisAlignItems;
  if ("counterAxisAlignItems" in node) props.counterAxisAlignItems = node.counterAxisAlignItems;
  if ("paddingLeft" in node) props.paddingLeft = node.paddingLeft;
  if ("paddingRight" in node) props.paddingRight = node.paddingRight;
  if ("paddingTop" in node) props.paddingTop = node.paddingTop;
  if ("paddingBottom" in node) props.paddingBottom = node.paddingBottom;
  if ("itemSpacing" in node) props.itemSpacing = node.itemSpacing;

  if ("fills" in node) props.fills = clone(node.fills);
  if ("strokes" in node) props.strokes = clone(node.strokes);
  if ("strokeWeight" in node) props.strokeWeight = node.strokeWeight;
  if ("strokeAlign" in node) props.strokeAlign = node.strokeAlign;
  if ("strokeCap" in node) props.strokeCap = node.strokeCap;
  if ("strokeJoin" in node) props.strokeJoin = node.strokeJoin;
  if ("dashPattern" in node) props.dashPattern = node.dashPattern;
  if ("effects" in node) props.effects = clone(node.effects);

  if (node.type === "TEXT") {
    const textNode = node as TextNode;
    props.characters = textNode.characters;
    props.fontName = clone(textNode.fontName);
    props.fontSize = textNode.fontSize === figma.mixed ? "mixed" : textNode.fontSize;
    props.letterSpacing = clone(textNode.letterSpacing);
    props.lineHeight = clone(textNode.lineHeight);
    props.textAlignHorizontal = textNode.textAlignHorizontal;
    props.textAlignVertical = textNode.textAlignVertical;
    props.textDecoration = textNode.textDecoration;
    props.textCase = textNode.textCase;
  }

  if ("children" in node) {
    props.children = node.children.map(child => extractProperties(child));
  }

  props.css = figmaToCSS(node);
  const reactResult = generateReactComponent(node, { getNodeById: figma.getNodeById, config: currentConfig });
  props.reactCode = reactResult.code;
  props.fileCount = Object.keys(reactResult.files).length;
  props.generatedFiles = reactResult.files;

  return props;
}

function clone(val: any): any {
  if (val === figma.mixed) return "mixed";
  const type = typeof val;
  if (val === null) return null;
  if (type === "undefined" || type === "number" || type === "string" || type === "boolean") return val;
  if (type === "object") {
    if (val instanceof Array) return val.map(x => clone(x));
    if (val instanceof Uint8Array) return Array.from(val);
    const ret: any = {};
    for (const key in val) ret[key] = clone(val[key]);
    return ret;
  }
  return val;
}

function updateSelection() {
  const selection = figma.currentPage.selection;
  const collisions = detectCollisions([...selection]);
  const data = selection.map(node => extractProperties(node));
  const metrics = calculateMetrics(data);
  metrics.collisions = collisions.length;
  figma.ui.postMessage({ type: "update-properties", data, metrics, collisions });
}

figma.on("selectionchange", updateSelection);
updateSelection();
