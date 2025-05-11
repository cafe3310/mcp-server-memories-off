import type {Entity, Relation} from "./typings.ts";
import {KnowledgeGraphManager} from "./knowledgeGraphManager.ts";
import {Server} from "@modelcontextprotocol/sdk/server/index.js";
import {CallToolRequestSchema, ListToolsRequestSchema, ToolSchema} from "@modelcontextprotocol/sdk/types.js";
import {logfile} from "./utils.ts";
import {z} from "zod";
import {zodToJsonSchema} from "zod-to-json-schema";
import YAML from "yaml";

type ToolType = z.infer<typeof ToolSchema>;
type ToolInputSchemaType = z.infer<typeof ToolSchema.shape.inputSchema>;

export const CreateEntitiesInputSchema = z.object({
  entities: z.array(
    z.object({
      name: z.string().describe("实体名称"),
      entityType: z.string().describe("实体类型"),
      observations: z.array(z.string()).describe("对实体的观察内容列表"),
    }).required({ name: true, entityType: true, observations: true })
  ),
}).required({ entities: true });

export const CreateRelationsInputSchema = z.object({
  relations: z.array(
    z.object({
      from: z.string().describe("关系开始的实体名称"),
      to: z.string().describe("关系结束的实体名称"),
      relationType: z.string().describe("关系类型"),
    }).required({ from: true, to: true, relationType: true })
  ),
}).required({ relations: true });

export const AddObservationsInputSchema = z.object({
  observations: z.array(
    z.object({
      entityName: z.string().describe("要添加观察的实体名称"),
      contents: z.array(z.string()).describe("要添加的观察内容"),
    }).required({ entityName: true, contents: true })
  ),
}).required({ observations: true });

export const DeleteEntitiesInputSchema = z.object({
  entityNames: z.array(z.string().describe("要删除的实体名称列表")),
}).required({ entityNames: true });

export const DeleteObservationsInputSchema = z.object({
  deletions: z.array(
    z.object({
      entityName: z.string().describe("包含观察的实体名称"),
      observations: z.array(z.string()).describe("要删除的观察列表"),
    }).required({ entityName: true, observations: true })
  ),
}).required({ deletions: true });

export const DeleteRelationsInputSchema = z.object({
  relations: z.array(
    z.object({
      from: z.string().describe("关系开始的实体名称"),
      to: z.string().describe("关系结束的实体名称"),
      relationType: z.string().describe("关系类型"),
    }).required({ from: true, to: true, relationType: true })
  ),
}).required({ relations: true });

export const ReadGraphInputSchema = z.object({}).required({});

export const SearchNodesInputSchema = z.object({
  query: z.string().describe("搜索查询字符串，可匹配实体名称、实体类别或观察内容"),
}).required({ query: true });

export const OpenNodesInputSchema = z.object({
  names: z.array(z.string().describe("要检索的实体名称列表")),
}).required({ names: true });

