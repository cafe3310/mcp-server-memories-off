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

/**
 * @tool create_relations
 * @description 在指定实体的 Front Matter 中添加一条或多条关系。关系以 `relation as <type>: <toEntityName>` 的形式存储。
 *
 * @input
 * - `libraryName`: (string, required) 知识库的名称。
 * - `fromEntity`: (string, required) 关系发出的实体名称。
 * - `relations`: (object[], required) 要创建的关系列表。
 *   - `type`: (string, required) 关系类型，例如 `knows`, `likes`。
 *   - `to`: (string, required) 关系指向的目标实体名称。
 *
 * @output
 * - (string) 返回一个 JSON 字符串，表示成功创建的关系列表。如果关系已存在，则不会重复创建。
 *
 * @remarks
 * - 关系存储在 `fromEntity` 的 Front Matter 中。
 * - 如果关系已存在，工具会忽略并不会重复添加。
 * - 不会验证 `to` 实体是否存在。
 * - **该工具尚未完全实现和验证。**
 *
 * @todo
 * - [ ] 增加对 `to` 实体存在性的验证。
 * - [ ] 优化输出格式，使其更符合 XML 规范。
 * - [ ] 编写和完善单元测试和端到端测试。
 */
export const createRelationsTool: McpHandlerDefinition<typeof CreateRelationsInputSchema, 'create_relations'> = {
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

    return `Created relations: ${JSON.stringify(createdRelations)}`;
  },
};

export const DeleteRelationsInputSchema = z.object({
  libraryName: z.string().describe('知识库名称'),
  fromEntity: z.string().describe('关系发出的实体名称'),
  relations: z.array(RelationSchema).describe('要删除的关系列表'),
});

/**
 * @tool delete_relations
 * @description 从指定实体的 Front Matter 中删除一条或多条关系。
 *
 * @input
 * - `libraryName`: (string, required) 知识库的名称。
 * - `fromEntity`: (string, required) 关系发出的实体名称。
 * - `relations`: (object[], required) 要删除的关系列表。
 *   - `type`: (string, required) 关系类型，例如 `knows`, `likes`。
 *   - `to`: (string, required) 关系指向的目标实体名称。
 *
 * @output
 * - (string) 返回一个 JSON 字符串，表示成功删除的关系列表。
 *
 * @remarks
 * - 关系存储在 `fromEntity` 的 Front Matter 中。
 * - 只有当 `type` 和 `to` 都精确匹配时，关系才会被删除。
 * - **该工具尚未完全实现和验证。**
 *
 * @todo
 * - [ ] 优化输出格式，使其更符合 XML 规范。
 * - [ ] 编写和完善单元测试和端到端测试。
 */
export const deleteRelationsTool: McpHandlerDefinition<typeof DeleteRelationsInputSchema, 'delete_relations'> = {
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
      const relationType = (prefix ?? '').replace(`${FrontMatterPresetKeys.RelationAs} `, '');
      const toEntity = rest;

      const shouldDelete = relations.some(r => r.type === relationType && r.to === toEntity);
      if (shouldDelete) {
        deletedRelations.push({from: fromEntity, to: toEntity ?? '', type: relationType});
        return false; // Delete this line
      }
      return true; // Keep this relation line if it's not in the list to be deleted
    });

    writeFrontMatterLines(libraryName, FileType.FileTypeEntity, fromEntity, newFrontMatter);

    return `Deleted relations: ${JSON.stringify(deletedRelations)}`;
  },
};

export const relationTools = [createRelationsTool, deleteRelationsTool];
