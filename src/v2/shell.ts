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
  TocGlob
} from "../typings.ts";

// 定义一些 string variant type

// 我们对文件的操作基于以下范式：
// ## content
//   我们对内容的替换基于行，和 array.shift 类似。
//

//   - insertAfter(path, content: ContentExactBlock, afterContent: ContentGlobLine): void
//     在文件中唯一匹配的 afterContent 之后插入 content。
//     如果未找到唯一匹配，则抛错。
//
//   - insertInTocAfter(path, toc: TocGlob, content: ContentExactBlock, afterContent: ContentGlobLine): void
//     在 toc 指定的章节下、唯一匹配的 afterContent 之后插入 content。
//     如果 toc 未找到或不唯一，或 afterContent 未找到或不唯一，则抛错。
//
//   - add(path, content: ContentExactBlock): void
//     在文件末尾添加 content。
//
//   - addInToc(path, toc: TocGlob, content): void
//     在 toc 指定的章节下添加 content。
//     如果 toc 未找到或不唯一，则抛错。
//     content 会被添加在 toc 之后、任何新标题行之前。
//
//   - delete(path, content: ContentBlock): void
//     删除文件中唯一匹配的 content。
//     如果未找到唯一匹配，则抛错。
//
//   - deleteInToc(path, toc: TocGlob, content): void
//     在 toc 指定的章节下删除唯一匹配的 content。
//     如果 toc 未找到或不唯一，或 content 未找到或不唯一，则抛错。

function pathForLib(libraryName: LibraryName): LibraryPath {
  return getLibraryPath(libraryName) as LibraryPath;
}

function pathForFile(libraryName: LibraryName, relativePath: FileRelativePath): FileAbsolutePath {
  return path.join(pathForLib(libraryName), relativePath) as FileAbsolutePath;
}

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

// matchToc - 定位 Markdown 文件中的章节标题，采用模糊且可复现的匹配。
//
// 规则：只匹配以 `#` 开头的标题行。对用户提供的 `toc` 与文件中的每个标题行均做相同的标准化：
//   - 去除首尾空白，合并多余空白为单空格
//   - 移除中英文标点
//   - 转为小写
// 匹配方式：标准化后的字符串相等即视为匹配。若找到唯一匹配，返回对应的 `TocBlock`（包含行号与原始标题行）；
// 若未找到或匹配不唯一，则抛出错误并说明文件路径与候选标题。
function matchToc(lib: LibraryName, file: FileRelativePath, glob: TocGlob): TocBlock {

  const fileContent = readFileContent(lib, file);

  const lines = fileContent.split('\n');

  // filter fileContent -> [lineNo, origLineToc, normalizedLineToc]
  const headingLines = lines
    .map((line, index) => [index + 1, line] as [number, string])
    .filter(([_, line]) => line.startsWith('#'))
    .map(([lineNo, line]) => [lineNo, line, normalize(line)] as [number, string, string]);

  const normalizedGlob = normalize(glob);

  // find matches. for normalizedLineToc == normalizedGlob, not only includes
  const matches = headingLines.filter(([_, __, normalizedLineToc]) => normalizedLineToc == normalizedGlob);

  if (matches.length === 0) {
    throw new Error(`在文件 ${filePath} 中未找到与 '${glob}' 匹配的章节标题。`);
  }

  if (matches.length > 1) {
    throw new Error(`发现多个与 '${glob}' 匹配的章节标题，请提供更精确的标题：\n- ${matches.map(([_, line]) => line).join('\n- ')}`);
  }

  const [lineNumber, tocLineContent] = matches[0]!;
  return {
    lineNumber: lineNumber as TocBlock['lineNumber'],
    tocLineContent: tocLineContent as TocBlock['tocLineContent'],
  };
}

/**
 * 读取库内文件的完整内容（UTF-8）。
 *
 * 读取位于 `pathForFile(libraryName, relativePath)` 的文件并以 UTF-8 返回其内容。
 * 若文件不存在或读取失败，将抛出错误。
 */
export function readFileContent(libraryName: LibraryName, relativePath: FileRelativePath): string {
  const fullPath = pathForFile(libraryName, relativePath);
  checks(shell.test('-f', fullPath), `无法找到文件: ${fullPath}`);
  logfile('shell', `Reading file: ${fullPath}`);
  return fs.readFileSync(fullPath, 'utf-8');
}

//   - replace(path, oldContent: ContentBlock, newContent: ContentBlock): void
//     将文件中唯一匹配的 oldContent 替换为 newContent。
//     如果未找到唯一匹配，则抛错。
export function replaceTyped(libraryName: LibraryName, relativePath: FileRelativePath, oldContent: ContentLocator, newContent: ContentExactBlock): void {

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

/**
 * Replaces a block of text in a file.
 * This is a simple implementation and might not be robust for all cases.
 * A more robust implementation would use context-based replacement.
 * @param libraryName The name of the library.
 * @param relativePath The path of the file relative to the library root.
 * @param oldContent The exact block of text to be replaced.
 * @param newContent The new block of text.
 */
export function replaceContent(libraryName: string, relativePath: string, oldContent: string, newContent: string): void {
  const libraryPath = getLibraryPath(libraryName);
  const fullPath = path.join(libraryPath, relativePath);
  checks(shell.test('-f', fullPath), `File not found: ${fullPath}`);

  const originalFileContent = fs.readFileSync(fullPath, 'utf-8');
  const updatedContent = originalFileContent.replace(oldContent, newContent);

  checks(originalFileContent !== updatedContent, `'oldContent' not found in file ${fullPath}. Replacement failed.`);

  fs.writeFileSync(fullPath, updatedContent, 'utf-8');
  logfile('shell', `Replaced content in file: ${fullPath}`);
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

