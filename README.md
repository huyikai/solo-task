# solo-task

极简个人本地待办事项管理工具。采用 JSON 文件持久化，无需数据库。

## 技术栈

- **前端**: Vue 3 + Vite + TailwindCSS 4（看板 + 甘特图视图）
- **后端**: Express 5 + TypeScript
- **数据**: 本地 JSON 文件（`data/tasks.json`）

## 项目结构

```
solo-task/
├── packages/
│   ├── frontend/     # Vue + Vite 前端
│   └── server/       # Express API 服务
└── data/             # 数据目录（独立 Git 仓库，主项目 .gitignore 已忽略）
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据仓库

```bash
git clone git@github.com:huyikai/solo-task-data.git data/
```

### 3. 启动开发服务

```bash
npm run dev
```

- 前端: http://localhost:5173
- 后端 API: http://localhost:3001

## 数据管理

数据存储在 `data/` 目录，由独立的 Git 仓库管理。手动提交数据快照：

```bash
cd data/
git add . && git commit -m "数据快照"
git push
```

## 甘特图（时间映射）

- 同时有 `startDate` 与 `endDate`：按区间条形展示（含首尾日）。
- 仅有 `dueDate`：单日条形。
- 无时间或仅单侧日期：列入「未排期」，不在时间轴上画条。
- 已排期任务的父任务会显示为行（可无条形），子任务缩进；顶栏可切换「看板 / 甘特」。

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tasks` | 获取任务列表（支持 ?status / ?priority / ?tag 筛选） |
| GET | `/api/tasks/:id` | 获取单个任务 |
| POST | `/api/tasks` | 创建任务 |
| PUT | `/api/tasks/:id` | 更新任务 |
| DELETE | `/api/tasks/:id` | 删除任务（?cascade=true 级联删除子任务） |
| PATCH | `/api/tasks/:id/status` | 快速切换状态 |
