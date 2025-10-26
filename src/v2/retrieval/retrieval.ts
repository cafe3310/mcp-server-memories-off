import '../../test/setup';
import shell from 'shelljs';
import path from 'path';
import {
  type ContentExactLine,
  FileType,
  type FrontMatterLine,
  type LibraryName, type LineNumber,
  type ThingName
} from "../../typings.ts";
import {getEntityDirPath, getThingNameFromPath} from "../runtime.ts";
import {locateFrontMatter} from "../editor/front-matter.ts";
import {readFileLines} from "../editor/file-ops.ts";

export function findEntityByNameGlob(libraryName: LibraryName, globPattern: string): ThingName[] {
  const entityDirPath = getEntityDirPath(libraryName);
  const fullGlobPath = path.join(entityDirPath, globPattern);
  const files = shell.ls(fullGlobPath);
  return files.map(filePath => getThingNameFromPath(filePath, FileType.FileTypeEntity));
}

export function findEntityByNonFrontMatterRegex(libraryName: LibraryName, fileGlobPattern: string, contentRegexPattern: string): {name: ThingName, line: ContentExactLine}[] {
  // 先 grep 内容
  const entityDirPath = getEntityDirPath(libraryName);
  const fullGlobPath = path.join(entityDirPath, fileGlobPattern);
  const grepResult = shell.grep('-l', contentRegexPattern, fullGlobPath);
  const matchedFiles = grepResult.stdout.split('\n').filter(line => line.trim() !== '');

  // 读取每个文件内容，通过 frontMatter 相关方法找到对应部分，裁掉
  // 看看剩下的内容里有没有匹配的
  const results: {name: ThingName, line: ContentExactLine}[] = [];
  for (const filePath of matchedFiles) {
    const thingName = getThingNameFromPath(filePath, FileType.FileTypeEntity);
    const fileLines = readFileLines(filePath, FileType.FileTypeEntity, thingName);
    const frontMatter: { startLineNumber: LineNumber; endLineNumber: LineNumber } | null = locateFrontMatter(fileLines);
    let contentLines: string[];
    if (frontMatter) {
      contentLines = fileLines.slice(0, frontMatter.startLineNumber - 1).concat(fileLines.slice(frontMatter.endLineNumber));
    } else {
      contentLines = fileLines;
    }
    const contentRegex = new RegExp(contentRegexPattern);
    contentLines.forEach((line, index) => {
      if (contentRegex.test(line)) {
        results.push({
          name: thingName,
          line: line as ContentExactLine
        });
      }
    });
  }

  return results;
}

export function findEntityByFrontMatterRegex(libraryName: LibraryName, fileGlobPattern: string, frontMatterRegexPattern: string): {name: ThingName, line: FrontMatterLine}[] {

  // 先 grep 内容
  const entityDirPath = getEntityDirPath(libraryName);
  const fullGlobPath = path.join(entityDirPath, fileGlobPattern);
  const grepResult = shell.grep('-l', frontMatterRegexPattern, fullGlobPath);
  const matchedFiles = grepResult.stdout.split('\n').filter(line => line.trim() !== '');

  const results: {name: ThingName, line: FrontMatterLine}[] = [];
  for (const filePath of matchedFiles) {
    const thingName = getThingNameFromPath(filePath, FileType.FileTypeEntity);
    const fileLines = readFileLines(filePath, FileType.FileTypeEntity, thingName);
    const frontMatter: { startLineNumber: LineNumber; endLineNumber: LineNumber } | null = locateFrontMatter(fileLines);
    if (frontMatter) {
      const frontMatterLines = fileLines.slice(frontMatter.startLineNumber - 1, frontMatter.endLineNumber);
      const frontMatterRegex = new RegExp(frontMatterRegexPattern);
      frontMatterLines.forEach((line) => {
        if (frontMatterRegex.test(line)) {
          results.push({
            name: thingName,
            line: line as FrontMatterLine
          });
        }
      });
    }
  }

  return results;
}
