import {describe, it, expect, beforeEach, spyOn, type Mock, afterAll, jest} from 'bun:test';
import '../test/setup';

import type {FileWholeLines, LibraryName, FileRelativePath, ContentLocator} from '../typings';

// Mock dependencies using the correct `bun:test` API

import shell from 'shelljs';
import * as shellCls from './shell';


import {
  readFileLines,
  getTocList,
  normalize,
  linesMatchContent,
  linesReplace,
  matchToc,
  deleteContent,
  add,
  addInToc,
  deleteInToc,
  createFile,
  replace,
  insertAfter,
  insertInTocAfter,
  replaceInToc
} from './shell';
import fs from 'fs';
import * as mockSetup from "../test/setup";
import {afterEach} from "node:test";

const MOCK_LIBRARY_NAME: LibraryName = mockSetup.MOCK_LIBRARY_NAME;
const MOCK_FILE_RELATIVE_PATH: FileRelativePath = mockSetup.MOCK_FILE_RELATIVE_PATH;
const MOCK_FILE_CONTENT_LINES: FileWholeLines = mockSetup.MOCK_FILE_CONTENT_LINES;

// Restore all mocks after the tests in this file have completed
afterAll(() => {
  jest.restoreAllMocks();
});

// Very small tests to exercise basic helpers
describe('shell helpers (basic)', () => {

  const shellTestSpy = spyOn(shell, 'test') as Mock<(...args: unknown[]) => boolean>;
  const readSpy = spyOn(fs, 'readFileSync') as Mock<(...args: unknown[]) => string>;
  beforeEach(() => {
    readSpy.mockClear();
    readSpy.mockImplementation(() => MOCK_FILE_CONTENT_LINES.join('\n'));
  });

  afterEach(() => {
    shellTestSpy.mockClear();
    readSpy.mockClear();
  })

  it('readFileLines', () => {
    shellTestSpy.mockImplementation(() => true); // Mock file does not exist
    const lines = readFileLines(MOCK_LIBRARY_NAME, MOCK_FILE_RELATIVE_PATH, 'root');
    expect(lines).toEqual(MOCK_FILE_CONTENT_LINES);
  });

  it('getTocList', () => {
    const toc = getTocList(MOCK_LIBRARY_NAME, MOCK_FILE_RELATIVE_PATH, 'root');

    expect(toc.length).toBe(4);

    expect(toc[0]!.tocLineContent).toBe('# Welcome');
    expect(toc[0]!.lineNumber).toBe(1);

    expect(toc[1]!.tocLineContent.startsWith('## Section 1')).toBe(true);
    expect(toc[1]!.lineNumber).toBe(6);

    expect(toc[2]!.tocLineContent.startsWith('## Section 2')).toBe(true);
    expect(toc[2]!.lineNumber).toBe(12);
  });

  it('normalize', () => {
    expect(normalize('  ## Section 1: Details,  ')).toBe('section 1 details');
    expect(normalize('Another Example (with parens!)')).toBe('another example with parens');
    expect(normalize('  Multiple   Spaces  ')).toBe('multiple spaces');
    expect(normalize('A Title\nWith Newlines')).toBe('a title with newlines');
  });

  it('toTocLine', () => {
    expect(shellCls.toTocLine('My Section')).toBe('## my section');
    expect(shellCls.toTocLine(' Another Section: Details ', 3)).toBe('### another section details');
  });
});

describe('shell line operations', () => {

  it('linesMatchContent should find a unique content block', () => {
    const contentToFind = ['Here is some detail.', 'Line to be deleted.'];
    const lineNumber = linesMatchContent(MOCK_FILE_CONTENT_LINES, contentToFind);
    expect(lineNumber).toBe(8);
  });

  it('linesMatchContent should throw if content not found', () => {
    const contentToFind = ['This content does not exist.'];
    expect(() => linesMatchContent(MOCK_FILE_CONTENT_LINES, contentToFind)).toThrow('未找到匹配的内容块。');
  });

  it('linesMatchContent should throw if content is not unique', () => {
    const duplicatedLines = [...MOCK_FILE_CONTENT_LINES, 'Here is some detail.', 'Line to be deleted.'] as FileWholeLines;
    const contentToFind = ['Here is some detail.', 'Line to be deleted.'];
    expect(() => linesMatchContent(duplicatedLines, contentToFind)).toThrow('发现多个匹配的内容块，请提供更精确的定位。');
  });

  it('linesReplace should replace a block of lines', () => {
    const newContent = ['This is new content.'];
    const result = linesReplace(MOCK_FILE_CONTENT_LINES, 8, 10, newContent);
    expect(result[7]).toBe(newContent[0]!);
    expect(result.length).toBe(MOCK_FILE_CONTENT_LINES.length - 2);
  });

  it('linesReplace should delete a block of lines if new content is empty', () => {
    const result = linesReplace(MOCK_FILE_CONTENT_LINES, 8, 10, []);
    expect(result[7]).toBe('');
    expect(result.length).toBe(MOCK_FILE_CONTENT_LINES.length - 3);
  });
});

