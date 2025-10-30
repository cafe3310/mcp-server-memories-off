# 统一设计文档：Shell-Native 架构与目录存储重构

## 1. 重构整体目的

为了提升系统的透明度、可维护性、执行效率和跨平台兼容性，我们对项目进行两项核心重构：

1.  **存储机制重构**: 从单一的 YAML 文件存储，转变为以文件系统目录结构为基础的知识图谱管理。这使得知识库对版本控制（如 Git）更加友好，并能与 Obsidian、VS Code 等 Markdown 编辑器无缝集成。
2.  **技术架构重构 (Shell-Native)**: 将项目的核心逻辑从自包含的 Node.js 应用，转变为一个基于原生 Shell 命令的智能编排器。Node.js 将作为“胶水”层，负责解析 MCP 请求，调用 `ShellJS` 执行跨平台的 Shell 命令，并格式化返回结果。

同时，项目将支持多知识库管理，通过命令行参数挂载，并要求所有工具集增加 `library_name` 参数以指定操作目标。

---

## 2. 知识仓库目录结构

-   **目录作为图谱**: 每个知识库都是一个目录，该目录本身代表一个完整的知识图谱。
-   **文件作为实体**: 目录中的每个 `.md` 文件代表一个知识实体。文件名（不含 `.md` 扩展名）即为实体的唯一名称 (`name`)。
-   **元数据文件 (`meta.md`)**: 在每个知识图谱的根目录下，存在一个 `meta.md` 文件，用于存储图谱的元信息，如使用说明、推荐的实体类型和内容模板。
-   **编辑日志文件 (`journey.yaml`)**: 在根目录下，存在一个 `journey.yaml` 文件，以仅追加的方式记录所有对知识库的操作历史。

---

## 3. Markdown 文件结构定义

每个 `.md` 文件都采用 YAML Front Matter 格式。

```markdown
---
entity type: <string>
aliases:
  - <string>
date created: <datetime>
date modified: <datetime>
relations:
  - relation type: <string>
    relation to: <string>
---

正文内容...
```

---

## 4. 对外工具集设计 (LLM-Friendly)

所有工具的返回格式都经过精心设计，以扁平、简洁的 YAML 格式返回，便于 LLM 解析和使用。

### 4.1. `manual` 系列 (操作 `meta.md`)

#### `read_manual(library_name)`
- **功能**: 读取 `meta.md` 的全部内容。
- **返回**: `meta.md` 文件的原始内容 (纯文本)。

#### `edit_manual_section(library_name, old_content, new_content)`
- **功能**: 通过精确匹配 `old_content` 并替换为 `new_content` 来更新 `meta.md` 的内容。此工具可用于修改、增加甚至删除内容（将 `new_content` 设为空字符串）。
- **参数**:
  - `old_content`: 需要被替换的、完全匹配的旧内容（可为多行）。
  - `new_content`: 用于替换的新内容（可为多行）。
- **返回**: 一个确认对象。
  ```yaml
  status: success
  message: "Content updated successfully in meta.md."
  ```

#### `add_manual_section(library_name, toc, new_content)`
- **功能**: 在 `meta.md` 的指定章节（`toc`）末尾追加内容。如果章节不存在，则会创建新章节。
- **返回**: 一个确认对象。
  ```yaml
  status: success
  message: "Content added to section '## 内容模板' in meta.md."
  ```

### 4.2. `relation` 系列

#### `create_relations(library_name, relations)`
- **功能**: 在 `from` 实体的 Front Matter 中添加一条或多条关系。
- **返回**: 成功创建的关系列表。
  ```yaml
  created_relations:
    - { from: a, to: b, type: knows }
    - { from: c, to: d, type: parent of }
  ```

#### `delete_relations(library_name, relations)`
- **功能**: 从 `from` 实体的 Front Matter 中删除一条或多条关系。
- **返回**: 成功删除的关系列表。
  ```yaml
  deleted_relations:
    - { from: a, to: b, type: knows }
  ```

#### `find_relations(library_name, to_entity?, relation_type?)`
- **功能**: 根据“关系目标”或“关系类型”搜索关系。
- **返回**: 找到的关系列表。
  ```yaml
  found_relations:
    - { from: entity-a, to: entity-b, type: knows }
    - { from: entity-c, to: entity-b, type: knows }
  ```

