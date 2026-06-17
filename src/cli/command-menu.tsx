import React from 'react';
import { Box, Text } from 'ink';
import type { CommandDef } from './commands';

interface PopupItem {
  label: string;
  description: string;
  type?: 'command' | 'flag' | 'value';
}

interface CommandMenuProps {
  items: PopupItem[];
  selectedIndex: number;
  visible: boolean;
  maxVisible?: number;
}

export function CommandMenu({ items, selectedIndex, visible, maxVisible = 10 }: CommandMenuProps) {
  if (!visible || items.length === 0) return null;

  const start = Math.max(0, Math.min(selectedIndex - Math.floor(maxVisible / 2), items.length - maxVisible));
  const visibleItems = items.slice(start, start + maxVisible);
  const hasMore = items.length > maxVisible;
  const remaining = items.length - start - visibleItems.length;

  return (
    <Box flexDirection="column" marginLeft={2} borderStyle="round" borderColor="gray">
      {visibleItems.map((item, i) => {
        const actualIndex = start + i;
        const isSelected = actualIndex === selectedIndex;
        return (
          <Box key={`${item.label}-${i}`}>
            <Box width={2}>
              {isSelected ? <Text color="cyan">{'>'}</Text> : <Text> </Text>}
            </Box>
            <Box>
              {isSelected ? (
                <Text backgroundColor="cyan" color="black">
                  {item.type === 'flag' ? `  ${item.label}` : `  ${item.label}`}
                </Text>
              ) : (
                <Text>
                  {item.type === 'command' ? (
                    <Text bold color="#FF6B35">
                      {' '}{item.label}
                    </Text>
                  ) : item.type === 'flag' ? (
                    <Text color="cyan">
                      {' '}{item.label}
                    </Text>
                  ) : (
                    <Text>
                      {' '}{item.label}
                    </Text>
                  )}
                </Text>
              )}
              <Text dimColor>
                {' '}{item.description}
              </Text>
            </Box>
          </Box>
        );
      })}
      {hasMore && remaining > 0 && (
        <Text dimColor>
          {'  '}└ and {remaining} more...
        </Text>
      )}
    </Box>
  );
}

export function buildPopupItems(commands: CommandDef[], query: string): PopupItem[] {
  if (!query.startsWith('/')) return [];

  const lower = query.slice(1).toLowerCase();
  const items: PopupItem[] = [];

  for (const cmd of commands) {
    if (cmd.name.slice(1).toLowerCase().includes(lower) || cmd.aliases.some(a => a.slice(1).toLowerCase().includes(lower))) {
      const aliases = cmd.aliases.length > 1
        ? cmd.aliases.slice(1).map(a => a).join(', ')
        : '';
      items.push({
        label: cmd.name,
        description: cmd.description + (aliases ? ` (${aliases})` : ''),
        type: 'command',
      });
    }
  }

  return items;
}

export function buildFlagItems(flagCompletions: { flag: string; description: string; values?: { value: string; description: string }[] }[]): PopupItem[] {
  return flagCompletions.map(f => ({
    label: f.flag,
    description: f.description,
    type: 'flag' as const,
  }));
}

export function buildValueItems(values: { value: string; description: string }[]): PopupItem[] {
  return values.map(v => ({
    label: v.value,
    description: v.description,
    type: 'value' as const,
  }));
}
