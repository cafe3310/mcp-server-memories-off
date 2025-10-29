import path from "node:path";
import {ChildProcess, execSync, spawn} from "node:child_process";
import fs from "node:fs";
import {expect} from "bun:test";

const projectRoot = import.meta.dir.replace('/test/e2e', '');
export const distPath = path.join(projectRoot, 'dist', 'index.js');
export const tempLibraryPath = path.join(projectRoot, 'test', 'tmp', 'test-library');
export const tempLogPath = path.join(projectRoot, 'test', 'tmp');

// Helper to send requests and receive responses
export function makeRequest(serverProcess: ChildProcess, request: any, callback: (response: any) => void) {

  const requestString = JSON.stringify(request) + '\n';
  let buffer = '';

  const onData = (data: Buffer) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    let response: unknown;
    if (lines.length > 1) {
      buffer = lines.pop()!;
      const completeLine = lines[0];
      try {
        response = JSON.parse(completeLine || '');
        serverProcess.stdout?.removeListener('data', onData);
      } catch (e) {
        console.error('Failed to parse JSON from server:', completeLine, e);
        // Keep listening if parsing fails, maybe it was a partial line
      }
      callback(response);
    }
  };

  serverProcess.stdout?.on('data', onData);
  serverProcess.stdin?.write(requestString, (err) => {
    if (err) {
      console.error('Failed to write to stdin:', err);
    }
  });
}

import { jest } from 'bun:test';

export function resetLibAndBootMcp() {

  if (fs.existsSync(tempLibraryPath)) {
    console.log('Cleaning up existing test library', tempLibraryPath);
    fs.rmSync(tempLibraryPath, {recursive: true, force: true});
  }
  console.log('Creating test library directory', tempLibraryPath);
  fs.mkdirSync(tempLibraryPath, {recursive: true});

  console.log('Building project for E2E tests...');
  execSync('bun run build', {stdio: 'inherit'});

  console.log('Starting server...');
  const env = {
    ...process.env,
    MEM_NAME: 'memory',
    MEM_VERSION: '2',
    MEM_LIBRARIES: `test-library:${tempLibraryPath}`,
    MEM_LOG_DIR: `${tempLogPath}`,
  };

  let serverProcess = spawn('bun', [distPath], {
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  expect(serverProcess.pid).toBeDefined();
  console.log(`Server started with PID: ${serverProcess.pid}`);
  serverProcess.stderr?.on('data', (data) => {
    console.error(`Server STDERR: ${data}`);
  });

  return serverProcess;
}

export function killMcp(serverProcess: ChildProcess) {
  if (serverProcess && serverProcess.pid) {
    console.log(`Killing server process ${serverProcess.pid}`);
    try {
      process.kill(serverProcess.pid);
    } catch (e) { /* Ignore */
    }
  }
}


// Helper to generate MCP requests
// 自动管理 id
let id = 0;
export function generateMcpReq(method: 'tools/list' | 'tools/call' | string, args: any = {}) {
  id = id + 1;
  return {
    jsonrpc: '2.0',
    id: id,
    method,
    params: args,
  }
}
