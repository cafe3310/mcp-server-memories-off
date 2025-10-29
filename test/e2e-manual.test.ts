import {describe, it, expect, beforeAll, afterAll} from 'bun:test';
import {spawn, type ChildProcess} from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as shell from 'shelljs';

const TMP_DIR = path.resolve(process.cwd(), 'test', 'tmp');
const BASELINE_LIB_DIR = path.resolve(process.cwd(), 'test', 'test-library');
const E2E_LIB_DIR = path.resolve(TMP_DIR, 'e2e-test-lib');
const E2E_LIB_NAME = 'e2e-test-lib';
const META_MD_PATH = path.join(E2E_LIB_DIR, 'meta.md');

describe('E2E Manual Tools Test', () => {
  let serverProcess: ChildProcess;
  let requestId = 1;
  const responses = new Map<number, (response: any) => void>();

  beforeAll(() => {
    // 1. Create a fresh, temporary library for the test run by copying the baseline
    shell.rm('-rf', TMP_DIR);
    shell.mkdir('-p', TMP_DIR);
    shell.cp('-R', BASELINE_LIB_DIR, E2E_LIB_DIR);

    // 2. Start the server against the new temporary library
    startServer();
  });

  afterAll(() => {
    serverProcess?.kill();
    shell.rm('-rf', TMP_DIR);
  });

  const startServer = () => {
    const env = {
      ...process.env,
      MCP_LIBRARIES: `${E2E_LIB_NAME}:${E2E_LIB_DIR}`,
    };
    serverProcess = spawn('bun', ['src/v2/index.ts'], {env, stdio: ['pipe', 'pipe', 'pipe']});

    serverProcess.stdout?.on('data', (data) => {
      try {
        const response = JSON.parse(data.toString());
        if (response.id && responses.has(response.id)) {
          responses.get(response.id)?.(response.result);
          responses.delete(response.id);
        }
      } catch (e) {
        console.error("Failed to parse server response:", data.toString());
      }
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error(`Server STDERR: ${data}`);
    });
  };

  const callTool = (method: string, params: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const id = requestId++;
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };
      responses.set(id, resolve);
      serverProcess.stdin?.write(JSON.stringify(request) + '\n', (error) => {
        if (error) {
          reject(error);
        }
      });
    });
  };

  it('should perform a full add-edit-delete workflow on meta.md', async () => {

    // Scenario 1: Add content to an existing section
    await callTool('addManualSection', {
      libraryName: E2E_LIB_NAME,
      toc: 'Section 1: Details',
      newContent: 'Appended line.',
    });
    let content = fs.readFileSync(META_MD_PATH, 'utf-8');
    expect(content).toContain('Here is some detail.\nAppended line.');

    // Scenario 2: Add a completely new section
    await callTool('addManualSection', {
      libraryName: E2E_LIB_NAME,
      toc: 'E2E New Section',
      newContent: 'Content for the new section.',
    });
    content = fs.readFileSync(META_MD_PATH, 'utf-8');
    expect(content).toContain('## e2e new section\n\nContent for the new section.');

    // Scenario 3: Edit existing content
    await callTool('editManualSection', {
      libraryName: E2E_LIB_NAME,
      oldContent: 'This is the introduction.',
      newContent: 'This is the EDITED introduction.',
    });
    content = fs.readFileSync(META_MD_PATH, 'utf-8');
    expect(content).toContain('This is the EDITED introduction.');
    expect(content).not.toContain('This is the introduction.');

    // Scenario 4: Delete content by replacing with an empty string
    await callTool('editManualSection', {
      libraryName: E2E_LIB_NAME,
      oldContent: 'Line to be deleted.',
      newContent: '',
    });
    content = fs.readFileSync(META_MD_PATH, 'utf-8');
    expect(content).not.toContain('Line to be deleted.');

  }, 30000); // Increase timeout for E2E test
});