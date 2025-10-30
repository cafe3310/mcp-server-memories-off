import {describe, expect, it, type Mock, spyOn, beforeEach} from 'bun:test';
import '../../test/setup';

import {type LibraryName, type FileWholeLines, type ThingName, FileType} from '../../typings';
import fs from 'fs';
import * as mockSetup from "../../test/setup";
import {getTocList, matchToc, matchTocNoThrow} from "./toc.ts";

const MOCK_LIBRARY_NAME: LibraryName = mockSetup.MOCK_LIBRARY_NAME;
const MOCK_ENTITY_NAME: ThingName = mockSetup.MOCK_ENTITY_NAME;
const MOCK_FILE_CONTENT_LINES: FileWholeLines = mockSetup.MOCK_FILE_CONTENT_LINES_1;

describe('TOC operations', () => {
  const readSpy = spyOn(fs, 'readFileSync') as Mock<(...args: unknown[]) => string>;

  beforeEach(() => {
    readSpy.mockClear();
  });

  it('getTocList', () => {
    const toc = getTocList(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME);

    expect(toc.length).toBe(4);

    expect(toc[0]!.tocLineContent).toBe('# Welcome');
    expect(toc[0]!.lineNumber).toBe(1);

    expect(toc[1]!.tocLineContent.startsWith('## Section 1')).toBe(true);
    expect(toc[1]!.lineNumber).toBe(6);

    expect(toc[2]!.tocLineContent.startsWith('## Section 2')).toBe(true);
    expect(toc[2]!.lineNumber).toBe(12);

    expect(toc[3]!.tocLineContent.startsWith('## Section 3')).toBe(true);
    expect(toc[3]!.lineNumber).toBe(16);
  });

  it('matchToc should find a unique TOC item', () => {
    const tocItem = matchToc(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME, 'Section 1: Details');
    expect(tocItem.lineNumber).toBe(6);
    expect(tocItem.tocLineContent).toBe('## Section 1: Details');
  });

  it('matchToc should throw if TOC item not found', () => {
    expect(() => matchToc(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME, 'Non-Existent Section')).toThrow('中未找到与');
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
    expect(() => matchToc(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME, 'section 1 details')).toThrow('发现多个与');

    // Restore the spy to the default mock implementation for subsequent tests
    readSpy.mockImplementation(() => MOCK_FILE_CONTENT_LINES.join('\n'));
  });

  it('matchTocNoThrow should return matches without throwing', () => {
    // Case 1: Unique match
    let matches = matchTocNoThrow(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME, 'Section 1: Details');
    expect(matches.length).toBe(1);
    expect(matches[0]!.lineNumber).toBe(6);

    // Case 2: No match
    matches = matchTocNoThrow(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME, 'Non-Existent Section');
    expect(matches.length).toBe(0);

    // Case 3: Ambiguous match
    const ambiguousTocLines = [
      '# Welcome',
      '## Section 1: Details',
      '## section 1 (details)',
    ] as FileWholeLines;
    readSpy.mockImplementation(() => ambiguousTocLines.join('\n'));
    matches = matchTocNoThrow(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME, 'section 1 details');
    expect(matches.length).toBe(2);

    // Restore spy
    readSpy.mockImplementation(() => MOCK_FILE_CONTENT_LINES.join('\n'));
  });
});
