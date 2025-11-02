import {z, ZodString} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {
  FileType,
  type FileWholeLines,
  type FrontMatterLine, FrontMatterPresetKeys, type McpHandlerDefinition
} from "../../typings";
import yaml from 'yaml';
import shell from 'shelljs';
import path from 'path';
import {createFile, moveFileToTrash, readFileLines, renameFile, writeFileLines} from "../editor/file-ops.ts";
import {getTocList} from "../editor/toc.ts";
import {readFrontMatterLines, writeFrontMatterLines, mergeFrontmatter} from "../editor/front-matter.ts";
import {splitFileIntoSections, Section} from "../editor/editing.ts";
import {add, addInToc, deleteInToc, readSectionContent, replaceSection} from "../editor/editing.ts";
import {getEntityDirPath} from "../runtime.ts";
import {normalize, normalizeReason} from "../editor/text.ts";
import {findEntityByNameGlob} from "../retrieval/retrieval.ts";

// Schema for a single entity
export const EntitySchema = z.object({
  name: z.string().describe('实体的名称'),
  type: z.string().optional().describe('实体的类型'),
  aliases: z.array(z.string()).optional().describe('实体别名列表,逗号分隔'),
  content: z.string().optional().describe('实体文档内容,Markdown,不含frontmatter'),
});

// Zod schema for the addEntities tool
export const AddEntitiesInputSchema = z.object({
  libraryName: z.string().describe('知识库名称'),
  entity: z.union([EntitySchema, z.array(EntitySchema)]).describe('要创建的文档,或文档列表'),
  reason: z.string().optional().describe('该调用的简要目的'),
});

/**
 * @tool addEntities
 * @description 在指定的知识库中，根据提供的信息批量创建新的知识实体文档。可以一次创建一个或多个实体。
 *
 * @input
 * - `libraryName`: (string, required) 知识库的名称。
 * - `entity`: (object | object[], required) 一个或多个实体对象。
 *   - `name`: (string, required) 实体的唯一名称，将作为文件名。
 *   - `type`: (string, optional) 实体的类型，例如 `person`, `concept`。
 *   - `aliases`: (string[], optional) 实体的别名列表。
 *   - `content`: (string, optional) 实体的 Markdown 正文内容。
 * - `reason`: (string, optional) 本次操作的简要目的说明。
 *
 * @output
 * - (string) 返回一个 XML 格式的报告，其中包含两个部分：
 *   1. `<addEntities CREATED ENTITIES>`: 列出所有成功创建的实体名称。
 *   2. `<addEntities FAILED ENTITIES>`: 列出所有创建失败的实体及其原因。
 *
 * @remarks
 * - 如果实体已存在，创建操作会失败。
 * - `name` 字段是必须的，且在知识库中必须唯一。
 * - 别名 `aliases` 会被处理成逗号分隔的字符串存储在 front matter 中。
 *
 * @todo
 * - [ ] 优化错误提示，为常见的失败（如命名冲突）提供更具体的建议。
 * - [ ] BUG: 当实体已存在时，错误反馈应提供操作建议，而不仅仅是报告错误。
 */
// Tool definition for addEntities
export const addEntitiesTool: McpHandlerDefinition<typeof AddEntitiesInputSchema, 'addEntities'> = {
  toolType: {
    name: 'addEntities',
    description: '创建新的知识实体文档',
    inputSchema: zodToJsonSchema(AddEntitiesInputSchema),
  },
  handler: (args, name) => {
    const {libraryName, entity, reason} = AddEntitiesInputSchema.parse(args);

    const entities = Array.isArray(entity) ? entity : [entity];
    const createdNames: string[] = [];
    const failedNames: {name: string, reason: string}[] = [];

    for (const entity of entities) {
      try {
        const { name, content, type, aliases, ...customFields } = entity;
        createFile(libraryName, FileType.FileTypeEntity, name, [] as FileWholeLines);
        const frontMatter: FrontMatterLine[] = [];
        if (type) {
          frontMatter.push(`${FrontMatterPresetKeys.EntityType}: ${type}`);
        }
        if (aliases && aliases.length > 0) {
          frontMatter.push(`${FrontMatterPresetKeys.Aliases}: ${aliases.join(', ')}`);
        }
        for (const [key, value] of Object.entries(customFields)) {
          if (value !== undefined) {
            frontMatter.push(`${key}: ${String(value)}`);
          }
        }

        if (frontMatter.length > 0) {
          writeFrontMatterLines(libraryName, FileType.FileTypeEntity, name, frontMatter);
        }
        if (content) {
          add(libraryName, FileType.FileTypeEntity, name, content.split('\n'));
        }
        createdNames.push(entity.name);
      } catch (error) {
        failedNames.push({name: entity.name, reason: (error as Error).message});
      }
    }

    let result = `<${name} reason=${normalizeReason(reason)} CREATED ENTITIES>
${createdNames.map(name => `- ${name}`).join('\n')}
</${name}>`;
    if (failedNames.length > 0) {
      result += `
<${name} reason=${normalizeReason(reason)} FAILED ENTITIES>
${failedNames.map(f => `- ${f.name}: ${f.reason}`).join('\n')}
</${name}>`;
    }

    // 返回内容，用 markdown 列表，写出创建的对象
    return result;
  },
};

