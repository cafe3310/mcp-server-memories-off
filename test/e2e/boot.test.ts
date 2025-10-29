
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { execSync, spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = import.meta.dir.replace('/test/e2e', '');
const distPath = path.join(projectRoot, 'dist', 'index.js');
const tempLibraryPath = path.join(projectRoot, 'test', 'tmp', 'test-library');
const tempLogPath = path.join(projectRoot, 'test', 'tmp');

// More robust helper that handles newline-delimited JSON
function makeRequest(serverProcess: ChildProcess, request: any, callback: (response: any) => void) {

  const requestString = JSON.stringify(request) + '\n';
  let buffer = '';

  const onData = (data: Buffer) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    if (lines.length > 1) {
      buffer = lines.pop()!;
      const completeLine = lines[0];
      try {
        const response = JSON.parse(completeLine || '');
        serverProcess.stdout?.removeListener('data', onData); // Clean up: only want one response
        callback(response);
      } catch (e) {
        console.error('Failed to parse JSON from server:', completeLine, e);
        // Keep listening if parsing fails, maybe it was a partial line
      }
    }
  };

  serverProcess.stdout?.on('data', onData);
  serverProcess.stdin?.write(requestString, (err) => {
    if (err) {
      console.error('Failed to write to stdin:', err);
    }
  });
}

describe('E2E Boot and Core Tools', () => {
  let serverProcess: ChildProcess;

  beforeAll(() => {
    if (fs.existsSync(tempLibraryPath)) {
      fs.rmSync(tempLibraryPath, { recursive: true, force: true });
    }
    fs.mkdirSync(tempLibraryPath, { recursive: true });
    fs.writeFileSync(path.join(tempLibraryPath, 'meta.md'), '# Test Library');

    console.log('Building project for E2E tests...');
    execSync('bun run build', { stdio: 'inherit' });

    console.log('Starting server...');
    const env = {
      ...process.env,
      MEM_NAME: 'memory',
      MEM_VERSION: '2',
      MEM_LIBRARIES: `test-library:${tempLibraryPath}`,
      MCP_LOG_DIR: `${tempLogPath}`,
    };
    serverProcess = spawn('bun', [distPath], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    expect(serverProcess.pid).toBeDefined();
    console.log(`Server started with PID: ${serverProcess.pid}`);

    serverProcess.stderr?.on('data', (data) => {
      console.error(`Server STDERR: ${data}`);
    });
  });

  afterAll(() => {
    if (serverProcess && serverProcess.pid) {
      console.log(`Killing server process ${serverProcess.pid}`);
      try {
        process.kill(serverProcess.pid);
      } catch (e) { /* Ignore */ }
    }
    if (fs.existsSync(tempLibraryPath)) {
      fs.rmSync(tempLibraryPath, { recursive: true, force: true });
    }
  });

  test('should respond to ping', (done) => {
    const request = { jsonrpc: '2.0', id: 1, method: 'ping' };
    makeRequest(serverProcess, request, (response) => {
      expect(response).toEqual({ jsonrpc: '2.0', id: 1, result: {} });
      done();
    });
  }, 10000);

  test('should list tools and include readManual', (done) => {
    const request = { jsonrpc: '2.0', id: 2, method: 'tools/list' };
    makeRequest(serverProcess, request, (response) => {
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(2);
      expect(response.result).toBeDefined();
      expect(Array.isArray(response.result.tools)).toBe(true);

      const readManualTool = response.result.tools.find((tool: any) => tool.name === 'readManual');
      expect(readManualTool).toBeDefined();
      expect(readManualTool.description).toBe('读取指定知识库中的 `meta.md` 文件，获取其完整内容');
      done();
    });
  }, 10000);
});
