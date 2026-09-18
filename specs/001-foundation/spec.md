# Feature Specification: 项目骨架 (Foundation)

**Feature Branch**: `001-foundation`

**Created**: 2026-09-17

**Status**: Done

> Archived 2026-09-18 (revised): the Foundation slice is functionally
> complete. On-disk evidence collected during archive:
>
> - CI green on `macos-latest` + `windows-latest` (scratch PR #1, run
>   35319806954 — 4 jobs passed). Validates T035 (Tauri build smoke
>   via CI), T046a/b/c (`cargo test` discovers 8 unit tests across
>   error/paths/db/commands including the preference round-trip), T054
>   (CI workflow runs both runners), T060 (`cargo clippy -D warnings`
>   passes locally), T024/T030/T038/T046/T046j (design-taste-frontend
>   review summaries embedded in commit bodies — verified via
>   `git log --grep`).
> - Frontend test suite: 30 tests passing across 8 files (was 21/5 at
>   archive time). Added in commit `26a27fd`: `CorruptedView.test.tsx`
>   (S3), `Settings.test.tsx` (S2), `IpcErrorRender.test.tsx` (S4) —
>   these three files were missing on disk despite being listed in
>   `quickstart.md` step 2.
> - Dev-time filesystem side effects: `scripts/dev-smoke.sh` (wired as
>   `pnpm dev:smoke`, commit `8248156`) launches `pnpm tauri dev`,
>   waits for `http://localhost:1420`, then verifies the SQLite file
>   lands at `~/Library/Application Support/com.huyikai.solo-task/tasks.db`
>   with the expected 7-table schema. This is the only signal that
>   T021 / FR-001 fires on first launch; jsdom cannot observe it.
>   End-to-end run on the local machine: devUrl reachable, 4096-byte
>   DB file written, all seven tables present.
>
> `tasks.md` checkbox grid is retained **unmodified** as a historical
> record. No remaining gaps.
>
> Note for follow-up specs: the pre-push hook had two latent bugs that
> bypassed TDD enforcement on new-branch pushes (dead-code typo and a
> `rev-list --not --all` under-include). Both fixed in commit `245c122`.
> Subsequent spec work (003+) can rely on the hook for genuine TDD
> enforcement.

**Input**: User description: "项目骨架 (Foundation) — 第一次把项目骨架搭起来,把 constitution v1.4.0 中所有 '应用启动 / 项目启动时' 应具备的基础设施一次性落地"

**Design Reference**: `.specify/memory/design.md` (项目级,Constitution Principle X;所有 UI spec 共享)

**Constitution Reference**: `.specify/memory/constitution.md` v1.4.0
(Principles III, V, VI, VII, VIII, IX; Quality Gates; MVP Done Checklist)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — 启动应用并看到主窗口骨架 (Priority: P1)

第一次启动 Solo Task 时,数据库文件不存在,应用应在主窗口展示一个"骨架界面"——三个标签页(list / board / gantt)的占位内容,让用户确认应用成功启动且基本框架可用。

**Why this priority**: 没有可启动的应用,后续所有功能都没有承载基础。骨架是把 Constitution v1.3.0 的"启动时该有的基础设施"一次性落地,本身就是 MVP 的第一个交付。

**Independent Test**: 删除本地数据库文件,启动应用。验证:(a) 应用在 2 秒内出现主窗口;(b) 顶部有三个视图切换 tab;(c) 当前显示一个占位界面(暂称 "Hello Solo Task");(d) 切换 tab 后视图标识改变,内容仍为占位;(e) 关闭应用后,本地已生成数据库文件,且包含空表结构。

**Acceptance Scenarios**:

1. **Given** 本地数据库文件不存在, **When** 用户首次启动应用, **Then** 主窗口在 2 秒内显示,数据库文件被自动创建并包含空 schema
2. **Given** 应用已启动且显示 list 视图, **When** 用户点击 board 标签, **Then** 当前视图切换为 board 标识,且 list 标签变为非激活态
3. **Given** 应用已启动且显示 board 视图, **When** 用户点击 gantt 标签, **Then** 当前视图切换为 gantt 标识
4. **Given** 应用已启动, **When** 用户切换到任意视图, **Then** 内容区显示占位提示文本(由 i18n key 渲染,初版为中文)

---

### User Story 2 — 打开设置页面 (Priority: P1)

用户想查看或调整应用设置。骨架阶段,Settings 页面提供两个按钮占位:"检查更新" 和 "清除所有数据",用于验证入口可达和错误处理骨架就位。

