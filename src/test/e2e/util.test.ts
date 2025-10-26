import path from "node:path";
import {ChildProcess, execSync, spawn} from "node:child_process";
import fs from "node:fs";
import {expect} from "bun:test";

// current file: root/src/test/e2e/util.test.ts
// project root: root/
const projectRoot = path.join(__dirname, '..', '..', '..');
export const distPath = path.join(projectRoot, 'dist', 'index.js');
export const tempLogPath = path.join(projectRoot, 'tmp');
export const tempLibraryPath = path.join(projectRoot, 'tmp', 'test-library');
export const metaFilePath = path.join(tempLibraryPath, 'meta.md');

// Helper to send requests and receive responses
export function makeRequest(serverProcess: ChildProcess, request: any, callback: (response: object) => void) {

  const requestString = JSON.stringify(request) + '\n';
  let buffer = '';

  const onData = (data: Buffer) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    let response: object = {};
    if (lines.length > 1) {
      buffer = lines.pop()!;
      const completeLine = lines[0];
      console.error(`TESTING STDOUT:`, `make request on_data`,completeLine);
      try {
        response = JSON.parse(completeLine ?? '{}');
        serverProcess.stdout?.removeListener('data', onData);
      } catch (e) {
        console.error('Failed to parse JSON from server:', completeLine, e);
        // Keep listening if parsing fails, maybe it was a partial line
      }
      console.error(`TESTING STDOUT:`, `make request on_data parsed`, response);
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

export function resetLibAndBootMcp() {

  if (fs.existsSync(tempLibraryPath)) {
    console.log('Cleaning up existing test library', tempLibraryPath);
    fs.rmSync(tempLibraryPath, {recursive: true, force: true});
  }
  console.log('Creating test library directory', tempLibraryPath);
  // Create the main directory and all necessary subdirectories
  fs.mkdirSync(path.join(tempLibraryPath, 'entities'), {recursive: true});
  fs.mkdirSync(path.join(tempLibraryPath, 'trash'), {recursive: true});
  fs.mkdirSync(path.join(tempLibraryPath, 'backups'), {recursive: true});
  fs.mkdirSync(path.join(tempLibraryPath, 'journeys'), {recursive: true});

  // Create an empty meta.md file, which is required by the manual tools
  fs.writeFileSync(path.join(tempLibraryPath, 'meta.md'), '');

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

  const serverProcess = spawn('bun', [distPath], {
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  expect(serverProcess.pid).toBeDefined();
  console.log(`Server started with PID: ${serverProcess.pid}`);
  serverProcess.stderr?.on('data', (data) => {
    console.error(`TESTING STDERR:`, `${data}`);
  });

  return serverProcess;
}

export function killMcp(serverProcess: ChildProcess) {
  if (serverProcess?.pid) {
    console.log(`Killing server process ${serverProcess.pid}`);
    try {
      process.kill(serverProcess.pid);
    } catch (_) {
      void 0;
    }
  }
}

// Helper to generate MCP requests
// 自动管理 id
let id = 0;
export function generateMcpReq(method: 'tools/list' | 'tools/call' | string, args: unknown = {}) {
  id = id + 1;
  return {
    jsonrpc: '2.0',
    id: id,
    method,
    params: args,
  }
}


// 检查文件内容是否和预期的行内容完全一致
export function expectFileTotalLines(filePath: string, expectedLines: string[], allowTrimming = false) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const fileLines = fileContent.split('\n').map(line => allowTrimming ? line.trim() : line);
  const expectedTrimmedLines = expectedLines.map(line => allowTrimming ? line.trim() : line);
  expect(fileLines).toEqual(expectedTrimmedLines);
}

// 检查文件内容是否包含预期的行内容（顺序不限）
export function expectFileContainsLines(filePath: string, expectedLines: string[], allowTrimming = false) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const fileLines = fileContent.split('\n').map(line => allowTrimming ? line.trim() : line);
  for (const expectedLine of expectedLines) {
    const trimmedExpectedLine = allowTrimming ? expectedLine.trim() : expectedLine;
    expect(fileLines).toContain(trimmedExpectedLine);
  }
}

// Promisify makeRequest for async/await syntax
export const callMcp = async (serverProcess: ChildProcess, method: string, params: unknown): Promise<string> => {
  const resp: object = await new Promise((resolve) => {
    const request = generateMcpReq(method, params);
    makeRequest(serverProcess, request, (response: unknown) => {
      resolve(response as object);
    });
  });
  // result { result: object }
  return extractMcpResultText(resp);
};

export function extractMcpResultText(resp: {result: any} | object): string {
  if ('result' in resp) {
    const response = (resp as {result: any}).result;
    console.error(`TESTING STDOUT:`, `extractMcpResultText found result field`, response);
    if (response && Array.isArray(response.content) && response.content.length == 1 && response.content[0].type === 'text') {
      console.error(`TESTING STDOUT:`, `extractMcpResultText found text`, response.content[0].text);
      return response.content[0].text as string;
    }
  }
  console.error(`TESTING STDOUT:`, `extractMcpResultText no valid text found in response`, resp);
  return JSON.stringify(resp);
}
