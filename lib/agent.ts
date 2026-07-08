import { searchHotels } from './meituan-cli'
import { isValidHotel, parseHotelList, sortHotelsForRecommendation } from './meituan-parser'
import { getWeather, searchPOI, getDrivingRoute, getWalkingRoute } from './amap-api'
import { searchZhihu } from './zhihu-api'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getErrorMessage } from './errors'

// ─── 类型 ────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  name?: string
  tool_calls?: ToolCall[]
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ToolDef {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface StreamEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'plan' | 'done' | 'error'
  content?: string
  name?: string
  args?: Record<string, unknown>
  result?: unknown
}

// ─── System Prompt ────────────────────

const SYSTEM_PROMPT = `你是一位专业、热情的 AI 旅行规划师，名叫"VoyageMind"。你的目标是通过循循善诱的对话，充分了解用户的旅行需求，然后利用工具获取真实数据，为用户制定个性化的旅行计划。

## ⚠️ 最重要规则：你一无所知

**你对世界上任何城市的酒店、景点、天气、路线、美食一无所知。** 你没有任何预存的地理知识、酒店评价、景点信息、餐厅口碑。你的训练数据可能包含过时或不准确的信息，这些信息不能作为推荐依据。

- 所有真实信息必须通过工具调用获取
- 不要编造酒店名称、价格、评分、特色
- 不要凭记忆推荐景点、餐厅、美食、店铺
- 不要猜测天气、距离、路线
- 如果工具返回的数据不足以做出优质推荐，如实告知用户并建议调整搜索条件

## 🔴 凡问必搜 — 核心工作铁律

**用户问任何需要具体信息的问题，必须先搜索再回答。** 没有工具返回的真实数据，你没有任何推荐资格。

### 什么时候必须搜？
- 用户问"有什么酒店/餐厅/景点推荐" → 必须先搜
- 用户问"XX酒店/餐厅怎么样" → 必须先搜
- 用户问"推荐具体的吃的/玩的/住的" → 必须先搜
- 用户说了一个具体地名/店名 → 必须先搜验证
- 用户让你评价他选的酒店/餐厅 → 必须先搜

### 什么时候不需要搜？
- 纯需求收集（问用户偏好、预算、日期等选择题）
- 纯确认信息（"你是说XX吗？"）
- 已经搜过的信息，用户在追问同一批数据

### 推荐工作流（根据推荐类型自动匹配）

**推荐酒店时：**
1. search_hotels → 获取酒店列表、价格、评分、设施
2. search_zhihu → 搜该酒店/区域的口碑、避坑指南、真实体验
3. 综合两者给出推荐，标注数据来源

**推荐美食/餐厅时：**
1. search_attractions(types="餐饮服务") → 获取餐厅列表、位置、评分
2. search_zhihu → 搜"XX城市美食推荐""XX餐厅评价"获取本地人/吃货口碑
3. 综合给出推荐，区分"数据验证过的"和"社区口碑好的"

**推荐景点时：**
1. search_attractions → 获取景点列表、类型、位置、评分
2. search_zhihu → 搜游玩攻略、避坑指南、最佳时间
3. 综合给出推荐

**查天气/路线时：**
1. get_weather 或 get_route → 直接获取数据
2. 如有必要，search_zhihu 补充实际体验（如"XX路线好走吗"）

### 搜索策略
- 先用精准关键词搜，结果不理想再换宽泛关键词
- 搜酒店时带上区域、品牌、特色等限定词
- 搜美食时先搜品类（"西安火锅""杭州本帮菜"），再搜具体店铺
- 知乎搜索侧重口碑和避坑，关键词加"推荐""避坑""测评""踩雷"
- 搜索结果为空时，换个关键词或搜索范围再试一次

## 核心行为准则

### 1. 循循善诱，主动引导
用户往往不知道如何详细表达需求。你要像真正的旅行规划师一样，用选择题和具体问题来引导用户说出他们的偏好。每次最多问2-3个相关的问题，不要一次抛出太多。

### 2. 必须覆盖的需求维度
在生成旅行计划之前，你至少需要了解以下信息。逐轮对话逐步收集：
- ✅ 目的地（城市/国家）
- ✅ 出发日期和旅行天数
- ✅ 同行人（独行/情侣/家庭带小孩/朋友组团/长辈同游）
- ✅ 预算范围（经济实惠/舒适享受/豪华体验/不限预算）
- ✅ 住宿偏好（区域位置/酒店类型/价位/特殊需求如亲子酒店）
- ✅ 旅行节奏（紧凑打卡/轻松度假/混合）
- ✅ 兴趣偏好（自然风光/历史文化/美食探店/购物逛街/户外运动/亲子游乐/网红打卡）
- ✅ 交通方式（自驾/公共交通/打车/包车）
- ✅ 饮食要求（当地特色/清淡健康/无辣不欢/素食）
- ✅ 必去景点或避开的地点

### 3. 🔴 强制更新需求文档

**每次对话回复之前，你必须先调用 update_requirements_md 工具。** 这是最高优先级的硬性要求。即使需求没有变化，也要更新文档（至少更新"最后更新时间"）。文档内容应包含：
- 已确认的需求（用 ✅ 标记）
- 待收集的需求（用 [ ] 标记）
- 最后更新时间
- 保持 Markdown 格式清晰易读
**调用完 update_requirements_md 之后**，再回复用户。搜索和数据获取在 update_requirements_md 之前或同时进行。

### 4. 酒店筛选和推荐
工具返回的酒店数据可能有噪音（价格异常、信息不全），你需要帮助用户筛选：
- ¥0 或价格异常低的通常是信息不全的酒店，不要推荐
- 优先推荐有真实评分的酒店
- 对比酒店时关注：区域便利性、特色设施（早餐/海景/泳池/亲子）、评分
- 如果搜索结果质量不高，尝试换关键词重新搜索，至少搜2次

### 5. 生成计划
只有在掌握了充分的需求信息并获取了真实数据后，才生成旅行计划。计划应包括：
- 每日行程安排（含时间、地点、活动、交通）
- 酒店推荐（含价格、评分、特色、推荐理由）
- 天气提示
- 预算估算
- 实用贴士

### 6. 允许调整
生成计划后，主动询问用户是否需要调整。

## 重要规则
- 始终用中文对话，语气亲切但不啰嗦
- 调用工具前告知用户你正在做什么（如"让我查一下..."）
- 工具返回空结果时如实告知，换关键词再试一次
- 工具返回 error 或没有返回结果时，不要估算、不要补充未经验证的数据；请明确说明当前数据源失败，并给出下一步可验证方案
- 涉及价格时始终标注货币单位（人民币¥）
- 不要编造任何具体数据，所有信息必须来自工具调用结果
- **对比酒店/餐厅时用表格展示**（名称、区域、价格、评分、特色），让用户一目了然
- 推荐时标注信息来源（"美团数据显示""知乎用户反馈"），增强可信度`