**Why this priority**: Settings 是 Principle VIII(JSON 导出逃生通道)和 Principle VII.1(DB 损坏恢复 UI)的承载入口,没有它,后续所有需要用户确认的操作没有出口。

**Independent Test**: 从主窗口进入 Settings 页面(通过菜单或快捷键)。验证:(a) 页面成功打开;(b) 两个按钮可见且可点击(无业务逻辑,但 UI 反馈正常);(c) "清除所有数据" 按钮点击后弹出二次确认对话框,确认后给出反馈(此阶段可只弹 toast,不真正清库)。

**Acceptance Scenarios**:

1. **Given** 应用已启动, **When** 用户通过入口打开 Settings 页面, **Then** 页面成功显示
2. **Given** Settings 页面已打开, **When** 用户点击 "检查更新" 按钮, **Then** 按钮出现 loading 状态,1 秒内显示结果占位(此阶段为 stub,不实际联网;后续 spec 接入真实 check-for-update)
3. **Given** Settings 页面已打开, **When** 用户点击 "清除所有数据" 按钮, **Then** 弹出二次确认对话框,要求用户输入确认文字
4. **Given** 二次确认对话框已弹出, **When** 用户输入正确文字并确认, **Then** 对话框关闭并显示完成提示(此阶段为 stub;后续 spec 接入真实清库逻辑)

---

### User Story 3 — 损坏数据库时安全降级 (Priority: P1)

数据库文件存在但已损坏(模拟场景:磁盘故障、手动破坏)。用户启动应用时,不应静默清空数据库或崩溃,而应明确告知用户数据可能丢失,并提供"导出"按钮让用户抢救可读数据。

**Why this priority**: Principle VII.1 (DB corruption is detected, not silently recreated) 是 NON-NEGOTIABLE,违反它意味着用户数据无声丢失。这条 user story 把该原则从文档落实到可观察行为。

**Independent Test**: 应用首次启动后关闭,然后手动修改数据库文件(写入非 SQLite 字节),再次启动应用。验证:(a) 应用不崩溃;(b) 主窗口显示明确的损坏提示(由 i18n key 渲染);(c) 提示旁有"导出为 JSON" 按钮;(d) 点击按钮可触发导出流程(此阶段可只导出空列表 + 损坏报告;后续 spec 接入完整导出)。

**Acceptance Scenarios**:

1. **Given** 本地数据库文件存在但损坏, **When** 用户启动应用, **Then** 主窗口显示损坏提示(明确告知数据库损坏、不静默清空)
2. **Given** 损坏提示已显示, **When** 用户点击 "导出为 JSON" 按钮, **Then** 弹出原生保存对话框,默认文件名带时间戳
3. **Given** 保存对话框已弹出, **When** 用户选择路径并确认, **Then** 系统在选定路径写入 JSON 文件(此阶段内容为占位结构 `{ "schema_version": 1, "exported_at": "<iso>", "tasks": [], "subtasks": [], "tags": [], "reminders": [], "warnings": ["database_corrupted"] }`,后续 spec 补完整内容)
4. **Given** 损坏数据库已识别, **When** 用户在未导出情况下尝试进入 Settings, **Then** "清除所有数据" 按钮变为可用,允许用户主动放弃数据(仍需二次确认)

---

### User Story 4 — IPC 错误结构化呈现 (Priority: P2)

用户在 UI 触发任何会调用 Rust 端的操作(如未来 spec 中的"保存任务"),如果 Rust 端返回错误,UI 必须根据错误类型显示具体反馈,而非笼统的"出错了"或暴露内部堆栈。

**Why this priority**: Principle VII.3 (IPC errors are structured, not stringified) 是 NON-NEGOTIABLE,这条 user story 通过可观察的 UI 反馈验证 IPC 错误映射正确。

**Independent Test**: 在前端触发一个会返回错误的 IPC 调用(骨架阶段可注入一个调试用的"返回 DbLocked 错误"按钮)。验证:(a) UI 显示具体的错误类型提示(由 i18n key 渲染);(b) 错误提示不包含 Rust 内部堆栈或 panic 信息;(c) 错误类型与 Rust 端 `AppError::DbLocked` 一一对应。

**Acceptance Scenarios**:

