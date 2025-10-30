import {describe, expect, it, type Mock, spyOn, beforeEach, afterEach} from 'bun:test';
import '../../test/setup';

import {
  type ContentLocator,
  type LibraryName,
  type FileWholeLines,
  FileType,
  type ThingName
} from '../../typings';
import fs from 'fs';
import * as mockSetup from "../../test/setup";
import {
  add,
  addInToc,
  deleteContent,
  deleteInToc,
  insertAfter,
  insertInTocAfter,
  replace,
  replaceInToc
} from "./editing.ts";
import shell from "shelljs";

const MOCK_LIBRARY_NAME: LibraryName = mockSetup.MOCK_LIBRARY_NAME;
const MOCK_ENTITY_NAME: ThingName = mockSetup.MOCK_ENTITY_NAME;
const MOCK_FILE_CONTENT_LINES: FileWholeLines = mockSetup.MOCK_FILE_CONTENT_LINES_1;

describe('file content modifications', () => {
  const shellTestSpy = spyOn(shell, 'test') as Mock<(...args: unknown[]) => boolean>;
  const readSpy = spyOn(fs, 'readFileSync') as Mock<(...args: unknown[]) => string>;
  const writeSpy = spyOn(fs, 'writeFileSync') as Mock<(...args: unknown[]) => void>;

  beforeEach(() => {
    shellTestSpy.mockImplementation(() => true);
    readSpy.mockImplementation(() => MOCK_FILE_CONTENT_LINES.join('\n'));
    writeSpy.mockImplementation(() => void 0);
  });

  afterEach(() => {
    shellTestSpy.mockClear();
    readSpy.mockClear();
    writeSpy.mockClear();
  })

  it('deleteContent should remove the specified lines from the file', () => {
    const contentToDelete = ['Line to be deleted.'];
    deleteContent(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME, contentToDelete);

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const writtenContent = writeSpy.mock.calls[0]![1] as string;
    expect(writtenContent).not.toInclude('Line to be deleted.');
    expect(writtenContent.split('\n').length).toBe(MOCK_FILE_CONTENT_LINES.length - 1);
  });

  it('add should append content to the end of the file', () => {
    const contentToAdd = ['// New final line'];
    add(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME, contentToAdd);

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const writtenContent = writeSpy.mock.calls[0]![1] as string;
    expect(writtenContent.endsWith('\n// New final line')).toBe(true);
  });

  it('addInToc should add content within a specified TOC section', () => {
    const contentToAdd = ['> A new quote.'];
    addInToc(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME, 'Section 2: More Details', contentToAdd);

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const writtenContent = writeSpy.mock.calls[0]![1] as string;
    const lines = writtenContent.split('\n');
    // It should be inserted after "Final content here." (line 14) and before "## Section 3: Empty" (line 15)
    expect(lines[14]).toBe('> A new quote.');
    expect(lines[15]).toBe('## Section 3: Empty');
  });

  it('deleteInToc should delete content within a specified TOC section', () => {
    const contentToDelete = ['Here is some detail.'];
    deleteInToc(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME, 'Section 1: Details', contentToDelete);

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const writtenContent = writeSpy.mock.calls[0]![1] as string;
    expect(writtenContent).not.toInclude('Here is some detail.');
    const lines = writtenContent.split('\n');
    expect(lines[7]).toBe('Line to be deleted.');
  });

  it('deleteInToc should throw if content is not in the specified TOC section', () => {
    const contentToDelete = ['Final content here.']; // This is in Section 2
    expect(() => deleteInToc(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME, 'Section 1: Details', contentToDelete))
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
    replace(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME, oldContentLocator, newContent);

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const writtenContent = writeSpy.mock.calls[0]![1] as string;
    expect(writtenContent).toInclude('Replaced content.');
    expect(writtenContent).not.toInclude('Here is some detail.');
  });

  it('insertAfter should add content after a specific block', () => {
    const contentToAdd = ['Appended line.'];
    const afterContent = ['This is the introduction.'];
    insertAfter(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME, contentToAdd, afterContent);

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const writtenContent = writeSpy.mock.calls[0]![1] as string;
    const lines = writtenContent.split('\n');
    expect(lines[3]).toBe('Appended line.');
  });

  it('insertInTocAfter should add content after a specific line within a TOC', () => {
    const contentToAdd = ['A detail about the detail.'];
    const afterContent = ['Here is some detail.'];
    insertInTocAfter(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME, 'Section 1: Details', contentToAdd, afterContent);

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const writtenContent = writeSpy.mock.calls[0]![1] as string;
    const lines = writtenContent.split('\n');
    expect(lines[8]).toBe('A detail about the detail.');
  });

  it('replaceInToc should replace content within a specific TOC section', () => {
    const newContent = ['Replaced detail.'];
    replaceInToc(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME, 'Section 1: Details', {
      type: 'Lines',
      contentLines: ['Here is some detail.']
    }, newContent);

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const writtenContent = writeSpy.mock.calls[0]![1] as string;
    const lines = writtenContent.split('\n');
    expect(lines[7]).toInclude('Replaced detail.');
    expect(writtenContent).not.toInclude('Here is some detail.');
  });
});
