#!/usr/bin/env node

import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {createServer} from "./create-server.ts";
import {getEnvVar, logfile, logfileE, setLogOutputFile} from "../utils.ts";
import os from "os";

// Environment variables with defaults
const config = {

  // name of the tool, e.g. "mcp-server-memories-off"
  MEM_NAME: getEnvVar('MEM_NAME', 'memory'),

  // path to the memory file, e.g. "/home/user/mcp-server-memories-off.yaml"
  MEM_PATH: getEnvVar('MEM_PATH', `${os.homedir()}/mcp-server-memories-off.yaml`),

  // path to the log file, e.g. "/home/user/logs/"
  MEM_LOG_DIR: getEnvVar('MEM_LOG_DIR', '.'),
}

setLogOutputFile(config.MEM_LOG_DIR);
logfile('index', 'Starting MCP server...');

const server = createServer(config.MEM_NAME, config.MEM_PATH);

async function main() {
  logfile('index', 'Server created, setting up transport...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logfile('index', 'Server started, waiting for connections...');
}

main().catch(error => logfileE('Fatal error in main():', error));
