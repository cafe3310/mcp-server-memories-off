import {z} from "zod";
import {CallToolResultSchema, ToolSchema} from "@modelcontextprotocol/sdk/types.js";
import {KnowledgeGraphManager} from "./knowledgeGraphManager.ts";
import {zodToJsonSchema} from "zod-to-json-schema";
import YAML from "yaml";
import type {Entity, Relation} from "./typings.ts";

export type ToolType = z.infer<typeof ToolSchema>;
type ToolInputSchemaType = z.infer<typeof ToolSchema.shape.inputSchema>;
type ToolResponseType = z.infer<typeof CallToolResultSchema>

export const toolDef: Record<string, {
  toolType: ToolType;
  handler: (knowledge: KnowledgeGraphManager, args: unknown) => Promise<ToolResponseType>
}> = {};

// region create_entities

export const CreateEntitiesInputSchema = z.object({
  entities: z.array(
    z.object({
      name: z.string().describe("实体名称"),
      entityType: z.string().describe("实体类型"),
      observations: z.array(z.string()).describe("对实体的观察内容列表"),
    }),
  ),
});

toolDef['create_entities'] = {
  toolType: {
    name: "create_entities",
    description: "创建多个实体到知识图谱",
    annotations: {
      title: '创建实体',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(CreateEntitiesInputSchema) as ToolInputSchemaType,
  },
  handler: async (graph, args) => {
    const parsedArgs = CreateEntitiesInputSchema.parse(args);
    const argEntities = parsedArgs.entities as Entity[];
    const ret = await graph.createEntities(argEntities);
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};

// endregion

// region create_relations 创建关系

export const CreateRelationsInputSchema = z.object({
  relations: z.array(
    z.object({
      from: z.string().describe("关系开始的实体名称"),
      to: z.string().describe("关系结束的实体名称"),
      relationType: z.string().describe("关系类型"),
    }).required({from: true, to: true, relationType: true})
  ),
}).required({relations: true});

toolDef['create_relations'] = {
  toolType: {
    name: "create_relations",
    description: "在知识图谱中创建多个实体之间的关系(使用主动语态)",
    annotations: {
      title: '创建关系',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(CreateRelationsInputSchema) as ToolInputSchemaType,
  },
  handler: async (graph, args) => {
    const parsedArgs = CreateRelationsInputSchema.parse(args);
    const argRelations = parsedArgs.relations as Relation[];
    const ret = await graph.createRelations(argRelations);
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};

// endregion

// region add_observations

export const AddObservationsInputSchema = z.object({
  observations: z.array(
    z.object({
      entityName: z.string().describe("要添加观察的实体名称"),
      contents: z.array(z.string()).describe("要添加的观察内容"),
    }).required({entityName: true, contents: true})
  ),
}).required({observations: true});

toolDef['add_observations'] = {
  toolType: {
    name: "add_observations",
    description: "为知识图谱中已有的实体添加新的观察内容",
    annotations: {
      title: '添加观察',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(AddObservationsInputSchema) as ToolInputSchemaType,
  },
  handler: async (knowledgeGraphManager, args) => {
    const parsedArgs = AddObservationsInputSchema.parse(args);
    const argObservations = parsedArgs.observations as {
      entityName: string;
      contents: string[]
    }[];
    const ret = await knowledgeGraphManager.addObservations(argObservations);
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};

// endregion

// region delete_entities

export const DeleteEntitiesInputSchema = z.object({
  entityNames: z.array(z.string().describe("要删除的实体名称列表")),
}).required({entityNames: true});

toolDef['delete_entities'] = {
  toolType: {
    name: "delete_entities",
    description: "从知识图谱删除多个实体及其关联关系",
    annotations: {
      title: '删除实体',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(DeleteEntitiesInputSchema) as ToolInputSchemaType,
  },
  handler: async (knowledgeGraphManager, args: unknown) => {
    const parsedArgs = DeleteEntitiesInputSchema.parse(args);
    const argEntityNames = parsedArgs.entityNames;
    await knowledgeGraphManager.deleteEntities(argEntityNames);
    return {content: [{type: "text", text: "实体删除成功"}]};
  },
};

// endregion

// region delete_observations

export const DeleteObservationsInputSchema = z.object({
  deletions: z.array(
    z.object({
      entityName: z.string().describe("包含观察的实体名称"),
      observations: z.array(z.string()).describe("要删除的观察列表"),
    }).required({entityName: true, observations: true})
  ),
}).required({deletions: true});

toolDef['delete_observations'] = {
  toolType: {
    name: "delete_observations",
    description: "从知识图谱删除实体中的特定观察内容",
    annotations: {
      title: '删除观察',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(DeleteObservationsInputSchema) as ToolInputSchemaType,
  },
  handler: async (knowledgeGraphManager, args) => {
    const parsedArgs = DeleteObservationsInputSchema.parse(args);
    const argDeletions = parsedArgs.deletions as {
      entityName: string;
      observations: string[]
    }[];
    await knowledgeGraphManager.deleteObservations(argDeletions);
    return {content: [{type: "text", text: "观察内容删除成功"}]};
  },
};

// endregion

// region delete_relations

export const DeleteRelationsInputSchema = z.object({
  relations: z.array(
    z.object({
      from: z.string().describe("关系开始的实体名称"),
      to: z.string().describe("关系结束的实体名称"),
      relationType: z.string().describe("关系类型"),
    }).required({from: true, to: true, relationType: true})
  ),
}).required({relations: true});

toolDef['delete_relations'] = {
  toolType: {
    name: "delete_relations",
    description: "从知识图谱删除多个关系",
    annotations: {
      title: '删除关系',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(DeleteRelationsInputSchema) as ToolInputSchemaType,
  },
  handler: async (knowledgeGraphManager, args) => {
    const parsedArgs = DeleteRelationsInputSchema.parse(args);
    const argRelations = parsedArgs.relations as Relation[];
    await knowledgeGraphManager.deleteRelations(argRelations);
    return {content: [{type: "text", text: "关系删除成功"}]};
  },
};

// endregion

// region read_graph

export const ReadGraphInputSchema = z.object({}).required({});

toolDef['read_graph'] = {
  toolType: {
    name: "read_graph",
    description: "读取整个知识图谱(YAML格式)",
    annotations: {
      title: '读取知识图谱',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(ReadGraphInputSchema) as ToolInputSchemaType,
  },
  handler: async (knowledgeGraphManager, _args) => {
    const ret = await knowledgeGraphManager.readGraph();
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret)
      }]
    };
  },
};

// endregion

// region search_nodes

export const SearchNodesInputSchema = z.object({
  query: z.string().describe("搜索查询字符串，可匹配实体名称、实体类别或观察内容"),
}).required({query: true});

toolDef['search_nodes'] = {
  toolType: {
    name: "search_nodes",
    description: "根据查询字符串搜索各种节点",
    annotations: {
      title: '搜索节点',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(SearchNodesInputSchema) as ToolInputSchemaType,
  },
  handler: async (knowledgeGraphManager, args) => {
    const parsedArgs = SearchNodesInputSchema.parse(args);
    const argQuery = parsedArgs.query;
    const ret = await knowledgeGraphManager.searchNodes(argQuery);
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};

// endregion

// region open_nodes

export const OpenNodesInputSchema = z.object({
  names: z.array(z.string().describe("要检索的实体名称列表")),
}).required({names: true});

toolDef['open_nodes'] = {
  toolType: {
    name: "open_nodes",
    description: "打开指定名称的节点",
    annotations: {
      title: '打开节点',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(OpenNodesInputSchema) as ToolInputSchemaType,
  },
  handler: async (knowledgeGraphManager, args) => {
    const parsedArgs = OpenNodesInputSchema.parse(args);
    const argNames = parsedArgs.names;
    const ret = await knowledgeGraphManager.openNodes(argNames);
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};

// endregion
