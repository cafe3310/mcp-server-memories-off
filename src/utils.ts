import fs from "fs";

// 条件断言，不满足则抛异常并记录日志
export function checks(condition: boolean, message: string): asserts condition {
  if (!condition) {
    const err = new Error(message);
    logfileE('Checks failed', err);
    throw err;
  }
}

// 检查对象属性及类型
export function checkObjHas<T>(x: unknown, key: string, valueType: string): asserts x is T {
  if (
    typeof x !== "object" ||
    x === null ||
    !(key in x) ||
    typeof (x as Record<string, unknown>)[key] !== valueType
  ) {
    const err = new Error(`Type check failed: ${key} is not ${valueType}`);
    logfileE('checkObjHas', err);
    throw err;
  }
}

// 日志相关
let logConsole: Console = console;

export function logfile(componentName: string, ...args: unknown[]) {
  logConsole.error(componentName, ...args);
}

export function logfileV(componentName: string, ...args: unknown[]) {
  logConsole.error(componentName, ...args);
}

export function logfileE(componentName: string, error: unknown, ...args: unknown[]) {
  logConsole.error(componentName, error, ...args);
}

// 设置日志输出文件
export function setLogOutputFile(dir: string) {
  const date = new Date().toISOString().split("T")[0];
  const file = `${dir}/mcp-server-memories-off-log-${date}.log`;
  console.error('mcp-server-memories-off log file is at', file);
  logConsole = new console.Console(fs.createWriteStream(file, { flags: 'a' }));
}

// 获取环境变量，未设置则返回默认值并记录
export function getEnvVar(key: string, def: string): string {
  const val = process.env[key];
  if (val === undefined) {
    logfile('utils', `Env ${key} not set, using default: ${def}`);
    return def;
  }
  logfile('utils', `Env ${key}: ${val}`);
  return val;
}