### 4.3. `entity` 系列

#### `create_entity(library_name, entity_name)`
- **功能**: 在指定的知识库中创建一个新的实体（即一个 .md 文件）。
- **返回**: 一个确认对象。
  ```yaml
  status: success
  message: "entity new-entity created successfully in library test-library"
  ```

#### `list_entities(library_name, entity_glob)`
- **功能**: 基于 `glob` 模式列出实体。
- **返回**: 实体名称列表。
  ```yaml
  entities:
    - project-apollo
    - project-gemini
  ```

#### `add_entities(library_name, entities)`
- **功能**: 批量创建新实体。
- **返回**: 成功创建的实体名称列表。
  ```yaml
  created_entities:
    - new-entity-1
    - new-entity-2
  ```

#### `delete_entities(library_name, entity_names)`
- **功能**: 批量删除实体。
- **返回**: 成功删除的实体名称列表。
  ```yaml
  deleted_entities:
    - old-entity-1
    - old-entity-2
  ```

#### `read_entities(library_name, entity_names)`
- **功能**: 读取一个或多个实体的全部内容。
- **返回**: 多个文件的原始内容，以 `--- {filePath} ---` 分隔 (纯文本)。

#### `get_entities_toc(library_name, entity_names)`
- **功能**: 获取一个或多个实体的目录结构 (TOC)。
- **返回**: 每个实体的 TOC 列表。
  ```yaml
  - entity_name: entity-a
    toc:
      - frontmatter
      - "## Section 1"
      - "## Section 2"
  - entity_name: entity-b
    toc:
      - frontmatter
      - "## Overview"
  ```

#### `rename_entity(library_name, old_name, new_name)`
- **功能**: 对实体进行“深度重命名”，并修复所有入链。
- **返回**: 一个确认对象，说明附带影响。
  ```yaml
  status: success
  message: "Renamed 'old-name' to 'new-name'. 3 incoming relations were updated."
  ```

#### `merge_entities(library_name, source_names, target_name)`
- **功能**: 将多个源实体合并入一个目标实体。
- **返回**: 一个总结报告。
  ```yaml
  status: success
  target_entity: target-entity
  merged_sources:
    - source-1
    - source-2
  message: "Merged 2 entities into 'target-entity'. Content and relations have been consolidated."
  ```

#### `garbage_collect_relations(library_name, dry_run?)`
- **功能**: 查找并清理“断裂链接”。
- **返回 (dry_run: true)**: 报告将要清理的悬空关系。
  ```yaml
  dangling_relations_found:
    - in_entity: entity-a
      relation_to: non-existent-entity
      type: knows
  ```
- **返回 (dry_run: false)**: 报告清理结果。
  ```yaml
  status: success
  cleaned_relations_count: 1
  affected_entities:
    - entity-a
  ```

### 4.4. `search` 系列 (检索)

#### `search_in_names(library_name, entity_glob)`
- **功能**: 按名称 `glob` 模式检索实体。
- **返回**: 实体名称列表。
  ```yaml
  entities:
    - project-apollo
    - project-gemini
  ```

#### `search_in_contents(library_name, content_glob, entity_glob?)`
- **功能**: 在实体正文中进行 `glob` 模式匹配。
- **返回**: 匹配结果列表，包含上下文。
  ```yaml
  results:
    - entity_name: meeting-notes-2025-10-26
      file_path: /path/to/library/meeting-notes-2025-10-26.md
      matches:
        - line_number: 52
          matched_text: the new API endpoint is ready
          context:
            - "line 51: ..."
            - "line 52: ...the new API endpoint is ready..."
            - "line 53: ..."
  ```

#### `search_anywhere(library_name, pattern_glob, entity_glob?)`
- **功能**: 在文件名、元数据和正文中进行 `glob` 模式匹配。
- **返回**: 匹配结果列表，包含来源和上下文。
  ```yaml
  results:
    - entity_name: project-excalibur
      matches:
        - matched_in: frontmatter
          line_number: 5
          context: [ ... ]
        - matched_in: content
          line_number: 31
          context: [ ... ]
  ```