import {describe, it, expect, beforeEach, type Mock, jest} from 'bun:test';

// Mock the entire shell module using Jest-style mocking.
jest.mock('../shell', () => ({
  readFileLines: jest.fn(),
  replaceInToc: jest.fn(),
  addInToc: jest.fn(),
  deleteInToc: jest.fn(),
}));

// Import the mocked functions so we can spy on them and configure them
import {
  readFileLines,
  replaceInToc,
  addInToc,
  deleteInToc
} from '../shell';

// Import the tools to be tested
import {
  readManualTool,
  editManualSectionTool,
  addManualSectionTool,
  deleteManualSectionTool
} from './manual';

const MOCK_LIBRARY_NAME = 'test-library';

describe('Manual Tools', () => {

  // Before each test, clear call history and reset any specific mock implementations.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readManualTool', () => {
    it('should call readFileLines and return formatted content', () => {
      const mockFileContent = ['Line 1', 'Line 2'];
      (readFileLines as Mock).mockReturnValue(mockFileContent);

      const result = readManualTool.handler({libraryName: MOCK_LIBRARY_NAME});

      expect(readFileLines).toHaveBeenCalledWith(MOCK_LIBRARY_NAME, 'meta.md');
      expect(result).toBe(`---file-start: ${MOCK_LIBRARY_NAME}/meta.md---
Line 1\nLine 2
---file-end---`);
    });

    it('should throw if libraryName is missing', () => {
      expect(() => readManualTool.handler({})).toThrow();
    });
  });

  describe('editManualSectionTool', () => {
    it('should call replaceInToc with correct arguments', () => {
      const args = {
        libraryName: MOCK_LIBRARY_NAME,
        toc: 'Target Section',
        oldContent: 'old line',
        newContent: 'new line',
      };

      const result = editManualSectionTool.handler(args);

      expect(replaceInToc).toHaveBeenCalledWith(
        MOCK_LIBRARY_NAME,
        'meta.md',
        'Target Section',
        {type: 'Lines', contentLines: ['old line']},
        ['new line']
      );
      expect(result).toContain('status: success');
    });
  });

  describe('addManualSectionTool', () => {
    it('should call addInToc with correct arguments', () => {
      const args = {
        libraryName: MOCK_LIBRARY_NAME,
        toc: 'Target Section',
        newContent: 'new line',
      };

      const result = addManualSectionTool.handler(args);

      expect(addInToc).toHaveBeenCalledWith(
        MOCK_LIBRARY_NAME,
        'meta.md',
        'Target Section',
        ['new line']
      );
      expect(result).toContain('status: success');
    });
  });

  describe('deleteManualSectionTool', () => {
    it('should call deleteInToc with correct arguments', () => {
      const args = {
        libraryName: MOCK_LIBRARY_NAME,
        toc: 'Target Section',
        deletingContent: 'line to delete',
      };

      const result = deleteManualSectionTool.handler(args);

      expect(deleteInToc).toHaveBeenCalledWith(
        MOCK_LIBRARY_NAME,
        'meta.md',
        'Target Section',
        ['line to delete']
      );
      expect(result).toContain('status: success');
    });
  });
});
