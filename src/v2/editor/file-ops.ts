import {type FileAbsolutePath, FileType, type FileWholeLines, type LibraryName, type ThingName} from "../../typings.ts";
import {checks} from "../../utils.ts";
import {generateEntityTrashPath, getEntityFilePath, getJourneyFilePath, getMetaFilePath} from "../runtime.ts";
import shell from "shelljs";
import fs from "fs";

export function pathForFile(libraryName: LibraryName, fileType: FileType, thingName?: string): FileAbsolutePath {
  switch (fileType) {
  case FileType.FileTypeEntity:
    checks(!!thingName, `Entity 文件路径需要提供名称`);
    return getEntityFilePath(libraryName, thingName);
  case FileType.FileTypeJourney:
    checks(!!thingName, `Journey 文件路径需要提供名称`);
    return getJourneyFilePath(libraryName, thingName);
  case FileType.FileTypeMeta:
    return getMetaFilePath(libraryName);
  default:
    throw new Error(`未知的文件类型`);
  }
} // (LibraryName, FileType, ThingName, FileWholeLines) => void
// (LibraryName, FileRelativePath) => FileWholeLines
// 读取文件的所有行
export function readFileLines(libraryName: LibraryName, fileType: FileType, name: ThingName): FileWholeLines {
  const fullPath = pathForFile(libraryName, fileType, name);
  checks(shell.test('-f', fullPath), `无法找到文件: ${fullPath}`);
  const fileContent = fs.readFileSync(fullPath, 'utf-8');
  if (fileContent === '') {
    return [] as FileWholeLines;
  }
  const lines = fileContent.split('\n');
  return lines as FileWholeLines;
}

// 写入文件的所有行
export function writeFileLines(libraryName: LibraryName, fileType: FileType, name: ThingName, lines: FileWholeLines): void {
  const fullPath = pathForFile(libraryName, fileType, name);
  const content = lines.join('\n');
  fs.writeFileSync(fullPath, content, 'utf-8');
}

export function moveFileToTrash(libraryName: LibraryName, fileType: FileType, name: ThingName): void {
  const fullPath = pathForFile(libraryName, fileType, name);
  checks(shell.test('-f', fullPath), `无法找到文件: ${fullPath}`);
  const filePathInTrash = generateEntityTrashPath(libraryName, name);
  shell.mv(fullPath, filePathInTrash);
}

export function createFile(libraryName: LibraryName, fileType: FileType, name: ThingName, content: FileWholeLines): void {
  const fullPath = pathForFile(libraryName, fileType, name);
  checks(!shell.test('-e', fullPath), `文件已存在，无法创建: ${fullPath}`);
  writeFileLines(libraryName, fileType, name, content);
}

export function renameFile(libraryName: LibraryName, fileType: FileType, oldName: ThingName, newName: ThingName): void {
  const oldFullPath = pathForFile(libraryName, fileType, oldName);
  const newFullPath = pathForFile(libraryName, fileType, newName);
  checks(shell.test('-f', oldFullPath), `无法找到源文件: ${oldFullPath}`);
  checks(!shell.test('-e', newFullPath), `目标文件已存在，无法重命名: ${newFullPath}`);
  shell.mv(oldFullPath, newFullPath);
}
