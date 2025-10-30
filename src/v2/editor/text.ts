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
// 普通文本转换成标题函数：先标准化，再加上 #（默认 2 级）
export function toTocLine(str: string, level = 2): string {
  const normalized = normalize(str);
  const hashes = '#'.repeat(level);
  return `${hashes} ${normalized}`;
}
