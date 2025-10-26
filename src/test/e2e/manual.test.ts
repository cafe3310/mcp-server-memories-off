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
  const libraryName = 'test-library';
  const metaFile = metaFilePath;

  beforeAll(() => {
    serverProcess = resetLibAndBootMcp();
  });

  afterAll(() => {
    killMcp(serverProcess);
  });

  test('should perform a full lifecycle of operations on meta.md', async () => {

    // Step 1: Read meta.md, confirm it's empty initially
    let response = await callMcp(serverProcess, 'tools/call', { name: 'readManual', arguments: { libraryName: libraryName } });
    expect(response).toContain(`<readManual reason= CONTENT>\n\n</readManual>`);

    // // Step 2: Add a new section, confirm success response and section added
    // const toc1 = 'First Section';
    // const content1 = 'Hello, world!';
    //
    // response = await callMcp(serverProcess, 'tools/call', {
    //   name: 'addManualSection',
    //   arguments: { libraryName: libraryName, toc: toc1, newContent: content1 },
    // });
    // expect(response).toContain('success');
    // expectFileTotalLines(metaFile, [
    //   '## first section',
    //   'Hello, world!',
    // ]);
    //
    // // Step 3: Read meta.md to confirm the new section exists
    // response = await callMcp(serverProcess, 'tools/call', { name: 'readManual', arguments: { libraryName: libraryName } });
    // expect(response).toContain(content1);

    // Step 2: add new lines
    const toc1 = 'First Section';
    const content1 = 'Hello, world!';
    response = await callMcp(serverProcess, 'tools/call', {
      name: 'editManual',
      arguments: { libraryName: libraryName, oldLines: '', newLines: `${'## ' + toc1.toLowerCase()}\n${content1}`  },
    });
    expect(response).toContain('success');
    expectFileTotalLines(metaFile, [
      '## first section',
      'Hello, world!',
    ]);

    // Step 4: Edit the content of the section
    const content2 = 'Hi.\nContent has been updated.';
    response = await callMcp(serverProcess, 'tools/call', {
      name: 'editManual',
      arguments: { libraryName: libraryName, oldLines: content1, newLines: content2  },
    });
    expect(response).toContain('success');
    expectFileTotalLines(metaFile, [
      '## first section',
      'Hi.',
      'Content has been updated.',
    ]);

    // Step 5: Delete some content from the section, using editManualSection
    response = await callMcp(serverProcess, 'tools/call', {
      name: 'editManual',
      arguments: { libraryName: libraryName, oldLines: content2, newLines: '' },
    });
    expect(response).toContain('success');
    expectFileTotalLines(metaFile, [
      '## first section',
      '',
    ]);

    // // Add another section for further testing
    // const toc2 = 'Second Section';
    // const content4 = 'This is the second section.';
    // response = await callMcp(serverProcess, 'tools/call', {
    //   name: 'addManualSection',
    //   arguments: { libraryName: libraryName, toc: toc2, newContent: content4 },
    // });
    // expect(response).toContain('success');
    // expectFileTotalLines(metaFile, [
    //   '## first section',
    //   'Hi.',
    //   '## second section',
    //   'This is the second section.',
    // ]);

    // // Add to the existing first section
    // const content5 = 'Additional content in the first section.';
    // response = await callMcp(serverProcess, 'tools/call', {
    //   name: 'addManualSection',
    //   arguments: { libraryName: libraryName, toc: toc1, newContent: content5 },
    // });
    // expect(response).toContain(`content added successfully in meta.md`);
    // expectFileTotalLines(metaFile, [
    //   '## first section',
    //   'Hi.',
    //   'Additional content in the first section.',
    //   '## second section',
    //   'This is the second section.',
    // ]);

    // Read final meta.md to confirm all changes
    response = await callMcp(serverProcess, 'tools/call', { name: 'readManual', arguments: { libraryName: libraryName } });
    expect(response).toContain(`<readManual reason= CONTENT>\n## first section\n\n</readManual>`);

  }, 10000); // 10s timeout for the whole sequence

  // test('should create meta.md if it does not exist when adding a section', async () => {
  //   // Step 1: Delete meta.md to ensure it does not exist
  //   const fs = require('fs');
  //   if (fs.existsSync(metaFile)) {
  //     fs.unlinkSync(metaFile);
  //   }
  //   expect(fs.existsSync(metaFile)).toBe(false);
  //
  //   // Step 2: Add a new section, which should trigger creation of meta.md
  //   const toc = 'New Section';
  //   const content = 'This file was created from scratch.';
  //   const response = await callMcp(serverProcess, 'tools/call', {
  //     name: 'addManualSection',
  //     arguments: { libraryName: libraryName, toc: toc, newContent: content },
  //   });
  //
  //   // Step 3: Verify the response and the file content
  //   expect(response).toContain('success');
  //   expect(fs.existsSync(metaFile)).toBe(true);
  //   expectFileTotalLines(metaFile, [
  //     '## new section',
  //     'This file was created from scratch.',
  //   ]);
  // }, 10000);
});