1. **Given** 应用已启动且前端有触发 IPC 错误的能力(此阶段可由 Settings 里的"测试错误"按钮注入), **When** Rust 端返回 `AppError::DbLocked`, **Then** UI 显示 "数据库被锁定" 类提示
2. **Given** 应用已启动, **When** Rust 端返回 `AppError::DbCorrupted`, **Then** UI 显示 "数据库损坏" 类提示
3. **Given** 应用已启动, **When** Rust 端返回 `AppError::PermissionDenied`, **Then** UI 显示 "权限不足" 类提示
4. **Given** 应用已启动, **When** Rust 端返回 `AppError::Unknown`, **Then** UI 显示通用 "操作失败,请稍后重试" 提示,不暴露内部堆栈

---

### User Story 5 — 全局 i18n 入口可见 (Priority: P2)

骨架阶段所有用户可见的字符串(视图标签、Settings 按钮、损坏提示等)都通过 i18n lookup 函数渲染,便于后续添加英文时只需补字典。

**Why this priority**: Constitution v1.3.0 I18n 立场要求"所有用户可见字符串用 t('key') 包装",违反这条会在后续添加英文时导致大规模重写。

**Independent Test**: 启动应用,审视所有可见字符串。验证:(a) 没有硬编码的中文字符串直接出现在组件源码中(允许在字典文件 `zh-CN.ts` 中);(b) 字典文件存在且至少覆盖骨架所需的所有 key;(c) lookup 函数对未注册的 key 有明确降级行为(显示 key 字符串 + 警告,便于发现缺失翻译)。

**Acceptance Scenarios**:

1. **Given** 应用首次启动, **When** 审视所有用户可见字符串, **Then** 字符串均来自 i18n 字典,组件源码中无硬编码中文
2. **Given** 字典文件缺失某个 key, **When** lookup 函数被调用, **Then** UI 显示 key 字符串(如 `t('missing.key')`),且开发模式日志输出警告
3. **Given** 应用已启动, **When** 切换界面语言字典文件(如未来切换到 `en-US.ts`), **Then** 现有 UI 立即更新显示(此阶段不要求语言切换 UI,只需架构支持)

---

### User Story 6 — 启动时呈现经过设计的视觉 (Priority: P0) 🎯 MVP 的一部分

应用骨架的视觉表现必须符合 `.specify/memory/design.md` 中定义的设计语言,不能掉进常见 AI 默认风格。

**Why this priority**: Constitution Principle IX (Design Quality) 是 NON-NEGOTIABLE。如果骨架阶段的视觉就掉进 anti-pattern,后续所有功能都会继承这种"AI 默认感",个人工具每天使用会变成负担。设计必须在 spec 阶段产出指引,在 implement 阶段落地,在评审阶段验证。

**Independent Test**: 应用启动后,人工对照 `.specify/memory/design.md` Section 2 的 anti-pattern 清单(33 条)逐条审查。**任何一条不通过** = 此 spec 不达标。

**Acceptance Scenarios**:

1. **Given** 应用首次启动, **When** 审视主窗口视觉, **Then** 符合 `.specify/memory/design.md` Section 6 中所有组件的视觉描述(Button / Card / Layout / ViewTabs / CorruptedView / Settings) + Section 1 的 token
2. **Given** `.specify/memory/design.md` Section 2 anti-pattern 清单存在, **When** 在主窗口逐条对照, **Then** 33 条全部 ✅, 0 条 ❌
3. **Given** 应用处于 light mode, **When** 切换系统为 dark mode, **Then** 应用自动跟随, 视觉层次保持一致(无对比度崩塌)
4. **Given** 应用启动完成, **When** 与 `.specify/memory/design.md` Section 6.1 Button 矩阵对照实际渲染, **Then** 每个 variant × size 组合都符合视觉描述(primary 蓝填充、secondary 白底边、ghost 透明、danger 红)
5. **Given** 应用处于默认主题(跟随系统), **When** 用户打开 Settings 切换到"暗色", **Then** 应用立即变为 dark theme,设置被持久化到 DB(关闭再打开应用仍是暗色)
6. **Given** 用户已选择"暗色", **When** 切到"亮色"再切回"跟随系统", **Then** 应用跟随当前系统设置,DB 中存储为 "system"

---

### Edge Cases