describe('shell TOC operations', () => {

  const readSpy = spyOn(fs, 'readFileSync') as Mock<(...args: unknown[]) => string>;

  beforeEach(() => {
    readSpy.mockClear();
  });

  it('matchToc should find a unique TOC item', () => {
    const tocItem = matchToc(MOCK_LIBRARY_NAME, MOCK_FILE_RELATIVE_PATH, 'Section 1: Details', 'root');
    expect(tocItem.lineNumber).toBe(6);
    expect(tocItem.tocLineContent).toBe('## Section 1: Details');
  });

  it('matchToc should throw if TOC item not found', () => {
    expect(() => matchToc(MOCK_LIBRARY_NAME, MOCK_FILE_RELATIVE_PATH, 'Non-Existent Section', 'root')).toThrow('中未找到与');
  });

  it('matchToc should throw if TOC item is ambiguous', () => {
    // Create content where two different titles normalize to the same string
    const ambiguousTocLines = [
      '# Welcome',
      '## Section 1: Details', // normalizes to 'section 1 details'
      'Some content',
      '## section 1 (details)', // also normalizes to 'section 1 details'
    ] as FileWholeLines;

    readSpy.mockImplementation(() => ambiguousTocLines.join('\n'));

    // Use the normalized string that causes ambiguity
    expect(() => matchToc(MOCK_LIBRARY_NAME, MOCK_FILE_RELATIVE_PATH, 'section 1 details', 'root')).toThrow('发现多个与');

    // Restore the spy to the default mock implementation for subsequent tests
    readSpy.mockImplementation(() => MOCK_FILE_CONTENT_LINES.join('\n'));
  });

  it('matchTocNoThrow should return matches without throwing', () => {
    // Case 1: Unique match
    let matches = shellCls.matchTocNoThrow(MOCK_LIBRARY_NAME, MOCK_FILE_RELATIVE_PATH, 'Section 1: Details', 'root');
    expect(matches.length).toBe(1);
    expect(matches[0]!.lineNumber).toBe(6);

    // Case 2: No match
    matches = shellCls.matchTocNoThrow(MOCK_LIBRARY_NAME, MOCK_FILE_RELATIVE_PATH, 'Non-Existent Section', 'root');
    expect(matches.length).toBe(0);

    // Case 3: Ambiguous match
    const ambiguousTocLines = [
      '# Welcome',
      '## Section 1: Details',
      '## section 1 (details)',
    ] as FileWholeLines;
    readSpy.mockImplementation(() => ambiguousTocLines.join('\n'));
    matches = shellCls.matchTocNoThrow(MOCK_LIBRARY_NAME, MOCK_FILE_RELATIVE_PATH, 'section 1 details', 'root');
    expect(matches.length).toBe(2);

    // Restore spy
    readSpy.mockImplementation(() => MOCK_FILE_CONTENT_LINES.join('\n'));
  });
});

