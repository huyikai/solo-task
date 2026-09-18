# Plan: 任务 CRUD + 列表视图 (003-task-crud)

**Spec**: [spec.md](spec.md) | **Tasks**: [tasks.md](tasks.md) |
**Contracts**: [contracts/ipc.md](contracts/ipc.md)

**Date**: 2026-09-18
**Constitution**: v1.8.0 (Principles III, IV, V, VI, VII, X)

---

## 1. Tech Stack (locked, per Constitution IV/V)

- Rust 2.x crate `src-tauri/` — 仓储层 + IPC 命令 + 校验,`rusqlite`
  (bundled SQLite),`chrono` 处理 RFC3339 时间戳(新增依赖,见 §5)。
- React 18 + TypeScript 5 — 纯展示层,经 `src/api/ipc.ts` 调命令。
- Tailwind v4 CSS-first(direct: `@theme inline` 已就位)。
- UI 原语: 既有 Button / Card / Tabs / ConfirmDialog;新增
  Input / Dialog / Select 走 `pnpm dlx shadcn@latest add`。

## 2. Architecture

```
src/
  api/ipc.ts               # +5 typed wrappers (createTask … deleteTask)
  i18n/zh-CN.ts            # +~25 keys
  views/ListView.tsx       # 真实列表 (替换占位)
  components/tasks/
    TaskRow.tsx            # 单行: 标题/徽标/优先级/到期日/状态控件/编辑/删除
    TaskEditorDialog.tsx   # 新建+编辑共用 (模式: create | edit)
  components/ui/           # shadcn: input.tsx, dialog.tsx, select.tsx (新增)
  __tests__/
    ListView.test.tsx
    TaskRow.test.tsx
    TaskEditorDialog.test.tsx

src-tauri/src/
  models.rs                # Task DTO + Status/Priority 枚举 (serde)
  repo/
    mod.rs
    tasks.rs               # 纯 SQL 仓储函数 (连接注入, 可测)
    tasks_tests.rs         # 集成测试 (tempfile SQLite)
  commands/
    tasks.rs               # #[tauri::command] 5 个, 校验在此层
    tasks_tests.rs         # 命令层测试 (validation / not_found 路径)
  error/mod.rs             # + Validation variant
```

**分层规则** (Principle V):
- `repo::tasks` 只收 `&Connection` + 已校验的参数,不知道 IPC 存在。
- `commands::tasks` 做参数校验 (FR-006) + 调 repo + 把 repo 错误映射
  为 `AppError`。校验失败 → `Validation`;行不存在 → `TaskNotFound`。
- 前端零业务逻辑: 只 dispatch + 渲染;状态循环的**顺序** (todo→doing
  →done→todo) 是展示层关注点,放 `TaskRow.tsx`。

## 3. Key Decisions

| # | 决策 | 理由 |
|---|---|---|
| D1 | 新增 `AppError::Validation` variant, 不复用 `Unknown` | FR-006/007;`Unknown` 语义是"意外错误",校验失败是可预期错误,i18n 需要独立文案;001 FR-006 说"至少包含",允许扩展 |
| D2 | 状态流转不做 Rust 端状态机,循环顺序由前端实现 | spec.md US3 锁定决策;Rust 只验值合法 |
| D3 | `created_at`/`updated_at` 由 Rust 生成 (`chrono::Utc::now()`), 前端不可传 | FR-001;防时钟注入 |
| D4 | `list_tasks` 全量返回, 不分页 | A-001;1,000 行 < 50ms 的 SC-001 在无分页下达成,分页推迟 |
| D5 | 排序 `created_at DESC, id DESC` | 同秒创建的两条按 id 稳定排序 |
| D6 | TaskEditorDialog 新建/编辑共用一个组件, `mode` prop 区分 | 字段集完全一致;减少两套表单测试 |
| D7 | 删除确认复用 ConfirmDialog 视觉模式但**不要求输入 DELETE** | 单任务删除可撤销性低于清库;输入确认仅保留给清库 (constitution 精神: 破坏性与确认强度成正比) |
| D8 | `chrono` 作为唯一新增 Rust 依赖 | `SystemTime` 生成 RFC3339 需手写格式化,chrono 是事实标准;`serde` 序列化 RFC3339 开箱即用 |

## 4. TDD 切分 (Principle VI)

每个 phase 严格 Red → Green;commit 分组:

| Scope | 内容 |
|---|---|
| `feat(tasks-rust)` | repo 层 + 命令层 + Validation variant |
| `feat(tasks-ui)` | api wrapper + ListView + TaskRow + Dialog |
| `docs(design)` | design.md Section 6.7 amendment |
| `test(tasks-*)` | 各 Red commit |

Rust 测试目标 (先写,必须先红):
- repo: insert→list 顺序;update 字段选择性;status 合法值;delete;
  delete 不存在 id;1,000 行计时 (<50ms, SC-001)。
- commands: validation 全字段矩阵 (空标题/超长/非法 priority/非法
  status/非法 due_at);task_not_found (update/status/delete 三命令)。
- error: Validation 序列化为 `"validation"` (扩展现有
  `test_app_error_serializes_to_snake_case`)。

React 测试目标 (先写,必须先红):
- ListView: 渲染 N 行按倒序;空状态;due_at 有无的展示分支。
- TaskRow: 状态控件点击触发 `setTaskStatus`;编辑/删除按钮回调。
- TaskEditorDialog: mode=create 空标题禁用保存;mode=edit 预填;
  maxLength=200;提交回调载荷正确。
- 集成: mock ipc 模块,验证 ListView 调 `listTasks` 并在成功后渲染。

## 5. Dependencies

新增:
- Rust: `chrono = { version = "0.4", features = ["serde"] }`
- 前端: 无 (shadcn 原语源码进 repo, 无新运行时包;Dialog/Select 由
  radix-ui 子包承载,随 shadcn CLI 加入 package.json)

## 6. Migration & Data

无 schema migration (spec FR-015)。`tasks` 表沿用 001 v1 migration。
`migrations` 表不动。

## 7. Risks

| # | 风险 | 缓解 |
|---|---|---|
| R1 | shadcn Dialog/Select 与既有 ConfirmDialog 视觉不一致 | 先跑 design-taste-frontend pre-flight (Phase 7),diff tokens |
| R2 | chrono 与 serde RFC3339 精度 (纳秒截断) | 统一 `to_rfc3339_opts(SecondsFormat::Secs, true)`,测试断言格式 |
| R3 | 1,000 行渲染卡顿 (React 无虚拟化) | SC-001 只测 SQL;渲染侧 1,000 行简单 row 在现代 WebView 可行;虚拟化留给性能 spec (H) |
| R4 | pre-push hook 要求 test commit 先于 prod commit | tasks.md 中 Red/Green 标注 + 同 scope 提交纪律 (245c122 修复后 hook 可靠) |

## 8. Quality Gates (spec 完成定义)

`tsc --noEmit` ✓ · `pnpm test` ✓ · `cargo test` ✓ ·
`cargo clippy -D warnings` ✓ · `pnpm check:i18n` ✓ ·
`pnpm test:visual` 0 drift (design amendment 不破坏既有 token) ·
design-taste-frontend pre-flight pass (TaskRow/Dialog 视觉)
