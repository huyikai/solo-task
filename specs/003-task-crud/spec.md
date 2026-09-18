# Feature Specification: 任务 CRUD + 列表视图 (Task CRUD + List View)

**Feature Branch**: `003-task-crud`

**Created**: 2026-09-18

**Status**: Draft

**Input**: User decision (2026-09-18): "先做 A" — 方向 A = 任务 CRUD +
列表视图真实数据, MVP 六大块中其余五块 (subtasks / tags / reminders /
board+gantt / stats) 的依赖根。

**Design Reference**: `.specify/memory/design.md` (Constitution
Principle X)。本 spec 复用 Section 6.1 Button / 6.2 Card / 6.4 Tabs /
6.6 ConfirmDialog, 并通过 design amendment 新增 Section 6.7 (TaskRow /
TaskList / TaskEditorDialog)。

**Constitution Reference**: `.specify/memory/constitution.md` v1.8.0
- Principle III (MVP scope: basic CRUD on tasks — 本 spec 是它的核心交付)
- Principle IV (shadcn-first: Input / Dialog / Select 走 shadcn CLI)
- Principle V (Rust owns the system — 校验与持久化全在 Rust 端)
- Principle VI (TDD NON-NEGOTIABLE)
- Principle VII.3 (IPC errors are structured, not stringified)
- Principle X (design tokens 单一来源)

**Prior Spec Reference**: `specs/001-foundation/` — `tasks` 表结构已在
001 migration 中建好 (空表), IPC `AppResult` 包裹约定、`AppError` 六
variant、i18n 框架、`check-i18n` 门禁全部复用, 本 spec 不重新定义。

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — 新建任务 (Priority: P1)

用户想记一件待办。在列表视图点击"新建任务",输入标题(必填),可选填描述、
优先级 (none/low/med/high)、截止日期。保存后任务立即出现在列表顶部,
数据落 SQLite,重启应用后仍在。

**Why this priority**: 没有创建,其余一切(编辑/删除/流转/看板/甘特)都
无从谈起。这是"骨架变成能用的应用"的第一步。

**Independent Test**: 启动应用,新建一个标题为"买牛奶"的任务。验证:
(a) 列表立即出现该任务;(b) 重启应用后任务仍在;(c) SQLite `tasks` 表
中有一行,`status='todo'`、`priority='none'`、`due_at` 为 NULL。

**Acceptance Scenarios**:

1. **Given** 列表视图已打开, **When** 用户点击"新建任务"并只输入标题
   "买牛奶"后保存, **Then** 列表顶部立即出现"买牛奶",状态徽标显示
   "待办",无任何页面刷新或闪烁
2. **Given** 新建对话框已打开, **When** 用户不输入标题直接保存,
   **Then** 保存按钮禁用,标题输入框提示"标题必填"(i18n key 渲染),
   不产生任何 IPC 调用
3. **Given** 新建对话框已打开, **When** 用户输入超过 200 字符的标题,
   **Then** 输入被限制为 200 字符(前端 maxLength),且 Rust 端对超限
   请求返回 `validation` 错误(防绕过)
4. **Given** 任务创建成功, **When** 用户完全退出应用再启动,
   **Then** 任务仍然在列表中,`created_at` 不变

---

### User Story 2 — 查看任务列表 (Priority: P1)

用户打开列表视图,看到全部任务,按创建时间倒序(最新在上)。每行显示:
标题、状态徽标、优先级标记、截止日期(如有)。

**Why this priority**: 列表是三个视图中最基础的一个,也是状态流转和
编辑的宿主。

**Independent Test**: 预置 3 条任务(不同创建时间),打开列表视图。验证:
(a) 3 行全部渲染,顺序为创建时间倒序;(b) 每行显示标题/状态/优先级;
(c) 有 due_at 的行显示日期,无 due_at 的行不显示日期区域。

**Acceptance Scenarios**:

1. **Given** 数据库有 3 条任务, **When** 用户进入列表视图,
   **Then** 渲染 3 行,最新创建的在最上面
