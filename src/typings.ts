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

export interface Guide {
  name: string;
  description: string;
  targets: string[];
}

export interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
  guides: Guide[];
}

export interface KnowledgeGraphWithoutGuides {
  entities: Entity[];
  relations: Relation[];
}
