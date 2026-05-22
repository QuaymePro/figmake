import { MappedInteraction } from "../extractors/animationExtractor";
import { PluginConfig } from "../config";

export interface GeneratedHandlers {
  functionDeclarations: string[];
  propMappings: Record<string, string>;
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "_").replace(/^([0-9])/, "_$1");
}

function toPascalCase(name: string): string {
  return sanitizeName(name)
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

export function generateHandlers(nodeId: string, nodeName: string, interactions: MappedInteraction[], config?: PluginConfig): GeneratedHandlers {
  const functionDeclarations: string[] = [];
  const propMappings: Record<string, string> = {};

  interactions.forEach((interaction, index) => {
    const trigger = interaction.trigger;
    const actionType = interaction.actionType;
    const suffix = interactions.length > 1 ? `_${index}` : "";
    const baseName = `${toPascalCase(nodeName)}${suffix}`;
    
    let handlerName = "";
    let body = "";

    if (actionType === "NODE" || actionType === "NAVIGATE") {
      handlerName = `handleNavigate${baseName}`;
      const dest = interaction.destinationName || interaction.destinationId || "Unknown";
      
      if (config?.routing === 'nextjs') {
        body = `    router.push('/${dest.toLowerCase().replace(/\s+/g, '-')}');`;
      } else if (config?.routing === 'react-router') {
        body = `    navigate('/${dest.toLowerCase().replace(/\s+/g, '-')}');`;
      } else {
        body = `    setActiveView('${toPascalCase(dest)}');`;
      }
    } else if (actionType === "URL") {
      handlerName = `handleOpenLink${baseName}`;
      body = `    window.open('${interaction.destinationId || "#"}', '_blank');`;
    } else {
      handlerName = `handleInteraction${baseName}`;
      body = `    console.log('${interaction.trigger} triggered');`;
    }

    if (handlerName) {
      functionDeclarations.push(`  const ${handlerName} = () => {\n${body}\n  };`);
      const reactProp = mapTriggerToReactProp(trigger);
      if (reactProp) propMappings[reactProp] = handlerName;
    }
  });

  return { functionDeclarations, propMappings };
}

function mapTriggerToReactProp(trigger: string): string | null {
  const map: Record<string, string> = {
    click: "onClick",
    hover: "onMouseEnter",
    mouseEnter: "onMouseEnter",
    mouseLeave: "onMouseLeave",
    press: "onMouseDown",
    drag: "onDrag",
  };
  return map[trigger] || null;
}
