import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {FileType, type McpHandlerDefinition} from "../../typings.ts";
import {normalizeReason} from "../editor/text.ts";
import {readFileLines} from "../editor/file-ops.ts";
import {add, replace} from "../editor/editing.ts";
import {getLibraryNames} from "../runtime.ts";

// Zod schema for the readManual tool
const ReadManualInputSchema = z.object({
  libraryName: z.string().describe('知识库名称,可用值:' + getLibraryNames()),
  reason: z.string().optional().describe('该调用的简要目的'),
});

/**
 * @tool readManual
 * @description 读取指定知识库的 `meta.md` 文件的全部内容。`meta.md` 文件通常包含知识库的描述、使用指南和配置信息。
 *
 * @input
 * - `libraryName`: (string, required) 知识库的名称。
 * - `reason`: (string, optional) 本次操作的简要目的说明。
 *
 * @output
 * - (string) 返回一个 XML 格式的报告，其中 `<readManual CONTENT>` 标签内包含 `meta.md` 文件的完整内容。
 *
 * @remarks
 * - 如果 `meta.md` 文件不存在，操作会失败。
 *
 * @todo
 * - 暂无
 */
// Tool definition for readManual
export const readManualTool: McpHandlerDefinition<typeof ReadManualInputSchema, 'readManual'> = {
  toolType: {
    name: 'readManual',
    description: '读取知识库的描述文档',
    inputSchema: zodToJsonSchema(ReadManualInputSchema),
  },
  handler: (args, name) => {
    const {libraryName, reason} = ReadManualInputSchema.parse(args);
    const lines = readFileLines(libraryName, FileType.FileTypeMeta, '');

    // 返回内容
    return `<${name} reason=${normalizeReason(reason)} CONTENT>
${lines.join('\n')}
</${name}>`;
  },
};

// Zod schema for the updateManualSection tool
export const EditManualInputSchema = z.object({
  libraryName: z.string().describe('知识库名称'),
  oldLines: z.string().describe('要被替换的整行旧内容块,留空以在文件末尾添加'),
  newLines: z.string().describe('要换成的整行新内容块,留空以删除旧内容块'),
  reason: z.string().optional().describe('该调用的简要目的'),
});

/**
 * @tool editManual
 * @description 编辑或增删知识库 `meta.md` 文档的指定内容。可以通过精确匹配旧内容来替换，也可以在文件末尾追加新内容。
 *
 * @input
 * - `libraryName`: (string, required) 知识库的名称。
 * - `oldLines`: (string, required) 要被替换的整行旧内容块。如果为空字符串，则表示在文件末尾追加 `newLines`。
 * - `newLines`: (string, required) 要替换成的整行新内容块。如果 `oldLines` 非空且 `newLines` 为空，则表示删除 `oldLines`。
 * - `reason`: (string, optional) 本次操作的简要目的说明。
 *
 * @output
 * - (string) 返回一个 XML 格式的报告，其中 `<editManual UPDATED CONTENT>` 标签内包含编辑后 `meta.md` 文件的完整内容。
 *
 * @remarks
 * - `oldLines` 和 `newLines` 必须是精确匹配的整行或多行内容，包括换行符和空格。
 * - 如果 `oldLines` 为空，`newLines` 将被追加到文件末尾。
 * - 如果 `oldLines` 非空且 `newLines` 为空，`oldLines` 将被删除。
 * - 如果 `meta.md` 文件不存在，操作会失败。
 *
 * @todo
 * - [ ] 考虑支持章节级别的编辑，而不是仅通过精确内容匹配。
 * - [ ] BUG: 在 `meta.md` 不存在时，工具应自动创建文件而不是失败。
 * - [ ] BUG: 在匹配 `oldLines` 时，应忽略空行和多余的空白字符，进行归一化匹配。
 * - [ ] 修复 `meta.md` 不存在时工具卡顿的问题后，需要更新 E2E 测试以适应新的输出格式。
 */
// Tool definition for updateManualSection
export const editManualTool: McpHandlerDefinition<typeof EditManualInputSchema, 'editManual'> = {
  toolType: {
    name: 'editManual',
    description: '编辑或增删知识库的描述文档的指定内容',
    inputSchema: zodToJsonSchema(EditManualInputSchema),
  },
  handler: (args, name) => {
    const {libraryName, oldLines, newLines, reason} = EditManualInputSchema.parse(args);

    if ((oldLines || '').trim().length > 0) {
      // 如果 oldLines 非空 - 编辑
      replace(libraryName, FileType.FileTypeMeta, '', {
        'type': 'Lines',
        contentLines: oldLines.split('\n'),
      }, newLines.split('\n'));
    } else {
      // 否则追加到文件末尾
      add(libraryName, FileType.FileTypeMeta, '', newLines.split('\n'));
    }

    // 对该工具，我们返回编辑后的全文
    const lines = readFileLines(libraryName, FileType.FileTypeMeta, '');
    return `<${name} reason=${normalizeReason(reason)} result=success UPDATED CONTENT>
${lines.join('\n')}
</${name}>`;
  },
};

// Export all manual tools in a structured way
// name -> tool definition
export const manualTools = [readManualTool, editManualTool];

