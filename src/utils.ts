import fs from "fs";
import * as os from "node:os";

/** 检查条件是否为真，否则抛出异常 */
export function checks(condition: boolean, message: string): asserts condition {
  if (!condition) {
    const err = new Error(message);
    logfileE('Checks failed', err);
    throw err;
  }
}

/** 检查对象 x 是否满足 typeof x[attr] === attr_string，否则抛出异常 */
export function checkObjHas<T>(x: unknown, key: string, valueType: string): asserts x is T {
  if (typeof x === "object" && x !== null && key in x) {
    const value = (x as Record<string, unknown>)[key];
    if (typeof value !== valueType) {
      const err = new Error(`Type check failed: ${key} is not ${valueType}`);
      logfileE('Type check failed', err);
      throw err;
    }
  }
}


/** info 级别日志 */
export function logfile(componentName: string, ...args: unknown[]) {
  logConsole.log(componentName, ...args);
}

/** verbose 级别日志 */
export function logfileV(componentName: string, ...args: unknown[]) {
  logConsole.log(componentName, ...args);
}

/** error 日志 */
export function logfileE(componentName: string, error: unknown, ...args: unknown[]) {
  logConsole.error(componentName, error, ...args);
}

const logConsole = createTmpConsoleOutput();

/** 创建日志文件于 /tmp/mcp-server-memories-off-log-YYYY-MM-DD.log */
function createTmpConsoleOutput(): Console {
  const date = new Date().toISOString().split("T")[0];
  const logFileName = `mcp-server-memories-off-log-${date}.log`;
  const tmpDir = os.tmpdir();
  const logFilePath = `${tmpDir}/${logFileName}`;
  console.error('mcp-server-memories-off log file is at', logFilePath);
  return new console.Console(fs.createWriteStream(logFilePath));
}