- **数据库被另一进程锁定**: 启动时若 `PRAGMA integrity_check` 因锁失败,UI 显示 `AppError::DbLocked` 提示,而不是崩溃或重试无限循环
- **用户首次启动且磁盘空间耗尽导致 DB 创建失败**: 启动时检测,UI 显示明确错误,提供"重试"按钮(此阶段为占位)
- **用户在损坏提示页面直接关闭应用**: 不触发任何写操作(不尝试修复),保留损坏的 DB 文件供后续排查
- **i18n lookup 在 React 组件外部被调用**(如 Rust 端日志): Rust 端不需要 i18n,所有用户可见提示必须由前端基于 `AppError` variant 渲染,Rust 端不直接生成用户可见字符串
- **应用在 Settings 二次确认对话框打开时被强制退出**: 下次启动不残留确认状态(确认状态不持久化)

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 应用 MUST 能在用户首次启动时自动创建本地 SQLite 数据库文件,并执行初始 migration(空表结构)。
- **FR-002**: 应用 MUST 在启动时执行数据库完整性检查(`PRAGMA integrity_check`)。检查通过则正常启动;不通过则显示损坏提示界面,提供"导出为 JSON" 按钮,绝不静默删除或重建数据库。
- **FR-003**: 应用 MUST 在主窗口提供三个视图切换入口(list / board / gantt),点击后切换当前激活视图。当前阶段内容为占位提示文本。
- **FR-004**: 应用 MUST 提供 Settings 入口,入口打开后显示至少两个按钮:"检查更新"(stub) 和 "清除所有数据"(stub + 二次确认对话框)。
- **FR-005**: 应用的 "清除所有数据" 按钮 MUST 在二次确认对话框中要求用户输入指定确认文字,确认后才执行(此阶段执行内容为 stub 反馈,后续 spec 接入真实清库)。
- **FR-006**: 应用 MUST 通过 Tauri IPC 在 Rust 端与前端通信,所有 IPC 命令的返回值类型 MUST 为 `Result<T, AppError>`,其中 `AppError` 至少包含以下 variant:`DbLocked`, `DbCorrupted`, `TaskNotFound`, `PermissionDenied`, `IoError`, `Unknown`。
- **FR-007**: 前端 MUST 根据 `AppError` variant 渲染对应的本地化错误提示,不允许直接显示 Rust 错误字符串或内部堆栈。
- **FR-008**: 应用 MUST 提供 i18n lookup 函数(`t(key: string)`),所有用户可见字符串 MUST 通过该函数从字典文件渲染。组件源码中 MUST 不出现硬编码中文。字典文件初版至少包含骨架所需的所有 key 的中文翻译。
- **FR-009**: 数据库写入操作(初版仅限于 migration 写入) MUST 在 SQLite 事务中执行,失败时事务回滚,数据库不进入半写入状态。
- **FR-010**: 应用 MUST 提供一个"导出为 JSON" 入口(初版仅在损坏提示界面可用,后续 spec 在 Settings 暴露)。导出的 JSON 文件初版结构包含 `schema_version`、`exported_at`、`tasks`、`subtasks`、`tags`、`reminders`、`warnings` 字段。
- **FR-011**: 应用 MUST 包含 GitHub Actions CI workflow(`.github/workflows/ci.yml`),在 macOS-latest 和 windows-latest runner 上运行 `cargo check`、`cargo test`、`pnpm install --frozen-lockfile` + `pnpm exec tsc --noEmit`、`pnpm test`、以及 `pnpm run check:i18n`。任一 runner 失败 MUST 阻止 merge。
- **FR-012**: 应用 MUST 包含 TDD pre-push git hook,自动检查即将 push 的 commits,任何 production-only scope MUST 在同 push 内有同 scope 的测试 commit 在前。违反规则 MUST 阻止 push。
- **FR-013**: 应用 MUST 实现主样式系统(设计 token + 基础组件 Button / Card / Layout),且样式设计 MUST 通过 `design-taste-frontend` skill 评审。评审摘要 MUST 附在落地该样式的 commit body 中。
- **FR-018**: Settings 页面 MUST 提供主题切换控件(3 选项 segmented control: 跟随系统 / 亮色 / 暗色),允许用户覆盖 FR-017 的默认行为。控件 MUST 使用 `.specify/memory/design.md` Section 6.6 中描述的 segmented control 视觉规范。控件状态变化 MUST 立即应用 (无需重启) 并持久化到 DB(`user_preferences` 表)。
- **FR-014**: 应用 MUST 在 spec/plan 阶段引用项目级设计系统 (`.specify/memory/design.md`, 由 Constitution Principle X 锁定), 包含 design tokens (color/spacing/typography/radius/shadow)、Established Component Library、anti-pattern 清单(33 条)、pre-flight pass 标准。所有 UI spec MUST 引用此全局文件, 不允许就地重新定义 token 或 anti-pattern。
- **FR-015**: 实际渲染 MUST 严格符合 `.specify/memory/design.md` Section 1 的 token 值。任何 token 偏离(不同 hex、不同 spacing、不同字号、不同 radius) MUST 在 commit body 中说明。
- **FR-016**: `.specify/memory/design.md` 第 2 节 anti-pattern 清单 33 条 MUST 在 implement 阶段逐条 ✅。0 容忍 ❌。pre-flight fail = 不允许 commit。
- **FR-017**: 应用 MUST 默认跟随系统主题(`prefers-color-scheme`),并通过 Settings 提供手动覆盖(三个选项:跟随系统 / 亮色 / 暗色)。手动选择 MUST 持久化到 DB,跨应用重启保留。dark mode 下视觉层次 MUST 与 light mode 保持一致(无对比度崩塌、accent 调亮)。

