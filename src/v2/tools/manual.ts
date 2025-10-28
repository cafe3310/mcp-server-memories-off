import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {
  addInToc,
  deleteInToc,
  readFileLines,
  replaceInToc,
} from "../shell";

// Zod schema for the readManual tool
export const ReadManualInputSchema = z.object({
  libraryName: z.string().describe('要读取的知识库的名称'),
});

// Zod schema for the updateManualSection tool
export const EditManualSectionInputSchema = z.object({
  libraryName: z.string().describe('要更新的知识库的名称'),
  toc: z.string().describe('要更新的章节的标题 (TOC)，匹配时忽略标点和大小写'),
  oldContent: z.string().describe('需要被替换的、一字不差的旧内容。必须是整行，一行或多行'),
  newContent: z.string().describe('用于替换旧内容的新内容块。必须是整行，一行或多行'),
});

export const AddManualSectionInputSchema = z.object({
  libraryName: z.string().describe('要更新的知识库的名称'),
  toc: z.string().describe('内容将追加到该章节末尾'),
  newContent: z.string().describe('要追加的新内容块。必须是整行，一行或多行'),
});

export const DeleteManualSectionInputSchema = z.object({
  libraryName: z.string().describe('要更新的知识库的名称'),
  toc: z.string().describe('将从该章节中删除内容'),
  deletingContent: z.string().describe('需要被删除的、一字不差的内容块。必须是整行，一行或多行'),
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

// Tool definition for updateManualSection
export const editManualSectionTool = {
  toolType: {
    name: 'editManualSection',
    description: '更新指定知识库 `meta.md` 文件中的一个章节。',
    inputSchema: zodToJsonSchema(EditManualSectionInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName, toc, oldContent, newContent} = EditManualSectionInputSchema.parse(args);
    replaceInToc(libraryName, 'meta.md', toc, {
      type: "Lines",
      contentLines: oldContent.split('\n')
    }, newContent.split('\n'));
    return `---status: success, message: content updated successfully in meta.md---`;
  },
};

// Tool definition for addManualSection
export const addManualSectionTool = {
  toolType: {
    name: 'addManualSection',
    description: '向指定知识库 `meta.md` 文件中的一个章节添加内容。',
    inputSchema: zodToJsonSchema(AddManualSectionInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName, toc, newContent} = AddManualSectionInputSchema.parse(args);
    addInToc(libraryName, 'meta.md', toc, newContent.split('\n'));
    return `---status: success, message: content added successfully in meta.md---`;
  },
};

// Tool definition for deleteManualSection
export const deleteManualSectionTool = {
  toolType: {
    name: 'deleteManualSection',
    description: '从指定知识库 `meta.md` 文件中的一个章节删除内容。',
    inputSchema: zodToJsonSchema(DeleteManualSectionInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName, toc, deletingContent} = DeleteManualSectionInputSchema.parse(args);
    deleteInToc(libraryName, 'meta.md', toc, deletingContent.split('\n'));
    return `---status: success, message: content deleted successfully in meta.md---`;
  },
};

// Export all manual tools in a structured way
export const manualTools = {
  readManual: readManualTool,
  updateManualSection: editManualSectionTool,
  addManualSection: addManualSectionTool,
  deleteManualSection: deleteManualSectionTool,
};
