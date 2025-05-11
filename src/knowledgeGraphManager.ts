import type {Entity, KnowledgeGraph, Relation} from "./typings.ts";
import * as fs from "fs";
import * as path from "path";
import {checkObjHas, checks, logfile, logfileE} from "./utils.ts";
import YAML from 'yaml'

// The KnowledgeGraphManager class contains all operations to interact with the knowledge graph
export class KnowledgeGraphManager {

  private filePath: string;

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
    logfile('graph', `Saved graph to ${this.filePath}, length: ${lines.length}`);
  }

  createEntities(entities: Entity[]): Entity[] {
    const graph = this.loadGraph();
    const newEntities = entities.filter(e => !graph.entities.some(existingEntity => existingEntity.name === e.name));
    graph.entities.push(...newEntities);
    this.saveGraph(graph);
    return newEntities;
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

  addObservations(observations: { entityName: string; contents: string[] }[]): {
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
}
