# mcp-server-memories-off

## 典型用例

```plain

Prompt: 用各种不同话题和我聊天，了解我的工作、组织、团队等各种知识，更新关于我的工作知识图谱。
        讨论期间，你要从 memory tool 获取已有信息，和我互动。在了解我的信息时，搜索「我」而不是「你」这种代称。
        多搜索宽泛简短的关键词。重点识别挖掘和我相关的各种人、项目、团队等信息，也要关联已有的实体之间的联系。
        将新发现的知识通过 memory tool 记录下来。
        除了上述要求，如果我发给你聊天记录，将我（四盘）的对话风格，记录在「语气」类别的知识实体中，并选择一些我说的话，一字不差记录在「对话记录」类型的知识实体中。未来我需要你模仿我的语气。

User: (一大堆零散钉钉聊天记录)
      上面是我的一个问题排查记录。了解我的语气，帮我简单整理一下异常排查过程，让后面被拉来的人能快速搞清现状。
      另外，你觉得是否需要让更多负责人协助排查？选谁？

LLM:  异常排查过程简要整理如下，便于后续同学快速了解现状：
      问题影响：部分用户在 xxxx 无响应，xxxxx 未渲染。问题发生时间为 2025 年 xxx 左右，首次由 xxx 在上午 xxx 提出。
      日志分析：技术日志显示 xxxxx 成功更新，但用户侧行为日志表明多次 xxxxxx。
      排查定位：xxxxx 为 native 实现，异常出现在 xxxxxxx。通过日志已确认，xxxxxxx。
      团队协作：当前 xxx 负责主线排查，已同步 xxxxx 等相关同事协助分析原因，正在持续跟进。
      目前，继续由 xxx 主线跟进是合适的。团队内分工明确，排查涉及 xxxx、xxx 和 xxxxx 等多环节，大家各司其职。
      如果短时间内没有新的突破，建议你推动引入熟悉 xxxxxx 机制或客户端 xxxxxx 的专家进行协助，避免陷入惯性思路。
      你的关注点和推进风格可以帮助团队及时发现潜在盲区并优化排查路径。

User: 搜索我的对话记录，用我的风格，帮我在群里回复一句话。

LLM:  你们先查着 看样子和 xxxxx 没关系 要么是前端 xxxx 卡了 要么 xxx 还有啥没兜住 我再拉个人看看

User: 你小子学挺像 

LLM:  认了 这活我还能干
```

## 愿景

提供一个轻量级知识管理 MCP 服务，让你的 LLM 可以长期持续学习、输出、使用知识。

该服务希望帮助个人或小型项目从日常文本、对话、项目笔记等，结构化地提取和整合实体和其间的关系，让知识的捕捉与整理变得顺畅。进而，这个服务也许能协助你搭建个性化的知识助手，在沟通、管理、项目梳理、信息整合加工等方面，以「模仿你」的形式提供帮助。

初始版本基于 Anthropic 的 memory-mcp 迭代，如果有想法和需求，可以提出 issue 或提交 merge request。

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
  - upsert_entities(...entity): 创建多个实体
  - create_relations(...relation): 创建实体之间的关系
  - upsert_observations(entity_name, ...observation): 为已有的实体添加新的观察内容
  - delete_entities(...entity_name): 删除实体
  - delete_observations(entity_name, ...observation): 删除实体中的特定观察内容
  - delete_relations(...relation): 删除实体之间的关系

- **获取实体和关系信息**
  - open_nodes(...entity_name): 获取节点和其间关系

- **分类管理**
  - list_entity_types(): 列出所有实体类型

- **知识融合与整理**
  - merge_entity_types(...entity_types, target_entity_type): 合并实体类型

- **检索图谱**
  - read_graph(): 获取整个知识图谱
  - search_nodes(keywords): 根据查询字符串搜索各种节点
  - read_subgraph(...entity_name, max_depth): 获取以某节点为中心的子知识图谱

- **备份**
  - backup_graph(): 备份整个知识图谱

## Todolist

- **管理实体和关系**
  - [x] create_entities -> upsert_entities: 创建或更新实体
  - [ ] create_relations -> upsert_relations: 创建或更新关系，同时让关系具备多个谓词
  - [x] add_observations -> upsert_observations: 创建或更新观察内容
  - [ ] rename_entities: 重命名实体

- **获取实体和关系信息**
  - [ ] has_entities: 检查实体是否存在

- **分类管理**
  - [ ] add_important_types: 标记实体类型是「关键的」，创建 {type: --meta-important-type , name: type_name , observation: [] } 的实体用于记忆它们
  - [ ] list_important_types: 列出所有关键的实体类型
  - [ ] remove_important_types: 标记实体类型不是「关键的」

- **知识融合与整理**
  - [x] list_entity_types: 列出所有实体类型
  - [x] merge_entity_types: 合并实体类型
  - [ ] list_all_relation_types: 列出所有关系类型
  - [ ] merge_relation_types: 合并关系类型
  - [ ] list_most_entity_types: 列出最多的实体类型
  - [ ] list_most_relation_types: 列出最多的关系类型
  - [ ] list_orphan_entities: 支持列出零散（无关系）的实体
  - [ ] merge_entities: 合并实体

- **检索图谱**
  - [x] 通过逗号或空格分词搜索
  - [x] read_subgraph：获取以某节点为中心的子知识图
  - [x] 给 read_subgraph 增加搜索深度限制以避免过大图谱
  - [ ] read_subgraph_names: 获取以某些节点为中心的子知识图谱，仅返回节点名称和关系
  - [ ] 给 search_nodes 添加搜索特定字段的功能: entity_names, entity_types, entity_tags, entity_observations, entity_everything, relation_types, relation_entities, relation_everything, everything
  - [ ] 本地的向量搜索，使用 sqlite_vec 等轻量级 embedding 和搜索解决方案

- **备份**
  - [x] backup_graph: 备份整个图
  - [ ] MEM_EDIT_LOG_DIR: 完整的变更审计日志，用于回溯历史或回滚到某个状态

- **时间线相关**
  - [ ] 给所有记录添加日期
  - [ ] 给 get_entities, search_entities 等「信息获取」类工具的返回值中添加当前日期

- **配置**
  - [x] 支持自定义知识图谱存储路径
  - [ ] 支持自定义工具集介绍，便于多领域知识联动或用于 a2a 场景

- **辅助模型工作**
  - [x] 接口返回格式从 json 切换为更省 token（钱）的 yaml
  - [ ] 提供 prompt 资源，提示工具使用的注意事项

## 配置例子

构建：

`bun run build`

运行：

`node ..../dist/index.js`

环境变量：

| 环境变量      | 说明                         | 默认值                             |
|---------------|------------------------------|---------------------------------|
| MEM_NAME      | 工具名称                     | memory                          |
| MEM_PATH      | 知识图谱存储文件路径         | $HOME/mcp-server-memories-off.yaml |
| MEM_LOG_DIR   | 日志文件目录                 | 系统临时目录（如 \tmp\）                 |
