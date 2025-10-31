# 重构日志

本文档记录 Shell-Native 架构重构的完成步骤。

- **2025-10-26**: [**v1/v2 代码结构初始化**] - 创建了 `src/v1` 和 `src/v2` 目录。将现有代码归档至 `src/v1`，并创建了新的 `src/index.ts` 作为版本路由器，为 v2 的增量重构做好了准备。`package.json` 中的构建和执行路径已确认无误。
- **2025-10-26**: [**实现版本路由**] - 将 `utils.ts` 提取为共享模块。在 `src/index.ts` 中增加了版本选择逻辑，可通过环境变量 `MEM_VERSION=2` 启动一个空的 v2 服务器，否则默认启动 v1。
- **2025-10-27**: [**实现 v2 `manual` 工具集**] - 添加了 `shelljs` 和 `yargs` 依赖。创建了 `v2/runtime.ts` 用于解析命令行参数，`v2/shell.ts` 用于封装文件操作。实现了 `read_manual` 和 `update_manual_section` 工具，并将其集成到 v2 服务器。在经历了多次调试后，最终确认 MCP 的 `list_tools` 方法应为 `tools/list`，并成功验证了 v1 和 v2 服务。
- **2025-10-30**: [**完善 `manual` 工具集并引入 `file` 工具集**] - 实现了 `addManualSection` 和一个更通用的 `editManualSection`（取代了原设计的 `update` 和 `delete`）。引入了基础的 `createFile` 工具。同时，将 `test` 目录迁移至 `src` 下，并编写了完整的 E2E 测试验证 `manual` 工具的功能。
- **2025-10-30**: [**实现 `entity` 基础工具集**] - 实现了 `createEntity`, `addEntities`, `deleteEntities`, `readEntities`, `listEntities`, `getEntitiesToc`, `renameEntity` 等核心工具。完成了对 `entity` 工具集的现状分析，明确了后续需要开发的高级功能（如内容编辑、合并、垃圾回收等）。
- **2025-10-30**: [**完成 `entity` 高级工具集**] - 实现了 `readEntitiesSections`, `addEntityContent`, `deleteEntityContent`, `replaceEntitySection`, `mergeEntities`, `garbageCollectRelations` 等所有高级工具。重构了 `shell.ts`，引入了 `readFrontMatter` 和 `writeFrontMatter` 辅助函数，极大地简化了元数据处理逻辑。至此，`entity` 工具集已全部完成。
- **2025-10-31**: [**实现 `relation` 工具集**] - 实现了 `create_relations` 和 `delete_relations` 工具，用于在实体的 Front Matter 中添加和删除关系。更新了 `docs/refactored-design.md` 以反映新的基于行的 Front Matter 格式，并为新工具编写了完整的 E2E 测试。