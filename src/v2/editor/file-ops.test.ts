import {afterEach, describe, expect, it, type Mock, spyOn, beforeEach} from 'bun:test';
import '../../test/setup';

import {type LibraryName, type FileWholeLines, type ThingName, FileType} from '../../typings';
import shell from 'shelljs';
import fs from 'fs';
import * as mockSetup from "../../test/setup";
import {createFile, readFileLines} from "./file-ops.ts";

const MOCK_LIBRARY_NAME: LibraryName = mockSetup.MOCK_LIBRARY_NAME;
const MOCK_ENTITY_NAME: ThingName = mockSetup.MOCK_ENTITY_NAME;
const MOCK_FILE_CONTENT_LINES: FileWholeLines = mockSetup.MOCK_FILE_CONTENT_LINES_1;

describe('file operations', () => {
  const shellTestSpy = spyOn(shell, 'test') as Mock<(...args: unknown[]) => boolean>;
  const readSpy = spyOn(fs, 'readFileSync') as Mock<(...args: unknown[]) => string>;
  const writeSpy = spyOn(fs, 'writeFileSync') as Mock<(...args: unknown[]) => void>;

  beforeEach(() => {
    shellTestSpy.mockClear();
    readSpy.mockClear();
    writeSpy.mockClear();
    readSpy.mockImplementation(() => MOCK_FILE_CONTENT_LINES.join('\n'));
  });

  afterEach(() => {
    shellTestSpy.mockClear();
    readSpy.mockClear();
    writeSpy.mockClear();
  });

  it('readFileLines', () => {
    shellTestSpy.mockImplementation(() => true); // Mock file does not exist
    const lines = readFileLines(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, MOCK_ENTITY_NAME);
    expect(lines).toEqual(MOCK_FILE_CONTENT_LINES);
  });

  it('createFile should create a file if it does not exist', () => {
    shellTestSpy.mockImplementation(() => false); // Mock file does not exist
    const newContent: FileWholeLines = ['new file content'] as FileWholeLines;
    createFile(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, 'new-file.md', newContent);
    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect(writeSpy.mock.calls[0]![1]).toBe('new file content');
  });

  it('createFile should throw an error if the file already exists', () => {
    shellTestSpy.mockImplementation(() => true); // Mock file exists
    const newContent: FileWholeLines = ['new file content'] as FileWholeLines;
    expect(() => createFile(MOCK_LIBRARY_NAME, FileType.FileTypeEntity, 'existing-file.md', newContent)).toThrow('文件已存在，无法创建');
  });
});