// Zod schema for the deleteEntities tool
export const DeleteEntitiesInputSchema = z.object({
  libraryName: z.string().describe('知识库名称'),
  entityNames: z.union([z.string(), z.array(z.string())]).describe('要删除的实体名称,或名称列表'),
  reason: z.string().optional().describe('该调用的简要目的'),
});

/**
 * @tool deleteEntities
 * @description 将一个或多个知识实体文件移入知识库的 `trash` 目录（软删除）。
 *
 * @input
 * - `libraryName`: (string, required) 知识库的名称。
 * - `entityNames`: (string | string[], required) 要删除的实体名称，可以是单个名称、名称数组，或逗号分隔的名称字符串。
 * - `reason`: (string, optional) 本次操作的简要目的说明。
 *
 * @output
 * - (string) 返回一个 XML 格式的报告，其中包含两个部分：
 *   1. `<deleteEntities DELETED ENTITIES>`: 列出所有成功删除的实体名称。
 *   2. `<deleteEntities FAILED ENTITIES>`: 列出所有删除失败的实体及其原因。
 *
 * @remarks
 * - 这是一个软删除操作，文件会被移动到 `trash` 目录，而不是永久删除。
 * - 如果实体不存在，删除操作会失败。
 *
 * @todo
 * - 暂无
 */
// Tool definition for deleteEntities
export const deleteEntitiesTool: McpHandlerDefinition<typeof DeleteEntitiesInputSchema, 'deleteEntities'> = {
  toolType: {
    name: 'deleteEntities',
    description: '删除知识实体文档',
    inputSchema: zodToJsonSchema(DeleteEntitiesInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName, entityNames, reason} = DeleteEntitiesInputSchema.parse(args);
    // 考虑三种情况: 单个名称, 多个名称数组, 逗号分隔的字符串
    const entityNamesArray: string[] = typeof entityNames === 'string' ? entityNames.split(',').map(name => name.trim()) : entityNames;
    const deletedEntityNames: string[] = [];
    const failedEntityNames: {name: string, reason: string}[] = [];
    for (const entityName of entityNamesArray) {
      try {
        moveFileToTrash(libraryName, FileType.FileTypeEntity, entityName);
        deletedEntityNames.push(entityName);
      } catch (error) {
        failedEntityNames.push({name: entityName, reason: (error as Error).message});
      }
    }

    let result = `<deleteEntities reason=${normalizeReason(reason)} DELETED ENTITIES>
${deletedEntityNames.map(name => `- ${name}`).join('\n')}
</deleteEntities>`;
    if (failedEntityNames.length > 0) {
      result += `
<deleteEntities reason=${normalizeReason(reason)} FAILED ENTITIES>
${failedEntityNames.map(f => `- ${f.name}: ${f.reason}`).join('\n')}
</deleteEntities>`;
    }
    return result;
  },
};

// Zod schema for the readEntities tool
export const ReadEntitiesInputSchema = z.object({
  libraryName: z.string().describe('知识库名称'),
  entityNames: z.array(z.string()).describe('要读取的实体名称列表'),
  reason: z.string().optional().describe('该调用的简要目的')
});

/**
 * @tool readEntities
 * @description 读取一个或多个知识实体的完整内容，包括 front matter 和正文。
 *
 * @input
 * - `libraryName`: (string, required) 知识库的名称。
 * - `entityNames`: (string[], required) 要读取的实体名称列表。
 * - `reason`: (string, optional) 本次操作的简要目的说明。
 *
 * @output
 * - (string) 返回一个 XML 格式的报告，其中包含两部分：
 *   1. `<readEntities SUCCESSFUL ENTITIES>`: 对于每个成功读取的实体，其内容会包含在一个独立的 `<entity name="...">...</entity>` 标签内。
 *   2. `<readEntities FAILED ENTITIES>`: 列出所有读取失败的实体及其原因。
 *
 * @remarks
 * - 如果实体不存在，读取操作会失败。
 * - 返回的内容是未经处理的原始 Markdown 文件内容。
 *
 * @todo
 * - 暂无
 */
