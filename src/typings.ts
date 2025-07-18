// We are storing our memory using entities, relations, and observations in a graph structure
export interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

export interface Relation {
  from: string;
  to: string;
  relationType: string;
}

export interface Manual {
  name: string;
  description: string;
  targets: string[];
}

export interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
  manual: Manual[];
}

export interface KnowledgeGraphWithoutManual {
  entities: Entity[];
  relations: Relation[];
}
