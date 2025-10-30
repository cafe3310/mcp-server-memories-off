import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {createFile} from '../shell';
import type {McpHandlerDefinition} from "../../typings";

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
    createFile(libraryName, relativePath, []);
    return `---status: success, message: entity ${entityName} created successfully in library ${libraryName}---`;
  },
};

export const entityTools: McpHandlerDefinition[] = [createEntityTool];
