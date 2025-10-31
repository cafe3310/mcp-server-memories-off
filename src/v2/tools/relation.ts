import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {FileType, type FrontMatterLine, type McpHandlerDefinition} from "../../typings.ts";
import {readFrontMatterLines, writeFrontMatterLines} from "../editor/front-matter.ts";
import {FrontMatterPresetKeys} from "../../typings.ts";

const RelationSchema = z.object({
  type: z.string().describe('关系类型'),
  to: z.string().describe('关系指向的实体名称'),
});

export const CreateRelationsInputSchema = z.object({
  libraryName: z.string().describe('知识库名称'),
  fromEntity: z.string().describe('关系发出的实体名称'),
  relations: z.array(RelationSchema).describe('要创建的关系列表'),
});

export const createRelationsTool: McpHandlerDefinition = {
  toolType: {
    name: 'create_relations',
    description: '在一个实体的 Front Matter 中添加一条或多条关系',
    inputSchema: zodToJsonSchema(CreateRelationsInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName, fromEntity, relations} = CreateRelationsInputSchema.parse(args);
    const existingFrontMatter = readFrontMatterLines(libraryName, FileType.FileTypeEntity, fromEntity) ?? [];
    const newFrontMatter = [...existingFrontMatter];
    const createdRelations: { from: string, to: string, type: string }[] = [];

    for (const relation of relations) {
      const relationLine = `${FrontMatterPresetKeys.RelationAs} ${relation.type}: ${relation.to}` as FrontMatterLine;
      if (!newFrontMatter.includes(relationLine)) {
        newFrontMatter.push(relationLine);
        createdRelations.push({from: fromEntity, to: relation.to, type: relation.type});
      }
    }

    writeFrontMatterLines(libraryName, FileType.FileTypeEntity, fromEntity, newFrontMatter);

    return {
      created_relations: createdRelations,
    };
  },
};

export const DeleteRelationsInputSchema = z.object({
  libraryName: z.string().describe('知识库名称'),
  fromEntity: z.string().describe('关系发出的实体名称'),
  relations: z.array(RelationSchema).describe('要删除的关系列表'),
});

export const deleteRelationsTool: McpHandlerDefinition = {
  toolType: {
    name: 'delete_relations',
    description: '从一个实体的 Front Matter 中删除一条或多条关系',
    inputSchema: zodToJsonSchema(DeleteRelationsInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName, fromEntity, relations} = DeleteRelationsInputSchema.parse(args);
    const existingFrontMatter = readFrontMatterLines(libraryName, FileType.FileTypeEntity, fromEntity) ?? [];
    const deletedRelations: { from: string, to: string, type: string }[] = [];

    const newFrontMatter = existingFrontMatter.filter(line => {
      const isRelationLine = line.startsWith(`${FrontMatterPresetKeys.RelationAs} `);
      if (!isRelationLine) {
        return true; // Keep non-relation lines
      }

      const [prefix, rest] = line.split(': ', 2);
      const relationType = prefix.replace(`${FrontMatterPresetKeys.RelationAs} `, '');
      const toEntity = rest;

      const shouldDelete = relations.some(r => r.type === relationType && r.to === toEntity);
      if (shouldDelete) {
        deletedRelations.push({from: fromEntity, to: toEntity, type: relationType});
        return false; // Delete this line
      }
      return true; // Keep this relation line if it's not in the list to be deleted
    });

    writeFrontMatterLines(libraryName, FileType.FileTypeEntity, fromEntity, newFrontMatter);

    return {
      deleted_relations: deletedRelations,
    };
  },
};

export const relationTools: McpHandlerDefinition[] = [createRelationsTool, deleteRelationsTool];
