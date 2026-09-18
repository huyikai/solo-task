# Quickstart: 任务 CRUD 验证 (003-task-crud)

**Feature**: 003-task-crud
**Date**: 2026-09-18
**Spec**: [spec.md](spec.md) | **Tasks**: [tasks.md](tasks.md)

自动化门禁 (`tsc` / `pnpm test` 50 / `cargo test` 31 / `clippy` /
`check:i18n` / `test:visual`) 已在 CI 与本地全绿。以下人工步骤覆盖
SC-004 (跨层 e2e) 与 SC-005 (重启保持), 需要 `pnpm tauri dev`。

---

## 1. 启动

```bash
pnpm tauri dev
```

预期: 列表视图显示"新建任务"按钮; 若库为空显示"还没有任务"空状态。

## 2. 新建 (S1 / US1)

1. 点击"新建任务" → 对话框打开
2. 不输入标题 → "保存"按钮禁用
3. 输入标题"买牛奶", 优先级选"高", 截止日期选今天 → 保存
4. 预期: 对话框关闭, 列表立即出现该行 (高优先级徽标 + 截止日期),
   无页面刷新

## 3. 状态流转 (S3 / US3)

1. 点击"待办"徽标 → 变为"进行中" (黄)
2. 再点 → "已完成" (绿)
3. 再点 → 回到"待办" (灰)

## 4. 编辑 (S4 / US4)

1. 点击"编辑" → 对话框预填全部字段
2. 改标题为"买酱油", 描述加一行文字 → 保存
3. 预期: 列表行立即更新

## 5. 删除 (S5 / US5)

1. 点击"删除" → 确认框弹出, 标题含任务名, **无输入确认框**
2. 点"取消" → 任务还在
3. 再点"删除" → "确认删除" → 行消失, 空状态出现

## 6. 重启保持 (SC-005)

完全退出应用 (Cmd+Q), 重新 `pnpm tauri dev`。
预期: 上面新建的任务仍在, 状态为删除前的最后值。

## 7. 错误路径抽查 (S6)

```bash
sqlite3 ~/Library/Application\ Support/com.huyikai.solo-task/tasks.db \
  "UPDATE tasks SET status='bogus' WHERE id=(SELECT MAX(id) FROM tasks);"
pnpm tauri dev
```

预期: 应用启动不崩溃; 打开列表后该行渲染或报错路径符合
Principle VII (不静默修复)。(可选, 破坏性只影响本地库)
