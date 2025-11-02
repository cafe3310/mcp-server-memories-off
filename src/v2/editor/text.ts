
import type {FrontMatterLine} from "../../typings.ts";

// (str) => str
// 标题标准化函数：去掉首尾空白、多余空白、标点符号，小写化
export function normalize(str: string): string {
  // 1. 多个空白归一化为单个空格
  str = str.replace(/\s+/g, ' ');

  // 2. 移除所有标点符号（中文和英文）
  str = str.replace(/[.,\\/#!$%^&*;:{}=\-_`~()，。、《》？；：‘’“”【】（）…]/g, '');

  // 移除换行符
  str = str.replace(/[\r\n]/g, '');

  // 3. 小写化
  str = str.toLowerCase();

  // 4. 去掉首尾空白
  return str.trim();
}

// (str) => str
// 标准化[调用理由]: 限制长度到 80, 去掉首尾空白/连续空白/符号
export function normalizeReason(str?: string): string {

  if (!str) {
    return '';
  }

  // 1. 多个空白归一化为单个空格
  str = str.replace(/\s+/g, ' ');

  // 2. 移除所有符号（中文和英文）
  str = str.replace(/[.,\\/#!$%^&*;:{}=\-_`~()，。、《》？；：‘’“”【】（）…]/g, '');

  // 3. 移除换行符
  str = str.replace(/[\r\n]/g, '');

  // 4. trim
  str = str.trim();

  // 5. 限制长度到 80, 超过补 '…'
  if (str.length > 80) {
    str = str.slice(0, 78) + '…';
  }

  return str;
}

// (str) => str
// YAML Key 标准化函数：去掉首尾空白、多余空白、标点符号，让结果可以被安全地用作 YAML Key 和 Value
function normalizeYamlKey(str: string): string {
  // 1. 多个空白归一化为单个空格
  str = str.replace(/\s+/g, ' ');

  // 3. 替换掉所有 yaml 关键字符号
  str = str.replace(/[:\-?[\]{}#,&*!|>'"%@`]/g, '');

  // 2. 移除换行符
  str = str.replace(/[\r\n]/g, '');

  // 4. 小写化
  str = str.toLowerCase();

  // 5. 去掉首尾空白
  return str.trim();
}

export function normalizeFrontMatterLine(str: FrontMatterLine): FrontMatterLine {
  // 从第一个 ':' 处分割键值对，然后分别 normalize 键和值
  // 如果没有 ':'，则整个行作为键，值为空字符串
  const index = str.indexOf(':');
  if (index === -1) {
    return normalizeYamlKey(str);
  } else {
    const key = str.slice(0, index).trim();
    const value = str.slice(index + 1).trim();
    return `${normalizeYamlKey(key)}: ${value}`;
  }
}

// (str) => str
// 普通文本转换成标题函数：先标准化，再加上 #（默认 2 级）
export function toTocLine(str: string, level = 2): string {
  const normalized = normalize(str);
  const hashes = '#'.repeat(level);
  return `${hashes} ${normalized}`;
}
