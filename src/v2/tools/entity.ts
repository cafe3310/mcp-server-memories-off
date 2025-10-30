import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {
  type FileRelativePath,
  FileType,
  type FileWholeLines,
  type FrontMatter,
  type McpHandlerDefinition
} from "../../typings";
import yaml from 'yaml';
import shell from 'shelljs';
import path from 'path';
import {createFile, moveFileToTrash, readFileLines, renameFile, writeFileLines} from "../editor/file-ops.ts";
import {getTocList} from "../editor/toc.ts";
import {readFrontMatter, writeFrontMatter} from "../editor/front-matter.ts";
import {add, addInToc, deleteInToc, readSectionContent, replaceSection} from "../editor/editing.ts";
import {getEntityDirPath} from "../runtime.ts";

// Zod schema for the createEntity tool
export const CreateEntityInputSchema = z.object({
  libraryName: z.string().describe('要在其中创建实体的知识库的名称'),
  entityName: z.string().describe('新实体的名称'),
});

// Tool definition for createEntity
export const createEntityTool = {
  toolType: {
    name: 'createEntity',
    description: '在指定的知识库中创建一个新的实体（即一个 .md 文件）',
    inputSchema: zodToJsonSchema(CreateEntityInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName, entityName} = CreateEntityInputSchema.parse(args);
    createFile(libraryName, FileType.FileTypeEntity, entityName, [] as FileWholeLines);
    return `---status: success, message: entity ${entityName} created successfully in library ${libraryName}---`;
  },
};

// Schema for a single entity
export const EntitySchema = z.object({
  name: z.string().describe('实体的名称'),
  type: z.string().optional().describe('实体的类型'),
  aliases: z.array(z.string()).optional().describe('实体的别名列表'),
  content: z.string().optional().describe('实体的Markdown内容'),
});

// Zod schema for the addEntities tool
export const AddEntitiesInputSchema = z.object({
  libraryName: z.string().describe('要在其中创建实体的知识库的名称'),
  entities: z.array(EntitySchema).describe('要创建的实体列表'),
});

// Tool definition for addEntities
export const addEntitiesTool = {
  toolType: {
    name: 'addEntities',
    description: '在指定的知识库中批量创建新的实体（即 .md 文件），可包含初始内容和元数据',
    inputSchema: zodToJsonSchema(AddEntitiesInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName, entities} = AddEntitiesInputSchema.parse(args);
    const createdEntityNames: string[] = [];

    for (const entity of entities) {
      createFile(libraryName, FileType.FileTypeEntity, entity.name, [] as FileWholeLines);

      const frontMatter: FrontMatter = new Map();
      if (entity.type) {
        frontMatter.set('entity type', entity.type);
      }
      if (entity.aliases && entity.aliases.length > 0) {
        frontMatter.set('aliases', entity.aliases);
      }

      if (frontMatter.size > 0) {
        writeFrontMatter(libraryName, FileType.FileTypeEntity, entity.name, frontMatter);
      }

      if (entity.content) {
        add(libraryName, FileType.FileTypeEntity, entity.name, entity.content.split('\n'));
      }

      createdEntityNames.push(entity.name);
    }

    return `---status: success, message: ${createdEntityNames.length} entities created successfully, created_entities: ${createdEntityNames.join(',')}---`;
  },
};

// Zod schema for the deleteEntities tool
export const DeleteEntitiesInputSchema = z.object({
  libraryName: z.string().describe('要从中删除实体的知识库的名称'),
  entityNames: z.array(z.string()).describe('要删除的实体名称列表'),
});

// Tool definition for deleteEntities
export const deleteEntitiesTool = {
  toolType: {
    name: 'deleteEntities',
    description: '将指定的实体移动到知识库的 `trash` 目录中（软删除）',
    inputSchema: zodToJsonSchema(DeleteEntitiesInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName, entityNames} = DeleteEntitiesInputSchema.parse(args);
    const deletedEntityNames: string[] = [];

    for (const entityName of entityNames) {
      moveFileToTrash(libraryName, FileType.FileTypeEntity, entityName);
      deletedEntityNames.push(entityName);
    }

    return `---status: success, message: ${deletedEntityNames.length} entities moved to trash, deleted_entities: ${deletedEntityNames.join(',')}---`;
  },
};

// Zod schema for the readEntities tool
export const ReadEntitiesInputSchema = z.object({
  libraryName: z.string().describe('要从中读取实体的知识库的名称'),
  entityNames: z.array(z.string()).describe('要读取的实体名称列表'),
});

