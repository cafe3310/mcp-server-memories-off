process.env["MEM_LIBRARIES"] = `test-library:/Users/sipan/workspace/mcp-server-memories-off/test/test-library`;

import {mock, spyOn} from 'bun:test';

// This is the same mock data used in the test file.
// It's centralized here to be preloaded.
export const MOCK_FILE_CONTENT_LINES = [
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
];

export const shellTestMock = mock(() => true);

// Mock the 'shelljs' module.
// The 'test' function will always return true.
await mock.module('shelljs', () => ({
  default: {
    test: shellTestMock,
  }
}));

// Test data
export const MOCK_LIBRARY_NAME = 'test-library';
export const MOCK_FILE_RELATIVE_PATH = 'test.md';
