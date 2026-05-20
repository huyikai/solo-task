# solo-task

极简个人本地待办事项管理工具。采用 JSON 文件持久化，无需数据库。

## 技术栈

- **前端**: Vue 3 + Vite + TailwindCSS 4（总览 / 看板 / 甘特图 / 智能体助手）
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

### 3. 启用 Git 提交钩子（推荐）

避免 Cursor 自动添加 `Co-authored-by` 导致 GitHub Contributors 出现 `cursoragent`：

```bash
git config core.hooksPath .githooks
```

克隆本仓库后执行一次即可（仅对当前仓库生效）。

### 4. 启动开发服务

```bash
npm run dev
```

- 前端: [http://localhost:5173](http://localhost:5173)
- 后端 API: [http://localhost:3001](http://localhost:3001)

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
- 已排期任务的父任务会显示为行（可无条形），子任务缩进；顶栏可切换「总览 / 看板 / 甘特」。
- **总览**：任务数量与状态分布、逾期与临期列表、最近更新、热门标签（数据与当前筛选一致）。

## API 接口


| 方法     | 路径                      | 说明                                       |
| ------ | ----------------------- | ---------------------------------------- |
| GET    | `/api/tasks`            | 获取任务列表（支持 ?status / ?priority / ?tag 筛选） |
| GET    | `/api/tasks/:id`        | 获取单个任务                                   |
| POST   | `/api/tasks`            | 创建任务                                     |
| PUT    | `/api/tasks/:id`        | 更新任务                                     |
| DELETE | `/api/tasks/:id`        | 删除任务（?cascade=true 级联删除子任务）              |
| PATCH  | `/api/tasks/:id/status` | 快速切换状态                                   |
| PATCH  | `/api/tasks/kanban-reorder` | 看板顶层任务重排                         |
| POST   | `/api/tasks/export`     | 导出任务（json/csv/xlsx/markdown）             |

## 智能体助手

通过自然语言管理任务：查询、创建、修改、删除、看板重排、导出等。写操作会先展示预览清单，确认后才写入 `data/tasks.json`。

### 配置

1. 复制示例配置到数据目录：

```bash
cp agent.config.example.json data/agent.config.json
```

2. 或在环境变量中设置（优先级高于配置文件）：

- `AGENT_PROVIDER` — `ollama` 或 `openai_compat`
- `OLLAMA_BASE_URL`、`OLLAMA_MODEL`
- `OPENAI_COMPAT_BASE_URL`、`OPENAI_COMPAT_API_KEY`、`OPENAI_COMPAT_MODEL`

### 提供商

| 类型 | 说明 |
|------|------|
| **Ollama** | 本地运行，默认 `http://127.0.0.1:11434`，需支持 Tool Calling 的模型 |
| **OpenAI 兼容** | OpenAI、DeepSeek、LM Studio 等任意兼容 `/v1/chat/completions` 的 API |

在应用顶栏点击「助手」打开侧栏；设置中可切换提供商并检测连接状态。

### 智能体 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/agent/config` | 获取配置（密钥脱敏）与健康检查 |
| PUT | `/api/agent/config` | 更新配置 |
| POST | `/api/agent/chat` | 对话（`Accept: text/event-stream` 为 SSE 流式） |
| POST | `/api/agent/confirm` | 确认执行预览中的写操作 |
| DELETE | `/api/agent/sessions/:id` | 清除会话上下文 |

### 验收要点

1. 启动 Ollama 后，设置页显示在线；「列出所有 urgent 任务」可查询且无需确认。
2. 配置 OpenAI 兼容 API 后，同样可查询。
3. 「创建任务：明天前完成周报」→ 预览 → 确认后看板可见。
4. 批量删除预览含子任务提示，取消则不写盘。
5. 看板重排经预览确认后与 API 一致。
6. LLM 不可达时 SSE 返回明确错误，任务数据不被污染。