2. **Given** 某任务 `due_at = 2026-09-20`, **When** 渲染该行,
   **Then** 显示对应日期文本(i18n 格式); **Given** 另一任务
   `due_at = NULL`, **Then** 该行无日期文本
3. **Given** 数据库为空, **When** 用户进入列表视图, **Then** 显示
   空状态文案("还没有任务,点击新建开始")而非空白区域

---

### User Story 3 — 状态流转 (Priority: P1)

用户把任务从 todo → doing → done 推进,也可以退回。点击任务行的状态
控件即可流转,立即生效并持久化。

**Why this priority**: 状态是看板视图(按 status 分列)和 burndown
统计的前置数据。

**Independent Test**: 新建一个任务,点击状态控件切到 doing,再切到
done。验证:(a) 每次点击后徽标立即变化;(b) 重启后状态保持;
(c) `updated_at` 每次流转都更新。

**Acceptance Scenarios**:

1. **Given** 一个 `todo` 任务, **When** 用户点击状态控件一次,
   **Then** 状态变为 `doing`,徽标样式随之变化
2. **Given** 一个 `doing` 任务, **When** 用户点击状态控件,
   **Then** 状态变为 `done`
3. **Given** 一个 `done` 任务, **When** 用户点击状态控件,
   **Then** 状态回到 `todo`(循环流转 todo→doing→done→todo)
4. **Given** 任意流转发生, **When** 查询 SQLite, **Then** 该行
   `updated_at` 已刷新且晚于 `created_at`

流转规则(锁定决策): 允许任意状态间流转(不做状态机限制),循环顺序
todo→doing→done→todo 由前端控件实现;Rust 端 `set_task_status` 接受
任意合法值。理由: 个人工具,过度限制徒增摩擦。

---

### User Story 4 — 编辑任务 (Priority: P1)

用户点击任务行进入编辑(或打开编辑对话框),可修改标题、描述、优先级、
截止日期,保存后立即生效。

**Why this priority**: 创建时信息不全(如暂无截止日期)是常态,没有
编辑就只能删了重建。

**Independent Test**: 新建任务后编辑其标题和优先级。验证:(a) 保存后
列表行立即更新;(b) 重启后保持;(c) `updated_at` 刷新。

**Acceptance Scenarios**:

1. **Given** 一个已有任务, **When** 用户把标题改为"买酱油"并把
   优先级改为 high,保存, **Then** 列表行立即显示新标题与高优先级
   标记
2. **Given** 编辑对话框中清空标题, **When** 用户点击保存,
   **Then** 保存按钮禁用(同 US1 校验)
3. **Given** 编辑已保存, **When** 查询 SQLite, **Then** 除
   `id`/`created_at` 外的字段已更新,`updated_at` 已刷新

---

### User Story 5 — 删除任务 (Priority: P1)

用户删除一个任务。为防误删,弹出确认对话框;确认后任务从列表移除并
从数据库删除。

**Why this priority**: 删除是 CRUD 的收口,且 constitution Principle
VII 要求破坏性操作显式确认(001 的 ConfirmDialog 模式直接复用)。

**Independent Test**: 新建任务后删除。验证:(a) 点击删除弹出确认框;
(b) 取消则任务还在;(c) 确认后行消失,SQLite 中无该行,重启后不再
出现。

**Acceptance Scenarios**:

1. **Given** 一个任务, **When** 用户点击删除, **Then** 弹出确认
   对话框,标题含任务标题(截断至 20 字符)
2. **Given** 确认对话框打开, **When** 用户点击取消, **Then** 对话框
   关闭,任务仍在
3. **Given** 确认对话框打开, **When** 用户点击确认删除, **Then** 行
   从列表移除,`tasks` 表中无该行
4. **Given** 用户删除了任务 A, **When** 用户在另一窗口对 A 发起编辑
   (竞态), **Then** Rust 返回 `task_not_found`,前端显示对应错误
   toast,不崩溃

---

