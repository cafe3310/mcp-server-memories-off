import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  killMcp,
  resetLibAndBootMcp,
  callMcp,
  tempLibraryPath,
} from './util.test';

describe('E2E Entity Tools', () => {
  let serverProcess: ChildProcess;

  beforeAll(() => {
    serverProcess = resetLibAndBootMcp();
  });

  afterAll(() => {
    killMcp(serverProcess);
  });

  test('should create a new entity using createEntity tool', async () => {
    const newEntityName = 'new-test-entity';
    const response = await callMcp(serverProcess, 'tools/call', {
      name: 'createEntity',
      arguments: { libraryName: 'test-library', entityName: newEntityName },
    });

    expect(response.result).toContain('success');

    const newFilePath = path.join(tempLibraryPath, `${newEntityName}.md`);
    const fileExists = fs.existsSync(newFilePath);
    expect(fileExists).toBe(true);
  }, 10000);
});
