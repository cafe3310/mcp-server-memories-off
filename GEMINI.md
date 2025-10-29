# 项目章程: mcp-server-memories-off

本文档是 `mcp-server-memories-off` 项目的章程，用于定义项目目标、协作流程、设计规范和技术架构。

---

### 第一部分：元信息

- **文档结构**: 本文档 (`GEMINI.md`) 分为四个核心部分：
    1.  **元信息**: 解释本文档的结构。
    2.  **协作流程和规范**: 定义项目的开发、测试、部署和代码风格等规范。
    3.  **项目整体设计**: 概述项目的目标、原则、技术栈和架构。
    4.  **项目详细设计**: 对主要功能模块进行分解说明。

---

### 第二部分：协作流程和规范

- **测试流程**:
    - 当前项目缺少自动化的单元或集成测试脚本。
    - **规范**: 未来所有新功能或 Bug 修复都应伴随相应的测试。可使用 `bun test` 作为测试执行器。测试文件应与源代码文件放在一起，并以 `.test.ts` 或 `.spec.ts` 结尾。

    - **构建与运行验证**:
        - 在进行了可能影响启动或核心功能的修改后，必须执行以下手动验证流程：
        1.  **构建**: 运行 `bun run build`，确保编译过程无错误。
        2.  **启动**: 在后台运行服务 `bun ./dist/index.js &`。
        3.  **观察**: 等待几秒钟，确认服务没有因启动错误而立即崩溃。
        4.  **清理**: 使用 `pkill -f 'bun ./dist/index.js'` 终止服务进程，确保没有残留进程。

    - **自然语言测试用例**:
        - **规范**: 对于每个被验证的功能或修复，都必须创建一个对应的自然语言测试用例。
        - **位置**: 所有测试用例都存储在 `docs/verify/` 目录下。
        - **格式**: 每个用例是一个独立的 `.md` 文件，文件名以 `YYYY-MM-DD-HH-mm-用例简述.md` 的格式命名。
        - **目的**: 这些文档共同构成了一套回归测试集，确保未来的变更不会破坏现有功能。

    - **端到端测试 (E2E Testing)**:
        - **目的**: 验证在真实运行的服务器上，通过 MCP 协议调用工具能否正确地完成一个完整的工作流，并对真实文件系统（在临时目录中）产生预期的效果。
        - **位置**: E2E 测试脚本位于 `test/e2e-*.test.ts`。
        - **策略**:
            1.  **环境准备**: 在 `beforeAll` 钩子中，测试脚本首先会清空并创建一个被 `.gitignore` 忽略的临时目录（例如 `test/tmp/`）。然后，将一个基准测试库（例如 `test/test-library`）完整地复制到该临时目录中。
            2.  **服务启动**: 脚本会启动一个真实的 v2 服务器子进程，并将其 `MEM_LIBRARIES` 环境变量指向上述创建的临时测试库。
            3.  **执行与验证**: 脚本通过 stdio 发送 JSON-RPC 请求来调用一系列工具（例如 `addManualSection`, `editManual`），并断言服务器的返回结果以及临时库中文件的最终状态是否符合预期。
            4.  **环境清理**: 在 `afterAll` 钩子中，脚本会负责终止服务器子进程，并删除整个临时目录。

- **部署流程**:
    - **构建**: 运行 `bun run build` 命令，使用 Bun 将 `src` 目录下的 TypeScript 源码编译并打包到 `dist/index.js`。
    - **本地运行**: 直接通过 `node dist/index.js` 运行服务。
    - **NPM 发布**: 项目已发布到 NPM。更新版本后，通过 `npm version patch && tnpm publish` (或 `npm publish`) 来发布新版本。
    - **全局使用**: 用户可以通过 `npx -y mcp-server-memories-off` 直接运行，并通过环境变量进行配置。

- **异常处理流程**:
    - 应用在关键逻辑（如文件操作、参数解析）中使用 `try...catch` 块捕获错误。
    - 使用 `src/utils.ts` 中的 `checks` 和 `checkObjHas` 函数进行前置条件断言，确保在不满足条件时能快速失败并抛出明确的异常。
    - 所有错误都通过 `logfileE` 函数记录到日志文件中。

