import {describe, expect, it} from 'bun:test';
import '../../test/setup';

import type {FileWholeLines} from '../../typings';
import {linesMatchContent, linesReplace} from "./lines.ts";
import {MOCK_FILE_CONTENT_LINES_2} from "../../test/setup";

describe('line operations', () => {
  it('linesMatchContent should find a unique content block', () => {
    const contentToFind = ['Here is some detail.', 'Line to be deleted.'];
    const lineNumber = linesMatchContent(MOCK_FILE_CONTENT_LINES_2, contentToFind);
    expect(lineNumber).toBe(7);
  });

  it('linesMatchContent should throw if content not found', () => {
    const contentToFind = ['This content does not exist.'];
    expect(() => linesMatchContent(MOCK_FILE_CONTENT_LINES_2, contentToFind)).toThrow('未找到匹配的内容块。');
  });

  it('linesMatchContent should throw if content is not unique', () => {
    const duplicatedLines = [...MOCK_FILE_CONTENT_LINES_2, 'Here is some detail.', 'Line to be deleted.'] as FileWholeLines;
    const contentToFind = ['Here is some detail.', 'Line to be deleted.'];
    expect(() => linesMatchContent(duplicatedLines, contentToFind)).toThrow('发现多个匹配的内容块，请提供更精确的定位。');
  });

  it('linesReplace should replace a block of lines', () => {
    const newContent = ['This is new content.'];
    const result = linesReplace(MOCK_FILE_CONTENT_LINES_2, 8, 10, newContent);
    expect(result[7]).toBe(newContent[0]!);
    expect(result.length).toBe(MOCK_FILE_CONTENT_LINES_2.length - 2);
  });

  it('linesReplace should delete a block of lines if new content is empty', () => {
    const result = linesReplace(MOCK_FILE_CONTENT_LINES_2, 8, 10, []);
    expect(result[7]).toBe('');
    expect(result.length).toBe(MOCK_FILE_CONTENT_LINES_2.length - 3);
  });
});
