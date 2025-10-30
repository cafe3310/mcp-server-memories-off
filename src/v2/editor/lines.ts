
import type {FileWholeLines, LineNumber} from "../../typings.ts";
import {checks} from "../../utils.ts";

// linesVerifyBeginEnd(lines, beginLineNo, endLineNo, beginLine, endLine, searchStartLine?, searchEndLine?) => void
// 检查给定的行数组中，从 beginLineNo 到 endLineNo 的内容，开头和结尾与 beginLine 和 endLine 匹配。
// 如果设置了 searchStartLine 和 searchEndLine，则只在该范围内进行检查。
// 若不匹配，则抛出错误。
export function linesVerifyBeginEnd(lines: FileWholeLines,
                                    beginLineNo: LineNumber, endLineNo: LineNumber,
                                    beginLine: string, endLine: string,
                                    searchStartLine?: LineNumber, searchEndLine?: LineNumber): void {
  const startIndex = (searchStartLine ? searchStartLine - 1 : 0);
  const endIndex = (searchEndLine ? searchEndLine - 1 : lines.length - 1);
  checks(beginLineNo - 1 >= startIndex && endLineNo - 1 <= endIndex, `指定的行号范围超出搜索范围。`);
  const actualBeginLine = lines[beginLineNo - 1];
  checks(actualBeginLine === beginLine, `起始行在第 ${beginLineNo} 行不匹配。`);
  const actualEndLine = lines[endLineNo - 1];
  checks(actualEndLine === endLine, `结束行在第 ${endLineNo} 行不匹配。`);
}

// linesMatchContent(lines, contentLines, searchStartLine?, searchEndLine?) => LineNumber
// 在给定的行数组中，检查是否存在与 contentLines 完全匹配的连续行段，且是唯一的匹配。
// 如果设置了 searchStartLine 和 searchEndLine，则只在该范围内进行检查。
// 若找到唯一匹配，返回起始行号（从 1 开始计数）；否则抛出异常。
export function linesMatchContent(lines: FileWholeLines,
                                  contentLines: string[],
                                  searchStartLine?: LineNumber, searchEndLine?: LineNumber): LineNumber {
  const startIndex = (searchStartLine ? searchStartLine - 1 : 0);
  const endIndex = (searchEndLine ? searchEndLine - 1 : lines.length - 1);
  const matches: LineNumber[] = [];
  for (let i = startIndex; i <= endIndex - contentLines.length + 1; i++) {
    const segment = lines.slice(i, i + contentLines.length);
    if (segment.join('\n') === contentLines.join('\n')) {
      matches.push(i + 1); // 转换为从 1 开始计数的行号
    }
  }
  checks(matches.length !== 0, `未找到匹配的内容块。`);
  checks(matches.length === 1, `发现多个匹配的内容块，请提供更精确的定位。`);
  return matches[0]!;
}

// linesReplace(lines, beginLineNo, endLineNo, newContentLines) => FileWholeLines
// 在给定的行数组中，将从 beginLineNo 到 endLineNo 的行替换为 newContentLines，返回新的行数组。
export function linesReplace(lines: FileWholeLines,
                             beginLineNo: LineNumber, endLineNo: LineNumber,
                             newContentLines: string[]): FileWholeLines {
  const beginIndex = beginLineNo - 1;
  const endIndex = endLineNo - 1;
  const before = lines.slice(0, beginIndex);
  const after = lines.slice(endIndex + 1);

  if (newContentLines.length === 0) {
    // 删除操作
    return [...before, ...after] as FileWholeLines;
  } else {
    // 替换或插入操作
    return [...before, ...newContentLines, ...after] as FileWholeLines;
  }
}
