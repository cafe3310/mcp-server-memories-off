import {z} from "zod";
import {CallToolResultSchema, ToolSchema} from "@modelcontextprotocol/sdk/types.js";
import {GraphManager} from "./graph-manager.ts";
import {zodToJsonSchema} from "zod-to-json-schema";
import YAML from "yaml";
import type {Entity, Relation} from "./typings.ts";

export type ToolType = z.infer<typeof ToolSchema>;
type ToolInputSchemaType = z.infer<typeof ToolSchema.shape.inputSchema>;
type ToolResponseType = z.infer<typeof CallToolResultSchema>

export const toolDef: Record<string, {
  toolType: ToolType;
  handler: (knowledge: GraphManager, args: unknown) => (Promise<ToolResponseType> | ToolResponseType);
}> = {};

// region upsert_entities

export const UpsertEntitiesInputSchema = z.object({
  entities: z.array(
    z.object({
      name: z.string().describe("实体名称"),
      entityType: z.string().describe("实体类型"),
      observations: z.array(z.string()).describe("对实体的观察内容列表"),
    }),
  ),
});

toolDef['upsert_entities'] = {
  toolType: {
    name: "upsert_entities",
    description: "创建或更新多个实体，保留原类型，添加观察内容",
    annotations: {
      title: '创建或更新实体',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(UpsertEntitiesInputSchema) as ToolInputSchemaType,
  },
  handler: (graph, args) => {
    const parsedArgs = UpsertEntitiesInputSchema.parse(args);
    const argEntities = parsedArgs.entities as Entity[];
    const ret =  graph.upsertEntities(argEntities);
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};

// endregion

// region create_relations

export const CreateRelationsInputSchema = z.object({
  relations: z.array(
    z.object({
      from: z.string().describe("关系开始的实体名称"),
      to: z.string().describe("关系结束的实体名称"),
      relationType: z.string().describe("关系类型"),
    })
  ),
});

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
  handler: (graph, args) => {
    const parsedArgs = CreateRelationsInputSchema.parse(args);
    const argRelations = parsedArgs.relations as Relation[];
    const ret =  graph.createRelations(argRelations);
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};

// endregion

// region upsert_observations

export const UpsertObservationsInputSchema = z.object({
  observations: z.array(
    z.object({
      entityName: z.string().describe("要添加观察的实体名称"),
      contents: z.array(z.string()).describe("要添加的观察内容"),
    })
  ),
});

toolDef['upsert_observations'] = {
  toolType: {
    name: "upsert_observations",
    description: "为知识图谱中已有的实体添加观察内容",
    annotations: {
      title: '添加观察',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(UpsertObservationsInputSchema) as ToolInputSchemaType,
  },
  handler: (knowledgeGraphManager, args) => {
    const parsedArgs = UpsertObservationsInputSchema.parse(args);
    const argObservations = parsedArgs.observations as {
      entityName: string;
      contents: string[]
    }[];
    const ret = knowledgeGraphManager.upsertObservations(argObservations);
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
});

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
  handler: (knowledgeGraphManager, args: unknown) => {
    const parsedArgs = DeleteEntitiesInputSchema.parse(args);
    const argEntityNames = parsedArgs.entityNames;
    knowledgeGraphManager.deleteEntities(argEntityNames);
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
    }),
  ),
});

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
  handler: (knowledgeGraphManager, args) => {
    const parsedArgs = DeleteObservationsInputSchema.parse(args);
    const argDeletions = parsedArgs.deletions as {
      entityName: string;
      observations: string[]
    }[];
    knowledgeGraphManager.deleteObservations(argDeletions);
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
    })
  ),
});

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
  handler: (knowledgeGraphManager, args) => {
    const parsedArgs = DeleteRelationsInputSchema.parse(args);
    const argRelations = parsedArgs.relations as Relation[];
    knowledgeGraphManager.deleteRelations(argRelations);
    return {content: [{type: "text", text: "关系删除成功"}]};
  },
};

// endregion

// region read_graph

// export const ReadGraphInputSchema = z.object({});

