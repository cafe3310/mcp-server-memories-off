import {afterAll, beforeAll, describe, expect, test} from 'bun:test';
import type {ChildProcess} from 'node:child_process';
import {
  callMcp,
  expectFileTotalLines,
  killMcp,
  resetLibAndBootMcp,
  tempLibraryPath,
} from '../../test/e2e/util.test';
import path from 'path';
import fs from 'fs';

describe('E2E Relation Tools Lifecycle', () => {
  let serverProcess: ChildProcess;
  const libraryName = 'test-library';
  const entity1Name = 'entity-with-relations';
  const entity2Name = 'related-entity-1';
  const entity3Name = 'related-entity-2';
  const entity1Path = path.join(tempLibraryPath, 'entities', `${entity1Name}.md`);
  const entity2Path = path.join(tempLibraryPath, 'entities', `${entity2Name}.md`);
  const entity3Path = path.join(tempLibraryPath, 'entities', `${entity3Name}.md`);

  beforeAll(() => {
    serverProcess = resetLibAndBootMcp();
    // Create some initial entities for testing relations
    fs.writeFileSync(entity1Path, `---
entity type: test
---
# ${entity1Name}
Content for entity 1.`);
    fs.writeFileSync(entity2Path, `---
entity type: test
---
# ${entity2Name}
Content for entity 2.`);
    fs.writeFileSync(entity3Path, `---
entity type: test
---
# ${entity3Name}
Content for entity 3.`);
  });

  afterAll(() => {
    killMcp(serverProcess);
  });

  test('should create and delete relations in an entity' , async () => {
    // Step 1: Create relations
    let response = await callMcp(serverProcess, 'tools/call', {
      name: 'create_relations',
      arguments: {
        libraryName: libraryName,
        fromEntity: entity1Name,
        relations: [
          {type: 'knows', to: entity2Name},
          {type: 'likes', to: entity3Name},
        ],
      },
    });
    // match from "entity-with-relations" to "related-entity-1" and "related-entity-2"
    expect(response).toMatch(/entity-with-relations.*to.*related-entity-1.*knows.*related-entity-2.*likes/);

    expectFileTotalLines(entity1Path, [
      '---',
      'entity type: test',
      'relation as knows: related-entity-1',
      'relation as likes: related-entity-2',
      '---',
      `# ${entity1Name}`,
      'Content for entity 1.',
    ]);

    // Step 2: Attempt to create existing relation (should not duplicate)
    response = await callMcp(serverProcess, 'tools/call', {
      name: 'create_relations',
      arguments: {
        libraryName: libraryName,
        fromEntity: entity1Name,
        relations: [
          {type: 'knows', to: entity2Name},
        ],
      },
    });
    expect(response).toMatch(/Created relations.*\[]/); // No new relations should be created

    expectFileTotalLines(entity1Path, [
      '---',
      'entity type: test',
      'relation as knows: related-entity-1',
      'relation as likes: related-entity-2',
      '---',
      `# ${entity1Name}`,
      'Content for entity 1.',
    ]);

    // Step 3: Delete one relation
    response = await callMcp(serverProcess, 'tools/call', {
      name: 'delete_relations',
      arguments: {
        libraryName: libraryName,
        fromEntity: entity1Name,
        relations: [
          {type: 'knows', to: entity2Name},
        ],
      },
    });
    expect(response).toMatch(/entity-with-relations.*to.*related-entity-1.*knows/);

    expectFileTotalLines(entity1Path, [
      '---',
      'entity type: test',
      'relation as likes: related-entity-2',
      '---',
      `# ${entity1Name}`,
      'Content for entity 1.',
    ]);

    // Step 4: Delete the remaining relation
    response = await callMcp(serverProcess, 'tools/call', {
      name: 'delete_relations',
      arguments: {
        libraryName: libraryName,
        fromEntity: entity1Name,
        relations: [
          {type: 'likes', to: entity3Name},
        ],
      },
    });
    expect(response).toMatch(/entity-with-relations.*to.*related-entity-2.*likes/);

    expectFileTotalLines(entity1Path, [
      '---',
      'entity type: test',
      '---',
      `# ${entity1Name}`,
      'Content for entity 1.',
    ]);
  }, 10000);
});
