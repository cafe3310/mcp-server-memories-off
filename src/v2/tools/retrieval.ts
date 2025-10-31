import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {findEntityByFrontMatterRegex} from "../retrieval/retrieval.ts";
import {FileType, McpHandlerDefinition} from "../../typings.ts";

// --- Tool: find_entities_by_metadata ---

export const FindEntitiesByMetadataInput = z.object({
  libraryName: z.string().describe('The name of the library to search in.'),
  metadata_pattern: z.string().describe('The "key: value" pattern to search for in the front matter of entities. This is a regex pattern.'),
});

export const findEntitiesByMetadataTool: McpHandlerDefinition = {
  toolType: {
    name: 'find_entities_by_metadata',
    description: 'Finds entities by searching for a regex pattern in their front matter (metadata).',
    inputSchema: zodToJsonSchema(FindEntitiesByMetadataInput),
  },
  handler: async (args: unknown) => {
    const {libraryName, metadata_pattern} = FindEntitiesByMetadataInput.parse(args);
    const results = findEntityByFrontMatterRegex(libraryName, '*.md', metadata_pattern);
    const entityNames = [...new Set(results.map(r => r.name))];
    return `---status: success, message: ${entityNames.length} entities found, entities: ${entityNames.join(',')}---`;
  }
};


// --- Tool: find_relations ---

export const FindRelationsInput = z.object({
  libraryName: z.string().describe('The name of the library to search in.'),
  to_entity: z.string().optional().describe('The name of the entity that the relation points to.'),
  relation_type: z.string().optional().describe('The type of the relation (e.g., "is-a", "part-of").'),
});

// Relation schema for internal use, not directly for tool output schema
const relationSchema = z.object({
  from: z.string().describe('The entity where the relation is defined.'),
  to: z.string().describe('The entity the relation points to.'),
  type: z.string().describe('The type of the relation.'),
});

export const findRelationsTool: McpHandlerDefinition = {
  toolType: {
    name: 'find_relations',
    description: 'Finds relations in the knowledge base, optionally filtering by target entity or relation type.',
    inputSchema: zodToJsonSchema(FindRelationsInput),
  },
  handler: async (args: unknown) => {
    const {libraryName, to_entity, relation_type} = FindRelationsInput.parse(args);
    // Implementation will require iterating through files and parsing front matter.
    // This can be built in the next step.
    // For now, returning a placeholder.
    console.log(libraryName, to_entity, relation_type);
    return `---status: success, message: Relations search not fully implemented yet. library: ${libraryName}, to_entity: ${to_entity ?? 'any'}, relation_type: ${relation_type ?? 'any'}---`;
  }
};

// Export all tools as an array, similar to entity.ts
export const retrievalTools: McpHandlerDefinition[] = [findEntitiesByMetadataTool, findRelationsTool];