import path from "node:path";
import type {FileWholeLines} from "../typings.ts";

const projectRoot = path.join(__dirname, '..', '..');
const tmpDir = path.join(projectRoot, 'tmp');
const testLibraryPath = path.join(tmpDir, 'test-library');
const testLibraryName = 'test-library';

process.env = {
  ...process.env,
  MEM_LOG_DIR: tmpDir,
  MEM_NAME: 'memory',
  MEM_VERSION: '2',
  MEM_LIBRARIES: `${testLibraryName}:${testLibraryPath}`,
}

// This is the same mock data used in the test file.
// It's centralized here to be preloaded.
export const MOCK_FILE_CONTENT_LINES_1 = [
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


export const MOCK_FILE_CONTENT_LINES_2: FileWholeLines = [
  '# Welcome',
  '',
  'This is the introduction.',
  '',
  '## Section 1: Details',
  '',
  'Here is some detail.',
  'Line to be deleted.',
  '',
  '## Section 2: More Details',
  '',
  'Final content here.',
  '',
  '## Section 3: Empty',
];


export const MOCK_LIBRARY_NAME = 'test-library';
export const MOCK_ENTITY_NAME = 'test';
