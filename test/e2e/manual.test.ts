import {afterAll, beforeAll, describe, expect, test} from 'bun:test';
import {execSync, spawn} from 'node:child_process';
import type {ChildProcess} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {killMcp, makeRequest, resetLibAndBootMcp} from "./util.test";

const projectRoot = import.meta.dir.replace('/test/e2e', '');
const distPath = path.join(projectRoot, 'dist', 'index.js');
const tempLibraryPath = path.join(projectRoot, 'test', 'tmp', 'test-library');
const tempLogPath = path.join(projectRoot, 'test', 'tmp');
const metaFilePath = path.join(tempLibraryPath, 'meta.md');

const initialMetaContent = '# Manual Test Library\n\n## Section 1\n\nSome initial content.\n';

describe('E2E Manual Tools', () => {
  let serverProcess: ChildProcess;

  beforeAll(() => {
    serverProcess = resetLibAndBootMcp();
  });

  afterAll(() => {
    killMcp(serverProcess);
  });

  // 开始测试。我们的测试是对一个初始状态为空的 library 进行连续操作，
  // 所以所有操作都在同一个 test case 里完成，以保持状态连续性。

  // 1. 先读取 meta.md，确认初始内容正确（空白）
  // 2. 添加一个新章节，确认添加成功
  // 3. 读取 meta.md，确认新章节存在
  // 4. 编辑一个章节内容，确认编辑成功
  // 5. 读取 meta.md，确认编辑内容正确反映
  // 6. 删除一个章节，确认删除成功
  // 7. 读取 meta.md，确认章节已删除

  test('readManual should return the full content of meta.md', (done) => {
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'readManual',
        arguments: {libraryName: 'test-library'},
      },
    };

    makeRequest(serverProcess, request, (response) => {
      const expectedOutput = `---file-start: test-library/meta.md---
${initialMetaContent}
---file-end---`;
      console.log('Received response:', response);
      expect(response.result).toBe(expectedOutput);


      const newSectionToc = 'Section 2';
      const standardNewSectionToc = 'section 2';
      const newSectionContent = 'Content for the new section.';
      const request = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'addManualSection',
          arguments: {
            libraryName: 'test-library',
            toc: newSectionToc,
            newContent: newSectionContent,
          },
        },
      };
      makeRequest(serverProcess, request, (response) => {
        expect(response.result).toContain('success');
        const updatedContent = fs.readFileSync(metaFilePath, 'utf-8');
        expect(updatedContent).toContain(`## ${standardNewSectionToc}`);
        expect(updatedContent).toContain(newSectionContent);


        const oldContent = 'Some initial content.';
        const newContent = 'This content has been updated.';
        const request = {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'editManualSection',
            arguments: {
              libraryName: 'test-library',
              oldContent: oldContent,
              newContent: newContent,
            },
          },
        };

        makeRequest(serverProcess, request, (response) => {
          expect(response.result).toContain('success');
          const updatedContent = fs.readFileSync(metaFilePath, 'utf-8');
          expect(updatedContent).not.toContain(oldContent);
          expect(updatedContent).toContain(newContent);
          done();
        });

      });

    });
  }, 10000);
});
