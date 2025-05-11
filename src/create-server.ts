import {GraphManager} from "./graph-manager.ts";
import {Server} from "@modelcontextprotocol/sdk/server/index.js";
import {CallToolRequestSchema, ListToolsRequestSchema} from "@modelcontextprotocol/sdk/types.js";
import {logfile} from "./utils.ts";
import {toolDef, type ToolType} from "./tool-def.ts";

export function createServer(name: string, yamlPath: string) {

  const server = new Server({
    name,
    version: "1.0.0",
  }, {
    capabilities: {
      tools: {},
    },
  });

  const graphManager = new GraphManager(yamlPath);
  const toolTypes: ToolType[] = Object.values(toolDef).map(t => t.toolType);

  // Request handler: list available tools
  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: toolTypes,
  }));

  // Request handler: call a tool
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    logfile('server', `Received request: ${JSON.stringify(request)}`);

    const {name, arguments: args} = request.params;
    const tool = toolDef[name];
    if (tool?.handler) {
      return await tool.handler(graphManager, args??{});
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  return server;
}
