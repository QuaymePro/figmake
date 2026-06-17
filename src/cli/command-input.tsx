import React, { useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { tokenizeInput, type Token } from './tokenizer';
import { getAllCommands } from './commands';

interface CommandInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onSlash: () => void;
}

function renderTokens(tokens: Token[]): React.ReactNode[] {
  const commands = getAllCommands();
  let firstWord = true;
  return tokens.map((t, i) => {
    if (t.type === 'space') return <Text key={i}>{t.raw}</Text>;
    if (t.type === 'quoted') return <Text key={i} color="yellow">{t.raw}</Text>;
    if (t.type === 'url') return <Text key={i} underline color="blue">{t.raw}</Text>;
    if (t.type === 'flag') return <Text key={i} color="cyan">{t.raw}</Text>;
    if (t.type === 'path') return <Text key={i} color="green">{t.raw}</Text>;
    if (firstWord) {
      const lower = t.raw.toLowerCase();
      for (const cmd of commands) {
        if (cmd.name === lower || cmd.aliases.includes(lower)) {
          firstWord = false;
          return <Text key={i} bold color="#FF6B35">{cmd.name}</Text>;
        }
      }
    }
    firstWord = false;
    return <Text key={i}>{t.raw}</Text>;
  });
}

export function CommandInput({ value, onChange, onSubmit, onSlash }: CommandInputProps) {
  const tokens = tokenizeInput(value + ' ');

  useInput((input, key) => {
    if (key.return) {
      onSubmit(value);
      return;
    }

    if (key.backspace || key.delete) {
      onChange(value.slice(0, -1));
      return;
    }

    if (key.escape) {
      return;
    }

    if (input) {
      const newValue = value + input;
      onChange(newValue);
      if (input === '/' && value.length === 0) {
        onSlash();
      }
    }
  });

  return (
    <Box>
      <Box marginRight={1}>
        <Text color="#8B5CF6">{'\u2514\u2500'}</Text>
      </Box>
      {value.length > 0 ? (
        <Text>{renderTokens(tokens)}</Text>
      ) : (
        <Text dimColor>Type a command or /help to start...</Text>
      )}
    </Box>
  );
}
