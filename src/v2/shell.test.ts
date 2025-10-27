import {describe, it, mock, expect} from 'bun:test';
import type {FileWholeLines, LibraryName, FileRelativePath} from '../typings';

// Test data
const MOCK_LIBRARY_NAME: LibraryName = 'test-library';
const MOCK_FILE_RELATIVE_PATH: FileRelativePath = 'test.md';

const MOCK_FILE_CONTENT_LINES: FileWholeLines = [
  '# Welcome',
  '',
  'This is the introduction.',
  'It has two lines.',
  '',
  '## Section 1: Details',
  '',
  'Here is some detail.',
  'Line to be deleted.',
  'Another line.',
  '',
  '## Section 2: More Details',
  '',
  'Final content here.',
  '## Section 3: Empty',
  ''
] as FileWholeLines;

// Mock dependencies using the correct `bun:test` API
await mock.module('fs', () => {
  return ({
    readFileSync: mock(() => MOCK_FILE_CONTENT_LINES.join('\n')),
    writeFileSync: mock(() => { return; }),
  });
});
await mock.module('shelljs', () => ({
  test: mock(() => true),
}));

import {readFileLines, getTocList} from './shell';

// Very small tests to exercise basic helpers
describe('shell helpers (basic)', () => {
  it('readFileLines returns the mocked lines', () => {
    const lines = readFileLines(MOCK_LIBRARY_NAME, MOCK_FILE_RELATIVE_PATH);
    expect(lines).toEqual(MOCK_FILE_CONTENT_LINES);
  });

  it('getTocList finds headings with correct line numbers', () => {
    const toc = getTocList(MOCK_LIBRARY_NAME, MOCK_FILE_RELATIVE_PATH);
    expect(toc.length).toBe(4);
    expect(toc[0]!.tocLineContent).toBe('# Welcome');
    expect(toc[0]!.lineNumber).toBe(1);
    expect(toc[1]!.tocLineContent.startsWith('## Section 1')).toBe(true);
    expect(toc[1]!.lineNumber).toBe(6);
    expect(toc[2]!.tocLineContent.startsWith('## Section 2')).toBe(true);
    expect(toc[2]!.lineNumber).toBe(12);
  });
});
