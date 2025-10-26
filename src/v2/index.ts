import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getEnvVar, logfile, logfileE, setLogOutputFile } from "../utils.ts";

// This is the entry point for the v2 server.
// It creates a minimal MCP server with no tools for now.
export async function runV2() {
    const config = {
        MEM_NAME: getEnvVar('MEM_NAME', 'memory-v2'),
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

    const transport = new StdioServerTransport();
    await server.connect(transport);
    logfile('v2', 'Server v2 started, waiting for connections...');
}
