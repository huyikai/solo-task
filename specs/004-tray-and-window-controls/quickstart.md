# Quickstart: 托盘 + 窗口控制 (004)

**Spec**: `004-tray-and-window-controls`
**Date**: 2026-09-20
本文件是 SC-001/002/003 的人工 e2e 步骤集(T025),需 T026 由用户在真机
完成。自动化门禁(pnpm test / cargo test / test:visual)在 T023 已全绿,
本步骤为人验最后一道。

## 前置

- `pnpm tauri dev` 启动开发模式
- macOS 14+ (菜单栏 status item、Overlay 标题栏、`setFullscreen`
  macOS-only 行为需要)
- 已安装 `src-tauri/icons/tray-icon.png`(256×256 PNG, 单色黑色 +
  alpha,系统会自动应用 dark mode 配色)

## 步骤

依次验证 SC-001 (US1) / SC-002 (US2) / SC-003 (US3)。

### 1. 启动 + 健康检查

1. 启动 `pnpm tauri dev`
2. 主窗口正常显示,标题栏空白(`titleBarStyle: Overlay`),左侧原生红
   黄绿按钮可见
3. 数据库健康检查通过,空白状态下显示"还没有任务"空状态

### 2. 关闭 → 菜单栏 (US1 / SC-001-1)

1. 主窗口可见
2. 点击左上角红色关闭按钮
3. **预期**: 窗口立即消失
4. **预期**: macOS 顶部菜单栏出现 Solo Task 图标(单色模板图,在
   light/dark 模式下分别自动反色)
5. **预期**: 应用进程未退出(终端 `ps aux | grep -i solo-task` 仍可见)
6. **预期**: Dock 图标可见(本 spec 不隐藏 Dock)

### 3. 菜单栏 icon 左键单击 → 恢复 (US1 / SC-001-2)

1. 主窗口已隐藏(在菜单栏驻留)
2. 左键单击菜单栏 Solo Task 图标
3. **预期**: 主窗口重新出现,获得焦点(若之前最小化,先 unminimize
   再 show 再 set_focus)
4. 再次左键单击菜单栏图标
5. **预期**: 主窗口隐藏(对称行为,符合 macOS 习惯)

### 4. 菜单栏右键菜单 (US1 / SC-001-4)

1. 主窗口可见或隐藏均可
2. 右键单击菜单栏 Solo Task 图标
3. **预期**: 弹出菜单,选项:"显示" / "退出"
4. 点击"显示"
5. **预期**: 主窗口显示并获焦点(若隐藏中)
6. 再次右键菜单栏图标,点击"退出"
7. **预期**: 应用进程立即退出,菜单栏图标消失,Dock 中的应用退出
   状态指示

### 5. 双箭头覆盖层 → 全屏 (US2 / SC-002-1)

1. 主窗口可见,非全屏
2. 点击双箭头按钮区域(原生按钮位置 left-2 top-2,大小约 48×48)
3. **预期**: 窗口**直接**进入全屏(fullscreen = true),无中间
   maximize 状态
4. 验证无中间态:全屏切换瞬间,窗口尺寸不应先跳到 fullscreen
   maxsize 再跳到全屏

### 6. 双箭头覆盖层 → 退出全屏 (US2 / SC-002-2)

1. 主窗口已全屏
2. 再次点击双箭头按钮区域
3. **预期**: 窗口退出全屏(回到原尺寸/位置,不经过 maximize 中间态)

### 7. Settings 关闭行为开关 (US3 / SC-003)

1. 主窗口可见,从 Tabs 行右侧齿轮进入 Settings
2. 外观分组下:
   - 主题(已有,显示"跟随系统 (当前: 亮色)")
   - **关闭按钮(新增)**: 两选项 "退回菜单栏" (默认选中) / "退出应用"
3. 点击"退出应用"
4. **预期**: 选项 UI 立即切换(选中态 = `bg-bg` + `font-medium` +
   `shadow-sm`,沿用 §6.6 ThemeSwitcher 视觉)
5. 返回主窗口(`← 列表` 按钮)
6. 点击关闭按钮
7. **预期**: 应用**直接退出**(进程终止,菜单栏无图标)
8. 重新启动 `pnpm tauri dev`
9. 进入 Settings
10. **预期**: "关闭按钮"仍显示"退出应用"(持久化验证)
11. SQLite 直查:`sqlite3 ~/Library/Application\ Support/com.huyikai.solo-task/dev.db`
    `SELECT * FROM user_preferences WHERE key='window.close_action';`
    **预期**: 一行,`value='"quit"'`
12. 切回"退回菜单栏",关闭按钮恢复退菜单栏行为

## 失败诊断

| 现象 | 排查 |
|---|---|
| 菜单栏 icon 不出现 | `ps aux | grep solo-task`;若进程存在但无 icon,检查 src-tauri/icons/tray-icon.png 是否存在且 `tray::install()` 是否 panic |
| 关闭按钮直接退出应用 | `getPreference("window.close_action")` 返回值;`user_preferences` 表默认行为 |
| 双箭头按钮无反应 | 覆盖层 z 序,是否在 z-40 TitleBar 之上但在 macOS 原生按钮之上;控制台日志 |
| 双箭头按钮有中间态 | 直接 `setFullscreen` 应绕开 maximize;若仍两步,检查是否被自定义 OS 拦截 |

## 完成

7 步全部通过 → T026 用户报告 → T027 归档 commit。