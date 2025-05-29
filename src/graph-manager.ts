import type {Entity, KnowledgeGraph, Relation} from "./typings.ts";
import * as fs from "fs";
import * as path from "path";
import {checkObjHas, checks, logfile, logfileE} from "./utils.ts";
import YAML from 'yaml'

// The KnowledgeGraphManager class contains all operations to interact with the knowledge graph
export class GraphManager {

  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    checks(path.isAbsolute(this.filePath), `filePath must be an absolute path, but got ${this.filePath}`);
  }

  private loadGraph(): KnowledgeGraph {
    try {
      const data = fs.readFileSync(this.filePath, "utf-8");

      logfile('graph', `Loaded graph from ${this.filePath}, length: ${data.length}`);

      // should be an array [{entity}, {entity}, ..., {relation}, {relation}, ...]
      const yamlData: unknown = YAML.parse(data);
      checks(Array.isArray(yamlData), `Invalid YAML format in ${this.filePath}, should be an array`);

      return yamlData.reduce((graph: KnowledgeGraph, item: unknown) => {

        // should be {type: ..., ...}
        checkObjHas<{type: string}>(item, 'type', 'string');

        if (item.type === 'entity') {
          graph.entities.push(item as unknown as Entity);
        } else if (item.type === 'relation') {
          graph.relations.push(item as unknown as Relation);
        }
        return graph;

      }, {entities: [], relations: []});
    } catch (error) {
      logfileE('graph', error, `Error loading graph from ${this.filePath}, using empty graph`);
      if (error instanceof Error && 'code' in error && error.code === "ENOENT") {
        return {entities: [], relations: []};
      }
      throw error;
    }
  }

  private saveGraph(graph: KnowledgeGraph): void {
    const lines = [
      ...graph.entities.map(e => ({type: "entity", ...e})),
      ...graph.relations.map(r => ({type: "relation", ...r})),
    ];
    const yamlString = YAML.stringify(lines);
    fs.writeFileSync(this.filePath, yamlString);
    logfile('graph', `Saved graph to ${this.filePath}, items count: ${lines.length}`);
  }

  // 如果实体已经存在，则更新实体属性（type: 不变，observations: 追加）
  // 如果实体不存在，则添加实体
  upsertEntities(entities: Entity[]): {
    editedEntityNames: string[],
    addedEntityNames: string[],
  } {
    const graph = this.loadGraph();

    const editedEntityNames: string[] = [];
    const addedEntityNames: string[] = [];

    entities.forEach(e => {
      if (e.name) {
        const existingEntity = graph.entities.find(existingEntity => existingEntity.name === e.name);
        if (existingEntity) {
          if (e.observations) {
            existingEntity.observations.push(...e.observations);
          }
          editedEntityNames.push(e.name);
        } else {
          // Add new entity
          graph.entities.push(e);
          addedEntityNames.push(e.name);
        }
      }
    });
    this.saveGraph(graph);
    return {
      editedEntityNames,
      addedEntityNames,
    };
  }

  createRelations(relations: Relation[]): Relation[] {
    const graph = this.loadGraph();
    const newRelations = relations.filter(r => !graph.relations.some(existingRelation =>
      existingRelation.from === r.from &&
            existingRelation.to === r.to &&
            existingRelation.relationType === r.relationType
    ));
    graph.relations.push(...newRelations);
    this.saveGraph(graph);
    return newRelations;
  }

  upsertObservations(observations: { entityName: string; contents: string[] }[]): {
    entityName: string;
    addedObservations: string[]
  }[] {
    const graph = this.loadGraph();
    const results = observations.map(o => {
      const entity = graph.entities.find(e => e.name === o.entityName);
      if (!entity) {
        throw new Error(`Entity with name ${o.entityName} not found`);
      }
      const newObservations = o.contents.filter(content => !entity.observations.includes(content));
      entity.observations.push(...newObservations);
      return {entityName: o.entityName, addedObservations: newObservations};
    });
    this.saveGraph(graph);
    return results;
  }

  deleteEntities(entityNames: string[]): void {
    const graph = this.loadGraph();
    graph.entities = graph.entities.filter(e => !entityNames.includes(e.name));
    graph.relations = graph.relations.filter(r => !entityNames.includes(r.from) && !entityNames.includes(r.to));
    this.saveGraph(graph);
  }

  deleteObservations(deletions: { entityName: string; observations: string[] }[]): void {
    const graph = this.loadGraph();
    deletions.forEach(d => {
      const entity = graph.entities.find(e => e.name === d.entityName);
      if (entity) {
        entity.observations = entity.observations.filter(o => !d.observations.includes(o));
      }
    });
    this.saveGraph(graph);
  }

  deleteRelations(relations: Relation[]): void {
    const graph = this.loadGraph();
    graph.relations = graph.relations.filter(r => !relations.some(delRelation =>
      r.from === delRelation.from &&
            r.to === delRelation.to &&
            r.relationType === delRelation.relationType
    ));
    this.saveGraph(graph);
  }

  readGraph(): KnowledgeGraph {
    return this.loadGraph();
  }

  // Very basic search function
  // 搜索 entity(name, type) 和 relation(from, to)
  // 但不会搜索 relationType
  searchNodes(query: string): KnowledgeGraph {
    const graph = this.loadGraph();

    // 将 query 用空格分割成多个关键词
    const keywords = query.split(/\s+/).map(k => k.toLowerCase());

    // 过滤实体。如果实体 name, entityType, observation 中包含任意一个关键词，则保留该实体
    const filteredEntities = graph.entities.filter(e =>
      keywords.some(k => e.name.toLowerCase().includes(k) ||
            e.entityType.toLowerCase().includes(k) ||
            e.observations.some(o => o.toLowerCase().includes(k)))
    );

    // 创建一个 Set，用于快速查找过滤后的实体名称
    const filteredEntityNames = new Set(filteredEntities.map(e => e.name));

    // 过滤关系。如果关系的 from 和 to 都在过滤后的实体中，保留该关系
    const filteredRelations = graph.relations.filter(r =>
      filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to)
    );

    // 返回过滤后的节点
    return {
      entities: filteredEntities,
      relations: filteredRelations,
    };
  }

  openNodes(names: string[]): KnowledgeGraph {
    const graph = this.loadGraph();

    // Filter entities
    const filteredEntities = graph.entities.filter(e => names.includes(e.name));

    // Create a Set of filtered entity names for quick lookup
    const filteredEntityNames = new Set(filteredEntities.map(e => e.name));

    // Filter relations to only include those between filtered entities
    const filteredRelations = graph.relations.filter(r =>
      filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to)
    );

    return {
      entities: filteredEntities,
      relations: filteredRelations,
    };
  }

  /**
   * 创建当前图文件的带时间戳的备份文件，保存在同一目录下。
   * 如果原始文件不存在或备份文件已存在则抛出异常。
   * @returns 备份文件的路径
   */
  backupGraph(): string {
    const origFile = this.filePath;
    const { dir, name } = path.parse(origFile);
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupFile = path.join(dir, `${name}_backup_${timestamp}.yaml`);

    if (!( fs.existsSync(origFile))) {
      throw new Error(`原始文件不存在: ${origFile}`);
    }
    if ( fs.existsSync(backupFile)) {
      throw new Error(`备份文件已存在: ${backupFile}`);
    }

    logfile('graph', `正在创建备份: ${origFile} -> ${backupFile}`);
    try {
      fs.copyFileSync(origFile, backupFile);
      logfile('graph', `备份创建成功: ${backupFile}`);
      return backupFile;
    } catch (error) {
      throw new Error(`创建备份时出错`, {cause: error});
    }
  }

  readSubgraph(names: string[], maxDepth: number): { entities: Entity[]; relations: Relation[] } {
    const graph = this.loadGraph();

    logfile('graph', `Reading subgraph for entities: ${names.join(', ')}, maxDepth: ${maxDepth}`);
    logfile('graph', `Entity map size: ${graph.entities.length}`);
    logfile('graph', `Relation map size: ${graph.relations.length}`);

    // 生成 Record<entityName, Entity> 用于快速查找
    const entityMap: Record<string, Entity> = {};
    graph.entities.forEach(e => {
      if (e.name) {
        entityMap[e.name] = e;
      }
    });

    // 生成 Record<entityName, Relation[]> 用于快速查找
    const relationMap: Record<string, Set<Relation>> = {};
    graph.relations.forEach(r => {
      if (r.from && r.to) {
        relationMap[r.from] ??= new Set();
        relationMap[r.from]!.add(r);
        relationMap[r.to] ??= new Set();
        relationMap[r.to]!.add(r);
      }
    });

    const resultEntities: Record<string, Entity> = {};
    const resultRelations: Set<Relation> = new Set<Relation>();

    // 从 relationMap 找到所有与 resultEntities 实体相关的关系，添加到 resultRelations 中，
    // 同时将关系两头的实体都添加到 resultEntities 中，直到没有新的实体可以添加。
    // 用一个队列来存储待处理的实体。

    // 1. 初始化队列和 visited 集合（代表该实体已经在 resultEntities 中，它的所有关系都已经添加到 resultRelations 中）
    // 队列元素包含实体名和当前深度
    const queue: { name: string; depth: number }[] = names.map(name => ({ name, depth: 0 }));
    const visited: Map<string, number> = new Map<string, number>(); // 记录实体名及其最小访问深度

    logfile('graph', `1. Initial entities count: ${names.length}`);

    while (queue.length > 0) {
      const { name: entityName, depth } = queue.shift()!;
      if (visited.has(entityName) && visited.get(entityName)! <= depth) {
        logfile('graph', `2. Entity ${entityName} already visited at depth ${visited.get(entityName)}, skipping`);
        continue;
      }
      if (depth > maxDepth) {
        logfile('graph', `2. Entity ${entityName} at depth ${depth} exceeds maxDepth, skipping`);
        continue;
      }
      logfile('graph', `2. Processing entity: ${entityName} at depth ${depth}`);
      visited.set(entityName, depth);

      // 3. 如果该实体在 entityMap 中，则将其添加到 resultEntities 中
      if (entityMap[entityName]) {
        resultEntities[entityName] = entityMap[entityName];
        logfile('graph', `3. Added entity: ${entityName}`);
      }

      // 4. 如果该实体在 relationMap 中，则将其所有关系添加到 resultRelations 中
      if (relationMap[entityName] && depth < maxDepth) {
        let pushedEntities = 0;
        for (const relation of relationMap[entityName]) {
          resultRelations.add(relation);
          // 5. 将关系两头的实体添加到队列中（如果它们不在 visited set 中或以更大深度访问）
          if (relation.from !== entityName && (!visited.has(relation.from) || visited.get(relation.from)! > depth + 1)) {
            queue.push({ name: relation.from, depth: depth + 1 });
            pushedEntities++;
          }
          if (relation.to !== entityName && (!visited.has(relation.to) || visited.get(relation.to)! > depth + 1)) {
            queue.push({ name: relation.to, depth: depth + 1 });
            pushedEntities++;
          }
        }
        logfile('graph', `4. Added ${relationMap[entityName].size} relations for entity: ${entityName}`);
        logfile('graph', `5. Pushed ${pushedEntities} new entities to queue`);
      }

      logfile('graph', `6. Queue size: ${queue.length}`);
    }

    // 6. 返回最终结果
    logfile('graph', `7. Final entities count: ${Object.keys(resultEntities).length}`);
    logfile('graph', `8. Final relations count: ${resultRelations.size}`);

    return {
      entities: Object.values(resultEntities),
      relations: Array.from(resultRelations),
    };
  }


  mergeEntityTypes(argMergingEntityTypes: string[], argTargetEntityType: string): {
    originalEntitiesCount: number,
    mergedEntitiesCount: number,
  } {

    logfile('graph', `Merging entity types: ${argMergingEntityTypes.join(', ')} -> ${argTargetEntityType}`);

    const graph = this.loadGraph();

    logfile('graph', `Initial entity count: ${graph.entities.length}`);

    // 1. 过滤出要合并的实体
    const mergingEntities = graph.entities.filter(e => argMergingEntityTypes.includes(e.entityType));

    // 记录要过滤的实体数量和他们的（名字，类型）
    logfile('graph', `Merging entities count: ${mergingEntities.length}`);
    mergingEntities.forEach(e => {
      logfile('graph', `Merging entity: ${e.name}, type: ${e.entityType}`);
    });

    const mergedEntities: Record<string, Entity> = {};

    // 2. 遍历要合并的实体，复制一份，修改类型为目标类型
    mergingEntities.forEach(e => {
      const newEntity = {...e, entityType: argTargetEntityType};
      if (mergedEntities[newEntity.name]) {
        const existingEntity = mergedEntities[newEntity.name]!;
        existingEntity.observations.push(...newEntity.observations);
      } else {
        mergedEntities[newEntity.name] = newEntity;
      }
    });

    // 记录合并后的实体数量和他们的（名字，类型）
    logfile('graph', `Merged entities count: ${Object.keys(mergedEntities).length}`);
    Object.values(mergedEntities).forEach(e => {
      logfile('graph', `Merged entity: ${e.name}, type: ${e.entityType}`);
    });

    // 从 graph 中删除要合并的实体
    graph.entities = graph.entities.filter(e => !mergingEntities.includes(e));

    // 将合并后的实体添加到 graph 中
    Object.values(mergedEntities).forEach(e => {
      graph.entities.push(e);
    });

    // 3. 保存图
    this.saveGraph(graph);

    return {
      originalEntitiesCount: mergingEntities.length,
      mergedEntitiesCount: Object.keys(mergedEntities).length,
    }
  }

  // 返回 {type_name, entity_count}
  listEntityTypes(): {type: string, count: number}[] {

    const graph = this.loadGraph();

    // 1. 统计每种类型的实体数量
    const entityTypeCount: Record<string, number> = {};
    graph.entities.forEach(e => {
      if (e.entityType) {
        entityTypeCount[e.entityType] = (entityTypeCount[e.entityType] ?? 0) + 1;
      }
    });

    // 2. 返回结果
    return Object.entries(entityTypeCount).map(([type, count]) => ({type, count}));

  }

  // 返回 {type_name, relation_count}
  listRelationTypes(): {type: string, count: number}[] {

    const graph = this.loadGraph();

    // 1. 统计每种类型的关系数量
    const relationTypeCount: Record<string, number> = {};
    graph.relations.forEach(r => {
      if (r.relationType) {
        relationTypeCount[r.relationType] = (relationTypeCount[r.relationType] ?? 0) + 1;
      }
    });

    // 2. 返回结果
    return Object.entries(relationTypeCount).map(([type, count]) => ({type, count}));

  }

  mergeRelationTypes(argMergingRelationTypes: string[], argTargetRelationType: string): {
    originalRelationCount: number,
    mergedRelationCount: number,
  } {
    logfile('graph', `Merging relation types: ${argMergingRelationTypes.join(', ')} -> ${argTargetRelationType}`);

    const graph = this.loadGraph();

    logfile('graph', `Initial relation count: ${graph.relations.length}`);

    // 1. 过滤出要合并的关系
    const mergingRelations = graph.relations.filter(r => argMergingRelationTypes.includes(r.relationType));

    // 记录要过滤的关系数量和他们的（from, to, type）
    logfile('graph', `Merging relations count: ${mergingRelations.length}`);
    mergingRelations.forEach(r => {
      logfile('graph', `Merging relation: ${r.from} -> ${r.to}, type: ${r.relationType}`);
    });

    // 将 b64(type):b64(from):b64(to) 作为 key
    const mergedRelations: Record<string, Relation> = {};

    // 2. 遍历要合并的关系，复制一份，修改类型为目标类型
    mergingRelations.forEach(r => {
      const newRelation = {...r, relationType: argTargetRelationType};
      const key = `${Buffer.from(newRelation.relationType).toString('base64')}:${Buffer.from(newRelation.from).toString('base64')}:${Buffer.from(newRelation.to).toString('base64')}`;
      if (mergedRelations[key]) {
        const existingRelation = mergedRelations[key];
        existingRelation.relationType = argTargetRelationType;
      } else {
        mergedRelations[key] = newRelation;
      }
      mergedRelations[key] = newRelation;
    });

    // 记录合并后的关系数量和他们的（from, to, type）
    logfile('graph', `Merged relations count: ${Object.keys(mergedRelations).length}`);
    Object.values(mergedRelations).forEach(r => {
      logfile('graph', `Merged relation: ${r.from} -> ${r.to}, type: ${r.relationType}`);
    });

    // 从 graph 中删除要合并的关系
    graph.relations = graph.relations.filter(r => !mergingRelations.includes(r));

    // 将合并后的关系添加到 graph 中
    Object.values(mergedRelations).forEach(r => {
      graph.relations.push(r);
    });

    // 3. 保存图
    this.saveGraph(graph);

    // 4. 返回结果
    return {
      originalRelationCount: mergingRelations.length,
      mergedRelationCount: Object.keys(mergedRelations).length,
    }
  }
}
