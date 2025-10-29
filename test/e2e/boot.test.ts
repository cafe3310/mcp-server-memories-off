import {afterAll, beforeAll, describe, expect, test} from 'bun:test';
import type {ChildProcess} from 'node:child_process';
import {generateMcpReq, killMcp, makeRequest, resetLibAndBootMcp} from "./util.test";

describe('E2E Boot and Core Tools', () => {

  let serverProcess: ChildProcess;

  beforeAll(() => {
    serverProcess = resetLibAndBootMcp();
  });

  afterAll(() => {
    killMcp(serverProcess);
  });

  test('should respond to ping', (done) => {
    makeRequest(serverProcess, generateMcpReq('ping'), (response) => {
      expect(response).toEqual({ jsonrpc: '2.0', id: 1, result: {} });
      done();
    });
  }, 10000);

  test('should list tools and include readManual', (done) => {
    makeRequest(serverProcess, generateMcpReq('tools/list'), (response) => {
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
