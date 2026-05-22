export interface MappedTransition {
  duration: number;
  ease: number[] | string;
}

export interface ChildDelta {
  name: string;
  x?: number;
  y?: number;
  opacity?: number;
  rotation?: number;
  width?: number;
  height?: number;
  fill?: string;
}

export interface MappedInteraction {
  trigger: string;
  actionType: string;
  destinationId?: string;
  destinationName?: string;
  transition?: MappedTransition;
  childDeltas?: Record<string, ChildDelta>;
}

export interface ExtractedAnimation {
  nodeId: string;
  nodeName: string;
  interactions: MappedInteraction[];
}

const EASING_MAP: Record<string, number[] | string> = {
  EASE_IN: [0.42, 0, 1, 1],
  EASE_OUT: [0, 0, 0.58, 1],
  EASE_IN_AND_OUT: [0.42, 0, 0.58, 1],
  LINEAR: "linear",
  GENTLE: [0.25, 0.1, 0.25, 1],
  QUICK: [0.15, 0, 0.15, 1],
  BOUNCY: [0.68, -0.6, 0.32, 1.6],
};

const TRIGGER_MAP: Record<string, string> = {
  ON_CLICK: "click",
  ON_HOVER: "hover",
  ON_PRESS: "press",
  ON_DRAG: "drag",
  AFTER_TIMEOUT: "delay",
  MOUSE_ENTER: "mouseEnter",
  MOUSE_LEAVE: "mouseLeave",
  WHILE_HOVERING: "whileHover",
  WHILE_PRESSING: "whileTap",
};

function calculateChildDeltas(sourceNode: any, destNode: any): Record<string, ChildDelta> {
  const deltas: Record<string, ChildDelta> = {};
  if (!sourceNode.children || !destNode.children) return deltas;
  const sourceChildren = new Map(sourceNode.children.map((c: any) => [c.name, c]));
  const destChildren = new Map(destNode.children.map((c: any) => [c.name, c]));
  for (const [name, destChild] of destChildren.entries()) {
    const sourceChild: any = sourceChildren.get(name);
    if (sourceChild) {
      const delta: ChildDelta = { name };
      if (sourceChild.x !== destChild.x) delta.x = destChild.x - sourceChild.x;
      if (sourceChild.y !== destChild.y) delta.y = destChild.y - sourceChild.y;
      if (sourceChild.opacity !== destChild.opacity) delta.opacity = destChild.opacity;
      deltas[name] = delta;
    }
  }
  return deltas;
}

export function extractAnimations(node: any, getNodeById?: (id: string) => any): ExtractedAnimation | null {
  if (!node.reactions || node.reactions.length === 0) return null;
  const interactions: MappedInteraction[] = node.reactions.map((reaction: any) => {
    const mapped: MappedInteraction = {
      trigger: TRIGGER_MAP[reaction.trigger?.type] || reaction.trigger?.type,
      actionType: reaction.action?.type,
    };
    if (reaction.action?.destinationId) {
      mapped.destinationId = reaction.action.destinationId;
      const lookup = getNodeById || (typeof figma !== 'undefined' ? figma.getNodeById : undefined);
      if (lookup) {
        try {
          const destNode = lookup(mapped.destinationId);
          if (destNode) {
            mapped.destinationName = destNode.name;
            if (reaction.action.navigation === "NAVIGATE") {
              mapped.childDeltas = calculateChildDeltas(node, destNode);
            }
          }
        } catch (e) {}
      }
    }
    if (reaction.action?.transition) {
      const t = reaction.action.transition;
      mapped.transition = {
        duration: t.duration || 0.3,
        ease: t.easing ? (EASING_MAP[t.easing] || "easeInOut") : "easeInOut",
      };
    }
    return mapped;
  });
  return { nodeId: node.id, nodeName: node.name, interactions };
}
