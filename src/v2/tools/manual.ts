import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {
  addInToc,
  deleteInToc,
  getTocList,
  linesMatchContent,
  linesReplace,
  matchToc,
  readFileLines,
  writeFileLines
} from "../shell";
import type {LineNumber} from "../../typings";

// Zod schema for the readManual tool
export const ReadManualInputSchema = z.object({
  libraryName: z.string().describe('要读取的知识库的名称。'),
});

// Zod schema for the updateManualSection tool
export const UpdateManualSectionInputSchema = z.object({
  libraryName: z.string().describe('要更新的知识库的名称。'),
  toc: z.string().describe('要更新的章节的标题 (TOC)。它将通过模糊匹配来定位章节，例如 `installation guide` 会匹配到 `## Installation (Guide)`'),
  oldContent: z.string().describe('需要被替换的、一字不差的旧内容块。为保证精度，建议提供完整的行。'),
  newContent: z.string().describe('用于替换旧内容的新内容块。为保证精度，建议提供完整的行。'),
});

export const AddManualSectionInputSchema = z.object({
  libraryName: z.string().describe('要更新的知识库的名称。'),
  toc: z.string().describe('内容将追加到该章节的末尾。'),
  newContent: z.string().describe('要追加的新内容。'),
});

export const DeleteManualSectionInputSchema = z.object({
  libraryName: z.string().describe('要更新的知识库的名称。'),
  toc: z.string().describe('将从该章节中删除内容。'),
  deletingContent: z.string().describe('需要被删除的、一字不差的内容块。'),
});

// Tool definition for readManual
export const readManualTool = {
  toolType: {
    name: 'readManual',
    description: '读取指定知识库中的 `meta.md` 文件，获取其完整内容。',
    inputSchema: zodToJsonSchema(ReadManualInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName} = ReadManualInputSchema.parse(args);
    const lines = readFileLines(libraryName, 'meta.md');
    const content = lines.join('\n');
    return {
      content: [{
        text: content,
      }]
    }
  },
};

// Tool definition for updateManualSection
export const updateManualSectionTool = {
  toolType: {
    name: 'updateManualSection',
    description: '更新指定知识库 `meta.md` 文件中的一个章节。',
    inputSchema: zodToJsonSchema(UpdateManualSectionInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName, toc, oldContent, newContent} = UpdateManualSectionInputSchema.parse(args);

    const lines = readFileLines(libraryName, 'meta.md');
    const tocList = getTocList(libraryName, 'meta.md');

    // 1. Locate the TOC and determine the section's scope
    const matchedToc = matchToc(libraryName, 'meta.md', toc);
    const tocIndex = tocList.findIndex(item => item.lineNumber === matchedToc.lineNumber);
    const nextToc = tocList[tocIndex + 1];
    const sectionStartLine: LineNumber = matchedToc.lineNumber;
    const sectionEndLine: LineNumber = nextToc ? (nextToc.lineNumber - 1) as LineNumber : lines.length as LineNumber;

    // 2. Find the exact line number of the old content within the section
    const oldContentLines = oldContent.split('\n');
    const beginLineNo = linesMatchContent(lines, oldContentLines, sectionStartLine, sectionEndLine);
    const endLineNo = (beginLineNo + oldContentLines.length - 1) as LineNumber;

    // 3. Replace the content
    const newContentLines = newContent.split('\n');
    const updatedLines = linesReplace(lines, beginLineNo, endLineNo, newContentLines);

    // 4. Write the changes back
    writeFileLines(libraryName, 'meta.md', updatedLines);

    return {
      status: 'success',
      message: `Section '${matchedToc.tocLineContent}' in meta.md was updated.`,
    }
  },
};

// Export all manual tools in a structured way
export const manualTools = {
  readManual: readManualTool,
  updateManualSection: updateManualSectionTool,
  addManualSection: {
    toolType: {
          handler: (args: unknown) => {
      const {libraryName, toc, newContent} = AddManualSectionInputSchema.parse(args);
      addInToc(libraryName, 'meta.md', toc, newContent.split('\n'));
      return {
        status: 'success',
        message: `Content added to section '${toc}' in meta.md.`,
      }
    },
  },
  deleteManualSection: {
    toolType: {
      name: 'deleteManualSection',
      description: '从 `meta.md` 的指定章节中删除内容。',
      inputSchema: zodToJsonSchema(DeleteManualSectionInputSchema),
    },
    handler: (args: unknown) => {
      const {libraryName, toc, deletingContent} = DeleteManualSectionInputSchema.parse(args);
      deleteInToc(libraryName, 'meta.md', toc, deletingContent.split('\n'));
      return {
        status: 'success',
        message: `Content deleted from section '${toc}' in meta.md.`,
      }
    },
  },
};
