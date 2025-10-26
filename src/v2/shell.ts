import shell from 'shelljs';
import path from 'path';
import {getLibraryPath} from './runtime.ts';
import {checks, logfile} from '../utils.ts';

import fs from 'fs';
import type {StrongOpaque} from "../typings.ts";

// 定义一些 string variant type

// 模糊匹配的章节标题。
// 如 "installation guide"
type TocGlob = StrongOpaque<string, 'TocGlob'>;

// 精确匹配的章节标题行。
// 如 "## Installation (Guide):"
type TocExactLine = StrongOpaque<string, 'TocExactLine'>;

// 模糊匹配的内容块，基于行。
// 如 "this is the beginning of the section*"
type ContentGlobLine = StrongOpaque<string, 'ContentGlobLine'>;

// 精确匹配的内容块，单行。
// 如 "  - This is the beginning of the section."
type ContentExactLine = StrongOpaque<string, 'ContentExactLine'>;

// 精确匹配的内容块，多行。
// 如 "  - This is the beginning of the section. and\n  - this is the second line"
type ContentExactBlock = StrongOpaque<string, 'ContentExactBlock'>;

// 行号，从 1 开始计数
type LineNumber = StrongOpaque<number, 'LineNumber'>;

// 内容块
type ContentBlock = {
  type: 'NumbersAndLines'
  beginLineNumber: LineNumber;
  endLineNumber: LineNumber;
  beginContentLine: ContentExactLine;
  endContentLine: ContentExactLine;
} | {
  type: 'Lines'
  ContentExactBlock: ContentExactBlock;
}

// TOC 块
type TocBlock = {
  lineNumber: LineNumber;
  tocLineContent: TocExactLine;
}

// 我们对文件的操作基于以下范式：
// ## toc
//   TOC 定位章节标题，使用模糊匹配，确保唯一定位
//   对 toc 的匹配，我们只要求提供完整的章节标题行，允许模糊匹配。具体来说，
//   用户提供的 toc 会被标准化（小写化，去除标点符号，前后多空格去除，多空格归一化）后与文件中的所有标题行进行匹配。
//   如果找到唯一匹配，则返回该完整标题行。
//
//   - matchToc(path, TocGlob): string -> TocBlock | throws
//     如果匹配成功，返回 TocBlock，否则抛错。
//
// ## content
//   我们对内容的替换基于行，和 array.shift 类似。
//
//   - replace(path, oldContent: ContentBlock, newContent: ContentBlock): void
//     将文件中唯一匹配的 oldContent 替换为 newContent。
//     如果未找到唯一匹配，则抛错。
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

/**
 * Reads the full content of a file within a library.
 * @param libraryName The name of the library.
 * @param relativePath The path of the file relative to the library root.
 * @returns The content of the file as a string.
 */
export function readFileContent(libraryName: string, relativePath: string): string {
  const libraryPath = getLibraryPath(libraryName);
  const fullPath = path.join(libraryPath, relativePath);
  checks(shell.test('-f', fullPath), `File not found: ${fullPath}`);
  logfile('shell', `Reading file: ${fullPath}`);
  return fs.readFileSync(fullPath, 'utf-8');
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

/**
 * Finds a unique markdown heading (TOC) in a file using fuzzy matching.
 * @param filePath The absolute path to the file.
 * @param toc The fuzzy TOC string to match.
 * @returns The exact, full heading line if a unique match is found.
 * @throws An error if no match or multiple matches are found.
 */
export function matchToc(filePath: string, toc: string): string {
  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const normalizedToc = normalize(toc);

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');

  const headingLines = lines.filter(line => line.startsWith('#'));
  const matches = headingLines.filter(line => normalize(line).includes(normalizedToc));

  if (matches.length === 0) {
    throw new Error(`在文件 ${filePath} 中未找到与 '${toc}' 匹配的章节标题。`);
  }

  if (matches.length > 1) {
    throw new Error(`发现多个与 '${toc}' 匹配的章节标题，请提供更精确的标题：\n- ${matches.join('\n- ')}`);
  }
  return matches[0] ?? '';
}

