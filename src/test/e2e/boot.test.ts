
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { ChildProcess } from 'node:child_process';
import {killMcp, resetLibAndBootMcp, callMcp} from "./util.test";

describe('E2E Boot and Core Tools', () => {
  let serverProcess: ChildProcess;

  beforeAll(() => {
    serverProcess = resetLibAndBootMcp();
  });

  afterAll(() => {
    killMcp(serverProcess);
  });

  test('should respond to ping and list tools', async () => {
    // Test ping
    const pingResponse = await callMcp(serverProcess, 'ping', {});
    expect(pingResponse.result).toEqual({}); // User confirmed this is the expected (but quirky) response

    // Test list tools
    const listResponse: any = await callMcp(serverProcess, 'tools/list', {});
    expect(listResponse.result).toBeDefined();
    expect(Array.isArray(listResponse.result.tools)).toBe(true);
    const readManualTool = listResponse.result.tools.find((tool: any) => tool.name === 'readManual');
    expect(readManualTool).toBeDefined();
    expect(readManualTool.description).toBe('读取指定知识库中的 `meta.md` 文件，获取其完整内容');

  }, 15000);
});
