#!/usr/bin/env node

import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {createServer} from "./createServer.ts";
import {logfile, logfileE} from "./utils.ts";

logfile('index', 'Starting MCP server...');

const server = createServer();

logfile('index', 'Server created, setting up transport...');

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logfile('index', 'Server started, waiting for connections...');
}

main().catch((error) => {
  logfileE('Fatal error in main():', error);
});