// Tool definition for readEntities
export const readEntitiesTool = {
  toolType: {
    name: 'readEntities',
    description: '读取一个或多个实体的内容',
    inputSchema: zodToJsonSchema(ReadEntitiesInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName, entityNames} = ReadEntitiesInputSchema.parse(args);
    let combinedContent = '';

    for (const entityName of entityNames) {
      const lines = readFileLines(libraryName, FileType.FileTypeEntity, entityName);
      const content = lines.join('\n');
      combinedContent += `--- ${entityName} ---\n${content}\n`;
    }

    return combinedContent;
  },
};

// Zod schema for the listEntities tool
export const ListEntitiesInputSchema = z.object({
  libraryName: z.string().describe('要从中列出实体的知识库的名称'),
  entityGlob: z.string().optional().describe('用于匹配实体名称的 glob 模式 (例如, "project-*")'),
});

// Tool definition for listEntities
export const listEntitiesTool = {
  toolType: {
    name: 'listEntities',
    description: '基于 glob 模式列出实体',
    inputSchema: zodToJsonSchema(ListEntitiesInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName, entityGlob} = ListEntitiesInputSchema.parse(args);
    const libPath = getEntityDirPath(libraryName);
    const globPattern = entityGlob ? `${entityGlob}.md` : '*.md';

    const files = shell.ls(path.join(libPath, globPattern));

    const entityNames = files.map(file => path.basename(file, '.md'));

    return `---status: success, message: ${entityNames.length} entities found, entities: ${entityNames.join(',')}---`;
  },
};

// Zod schema for the getEntitiesToc tool
export const GetEntitiesTocInputSchema = z.object({
  libraryName: z.string().describe('要从中获取 TOC 的知识库的名称'),
  entityNames: z.array(z.string()).describe('要获取 TOC 的实体名称列表'),
});

// Tool definition for getEntitiesToc
export const getEntitiesTocTool = {
  toolType: {
    name: 'getEntitiesToc',
    description: '获取一个或多个实体的目录结构 (TOC)',
    inputSchema: zodToJsonSchema(GetEntitiesTocInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName, entityNames} = GetEntitiesTocInputSchema.parse(args);

    const results = entityNames.map(entityName => {
      const tocList = getTocList(libraryName, FileType.FileTypeEntity, entityName);
      const toc = tocList.map(item => item.tocLineContent);
      // Check if there is frontmatter by checking if the first line is '---'
      const fileLines = readFileLines(libraryName, FileType.FileTypeEntity, entityName);
      if (fileLines[0] === '---') {
        toc.unshift('frontmatter');
      }
      return { entityName: entityName, toc };
    });

    return yaml.stringify(results);
  },
};

// Zod schema for the renameEntity tool
export const RenameEntityInputSchema = z.object({
  libraryName: z.string().describe('要在其中重命名实体的知识库的名称'),
  oldName: z.string().describe('实体的当前名称'),
  newName: z.string().describe('实体的新名称'),
});

// Tool definition for renameEntity
export const renameEntityTool = {
  toolType: {
    name: 'renameEntity',
    description: '对实体进行“深度重命名”，重命名文件并修复所有入链',
    inputSchema: zodToJsonSchema(RenameEntityInputSchema),
  },
  handler: (args: unknown) => {
    const { libraryName, oldName, newName } = RenameEntityInputSchema.parse(args);

    // 1. Rename the file
    renameFile(libraryName, FileType.FileTypeEntity, oldName, newName);

    // 2. Find and update incoming relations
    const grepResults = shell.grep('-l', `relation to: ${oldName}`, path.join(getEntityDirPath(libraryName), '*.md'));
    const affectedFiles = grepResults.stdout.trim().split('\n').filter(Boolean);

    for (const file of affectedFiles) {
      // 裁剪掉 file 的 .md
      const thingName = path.basename(file, '.md');
      const lines = readFileLines(libraryName, FileType.FileTypeEntity, file);
      const updatedLines = lines.map(line =>
        line.includes(`relation to: ${oldName}`) ? line.replace(`relation to: ${oldName}`, `relation to: ${newName}`) : line
      );
      writeFileLines(libraryName, FileType.FileTypeEntity, thingName, updatedLines as FileWholeLines);
    }

    return `---status: success, message: Renamed '${oldName}' to '${newName}'. ${affectedFiles.length} incoming relations were updated.---`;
  },
};

// Zod schema for the readEntitiesSections tool
export const ReadEntitiesSectionsInputSchema = z.object({
  libraryName: z.string().describe('要从中读取章节内容的知识库的名称'),
  entityNames: z.array(z.string()).describe('要读取章节内容的实体名称列表'),
  sectionGlobs: z.array(z.string()).describe('要读取的章节标题的 glob 模式列表 (例如, "## Introduction", "frontmatter")'),
});

