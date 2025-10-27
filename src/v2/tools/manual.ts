import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

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

// Tool definition for readManual
export const readManualTool = {
  toolType: {
    name: 'readManual',
    description: '读取指定知识库中的 `meta.md` 文件，获取其完整内容。',
    inputSchema: zodToJsonSchema(ReadManualInputSchema),
  },
  handler: (args: unknown) => {

    // TODO 尚未实现

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

    // TODO 尚未实现

  },};

// Export all manual tools in a structured way
export const manualTools = {
  readManual: readManualTool,
  updateManualSection: updateManualSectionTool,
};
