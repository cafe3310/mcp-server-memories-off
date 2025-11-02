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
      arguments: { libraryName: 'test-library', entity: entities },
    });

    expect(response).toContain('entity-with-all-fields');
    expect(response).toContain('entity-with-only-name-and-content');
    expect(response).toContain('entity-with-only-name-and-type');
    expect(response).toContain('entity-with-only-name');

    // Verify entity-with-all-fields
    const path1 = path.join(tempLibraryPath, 'entities', 'entity-with-all-fields.md');
    const content1 = fs.readFileSync(path1, 'utf-8');
    expect(content1).toContain('entity type: person');
    expect(content1).toContain('aliases: E1, Entity One');
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
      arguments: { libraryName: 'test-library', entity: entitiesToDelete },
    });

    // 2. Call deleteEntities
    const entityNamesToDelete = ['to-be-deleted-1', 'to-be-deleted-2'];
    const response = await callMcp(serverProcess, 'tools/call', {
      name: 'deleteEntities',
      arguments: { libraryName: 'test-library', entityNames: entityNamesToDelete },
    });

    // 3. Verify success message
    expect(response).toContain('to-be-deleted-1');
    expect(response).toContain('to-be-deleted-2');

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
      arguments: { libraryName: 'test-library', entity: entitiesToRead },
    });

    // 2. Call readEntities
    const entityNamesToRead = ['to-be-read-1', 'to-be-read-2'];
    const response = await callMcp(serverProcess, 'tools/call', {
      name: 'readEntities',
      arguments: { libraryName: 'test-library', entityNames: entityNamesToRead },
    });

    // 3. Verify the combined content
    expect(response).toContain('--- to-be-read-1 ---');
    expect(response).toContain('Content of read 1');
    expect(response).toContain('--- to-be-read-2 ---');
    expect(response).toContain('Content of read 2');
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
      arguments: { libraryName: 'test-library', entity: entitiesToList },
    });

    // 2. Call listEntities with a glob pattern
    const responseWithGlob = await callMcp(serverProcess, 'tools/call', {
      name: 'listEntities',
      arguments: { libraryName: 'test-library', entityNameGlobs: 'project-*' },
    });

    // 3. Verify the filtered list
    expect(responseWithGlob).toContain('project-alpha');
    expect(responseWithGlob).toContain('project-beta');
    expect(responseWithGlob).not.toContain('personal-notes');

    // 4. Call listEntities without a glob pattern
    const responseWithoutGlob = await callMcp(serverProcess, 'tools/call', {
      name: 'listEntities',
      arguments: {
        libraryName: 'test-library'
      },
    });

    expect(responseWithoutGlob).toContain('error');
  }, 10000);

  test('should get entities TOC with various inputs and mixed results', async () => {
    // 1. Create entities with frontmatter and headings
    const entitiesToCreate = [
      {
        name: 'toc-entity-1',
        content: `---\nkey: value
---

# Section 1

## Section 1.1`,
      },
      {
        name: 'toc-entity-2',
        content: `# Part A

# Part B`,
      },
    ];
    await callMcp(serverProcess, 'tools/call', {
      name: 'addEntities',
      arguments: { libraryName: 'test-library', entity: entitiesToCreate },
    });

    // 2. Call getEntitiesToc with a single entity name (string)
    const responseSingle = await callMcp(serverProcess, 'tools/call', {
      name: 'getEntitiesToc',
      arguments: { libraryName: 'test-library', entityNames: 'toc-entity-1' },
    });

    // 3. Verify the TOC for the single entity
    expect(responseSingle).toContain('<getEntitiesToc reason="" TOCS OF ENTITIES>');
    expect(responseSingle).toContain('===toc-entity-1 TOC START===');
    expect(responseSingle).not.toContain('- frontmatter');
    expect(responseSingle).toContain('- # Section 1');
    expect(responseSingle).toContain('- ## Section 1.1');
    expect(responseSingle).toContain('===toc-entity-1 TOC END===');
    expect(responseSingle).not.toContain('FAILED');

    // 4. Call getEntitiesToc with a mix of valid and invalid entities
    const responseMixed = await callMcp(serverProcess, 'tools/call', {
      name: 'getEntitiesToc',
      arguments: { libraryName: 'test-library', entityNames: ['toc-entity-2', 'non-existent-entity'] },
    });

    // 5. Verify the two-tag response for mixed results
    // Success Tag
    expect(responseMixed).toContain('<getEntitiesToc reason="" TOCS OF ENTITIES>');
    expect(responseMixed).toContain('===toc-entity-2 TOC START===');
    expect(responseMixed).toContain('- # Part A');
    expect(responseMixed).toContain('- # Part B');
    expect(responseMixed).toContain('===toc-entity-2 TOC END===');
    expect(responseMixed).not.toContain('toc-entity-1');

    // Failure Tag
    expect(responseMixed).toContain('<getEntitiesToc reason="" FAILED>');
    expect(responseMixed).toContain('- non-existent-entity: 无法找到文件');
  }, 10000);

  test('should rename an entity and update incoming relations', async () => {
    // 1. Create a target entity and a linking entity
    const targetEntityName = 'rename-target';
    const linkingEntityName = 'linking-entity';
    const entitiesToCreate = [
      { name: targetEntityName, content: 'Initial content.' },
      {
        name: linkingEntityName,
        content: `---\nrelation knows: ${targetEntityName}
---\nThis entity links to the target.`,
      },
    ];
    await callMcp(serverProcess, 'tools/call', {
      name: 'addEntities',
      arguments: { libraryName: 'test-library', entity: entitiesToCreate },
    });

    // 2. Call renameEntity
    const newTargetName = 'rename-target-new';
    const response = await callMcp(serverProcess, 'tools/call', {
      name: 'renameEntity',
      arguments: { libraryName: 'test-library', oldName: targetEntityName, newName: newTargetName },
    });

    // 3. Verify the success response
    expect(response).toContain('<renameEntity reason= SUCCESS>');
    expect(response).toContain(`旧名字: ${targetEntityName} --> 新名字: ${newTargetName}`);
    expect(response).toContain('更新了 1 个关联实体。');

    // 4. Verify file system changes
    const oldPath = path.join(tempLibraryPath, 'entities', `${targetEntityName}.md`);
    const newPath = path.join(tempLibraryPath, 'entities', `${newTargetName}.md`);
    expect(fs.existsSync(oldPath)).toBe(false);
    expect(fs.existsSync(newPath)).toBe(true);

    // 5. Verify the linking entity was updated
    const linkingEntityPath = path.join(tempLibraryPath, 'entities', `${linkingEntityName}.md`);
    const linkingEntityContent = fs.readFileSync(linkingEntityPath, 'utf-8');
    expect(linkingEntityContent).toContain(`relation knows: ${newTargetName}`);
    expect(linkingEntityContent).not.toContain(`relation knows: ${targetEntityName}`);
  }, 10000);

  test('should return a failure message when trying to rename a non-existent entity', async () => {
    // 1. Call renameEntity with a name that doesn't exist
    const response = await callMcp(serverProcess, 'tools/call', {
      name: 'renameEntity',
      arguments: { libraryName: 'test-library', oldName: 'non-existent-for-rename', newName: 'new-name' },
    });

    // 2. Verify the failure response
    expect(response).toContain('<renameEntity reason= FAILED>');
    expect(response).toContain("无法找到源文件");
  }, 10000);

  test('should read specific sections with collapsed context', async () => {
    // 1. Create an entity with a rich structure
    const entityName = 'structured-doc';
    const content = `---
author: Gemini
version: 1
---
# Title
Introductory paragraph.
## Section 1
Content of section 1.
## Section 2
Content of section 2.`;
    await callMcp(serverProcess, 'tools/call', {
      name: 'addEntities',
      arguments: { libraryName: 'test-library', entity: [{ name: entityName, content }] },
    });

    // 2. Call readEntitiesSections to expand only "Section 1"
    const response1 = await callMcp(serverProcess, 'tools/call', {
      name: 'readEntitiesSections',
      arguments: { libraryName: 'test-library', entityNames: entityName, sectionGlobs: 'Section 1' }, // Use normalized glob
    });

    // 3. Verify the output for expanding Section 1
    expect(response1).toContain('SECTIONS: section 1 START===');
    expect(response1).toContain('# Title\n...'); // Title is collapsed
    expect(response1).toContain('Content of section 1.'); // Section 1 is expanded
    expect(response1).toContain('## Section 2\n...'); // Section 2 is collapsed

    // 4. Call readEntitiesSections to expand "frontmatter" - this should now return nothing for frontmatter
    const response2 = await callMcp(serverProcess, 'tools/call', {
      name: 'readEntitiesSections',
      arguments: { libraryName: 'test-library', entityNames: entityName, sectionGlobs: 'frontmatter' },
    });

    // 5. Verify the output for expanding frontmatter (it should not be found)
    expect(response2).toContain('===structured-doc SECTIONS:  START==='); // No matched sections
    expect(response2).not.toContain('frontmatter');
    expect(response2).toContain('# Title\n...');
    expect(response2).toContain('## Section 1\n...');
    expect(response2).toContain('## Section 2\n...');
    expect(response2).toContain('===structured-doc END===');
  }, 10000);

  test('should add content to a specific section of an entity', async () => {
    // 1. Create an entity with sections
    const entityName = 'doc-to-add-content';
    const initialContent = `# Title\n\n## Section 1\nInitial content in section 1.`;
    await callMcp(serverProcess, 'tools/call', {
      name: 'addEntities',
      arguments: { libraryName: 'test-library', entity: [{ name: entityName, content: initialContent }] },
    });

    // 2. Call addEntityContent to append to Section 1
    const newContent = 'This is new content.';
    const response = await callMcp(serverProcess, 'tools/call', {
      name: 'addEntityContent',
      arguments: {
        libraryName: 'test-library',
        entityName: entityName,
        inSection: '## Section 1',
        newContent: newContent,
      },
    });

    // 3. Verify the success response
    expect(response).toContain('<addEntityContent reason="" result="success">');
    expect(response).toContain(`Content added to section '## Section 1' in entity '${entityName}'.`);

    // 4. Verify the file content was updated
    const entityPath = path.join(tempLibraryPath, 'entities', `${entityName}.md`);
    const updatedContent = fs.readFileSync(entityPath, 'utf-8');
    expect(updatedContent).toContain('Initial content in section 1.\nThis is new content.');
  }, 10000);

  test('should return a failure message when adding content to a non-existent section', async () => {
    // 1. Call addEntityContent with a section that doesn\'t exist
    const response = await callMcp(serverProcess, 'tools/call', {
      name: 'addEntityContent',
      arguments: {
        libraryName: 'test-library',
        entityName: 'doc-to-add-content', // from previous test
        inSection: '## Non-Existent Section',
        newContent: 'some content',
      },
    });

    // 2. Verify the failure response
    expect(response).toContain('<addEntityContent reason="" result="failure">');
    expect(response).toContain("未找到与 '## Non-Existent Section' 匹配的章节标题");
  }, 10000);

  test('should delete content from a specific section of an entity', async () => {
    // 1. Create an entity with content to delete
    const entityName = 'doc-to-delete-content';
    const contentToDelete = 'This content will be deleted.';
    const initialContent = `# Title\n\n## Section 1\n${contentToDelete}`;
    await callMcp(serverProcess, 'tools/call', {
      name: 'addEntities',
      arguments: { libraryName: 'test-library', entity: [{ name: entityName, content: initialContent }] },
    });

    // 2. Call deleteEntityContent
    const response = await callMcp(serverProcess, 'tools/call', {
      name: 'deleteEntityContent',
      arguments: {
        libraryName: 'test-library',
        entityName: entityName,
        inSection: '## Section 1',
        contentToDelete: contentToDelete,
      },
    });

    // 3. Verify the success response
    expect(response).toContain('<deleteEntityContent reason= SUCCESS>');
    expect(response).toContain(`Content deleted from section '## Section 1' in entity '${entityName}'.`);

    // 4. Verify the file content was updated
    const entityPath = path.join(tempLibraryPath, 'entities', `${entityName}.md`);
    const updatedContent = fs.readFileSync(entityPath, 'utf-8');
    expect(updatedContent).not.toContain(contentToDelete);
  }, 10000);

  test('should return a failure message when deleting non-existent content', async () => {
    // 1. Call deleteEntityContent with content that doesn\'t exist
    const response = await callMcp(serverProcess, 'tools/call', {
      name: 'deleteEntityContent',
      arguments: {
        libraryName: 'test-library',
        entityName: 'doc-to-delete-content', // from previous test
        inSection: '## Section 1',
        contentToDelete: 'this content does not exist',
      },
    });

    // 2. Verify the failure response
    expect(response).toContain('<deleteEntityContent reason= FAILED>');
    expect(response).toContain('未找到匹配的内容块。');
  }, 10000);

  test('should successfully add and then delete content to reproduce the bug', async () => {
    const entityName = 'add-then-delete-bug';
    const section = '## Target Section';
    const content = 'This is a line to be added and then deleted.';

    // 1. Create an entity with a target section
    await callMcp(serverProcess, 'tools/call', {
      name: 'addEntities',
      arguments: { libraryName: 'test-library', entity: [{ name: entityName, content: `# Bug Test\n\n${section}` }] },
    });

    // 2. Add content to the section
    await callMcp(serverProcess, 'tools/call', {
      name: 'addEntityContent',
      arguments: {
        libraryName: 'test-library',
        entityName: entityName,
        inSection: section,
        newContent: content,
      },
    });

    // 3. Immediately delete the same content
    const deleteResponse = await callMcp(serverProcess, 'tools/call', {
      name: 'deleteEntityContent',
      arguments: {
        libraryName: 'test-library',
        entityName: entityName,
        inSection: section,
        contentToDelete: content,
      },
    });

    // 4. Verify the deletion was successful
    expect(deleteResponse).toContain('<deleteEntityContent reason= SUCCESS>');
    expect(deleteResponse).not.toContain('FAILED');

    // 5. Verify the content is actually gone from the file
    const entityPath = path.join(tempLibraryPath, 'entities', `${entityName}.md`);
    const updatedContent = fs.readFileSync(entityPath, 'utf-8');
    expect(updatedContent).not.toContain(content);
  }, 10000);

  test('should successfully merge multiple source entities into a target entity', async () => {
    const targetName = 'merge-target';
    const source1Name = 'merge-source-1';
    const source2Name = 'merge-source-2';

    // 1. Create target and source entities with complex structure
    await callMcp(serverProcess, 'tools/call', {
      name: 'addEntities',
      arguments: {
        libraryName: 'test-library',
        entity: [
          {
            name: targetName,
            content: '# Section A\nTarget content A.\n### Section C\nTarget content C.',
            type: 'concept',
            aliases: ['T1'],
          },
          {
            name: source1Name,
            content: '## Section B\nSource 1 content B.\n# Section A\nSource 1 content A.',
            type: 'idea',
            aliases: ['S1'],
          },
          {
            name: source2Name,
            content: '## Section D\nSource 2 content D.\n### Section C\nSource 2 content C.',
            type: 'idea',
            aliases: ['S2', 'T1'], // T1 is a duplicate alias
          },
        ],
      },
    });

    // 2. Call mergeEntities
    const response = await callMcp(serverProcess, 'tools/call', {
      name: 'mergeEntities',
      arguments: {
        libraryName: 'test-library',
        sourceNames: [source1Name, source2Name],
        targetName: targetName,
        reason: 'test merge',
      },
    });

    // 3. Verify success response
    expect(response).toContain(`<mergeEntities reason=test merge SUCCESS>`);

    // 4. Verify source entities are deleted
    expect(fs.existsSync(path.join(tempLibraryPath, 'entities', `${source1Name}.md`))).toBe(false);
    expect(fs.existsSync(path.join(tempLibraryPath, 'entities', `${source2Name}.md`))).toBe(false);

    // 5. Verify target entity content and frontmatter from the response
    const finalContent = response.substring(response.indexOf('---'));
    const expectedContent = `
---
entity type: concept, idea, idea
aliases: T1, S1, S2
---
## section a
Target content A.
Source 1 content A.
## section c
Target content C.
Source 2 content C.
## section b
Source 1 content B.
## section d
Source 2 content D.
</mergeEntities>
`.trim();

    expect(finalContent.trim()).toEqual(expectedContent);

  }, 10000);

  test('should return a failure message when merging into a non-existent target entity', async () => {
    const nonExistentTarget = 'non-existent-target';
    const sourceName = 'merge-source-fail';

    // 1. Create a source entity
    await callMcp(serverProcess, 'tools/call', {
      name: 'addEntities',
      arguments: {
        libraryName: 'test-library',
        entity: [{ name: sourceName, content: 'Source content.' }],
      },
    });

    // 2. Call mergeEntities with a non-existent target
    const response = await callMcp(serverProcess, 'tools/call', {
      name: 'mergeEntities',
      arguments: {
        libraryName: 'test-library',
        sourceNames: [sourceName],
        targetName: nonExistentTarget,
      },
    });

    // 3. Verify failure response
    expect(response).toContain('<mergeEntities reason= FAILED>');
    expect(response).toContain(`无法找到文件: ${path.join(tempLibraryPath, 'entities', `${nonExistentTarget}.md`)}`);

    // 4. Verify source entity is NOT deleted
    expect(fs.existsSync(path.join(tempLibraryPath, 'entities', `${sourceName}.md`))).toBe(true);
  }, 10000);

  test('should replace a specific section of an entity', async () => {
    const entityName = 'replace-section-test';
    const oldHeading = '## Old Section';
    const newHeading = '## New Section';
    const newBodyContent = 'This is the new content for the section.';

    // 1. Create an entity with a section
    await callMcp(serverProcess, 'tools/call', {
      name: 'addEntities',
      arguments: {
        libraryName: 'test-library',
        entity: {
          name: entityName,
          content: `${oldHeading}\nOld content line 1.\nOld content line 2.`,
          type: 'test',
        },
      },
    });

    // 2. Call replaceEntitySection
    const response = await callMcp(serverProcess, 'tools/call', {
      name: 'replaceEntitySection',
      arguments: {
        libraryName: 'test-library',
        entityName: entityName,
        oldHeading: oldHeading,
        newHeading: newHeading,
        newBodyContent: newBodyContent,
        reason: 'test replace section',
      },
    });

    // 3. Verify success response
    expect(response).toContain(`<replaceEntitySection reason=test replace section SUCCESS>`);
    expect(response).toContain(`Section '${oldHeading}' in entity '${entityName}' has been replaced with '${newHeading}'.`);

    // 4. Verify the content of the entity
    const readResponse = await callMcp(serverProcess, 'tools/call', {
      name: 'readEntities',
      arguments: {
        libraryName: 'test-library',
        entityNames: [entityName],
        reason: 'read after replace',
      },
    });

    expect(readResponse).toContain(`<entity name="${entityName}">\n---\nentity type: test\n---\n${newHeading}\n${newBodyContent}\n</entity>`);
  }, 10000);
});