// Tool definition for readEntities
export const readEntitiesTool: McpHandlerDefinition<typeof ReadEntitiesInputSchema, 'readEntities'> = {
  toolType: {
    name: 'readEntities',
    description: '读取一个或多个实体的内容',
    inputSchema: zodToJsonSchema(ReadEntitiesInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName, entityNames, reason} = ReadEntitiesInputSchema.parse(args);
    const successEntityNames: {name: string, content: string}[] = [];
    const failedEntityNames: {name: string, reason: string}[] = [];

    for (const entityName of entityNames) {
      try {
        const lines = readFileLines(libraryName, FileType.FileTypeEntity, entityName);
        const content = lines.join('\n');
        successEntityNames.push({name: entityName, content: content});
      } catch (error) {
        failedEntityNames.push({name: entityName, reason: (error as Error).message});
      }
    }

    // 我们返回两个部分: 成功的实体和失败的实体。
    // ---FILE CONTENT: name---
    // ...
    // ---END FILE CONTENT: name---
    // ---FILE CONTENT: name---
    // ...
    // ---END FILE CONTENT: name---
    // 对于失败的实体:
    // ---FAILED ENTITIES---
    // - name: reason
    // - name: reason
    // ---END FAILED ENTITIES---
    let result = `<readEntities reason=${normalizeReason(reason)} SUCCESSFUL ENTITIES>\n`;
    for (const entity of successEntityNames) {
      // 用 xml 标签包裹内容，避免与正文冲突
      result += `<entity name="${entity.name}">
${entity.content}
</entity>\n`;
    }
    result += `</readEntities>`;

    if (failedEntityNames.length > 0) {
      result += `\n<readEntities reason=${normalizeReason(reason)} FAILED ENTITIES>\n`;
      for (const failed of failedEntityNames) {
        result += `- ${failed.name}: ${failed.reason}\n`;
      }
      result += `</readEntities>`;
    }
    return result;
  },
};

// Zod schema for the listEntities tool
export const ListEntitiesInputSchema = z.object({
  libraryName: z.string().describe('知识库名称'),
  entityNameGlobs: z.union([z.string(), z.array(z.string())]).describe('用于匹配实体名称的 glob 模式，或 glob 模式列表'),
  reason: z.string().optional().describe('该调用的简要目的'),
});

/**
 * @tool listEntities
 * @description 使用 glob 模式匹配并列出知识库中 `entities` 目录下的实体名称。
 *
 * @input
 * - `libraryName`: (string, required) 知识库的名称。
 * - `entityNameGlobs`: (string | string[], required) 用于匹配实体文件名的 glob 模式，或 glob 模式列表。支持 `*` (匹配任意字符序列) 和 `?` (匹配单个字符)。不支持 `**` 进行递归目录匹配。
 * - `reason`: (string, optional) 本次操作的简要目的说明。
 *
 * @output
 * - (string) 返回一个 XML 格式的报告，其中 `<listEntities LISTED ENTITIES>` 标签内包含所有匹配到的实体名称列表。
 *
 * @remarks
 * - Glob 模式仅应用于 `entities` 目录下的文件名，不进行递归搜索。
 * - 如果没有实体匹配成功，将返回一个空列表。
 *
 * @todo
 * - [ ] 考虑引入更强大的 glob 库，以支持 `**` 等递归匹配模式。
 */
// Tool definition for listEntities
export const listEntitiesTool: McpHandlerDefinition<typeof ListEntitiesInputSchema, 'listEntities'> = {
  toolType: {
    name: 'listEntities',
    description: '用 glob 模式匹配并列出实体名称',
    inputSchema: zodToJsonSchema(ListEntitiesInputSchema),
  },
  handler: (args, name) => {
    const {libraryName, entityNameGlobs, reason} = ListEntitiesInputSchema.parse(args);
    // 只需要两种情况：单个 glob 字符串，或多个 glob 数组
    const globs = typeof entityNameGlobs === 'string' ? [entityNameGlobs] : entityNameGlobs;
    const foundEntityNames: string[] = [];
    for (const glob of globs) {
      foundEntityNames.push(...findEntityByNameGlob(libraryName, glob));
    }
    return `<${name} reason=${normalizeReason(reason)} LISTED ENTITIES>
${foundEntityNames.map(name => `- ${name}`).join('\n')}
</${name}>`;
  },
};

// Zod schema for the getEntitiesToc tool
export const GetEntitiesTocInputSchema = z.object({
  libraryName: z.string().describe('知识库名称'),
  entityNames: z.union([z.string(), z.array(z.string())]).describe('要获取目录的实体名称,或名称列表'),
  reason: z.string().optional().describe('该调用的简要目的'),
});

/**
 * @tool getEntitiesToc
 * @description 获取一个或多个知识实体文档的目录结构 (Table of Contents, TOC)，包括正文中的所有 Markdown 标题（H1-H6）。
 *
 * @input
 * - `libraryName`: (string, required) 知识库的名称。
 * - `entityNames`: (string | string[], required) 要获取目录的实体名称，可以是单个名称或名称列表。
 * - `reason`: (string, optional) 本次操作的简要目的说明。
 *
 * @output
 * - (string) 返回一个 XML 格式的报告，其中包含两部分：
 *   1. `<getEntitiesToc TOCS OF ENTITIES>`: 对于每个成功获取 TOC 的实体，其 TOC 会包含在 `===实体名称 TOC START===` 和 `===实体名称 TOC END===` 之间，列出所有标题行。
 *   2. `<getEntitiesToc FAILED>`: 列出所有获取 TOC 失败的实体及其原因。
 *
 * @remarks
 * - TOC 列表会包含正文中所有 Markdown 标题的文本，不包括 Front Matter 中的内容。
 * - 如果实体不存在，操作会失败。
 *
 * @todo
 * - 暂无
 */
