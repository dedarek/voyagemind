# AI Travel Planner

一个面向真实旅行规划场景的 AI 助手原型。项目使用 Next.js 构建前端，通过 Function Calling 接入酒店搜索、天气、POI、路线和社区口碑数据，让 Agent 在对话中完成需求收集、信息检索、结果校验和行程建议。

## Features

- Chat-based travel planning assistant with streaming responses
- Tool calling workflow for hotels, weather, attractions, food, and routes
- Hotel search with structured parsing, abnormal price filtering, and comparison UI
- Weather page backed by AMap live weather and forecasts
- Editable itinerary board for day-by-day trip planning
- Session logs and requirement markdown generation for debugging Agent behavior
- Mobile-first UI with quick prompts and stop-generation control

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- DeepSeek Chat API
- AMap Web Service API
- Zhihu Open Platform search API
- Meituan travel search endpoint

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create `.env.local` and fill in the variables below:

```bash
DEEPSEEK_API_KEY=your_deepseek_api_key
AMAP_MAPS_API_KEY=your_amap_web_service_key
NEXT_PUBLIC_AMAP_MAPS_API_KEY=your_amap_web_service_key
ZHIHU_API_KEY=your_zhihu_api_key
```

Meituan hotel search currently reads a local token from:

```bash
~/.config/meituan-travel/config.json
```

Expected shape:

```json
{
  "key": "your_meituan_token"
}
```

You can also set `MEITUAN_TRAVEL_TOKEN` if you prefer environment variables.

## Project Structure

```text
app/
  api/                  API routes for chat, hotels, AMap tools
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
  meituan-cli.ts        Meituan hotel search client
  meituan-parser.ts     Markdown-to-hotel structured parser
  zhihu-api.ts          Zhihu search wrapper
types/                  Shared TypeScript types
```

## Quality Checks

```bash
npm run lint
npm run typecheck
npm run build
```

Or run all checks:

```bash
npm run check
```

## Notes

- Runtime logs are written to `logs/` and ignored by Git.
- Generated requirement documents are written to `public/requirements/` and ignored by Git.
- Do not commit `.env.local`, local API tokens, logs, or generated user requirement files.
- The project is a product prototype, not a production travel booking service. Always verify price, weather, route, and booking details with authoritative sources before making decisions.

## License

MIT
