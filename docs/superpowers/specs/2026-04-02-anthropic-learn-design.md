# Anthropic 碎片化学习站 — 设计文档

## 概述

一个个人学习工具，把 Anthropic 文档和博客内容转化为结构化的碎片化学习卡片。支持知识图谱可视化和个人标注系统。

**目标用户**：自己（有技术背景的开发者）
**核心价值**：用几分钟时间阅读一张卡片，建立一个清晰的心智模型

## 架构

两个独立部分：

```
Pipeline (CLI scripts)                Static Site (Astro)
┌───────────────────────────┐         ┌──────────────────────────┐
│ 1. Scrape (fetch + cache) │         │ 首页/卡片流              │
│ 2. Survey (全局扫描分层)   │  JSON   │ 知识图谱                 │
│ 3. Generate (按层生成卡片) │ ──────► │ 我的笔记 + 导出          │
│    (claude -p)            │         │                          │
└───────────────────────────┘         │ 状态: localStorage       │
                                      └──────────────────────────┘
```

### Pipeline

一组 Node.js 脚本，在本地运行。

**抓取**：
- 数据源：`https://platform.claude.com/docs/en/` 和 `https://www.anthropic.com/engineering`
- 抓取 HTML 存入 `cache/sources/`，文件名为 URL 的 hash

**缓存（upsert 逻辑）**：
- `cache/manifest.json` 记录每个 URL 的状态：

```json
{
  "entries": {
    "https://platform.claude.com/docs/en/agents-and-tools/tool-use": {
      "urlHash": "a1b2c3",
      "contentHash": "d4e5f6",
      "lastFetched": "2026-04-02T10:00:00Z",
      "lastGenerated": "2026-04-02T10:05:00Z",
      "cardIds": ["tool-use-basics", "tool-use-json-schema"]
    }
  }
}
```

- 抓取时：计算内容 hash，和 manifest 比较，没变则跳过
- 生成时：只处理 contentHash 变化或新增的条目

**全局扫描（survey）**：
- 在生成卡片之前，先跑一次 `claude -p`，输入所有页面的标题 + 摘要
- Claude 完成三件事：
  1. **分层**：
     - **L0 核心模型**（~15-20 张卡片）— 不懂这些，后面的都建不起来
     - **L1 实用技能**（~30-40 张）— 知道了能干活
     - **L2 深入/边缘**（按需）— 特定场景才需要
  2. **排依赖**：哪些概念是哪些的前置（→ 图谱的 requires 边）
  3. **标记跳过**：不值得做成卡片的内容
- 输出 `cache/survey.json`

**取舍规则**（编码在 survey prompt 中）：

做成卡片的：
- 引入新概念或新心智模型的内容
- 解释"为什么这样设计"的内容
- 容易混淆、需要区分的概念

不做卡片的：
- 纯 API reference（参数列表、返回值枚举）→ 查文档就行
- 安装/配置步骤 → 跟着做就行，不需要记
- Changelog / 版本更新 → 时效性内容
- 重复内容（文档和博客讲同一件事）→ 合并

**生成**：
- 按 L0 → L1 → L2 顺序，拓扑排序保证前置知识先出现
- 调用 `claude -p "<prompt>"` （Claude Code headless 模式）
- prompt 包含原始 HTML 内容 + survey 中该页的分层/依赖信息 + 指令（拆卡片、选类型、输出 JSON）
- 输出写入 `content/cards/*.json` 和 `content/graph.json`

**命令**：
- `npm run scrape` — 抓取所有源，upsert 缓存
- `npm run survey` — 全局扫描，分层 + 排依赖 + 标记跳过
- `npm run generate` — 按层生成变化的卡片
- `npm run generate -- --url <url>` — 单独处理一个 URL
- `npm run build` — scrape + survey + generate + astro build

### Static Site

Astro 静态站点，读取 `content/` 目录下的 JSON 数据。

**技术选型**：
- 框架：Astro（静态生成）
- UI：Astro + 少量 vanilla JS（或 Preact islands 用于交互组件）
- 图谱：D3.js force layout
- 部署：Vercel / Netlify / 本地

## 卡片数据模型

