import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import {
  killMcp,
  resetLibAndBootMcp,
  metaFilePath,
  expectFileTotalLines, callMcp
} from "./util.test";

describe('E2E Manual Tools Lifecycle', () => {
  let serverProcess: ChildProcess;

  beforeAll(() => {
    serverProcess = resetLibAndBootMcp();
  });

  afterAll(() => {
    killMcp(serverProcess);
  });

  test('should perform a full lifecycle of operations on meta.md', async () => {
    // Step 1: Read meta.md, confirm it's empty initially
    let response = await callMcp(serverProcess, 'tools/call', { name: 'readManual', arguments: { libraryName: 'test-library' } });
    expect(response.result).toBe(`---file-start: test-library/meta.md---

---file-end---`);

    // Step 2: Add a new section, confirm success response and section added
    const toc1 = 'First Section';
    const content1 = 'Hello, world!';
    response = await callMcp(serverProcess, 'tools/call', {
      name: 'addManualSection',
      arguments: { libraryName: 'test-library', toc: toc1, newContent: content1 },
    });
    expect(response.result).toContain('success');
    expectFileTotalLines(metaFilePath, [
      '## first section',
      'Hello, world!',
    ]); // Expecting 4 lines: toc, blank, content, blank

    // Step 3: Read meta.md to confirm the new section exists
    response = await callMcp(serverProcess, 'tools/call', { name: 'readManual', arguments: { libraryName: 'test-library' } });
    let fileContent = fs.readFileSync(metaFilePath, 'utf-8');
    expect(fileContent).toContain(`## ${toc1.toLowerCase()}`);
    expect(fileContent).toContain(content1);
    expect(response.result).toContain(content1);

    // Step 4: Edit the content of the section
    const content2 = 'Content has been updated.';
    response = await callMcp(serverProcess, 'tools/call', {
      name: 'editManualSection',
      arguments: { libraryName: 'test-library', oldContent: content1, newContent: content2 },
    });
    expect(response.result).toContain('success');

    // Step 5: Read meta.md to confirm the content is updated
    response = await callMcp(serverProcess, 'tools/call', { name: 'readManual', arguments: { libraryName: 'test-library' } });
    fileContent = fs.readFileSync(metaFilePath, 'utf-8');
    expect(fileContent).not.toContain(content1);
    expect(fileContent).toContain(content2);
    expect(response.result).toContain(content2);

    // Step 6 & 7: Deleting a section is not tested because a `deleteManualSection` tool is not implemented yet.
    // When it is, the test steps would be:
    // 1. Call the delete tool.
    // 2. Assert the success response.
    // 3. Call readManual again and assert the content is gone.

  }, 20000); // 20s timeout for the whole sequence
});
