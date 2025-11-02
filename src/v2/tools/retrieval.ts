import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {findEntityByFrontMatterRegex} from "../retrieval/retrieval.ts";
import type {McpHandlerDefinition} from "../../typings.ts";

// --- Tool: find_entities_by_metadata ---

export const FindEntitiesByMetadataInput = z.object({
  libraryName: z.string().describe('The name of the library to search in.'),
  metaDataPattern: z.string().describe('The "key: value" pattern to search for in the front matter of entities. This is a regex pattern.'),
});

/**
 * @tool find_entities_by_metadata
 * @description 通过在知识实体的 Front Matter（元数据）中搜索正则表达式模式来查找实体。
 *
 * @input
 * - `libraryName`: (string, required) 要搜索的知识库的名称。
 * - `metaDataPattern`: (string, required) 用于在实体 Front Matter 中搜索的“键: 值”正则表达式模式。
 *
 * @output
 * - (string) 返回一个字符串，指示找到的实体数量和实体名称列表。
 *   示例: `---status: success, message: 3 entities found, entities: entity1,entity2,entity3---`
 *
 * @remarks
 * - 搜索是在 Front Matter 的每一行中进行的，匹配任何包含 `metaDataPattern` 的行。
 * - 返回的实体名称是去重后的列表。
 *
 * @todo
 * - [ ] 优化输出格式，使其更符合 XML 规范。
 */
export const findEntitiesByMetadataTool: McpHandlerDefinition<typeof FindEntitiesByMetadataInput, 'find_entities_by_metadata'> = {
  toolType: {
    name: 'find_entities_by_metadata',
    description: 'Finds entities by searching for a regex pattern in their front matter (metadata).',
    inputSchema: zodToJsonSchema(FindEntitiesByMetadataInput),
  },
  handler: (args: unknown) => {
    const {libraryName, metaDataPattern} = FindEntitiesByMetadataInput.parse(args);
    const results = findEntityByFrontMatterRegex(libraryName, '*.md', metaDataPattern);
    const entityNames = [...new Set(results.map(r => r.name))];
    return `---status: success, message: ${entityNames.length} entities found, entities: ${entityNames.join(',')}---`;
  }
};


// --- Tool: find_relations ---

export const FindRelationsInput = z.object({
  libraryName: z.string().describe('The name of the library to search in.'),
  toEntity: z.string().optional().describe('The name of the entity that the relation points to.'),
  relationType: z.string().optional().describe('The type of the relation (e.g., "is-a", "part-of").'),
});

// Relation schema for internal use, not directly for tool output schema
z.object({
  from: z.string().describe('The entity where the relation is defined.'),
  to: z.string().describe('The entity the relation points to.'),
  type: z.string().describe('The type of the relation.'),
});

/**
 * @tool find_relations
 * @description 在知识库中查找关系，可选择按目标实体或关系类型进行过滤。
 *
 * @input
 * - `libraryName`: (string, required) 要搜索的知识库的名称。
 * - `toEntity`: (string, optional) 关系指向的目标实体名称。
 * - `relationType`: (string, optional) 关系类型（例如，“is-a”，“part-of”）。
 *
 * @output
 * - (string) 目前返回一个占位符消息，指示该工具尚未完全实现。
 *
 * @remarks
 * - 该工具目前尚未完全实现，调用将返回错误信息。
 * - 预期功能是遍历所有实体，解析其 Front Matter 中的关系，并根据 `toEntity` 和 `relationType` 进行过滤。
 *
 * @todo
 * - [ ] 实现该工具的完整逻辑，包括遍历实体和过滤关系。
 * - [ ] 定义返回的关系数据结构，例如包含 `fromEntity`, `toEntity`, `relationType` 的列表。
 * - [ ] 优化输出格式，使其更符合 XML 规范。
 */
export const findRelationsTool: McpHandlerDefinition<typeof FindRelationsInput, 'find_relations'> = {
  toolType: {
    name: 'find_relations',
    description: 'Finds relations in the knowledge base, optionally filtering by target entity or relation type.',
    inputSchema: zodToJsonSchema(FindRelationsInput),
  },
  handler: (args: unknown) => {
    const {libraryName, toEntity, relationType} = FindRelationsInput.parse(args);
    // Implementation will require iterating through files and parsing front matter.
    // This can be built in the next step.
    // For now, returning a placeholder.
    console.log(libraryName, toEntity, relationType);
    return `---status: success, message: Relations search not fully implemented yet. library: ${libraryName}, toEntity: ${toEntity ?? 'any'}, relationType: ${relationType ?? 'any'}---`;
  }
};


// Export all tools as an array, similar to entity.ts
export const retrievalTools = [findEntitiesByMetadataTool, findRelationsTool, searchInContentsTool, searchAnywhereTool];

// --- Tool: search_in_contents ---

/**
 * @tool search_in_contents
 * @description 在实体正文中进行 glob 模式匹配。
 *
 * @input
 * - `libraryName`: (string, required) 要搜索的知识库的名称。
 * - `contentPattern`: (string, required) 用于在实体正文中搜索的 glob 模式。
 *
 * @output
 * - (string) 目前返回一个占位符消息，指示该工具尚未实现。
 *
 * @remarks
 * - 该工具目前尚未实现，调用将返回错误信息。
 *
 * @todo
 * - [ ] 实现该工具的完整逻辑。
 */
export const searchInContentsTool = {
  toolType: {
    name: 'search_in_contents',
    description: '在实体正文中进行 glob 模式匹配。',
    inputSchema: zodToJsonSchema(z.object({
      libraryName: z.string().describe('The name of the library to search in.'),
      contentPattern: z.string().describe('The glob pattern to search for in the entity content.'),
    })),
  },
  handler: (args: unknown) => {
    return `---status: failed, message: search_in_contents tool is not yet implemented.---`;
  }
};

// --- Tool: search_anywhere ---

/**
 * @tool search_anywhere
 * @description 在文件名、元数据和正文中进行全局 glob 模式匹配。
 *
 * @input
 * - `libraryName`: (string, required) 要搜索的知识库的名称。
 * - `pattern`: (string, required) 用于在任何地方搜索的 glob 模式。
 *
 * @output
 * - (string) 目前返回一个占位符消息，指示该工具尚未实现。
 *
 * @remarks
 * - 该工具目前尚未实现，调用将返回错误信息。
 *
 * @todo
 * - [ ] 实现该工具的完整逻辑。
 */
export const searchAnywhereTool = {
  toolType: {
    name: 'search_anywhere',
    description: '在文件名、元数据和正文中进行全局 glob 模式匹配。',
    inputSchema: zodToJsonSchema(z.object({
      libraryName: z.string().describe('The name of the library to search in.'),
      pattern: z.string().describe('The glob pattern to search for anywhere.'),
    })),
  },
  handler: (args: unknown) => {
    return `---status: failed, message: search_anywhere tool is not yet implemented.---`;
  }
};