每张卡片存为 `content/cards/{id}.json`：

```json
{
  "id": "tool-use-basics",
  "type": "problem-solution",
  "title": "让 Claude 调用外部工具",
  "source": "https://platform.claude.com/docs/en/agents-and-tools/tool-use",
  "tags": ["tool-use", "agent"],
  "readingMinutes": 3,
  "body": { ... }
}
```

### 6 种卡片类型

| type | body 字段 | 适用场景 |
|------|----------|---------|
| `fact` | `fact`, `context` | 定义、数值、配置项 |
| `problem-solution` | `problem`, `solution`, `keyTakeaway` | 痛点和解决方案 |
| `concept-model` | `concept`, `analogy`, `visual` | 抽象概念，配类比 |
| `how-to` | `goal`, `steps[]` | 操作步骤 |
| `comparison` | `itemA`, `itemB`, `dimensions[]` | 易混淆概念对比 |
| `architecture` | `overview`, `components[]`, `flow` | 系统架构、数据流 |

### 知识图谱

`content/graph.json`：

```json
{
  "nodes": [
    { "id": "tool-use-basics", "label": "Tool Use", "group": "agent", "cardCount": 3 }
  ],
  "edges": [
    { "from": "tool-use-basics", "to": "mcp-overview", "relation": "extends" }
  ]
}
```

关系类型：
- `requires` — 前置知识（A 需要先理解 B）
- `extends` — 扩展（A 是 B 的进阶）
- `related` — 相关但无依赖
- `compares` — 对比关系

## 前端页面

### 3 页结构

1. **首页/卡片流** — 浏览所有卡片，按 tag 筛选，搜索
2. **知识图谱** — D3.js force layout 可视化概念关系
3. **我的笔记** — 查看标注、comment、问题，导出到剪贴板

### 卡片阅读布局：侧边抽屉

- 左侧：卡片列表（带 type 标签、标题、tag）
- 右侧：选中卡片的详情阅读视图
- 底部操作栏：⭐ 标记 / 💬 Comment / ❓ 提问

每种 type 的卡片有对应的视觉呈现：
- `problem-solution`：红色 PROBLEM 块 + 绿色 SOLUTION 块 + KEY TAKEAWAY
- `fact`：简洁的信息展示
- `comparison`：左右对比视图
- 等等

### 知识图谱页

- D3.js force-directed graph
- 拖拽平移、滚轮缩放
- 点击节点 → 浮窗显示前置/延伸关系 + 跳转卡片
- 节点大小反映关联卡片数量
- 连线颜色区分关系类型（requires 橙、extends 绿、related 灰）

### 笔记页

三个 tab：⭐ 标记 / 💬 Comment / ❓ 问题

**导出**：
- 选中条目（可全选某 tab）
- 点"复制到剪贴板"→ 生成格式化 Markdown

导出格式示例：
```markdown
## 我的问题（5 条）

### Tool Use - 让 Claude 调用外部工具
- Tool Use 和 MCP 的边界在哪？

### Prompt Caching
- cache 的 TTL 怎么算？
```

### 本地状态

所有用户状态存 localStorage：
- `annotations:{cardId}` → `{ starred: boolean, comments: string[], questions: string[] }`

## 目录结构

```
LEARN_ANTHROPIC/
├── scripts/              # Pipeline 脚本
│   ├── scrape.js         # 抓取 + upsert 缓存
│   ├── survey.js         # 全局扫描分层
│   ├── generate.js       # 按层生成卡片
│   └── prompts/          # 给 claude -p 的 prompt 模板
├── cache/                # 本地缓存（gitignore）
│   ├── sources/          # 原始 HTML（以 URL hash 命名）
│   └── manifest.json     # URL → hash/时间戳映射
├── content/              # 生成的学习内容（提交到 git）
│   ├── cards/            # 卡片 JSON 文件
│   └── graph.json        # 知识图谱
├── site/                 # Astro 项目
│   ├── src/
│   │   ├── pages/        # 3 个页面
│   │   ├── components/   # UI 组件
│   │   └── lib/          # 工具函数
│   └── astro.config.mjs
├── package.json
└── .gitignore            # cache/, .superpowers/
```