// Tool definition for readEntitiesSections
export const readEntitiesSectionsTool = {
  toolType: {
    name: 'readEntitiesSections',
    description: '精确读取一个或多个实体中，与 `sectionGlobs` 匹配的特定章节的内容',
    inputSchema: zodToJsonSchema(ReadEntitiesSectionsInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName, entityNames, sectionGlobs} = ReadEntitiesSectionsInputSchema.parse(args);
    const results: { entityName: string; section: string; content: string }[] = [];

    for (const entityName of entityNames) {
      for (const sectionGlob of sectionGlobs) {
        if (sectionGlob === 'frontmatter') {
          const frontmatter = readFrontMatter(libraryName, FileType.FileTypeEntity, entityName);
          if (frontmatter) {
            const content = yaml.stringify(Object.fromEntries(frontmatter));
            results.push({ entityName: entityName, section: sectionGlob, content });
          }
        } else {
          const sectionContentLines = readSectionContent(libraryName, FileType.FileTypeEntity, entityName, sectionGlob);
          results.push({ entityName: entityName, section: sectionGlob, content: sectionContentLines.join('\n') });
        }
      }
    }
    return yaml.stringify(results);
  },
};


// Zod schema for the addEntityContent tool
export const AddEntityContentInputSchema = z.object({
  libraryName: z.string().describe('要在其中添加内容的知识库的名称'),
  entityName: z.string().describe('要添加内容的实体名称'),
  inSection: z.string().describe('内容将添加到的章节标题'),
  newContent: z.string().describe('要追加的新内容'),
});

// Tool definition for addEntityContent
export const addEntityContentTool = {
  toolType: {
    name: 'addEntityContent',
    description: '在指定实体、指定章节的末尾追加新内容',
    inputSchema: zodToJsonSchema(AddEntityContentInputSchema),
  },
  handler: (args: unknown) => {
    const { libraryName, entityName, inSection, newContent } = AddEntityContentInputSchema.parse(args);
    addInToc(libraryName, FileType.FileTypeEntity, entityName, inSection, newContent.split('\n'));
    return `---status: success, message: Content added to section '${inSection}' in entity '${entityName}'.---`;
  },
};

// Zod schema for the deleteEntityContent tool
export const DeleteEntityContentInputSchema = z.object({
  libraryName: z.string().describe('要从中删除内容的知识库的名称'),
  entityName: z.string().describe('要删除内容的实体名称'),
  inSection: z.string().describe('内容将从其中删除的章节标题'),
  contentToDelete: z.string().describe('要精确删除的内容块'),
});

// Tool definition for deleteEntityContent
export const deleteEntityContentTool = {
  toolType: {
    name: 'deleteEntityContent',
    description: '从指定实体、指定章节中，精确删除一段内容',
    inputSchema: zodToJsonSchema(DeleteEntityContentInputSchema),
  },
  handler: (args: unknown) => {
    const { libraryName, entityName, inSection, contentToDelete } = DeleteEntityContentInputSchema.parse(args);
    deleteInToc(libraryName, FileType.FileTypeEntity, entityName, inSection, contentToDelete.split('\n'));
    return `---status: success, message: Content deleted from section '${inSection}' in entity '${entityName}'.---`;
  },
};

// Zod schema for the replaceEntitySection tool
export const ReplaceEntitySectionInputSchema = z.object({
  libraryName: z.string().describe('要在其中替换章节的知识库的名称'),
  entityName: z.string().describe('要替换章节的实体名称'),
  oldHeading: z.string().describe('要被替换的旧章节的标题'),
  newHeading: z.string().describe('新章节的标题'),
  newBodyContent: z.string().describe('新章节的完整正文内容'),
});

// Tool definition for replaceEntitySection
export const replaceEntitySectionTool = {
  toolType: {
    name: 'replaceEntitySection',
    description: '重写一个完整的章节，可同时修改章节标题和其全部正文',
    inputSchema: zodToJsonSchema(ReplaceEntitySectionInputSchema),
  },
  handler: (args: unknown) => {
    const { libraryName, entityName, oldHeading, newHeading, newBodyContent } = ReplaceEntitySectionInputSchema.parse(args);
    replaceSection(libraryName, FileType.FileTypeEntity, entityName, oldHeading, newHeading, newBodyContent.split('\n'));
    return `---status: success, message: Section '${oldHeading}' in entity '${entityName}' has been replaced.---`;
  },
};

// Zod schema for the mergeEntities tool
export const MergeEntitiesInputSchema = z.object({
  libraryName: z.string().describe('要在其中合并实体的知识库的名称'),
  sourceNames: z.array(z.string()).describe('要被合并的源实体的名称列表'),
  targetName: z.string().describe('合并的目标实体的名称'),
});