// Tool definition for getEntitiesToc
export const getEntitiesTocTool: McpHandlerDefinition<typeof GetEntitiesTocInputSchema, 'getEntitiesToc'> = {
  toolType: {
    name: 'getEntitiesToc',
    description: '获取一个或多个实体文档的目录 (TOC)',
    inputSchema: zodToJsonSchema(GetEntitiesTocInputSchema),
  },
  handler: (args: unknown, name) => {
    const {libraryName, entityNames, reason} = GetEntitiesTocInputSchema.parse(args);
    const entityNamesArray = Array.isArray(entityNames) ? entityNames : [entityNames];

    const successResults: { name: string; toc: string[] }[] = [];
    const failedResults: { name: string; reason: string }[] = [];

    for (const entityName of entityNamesArray) {
      try {
        const tocList = getTocList(libraryName, FileType.FileTypeEntity, entityName);
        const toc = tocList.map(item => item.tocLineContent);
        successResults.push({name: entityName, toc});
      } catch (e) {
        failedResults.push({name: entityName, reason: (e as Error).message});
      }
    }

    let result = '';
    if (successResults.length > 0) {
      let successContent = `<${name} reason="${normalizeReason(reason)}" TOCS OF ENTITIES>\n`;
      for (const res of successResults) {
        successContent += `===${res.name} TOC START===\n`;
        successContent += res.toc.map(item => `  - ${item}`).join('\n');
        successContent += `\n===${res.name} TOC END===\n`;
      }
      successContent += `</${name}>`;
      result += successContent;
    }

    if (failedResults.length > 0) {
      let failedContent = `<${name} reason="${normalizeReason(reason)}" FAILED>\n`;
      failedContent += failedResults.map(f => `  - ${f.name}: ${f.reason}`).join('\n');
      failedContent += `\n</${name}>`;
      if (result) result += '\n'; // Add a newline separator if there was a success tag
      result += failedContent;
    }

    return result;
  },
};

// Zod schema for the renameEntity tool
export const RenameEntityInputSchema = z.object({
  libraryName: z.string().describe('知识库名称'),
  oldName: z.string().describe('实体的旧名称'),
  newName: z.string().describe('实体的新名称'),
  reason: z.string().optional().describe('该调用的简要目的'),
});

/**
 * @tool renameEntity
 * @description 重命名知识实体文件，并自动更新所有在其他实体中指向该实体的关系链接。
 *
 * @input
 * - `libraryName`: (string, required) 知识库的名称。
 * - `oldName`: (string, required) 实体的旧名称。
 * - `newName`: (string, required) 实体的新名称。
 * - `reason`: (string, optional) 本次操作的简要目的说明。
 *
 * @output
 * - (string) 返回一个 XML 格式的报告，指示操作的成功或失败，并提供相关信息。
 *   - 成功时：`<renameEntity SUCCESS>` 包含旧名称、新名称以及更新的关联实体数量。
 *   - 失败时：`<renameEntity FAILED>` 包含错误信息。
 *
 * @remarks
 * - 该工具会修改文件系统中的实体文件名。
 * - 关系链接的更新是基于 Front Matter 中 `relation to: <entityName>` 模式的简单文本替换。
 * - 如果旧实体不存在或新实体名称已存在，操作会失败。
 *
 * @todo
 * - [ ] 考虑更复杂的链接更新场景，例如正文中的链接。
 */
// Tool definition for renameEntity
export const renameEntityTool: McpHandlerDefinition<typeof RenameEntityInputSchema, 'renameEntity'> = {
  toolType: {
    name: 'renameEntity',
    description: '重命名知识实体，并自动更新所有指向它的链接',
    inputSchema: zodToJsonSchema(RenameEntityInputSchema),
  },
  handler: (args: unknown, name) => {
    const { libraryName, oldName, newName, reason } = RenameEntityInputSchema.parse(args);

    try {
      // 1. Rename the file
      renameFile(libraryName, FileType.FileTypeEntity, oldName, newName);

      // 2. Find and update incoming relations
      const grepResults = shell.grep('-l', `relation to: ${oldName}`, path.join(getEntityDirPath(libraryName), '*.md'));
      const affectedFiles = grepResults.stdout.trim().split('\n').filter(Boolean);
      const affectedEntityNames = affectedFiles.map(file => path.basename(file, '.md'));

      for (const entityName of affectedEntityNames) {
        const lines = readFileLines(libraryName, FileType.FileTypeEntity, entityName);
        const updatedLines = lines.map(line =>
          line.includes(`relation to: ${oldName}`) ? line.replace(`relation to: ${oldName}`, `relation to: ${newName}`) : line
        );
        writeFileLines(libraryName, FileType.FileTypeEntity, entityName, updatedLines as FileWholeLines);
      }

      let message = `旧名字: ${oldName} --> 新名字: ${newName}`;
      message += `\n更新了 ${affectedEntityNames.length} 个关联实体。`;

      return `<${name} reason=${normalizeReason(reason)} SUCCESS>
${message}
</${name}>`;
    } catch (e) {
      return `<${name} reason=${normalizeReason(reason)} FAILED>
${(e as Error).message}
</${name}>`;
    }
  },
};

