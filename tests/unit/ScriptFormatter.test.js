/**
 * ScriptFormatter 单元测试
 * 测试Markdown符号清理功能
 */

import { ScriptFormatter } from '../../src/implementations/ai/ScriptFormatter.js';

describe('ScriptFormatter - Markdown Cleanup', () => {
  let formatter;

  beforeEach(() => {
    formatter = new ScriptFormatter();
  });

  test('should remove bold markdown', () => {
    const input = 'This is **bold** text with ***bold italic*** formatting.';
    const output = formatter.cleanAndFormatScript(input);
    expect(output).toBe('This is bold text with bold italic formatting.');
    expect(output).not.toContain('**');
    expect(output).not.toContain('***');
  });

  test('should remove italic markdown', () => {
    const input = 'This is *italic* text and _also italic_.';
    const output = formatter.cleanAndFormatScript(input);
    expect(output).toBe('This is italic text and also italic.');
    expect(output).not.toContain('*');
    expect(output).not.toContain('_');
  });

  test('should remove strikethrough markdown', () => {
    const input = 'This is ~~strikethrough~~ text.';
    const output = formatter.cleanAndFormatScript(input);
    expect(output).toBe('This is strikethrough text.');
    expect(output).not.toContain('~~');
  });

  test('should remove heading markers', () => {
    const input = '# Chapter 1\n\nContent here\n\n## Section 2\n\nMore content\n\n### Subsection';
    const output = formatter.cleanAndFormatScript(input);
    expect(output).toBe('Chapter 1\n\nContent here\n\nSection 2\n\nMore content\n\nSubsection');
    expect(output).not.toContain('#');
  });

  test('should remove unordered list markers', () => {
    const input = '- Item 1\n- Item 2\n* Another item\n+ Plus item';
    const output = formatter.cleanAndFormatScript(input);
    expect(output).toBe('Item 1\n\nItem 2\n\nAnother item\n\nPlus item');
    expect(output).not.toContain('-');
    expect(output).not.toContain('*');
    expect(output).not.toContain('+');
  });

  test('should remove ordered list markers', () => {
    const input = '1. First item\n2. Second item\n10. Tenth item';
    const output = formatter.cleanAndFormatScript(input);
    expect(output).toBe('First item\n\nSecond item\n\nTenth item');
    expect(output).not.toContain('1.');
    expect(output).not.toContain('2.');
    expect(output).not.toContain('10.');
  });

  test('should remove blockquote markers', () => {
    const input = '> This is a quote\n> Another line of quote';
    const output = formatter.cleanAndFormatScript(input);
    expect(output).toBe('This is a quote\n\nAnother line of quote');
    expect(output).not.toContain('>');
  });

  test('should remove horizontal rules', () => {
    const input = 'Content above\n\n---\n\nContent below\n\n***\n\nMore content\n\n___';
    const output = formatter.cleanAndFormatScript(input);
    expect(output).toBe('Content above\n\nContent below\n\nMore content');
    expect(output).not.toContain('---');
    expect(output).not.toContain('***');
    expect(output).not.toContain('___');
  });

  test('should remove inline code markers', () => {
    const input = 'Use the `console.log()` function to debug.';
    const output = formatter.cleanAndFormatScript(input);
    expect(output).toBe('Use the console.log() function to debug.');
    expect(output).not.toContain('`');
  });

  test('should remove code blocks', () => {
    const input = 'Here is some code:\n\n```\nfunction test() {\n  return true;\n}\n```\n\nEnd of code.';
    const output = formatter.cleanAndFormatScript(input);
    expect(output).toBe('Here is some code:\n\nEnd of code.');
    expect(output).not.toContain('```');
    expect(output).not.toContain('function test()');
  });

  test('should handle complex markdown combinations', () => {
    const input = `# **Important** Notice\n\n> **Please note:** This is a *critical* update.\n\n### Steps to follow:\n1. **Step 1:** Do something\n2. *Step 2:* Do another thing\n\n---\n\nUse \`code\` in your implementation.`;

    const output = formatter.cleanAndFormatScript(input);

    expect(output).toBe('Important Notice\n\nPlease note: This is a critical update.\n\nSteps to follow:\n\nStep 1: Do something\n\nStep 2: Do another thing\n\nUse code in your implementation.');
    expect(output).not.toContain('#');
    expect(output).not.toContain('**');
    expect(output).not.toContain('*');
    expect(output).not.toContain('>');
    expect(output).not.toContain('1.');
    expect(output).not.toContain('2.');
    expect(output).not.toContain('---');
    expect(output).not.toContain('`');
  });

  test('should preserve normal text and punctuation', () => {
    const input = 'This is normal text. It has punctuation! And numbers: 123, 456. Also: colons, semicolons; and dashes - work fine.';
    const output = formatter.cleanAndFormatScript(input);
    expect(output).toBe(input);
  });

  test('should handle empty and null inputs', () => {
    expect(formatter.cleanAndFormatScript('')).toBe('');
    expect(formatter.cleanAndFormatScript(null)).toBe('');
    expect(formatter.cleanAndFormatScript(undefined)).toBe('');
  });

  test('should maintain paragraph formatting', () => {
    const input = 'First paragraph.\n\n\n\nSecond paragraph.\n\n\nThird paragraph.';
    const output = formatter.cleanAndFormatScript(input);
    expect(output).toBe('First paragraph.\n\nSecond paragraph.\n\nThird paragraph.');
  });

  test('should log formatting statistics', () => {
    const input = '# **Bold** heading\n\n- List item 1\n- List item 2\n\nNormal text.';
    const output = formatter.cleanAndFormatScript(input);

    // Verify the output is clean
    expect(output).toBe('Bold heading\n\nList item 1\n\nList item 2\n\nNormal text.');
    expect(output).not.toContain('#');
    expect(output).not.toContain('**');
    expect(output).not.toContain('-');
  });
});
