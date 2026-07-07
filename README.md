<p align="center">
  <img src="./public/voyagemind-logo.svg" alt="VoyageMind logo" width="112" height="112" />
</p>

<h1 align="center">VoyageMind</h1>

<p align="center">
  A tool-calling AI travel planner for hotels, weather, POI discovery, community reviews, and itinerary drafting.
  <br />
  一个面向真实旅行规划场景的工具调用型 AI 助手。
</p>

<p align="center">
  <a href="#english">English</a> ·
  <a href="#中文">中文</a>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111827" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-10B981" />
</p>

---

## English

VoyageMind is an AI travel planning prototype built around real-world planning workflows. Instead of relying on the model's memory, it uses tool calls to fetch and verify hotel, weather, POI, route, and community review data before generating travel suggestions.

### Highlights

- Streaming chat interface for travel requirement collection
- OpenAI-compatible LLM integration
- Tool calling for hotels, weather, attractions, food, routes, and community reviews
- Hotel result parsing with abnormal price filtering and comparison UI
- City-based weather dashboard
- Editable day-by-day itinerary board
- Runtime logs and generated requirement snapshots for Agent debugging
- Mobile-friendly UI with quick prompts and stop-generation control

### Required Keys

VoyageMind expects four categories of credentials:

| Category | Environment variable | Purpose |
| --- | --- | --- |
| LLM | `LLM_API_KEY` | OpenAI-compatible chat completion model |
| AMap | `AMAP_MAPS_API_KEY` / `NEXT_PUBLIC_AMAP_MAPS_API_KEY` | geocoding, POI, weather, route, static map |
| Meituan | `MEITUAN_TRAVEL_TOKEN` or local config | hotel search |
| Zhihu | `ZHIHU_API_KEY` | community reviews and travel guide search |

Optional LLM settings:

```bash
LLM_BASE_URL=https://your-llm-provider.example/v1
LLM_MODEL=your-model-name
```

Any provider that exposes an OpenAI-compatible `/chat/completions` endpoint can be used.

### Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Meituan Token

You can set:

```bash
MEITUAN_TRAVEL_TOKEN=your_meituan_token
```

Or use a local config file:

```bash
~/.config/meituan-travel/config.json
```

```json
{
  "key": "your_meituan_token"
}
```

### Quality Checks

```bash
npm run lint
npm run typecheck
npm run build
```

Or:

```bash
npm run check
```

### Project Structure

```text
app/
  api/                  API routes for chat, hotels, and AMap tools
  hotels/               Hotel search and detail pages
  itinerary/            Editable itinerary page
  weather/              Weather dashboard
components/
  chat/                 Markdown rendering for chat responses
  hotels/               Hotel cards and comparison table
  layout/               Navigation
lib/
  agent.ts              Main travel Agent and tool orchestration
  amap-api.ts           AMap Web Service wrapper
  city-presets.ts       Optional city presets for geo fallback
  meituan-cli.ts        Meituan hotel search client
  meituan-parser.ts     Markdown-to-hotel structured parser
  zhihu-api.ts          Zhihu search wrapper
types/                  Shared TypeScript types
```

---

## 中文

VoyageMind 是一个面向真实旅行规划场景的 AI 助手原型。它不把模型记忆当作事实来源，而是通过工具调用获取酒店、天气、POI、路线和社区口碑数据，再生成旅行建议。

### 项目亮点

- 流式聊天界面，用于收集旅行需求
- 支持 OpenAI-compatible LLM，不绑定某一家模型厂商
- 通过工具调用接入酒店、天气、景点、美食、路线和社区口碑
- 酒店结果结构化解析，过滤异常低价和无效评分
- 支持城市天气查询
- 可编辑的按天行程规划面板
- 会话日志和需求 Markdown 快照，便于分析 Agent 行为
- 移动端友好，支持快捷问题和停止生成

### 需要准备的 Key

项目只抽象成四类凭证：

| 类别 | 环境变量 | 用途 |
| --- | --- | --- |
| LLM | `LLM_API_KEY` | OpenAI-compatible 聊天模型 |
| 高德 AMap | `AMAP_MAPS_API_KEY` / `NEXT_PUBLIC_AMAP_MAPS_API_KEY` | 地理编码、POI、天气、路线、静态地图 |
| 美团 Meituan | `MEITUAN_TRAVEL_TOKEN` 或本地配置 | 酒店搜索 |
| 知乎 Zhihu | `ZHIHU_API_KEY` | 社区口碑、攻略和避坑搜索 |

LLM 可选配置：

```bash
LLM_BASE_URL=https://your-llm-provider.example/v1
LLM_MODEL=your-model-name
```

只要服务兼容 OpenAI `/chat/completions` 接口，就可以替换为其他模型服务。

### 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

### 美团 Token 配置

可以使用环境变量：

```bash
MEITUAN_TRAVEL_TOKEN=your_meituan_token
```

也可以使用本地配置文件：

```bash
~/.config/meituan-travel/config.json
```

```json
{
  "key": "your_meituan_token"
}
```

### 质量检查

```bash
npm run lint
npm run typecheck
npm run build
```

或一次性运行：

```bash
npm run check
```

### 注意事项

- `.env.local`、日志和生成的用户需求文档不会提交到 Git。
- `logs/` 用于本地调试 Agent 行为。
- `public/requirements/` 用于保存需求快照，默认忽略。
- 这是一个产品原型，不是正式预订服务；价格、天气、路线和预订信息请以权威平台为准。

## License

MIT