- **代码生成规范**:
    - **语言**: 使用 TypeScript。
    - **风格**: 遵循 `eslint.config.mjs` 中定义的 ESLint 规则。代码风格应保持一致。
    - **注释**: 优先编写自解释的代码。对于复杂的业务逻辑，应添加 JSDoc 注释来解释其目的和行为。

- **分支与提交规范**:
    - **分支**:
        - `main`: 主分支，始终保持稳定和可发布状态。
        - `develop`: 开发主分支，集成所有已完成的功能。
        - `feature/<name>`: 功能开发分支，从 `develop` 创建。
        - `fix/<name>`: Bug 修复分支，从 `develop` 或 `main` 创建。
    - **提交**: 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范，例如 `feat: Add subgraph reading feature` 或 `fix: Correct entity merging logic`。

---

### 第三部分：项目整体设计

- **项目目标**:
    - 提供一个轻量级、本地优先的知识管理 MCP (Model Context Protocol) 服务，使 LLM 能够进行长期知识的持续学习、整合和使用。
    - 核心功能是将非结构化文本（如对话、笔记）转化为结构化的知识图谱（实体、关系、观察），并提供灵活的检索能力。

- **核心原则**:
    - **便携轻量**: 基于本地文件，无外部服务依赖。
    - **本地优先**: 数据存储在本地，不联网。
    - **结构化知识**: 将信息整理为知识图谱。
    - **灵活检索**: 支持多种方式查询图谱。
    - **数据可读性**: 知识图谱以人类可读的 YAML 格式存储。

- **技术栈与架构**:
    - **运行时**: Node.js
    - **构建工具**: Bun
    - **语言**: TypeScript
    - **核心框架**: `@modelcontextprotocol/sdk` 用于实现 MCP 服务。
    - **数据处理**: `yaml` 用于序列化/反序列化知识图谱，`zod` 和 `zod-to-json-schema` 用于工具的输入验证和模式生成。
    - **架构**:
        - 一个通过标准输入/输出（Stdio）与 LLM 客户端通信的命令行服务。
        - 核心是 `GraphManager` 类，它封装了所有对知识图谱文件的读写和逻辑操作。
        - `tool-def.ts` 文件定义了所有可供 LLM 调用的工具及其输入/输出模式。

- **项目结构**:
    - `src/index.ts`: 应用主入口，负责服务启动和配置。
    - `src/create-server.ts`: 创建和配置 MCP 服务器实例。
    - `src/graph-manager.ts`: 核心业务逻辑，管理知识图谱的增删改查。
    - `src/tool-def.ts`: 定义所有 LLM 可用的工具及其 schema。
    - `src/typings.ts`: 定义核心数据类型（如 `Entity`, `Relation`）。
    - `src/utils.ts`: 通用辅助函数。
    - `$HOME/mcp-server-memories-off.yaml`: 默认的知识图谱存储文件。

---

### 第四部分：项目详细设计

- **工具集设计**:
    - 项目的核心功能通过一套工具集暴露给 LLM。每个工具的详细设计（包括其功能描述、输入参数和数据结构）均在 `src/tool-def.ts` 文件中通过 `zod` schema 和 `description` 字段进行了精确定义。
    - 这些定义是“活文档”，直接驱动着工具的输入验证和 MCP 的工具列表功能，因此是理解各功能细节的最佳参考。

- **知识图谱设计**:
    - **实体 (Entity)**: 包含 `name`, `entityType`, `observations`。是知识的基本单元。
    - **关系 (Relation)**: 包含 `from`, `to`, `relationType`。用于连接两个实体。
    - **使用说明 (Manual)**: 包含 `name`, `description`, `targets`。用于存储图谱的元信息或使用指南。
    - 存储格式为 YAML 数组，每个元素是一个实体、关系或使用说明。

---

### 第五部分：当前重大任务

- **任务**: Shell-Native 架构重构
- **状态**: <span style="color:orange;">进行中</span>
- **目标**: 按照 `docs/refactored-design.md` 的蓝图，将项目重构为基于文件目录的存储和基于 Shell 命令的交互方式。
- **进度记录**: 所有完成的重构步骤将被记录在 `docs/refactored-log.md` 文件中。