### User Story 6 — 校验与错误反馈 (Priority: P2)

所有校验在 Rust 端执行(Principle V)。非法输入返回结构化
`validation` 错误,前端按 i18n key 渲染,绝不显示 Rust 字符串。

**Why this priority**: 校验本身不是用户故事,但它是 FR 层面的硬性
要求,单独成 story 便于测试追溯。

**Acceptance Scenarios**:

1. **Given** Rust 端收到 `title` 为空/纯空白/超 200 字符的创建请求,
   **When** 处理, **Then** 返回 `AppError::Validation`,message 指明
   字段
2. **Given** Rust 端收到非法 `priority` 或 `status` 值, **When**
   处理, **Then** 返回 `AppError::Validation`
3. **Given** `update_task`/`set_task_status`/`delete_task` 收到不存在
   的 id, **When** 处理, **Then** 返回 `AppError::TaskNotFound(id)`
4. **Given** 任一上述错误到达前端, **When** 渲染, **Then** 显示对应
   i18n 文案,不出现 "unknown error" 字样或 Rust 内部信息

---

### Edge Cases

- **数据库为空时的首次创建**: migration 已跑,直接 INSERT,无需特殊分支
- **标题含 emoji / CJK / 首尾空白**: trim 后存储;200 字符上限按
  Unicode scalar 计(char count,非 byte)
- **due_at 传非法字符串**: Rust 端解析 RFC3339 失败 → `validation`
- **列表为空时点击状态控件**: 不可能(无行),UI 层天然规避
- **两个窗口同时编辑同一任务**: 后写赢(last-write-wins),MVP 不做
  乐观锁;`updated_at` 记录最后写入时间
- **删除后列表滚动位置**: 保持在原位,不跳顶
- **IPC 断连/异常**: 走既有 `AppError` → ErrorToast 通路,列表保持
  上一次成功状态

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 应用 MUST 提供 `create_task` IPC 命令,接受
  `{ title, description?, priority?, due_at? }`,返回完整 `Task`;
  `status` 恒为 `'todo'`,`created_at`/`updated_at` 由 Rust 端生成
  (UTC RFC3339),前端不可注入。
- **FR-002**: 应用 MUST 提供 `list_tasks` IPC 命令,返回全部任务,
  按 `created_at` DESC、`id` DESC 排序。
- **FR-003**: 应用 MUST 提供 `update_task` IPC 命令,接受
  `{ id, title?, description?, priority?, due_at? }`,只更新显式传入
  的字段,返回更新后的 `Task`;id 不存在时返回 `TaskNotFound`。
- **FR-004**: 应用 MUST 提供 `set_task_status` IPC 命令,接受
  `{ id, status }`,校验 `status ∈ {todo, doing, done}`,返回更新后
  的 `Task`。
- **FR-005**: 应用 MUST 提供 `delete_task` IPC 命令,接受 `{ id }`,
  成功返回 `null`;id 不存在时返回 `TaskNotFound`。
- **FR-006**: Rust 端 MUST 在写入前校验: `title` trim 后非空且
  ≤ 200 字符;`description` ≤ 5000 字符;`priority ∈ {none, low,
  med, high}`;`due_at` 为 null 或合法 RFC3339。违规返回
  `AppError::Validation`(新增 variant,见 FR-007)。
- **FR-007**: `AppError` MUST 新增 `Validation` variant
  (`validation`),`i18nKeyFor` MUST 将其映射到 `error.validation`;
  既有六 variant 行为不变。
- **FR-008**: 列表视图 MUST 用真实数据渲染(替换 001 的占位文本),
  每行展示标题、状态徽标、优先级标记、截止日期(如有);顺序遵循
  FR-002。
- **FR-009**: 新建/编辑 MUST 通过对话框完成(复用 001 ConfirmDialog
  的视觉模式,基于 shadcn Dialog + Input + Select 原语);对话框内
  校验失败时保存按钮禁用。
- **FR-010**: 状态流转控件 MUST 位于任务行内,单击循环
  todo→doing→done→todo,调用 `set_task_status`。