describe('shell file content modifications', () => {

  const readSpy = spyOn(fs, 'readFileSync') as Mock<(...args: unknown[]) => string>;
  const writeSpy = spyOn(fs, 'writeFileSync') as Mock<(...args: unknown[]) => void>;

  beforeEach(() => {
    readSpy.mockClear();
    writeSpy.mockClear();
  });

  it('deleteContent should remove the specified lines from the file', () => {
    const contentToDelete = ['Line to be deleted.'];
    deleteContent(MOCK_LIBRARY_NAME, MOCK_FILE_RELATIVE_PATH, contentToDelete, 'root');

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const writtenContent = writeSpy.mock.calls[0]![1] as string;
    expect(writtenContent).not.toInclude('Line to be deleted.');
    expect(writtenContent.split('\n').length).toBe(MOCK_FILE_CONTENT_LINES.length - 1);
  });

  it('add should append content to the end of the file', () => {
    const contentToAdd = ['// New final line'];
    add(MOCK_LIBRARY_NAME, MOCK_FILE_RELATIVE_PATH, contentToAdd, 'root');

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const writtenContent = writeSpy.mock.calls[0]![1] as string;
    expect(writtenContent.endsWith('\n// New final line')).toBe(true);
  });

  it('addInToc should add content within a specified TOC section', () => {
    const contentToAdd = ['> A new quote.'];
    addInToc(MOCK_LIBRARY_NAME, MOCK_FILE_RELATIVE_PATH, 'Section 2: More Details', contentToAdd, 'root');

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const writtenContent = writeSpy.mock.calls[0]![1] as string;
    const lines = writtenContent.split('\n');
    // It should be inserted after "Final content here." (line 14) and before "## Section 3: Empty" (line 15)
    expect(lines[14]).toBe('> A new quote.');
    expect(lines[15]).toBe('## Section 3: Empty');
  });

  it('deleteInToc should delete content within a specified TOC section', () => {
    const contentToDelete = ['Here is some detail.'];
    deleteInToc(MOCK_LIBRARY_NAME, MOCK_FILE_RELATIVE_PATH, 'Section 1: Details', contentToDelete, 'root');

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const writtenContent = writeSpy.mock.calls[0]![1] as string;
    expect(writtenContent).not.toInclude('Here is some detail.');
    const lines = writtenContent.split('\n');
    expect(lines[7]).toBe('Line to be deleted.');
  });

  it('deleteInToc should throw if content is not in the specified TOC section', () => {
    const contentToDelete = ['Final content here.']; // This is in Section 2
    expect(() => deleteInToc(MOCK_LIBRARY_NAME, MOCK_FILE_RELATIVE_PATH, 'Section 1: Details', contentToDelete, 'root'))
      .toThrow('未找到匹配的内容块。');
  });

  it('replace should substitute content based on line numbers', () => {
    const newContent = ['Replaced content.'];
    const oldContentLocator = {
      type: 'NumbersAndLines',
      beginLineNumber: 8,
      endLineNumber: 8,
      beginContentLine: 'Here is some detail.',
      endContentLine: 'Here is some detail.'
    } as ContentLocator;
    replace(MOCK_LIBRARY_NAME, MOCK_FILE_RELATIVE_PATH, oldContentLocator, newContent, 'root');
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const writtenContent = writeSpy.mock.calls[0]![1] as string;
    expect(writtenContent).toInclude('Replaced content.');
    expect(writtenContent).not.toInclude('Here is some detail.');
  });

  it('insertAfter should add content after a specific block', () => {
    const contentToAdd = ['Appended line.'];
    const afterContent = ['This is the introduction.'];
    insertAfter(MOCK_LIBRARY_NAME, MOCK_FILE_RELATIVE_PATH, contentToAdd, afterContent, 'root');
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const writtenContent = writeSpy.mock.calls[0]![1] as string;
    const lines = writtenContent.split('\n');
    expect(lines[3]).toBe('Appended line.');
  });

  it('insertInTocAfter should add content after a specific line within a TOC', () => {
    const contentToAdd = ['A detail about the detail.'];
    const afterContent = ['Here is some detail.'];
    insertInTocAfter(MOCK_LIBRARY_NAME, MOCK_FILE_RELATIVE_PATH, 'Section 1: Details', contentToAdd, afterContent, 'root');
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const writtenContent = writeSpy.mock.calls[0]![1] as string;
    const lines = writtenContent.split('\n');
    expect(lines[8]).toBe('A detail about the detail.');
  });

  it('replaceInToc should replace content within a specific TOC section', () => {
    const newContent = ['Replaced detail.'];
    replaceInToc(MOCK_LIBRARY_NAME, MOCK_FILE_RELATIVE_PATH, 'Section 1: Details', {
      type: 'Lines',
      contentLines: ['Here is some detail.']
    }, newContent, 'root');

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const writtenContent = writeSpy.mock.calls[0]![1] as string;
    const lines = writtenContent.split('\n');
    expect(lines[7]).toInclude('Replaced detail.');
    expect(writtenContent).not.toInclude('Here is some detail.');
  });
});

describe('createFile', () => {

  const shellTestSpy = spyOn(shell, 'test') as Mock<(...args: unknown[]) => boolean>;
  const readSpy = spyOn(fs, 'readFileSync') as Mock<(...args: unknown[]) => string>;
  const writeSpy = spyOn(fs, 'writeFileSync') as Mock<(...args: unknown[]) => void>;

  beforeEach(() => {
    shellTestSpy.mockClear();
    readSpy.mockClear();
    writeSpy.mockClear();
  });

  afterEach(() => {
    shellTestSpy.mockClear();
    readSpy.mockClear();
    writeSpy.mockClear();
  })

  it('should create a file if it does not exist', () => {
    shellTestSpy.mockImplementation(() => false); // Mock file does not exist
    const newContent: FileWholeLines = ['new file content'] as FileWholeLines;
    createFile(MOCK_LIBRARY_NAME, 'new-file.md', newContent, 'root');
    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect(writeSpy.mock.calls[0]![1]).toBe('new file content');
  });

  it('should throw an error if the file already exists', () => {
    shellTestSpy.mockImplementation(() => true); // Mock file exists
    const newContent: FileWholeLines = ['new file content'] as FileWholeLines;
    expect(() => createFile(MOCK_LIBRARY_NAME, 'existing-file.md', newContent, 'root')).toThrow('文件已存在，无法创建');
  });
});
