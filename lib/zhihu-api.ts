const ZHIHU_BASE = 'https://developer.zhihu.com/api/v1/content'
const ZHIHU_KEY = process.env.ZHIHU_API_KEY || ''

export interface ZhihuSearchItem {
  Title: string
  ContentType: string       // Answer | Article
  ContentID: string
  ContentText: string
  Url: string
  CommentCount: number
  VoteUpCount: number
  AuthorName: string
  AuthorAvatar: string
  AuthorBadge: string
  AuthorBadgeText: string
  AuthorityLevel: string    // "1" = normal user, higher = more authoritative
  RankingScore: number
  CommentInfoList?: { Content: string }[]
}

interface ZhihuSearchResponse {
  Code: number
  Message: string
  Data: {
    HasMore: boolean
    Items: ZhihuSearchItem[]
  }
}

function headers(): Record<string, string> {
  if (!ZHIHU_KEY) {
    throw new Error('缺少 ZHIHU_API_KEY，请在 .env.local 中配置知乎开放平台密钥')
  }

  return {
    Authorization: `Bearer ${ZHIHU_KEY}`,
    'X-Request-Timestamp': String(Math.floor(Date.now() / 1000)),
    'Content-Type': 'application/json',
  }
}

export async function searchZhihu(query: string, count = 5): Promise<ZhihuSearchItem[]> {
  const params = new URLSearchParams({ Query: query, Count: String(Math.min(count, 10)) })
  const url = `${ZHIHU_BASE}/zhihu_search?${params.toString()}`

  const res = await fetch(url, { headers: headers() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`知乎搜索失败 ${res.status}: ${text.slice(0, 200)}`)
  }

  const data: ZhihuSearchResponse = await res.json()
  if (data.Code !== 0) {
    throw new Error(`知乎 API 错误 ${data.Code}: ${data.Message}`)
  }

  return (data.Data?.Items || []).map(item => ({
    ...item,
    ContentText: item.ContentText.slice(0, 500), // 截断长文本
  }))
}

export async function searchGlobal(query: string, count = 5): Promise<ZhihuSearchItem[]> {
  const params = new URLSearchParams({ Query: query, Count: String(Math.min(count, 20)) })
  const url = `${ZHIHU_BASE}/global_search?${params.toString()}`

  const res = await fetch(url, { headers: headers() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`全网搜索失败 ${res.status}: ${text.slice(0, 200)}`)
  }

  const data: ZhihuSearchResponse = await res.json()
  if (data.Code !== 0) {
    throw new Error(`知乎 API 错误 ${data.Code}: ${data.Message}`)
  }

  return (data.Data?.Items || []).map(item => ({
    ...item,
    ContentText: item.ContentText.slice(0, 500),
  }))
}

export async function getHotList(limit = 10): Promise<ZhihuSearchItem[]> {
  const params = new URLSearchParams({ Limit: String(Math.min(limit, 30)) })
  const url = `${ZHIHU_BASE}/hot_list?${params.toString()}`

  const res = await fetch(url, { headers: headers() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`热榜获取失败 ${res.status}: ${text.slice(0, 200)}`)
  }

  const data: ZhihuSearchResponse = await res.json()
  if (data.Code !== 0) {
    throw new Error(`知乎 API 错误 ${data.Code}: ${data.Message}`)
  }

  return data.Data?.Items || []
}
