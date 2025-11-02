import {
  type ContentExactLine,
  type ContentLocator,
  FileType,
  type FileWholeLines,
  type LibraryName,
  type LineNumber,
  type ThingName,
  type TocGlob
} from "../../typings.ts";
import {readFileLines, writeFileLines} from "./file-ops.ts";
import {getTocList, matchToc, matchTocNoThrow} from "./toc.ts";
import {linesMatchContent, linesReplace, linesVerifyBeginEnd} from "./lines.ts";
import {checks} from "../../utils.ts";

export type Section = {
  tocItem: { tocLineContent: string; lineNumber: LineNumber };
  content: string[];
};

export function splitFileIntoSections(libraryName: LibraryName, fileType: FileType, name: ThingName): Section[] {
  const tocList = getTocList(libraryName, fileType, name);
  const sections: Section[] = [];

  for (const tocItem of tocList) {
    const content = readSectionContent(libraryName, fileType, name, tocItem.tocLineContent) ?? [];
    sections.push({ tocItem, content });
  }

  return sections;
}


export function readSectionContent(libraryName: LibraryName, fileType: FileType, name: ThingName, tocGlob: TocGlob): string[] | null {
  const lines = readFileLines(libraryName, fileType, name);
  const tocList = getTocList(libraryName, fileType, name);
  const matchedTocs = matchTocNoThrow(libraryName, fileType, name, tocGlob);

  // Only proceed if we find exactly one match
  if (matchedTocs.length !== 1) {
    return null;
  }
  const matchedToc = matchedTocs[0]!;
  const tocLineNumber = matchedToc.lineNumber;

  const tocIndex = tocList.findIndex(item => item.lineNumber === tocLineNumber);
  const nextToc = tocList[tocIndex + 1];

  const sectionStartLineNumber: LineNumber = tocLineNumber + 1; // Content starts after the heading
  const sectionEndLineNumber: LineNumber = nextToc ? nextToc.lineNumber - 1 : lines.length;

  if (sectionStartLineNumber > sectionEndLineNumber) {
    return []; // Section has a heading but no content
  }

  return lines.slice(sectionStartLineNumber - 1, sectionEndLineNumber);
}

export function replace(libraryName: LibraryName, fileType: FileType, name: ThingName, oldContent: ContentLocator, newContent: ContentExactLine[]): void {
  const lines = readFileLines(libraryName, fileType, name);
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
  writeFileLines(libraryName, fileType, name, updatedLines);
}

export function replaceInToc(libraryName: LibraryName, fileType: FileType, name: ThingName, toc: TocGlob, oldContent: ContentLocator, newContent: ContentExactLine[]): void {
  const lines = readFileLines(libraryName, fileType, name);

  const tocList = getTocList(libraryName, fileType, name);
  const matchedToc = matchToc(libraryName, fileType, name, toc);
  const tocLineNumber = matchedToc.lineNumber;

  const tocIndex = tocList.findIndex(item => item.lineNumber === tocLineNumber);
  const nextToc = tocList[tocIndex + 1];
  const sectionStartLineNumber: LineNumber = tocLineNumber;
  const sectionEndLineNumber: LineNumber = nextToc ? nextToc.lineNumber - 1 : lines.length;

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

  const updatedLines = linesReplace(lines, beginLineNo, endLineNo, newContent);
  writeFileLines(libraryName, fileType, name, updatedLines);
}

export function insertAfter(libraryName: LibraryName, fileType: FileType, name: ThingName, content: ContentExactLine[], afterContent: ContentExactLine[]): void {
  const lines = readFileLines(libraryName, fileType, name);
  const afterLineNo = linesMatchContent(lines, afterContent);
  const updatedLines = linesReplace(
    lines,
    afterLineNo,
    afterLineNo + afterContent.length - 1,
    [...afterContent, ...content]
  );
  writeFileLines(libraryName, fileType, name, updatedLines);
}

export function insertInTocAfter(libraryName: LibraryName, fileType: FileType, name: ThingName, toc: TocGlob, content: ContentExactLine[], afterContent: ContentExactLine[]): void {

  const lines = readFileLines(libraryName, fileType, name);

  const tocList = getTocList(libraryName, fileType, name);
  const matchedToc = matchToc(libraryName, fileType, name, toc);
  const tocLineNumber = matchedToc.lineNumber;

  const tocIndex = tocList.findIndex(item => item.lineNumber === tocLineNumber);
  const nextToc = tocList[tocIndex + 1];
  const sectionStartLineNumber: LineNumber = tocLineNumber;
  const sectionEndLineNumber: LineNumber = nextToc ? nextToc.lineNumber - 1 : lines.length;

  const afterLineNo = linesMatchContent(
    lines,
    afterContent,
    sectionStartLineNumber,
    sectionEndLineNumber
  );

  const updatedLines = linesReplace(
    lines,
    afterLineNo,
    afterLineNo + afterContent.length - 1,
    [...afterContent, ...content]
  );

  writeFileLines(libraryName, fileType, name, updatedLines);
}

