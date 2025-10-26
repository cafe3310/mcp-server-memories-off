import {FileType, type LibraryName, type ThingName, type TocGlob, type TocItem, type TocList} from "../../typings.ts";
import {checks} from "../../utils.ts";
import {pathForFile, readFileLines} from "./file-ops.ts";
import {normalize} from "./text.ts";

export function getTocList(libraryName: LibraryName, fileType: FileType, name: ThingName): TocList {
  const tocList: TocList = [];
  readFileLines(libraryName, fileType, name)
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

// matchTocNoThrow - fuzzy match table-of-contents headings
export function matchTocNoThrow(libraryName: LibraryName, fileType: FileType, name: ThingName, glob: TocGlob): TocItem[] {
  const tocList = getTocList(libraryName, fileType, name);
  const normalizedGlob = normalize(glob);
  return tocList.filter(item => normalize(item.tocLineContent) === normalizedGlob);
}

// matchToc - fuzzy match and enforce uniqueness
export function matchToc(libraryName: LibraryName, fileType: FileType, name: ThingName, glob: TocGlob): TocItem {
  const matches = matchTocNoThrow(libraryName, fileType, name, glob);
  checks(matches.length !== 0, `在文件 ${pathForFile(libraryName, fileType, name)} 中未找到与 '${glob}' 匹配的章节标题。`);
  checks(matches.length === 1, `发现多个与 '${glob}' 匹配的章节标题，请提供更精确的标题：\n- ${matches.map(m => m.tocLineContent).join('\n- ')}`);
  return matches[0]!;
}