- **FR-011**: 删除 MUST 经确认对话框(含任务标题),确认后调用
  `delete_task`。
- **FR-012**: 所有新用户可见字符串 MUST 走 i18n (`zh-CN.ts` 新增
  本 spec 的 key),`pnpm check:i18n` 必须保持 0 违规。
- **FR-013**: 新 UI 原语 (Input / Dialog / Select) MUST 经
  `pnpm dlx shadcn@latest add <component>` 引入并按 design.md token
  适配;禁止手搓等价物 (Principle IV)。
- **FR-014**: 本 spec MUST 通过 design amendment 在
  `.specify/memory/design.md` 新增 Section 6.7,定义 TaskRow /
  TaskList / 空状态 / TaskEditorDialog 的视觉规范(由既有原语组合,
  不引入新 token)。
- **FR-015**: SQLite schema MUST NOT 变更(`tasks` 表 001 已建好);
  本 spec 只新增 Rust 仓储函数、IPC 命令与 UI。如需 schema 变更,
  必须回炉重写本 spec。

### Key Entities

- **Task** (DTO, 跨 IPC 传输):

```typescript
interface Task {
  id: number;              // SQLite INTEGER PRIMARY KEY
  title: string;           // trim 后非空, ≤200 chars
  description: string;     // 默认 '', ≤5000 chars
  status: "todo" | "doing" | "done";
  priority: "none" | "low" | "med" | "high";
  due_at: string | null;   // RFC3339 或 null
  created_at: string;      // RFC3339 UTC, Rust 生成
  updated_at: string;      // RFC3339 UTC, Rust 生成
}
```

- **AppError::Validation** — 新 variant,`{ variant: "validation",
  message: "<field>: <reason>" }`。

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `list_tasks` 在 1,000 行数据时 Rust 端耗时 < 50ms
  (Rust 集成测试计时,不含 IPC 传输;对应 constitution MVP checklist
  "main DB queries < 50 ms")。
- **SC-002**: 每个 IPC 命令的错误路径 (validation / task_not_found /
  db_locked) 均有 Rust 测试覆盖,断言 variant 精确匹配。
- **SC-003**: 前端 ListView / TaskEditorDialog / 状态流转 / 删除确认
  均有 React Testing Library 测试,断言用户可见行为(渲染行数、按钮
  禁用态、点击后 DOM 变化),不允许快照测试替代。
- **SC-004**: 跨层 e2e 流"新建→流转→编辑→删除"在 dev 环境跑通
  (手动 quickstart 验证,步骤写入 quickstart.md;CI 层面由 Rust +
  RTL 两层测试拼合覆盖同一契约)。
- **SC-005**: 重启应用后全部 CRUD 结果保持(dev:smoke 后人工复核
  一次,作为发布门,不进 CI)。
- **SC-006**: `pnpm check:i18n` 0 违规;`cargo test` / `pnpm test` /
  `cargo clippy -D warnings` / `tsc --noEmit` 全绿。

---

## Assumptions

- **A-001**: 本 spec 不实现搜索、过滤、排序切换、分页——按
  constitution III,过滤属于 tags 方向,分页待性能数据说话。
- **A-002**: 不做乐观锁/并发控制,last-write-wins;`updated_at` 即
  审计痕迹。
- **A-003**: due_at 的时区处理: 存储 UTC RFC3339;显示层按本地时区
  格式化(MVP 只显示日期部分,不带时间)。
- **A-004**: 通知/提醒不在本 spec(方向 C);`reminders` 表保持空。
- **A-005**: 状态徽标/优先级标记的颜色语义在 design amendment
  (FR-014) 中定义,优先复用既有 token (`--success` / `--warning` /
  `--text-subtle`),不新增颜色。
- **A-006**: e2e 走 dev-smoke 人工路径,不引入 Playwright 驱动
  Tauri WebView 的复杂度(002 的 visual-parity 脚本只覆盖 Vite 层)。