export function add(libraryName: LibraryName, fileType: FileType, name: ThingName, content: ContentExactLine[]): void {
  const lines = readFileLines(libraryName, fileType, name);
  const updatedLines = [...lines, ...content] as FileWholeLines;
  writeFileLines(libraryName, fileType, name, updatedLines);
}

export function addInToc(libraryName: LibraryName, fileType: FileType, name: ThingName, toc: TocGlob, content: ContentExactLine[]): void {

  const lines = readFileLines(libraryName, fileType, name);

  const tocList = getTocList(libraryName, fileType, name);
  const matchedToc = matchToc(libraryName, fileType, name, toc);
  const tocLineNumber = matchedToc.lineNumber;

  const tocIndex = tocList.findIndex(item => item.lineNumber === tocLineNumber);
  const nextToc = tocList[tocIndex + 1];
  const insertLineNumber: LineNumber = nextToc ? nextToc.lineNumber : (lines.length + 1);

  let updatedLines: FileWholeLines;
  if (insertLineNumber <= lines.length) {
    const targetLineContent = lines[insertLineNumber - 1];
    updatedLines = linesReplace(
      lines,
      insertLineNumber,
      insertLineNumber,
      [...content, targetLineContent ?? '']
    );
    writeFileLines(libraryName, fileType, name, updatedLines);
  } else {
    updatedLines = [...lines, ...content] as FileWholeLines;
    writeFileLines(libraryName, fileType, name, updatedLines);
  }
}

export function deleteContent(libraryName: LibraryName, fileType: FileType, name: ThingName, content: ContentExactLine[]): void {
  const lines = readFileLines(libraryName, fileType, name);
  const beginLineNo = linesMatchContent(lines, content);
  const endLineNo = beginLineNo + content.length - 1;
  const updatedLines = linesReplace(lines, beginLineNo, endLineNo, []);
  writeFileLines(libraryName, fileType, name, updatedLines);
}

export function deleteInToc(libraryName: LibraryName, fileType: FileType, name: ThingName, toc: TocGlob, content: ContentExactLine[]): void {
  const lines = readFileLines(libraryName, fileType, name);

  const tocList = getTocList(libraryName, fileType, name);
  const matchedToc = matchToc(libraryName, fileType, name, toc);
  const tocLineNumber = matchedToc.lineNumber;

  const tocIndex = tocList.findIndex(item => item.lineNumber === tocLineNumber);
  const nextToc = tocList[tocIndex + 1];
  const sectionStartLineNumber: LineNumber = tocLineNumber;
  const sectionEndLineNumber: LineNumber = nextToc ? nextToc.lineNumber - 1 : lines.length;

  const beginLineNo = linesMatchContent(
    lines,
    content,
    sectionStartLineNumber,
    sectionEndLineNumber
  );
  const endLineNo = beginLineNo + content.length - 1;

  const updatedLines = linesReplace(lines, beginLineNo, endLineNo, []);
  writeFileLines(libraryName, fileType, name, updatedLines);
}

export function replaceSection(libraryName: LibraryName, fileType: FileType, name: ThingName, oldTocGlob: TocGlob, newHeading: string, newBodyContent: string[]): void {
  const lines = readFileLines(libraryName, fileType, name);
  const tocList = getTocList(libraryName, fileType, name);
  const matchedToc = matchToc(libraryName, fileType, name, oldTocGlob);
  const tocLineNumber = matchedToc.lineNumber;

  const tocIndex = tocList.findIndex(item => item.lineNumber === tocLineNumber);
  const nextToc = tocList[tocIndex + 1];

  const sectionStartLineNumber: LineNumber = tocLineNumber;
  const sectionEndLineNumber: LineNumber = nextToc ? nextToc.lineNumber - 1 : lines.length;

  const newSectionLines = [newHeading, ...newBodyContent];
  const updatedLines = linesReplace(lines, sectionStartLineNumber, sectionEndLineNumber, newSectionLines);

  writeFileLines(libraryName, fileType, name, updatedLines);
}
