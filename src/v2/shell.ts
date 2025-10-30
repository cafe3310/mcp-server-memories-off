import shell from 'shelljs';
import path from 'path';
import {getLibraryPath} from './runtime.ts';
import {checks} from '../utils.ts';

import fs from 'fs';
import type {
  ContentExactLine,
  ContentLocator,
  FileAbsolutePath,
  FileRelativePath,
  FileWholeLines,
  LibraryName,
  LibraryPath,
  LineNumber,
  TocGlob,
  TocItem,
  TocList
} from "../typings.ts";

// 我们对内容的替换基于行，和 array.shift 类似。
// 我们对标题（toc）行的操作基本上使用模糊匹配。

// region 行编辑操作

// linesVerifyBeginEnd(lines, beginLineNo, endLineNo, beginLine, endLine, searchStartLine?, searchEndLine?) => void
// 检查给定的行数组中，从 beginLineNo 到 endLineNo 的内容，开头和结尾与 beginLine 和 endLine 匹配。
// 如果设置了 searchStartLine 和 searchEndLine，则只在该范围内进行检查。
// 若不匹配，则抛出错误。
function linesVerifyBeginEnd(lines: FileWholeLines,
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

  if (newContentLines.length ===  0) {
    // 删除操作
    return [...before, ...after] as FileWholeLines;
  } else {
    // 替换或插入操作
    return [...before, ...newContentLines, ...after] as FileWholeLines;
  }
}

// endregion
// region 路径操作

// (LibraryName) => LibraryPath
// 获取知识库目录绝对路径
function pathForLib(libraryName: LibraryName): LibraryPath {
  return getLibraryPath(libraryName) as LibraryPath;
}

// (LibraryName, FileRelativePath) => FileAbsolutePath
// 获取知识库内文件的绝对路径
function pathForFile(libraryName: LibraryName, relativePath: FileRelativePath): FileAbsolutePath {
  return path.join(pathForLib(libraryName), relativePath) as FileAbsolutePath;
}

// endregion
// region 标准化

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

// endregion
// region 文件直接读写

// (LibraryName, FileRelativePath) => FileWholeLines
// 读取文件的所有行
export function readFileLines(libraryName: LibraryName, relativePath: FileRelativePath): FileWholeLines {
  const fullPath = pathForFile(libraryName, relativePath);
  checks(shell.test('-f', fullPath), `无法找到文件: ${fullPath}`);
  const fileContent = fs.readFileSync(fullPath, 'utf-8');
  const lines = fileContent.split('\n');
  return lines as FileWholeLines;
}

// (LibraryName, FileRelativePath, FileWholeLines) => void
// 写入文件的所有行
export function writeFileLines(libraryName: LibraryName, relativePath: FileRelativePath, lines: FileWholeLines): void {
  const fullPath = pathForFile(libraryName, relativePath);
  const content = lines.join('\n');
  fs.writeFileSync(fullPath, content, 'utf-8');
}

// endregion
// region 章节标题操作