export const ReadEntitiesSectionsInputSchema = z.object({
  libraryName: z.string().describe('知识库名称'),
  entityNames: z.union([z.string(), z.array(z.string())]).describe('要读取章节的实体名称,或名称列表'),
  sectionGlobs: z.union([z.string(), z.array(z.string())]).describe('用于匹配章节标题的 glob 模式,或 glob 模式列表'),
  reason: z.string().optional().describe('该调用的简要目的'),
});

/**
 * @tool readEntitiesSections
 * @description 精确读取一个或多个知识实体中特定章节的内容。章节通过归一化后的子字符串匹配标题。
 *
 * @input
 * - `libraryName`: (string, required) 知识库的名称。
 * - `entityNames`: (string | string[], required) 要读取章节的实体名称，可以是单个名称或名称列表。
 * - `sectionGlobs`: (string | string[], required) 用于匹配章节标题的子字符串，或子字符串列表。匹配前会进行归一化处理（例如去除多余空格、转换为小写）。
 * - `reason`: (string, optional) 本次操作的简要目的说明。
 *
 * @output
 * - (string) 返回一个 XML 格式的报告，其中包含两部分：
 *   1. `<readEntitiesSections SUCCESS>`: 对于每个成功读取章节的实体，其内容会包含在 `===实体名称 SECTIONS: ... START===` 和 `===实体名称 END===` 之间。未匹配的章节内容会显示为 `...`。
 *   2. `<readEntitiesSections FAILED>`: 列出所有读取失败的实体及其原因。
 *
 * @remarks
 * - 章节标题匹配是模糊匹配，会先对标题进行标准化处理（例如去除多余空格、转换为小写）。
 * - 如果实体或章节不存在，操作会失败。
 *
 * @todo
 * - 暂无
 */
// Tool definition for readEntitiesSections
export const readEntitiesSectionsTool: McpHandlerDefinition<typeof ReadEntitiesSectionsInputSchema, 'readEntitiesSections'> = {
  toolType: {
    name: 'readEntitiesSections',
    description: '精确读取一个或多个实体中特定章节的内容',
    inputSchema: zodToJsonSchema(ReadEntitiesSectionsInputSchema),
  },
  handler: (args: unknown, name) => {
    const {libraryName, entityNames, sectionGlobs, reason} = ReadEntitiesSectionsInputSchema.parse(args);
    const entityNamesArray = Array.isArray(entityNames) ? entityNames : [entityNames];
    const sectionGlobsArray = Array.isArray(sectionGlobs) ? sectionGlobs : [sectionGlobs];

    const successResults: string[] = [];
    const failedResults: string[] = [];

    for (const entityName of entityNamesArray) {
      try {
        const matchedSections: string[] = [];
        let contentForEntity = '';

        // Handle ToC sections
        const fullToc = getTocList(libraryName, FileType.FileTypeEntity, entityName);
        for (const tocItem of fullToc) {
          const matchingGlob = sectionGlobsArray.find(glob => normalize(tocItem.tocLineContent).includes(normalize(glob)));
          contentForEntity += `${tocItem.tocLineContent}\n`;
          if (matchingGlob) {
            matchedSections.push(normalize(tocItem.tocLineContent));
            const sectionContent = readSectionContent(libraryName, FileType.FileTypeEntity, entityName, tocItem.tocLineContent);
            contentForEntity += `${sectionContent?.join('\n') || ''}\n`;
          } else {
            contentForEntity += `...\n`;
          }
        }

        let outputForEntity = `===${entityName} SECTIONS: ${matchedSections.join(', ')} START===\n`;
        outputForEntity += contentForEntity;
        outputForEntity += `===${entityName} END===`;
        successResults.push(outputForEntity);

      } catch (e) {
        failedResults.push(`- ${entityName}: ${(e as Error).message}`);
      }
    }

    let result = '';
    if (successResults.length > 0) {
      result += `<${name} reason="${normalizeReason(reason)}" SUCCESS>\n${successResults.join('\n')}\n</${name}>`;
    }
    if (failedResults.length > 0) {
      if (result) result += '\n';
      result += `<${name} reason="${normalizeReason(reason)}" FAILED>\n${failedResults.join('\n')}\n</${name}>`;
    }

    return result;
  },
};

// Zod schema for the addEntityContent tool
export const AddEntityContentInputSchema = z.object({
  libraryName: z.string().describe('知识库名称'),
  entityName: z.string().describe('要追加内容的实体名称'),
  inSection: z.string().describe('要追加内容的目标章节标题'),
  newContent: z.string().describe('要追加的 Markdown 内容，必须是整行或多行内容'),
  reason: z.string().optional().describe('该调用的简要目的'),
});

