
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
    expect(pingResponse).toContain('result'); // User confirmed this is the expected (but quirky) response

    // Test list tools
    const listResponse = await callMcp(serverProcess, 'tools/list', {});
    expect(listResponse).toBeDefined();
    expect(listResponse).toContain('读取知识库的描述文档');

  }, 15000);
});
