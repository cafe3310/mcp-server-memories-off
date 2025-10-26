import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {matchToc, readFileContent, replaceContent} from '../shell.ts';
import { getLibraryPath } from '../runtime.ts';
import YAML from 'yaml';
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
  
    // 1. Use matchToc to find the unique heading.
    const matchedHeading = matchToc(fullPath, toc);
    
    // fixme 我们这里其实并没有用到 matchedHeading，后续可以改进为基于 heading 定位内容块进行替换，而不是全文替换
    //       为此还需要定义一个比较复杂的 {content, beginline, endline} 范围匹配和替换逻辑。
  
    // 2. Read the whole file and perform a direct replacement. Only replace first match
    const fullContent = readFileContent(libraryName, 'meta.md');
    const updatedContent = fullContent.replace(oldContent, newContent);
  
    if (fullContent === updatedContent) {
      throw new Error(`在 meta.md 中未找到要替换的旧内容 (oldContent)。请确保 oldContent 参数与文件中的内容完全匹配。`);
    }
  
    // 3. Write the updated content back.
    replaceContent(libraryName, 'meta.md', fullContent, updatedContent);
  
    const response = {
      status: 'success',
      message: `章节 '${matchedHeading.substring(3).trim()}' 已在 meta.md 中更新。`,
    };
  
    return { content: [{ type: 'text', text: YAML.stringify(response) }] };
  },};

// Export all manual tools in a structured way
export const manualTools = {
  readManual: readManualTool,
  updateManualSection: updateManualSectionTool,
};