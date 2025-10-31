import {afterEach, describe, expect, it, spyOn, beforeEach, type Mock} from 'bun:test';
import '../../test/setup';
import {type FileWholeLines, FileType, type FrontMatterLine, type LibraryName, type ThingName} from '../../typings';
import * as fileOps from './file-ops';
import {locateFrontMatter, readFrontMatterLines, writeFrontMatterLines} from './front-matter';
import * as mockSetup from '../../test/setup';
import {normalizeFrontMatterLine} from "./text.ts";

const MOCK_LIBRARY_NAME: LibraryName = mockSetup.MOCK_LIBRARY_NAME;
const MOCK_ENTITY_NAME: ThingName = mockSetup.MOCK_ENTITY_NAME;

const MOCK_FRONT_MATTER_LINES = [
  'aliases: alias1, alias2',
  'date created: 2023-01-01',
] as FrontMatterLine[];

const MOCK_NORMALIZED_FRONT_MATTER_LINES = MOCK_FRONT_MATTER_LINES.map(normalizeFrontMatterLine);

const MOCK_FILE_CONTENT_WITH_FRONT_MATTER: FileWholeLines = [
  '---',
  ...MOCK_FRONT_MATTER_LINES,
  '---',
  '# Title',
  'Some content here.',
] as FileWholeLines;

const MOCK_FILE_CONTENT_WITHOUT_FRONT_MATTER: FileWholeLines = [
  '# Title',
  'Some content here.',
] as FileWholeLines;

describe('front-matter functions', () => {
  let readSpy: Mock<(...args: any[]) => FileWholeLines>;
  let writeSpy: Mock<(...args: any[]) => void>;

  beforeEach(() => {
    readSpy = spyOn(fileOps, 'readFileLines');
    writeSpy = spyOn(fileOps, 'writeFileLines');
  });

  afterEach(() => {
    readSpy.mockRestore();
    writeSpy.mockRestore();
  });

  describe('locateFrontMatter', () => {
    it('should return start and end line numbers for valid front matter', () => {
      const lines = ['---', 'key: value', '---', 'content'] as FileWholeLines;
      const result = locateFrontMatter(lines);
      expect(result).toEqual({startLineNumber: 1, endLineNumber: 3});
    });

    it('should return null if there is no front matter', () => {
      const lines = ['no front matter'] as FileWholeLines;
      const result = locateFrontMatter(lines);
      expect(result).toBeNull();
    });

    it('should return null for malformed front matter (no closing tag)', () => {
      const lines = ['---', 'key: value'] as FileWholeLines;
      const result = locateFrontMatter(lines);
      expect(result).toBeNull();
    });

    it('should return null for empty file', () => {
      const lines = [] as FileWholeLines;
      const result = locateFrontMatter(lines);
      expect(result).toBeNull();
    });
  });

  describe('readFrontMatterLines', () => {
    it('should read and normalize front matter lines from a file', () => {
      readSpy.mockImplementation(() => MOCK_FILE_CONTENT_WITH_FRONT_MATTER);
      const result = readFrontMatterLines(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME);
      expect(readSpy).toHaveBeenCalledWith(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME);
      expect(result).toEqual(MOCK_NORMALIZED_FRONT_MATTER_LINES);
    });

    it('should return null if the file has no front matter', () => {
      readSpy.mockImplementation(() => MOCK_FILE_CONTENT_WITHOUT_FRONT_MATTER);
      const result = readFrontMatterLines(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME);
      expect(result).toBeNull();
    });
  });

describe('writeFrontMatterLines', () => {
    it('should overwrite existing front matter', () => {
      readSpy.mockImplementation(() => MOCK_FILE_CONTENT_WITH_FRONT_MATTER);
      const newFrontMatter = ['new key: new value'] as FrontMatterLine[];
      writeFrontMatterLines(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME, newFrontMatter);

      const expectedLines = [
        '---',
        'new key: new value',
        '---',
        '# Title',
        'Some content here.'
      ] as FileWholeLines;

      expect(readSpy).toHaveBeenCalledWith(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME);
      expect(writeSpy).toHaveBeenCalledWith(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME, expectedLines);
    });

    it('should add front matter if it does not exist', () => {
      readSpy.mockImplementation(() => MOCK_FILE_CONTENT_WITHOUT_FRONT_MATTER);
      const newFrontMatter = ['new key: new value'] as FrontMatterLine[];
      writeFrontMatterLines(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME, newFrontMatter);

      const expectedLines = [
        '---',
        'new key: new value',
        '---',
        '# Title',
        'Some content here.'
      ] as FileWholeLines;

      expect(readSpy).toHaveBeenCalledWith(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME);
      expect(writeSpy).toHaveBeenCalledWith(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME, expectedLines);
    });
  });
});
