import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import {
  killMcp,
  resetLibAndBootMcp,
  callMcp,
  tempLibraryPath,
} from './util.test';

describe('E2E Entity Tools', () => {
  let serverProcess: ChildProcess;

  beforeAll(() => {
    serverProcess = resetLibAndBootMcp();
  });

  afterAll(() => {
    killMcp(serverProcess);
  });

  test('should create a new entity using createEntity tool', async () => {
    const newEntityName = 'new-test-entity';
    const response = await callMcp(serverProcess, 'tools/call', {
      name: 'createEntity',
      arguments: { libraryName: 'test-library', entityName: newEntityName },
    });

    expect(response.result).toContain('success');

    const newFilePath = path.join(tempLibraryPath, 'entities', `${newEntityName}.md`);
    const fileExists = fs.existsSync(newFilePath);
    expect(fileExists).toBe(true);
  }, 10000);

  test('should create multiple entities with content and metadata using addEntities tool', async () => {
    const entities = [
      {
        name: 'entity-with-all-fields',
        type: 'person',
        aliases: ['E1', 'Entity One'],
        content: 'This is the content for entity one.',
      },
      {
        name: 'entity-with-only-name-and-content',
        content: 'Content for entity two.',
      },
      {
        name: 'entity-with-only-name-and-type',
        type: 'place',
      },
      {
        name: 'entity-with-only-name',
      },
    ];

    const response = await callMcp(serverProcess, 'tools/call', {
      name: 'addEntities',
      arguments: { libraryName: 'test-library', entities: entities },
    });

    expect(response.result).toContain('4 entities created successfully');

    // Verify entity-with-all-fields
    const path1 = path.join(tempLibraryPath, 'entities', 'entity-with-all-fields.md');
    const content1 = fs.readFileSync(path1, 'utf-8');
    expect(content1).toContain('entity type: person');
    expect(content1).toContain('aliases:');
    expect(content1).toContain('- E1');
    expect(content1).toContain('- Entity One');
    expect(content1).toContain('This is the content for entity one.');

    // Verify entity-with-only-name-and-content
    const path2 = path.join(tempLibraryPath, 'entities', 'entity-with-only-name-and-content.md');
    const content2 = fs.readFileSync(path2, 'utf-8');
    expect(content2).toBe('Content for entity two.');

    // Verify entity-with-only-name-and-type
    const path3 = path.join(tempLibraryPath, 'entities', 'entity-with-only-name-and-type.md');
    const content3 = fs.readFileSync(path3, 'utf-8');
    expect(content3).toContain('entity type: place');

    // Verify entity-with-only-name
    const path4 = path.join(tempLibraryPath, 'entities', 'entity-with-only-name.md');
    const content4 = fs.readFileSync(path4, 'utf-8');
    expect(content4).toBe('');
  }, 10000);

  test('should soft delete entities and move them to trash', async () => {
    // 1. Create entities to delete
    const entitiesToDelete = [
      { name: 'to-be-deleted-1' },
      { name: 'to-be-deleted-2' },
    ];
    await callMcp(serverProcess, 'tools/call', {
      name: 'addEntities',
      arguments: { libraryName: 'test-library', entities: entitiesToDelete },
    });

    // 2. Call deleteEntities
    const entityNamesToDelete = ['to-be-deleted-1', 'to-be-deleted-2'];
    const response = await callMcp(serverProcess, 'tools/call', {
      name: 'deleteEntities',
      arguments: { libraryName: 'test-library', entityNames: entityNamesToDelete },
    });

    // 3. Verify success message
    expect(response.result).toContain('2 entities moved to trash');

    // 4. Verify original files are gone
    const path1 = path.join(tempLibraryPath, 'entities', 'to-be-deleted-1.md');
    const path2 = path.join(tempLibraryPath, 'entities', 'to-be-deleted-2.md');
    expect(fs.existsSync(path1)).toBe(false);
    expect(fs.existsSync(path2)).toBe(false);

    // 5. Verify renamed files exist in trash
    const trashDir = path.join(tempLibraryPath, 'trash');
    const trashFiles = fs.readdirSync(trashDir);
    expect(trashFiles.some(file => file.startsWith('to-be-deleted-1'))).toBe(true);
    expect(trashFiles.some(file => file.startsWith('to-be-deleted-2'))).toBe(true);
  }, 10000);

  test('should read multiple entities content', async () => {
    // 1. Create entities to read
    const entitiesToRead = [
      { name: 'to-be-read-1', content: 'Content of read 1' },
      { name: 'to-be-read-2', content: 'Content of read 2' },
    ];
    await callMcp(serverProcess, 'tools/call', {
      name: 'addEntities',
      arguments: { libraryName: 'test-library', entities: entitiesToRead },
    });

    // 2. Call readEntities
    const entityNamesToRead = ['to-be-read-1', 'to-be-read-2'];
    const response = await callMcp(serverProcess, 'tools/call', {
      name: 'readEntities',
      arguments: { libraryName: 'test-library', entityNames: entityNamesToRead },
    });

    // 3. Verify the combined content
    expect(response.result).toContain('--- to-be-read-1 ---');
    expect(response.result).toContain('Content of read 1');
    expect(response.result).toContain('--- to-be-read-2 ---');
    expect(response.result).toContain('Content of read 2');
  }, 10000);

  test('should list entities with and without glob pattern', async () => {
    // 1. Create entities to list
    const entitiesToList = [
      { name: 'project-alpha' },
      { name: 'project-beta' },
      { name: 'personal-notes' },
    ];
    await callMcp(serverProcess, 'tools/call', {
      name: 'addEntities',
      arguments: { libraryName: 'test-library', entities: entitiesToList },
    });

    // 2. Call listEntities with a glob pattern
    const responseWithGlob = await callMcp(serverProcess, 'tools/call', {
      name: 'listEntities',
      arguments: { libraryName: 'test-library', entityGlob: 'project-*' },
    });

    // 3. Verify the filtered list
    expect(responseWithGlob.result).toContain('2 entities found');
    expect(responseWithGlob.result).toContain('project-alpha');
    expect(responseWithGlob.result).toContain('project-beta');
    expect(responseWithGlob.result).not.toContain('personal-notes');

    // 4. Call listEntities without a glob pattern
    const responseWithoutGlob = await callMcp(serverProcess, 'tools/call', {
      name: 'listEntities',
      arguments: { libraryName: 'test-library' },
    });

    // 5. Verify the full list (includes entities from previous tests)
    expect(responseWithoutGlob.result).toContain('entities found');
    expect(responseWithoutGlob.result).toContain('project-alpha');
    expect(responseWithoutGlob.result).toContain('project-beta');
    expect(responseWithoutGlob.result).toContain('personal-notes');
    expect(responseWithoutGlob.result).toContain('new-test-entity');
  }, 10000);

  test('should get entities TOC including frontmatter and headings', async () => {
    // 1. Create an entity with frontmatter and headings
    const entityName = 'entity-with-toc';
    const content = `---
entity type: document
aliases:
  - Doc
---

# Introduction
This is the introduction.

## Section 1
Content of section 1.

### Subsection 1.1
Content of subsection 1.1.

## Section 2
Content of section 2.
`;
    await callMcp(serverProcess, 'tools/call', {
      name: 'addEntities',
      arguments: { libraryName: 'test-library', entities: [{ name: entityName, content: content }] },
    });

    // 2. Call getEntitiesToc
    const response = await callMcp(serverProcess, 'tools/call', {
      name: 'getEntitiesToc',
      arguments: { libraryName: 'test-library', entityNames: [entityName] },
    });

    // 3. Verify the returned TOC
    const expectedToc = [
      {
        entityName: 'entity-with-toc',
        toc: [
          'frontmatter',
          '# Introduction',
          '## Section 1',
          '### Subsection 1.1',
          '## Section 2',
        ],
      },
    ];
    expect(response.result).toEqual(yaml.stringify(expectedToc));
  }, 10000);
});
