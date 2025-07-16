# mcp-server-memories-off

## 愿景

提供一个轻量级知识管理 MCP 服务，让你的 LLM 可以长期持续学习、输出、使用知识。

该服务希望帮助个人或小型项目从日常文本、对话、项目笔记等，结构化地提取和整合实体和其间的关系，让知识的捕捉与整理变得顺畅。进而，这个服务也许能协助你搭建个性化的知识助手，在沟通、管理、项目梳理、信息整合加工等方面，以「模仿你」的形式提供帮助。

其初始版本基于 [Anthropic 的 memory mcp](https://github.com/modelcontextprotocol/servers/blob/main/src/memory/README.md)。

## 特性目标

- **便携轻量，本地优先**：基于本地文件，不需要部署或使用大规模在线服务，不与任何模型、服务或架构绑定。
- **结构化知识**：通过 LLM 能力，将你丢给它的任何文本中的信息，转化为实体、关系、观察，构建个人知识图谱。
- **灵活检索**：支持通过实体名、类型、观察内容的关键词检索，让 LLM 获取长期记忆并在对话中直接使用。
- **数据可读性与备份**：原始数据保持可读，提供简单的备份功能。

目标不会包括：

- **大规模知识**：保持轻量级，适合个人或小型项目使用。
- **复杂关系**：不用把小工具整成 SQL。
- **在线服务**：不考虑联网，数据存储在本地文件中。
- **多用户协作**：不会考虑。
- **权限**：不会考虑。
- **多语言**：只考虑中文。

## 应用例子

### 个人使用场景

- **提取知识**：将文档、日常对话或大段聊天记录发给 LLM，自动提取关键知识点、人物、项目信息、协作关系、个人风格等，构建你的专属知识库。
- **个性化内容生成**：借助知识图谱，LLM 能更好地理解你的思考习惯和人际网络，有针对性地模仿你的表达，生成符合你个性风格的沟通、总结或项目文档。

### 项目使用场景

- **项目知识库**：小团队可用作项目级别的知识库，持续积累和管理知识，比如联合支付能力 MCP 服务，记录用户购物偏好、行为习惯等。
- **优化 Agent 服务质量**：让你的 Agent 记住更多历史数据与业务诉求，动态调整流程或输出，如记住并优化利用支付能力 MCP 服务推销时的有效策略，提高应用场景中的转化率与满意度。

## 已有工具

- **管理实体和关系**
  - upsert_entities(...entity): 创建或更新多个实体，保留原类型，添加观察内容
  - create_relations(...relation): 创建实体之间的关系
  - upsert_observations(entity_name, ...observation): 为已有的实体添加观察内容
  - delete_entities(...entity_name): 删除实体及其关联关系
  - delete_observations(entity_name, ...observation): 删除实体中的特定观察内容
  - delete_relations(...relation): 删除实体之间的关系

- **获取实体和关系信息**
  - open_nodes(...entity_name): 获取节点和其间关系

- **分类管理**
  - list_entity_types(): 列出所有实体类型和实体数量
  - list_relation_types(): 列出所有关系类型和关系数量

- **知识融合与整理**
  - rename_entity(entity_name, new_entity_name): 重命名实体
  - merge_entity_types(...entity_types, target_entity_type): 合并实体类型
  - merge_relation_types(...relation_types, target_relation_type): 合并关系类型
  - merge_entities: 合并实体

- **检索图谱**
  - read_graph(): 获取整个知识图谱
  - search_nodes_anywhere(keywords): 根据查询字符串搜索各种节点（支持实体名、类型、观察内容等，空格为 or）
  - search_nodes_smart(queryRegex): 简化的搜索接口。对名称命中的节点返回全文；对其余部分命中的节点返回较少信息(entity_name, entity_type, where_contains_keyword)，避免 token 浪费
  - read_subgraph(...entity_name, max_depth): 获取包含指定实体节点的子图，返回实体和关系
  - has_entities(...entity_name): 检查实体是否存在 


- **备份和图谱管理**
  - backup_graph(): 备份整个知识图谱
  - read_graph_manual(): 读取知识图谱的所有使用说明
  - put_graph_manual(name, description, ...target): 添加或替换一条使用说明
  - remove_graph_manual(name): 删除一条使用说明

## Todolist

- **管理实体和关系**
  - [ ] create_relations -> upsert_relations: 创建或更新关系，同时让关系具备多个谓词

- **获取实体和关系信息**

- **知识融合与整理**
  - [ ] 中 - list_orphan_entities: 支持列出零散（无关系）的实体

- **检索图谱**
  - [ ] 高 - read_subgraph_names: 获取以某些节点为中心的子知识图谱，仅返回（中心节点全部信息、关系、关联节点名称和类型），避免 token 浪费
  - [ ] 本地的向量搜索，使用 sqlite_vec 等轻量级 embedding 和搜索解决方案

- **备份**
  - [ ] MEM_EDIT_LOG_DIR: 完整的变更审计日志，用于回溯历史或回滚到某个状态

- **时间线记忆**
  - [ ] 低 - 支持实体、关系、观察的“创建时间”概念
  - [ ] 低 - 支持实体、关系、观察的“有效期”概念
  - [ ] 低 - 支持实体、关系、观察的“深刻度”和“被用于做什么”的概念

- **配置**
  - [ ] 支持声明多个配置文件，用于多领域知识整理
  - [ ] 支持自定义工具集介绍，便于多领域知识联动或用于 a2a 场景

## 配置例子

该 package 已经发布在 [npmjs](https://www.npmjs.com/package/mcp-server-memories-off) , 可以在任何支持 mcp 协议的 LLM 客户端中配置：

**命令行：**

`npx -y mcp-server-memories-off`

**环境变量：**

| 环境变量      | 说明                         | 默认值                             |
|---------------|------------------------------|---------------------------------|
| MEM_NAME      | 工具名称                     | memory                          |
| MEM_PATH      | 知识图谱存储文件路径         | $HOME/mcp-server-memories-off.yaml |
| MEM_LOG_DIR   | 日志文件目录                 | 系统临时目录（如 \tmp\）                 |

## 如何构建

构建：

`bun run build`

运行：

`node ..../dist/index.js`
