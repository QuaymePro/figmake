import { MappedInteraction } from "./extractAnimations";

export interface GeneratedHandlers {
  functionDeclarations: string[];
  propMappings: Record<string, string>; // Maps trigger type to handler function name
}

/**
 * Sanitizes a name to be a valid JavaScript identifier.
 */
function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "_").replace(/^([0-9])/, "_$1");
}

function toPascalCase(name: string): string {
  return sanitizeName(name)
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

/**
 * Generates React event handlers from Figma interactions.
 */
export function generateHandlers(nodeId: string, nodeName: string, interactions: MappedInteraction[]): GeneratedHandlers {
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
      body = `    // Navigation to ${dest}\n    console.log('Navigating to: ${dest}');\n    // setActiveView('${toPascalCase(dest)}');`;
    } else if (actionType === "URL") {
      handlerName = `handleOpenLink${baseName}`;
      body = `    window.open('${interaction.destinationId || "#"}', '_blank');`;
    } else if (actionType === "SET_VARIABLE") {
      handlerName = `handleUpdateState${baseName}`;
      body = `    console.log('Update variable interaction detected');\n    // setVariable(prev => !prev);`;
    } else {
      handlerName = `handleInteraction${baseName}`;
      body = `    console.log('${interaction.trigger} triggered for ${nodeName}');`;
    }

    if (handlerName) {
      functionDeclarations.push(`  const ${handlerName} = () => {\n${body}\n  };`);
      
      const reactProp = mapTriggerToReactProp(trigger);
      if (reactProp) {
        propMappings[reactProp] = handlerName;
      }
    }
  });

  return { functionDeclarations, propMappings };
}

function mapTriggerToReactProp(trigger: string): string | null {
  const map: Record<string, string> = {
    click: "onClick",
    hover: "onMouseEnter", // whileHover is handled by motion, but we might want mouseEnter
    mouseEnter: "onMouseEnter",
    mouseLeave: "onMouseLeave",
    press: "onMouseDown",
    drag: "onDrag",
  };
  return map[trigger] || null;
}