// toolDef['read_graph'] = {
//   toolType: {
//     name: "read_graph",
//     description: "读取整个知识图谱(YAML格式)",
//     annotations: {
//       title: '读取知识图谱',
//       readOnlyHint: true,
//       destructiveHint: false,
//       idempotentHint: true,
//       openWorldHint: true,
//     },
//     inputSchema: zodToJsonSchema(ReadGraphInputSchema) as ToolInputSchemaType,
//   },
//   handler: (knowledgeGraphManager, _args) => {
//     const ret = knowledgeGraphManager.readGraph();
//     return {
//       content: [{
//         type: "text",
//         text: YAML.stringify(ret)
//       }]
//     };
//   },
// };

// endregion

// region search_nodes_anywhere

export const SearchNodesAnywhereInputSchema = z.object({
  query: z.string().describe("搜索查询关键词，空格将视为 or 操作符"),
});

toolDef['search_nodes_anywhere'] = {
  toolType: {
    name: "search_nodes_anywhere",
    description: "根据正则表达式节点和关系中搜索。任何部分包括详情匹配都返回完整实体。将返回大量信息。除非用户特别要求广泛搜索，否则不要使用",
    annotations: {
      title: '全文搜索节点',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(SearchNodesAnywhereInputSchema) as ToolInputSchemaType,
  },
  handler: (knowledgeGraphManager, args) => {
    const parsedArgs = SearchNodesAnywhereInputSchema.parse(args);
    const argQuery = parsedArgs.query;
    const ret = knowledgeGraphManager.searchNodesAnywhere(argQuery);
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};

// endregion
// region search_nodes_smart

export const SearchNodesSmartInputSchema = z.object({
  queryRegex: z.string().describe("搜索查询关键词，是一个正则表达式"),
});

toolDef['search_nodes_smart'] = {
  toolType: {
    name: "search_nodes_smart",
    description: "根据正则表达式节点和关系中搜索。完整匹配名称则返回完整实体；部分匹配名称或匹配详情则返回简要信息",
    annotations: {
      title: '智能搜索节点',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(SearchNodesSmartInputSchema) as ToolInputSchemaType,
  },
  handler: (knowledgeGraphManager, args) => {
    const parsedArgs = SearchNodesSmartInputSchema.parse(args);
    const argQueryRegex = parsedArgs.queryRegex;
    const ret = knowledgeGraphManager.searchNodesSmart(argQueryRegex);
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
}

// endregion
// region open_nodes

export const OpenNodesInputSchema = z.object({
  names: z.array(z.string().describe("实体名称列表")),
});

toolDef['open_nodes'] = {
  toolType: {
    name: "open_nodes",
    description: "打开指定名称的实体，获取这些实体详情和这些实体之间的关系",
    annotations: {
      title: '打开节点',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(OpenNodesInputSchema) as ToolInputSchemaType,
  },
  handler: (knowledgeGraphManager, args) => {
    const parsedArgs = OpenNodesInputSchema.parse(args);
    const argNames = parsedArgs.names;
    const ret = knowledgeGraphManager.openNodes(argNames);
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};

// endregion

// region backup_graph

export const BackupGraphInputSchema = z.object({});

toolDef['backup_graph'] = {
  toolType: {
    name: "backup_graph",
    description: "备份知识图谱",
    annotations: {
      title: '备份知识图谱',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(BackupGraphInputSchema) as ToolInputSchemaType,
  },
  handler: (knowledgeGraphManager, _args) => {
    const ret = knowledgeGraphManager.backupGraph();
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};

// endregion

// region read_subgraph

const ReadSubgraphInputSchemaMaxDepthDefault = 1;
export const ReadSubgraphInputSchema = z.object({
  nodes: z.array(z.string().describe("要读取的实体的名称列表")),
  maxDepth: z.number().min(0).max(100).default(ReadSubgraphInputSchemaMaxDepthDefault).optional().describe("子图深度，为0时只返回实体本身，为1时返回直接关系和实体，依此类推"),
});

toolDef['read_subgraph'] = {
  toolType: {
    name: "read_subgraph",
    description: "从知识图谱获取包含指定实体节点的子图，返回实体和关系",
    annotations: {
      title: '读取子图',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(ReadSubgraphInputSchema) as ToolInputSchemaType,
  },
  handler: (knowledgeGraphManager, args) => {
    const parsedArgs = ReadSubgraphInputSchema.parse(args);
    const argNodes = parsedArgs.nodes;
    const argMaxDepth = parsedArgs.maxDepth ?? ReadSubgraphInputSchemaMaxDepthDefault;
    const ret = knowledgeGraphManager.readSubgraph(argNodes, argMaxDepth);
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};

// endregion
// region merge_entities

// 合并实体，输入多个实体名称，将他们合并到一个已经存在的实体。
// 如果合并后的实体名称已经存在，则合并他们的观察内容和关系。

export const MergeEntitiesInputSchema = z.object({
  mergingEntities: z.array(z.string().describe("要合并的实体名称列表")),
  targetEntity: z.string().describe("目标实体名称"),
});

toolDef['merge_entities'] = {
  toolType: {
    name: "merge_entities",
    description: "合并实体到现存目标实体。保留目标实体的类型，合并观察内容和关系",
    annotations: {
      title: '合并实体',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(MergeEntitiesInputSchema) as ToolInputSchemaType,
  },
  handler: (knowledgeGraphManager, args) => {
    const parsedArgs = MergeEntitiesInputSchema.parse(args);
    const argMergingEntities = parsedArgs.mergingEntities;
    const argTargetEntity = parsedArgs.targetEntity;
    const ret = knowledgeGraphManager.mergeEntities(argMergingEntities, argTargetEntity);
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};


// endregion
// region merge_entity_types

// 合并实体类型，输入多个实体类型，将他们合并成一个实体类型
// 如果合并后的实体名称已经存在，则合并他们的观察内容

export const MergeEntityTypesInputSchema = z.object({
  mergingEntityTypes: z.array(z.string().describe("要合并的实体类型列表")),
  targetEntityType: z.string().describe("目标实体类型"),
});

toolDef['merge_entity_types'] = {
  toolType: {
    name: "merge_entity_types",
    description: "合并实体类型",
    annotations: {
      title: '合并实体类型',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(MergeEntityTypesInputSchema) as ToolInputSchemaType,
  },
  handler: (knowledgeGraphManager, args) => {
    const parsedArgs = MergeEntityTypesInputSchema.parse(args);
    const argMergingEntityTypes = parsedArgs.mergingEntityTypes;
    const argTargetEntityType = parsedArgs.targetEntityType;
    const ret = knowledgeGraphManager.mergeEntityTypes(argMergingEntityTypes, argTargetEntityType);
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};

// endregion

// region list_entity_types

export const ListEntityTypesInputSchema = z.object({});

toolDef['list_entity_types'] = {
  toolType: {
    name: "list_entity_types",
    description: "列出所有实体类型和实体数量",
    annotations: {
      title: '列出实体类型',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(ListEntityTypesInputSchema) as ToolInputSchemaType,
  },
  handler: (knowledgeGraphManager, _args) => {
    const ret = knowledgeGraphManager.listEntityTypes();
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};

// endregion

// region list_relation_types

export const ListRelationTypesInputSchema = z.object({});

toolDef['list_relation_types'] = {
  toolType: {
    name: "list_relation_types",
    description: "列出所有关系类型和关系数量",
    annotations: {
      title: '列出关系类型',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(ListRelationTypesInputSchema) as ToolInputSchemaType,
  },
  handler: (knowledgeGraphManager, _args) => {
    const ret = knowledgeGraphManager.listRelationTypes();
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};

// endregion
// region merge_relation_types

// 合并关系类型，输入多个关系类型，将他们合并成一个关系类型
// 过程中可能导致相同 from 和 to 的关系对象也被合并成一个
// 返回受影响的关系对象 original_relation_count 和合并后的关系对象 merged_relation_count

export const MergeRelationTypesInputSchema = z.object({
  mergingRelationTypes: z.array(z.string().describe("要合并的关系类型列表")),
  targetRelationType: z.string().describe("目标关系类型"),
});

toolDef['merge_relation_types'] = {
  toolType: {
    name: "merge_relation_types",
    description: "合并关系类型",
    annotations: {
      title: '合并关系类型',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(MergeRelationTypesInputSchema) as ToolInputSchemaType,
  },
  handler: (knowledgeGraphManager, args) => {
    const parsedArgs = MergeRelationTypesInputSchema.parse(args);
    const argMergingRelationTypes = parsedArgs.mergingRelationTypes;
    const argTargetRelationType = parsedArgs.targetRelationType;
    const ret = knowledgeGraphManager.mergeRelationTypes(argMergingRelationTypes, argTargetRelationType);
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};

// endregion
// region read_graph_manual

export const ReadGraphManualInputSchema = z.object({});

toolDef['read_graph_manual'] = {
  toolType: {
    name: "read_graph_manual",
    description: "读取知识图谱的所有使用说明",
    annotations: {
      title: '读取图谱使用说明',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(ReadGraphManualInputSchema) as ToolInputSchemaType,
  },
  handler: (knowledgeGraphManager, _args) => {
    const ret = knowledgeGraphManager.readGraphManual();
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};


// endregion
// region put_graph_manual

export const PutGraphManualInputSchema = z.object({
  name: z.string().describe("使用说明条目的名称"),
  description: z.string().describe("该条目的内容"),
  targets: z.array(z.string()).describe("和该条目相关的目标名称列表").optional(),
});

toolDef['put_graph_manual'] = {
  toolType: {
    name: "put_graph_manual",
    description: "添加或替换知识图谱的一条使用说明",
    annotations: {
      title: '添加或替换图谱使用说明',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(PutGraphManualInputSchema) as ToolInputSchemaType,
  },
  handler: (knowledgeGraphManager, args) => {
    const parsedArgs = PutGraphManualInputSchema.parse(args);
    const ret = knowledgeGraphManager.putGraphManual(parsedArgs.name, parsedArgs.description, parsedArgs.targets);
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};

// endregion
// region remove_graph_manual

export const RemoveGraphManualInputSchema = z.object({
  name: z.string().describe("要删除的使用说明条目名称"),
});

toolDef['remove_graph_manual'] = {
  toolType: {
    name: "remove_graph_manual",
    description: "删除知识图谱的一条使用说明",
    annotations: {
      title: '删除图谱使用说明',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(RemoveGraphManualInputSchema) as ToolInputSchemaType,
  },
  handler: (knowledgeGraphManager, args) => {
    const parsedArgs = RemoveGraphManualInputSchema.parse(args);
    const ret = knowledgeGraphManager.removeGraphManual(parsedArgs.name);
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};


// endregion
// region rename_entity

export const RenameEntityInputSchema = z.object({
  oldName: z.string().describe("要重命名的实体的旧名称"),
  newName: z.string().describe("实体的新名称"),
});

toolDef['rename_entity'] = {
  toolType: {
    name: "rename_entity",
    description: "重命名知识图谱中的实体，会更新所有相关的关系。如果新名称已存在将报错。",
    annotations: {
      title: '重命名实体',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(RenameEntityInputSchema) as ToolInputSchemaType,
  },
  handler: (knowledgeGraphManager, args) => {
    const parsedArgs = RenameEntityInputSchema.parse(args);
    const ret = knowledgeGraphManager.renameEntity(parsedArgs.oldName, parsedArgs.newName);
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};

// endregion
// region has_entities

export const HasEntitiesInputSchema = z.object({
  names: z.array(z.string().describe("要检查的实体名称列表")),
});

toolDef['has_entities'] = {
  toolType: {
    name: "has_entities",
    description: "检查知识图谱中是否存在指定名称的实体，返回存在的实体名称列表",
    annotations: {
      title: '检查实体是否存在',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: zodToJsonSchema(HasEntitiesInputSchema) as ToolInputSchemaType,
  },
  handler: (knowledgeGraphManager, args) => {
    const parsedArgs = HasEntitiesInputSchema.parse(args);
    const ret = knowledgeGraphManager.hasEntities(parsedArgs.names);
    return {
      content: [{
        type: "text",
        text: YAML.stringify(ret),
      }]
    };
  },
};


// endregion
