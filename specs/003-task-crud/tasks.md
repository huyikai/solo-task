# Tasks: 任务 CRUD + 列表视图 (003-task-crud)

**Input**: `/specs/003-task-crud/` (spec.md, plan.md, contracts/ipc.md)

**Constitution**: v1.8.0 — Principle VI TDD NON-NEGOTIABLE。每个
behavior task 标注 [Red]/[Green];**Red commit 必须先于同 scope 的
Green commit 入同一 push**(pre-push hook 已修复, 245c122)。

**Organization**: 按依赖排序 — Phase 1 契约文档 → Phase 2 Rust 仓储
→ Phase 3 Rust 命令 → Phase 4 前端桥接 → Phase 5-7 UI (story 切分)
→ Phase 8 打磨与门禁。

**Scopes**: `feat(tasks-rust)` / `feat(tasks-ui)` / `docs(design)` /
对应 `test(...)` Red commits。

---

## Phase 1: Contracts (TDD-skip, 纯文档)

- [x] T001 登记 `specs/003-task-crud/` 四件套并提交
      (`docs(tasks): add 003-task-crud spec/plan/tasks/contracts`)。

**Checkpoint**: spec 引用链完整;003 Status: Draft。

---

## Phase 2: Rust 仓储层 (`feat(tasks-rust)`)

- [x] T002 [P] [Red] `src-tauri/src/models.rs` 尚不存在 — 先写
      `error/tests.rs` 扩展测试: `AppError::Validation("title: …")`
      序列化为 `{"variant":"validation","message":"title: …"}`
      (扩展现有 `test_app_error_serializes_to_snake_case`)。
      `cargo test` → RED。
- [x] T003 [Green] `error/mod.rs` 增加 `Validation(String)` variant。
      `cargo test` → GREEN。
- [x] T004 [P] [Red] 写 `src-tauri/src/repo/tasks_tests.rs`:
      `test_insert_and_list_orders_by_created_desc` — tempfile DB,
      插入 3 条 (created_at 递增), 断言 list 顺序 + 全字段回读一致。
      `cargo test` → RED (模块不存在)。
- [x] T005 [Green] `src-tauri/src/models.rs` (`Task` 结构体 +
      `TaskStatus`/`TaskPriority` 枚举, serde rename_all snake_case)
      + `src-tauri/src/repo/{mod,tasks}.rs`
      (`insert_task`, `list_tasks`, `get_task`)。`cargo test` → GREEN。
- [x] T006 [P] [Red] repo 测试: `test_update_partial_fields` —
      只传 title 时 description/priority/due_at 不变;
      `test_update_missing_id_returns_not_found`;
      `test_set_status_updates_updated_at`;
      `test_delete_removes_row`;
      `test_delete_missing_id_returns_not_found`。RED。
- [x] T007 [Green] repo: `update_task`(动态 SET), `set_task_status`,
      `delete_task`。`cargo test` → GREEN。
- [x] T008 [P] [Red] repo 测试: `test_list_1000_rows_under_50ms` —
      插入 1,000 行, 计时 `list_tasks` < 50ms (SC-001)。RED (如未
      优化自然失败则记录基线数字)。
- [x] T009 [Green] 若 T008 红: 加索引评估 (created_at 已是 TEXT,
      必要时 `CREATE INDEX` 走 v2 migration — **需回炉 spec**, 见
      FR-015)。预期 GREEN 无需改动。
- [x] T010 `cargo clippy --all-targets -- -D warnings` clean。

**Checkpoint**: `cargo test` 全绿;repo 层不依赖 IPC/前端。

---

## Phase 3: Rust 命令层 (`feat(tasks-rust)`)

- [x] T011 [P] [Red] 写 `src-tauri/src/commands/tasks_tests.rs` 校验
      矩阵: 空 title / 纯空白 title / 201-char title / 5001-char
      description / 非法 priority / 非法 status / 非法 due_at →
      全部 `Validation`;update/status/delete 不存在 id →
      `TaskNotFound`。RED。
- [x] T012 [Green] 实现 `src-tauri/src/commands/tasks.rs`:
      `create_task`, `list_tasks`, `update_task`, `set_task_status`,
      `delete_task` (校验在命令层, D1/D2/D3 决策落地), 注册进
      `lib.rs` invoke_handler。`cargo test` → GREEN。
- [x] T013 [Green] `chrono` 依赖入 `Cargo.toml`
      (`features = ["serde"]`);时间戳统一
      `to_rfc3339_opts(SecondsFormat::Secs, true)`。
- [x] T014 `cargo clippy` clean + 全套 `cargo test` 回归
      (001 的 8 个测试不回归)。

**Checkpoint**: 5 命令契约与 contracts/ipc.md 完全一致。

---

## Phase 4: 前端桥接 (`feat(tasks-ui)`)

- [x] T015 [P] [Red] `src/__tests__/ipc-bridge.test.ts` 扩展:
      `i18nKeyFor({variant:"validation"}) === "error.validation"`
      (先红: key 映射不存在)。`pnpm test` → RED。
- [x] T016 [Green] `src/api/ipc.ts`: `Task`/`NewTask`/`TaskPatch`
      类型 + 5 个 wrapper + `i18nKeyFor` validation 分支;
      `src/i18n/zh-CN.ts` 加 `error.validation`。`pnpm test` → GREEN。