export function createServer(
  name: string,
  yamlPath: string,
) {

  const knowledgeGraphManager = new KnowledgeGraphManager(yamlPath);

  const server = new Server({
    name: name,
    version: "1.0.0",
  }, {
    capabilities: {
      tools: {},
    },
  },);

  server.setRequestHandler(ListToolsRequestSchema, () => {

    const tools: ToolType[] =  [
      {
        name: "create_entities",
        description: "创建多个实体到知识图谱",
        annotations: {           // Optional hints about tool behavior
          title: '创建实体',      // Human-readable title for the tool
          readOnlyHint: false,    // If true, the tool does not modify its environment
          destructiveHint: false, // If true, the tool may perform destructive updates
          idempotentHint: false,  // If true, repeated calls with same args have no additional effect
          openWorldHint: true,    // If true, tool interacts with external entities
        },
        inputSchema: zodToJsonSchema(CreateEntitiesInputSchema) as ToolInputSchemaType,
      },
      {
        name: "create_relations",
        description: "在知识图谱中创建多个实体之间的关系(使用主动语态)",
        inputSchema: zodToJsonSchema(CreateRelationsInputSchema) as ToolInputSchemaType,
        annotations: {
          title: '创建关系',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "add_observations",
        description: "为知识图谱中已有的实体添加新的观察内容",
        inputSchema: zodToJsonSchema(AddObservationsInputSchema) as ToolInputSchemaType,
        annotations: {
          title: '添加观察',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "delete_entities",
        description: "从知识图谱删除多个实体及其关联关系",
        inputSchema: zodToJsonSchema(DeleteEntitiesInputSchema) as ToolInputSchemaType,
        annotations: {
          title: '删除实体',
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      {
        name: "delete_observations",
        description: "从知识图谱删除实体中的特定观察内容",
        inputSchema: zodToJsonSchema(DeleteObservationsInputSchema) as ToolInputSchemaType,
        annotations: {
          title: '删除观察',
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      {
        name: "delete_relations",
        description: "从知识图谱删除多个关系",
        inputSchema: zodToJsonSchema(DeleteRelationsInputSchema) as ToolInputSchemaType,
        annotations: {
          title: '删除关系',
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      {
        name: "read_graph",
        description: "读取整个知识图谱(YAML格式)",
        inputSchema: zodToJsonSchema(ReadGraphInputSchema) as ToolInputSchemaType,
        annotations: {
          title: '读取知识图谱',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      {
        name: "search_nodes",
        description: "根据查询字符串搜索各种节点",
        inputSchema: zodToJsonSchema(SearchNodesInputSchema) as ToolInputSchemaType,
        annotations: {
          title: '搜索节点',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      {
        name: "open_nodes",
        description: "打开指定名称的节点",
        inputSchema: zodToJsonSchema(OpenNodesInputSchema) as ToolInputSchemaType,
        annotations: {
          title: '打开节点',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
    ];

    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {

    logfile('server', `Received request: ${JSON.stringify(request)}`);

    const {name, arguments: args} = request.params;

    if (!args) {
      throw new Error(`No arguments provided for tool: ${name}`);
    }

    switch (name) {
      case "create_entities":
        return {
          content: [{
            type: "text",
            text: YAML.stringify(await knowledgeGraphManager.createEntities(args['entities'] as Entity[])),
          }]
        };
      case "create_relations":
        return {
          content: [{
            type: "text",
            text: YAML.stringify(await knowledgeGraphManager.createRelations(args["relations"] as Relation[])),
          }]
        };
      case "add_observations":
        return {
          content: [{
            type: "text",
            text: YAML.stringify(await knowledgeGraphManager.addObservations(args["observations"] as {
              entityName: string;
              contents: string[]
            }[])),
          }]
        };
      case "delete_entities":
        await knowledgeGraphManager.deleteEntities(args["entityNames"] as string[]);
        return {content: [{type: "text", text: "Entities deleted successfully"}]};
      case "delete_observations":
        await knowledgeGraphManager.deleteObservations(args["deletions"] as {
          entityName: string;
          observations: string[]
        }[]);
        return {content: [{type: "text", text: "Observations deleted successfully"}]};
      case "delete_relations":
        await knowledgeGraphManager.deleteRelations(args["relations"] as Relation[]);
        return {content: [{type: "text", text: "Relations deleted successfully"}]};
      case "read_graph":
        return {
          content: [{
            type: "text",
            text: YAML.stringify(await knowledgeGraphManager.readGraph())
          }]
        };
      case "search_nodes":
        return {
          content: [{
            type: "text",
            text: YAML.stringify(await knowledgeGraphManager.searchNodes(args["query"] as string)),
          }]
        };
      case "open_nodes":
        return {
          content: [{
            type: "text",
            text: YAML.stringify(await knowledgeGraphManager.openNodes(args["names"] as string[])),
          }]
        };
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}