// Tool definition for mergeEntities
export const mergeEntitiesTool = {
  toolType: {
    name: 'mergeEntities',
    description: '将多个源实体合并入一个目标实体，然后删除源实体',
    inputSchema: zodToJsonSchema(MergeEntitiesInputSchema),
  },
  handler: (args: unknown) => {
    const { libraryName, sourceNames, targetName } = MergeEntitiesInputSchema.parse(args);
    const targetRelativePath = `${targetName}.md`;

    const targetFrontmatter = readFrontMatter(libraryName, FileType.FileTypeEntity, targetName) ?? new Map() as FrontMatter;
    const targetContent = readFileLines(libraryName, FileType.FileTypeEntity, targetName);

    const mergedContent = [...targetContent];

    for (const sourceName of sourceNames) {
      const sourceRelativePath = `${sourceName}.md`;
      const sourceFrontmatter = readFrontMatter(libraryName, FileType.FileTypeEntity, sourceName);
      const sourceContent = readFileLines(libraryName, FileType.FileTypeEntity, sourceName);

      // Merge frontmatter
      if (sourceFrontmatter) {
        for (const [key, value] of sourceFrontmatter.entries()) {
          if (targetFrontmatter.has(key) && Array.isArray(targetFrontmatter.get(key))) {
            const targetArray: unknown = targetFrontmatter.get(key);
            const sourceArray: string[] = Array.isArray(value) ? value : [value];
            targetFrontmatter.set(key, [...new Set([...targetArray, ...sourceArray])]);
          } else {
            targetFrontmatter.set(key, value);
          }
        }
      }

      // Merge content
      mergedContent.push(`\n---\n\n## Content from ${sourceName}\n\n`);
      mergedContent.push(...sourceContent);

      // Delete source entity
      moveFileToTrash(libraryName, FileType.FileTypeEntity, sourceName);
    }

    writeFrontMatter(libraryName,  FileType.FileTypeEntity, targetName, targetFrontmatter);
    add(libraryName,  FileType.FileTypeEntity, targetName, mergedContent);

    return `---status: success, message: Merged ${sourceNames.length} entities into '${targetName}'.---`;
  },
};

// Zod schema for the garbageCollectRelations tool
export const GarbageCollectRelationsInputSchema = z.object({
  libraryName: z.string().describe('要在其中进行垃圾回收的知识库的名称'),
  dryRun: z.boolean().optional().default(true).describe('是否为演习模式。true 只报告问题，false 则实际执行清理。'),
});

// Tool definition for garbageCollectRelations
export const garbageCollectRelationsTool = {
  toolType: {
    name: 'garbageCollectRelations',
    description: '查找并清理知识库中指向不存在的实体的“断裂链接”',
    inputSchema: zodToJsonSchema(GarbageCollectRelationsInputSchema),
  },
  handler: (args: unknown) => {
    const { libraryName, dryRun } = GarbageCollectRelationsInputSchema.parse(args);
    const entitiesPath = getEntityDirPath(libraryName);
    const allEntityFiles = shell.ls(path.join(entitiesPath, '*.md'));
    const allEntityNames = new Set(allEntityFiles.map(file => path.basename(file, '.md')));

    const danglingRelations: { inEntity: string; relationTo: string; type: string }[] = [];
    const affectedEntities = new Map<string, FrontMatter>();

    for (const entityFile of allEntityFiles) {
      const entityName = path.basename(entityFile, '.md');
      const frontmatter = readFrontMatter(libraryName, FileType.FileTypeEntity, entityName);

      if (frontmatter?.has('relations')) {
        const relations = frontmatter.get('relations') as { 'relation to': string; 'relation type': string }[];
        const validRelations = [];
        let hasDangling = false;

        for (const relation of relations) {
          if (allEntityNames.has(relation['relation to'])) {
            validRelations.push(relation);
          } else {
            danglingRelations.push({ inEntity: entityName, relationTo: relation['relation to'], type: relation['relation type'] });
            hasDangling = true;
          }
        }

        if (hasDangling && !dryRun) {
          frontmatter.set('relations', validRelations);
          affectedEntities.set(entityName, frontmatter);
        }
      }
    }

    if (!dryRun) {
      for (const [entityName, frontmatter] of affectedEntities.entries()) {
        writeFrontMatter(libraryName, FileType.FileTypeEntity, entityName, frontmatter);
      }
      return `---status: success, cleaned_relations_count: ${danglingRelations.length}, affected_entities: ${[...affectedEntities.keys()]}---`;
    } else {
      return yaml.stringify({ danglingRelationsFound: danglingRelations });
    }
  },
};

export const entityTools: McpHandlerDefinition[] = [createEntityTool, addEntitiesTool, deleteEntitiesTool, readEntitiesTool, listEntitiesTool, getEntitiesTocTool, renameEntityTool, readEntitiesSectionsTool, addEntityContentTool, deleteEntityContentTool, replaceEntitySectionTool, mergeEntitiesTool, garbageCollectRelationsTool];