/**
 * @tool addEntityContent
 * @description 在指定知识实体的指定章节末尾追加新的 Markdown 内容。
 *
 * @input
 * - `libraryName`: (string, required) 知识库的名称。
 * - `entityName`: (string, required) 要追加内容的实体名称。
 * - `inSection`: (string, required) 要追加内容的目标章节标题。匹配前会进行归一化处理（例如去除多余空格、转换为小写）。
 * - `newContent`: (string, required) 要追加的 Markdown 内容，必须是整行或多行内容。
 * - `reason`: (string, optional) 本次操作的简要目的说明。
 *
 * @output
 * - (string) 返回一个 XML 格式的报告，指示操作的成功或失败，并提供相关信息。
 *   - 成功时：`<addEntityContent result="success">` 包含操作成功的消息。
 *   - 失败时：`<addEntityContent result="failure">` 包含错误信息。
 *
 * @remarks
 * - 章节标题匹配是模糊匹配，会先对标题进行标准化处理。
 * - 如果实体或章节不存在，操作会失败。
 *
 * @todo
 * - 暂无
 */
// Tool definition for addEntityContent
export const addEntityContentTool: McpHandlerDefinition<typeof AddEntityContentInputSchema, 'addEntityContent'> = {
  toolType: {
    name: 'addEntityContent',
    description: '在指定实体的指定章节末尾追加内容',
    inputSchema: zodToJsonSchema(AddEntityContentInputSchema),
  },
  handler: (args: unknown, name) => {
    const { libraryName, entityName, inSection, newContent, reason } = AddEntityContentInputSchema.parse(args);
    try {
      addInToc(libraryName, FileType.FileTypeEntity, entityName, inSection, newContent.split('\n'));
      const message = `Content added to section '${inSection}' in entity '${entityName}'.`;
      return `<${name} reason="${normalizeReason(reason)}" result="success">\n${message}\n</${name}>`;
    } catch (e) {
      return `<${name} reason="${normalizeReason(reason)}" result="failure">\n${(e as Error).message}\n</${name}>`;
    }
  },
};

// Zod schema for the deleteEntityContent tool
export const DeleteEntityContentInputSchema = z.object({
  libraryName: z.string().describe('知识库名称'),
  entityName: z.string().describe('要删除内容的实体名称'),
  inSection: z.string().describe('要删除内容的目标章节标题'),
  contentToDelete: z.string().describe('要精确删除的 Markdown 内容，必须是精确的整行或多行内容'),
  reason: z.string().optional().describe('该调用的简要目的'),
});

/**
 * @tool deleteEntityContent
 * @description 从指定知识实体的指定章节中精确删除一段 Markdown 内容。
 *
 * @input
 * - `libraryName`: (string, required) 知识库的名称。
 * - `entityName`: (string, required) 要删除内容的实体名称。
 * - `inSection`: (string, required) 要删除内容的目标章节标题。匹配前会进行归一化处理。
 * - `contentToDelete`: (string, required) 要精确删除的 Markdown 内容，必须是精确的整行或多行内容。
 * - `reason`: (string, optional) 本次操作的简要目的说明。
 *
 * @output
 * - (string) 返回一个 XML 格式的报告，指示操作的成功或失败，并提供相关信息。
 *   - 成功时：`<deleteEntityContent SUCCESS>` 包含操作成功的消息。
 *   - 失败时：`<deleteEntityContent FAILED>` 包含错误信息。
 *
 * @remarks
 * - `contentToDelete` 必须与文件中现有内容精确匹配（包括换行符和空格），才能成功删除。
 * - 章节标题匹配是模糊匹配，会先对标题进行标准化处理。
 * - 如果实体、章节或指定内容不存在，操作会失败。
 *
 * @todo
 * - 暂无
 */
// Tool definition for deleteEntityContent
export const deleteEntityContentTool: McpHandlerDefinition<typeof DeleteEntityContentInputSchema, 'deleteEntityContent'> = {
  toolType: {
    name: 'deleteEntityContent',
    description: '从实体指定章节中精确删除一段内容',
    inputSchema: zodToJsonSchema(DeleteEntityContentInputSchema),
  },
  handler: (args: unknown, name) => {
    const { libraryName, entityName, inSection, contentToDelete, reason } = DeleteEntityContentInputSchema.parse(args);
    try {
      deleteInToc(libraryName, FileType.FileTypeEntity, entityName, inSection, contentToDelete.split('\n'));
      const message = `Content deleted from section '${inSection}' in entity '${entityName}'.`;
      return `<${name} reason=${normalizeReason(reason)} SUCCESS>\n${message}\n</${name}>`;
    } catch (e) {
      return `<${name} reason=${normalizeReason(reason)} FAILED>\n${(e as Error).message}\n</${name}>`;
    }
  },
};

export const ReplaceEntitySectionInputSchema = z.object({
  libraryName: z.string().describe('知识库名称'),
  entityName: z.string().describe('要替换章节的实体名称'),
  oldHeading: z.string().describe('要替换的旧章节标题'),
  newHeading: z.string().describe('新章节标题'),
  newBodyContent: z.string().describe('新章节的完整正文内容，必须是整行或多行内容'),
  reason: z.string().optional().describe('该调用的简要目的'),
});