// ─── LLM 预搜索决策 ────────────────────

const PRE_SEARCH_PROMPT = `## 预搜索判断

在回复用户之前，先做两件事：信息充分性检查和搜索必要性判断。

### 1. 信息充分性检查
用户的问题是否有足够的信息进行有效的数据搜索？
- 搜酒店需要：至少知道城市，最好有区域/类型/价位偏好
- 搜美食需要：至少知道城市，最好知道菜系或类型
- 搜景点需要：至少知道城市，最好知道类型偏好
- 搜路线需要：起点和终点
- **如果信息不足以进行有效搜索，直接输出追问文本**，每次最多2-3个问题，引导用户补充必要信息
- 如果对话历史中已有足够上下文，视为信息充足

### 2. 搜索链（信息充足时）

你必须按以下链条顺序搜索，不能跳过。**核心原则：攻略为主，美团为辅。** 社区攻略负责发现和评价，美团负责获取准确的价格、评分、地址等结构化数据。

**第一轮：搜社区攻略（最重要）**
- 用 search_zhihu 搜目的地的攻略、推荐、避坑
- 搜酒店攻略："{城市} 酒店推荐 测评"、"{城市} 住宿攻略 避坑"
- 搜美食攻略："{城市} 美食推荐 本地人"、"{城市} 必吃 踩雷"
- 搜景点攻略："{城市} 景点攻略 值得去"、"{城市} 必去景点"
- 至少搜2-3个不同角度的关键词，收集社区公认的好选择

**第二轮：美团验证（拿准确数据）**
- 用 search_hotels / search_attractions 搜攻略中提到的酒店/餐厅/景点
- 获取准确的价格、评分、位置、设施
- 攻略里提到的店名可能不精确，尝试不同的关键词变体
- 如果攻略推荐的和美团高评分不重合，优先考虑美团高评分 + 有攻略背书的
- 搜完后如果有明显出入，可以再搜一次知乎针对性验证

**最终输出规则：**
- 攻略发现 + 美团验证完成后，综合输出一份干净完整的推荐
- 标注清楚：哪些是"社区口碑好 + 数据验证过"的，哪些是"仅数据评分高"的
- 对比用表格，标注数据来源（知乎攻略/美团数据）
- 如果某轮搜索结果为空，换关键词重试一次，仍为空则跳过

### 3. 搜索必要性判断
- 如果需要搜索 → 直接返回 tool_calls，不要输出文本
- 如果是纯需求收集、确认信息、闲聊 → 输出 "NO_SEARCH_NEEDED"
- 不确定是否需要搜的时候，宁可搜一下`

