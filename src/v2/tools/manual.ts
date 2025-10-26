import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { readFileContent, replaceContent } from '../shell.ts';
import { getLibraryPath } from '../runtime.ts';
import { checks } from '../../utils.ts';
import YAML from 'yaml';
import shell from 'shelljs';
import path from 'path';

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
    const { libraryName } = ReadManualInputSchema.parse(args);
    const content = readFileContent(libraryName, 'meta.md');
    return { content: [{ type: 'text', text: content }] };
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
    const { libraryName, toc, oldContent, newContent } = UpdateManualSectionInputSchema.parse(args);
    
    const libraryPath = getLibraryPath(libraryName);
    const fullPath = path.join(libraryPath, 'meta.md');

    // 1. Use grep to robustly check for the section heading's existence.
    const grepResult = shell.grep(toc, fullPath);
    if (grepResult.code !== 0 || !grepResult.stdout) {
        throw new Error(`在 meta.md 中未找到标题为 '${toc}' 的章节。请检查章节标题是否正确，或使用 readManual 工具查看可用的章节。`);
    }

    // 2. Read the whole file and perform a direct replacement.
    const fullContent = readFileContent(libraryName, 'meta.md');
    const updatedContent = fullContent.replace(oldContent, newContent);

    if (fullContent === updatedContent) {
        throw new Error(`在 meta.md 中未找到要替换的旧内容 (oldContent)。请确保 oldContent 参数与文件中的内容完全匹配。`);
    }

    // 3. Write the updated content back.
    // Note: The 'replaceContent' function in shell.ts was modified to be a full-file replacer.
    replaceContent(libraryName, 'meta.md', fullContent, updatedContent);

    const response = {
        status: 'success',
        message: `章节 '${toc}' 已在 meta.md 中更新。`,
    };

    return { content: [{ type: 'text', text: YAML.stringify(response) }] };
  },
};

// Export all manual tools in a structured way
export const manualTools = {
  readManual: readManualTool,
  updateManualSection: updateManualSectionTool,
};