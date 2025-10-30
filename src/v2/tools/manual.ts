import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {
  add,
  addInToc,
  matchTocNoThrow,
  readFileLines, replace,
  toTocLine,
} from "../shell";
import type {McpHandlerDefinition} from "../../typings.ts";

// Zod schema for the readManual tool
export const ReadManualInputSchema = z.object({
  libraryName: z.string().describe('要读取的知识库的名称'),
});

// Tool definition for readManual
export const readManualTool = {
  toolType: {
    name: 'readManual',
    description: '读取指定知识库中的 `meta.md` 文件，获取其完整内容',
    inputSchema: zodToJsonSchema(ReadManualInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName} = ReadManualInputSchema.parse(args);
    const lines = readFileLines(libraryName, 'meta.md');
    const content = lines.join('\n');
    return `---file-start: ${libraryName}/meta.md---
${content}
---file-end---`;
  },
};

// Zod schema for the updateManualSection tool
export const EditManualInputSchema = z.object({
  libraryName: z.string().describe('要更新的知识库的名称'),
  oldContent: z.string().describe('需要被替换的、一字不差的旧内容。必须是整行，一行或多行，可包含 toc'),
  newContent: z.string().describe('用于替换旧内容的新内容块。必须是整行，一行或多行，可包含 toc'),
});

// Tool definition for updateManualSection
export const editManualTool = {
  toolType: {
    name: 'editManualSection',
    description: '更新指定知识库的 `meta.md` 文件的内容',
    inputSchema: zodToJsonSchema(EditManualInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName, oldContent, newContent} = EditManualInputSchema.parse(args);
    replace(libraryName, 'meta.md', {
      'type': 'Lines',
      contentLines: oldContent.split('\n'),
    }, newContent.split('\n'));
    return `---status: success, message: content updated successfully in meta.md---`;
  },
};

export const AddManualSectionInputSchema = z.object({
  libraryName: z.string().describe('要更新的知识库的名称'),
  toc: z.string().describe('要新增或追加内容的章节'),
  newContent: z.string().describe('要追加的新内容块。必须是整行，一行或多行'),
});

// Tool definition for addManualSection
export const addManualSectionTool = {
  toolType: {
    name: 'addManualSection',
    description: '向指定知识库 `meta.md` 文件新增章节或在已有章节末尾追加内容',
    inputSchema: zodToJsonSchema(AddManualSectionInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName, toc, newContent} = AddManualSectionInputSchema.parse(args);
    // 先看看章节存不存在
    const tocMatch = matchTocNoThrow(libraryName, 'meta.md', toc);
    if (tocMatch.length > 0) {
      addInToc(libraryName, 'meta.md', toc, newContent.split('\n'));
    } else {
      add(libraryName, 'meta.md', [toTocLine(toc, 2), ...newContent.split('\n')]);
    }
    return `---status: success, message: content added successfully in meta.md---`;
  },
};

// Export all manual tools in a structured way
// name -> tool definition
export const manualTools: McpHandlerDefinition[] = [readManualTool, editManualTool, addManualSectionTool];

