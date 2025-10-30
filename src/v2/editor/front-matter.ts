import {FileType, type FileWholeLines, type FrontMatter, type LibraryName, type ThingName} from "../../typings.ts";
import {readFileLines, writeFileLines} from "./file-ops.ts";
import yaml from "yaml";

export function readFrontMatter(libraryName: LibraryName, fileType: FileType, thingName: ThingName): FrontMatter | null {
  const lines = readFileLines(libraryName, fileType, thingName);
  if (lines.length === 0 || lines[0] !== '---') {
    return null;
  }
  const endIndex = lines.indexOf('---', 1);
  if (endIndex === -1) {
    return null; // Malformed frontmatter
  }
  const yamlLines = lines.slice(1, endIndex);
  const parsed: unknown = yaml.parse(yamlLines.join('\n'));
  if (typeof parsed !== 'object' || parsed === null) {
    return new Map();
  }
  return new Map(Object.entries(parsed));
}

export function writeFrontMatter(libraryName: LibraryName, fileType: FileType, thingName: ThingName, data: FrontMatter): void {
  const lines = readFileLines(libraryName, fileType, thingName);
  const startIndex = lines.indexOf('---');
  const endIndex = startIndex !== -1 ? lines.indexOf('---', startIndex + 1) : -1;

  const body = (startIndex !== -1 && endIndex !== -1) ? lines.slice(endIndex + 1) : lines;

  let finalLines: FileWholeLines;
  if (data.size > 0) {
    const obj = Object.fromEntries(data);
    const yamlString = yaml.stringify(obj).trim();
    const frontmatterLines = ['---', ...yamlString.split('\n'), '---'];

    if (body.length > 0 && body[0] !== '') {
      finalLines = [...frontmatterLines, '', ...body];
    } else {
      finalLines = [...frontmatterLines, ...body];
    }
  } else {
    finalLines = body;
  }

  writeFileLines(libraryName, fileType, thingName, finalLines);
}
