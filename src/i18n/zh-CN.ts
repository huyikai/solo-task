const zhCN = {
  "app.title": "Solo Task",
  "app.settings": "设置",

  "views.list": "列表",
  "views.board": "看板",
  "views.gantt": "甘特图",
  "views.placeholder": "Hello Solo Task",

  "settings.title": "设置",
  "settings.appearance": "外观",
  "settings.data": "数据",
  "settings.theme": "主题",
  "settings.theme.system": "跟随系统",
  "settings.theme.light": "亮色",
  "settings.theme.dark": "暗色",
  "settings.theme.currentHint": "跟随系统 (当前: {mode})",
  "settings.check_for_update": "检查更新",
  "settings.checking": "检查中",
  "settings.no_update": "已是最新",
  "settings.clear_data": "清除所有数据",
  "settings.clear_done": "已清除",
  "settings.confirm_clear_title": "确认清除所有数据?",
  "settings.confirm_clear_message": "此操作不可撤销, 输入 DELETE 确认",
  "settings.confirm_clear_placeholder": "DELETE",
  "settings.confirm_clear_button": "确认清除",
  "settings.cancel": "取消",
  "settings.about": "关于",
  "settings.version": "版本",
  "settings.developer": "开发者",
  "settings.test_error": "测试错误",

  "corrupted.title": "数据库损坏",
  "corrupted.message":
    "我们检测到本地数据库文件已损坏。为防止数据丢失, 你的任务未被删除。你可以选择导出为 JSON 抢救可读数据, 或进入设置清除后重新开始。",
  "corrupted.export": "导出为 JSON",
  "corrupted.exporting": "导出中",
  "corrupted.export_success": "导出成功",
  "corrupted.open_settings": "进入设置",

  "error.db_locked": "数据库被锁定",
  "error.db_corrupted": "数据库损坏",
  "error.permission_denied": "权限不足",
  "error.unknown": "操作失败, 请稍后重试",
  "error.validation": "输入不符合要求",
  "error.retry": "重试",
} as const;

export default zhCN;
