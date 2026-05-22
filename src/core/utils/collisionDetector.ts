export interface CollisionWarning {
  type: 'exact' | 'caseInsensitive' | 'sanitized' | 'reserved';
  name1: string;
  name2: string;
  figmaId1: string;
  figmaId2: string;
  suggestion: string;
  severity: 'error' | 'warning';
}

const RESERVED_WORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'let', 'static', 'await', 'abstract', 'boolean', 'byte', 'char', 'double', 'final', 'float', 'goto', 'int', 'long', 'native', 'short', 'synchronized', 'transient', 'volatile'
]);

export function detectCollisions(nodes: any[]): CollisionWarning[] {
  const warnings: CollisionWarning[] = [];
  const seenNames = new Map<string, { figmaId: string, originalName: string }>();
  const seenSanitized = new Map<string, { figmaId: string, originalName: string }>();

  nodes.forEach(node => {
    const name = node.name;
    const sanitized = name.replace(/[^a-zA-Z0-9]/g, '');
    const id = node.id;

    // 4. Reserved words
    if (RESERVED_WORDS.has(name.toLowerCase())) {
      warnings.push({
        type: 'reserved',
        name1: name,
        name2: '',
        figmaId1: id,
        figmaId2: '',
        suggestion: `Fig${name.charAt(0).toUpperCase()}${name.slice(1)}`,
        severity: 'error'
      });
    }

    // 1. Exact match
    if (seenNames.has(name)) {
      const other = seenNames.get(name)!;
      if (other.figmaId !== id) {
        warnings.push({
          type: 'exact',
          name1: name,
          name2: name,
          figmaId1: id,
          figmaId2: other.figmaId,
          suggestion: `${name}_${id.replace(':', '_')}`,
          severity: 'error'
        });
      }
    } else {
      seenNames.set(name, { figmaId: id, originalName: name });
    }

    // 2. Case-insensitive & 3. Sanitization
    const lowerSanitized = sanitized.toLowerCase();
    if (seenSanitized.has(lowerSanitized)) {
      const other = seenSanitized.get(lowerSanitized)!;
      if (other.figmaId !== id) {
        warnings.push({
          type: lowerSanitized === other.originalName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() ? 'caseInsensitive' : 'sanitized',
          name1: name,
          name2: other.originalName,
          figmaId1: id,
          figmaId2: other.figmaId,
          suggestion: `${sanitized}_${id.replace(':', '_')}`,
          severity: 'warning'
        });
      }
    } else {
      seenSanitized.set(lowerSanitized, { figmaId: id, originalName: name });
    }
  });

  return warnings;
}