/**
 * @tool replaceEntitySection
 * @description 重写知识实体的指定章节，可同时修改其章节标题和其全部正文内容。
 *
 * @input
 * - `libraryName`: (string, required) 知识库的名称。
 * - `entityName`: (string, required) 要替换章节的实体名称。
 * - `oldHeading`: (string, required) 要替换的旧章节标题。匹配前会进行归一化处理。
 * - `newHeading`: (string, required) 新章节标题。
 * - `newBodyContent`: (string, required) 新章节的完整正文内容，必须是整行或多行内容。
 * - `reason`: (string, optional) 本次操作的简要目的说明。
 *
 * @output
 * - (string) 返回一个 XML 格式的报告，指示操作的成功或失败，并提供相关信息。
 *   - 成功时：`<replaceEntitySection SUCCESS>` 包含操作成功的消息。
 *   - 失败时：`<replaceEntitySection FAILED>` 包含错误信息。
 *
 * @remarks
 * - 章节标题匹配是模糊匹配，会先对标题进行标准化处理。
 * - 如果实体或旧章节不存在，操作会失败。
 *
 * @todo
 * - 暂无
 */
// Tool definition for replaceEntitySection
export const replaceEntitySectionTool: McpHandlerDefinition<typeof ReplaceEntitySectionInputSchema, 'replaceEntitySection'> = {
  toolType: {
    name: 'replaceEntitySection',
    description: '重写知识实体的指定章节，可同时修改其章节标题和其全部正文',
    inputSchema: zodToJsonSchema(ReplaceEntitySectionInputSchema),
  },
  handler: (args: unknown, name) => {
    const { libraryName, entityName, oldHeading, newHeading, newBodyContent, reason } = ReplaceEntitySectionInputSchema.parse(args);
    try {
      replaceSection(libraryName, FileType.FileTypeEntity, entityName, oldHeading, newHeading, newBodyContent.split('\n'));
      const message = `Section '${oldHeading}' in entity '${entityName}' has been replaced with '${newHeading}'.`;
      return `<${name} reason=${normalizeReason(reason)} SUCCESS>\n${message}\n</${name}>`;
    } catch (e) {
      return `<${name} reason=${normalizeReason(reason)} FAILED>\n${(e as Error).message}\n</${name}>`;
    }
  },
};

// Zod schema for the mergeEntities tool
export const MergeEntitiesInputSchema = z.object({
  libraryName: z.string().describe('知识库名称'),
  sourceNames: z.array(z.string()).describe('要合并的源实体名称列表'),
  targetName: z.string().describe('合并的目标实体名称'),
  reason: z.string().optional().describe('该调用的简要目的'),
});

/**
 * @tool mergeEntities
 * @description 将多个源知识实体的内容和 Front Matter 合并到一个目标知识实体中，并删除源实体。
 *
 * @input
 * - `libraryName`: (string, required) 知识库的名称。
 * - `sourceNames`: (string[], required) 要合并的源实体名称列表。
 * - `targetName`: (string, required) 合并的目标实体名称。
 * - `reason`: (string, optional) 本次操作的简要目的说明。
 *
 * @output
 * - (string) 返回一个 XML 格式的报告，指示操作的成功或失败。
 *   - 成功时：`<mergeEntities SUCCESS>` 包含合并后的目标实体的完整内容。
 *   - 失败时：`<mergeEntities FAILED>` 包含错误信息。
 *
 * @remarks
 * - Front Matter 会进行合并，重复的键值对会保留目标实体的值。
 * - 正文内容会按章节合并：如果源实体和目标实体有相同标题的章节，则源章节内容会追加到目标章节末尾；否则，源章节会作为新章节添加到目标实体中。
 * - 合并完成后，所有源实体文件将被移动到 `trash` 目录。
 * - 如果源实体或目标实体不存在，操作会失败。
 *
 * @todo
 * - [ ] 优化 Front Matter 的合并策略，例如允许指定合并优先级或冲突解决方式。
 * - [ ] 考虑在合并时自动更新指向源实体的关系链接，使其指向目标实体。
 * - [ ] BUG: 合并 Front Matter 时，除了 type 字段外，所有其他自定义的元数据字段也应该被合并。
 */
