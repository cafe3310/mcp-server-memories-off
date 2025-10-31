import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { ChildProcess } from 'node:child_process';
import {
  killMcp,
  resetLibAndBootMcp,
  metaFilePath,
  expectFileTotalLines,
  callMcp,
} from './util.test';

describe('E2E Manual Tools Lifecycle', () => {
  let serverProcess: ChildProcess;
  const libraryName = 'manual-test-lib';
  const metaFile = metaFilePath(libraryName);

  beforeAll(() => {
    serverProcess = resetLibAndBootMcp(libraryName);
  });

  afterAll(() => {
    killMcp(serverProcess);
  });

  test('should perform a full lifecycle of operations on meta.md', async () => {
    // Step 1: Read meta.md, confirm it's empty initially
    let response = await callMcp(serverProcess, 'tools/call', { name: 'readManual', arguments: { library_name: libraryName } });
    expect(response.result).toBe(`---file-start: ${libraryName}/meta.md---

---file-end---`);

    // Step 2: Add a new section, confirm success response and section added
    const toc1 = 'First Section';
    const content1 = 'Hello, world!';
    response = await callMcp(serverProcess, 'tools/call', {
      name: 'addManualSection',
      arguments: { library_name: libraryName, toc: toc1, newContent: content1 },
    });
    expect(response.result).toContain('success');
    expectFileTotalLines(metaFile, [
      '## first section',
      'Hello, world!',
    ]);

    // Step 3: Read meta.md to confirm the new section exists
    response = await callMcp(serverProcess, 'tools/call', { name: 'readManual', arguments: { library_name: libraryName } });
    expect(response.result).toContain(content1);

    // Step 4: Edit the content of the section
    const content2 = 'Hi.\nContent has been updated.';
    response = await callMcp(serverProcess, 'tools/call', {
      name: 'editManualSection',
      arguments: { library_name: libraryName, oldContent: content1, newContent: content2  },
    });
    expect(response.result).toContain('success');
    expectFileTotalLines(metaFile, [
      '## first section',
      'Hi.',
      'Content has been updated.',
    ]);

    // Step 5: Delete some content from the section, using editManualSection
    const content3 = 'Hi.';
    response = await callMcp(serverProcess, 'tools/call', {
      name: 'editManualSection',
      arguments: { library_name: libraryName, oldContent: content2, newContent: content3  },
    });
    expect(response.result).toContain('success');
    expectFileTotalLines(metaFile, [
      '## first section',
      'Hi.',
    ]);

    // Add another section for further testing
    const toc2 = 'Second Section';
    const content4 = 'This is the second section.';
    response = await callMcp(serverProcess, 'tools/call', {
      name: 'addManualSection',
      arguments: { library_name: libraryName, toc: toc2, newContent: content4 },
    });
    expect(response.result).toContain('success');
    expectFileTotalLines(metaFile, [
      '## first section',
      'Hi.',
      '## second section',
      'This is the second section.',
    ]);

    // Add to the existing first section
    const content5 = 'Additional content in the first section.';
    response = await callMcp(serverProcess, 'tools/call', {
      name: 'addManualSection',
      arguments: { library_name: libraryName, toc: toc1, newContent: content5 },
    });
    expect(response.result).toEqual(`---status: success, message: content added successfully in meta.md---`);
    expectFileTotalLines(metaFile, [
      '## first section',
      'Hi.',
      'Additional content in the first section.',
      '## second section',
      'This is the second section.',
    ]);

    // Read final meta.md to confirm all changes
    response = await callMcp(serverProcess, 'tools/call', { name: 'readManual', arguments: { library_name: libraryName } });
    expect(response.result).toBe(`---file-start: ${libraryName}/meta.md---
## first section
Hi.
Additional content in the first section.
## second section
This is the second section.
---file-end---`);

  }, 10000); // 10s timeout for the whole sequence
});
