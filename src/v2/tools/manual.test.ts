import {describe, it, expect, beforeEach, spyOn} from 'bun:test';
import fs from 'fs';
import * as shell from '../shell';
import {readManualTool, updateManualSectionTool, addManualSectionTool, deleteManualSectionTool} from './manual';
import {shellTestMock} from '../../../test/setup';
import type {FileWholeLines} from '../../typings';

// Spies for shell functions
const readFileLinesSpy = spyOn(shell, 'readFileLines');
const writeFileLinesSpy = spyOn(shell, 'writeFileLines');
const getTocListSpy = spyOn(shell, 'getTocList');
const matchTocSpy = spyOn(shell, 'matchToc');
const linesMatchContentSpy = spyOn(shell, 'linesMatchContent');
const linesReplaceSpy = spyOn(shell, 'linesReplace');
const addInTocSpy = spyOn(shell, 'addInToc');
const deleteInTocSpy = spyOn(shell, 'deleteInToc');

// Mock data
const MOCK_LIBRARY_NAME = 'test-library';
const MOCK_META_CONTENT: FileWholeLines = [
  '# Meta',
  '',
  '## Section 1',
  'Old content line 1',
  'Old content line 2',
  '',
  '## Section 2',
  'Some other content',
] as FileWholeLines;

describe('Manual Tools', () => {

  beforeEach(() => {
    // Reset spies before each test
    readFileLinesSpy.mockClear();
    writeFileLinesSpy.mockClear();
    getTocListSpy.mockClear();
    matchTocSpy.mockClear();
    linesMatchContentSpy.mockClear();
    linesReplaceSpy.mockClear();
    addInTocSpy.mockClear();
    deleteInTocSpy.mockClear();

    // Default mock implementations
    readFileLinesSpy.mockReturnValue(MOCK_META_CONTENT);
    getTocListSpy.mockReturnValue([
      {level: 1, lineNumber: 1, tocLineContent: '# Meta'},
      {level: 2, lineNumber: 3, tocLineContent: '## Section 1'},
      {level: 2, lineNumber: 7, tocLineContent: '## Section 2'},
    ]);
    matchTocSpy.mockReturnValue({level: 2, lineNumber: 3, tocLineContent: '## Section 1'});
    linesMatchContentSpy.mockReturnValue(4);
    linesReplaceSpy.mockImplementation((_, __, ___, newLines) => newLines as FileWholeLines);
  });

  describe('readManual', () => {
    it('should call readFileLines and return the content', () => {
      const args = {libraryName: MOCK_LIBRARY_NAME};
      const result = readManualTool.handler(args);

      expect(readFileLinesSpy).toHaveBeenCalledWith(MOCK_LIBRARY_NAME, 'meta.md');
      expect(result.content[0].text).toBe(MOCK_META_CONTENT.join('\n'));
    });
  });

  describe('updateManualSection', () => {
    it('should orchestrate shell functions to update a section', () => {
      const args = {
        libraryName: MOCK_LIBRARY_NAME,
        toc: 'Section 1',
        oldContent: 'Old content line 1\nOld content line 2',
        newContent: 'New content.',
      };

      const result = updateManualSectionTool.handler(args);

      // Verify the orchestration
      expect(readFileLinesSpy).toHaveBeenCalledWith(MOCK_LIBRARY_NAME, 'meta.md');
      expect(getTocListSpy).toHaveBeenCalledWith(MOCK_LIBRARY_NAME, 'meta.md');
      expect(matchTocSpy).toHaveBeenCalledWith(MOCK_LIBRARY_NAME, 'meta.md', 'Section 1');
      expect(linesMatchContentSpy).toHaveBeenCalledWith(
        MOCK_META_CONTENT,
        ['Old content line 1', 'Old content line 2'],
        3, // sectionStartLine
        6  // sectionEndLine
      );
      expect(linesReplaceSpy).toHaveBeenCalledWith(
        MOCK_META_CONTENT,
        4, // beginLineNo
        5, // endLineNo
        ['New content.']
      );
      expect(writeFileLinesSpy).toHaveBeenCalledTimes(1);

      // Verify the success message
      expect(result.status).toBe('success');
      expect(result.message).toInclude('Section \'## Section 1\' in meta.md was updated');
    });
  });

  describe('addManualSection', () => {
    it('should call addInToc with correct arguments', () => {
      const args = {
        libraryName: MOCK_LIBRARY_NAME,
        toc: 'Section 1',
        newContent: 'Newly added line.',
      };
      const result = addManualSectionTool.handler(args);

      expect(addInTocSpy).toHaveBeenCalledWith(
        MOCK_LIBRARY_NAME,
        'meta.md',
        'Section 1',
        ['Newly added line.']
      );
      expect(result.status).toBe('success');
    });
  });

  describe('deleteManualSection', () => {
    it('should call deleteInToc with correct arguments', () => {
      const args = {
        libraryName: MOCK_LIBRARY_NAME,
        toc: 'Section 1',
        deletingContent: 'Old content line 1',
      };
      const result = deleteManualSectionTool.handler(args);

      expect(deleteInTocSpy).toHaveBeenCalledWith(
        MOCK_LIBRARY_NAME,
        'meta.md',
        'Section 1',
        ['Old content line 1']
      );
      expect(result.status).toBe('success');
    });
  });
});
