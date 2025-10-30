import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {createFile, getTocList, moveFileToTrash, readFileLines, renameFile, writeFileLines} from '../shell';
import type {McpHandlerDefinition, FileWholeLines} from "../../typings";
import yaml from 'yaml';
import shell from 'shelljs';
import path from 'path';
import {getLibraryPath} from '../runtime';

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
    const relativePath = `${entityName}.md`;
    createFile(libraryName, relativePath, [] as FileWholeLines);
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
      const relativePath = `${entity.name}.md`;
      const lines: string[] = [];

      const frontMatter: Record<string, any> = {};
      if (entity.type) {
        frontMatter['entity type'] = entity.type;
      }
      if (entity.aliases && entity.aliases.length > 0) {
        frontMatter['aliases'] = entity.aliases;
      }

      if (Object.keys(frontMatter).length > 0) {
        lines.push('---');
        lines.push(...yaml.stringify(frontMatter).trim().split('\n'));
        lines.push('---');
        lines.push(''); // Add a blank line after frontmatter
      }

      if (entity.content) {
        lines.push(...entity.content.split('\n'));
      }

      createFile(libraryName, relativePath, lines as FileWholeLines);
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
      const relativePath = `${entityName}.md`;
      moveFileToTrash(libraryName, relativePath);
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
      const relativePath = `${entityName}.md`;
      const lines = readFileLines(libraryName, relativePath);
      const content = lines.join('\n');
      combinedContent += `--- ${libraryName}/${relativePath} ---\n${content}\n`;
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
    const libPath = getLibraryPath(libraryName);
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
      const relativePath = `${entityName}.md`;
      const tocList = getTocList(libraryName, relativePath);
      const toc = tocList.map(item => item.tocLineContent);
      // Check if there is frontmatter by checking if the first line is '---'
      const fileLines = readFileLines(libraryName, relativePath);
      if (fileLines[0] === '---') {
        toc.unshift('frontmatter');
      }
      return { entity_name: entityName, toc };
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
    const libPath = getLibraryPath(libraryName);
    const oldRelativePath = `${oldName}.md`;
    const newRelativePath = `${newName}.md`;

    // 1. Rename the file
    renameFile(libraryName, oldRelativePath, newRelativePath);

    // 2. Find and update incoming relations
    const grepResults = shell.grep('-l', `relation to: ${oldName}`, path.join(libPath, '*.md'));
    const affectedFiles = grepResults.stdout.trim().split('\n').filter(Boolean);
    
    for (const file of affectedFiles) {
      const relativePath = path.relative(libPath, file);
      const lines = readFileLines(libraryName, relativePath);
      const updatedLines = lines.map(line => 
        line.includes(`relation to: ${oldName}`) ? line.replace(`relation to: ${oldName}`, `relation to: ${newName}`) : line
      );
      writeFileLines(libraryName, relativePath, updatedLines as FileWholeLines);
    }

    return `---status: success, message: Renamed '${oldName}' to '${newName}'. ${affectedFiles.length} incoming relations were updated.---`;
  },
};


export const entityTools: McpHandlerDefinition[] = [createEntityTool, addEntitiesTool, deleteEntitiesTool, readEntitiesTool, listEntitiesTool, getEntitiesTocTool, renameEntityTool];