- [x] T017 shadcn 原语落地: `pnpm dlx shadcn@latest add input dialog
      select`;按 design.md token 适配 (bg-surface / border-border /
      radius-md), 不引第三方库 (FR-013)。
- [x] T018 [P] [Red] `src/__tests__/TaskEditorDialog.test.tsx`:
      mode=create 空标题 → 保存禁用; 输入标题+优先级 → 提交载荷
      正确; mode=edit → 预填现有值; maxLength=200。RED。
- [x] T019 [Green] `src/components/tasks/TaskEditorDialog.tsx`
      (D6: create/edit 共用)。`pnpm test` → GREEN。

---

## Phase 5: 列表渲染 (US2 + US6 空状态) (`feat(tasks-ui)`)

- [x] T020 [P] [Red] `src/__tests__/ListView.test.tsx`: mock ipc →
      `listTasks` 返回 3 条 → 渲染 3 行倒序; 每行显示标题/状态/优先级;
      due_at 有 → 显示日期, 无 → 不显示; 空数组 → 空状态文案
      (`tasks.empty`)。RED。
- [x] T021 [Green] 实现 `src/views/ListView.tsx` (替换占位) +
      `src/components/tasks/TaskRow.tsx` + i18n keys
      (`tasks.empty`, `tasks.new`, `tasks.status.todo/doing/done`,
      `tasks.priority.none/low/med/high`, `tasks.due`, `tasks.edit`,
      `tasks.delete`, `tasks.delete_confirm_title`,
      `tasks.delete_confirm_message`, `tasks.delete_confirm_button`)。
      `pnpm test` → GREEN。
- [x] T022 App 集成: ListView 挂 `onOpenSettings` 之外的
      数据加载 (mount → listTasks → 渲染/空态/错误 toast)。
      `pnpm test` 全绿。

---

## Phase 6: 新建 / 编辑 / 流转 / 删除 (US1 / US3 / US4 / US5) (`feat(tasks-ui)`)

- [x] T023 [P] [Red] `TaskRow.test.tsx`: 点击状态控件 → 调
      `setTaskStatus(id, next)` 且顺序 todo→doing→done→todo;
      编辑/删除按钮触发回调。RED。
- [x] T024 [Green] TaskRow 接线状态循环 + 回调 props。GREEN。
- [x] T025 [P] [Red] ListView 集成测试: 新建对话框提交 →
      `createTask` 调用且列表刷新 (重新 listTasks 或本地合并);
      编辑保存 → `updateTask`; 删除确认 → `deleteTask` 后行消失;
      取消删除 → 行保留; `task_not_found` → ErrorToast
      (`error.unknown` 文案), 不崩溃 (spec US5-4)。RED。
- [x] T026 [Green] ListView 接线三个对话框流 (D7: 删除确认无需
      输入文字, 复用 ConfirmDialog 视觉但 expectedText 模式关闭 —
      新增 `expectedText?: null` 支持)。`pnpm test` → GREEN。

---

## Phase 7: Design Amendment (`docs(design)`)

- [x] T027 `.specify/memory/design.md` 新增 **Section 6.7**:
      TaskList / TaskRow (标题、状态徽标语义色 `--success`=done /
      `--warning`=doing / `--text-subtle`=todo; 优先级用文字徽标不
      引入新色; 行高 h-12; hover bg-muted) / 空状态 / TaskEditorDialog
      (基于 shadcn Dialog, radius-lg, p-6)。不新增 token (A-005)。
- [x] T028 `pnpm test:visual` → 0 drift (amendment 不破坏既有 token);
      design-taste-frontend pre-flight 对新组件过 33 项清单,
      摘要写入落地 commit body (Principle IX)。

---

## Phase 8: 打磨与门禁

- [x] T029 i18n 审计: `pnpm check:i18n` 0 违规 (新 key 全在
      zh-CN.ts)。
- [x] T030 `tsc --noEmit` / `pnpm test` / `cargo test` /
      `cargo clippy -D warnings` 四门全绿。
- [ ] T031 quickstart 追加 003 e2e 步骤 (SC-004): 新建→流转→编辑→
      删除→重启保持 (SC-005), 手动跑一遍并记录结果到本文件 T031 行。
      > 进度: specs/003-task-crud/quickstart.md 已写入; 人工 dev-run
      > 待执行 (自动化门禁已全绿, 此步为 SC-004/005 的人工确认)。
- [ ] T032 单 commit 归档准备: spec.md Status 推进 + tasks 勾选
      (沿用 001/002 的归档纪律)。

---

## Dependencies

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8
          (repo)    (commands)  (bridge)   (list)     (dialogs)  (design)   (gates)
```

Phase 4 的 T017 (shadcn 原语) 可与 Phase 2/3 并行;Phase 5-6 依赖
T016 wrapper;T028 依赖 T021/T026 的组件就位。

## Risks

| # | 风险 | 缓解 (见 plan.md §7) |
|---|---|---|
| R1 | shadcn Dialog 与 ConfirmDialog 视觉漂移 | T028 pre-flight |
| R2 | chrono RFC3339 精度 | D8 + T013 统一秒精度 |
| R3 | 1,000 行无虚拟化 | SC-001 只测 SQL; 渲染留给方向 H |
| R4 | hook 拦截错序 commit | Red 先行 + 同 push 纪律 |