// Tool definition for mergeEntities
export const mergeEntitiesTool: McpHandlerDefinition<typeof MergeEntitiesInputSchema, 'mergeEntities'> = {
  toolType: {
    name: 'mergeEntities',
    description: '将多个源知识实体内容合并到一个目标知识实体中，并删除源实体',
    inputSchema: zodToJsonSchema(MergeEntitiesInputSchema),
  },
  handler: (args: unknown, name) => {
    const { libraryName, sourceNames, targetName, reason } = MergeEntitiesInputSchema.parse(args);

    try {
      // 1. Handle Frontmatter
      let targetFrontmatter = readFrontMatterLines(libraryName, FileType.FileTypeEntity, targetName) ?? [];
      for (const sourceName of sourceNames) {
        const sourceFrontmatter = readFrontMatterLines(libraryName, FileType.FileTypeEntity, sourceName) ?? [];
        targetFrontmatter = mergeFrontmatter(targetFrontmatter, sourceFrontmatter);
      }

      // 2. Split files into sections
      const targetSections = splitFileIntoSections(libraryName, FileType.FileTypeEntity, targetName);
      const allSourceSections = sourceNames.flatMap(sourceName =>
        splitFileIntoSections(libraryName, FileType.FileTypeEntity, sourceName)
      );

      const targetSectionMap = new Map<string, Section>();
      for (const section of targetSections) {
        targetSectionMap.set(normalize(section.tocItem.tocLineContent), section);
      }

      const newSections: Section[] = [];
      const processedSourceSections = new Set<Section>();

      // 3. Merge matching sections
      for (const sourceSection of allSourceSections) {
        const normalizedSourceToc = normalize(sourceSection.tocItem.tocLineContent);
        const targetSection = targetSectionMap.get(normalizedSourceToc);
        if (targetSection) {
          targetSection.content.push(...sourceSection.content);
          processedSourceSections.add(sourceSection);
        }
      }

      // 4. Collect remaining sections
      for (const sourceSection of allSourceSections) {
        if (!processedSourceSections.has(sourceSection)) {
          // Check if a new section with the same name already exists
          const existingNewSection = newSections.find(s => normalize(s.tocItem.tocLineContent) === normalize(sourceSection.tocItem.tocLineContent));
          if (existingNewSection) {
            existingNewSection.content.push(...sourceSection.content);
          } else {
            newSections.push(sourceSection);
          }
        }
      }

      targetSections.push(...newSections);

      // 5. Construct final content and write to target file
      const finalContentLines: string[] = [];

      // Add frontmatter
      if (targetFrontmatter.length > 0) {
        finalContentLines.push('---');
        finalContentLines.push(...targetFrontmatter);
        finalContentLines.push('---');
      }

      // Add sections, normalizing all headings to '##'
      for (const section of targetSections) {
        // Normalize heading to '##'
        const normalizedHeading = `## ${normalize(section.tocItem.tocLineContent)}`;
        finalContentLines.push(normalizedHeading);
        finalContentLines.push(...section.content);
      }

      writeFileLines(libraryName, FileType.FileTypeEntity, targetName, finalContentLines);

      // 6. Delete source files
      for (const sourceName of sourceNames) {
        moveFileToTrash(libraryName, FileType.FileTypeEntity, sourceName);
      }

      // 7. Return the merged content
      const mergedFileContent = readFileLines(libraryName, FileType.FileTypeEntity, targetName).join('\n');
      return `<${name} reason=${normalizeReason(reason)} SUCCESS>\n${mergedFileContent}\n</${name}>`;

    } catch (e) {
      return `<${name} reason=${normalizeReason(reason)} FAILED>\n${(e as Error).message}\n</${name}>`;
    }
  },
};

// Zod schema for the garbageCollectRelations tool
export const GarbageCollectRelationsInputSchema = z.object({
  libraryName: z.string().describe('知识库名称'),
  dryRun: z.boolean().optional().default(true).describe('是否为演习模式。如果为 true，则只报告问题而不实际执行清理。'),
  reason: z.string().optional().describe('该调用的简要目的'),
});

/**
 * @tool garbageCollectRelations
 * @description 查找并清理知识库中所有指向不存在知识实体的“断裂链接”。
 *
 * @input
 * - `libraryName`: (string, required) 知识库的名称。
 * - `dryRun`: (boolean, optional, default: true) 是否为演习模式。如果为 `true`，则只报告问题而不实际执行清理。
 * - `reason`: (string, optional) 本次操作的简要目的说明。
 *
 * @output
 * - (string) 目前返回一个占位符消息，指示该工具尚未实现。
 *
 * @remarks
 * - 该工具目前尚未实现，调用将返回错误信息。
 * - 预期功能是遍历所有实体，检查其 Front Matter 中的关系链接，如果链接指向的实体不存在，则报告或删除该链接。
 *
 * @todo
 * - [ ] 实现该工具的完整逻辑，包括查找和清理断裂链接的功能。
 * - [ ] 定义清理操作的详细行为，例如是删除关系行还是标记为无效。
 */
// Tool definition for garbageCollectRelations
export const garbageCollectRelationsTool = {
  toolType: {
    name: 'garbageCollectRelations',
    description: '查找并清理知识库中指向不存在知识实体的“断裂链接”',
    inputSchema: zodToJsonSchema(GarbageCollectRelationsInputSchema),
  },
  handler: (args: unknown) => {
    // TODO 其他工具尚未实现完毕，暂时不实现
    return '---status: failed, message: garbageCollectRelations tool is not yet implemented.---';
  }
};

export const entityTools = [addEntitiesTool, deleteEntitiesTool, readEntitiesTool, listEntitiesTool, getEntitiesTocTool, renameEntityTool, readEntitiesSectionsTool, addEntityContentTool, deleteEntityContentTool, replaceEntitySectionTool, mergeEntitiesTool, garbageCollectRelationsTool];