### Key Entities *(include if feature involves data)*

- **AppDatabase**: 应用的本地 SQLite 数据库,包含以下初始表(此阶段为空表,后续 spec 填充):
  - `tasks`(基础任务表)
  - `subtasks`(子任务表,通过 `parent_task_id` 关联 `tasks`)
  - `tags`(标签表)
  - `task_tags`(任务-标签多对多关联表)
  - `reminders`(提醒表,通过 `task_id` 关联 `tasks`)
  - `migrations`(已应用的 schema 版本号)
- **AppError**: 跨 IPC 边界的错误枚举,变体见 FR-006。
- **ExportPayload**: JSON 导出的根结构,字段见 FR-010。
- **I18nKey**: 字典 lookup 的 key 字符串,所有用户可见字符串通过该 key 间接渲染。

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户从双击应用到主窗口可交互,在 2020 款 MacBook Air baseline 上冷启动时间 **< 2 秒**(手动计时)。
- **SC-002**: 应用安装包(`.dmg` / `.msi` / `.exe`)大小 **< 50 MB**(Mac/Windows 任一)。
- **SC-003**: 用户在主窗口点击视图 tab 后,UI 状态切换在 **< 100 毫秒** 内完成。
- **SC-004**: 用户模拟数据库损坏场景后启动应用,主窗口在 **< 3 秒** 内显示损坏提示与导出按钮。
- **SC-005**: 所有用户可见字符串(审视骨架阶段全部 UI 后)100% 来自 i18n 字典,组件源码中硬编码中文为 **0 处**。
- **SC-006**: GitHub Actions 在 macOS-latest 和 windows-latest runner 上构建 + 测试同时通过的 PR 占 **100%**(即所有合并到 `main` 的提交 CI 均绿)。
- **SC-007**: 任何向 `main` push 的提交集违反 TDD pre-push hook 规则时,push 被阻止,占违规尝试的 **100%**。
- **SC-008**: 骨架阶段所有可观察行为(FR-001 至 FR-010)均有对应自动化测试,且测试均按红→绿→重构顺序产出(可由 git history 验证:同 feature scope 内,测试 commit 早于生产 commit)。
- **SC-009**: 主样式系统(Button / Card / Layout)在 `design-taste-frontend` skill 评审中通过 pre-flight check,review 摘要附在落地 commit body。

---

## Assumptions

- **A-001**: 用户使用的操作系统在支持范围内(macOS 11+ 或 Windows 10+),由 Tauri 2.x 官方支持矩阵决定。
- **A-002**: 用户的本地 SQLite 文件位于 Constitution v1.3.0 规定的路径(macOS: `~/Library/Application Support/com.huyikai.solo-task/tasks.db`;Windows: `%APPDATA%\com.huyikai.solo-task\tasks.db`)。
- **A-003**: 骨架阶段所有"占位/stub" 行为在后续 spec 中被替换时,不影响本 spec 的 Acceptance Criteria(本 spec 只验证占位行为本身存在且不会崩溃)。
- **A-004**: 骨架阶段"清除所有数据" 按钮点击并完成二次确认后,只显示完成提示(不实际删除数据库文件)。实际删除逻辑在后续 spec 中实现并测试。
- **A-005**: i18n 字典初版仅含 `zh-CN.ts`,架构上预留扩展为 `en-US.ts` 等多字典的能力,但本 spec 不实现语言切换 UI。
- **A-006**: TDD pre-push hook 在 macOS 和 Linux 开发机上由 bash 脚本实现;Windows 开发机用户可通过 WSL 或 Git Bash 运行同一脚本(若未来有 Windows 开发需求,可单独提供 PowerShell 版本,本 spec 不要求)。
- **A-007**: 设计评审由 `design-taste-frontend` skill 自动产出报告;本 spec 不要求人工评审,但要求 commit body 包含评审摘要。
- **A-008**: GitHub Actions runner 镜像由 GitHub 官方提供;不涉及自托管 runner 配置。
