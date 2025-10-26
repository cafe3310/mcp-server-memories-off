# 重构日志

本文档记录 Shell-Native 架构重构的完成步骤。

- **2025-10-26**: [**v1/v2 代码结构初始化**] - 创建了 `src/v1` 和 `src/v2` 目录。将现有代码归档至 `src/v1`，并创建了新的 `src/index.ts` 作为版本路由器，为 v2 的增量重构做好了准备。`package.json` 中的构建和执行路径已确认无误。
- **2025-10-26**: [**实现版本路由**] - 将 `utils.ts` 提取为共享模块。在 `src/index.ts` 中增加了版本选择逻辑，可通过环境变量 `MEM_VERSION=2` 启动一个空的 v2 服务器，否则默认启动 v1。
- **2025-10-27**: [**实现 v2 `manual` 工具集**] - 添加了 `shelljs` 和 `yargs` 依赖。创建了 `v2/runtime.ts` 用于解析命令行参数，`v2/shell.ts` 用于封装文件操作。实现了 `read_manual` 和 `update_manual_section` 工具，并将其集成到 v2 服务器。在经历了多次调试后，最终确认 MCP 的 `list_tools` 方法应为 `tools/list`，并成功验证了 v1 和 v2 服务。