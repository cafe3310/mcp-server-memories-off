import shell from 'shelljs';
import path from 'path';
import {getLibraryPath} from './runtime.ts';
import {checks, logfile} from '../utils.ts';

import fs from 'fs';
import type {
  ContentLocator,
  ContentExactBlock,
  FileAbsolutePath,
  FileRelativePath,
  LibraryName,
  LibraryPath,
  TocBlock,
  TocGlob, TocList, FileWholeLines
} from "../typings.ts";

// 我们对内容的替换基于行，和 array.shift 类似。
// 我们对标题（toc）行的操作基本上使用模糊匹配。

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
function normalize(str: string): string {
  // 1. 去掉首尾空白
  str = str.trim();

  // 2. 多个空白归一化为单个空格
  str = str.replace(/\s+/g, ' ');

  // 3. 移除所有标点符号（中文和英文）
  str = str.replace(/[.,\\/#!$%^&*;:{}=\-_`~()，。、《》？；：‘’“”【】（）…]/g, '');

  // 4. 小写化
  str = str.toLowerCase();

  return str;
}

// endregion
// region 文件直接读写


// (LibraryName, FileRelativePath) => ContentExactBlock
// 读取文件的完整内容
export function readFileContent(libraryName: LibraryName, relativePath: FileRelativePath): ContentExactBlock {
  const fullPath = pathForFile(libraryName, relativePath);
  checks(shell.test('-f', fullPath), `无法找到文件: ${fullPath}`);
  logfile('shell', `Reading file: ${fullPath}`);
  return fs.readFileSync(fullPath, 'utf-8');
}

// (LibraryName, FileRelativePath) => FileWholeLines
// 读取文件的所有行
export function readFileLines(libraryName: LibraryName, relativePath: FileRelativePath): FileWholeLines {
  const fileContent = readFileContent(libraryName, relativePath);
  const lines = fileContent.split('\n');
  return lines as FileWholeLines;
}

// (LibraryName, FileRelativePath, ContentExactBlock) => void
// 写入文件的完整内容
export function writeFileContent(libraryName: LibraryName, relativePath: FileRelativePath, content: ContentExactBlock): void {
  const fullPath = pathForFile(libraryName, relativePath);
  fs.writeFileSync(fullPath, content, 'utf-8');
}

// (LibraryName, FileRelativePath, FileWholeLines) => void
// 写入文件的所有行
export function writeFileLines(libraryName: LibraryName, relativePath: FileRelativePath, lines: FileWholeLines): void {
  const content = lines.join('\n') as ContentExactBlock;
  writeFileContent(libraryName, relativePath, content);
}

// endregion
// region 章节标题操作


// getTocList(lib, fileRelPath) - 获取文件中的所有章节标题及其行号的映射
// 返回 TocList
export function getTocList(libraryName: LibraryName, relativePath: FileRelativePath): TocList {
  const fileContent = readFileContent(libraryName, relativePath);
  const lines = fileContent.split('\n');
  const tocList: TocList = [];
  lines.forEach((line, index) => {
    if (line.startsWith('#')) {
      const level = (/^#+/.exec(line))?.[0].length ?? 1;
      tocList.push({
        level: level as TocList[0]['level'],
        lineNumber: (index + 1) as TocList[0]['lineNumber'],
        tocLineContent: line as TocList[0]['tocLineContent'],
      });
    }
  });
  return tocList;
}

// matchToc - 定位 Markdown 文件中的章节标题，采用模糊且可复现的匹配。
//
// 规则：只匹配以 `#` 开头的标题行。对用户提供的 `toc` 与文件中的每个标题行均做相同的标准化：
//   - 去除首尾空白，合并多余空白为单空格
//   - 移除中英文标点
//   - 转为小写
// 匹配方式：标准化后的字符串相等即视为匹配。若找到唯一匹配，返回对应的 `TocBlock`（包含行号与原始标题行）；
// 若未找到或匹配不唯一，则抛出错误并说明文件路径与候选标题。
function matchToc(lib: LibraryName, file: FileRelativePath, glob: TocGlob): TocBlock {
  const tocList = getTocList(lib, file);
  const normalizedGlob = normalize(glob);

  const matches = tocList.filter(item => normalize(item.tocLineContent) === normalizedGlob);

  if (matches.length === 0) {
    throw new Error(`在文件 ${pathForFile(lib, file)} 中未找到与 '${glob}' 匹配的章节标题。`);
  }

  if (matches.length > 1) {
    throw new Error(`发现多个与 '${glob}' 匹配的章节标题，请提供更精确的标题：\n- ${matches.map(m => m.tocLineContent).join('\n- ')}`);
  }

  const match = matches[0]!;
  return {
    lineNumber: match.lineNumber,
    tocLineContent: match.tocLineContent,
  };
}

//   - replace(path, oldContent: ContentBlock, newContent: ContentBlock): void
//     将文件中唯一匹配的 oldContent 替换为 newContent。
//     如果未找到唯一匹配，则抛错。
export function replace(libraryName: LibraryName, relativePath: FileRelativePath, oldContent: ContentLocator, newContent: ContentExactBlock): void {

  // 1. 读取文件内容
  const fullPath = pathForFile(libraryName, relativePath);
  const fullContent = readFileContent(libraryName, relativePath);
  let updatedContent: string | undefined = undefined;
  // 2. 从旧文件中定位 oldContent - 先找到对应行号，然后截取内容块对比。考虑 ContentExactBlock 的两种类型。
  if (oldContent.type === 'NumbersAndLines') {
    const lines = fullContent.split('\n');
    const beginIndex = oldContent.beginLineNumber - 1;
    const endIndex = oldContent.endLineNumber - 1;

    // 检查 oldContent.beginContentLine 和 endContentLine 是否匹配
    const actualBeginLine = lines[beginIndex];
    checks(actualBeginLine === oldContent.beginContentLine, `旧内容起始行在第 ${oldContent.beginLineNumber} 行不匹配。`);
    const actualEndLine = lines[endIndex];
    checks(actualEndLine === oldContent.endContentLine, `旧内容结束行在第 ${oldContent.endLineNumber} 行不匹配。`);

    // 执行内容替换
    const before = lines.slice(0, beginIndex).join('\n');
    const after = lines.slice(endIndex + 1).join('\n');
    updatedContent = [before, newContent, after].filter(part => part.length > 0).join('\n');

  } else if (oldContent.type === 'Lines') {

    // 确定是否唯一匹配。找不到和多处匹配均报错 - 不同的错误信息。
    const occurrences = fullContent.split(oldContent.ContentExactBlock).length - 1;
    if (occurrences === 0) {
      throw new Error(`在文件 ${relativePath} 中未找到要替换的旧内容 (oldContent)。请确保 oldContent 参数与文件中的内容完全匹配。`);
    }
    if (occurrences > 1) {
      throw new Error(`在文件 ${relativePath} 中找到多处匹配的旧内容 (oldContent)。请确保 oldContent 参数唯一匹配文件中的内容。`);
    }
    updatedContent = fullContent.replace(oldContent.ContentExactBlock, newContent);
  }

  // 3. 替换为 newContent
  checks(!!updatedContent, `替换逻辑未执行，原因未知。`);

  // 4. 写回文件
  fs.writeFileSync(fullPath, updatedContent, 'utf-8');
}

//   - insertAfter(path, content: ContentExactBlock, afterContent: ContentGlobLine): void
//     在文件中唯一匹配的 afterContent 之后插入 content。
//     如果未找到唯一匹配，则抛错。
export function insertAfter(libraryName: LibraryName, relativePath: FileRelativePath, content: ContentExactBlock, afterContent: string): void {
  // 1. 读取文件内容
  const fullPath = pathForFile(libraryName, relativePath);
  const fullContent = readFileContent(libraryName, relativePath);

  // 2. 确定是否唯一匹配。找不到和多处匹配均报错 - 不同的错误信息。
  const occurrences = fullContent.split(afterContent).length - 1;
  if (occurrences === 0) {
    throw new Error(`在文件 ${relativePath} 中未找到要插入内容之后的定位内容 (afterContent)。请确保 afterContent 参数与文件中的内容完全匹配。`);
  }
  if (occurrences > 1) {
    throw new Error(`在文件 ${relativePath} 中找到多处匹配的定位内容 (afterContent)。请确保 afterContent 参数唯一匹配文件中的内容。`);
  }

  // 3. 执行插入操作，确保插入的是整行
  const updatedContent = fullContent.replace(afterContent, `${afterContent}\n${content}`);

  // 4. 写回文件
  fs.writeFileSync(fullPath, updatedContent, 'utf-8');
}


//   - insertInTocAfter(path, toc: TocGlob, content: ContentExactBlock, afterContent: ContentGlobLine): void
//     在 toc 指定的章节下、唯一匹配的 afterContent 之后插入 content。
//     如果 toc 未找到或不唯一，或 afterContent 未找到或不唯一，则抛错。
//
export function insertInTocAfterTyped(libraryName: LibraryName, relativePath: FileRelativePath, toc: TocGlob, content: ContentExactBlock, afterContent: string): void {

  // 1. 读取文件内容
  const fullPath = pathForFile(libraryName, relativePath);
  const fullContent = readFileContent(libraryName, relativePath);
  const lines = fullContent.split('\n');

  // 2. 定位 toc 并确认其唯一性
  const tocList = getTocList(libraryName, relativePath);
  const matchedToc = matchToc(libraryName, relativePath, toc);
  const tocLineNumber = matchedToc.lineNumber;

  // 3. 在 toclist 中找到下一个标题行，确定章节范围
  const tocIndex = tocList.findIndex(item => item.lineNumber === tocLineNumber);
  const nextToc = tocList[tocIndex + 1];
  const sectionStart = tocLineNumber;
  const sectionEnd = nextToc ? nextToc.lineNumber - 1 : lines.length;

  // 4. 在章节范围内定位 afterContent 并确认其唯一性
  const sectionLines = lines.slice(sectionStart, sectionEnd);
  const sectionContent = sectionLines.join('\n');
  const occurrences = sectionContent.split(afterContent).length - 1;
  if (occurrences === 0) {
    throw new Error(`在文件 ${relativePath} 的章节 '${toc}' 中未找到要插入内容之后的定位内容 (afterContent)。请确保 afterContent 参数与章节内容完全匹配。`);
  }
  if (occurrences > 1) {
    throw new Error(`在文件 ${relativePath} 的章节 '${toc}' 中找到多处匹配的定位内容 (afterContent)。请确保 afterContent 参数唯一匹配章节内容。`);
  }

  // 5. 执行插入操作，确保插入的是整行
  const updatedSectionContent = sectionContent.replace(afterContent, `${afterContent}\n${content}`);

  // 6. 组装更新后的文件内容
  const beforeSection = lines.slice(0, sectionStart).join('\n');
  const afterSection = lines.slice(sectionEnd).join('\n');
  const updatedContent = [beforeSection, updatedSectionContent, afterSection].filter(part => part.length > 0).join('\n');

  // 7. 写回文件
  fs.writeFileSync(fullPath, updatedContent, 'utf-8');
}

//   - add(path, content: ContentExactBlock): void
//     在文件末尾添加 content。
//
export function add(libraryName: LibraryName, relativePath: FileRelativePath, content: ContentExactBlock): void {
  // 1. 读取文件内容
  const fullPath = pathForFile(libraryName, relativePath);
  const fullContent = readFileContent(libraryName, relativePath);

  // 2. 在文件末尾添加 content
  const updatedContent = `${fullContent}\n${content}`;
  // 3. 写回文件
  fs.writeFileSync(fullPath, updatedContent, 'utf-8');
}


//   - addInToc(path, toc: TocGlob, content): void
//     在 toc 指定的章节下添加 content。
//     如果 toc 未找到或不唯一，则抛错。
//     content 会被添加在 toc 之后、任何新标题行之前。
//
export function addInTocTyped(libraryName: LibraryName, relativePath: FileRelativePath, toc: TocGlob, content: ContentExactBlock): void {

  // 1. 读取文件内容
  const fullPath = pathForFile(libraryName, relativePath);
  const fullContent = readFileContent(libraryName, relativePath);
  const lines = fullContent.split('\n');
  // 2. 定位 toc 并确认其唯一性
  const tocList = getTocList(libraryName, relativePath);
  const matchedToc = matchToc(libraryName, relativePath, toc);
  const tocLineNumber = matchedToc.lineNumber;

  // 3. 在 toclist 中找到下一个标题行，确定插入位置
  const tocIndex = tocList.findIndex(item => item.lineNumber === tocLineNumber);
  const nextToc = tocList[tocIndex + 1];
  const insertPosition = nextToc ? nextToc.lineNumber - 1 : lines.length;
  // 4. 执行插入操作
  const before = lines.slice(0, insertPosition).join('\n');
  const after = lines.slice(insertPosition).join('\n');
  const updatedContent = [before, content, after].filter(part => part.length > 0).join('\n');
  // 5. 写回文件
  fs.writeFileSync(fullPath, updatedContent, 'utf-8');
}


//   - delete(path, content: ContentBlock): void
//     删除文件中唯一匹配的 content。
//     如果未找到唯一匹配，则抛错。
//
export function deleteContent(libraryName: string, relativePath: string, content: ContentExactBlock): void {
  const libraryPath = getLibraryPath(libraryName);
  const fullPath = path.join(libraryPath, relativePath);
  checks(shell.test('-f', fullPath), `File not found: ${fullPath}`);

  const originalFileContent = fs.readFileSync(fullPath, 'utf-8');
  const occurrences = originalFileContent.split(content).length - 1;
  checks(occurrences === 1, `Expected exactly one occurrence of the content to delete in file ${fullPath}, but found ${occurrences}.`);
  const updatedContent = originalFileContent.replace(content, '');

  fs.writeFileSync(fullPath, updatedContent, 'utf-8');
}


//   - deleteInToc(path, toc: TocGlob, content): void
//     在 toc 指定的章节下删除唯一匹配的 content。
//     如果 toc 未找到或不唯一，或 content 未找到或不唯一，则抛错。
export function deleteInTocTyped(libraryName: LibraryName, relativePath: FileRelativePath, toc: TocGlob, content: ContentExactBlock): void {

  // 1. 读取文件内容
  const fullPath = pathForFile(libraryName, relativePath);
  const fullContent = readFileContent(libraryName, relativePath);
  const lines = fullContent.split('\n');

  // 2. 定位 toc 并确认其唯一性
  const tocList = getTocList(libraryName, relativePath);
  const matchedToc = matchToc(libraryName, relativePath, toc);
  const tocLineNumber = matchedToc.lineNumber;

  // 3. 在 toclist 中找到下一个标题行，确定章节范围
  const tocIndex = tocList.findIndex(item => item.lineNumber === tocLineNumber);
  const nextToc = tocList[tocIndex + 1];
  const sectionStart = tocLineNumber;
  const sectionEnd = nextToc ? nextToc.lineNumber - 1 : lines.length;

  // 4. 在章节范围内定位 content 并确认其唯一性
  const sectionLines = lines.slice(sectionStart, sectionEnd);
  const sectionContent = sectionLines.join('\n');
  const occurrences = sectionContent.split(content).length - 1;
  checks(occurrences === 1, `Expected exactly one occurrence of the content to delete in section '${toc}' of file ${relativePath}, but found ${occurrences}.`);

  // 5. 执行删除操作
  const updatedSectionContent = sectionContent.replace(content, '');

  // 6. 组装更新后的文件内容
  const beforeSection = lines.slice(0, sectionStart).join('\n');
  const afterSection = lines.slice(sectionEnd).join('\n');
  const updatedContent = [beforeSection, updatedSectionContent, afterSection].filter(part => part.length > 0).join('\n');

  // 7. 写回文件
  fs.writeFileSync(fullPath, updatedContent, 'utf-8');
}

/**
 * Creates a new file with the given content.
 * @param libraryName The name of the library.
 * @param relativePath The path for the new file, relative to the library root.
 * @param content The content to write to the file.
 */
export function createFile(libraryName: string, relativePath: string, content: string): void {
  const libraryPath = getLibraryPath(libraryName);
  const fullPath = path.join(libraryPath, relativePath);
  checks(!shell.test('-e', fullPath), `File already exists: ${fullPath}`);
  new shell.ShellString(content).to(fullPath);
  logfile('shell', `Created file: ${fullPath}`);
}

