import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { killMcp, resetLibAndBootMcp, callMcp, tempLibraryPath } from "./util.test";
import type { ChildProcess } from 'node:child_process';
import path from 'path';
import shell from 'shelljs';
import fs from 'fs';
import yaml from 'yaml';

describe('E2E Backup Tool', () => {
  let serverProcess: ChildProcess;
  const libraryName = 'test-library';

  beforeAll(() => {
    serverProcess = resetLibAndBootMcp();
    // Add some dummy files to the library for backup AFTER resetting it
    fs.writeFileSync(path.join(tempLibraryPath, 'entity1.md'), 'content1');
    fs.writeFileSync(path.join(tempLibraryPath, 'entity2.md'), 'content2');
    fs.mkdirSync(path.join(tempLibraryPath, 'subdir'));
    fs.writeFileSync(path.join(tempLibraryPath, 'subdir', 'entity3.md'), 'content3');
  });

  afterAll(() => {
    killMcp(serverProcess);
  });

  it('should create a backup of the library', async () => {
    const response = await callMcp(serverProcess, 'tools/call', { name: 'backupLibrary', arguments: { libraryName } });
    const result = yaml.parse(response.result);

    expect(result.status).toBe('success');
    expect(result.backup_file).toMatch(new RegExp(`^${libraryName}-\\d{14}\\.zip$`));
    expect(result.file_count).toBeGreaterThanOrEqual(4); // 3 files + 1 dir

    const backupFilePath = path.join(tempLibraryPath, 'backups', result.backup_file);
    expect(shell.test('-f', backupFilePath)).toBe(true);

    // Verify zip contents
    const zipContents = shell.exec(`unzip -l "${backupFilePath}"`, { silent: true }).stdout;
    expect(zipContents).toContain('entity1.md');
    expect(zipContents).toContain('entity2.md');
    expect(zipContents).toContain('subdir/entity3.md');

    // 确认 zip 的内容并没有 backups 在里面
    expect(zipContents).not.toContain(' backups/');
  });
});
