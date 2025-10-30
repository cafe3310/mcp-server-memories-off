import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getEnvVar, logfile, setLogOutputFile } from "../utils.ts";
import { manualTools } from "./tools/manual.ts";
import { entityTools } from "./tools/entity.ts";
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type {McpHandlerDefinition} from "../typings.ts";

// This is the entry point for the v2 server.
export async function runV2() {
  const config = {
    MEM_NAME: getEnvVar('MEM_NAME', 'memory'),
    MEM_LOG_DIR: getEnvVar('MEM_LOG_DIR', '.'),
  }
  setLogOutputFile(config.MEM_LOG_DIR);
  logfile('v2', 'Starting MCP server v2...');

  const server = new Server({
    name: config.MEM_NAME,
    version: "2.0.0",
  }, {
    capabilities: {
      tools: {},
    },
  });

  // Register tools
  const allTools = [...manualTools, ...entityTools];

  // Register request handlers
  const toolTypes = Object.values(allTools).map(t => t.toolType);
  const toolMap: Record<string, McpHandlerDefinition> = {};
  for (const tool of allTools) {
    toolMap[tool.toolType.name] = tool;
  }

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: toolTypes,
  }));

  logfile('v2', `Registered tools: ${toolTypes.map(t => t.name).join(', ')}`);

  // Handler for CallTool requests
  // @ts-expect-error too complex typing
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    logfile('v2', `Received request: ${JSON.stringify(request)}`);
    const { name, arguments: args } = request.params;
    const tool = toolMap[name];
    if (tool?.handler) {
      return await Promise.resolve(tool.handler(args ?? {}));
    }
    throw new Error(`Unknown tool: ${name}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logfile('v2', 'Server v2 started, waiting for connections...');
}
