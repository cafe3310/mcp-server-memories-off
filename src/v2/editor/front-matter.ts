import {
  FileType,
  type FileWholeLines, type FrontMatterLine,
  type LibraryName, type LineNumber,
  type ThingName
} from "../../typings.ts";
import {readFileLines, writeFileLines} from "./file-ops.ts";
import {normalizeFrontMatterLine} from "./text.ts";

// 定位文件中的 FrontMatter 部分，返回起止行号（包含分隔符行），如果没有 FrontMatter 则返回 null
export function locateFrontMatter(lines: FileWholeLines): {startLineNumber: LineNumber, endLineNumber: LineNumber} | null {
  if (lines.length === 0 || lines[0] !== '---') {
    return null;
  }
  const endIndex = lines.indexOf('---', 1);
  if (endIndex === -1) {
    return null; // Malformed frontmatter
  }
  return {
    startLineNumber: 1 as LineNumber,
    endLineNumber: (endIndex + 1) as LineNumber
  }
}

// 从文件中读取 FrontMatter 部分，返回标准化后的行数组
export function readFrontMatterLines(libraryName: LibraryName, fileType: FileType, thingName: ThingName): FrontMatterLine[] | null {
  const lines = readFileLines(libraryName, fileType, thingName);
  const frontMatterLocation = locateFrontMatter(lines);
  if (!frontMatterLocation) {
    return null;
  }
  const frontMatterLines = lines.slice(frontMatterLocation.startLineNumber, frontMatterLocation.endLineNumber - 1);
  return frontMatterLines.map(normalizeFrontMatterLine);
}

// 写入 FrontMatter 部分，覆盖原有的 FrontMatter
// 如果没有 FrontMatter，则添加新的 FrontMatter
export function writeFrontMatterLines(libraryName: LibraryName, fileType: FileType, thingName: ThingName, frontMatter: FrontMatterLine[]): void {
  const lines = readFileLines(libraryName, fileType, thingName);
  const frontMatterLocation = locateFrontMatter(lines);

  let newLines: FileWholeLines;
  if (frontMatterLocation) {
    newLines = [
      ...lines.slice(0, frontMatterLocation.startLineNumber),
      ...frontMatter,
      ...lines.slice(frontMatterLocation.endLineNumber)
    ] as FileWholeLines;
  } else {
    newLines = [
      '---',
      ...frontMatter,
      '---',
      ...lines
    ] as FileWholeLines;
  }

  writeFileLines(libraryName, fileType, thingName, newLines);
}