// getTocList(lib, fileRelPath)
// 获取文件中的所有章节标题及其行号的映射，返回 TocList
export function getTocList(libraryName: LibraryName, relativePath: FileRelativePath): TocList {
  const tocList: TocList = [];
  readFileLines(libraryName, relativePath)
    .forEach((line, index) => {
      if (line.startsWith('#')) {
        const level = (/^#+/.exec(line))?.[0].length ?? 1;
        tocList.push({
          level: level,
          lineNumber: (index + 1),
          tocLineContent: line,
        });
      }
    });
  return tocList;
}

// matchTocNoThrow(lib, file, tocGlob) - 定位 Markdown 文件中的章节标题，采用模糊匹配。
// 匹配方式：标准化后的字符串相等即视为匹配。若找到唯一匹配，返回对应的 `TocBlock`（包含行号与原始标题行）；
// 若未找到或匹配不唯一，则返回 null。
export function matchTocNoThrow(lib: LibraryName, file: FileRelativePath, glob: TocGlob): TocItem[] {
  const tocList = getTocList(lib, file);
  const normalizedGlob = normalize(glob);
  return tocList.filter(item => normalize(item.tocLineContent) === normalizedGlob);
}

// matchToc(lib, file, tocGlob) - 定位 Markdown 文件中的章节标题，采用模糊匹配。
// 匹配方式：标准化后的字符串相等即视为匹配。若找到唯一匹配，返回对应的 `TocBlock`（包含行号与原始标题行）；
// 若未找到或匹配不唯一，则抛出错误并说明文件路径与候选标题。
export function matchToc(lib: LibraryName, file: FileRelativePath, glob: TocGlob): TocItem {
  const matches = matchTocNoThrow(lib, file, glob);
  checks(matches.length !== 0, `在文件 ${pathForFile(lib, file)} 中未找到与 '${glob}' 匹配的章节标题。`);
  checks(matches.length === 1, `发现多个与 '${glob}' 匹配的章节标题，请提供更精确的标题：\n- ${matches.map(m => m.tocLineContent).join('\n- ')}`);
  return matches[0]!;
}

// endregion
// region 编辑操作

//   - replace(path, oldContent: ContentBlock, newContent: ContentBlock): void
//     将文件中唯一匹配的 oldContent 替换为 newContent。
//     如果未找到唯一匹配，则抛错。
export function replace(libraryName: LibraryName, relativePath: FileRelativePath, oldContent: ContentLocator, newContent: ContentExactLine[]): void {
  const lines = readFileLines(libraryName, relativePath);
  let updatedLines: FileWholeLines = [];
  if (oldContent.type === 'NumbersAndLines') {
    linesVerifyBeginEnd(lines, oldContent.beginLineNumber, oldContent.endLineNumber, oldContent.beginContentLine, oldContent.endContentLine);
    updatedLines = linesReplace(lines, oldContent.beginLineNumber, oldContent.endLineNumber, newContent);
  } else if (oldContent.type === 'Lines') {
    const beginLineNo = linesMatchContent(lines, oldContent.contentLines);
    const endLineNo = beginLineNo + oldContent.contentLines.length - 1;
    updatedLines = linesReplace(lines, beginLineNo, endLineNo, newContent);
  }
  checks(updatedLines && updatedLines.length > 0, `替换逻辑未执行，原因未知。`);
  writeFileLines(libraryName, relativePath, updatedLines);
}

//   - replaceInToc(path, toc: TocGlob, oldContent: ContentBlock, newContent: ContentExactLine[]): void
//     在 toc 指定的章节下，将唯一匹配的 oldContent 替换为 newContent。
//     如果 toc 未找到或不唯一，或 oldContent 未找到或不唯一，则抛错。
export function replaceInToc(libraryName: LibraryName, relativePath: FileRelativePath, toc: TocGlob, oldContent: ContentLocator, newContent: ContentExactLine[]): void {
  // 1. 读取文件内容
  const lines = readFileLines(libraryName, relativePath);

  // 2. 定位 toc 并确认其唯一性
  const tocList = getTocList(libraryName, relativePath);
  const matchedToc = matchToc(libraryName, relativePath, toc);
  const tocLineNumber = matchedToc.lineNumber;

  // 3. 在 tocList 中找到下一个标题行，确定章节范围
  const tocIndex = tocList.findIndex(item => item.lineNumber === tocLineNumber);
  const nextToc = tocList[tocIndex + 1];
  const sectionStartLineNumber: LineNumber = tocLineNumber;
  const sectionEndLineNumber: LineNumber = nextToc ? nextToc.lineNumber - 1 : lines.length;

  // 4. 在章节范围内定位 oldContent 并确认其唯一性
  let beginLineNo: LineNumber;
  let endLineNo: LineNumber;
  if (oldContent.type === 'NumbersAndLines') {
    linesVerifyBeginEnd(
      lines,
      oldContent.beginLineNumber,
      oldContent.endLineNumber,
      oldContent.beginContentLine,
      oldContent.endContentLine,
      sectionStartLineNumber,
      sectionEndLineNumber
    );
    beginLineNo = oldContent.beginLineNumber;
    endLineNo = oldContent.endLineNumber;
  } else if (oldContent.type === 'Lines') {
    beginLineNo = linesMatchContent(
      lines,
      oldContent.contentLines,
      sectionStartLineNumber,
      sectionEndLineNumber
    );
    endLineNo = beginLineNo + oldContent.contentLines.length - 1;
  } else {
    throw new Error(`未知的 oldContent 类型`);
  }

  // 5. 执行替换操作
  const updatedLines = linesReplace(lines, beginLineNo, endLineNo, newContent);

  // 6. 写回文件 (use helper)
  writeFileLines(libraryName, relativePath, updatedLines);
}

//   - insertAfter(path, content: ContentExactLine[], afterContent: ContentGlobLine): void
//     在文件中唯一匹配的 afterContent 之后插入 content。
//     如果未找到唯一匹配，则抛错。
export function insertAfter(libraryName: LibraryName, relativePath: FileRelativePath, content: ContentExactLine[], afterContent: ContentExactLine[]): void {
  const lines = readFileLines(libraryName, relativePath);
  const afterLineNo = linesMatchContent(lines, afterContent);
  const updatedLines = linesReplace(
    lines,
    afterLineNo,
    afterLineNo + afterContent.length - 1,
    [...afterContent, ...content]
  );
  writeFileLines(libraryName, relativePath, updatedLines);
}

//   - insertInTocAfter(path, toc: TocGlob, content: ContentExactLine[], afterContent: ContentGlobLine): void
//     在 toc 指定的章节下、唯一匹配的 afterContent 之后插入 content。
//     如果 toc 未找到或不唯一，或 afterContent 未找到或不唯一，则抛错。
//
export function insertInTocAfter(libraryName: LibraryName, relativePath: FileRelativePath, toc: TocGlob, content: ContentExactLine[], afterContent: ContentExactLine[]): void {

  // 1. 读取文件内容
  const lines = readFileLines(libraryName, relativePath);

  // 2. 定位 toc 并确认其唯一性
  const tocList = getTocList(libraryName, relativePath);
  const matchedToc = matchToc(libraryName, relativePath, toc);
  const tocLineNumber = matchedToc.lineNumber;

  // 3. 在 tocList 中找到下一个标题行，确定章节范围
  const tocIndex = tocList.findIndex(item => item.lineNumber === tocLineNumber);
  const nextToc = tocList[tocIndex + 1];
  const sectionStartLineNumber: LineNumber = tocLineNumber;
  const sectionEndLineNumber: LineNumber = nextToc ? nextToc.lineNumber - 1 : lines.length;

  // 4. 在章节范围内定位 afterContent 并确认其唯一性
  const afterLineNo = linesMatchContent(
    lines,
    afterContent,
    sectionStartLineNumber,
    sectionEndLineNumber
  );

  // 5. 执行插入操作，确保插入的是整行
  const updatedLines = linesReplace(
    lines,
    afterLineNo,
    afterLineNo + afterContent.length - 1,
    [...afterContent, ...content]
  );

  // 6. 写回文件 (use helper)
  writeFileLines(libraryName, relativePath, updatedLines);
}

//   - add(path, content: ContentExactLine[]): void
//     在文件末尾添加 content。
//
export function add(libraryName: LibraryName, relativePath: FileRelativePath, content: ContentExactLine[]): void {
  const lines = readFileLines(libraryName, relativePath);
  const updatedLines = [...lines, ...content] as FileWholeLines;
  writeFileLines(libraryName, relativePath, updatedLines);
}


//   - addInToc(path, toc: TocGlob, content): void
//     在 toc 指定的章节下添加 content。
//     如果 toc 未找到或不唯一，则抛错。
//     content 会被添加在 toc 之后、任何新标题行之前。
//
export function addInToc(libraryName: LibraryName, relativePath: FileRelativePath, toc: TocGlob, content: ContentExactLine[]): void {

  console.log('addInToc', libraryName, relativePath, toc, content);

  // 1. 读取文件内容
  const lines = readFileLines(libraryName, relativePath);

  // 2. 定位 toc 并确认其唯一性
  const tocList = getTocList(libraryName, relativePath);
  const matchedToc = matchToc(libraryName, relativePath, toc);
  const tocLineNumber = matchedToc.lineNumber;

  // 3. 在 tocList 中找到下一个标题行，确定插入位置
  const tocIndex = tocList.findIndex(item => item.lineNumber === tocLineNumber);
  const nextToc = tocList[tocIndex + 1];
  const insertLineNumber: LineNumber = nextToc ? nextToc.lineNumber : (lines.length + 1);

  // 4. 执行插入操作 - 如果 insertLineNumber 有内容，则插入到其行，并包含它；否则插入到文件末尾
  let updatedLines: FileWholeLines;
  if (insertLineNumber <= lines.length) {
    const targetLineContent = lines[insertLineNumber - 1];
    updatedLines = linesReplace(
      lines,
      insertLineNumber,
      insertLineNumber,
      [...content, targetLineContent ?? '']
    );
    writeFileLines(libraryName, relativePath, updatedLines);
  } else {
    updatedLines = [...lines, ...content] as FileWholeLines;
    writeFileLines(libraryName, relativePath, updatedLines);
  }
}


//   - delete(path, content: ContentBlock): void
//     删除文件中唯一匹配的 content。
//     如果未找到唯一匹配，则抛错。
//
export function deleteContent(libraryName: LibraryName, relativePath: FileRelativePath, content: ContentExactLine[]): void {
  const lines = readFileLines(libraryName, relativePath);
  const beginLineNo = linesMatchContent(lines, content);
  const endLineNo = beginLineNo + content.length - 1;
  const updatedLines = linesReplace(lines, beginLineNo, endLineNo, []);
  writeFileLines(libraryName, relativePath, updatedLines);
}


//   - deleteInToc(path, toc: TocGlob, content): void
//     在 toc 指定的章节下删除唯一匹配的 content。
//     如果 toc 未找到或不唯一，或 content 未找到或不唯一，则抛错。
export function deleteInToc(libraryName: LibraryName, relativePath: FileRelativePath, toc: TocGlob, content: ContentExactLine[]): void {
  // 1. 读取文件内容
  const lines = readFileLines(libraryName, relativePath);

  // 2. 定位 toc 并确认其唯一性
  const tocList = getTocList(libraryName, relativePath);
  const matchedToc = matchToc(libraryName, relativePath, toc);
  const tocLineNumber = matchedToc.lineNumber;

  // 3. 在 tocList 中找到下一个标题行，确定章节范围
  const tocIndex = tocList.findIndex(item => item.lineNumber === tocLineNumber);
  const nextToc = tocList[tocIndex + 1];
  const sectionStartLineNumber: LineNumber = tocLineNumber;
  const sectionEndLineNumber: LineNumber = nextToc ? nextToc.lineNumber - 1 : lines.length;

  // 4. 在章节范围内定位 content 并确认其唯一性
  const beginLineNo = linesMatchContent(
    lines,
    content,
    sectionStartLineNumber,
    sectionEndLineNumber
  );
  const endLineNo = beginLineNo + content.length - 1;

  // 5. 执行删除操作
  const updatedLines = linesReplace(lines, beginLineNo, endLineNo, []);

  // 6. 写回文件 (use helper)
  writeFileLines(libraryName, relativePath, updatedLines);
}

/**
 * Creates a new file with the given content.
 * @param libraryName The name of the library.
 * @param relativePath The path for the new file, relative to the library root.
 * @param content The content to write to the file.
 */
export function createFile(libraryName: LibraryName, relativePath: FileRelativePath, content: FileWholeLines): void {
  const fullPath = pathForFile(libraryName, relativePath);
  checks(!shell.test('-e', fullPath), `文件已存在，无法创建: ${fullPath}`);
  writeFileLines(libraryName, relativePath, content);
}