// ─── 清洗部分模型可能输出的内部标记 ─────────────

function cleanDSML(content: string): string {
  if (!content) return content
  return content.replace(/<[｜|]+DSML[｜|]+tool_calls>[\s\S]*?<\/[｜|]*DSML[｜|]*tool_calls>/g, '').trim()
}

// ─── 后置校验（兜底安全网）──────────────

function validateResponse(content: string): string | null {
  if (!content) return null

  const hasSpecificName = /(?:酒店|餐厅|饭店|景点|民宿|客栈)\s*[：:]*\s*['"「]?[一-鿿]{2,15}/.test(content)
  const hasPrice = /¥\d+|\d+元.*[一晚起]|\d+起.*晚|价格.*\d+元|均价.*\d+|(\d{3,}).*[一晚起]/.test(content)
  const hasRating = /评分\s*\d|评星|星级|\d\.\d分/.test(content)
  const hasRecommendation = /推荐|建议.*住|建议.*吃|建议.*去|建议.*选|必去|必吃|必住|首选|不错.*可以|适合.*住/.test(content)
  const hasWeatherClaim = /天气|温度|气温|下雨|晴天|阴天|湿度|风力/.test(content)

  if (hasWeatherClaim && content.length > 100) {
    return '你在回复中提到了天气信息，但未先调用 get_weather 获取真实数据。请先查天气再回答。'
  }

  if ((hasSpecificName || hasPrice || hasRating) && hasRecommendation) {
    return '你在回复中推荐了具体酒店/餐厅/景点或提到了价格评分，但没有先调用工具搜索真实数据。请先搜索再回答，工具返回空结果则如实告知用户。'
  }

  return null
}

// ─── 工具定义 ─────────────────────────

const TOOLS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'search_hotels',
      description: '搜索目的地酒店。返回酒店列表，包含名称、价格、评分、区域、特色、图片和预订链接。',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '搜索关键词，如"杭州酒店"、"亲子酒店"' },
          city: { type: 'string', description: '城市名称，如"杭州"、"北京"' },
        },
        required: ['keyword', 'city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '获取指定城市的天气信息，包含实时天气和未来几天预报。',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: '城市名称或高德行政区划代码，如"杭州"、"330100"、"北京"' },
        },
        required: ['city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_attractions',
      description: '搜索目的地的景点、餐厅、美食、购物等POI信息。搜餐厅/美食时设置types="餐饮服务"，搜景点设置types="风景名胜"，搜购物设置types="购物服务"。',
      parameters: {
        type: 'object',
        properties: {
          keywords: { type: 'string', description: '搜索关键词，如"火锅"、"海鲜"、"景点"、"购物中心"、"回民街美食"' },
          city: { type: 'string', description: '城市名称' },
          types: { type: 'string', description: 'POI类型：餐饮服务（餐厅美食）、风景名胜（景点）、购物服务（商场免税店）、体育休闲服务' },
        },
        required: ['keywords', 'city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_zhihu',
      description: '搜索知乎社区真实口碑和体验。搜酒店评价用"XX酒店 测评/避坑"，搜美食推荐用"XX城市美食 推荐/踩雷"，搜景点攻略用"XX景点 攻略/值得去吗"。返回用户真实评价、点赞数、作者信誉。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词，如"杭州西湖酒店 值得去吗"、"西安必吃餐厅 推荐"、"亲子酒店 避坑"' },
          count: { type: 'number', description: '返回条数，默认5，最大10' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_route',
      description: '获取两地之间的路线规划，包含距离、耗时和导航步骤。',
      parameters: {
        type: 'object',
        properties: {
          origin: { type: 'string', description: '起点坐标或地址，如"116.48,39.91"或"杭州东站"' },
          destination: { type: 'string', description: '终点坐标或地址' },
          mode: { type: 'string', description: '出行方式：driving（驾车）或 walking（步行）', enum: ['driving', 'walking'] },
        },
        required: ['origin', 'destination', 'mode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_requirements_md',
      description: '更新用户旅行需求文档（Markdown格式）。每次了解新需求后调用，保持文档实时更新。',
      parameters: {
        type: 'object',
        properties: {
          session_id: { type: 'string', description: '会话ID' },
          content: { type: 'string', description: '完整的Markdown格式需求文档内容，包含所有已收集的需求信息' },
        },
        required: ['session_id', 'content'],
      },
    },
  },
]

// ─── 工具实现 ─────────────────────────

async function executeTool(name: string, args: Record<string, unknown>, sessionId: string): Promise<unknown> {
  switch (name) {
    case 'search_hotels': {
      const { keyword, city } = args as { keyword: string; city: string }
      const markdown = await searchHotels(keyword, city)
      const { hotels, areas } = parseHotelList(markdown)
      // 过滤：价格>0 且有评分
      const valid = hotels.filter(isValidHotel)
      const sorted = sortHotelsForRecommendation(valid)
      return {
        hotels: sorted.slice(0, 8).map(h => ({
          name: h.name,
          area: h.area,
          priceMin: h.priceMin,
          rating: h.rating,
          features: h.features.filter(f => f.length > 0 && f.length < 20).slice(0, 8),
          imageUrl: h.imageUrl,
          bookingUrl: h.bookingUrl,
        })),
        areas,
        total: valid.length,
        filtered: hotels.length - valid.length,
      }
    }

    case 'get_weather': {
      const { city } = args as { city: string }
      const data = await getWeather(city)
      return data
    }

    case 'search_attractions': {
      const { keywords, city, types } = args as { keywords: string; city: string; types?: string }
      const pois = await searchPOI(keywords, city, types)
      return pois.slice(0, 15).map(p => ({
        name: p.name,
        type: p.type,
        address: p.address,
        location: p.location,
        rating: p.rating,
      }))
    }

    case 'search_zhihu': {
      const { query, count } = args as { query: string; count?: number }
      const items = await searchZhihu(query, count || 5)

      // URL 去重：过滤掉本 session 已展示过的结果
      const seenUrls = getSeenUrls(sessionId)
      const fresh = items.filter(item => !seenUrls.has(item.Url))

      // 记录本次搜索
      const resultUrls = fresh.map(item => item.Url)
      addSearchRecord(sessionId, query, resultUrls)

      return fresh.map(item => ({
        title: item.Title,
        type: item.ContentType,
        author: item.AuthorName,
        authorBadge: item.AuthorBadgeText || undefined,
        authority: item.AuthorityLevel,
        votes: item.VoteUpCount,
        comments: item.CommentCount,
        content: item.ContentText,
        url: item.Url,
      }))
    }

    case 'get_route': {
      const { origin, destination, mode } = args as { origin: string; destination: string; mode: string }
      const route = mode === 'walking'
        ? await getWalkingRoute(origin, destination)
        : await getDrivingRoute(origin, destination)
      return {
        distance: route.distance,
        duration: route.duration,
        tolls: route.tolls,
        summary: route.steps.slice(0, 5).map(s => s.instruction),
      }
    }

    case 'update_requirements_md': {
      const { session_id, content } = args as { session_id: string; content: string }
      const dir = path.join(process.cwd(), 'public', 'requirements')
      await mkdir(dir, { recursive: true })
      await writeFile(path.join(dir, `${session_id}.md`), content, 'utf-8')
      return { saved: true, path: `/requirements/${session_id}.md` }
    }

    default:
      return { error: `未知工具: ${name}` }
  }
}

// ─── OpenAI-compatible LLM API 调用 ────────────────

const LLM_API_KEY = process.env.LLM_API_KEY || ''
const LLM_BASE_URL = process.env.LLM_BASE_URL || ''
const LLM_MODEL = process.env.LLM_MODEL || ''

async function callLLM(
  messages: ChatMessage[],
  tools?: ToolDef[],
  toolChoice?: string,
): Promise<{ content: string; toolCalls: ToolCall[] }> {
  if (!LLM_API_KEY) {
    throw new Error('缺少 LLM_API_KEY，请在 .env.local 中配置 OpenAI-compatible 大模型 API Key')
  }
  if (!LLM_BASE_URL || !LLM_MODEL) {
    throw new Error('缺少 LLM_BASE_URL 或 LLM_MODEL，请在 .env.local 中配置模型服务地址和模型名称')
  }

  const body: Record<string, unknown> = {
    model: LLM_MODEL,
    messages,
    max_tokens: 4096,
    temperature: 0.7,
  }
  if (tools) {
    body.tools = tools
    if (toolChoice) body.tool_choice = toolChoice
  }

  const res = await fetch(`${LLM_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`LLM API 错误 ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  const choice = data.choices?.[0]
  if (!choice) throw new Error('LLM 返回空响应')

  return {
    content: cleanDSML(choice.message?.content || ''),
    toolCalls: choice.message?.tool_calls || [],
  }
}

// ─── Agent 主循环 (Generator) ──────────

export async function* runAgent(
  sessionId: string,
  userMessage: string,
  history: ChatMessage[],
): AsyncGenerator<StreamEvent> {
  // 注入 session ID 到系统提示
  const systemWithSession = SYSTEM_PROMPT + `\n\n## 当前会话\n会话ID: ${sessionId}\n调用 update_requirements_md 时使用此 session_id。`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemWithSession },
    ...history,
    { role: 'user', content: userMessage },
  ]

  // ── 多轮预搜索（美团 → 社区 → 美团补搜）──
  const searchedKws = getSearchedKeywords(sessionId)
  const searchMemory = searchedKws.length > 0
    ? `\n\n### 本会话已搜索过的关键词（不要重复搜相同或近似的）\n${searchedKws.map(k => `- ${k}`).join('\n')}\n\n如果用户追问的是已搜过话题的细节，请换一个更具体/不同角度的关键词，或判断不需要再搜。`
    : ''

  const preMessages: ChatMessage[] = [
    { role: 'system', content: systemWithSession + '\n\n' + PRE_SEARCH_PROMPT + searchMemory },
    ...history,
    { role: 'user', content: userMessage },
  ]

  for (let psTurn = 0; psTurn < 2; psTurn++) {
    let decision: { content: string; toolCalls: ToolCall[] }
    try {
      decision = await callLLM(preMessages, TOOLS)
    } catch (err: unknown) {
      yield { type: 'error', content: getErrorMessage(err, '预搜索失败') }
      return
    }

    if (decision.toolCalls.length === 0) {
      if (psTurn === 0 && decision.content && decision.content !== 'NO_SEARCH_NEEDED') {
        // 第一轮就判断信息不足，直接追问
        yield { type: 'text', content: decision.content }
        yield { type: 'done' }
        return
      }
      // 后续轮次没有工具调用，搜索链结束
      break
    }

    const preAssistant: ChatMessage = {
      role: 'assistant',
      content: '',
      tool_calls: decision.toolCalls,
    }
    preMessages.push(preAssistant)

    for (const tc of decision.toolCalls) {
      const fnName = tc.function.name
      let fnArgs: Record<string, unknown> = {}
      try { fnArgs = JSON.parse(tc.function.arguments) } catch { fnArgs = {} }

      yield { type: 'tool_call', name: fnName, args: fnArgs }
      let result: unknown
      try {
        result = await executeTool(fnName, fnArgs, sessionId)
      } catch (err: unknown) {
        result = { error: getErrorMessage(err, '工具调用失败') }
      }
      yield { type: 'tool_result', name: fnName, result }

      preMessages.push({
        role: 'tool',
        tool_call_id: tc.id,
        name: fnName,
        content: JSON.stringify(result),
      })
    }
  }

  // 将预搜索中新增的消息合并到主消息列表（跳过 system、history、user，只合并 assistant 和 tool）
  const preSkipCount = 2 + history.length // system + history + user
  if (preMessages.length > preSkipCount) {
    messages.push(...preMessages.slice(preSkipCount))
  }

  // Agent 循环（最多3轮工具调用）
  let retryCount = 0
  for (let turn = 0; turn < 3; turn++) {
    // 调用大模型
    let response: { content: string; toolCalls: ToolCall[] }
    try {
      response = await callLLM(messages, TOOLS, turn === 0 ? 'auto' : undefined)
    } catch (err: unknown) {
      yield { type: 'error', content: getErrorMessage(err, '模型调用失败') }
      return
    }

    // 如果没有工具调用，说明搜索完成，先校验再输出最终文本
    if (response.toolCalls.length === 0) {
      const violation = validateResponse(response.content)
      if (violation && retryCount < 2) {
        retryCount++
        messages.push({
          role: 'user',
          content: `[系统反馈] ${violation} 请重新回答，必须基于工具数据。这是第${retryCount}次提醒。`,
        })
        continue
      }
      if (response.content) {
        yield { type: 'text', content: response.content }
      }
      yield { type: 'done' }
      return
    }

    // 还有工具调用，继续搜索（中间文本不输出给用户，避免搜索还在后面）
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: response.content || '',
      tool_calls: response.toolCalls,
    }
    messages.push(assistantMsg)

    for (const tc of response.toolCalls) {
      const fnName = tc.function.name
      let fnArgs: Record<string, unknown> = {}
      try {
        fnArgs = JSON.parse(tc.function.arguments)
      } catch {
        fnArgs = {}
      }

      yield { type: 'tool_call', name: fnName, args: fnArgs }

      let result: unknown
      try {
        result = await executeTool(fnName, fnArgs, sessionId)
      } catch (err: unknown) {
        result = { error: getErrorMessage(err, '工具调用失败') }
      }

      yield { type: 'tool_result', name: fnName, result }

      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        name: fnName,
        content: JSON.stringify(result),
      })
    }
  }

  // 循环结束仍未输出文本，强制做一次不带工具的纯文本生成
  try {
    const finalResponse = await callLLM(messages)
    if (finalResponse.content) {
      yield { type: 'text', content: finalResponse.content }
    }
  } catch (err: unknown) {
    yield { type: 'error', content: getErrorMessage(err, '最终回复生成失败') }
    return
  }

  yield { type: 'done' }
}

// ─── Session 管理 ──────────────────────

const sessions = new Map<string, ChatMessage[]>()

export function getSession(id: string): ChatMessage[] {
  return sessions.get(id) || []
}

export function setSession(id: string, messages: ChatMessage[]) {
  sessions.set(id, messages)
}

export function deleteSession(id: string) {
  sessions.delete(id)
  searchHistory.delete(id)
}

// ─── 搜索历史（去重用）──────────────────

interface SearchRecord {
  keyword: string
  urls: string[]
  ts: number
}

const searchHistory = new Map<string, SearchRecord[]>()

function getSearchHistory(sessionId: string): SearchRecord[] {
  return searchHistory.get(sessionId) || []
}

function addSearchRecord(sessionId: string, keyword: string, urls: string[]) {
  const records = getSearchHistory(sessionId)
  records.push({ keyword, urls, ts: Date.now() })
  searchHistory.set(sessionId, records)
}

function getSeenUrls(sessionId: string): Set<string> {
  const records = getSearchHistory(sessionId)
  const urls = new Set<string>()
  for (const r of records) r.urls.forEach(u => urls.add(u))
  return urls
}

function getSearchedKeywords(sessionId: string): string[] {
  return getSearchHistory(sessionId).map(r => r.keyword)
}
