import { readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const API_BASE = 'https://mcp-open-cater.meituan.com/v1/api/voyage/openapi/query'

function getToken(): string {
  if (process.env.MEITUAN_TRAVEL_TOKEN) return process.env.MEITUAN_TRAVEL_TOKEN

  const configPath = join(homedir(), '.config/meituan-travel/config.json')
  const config = JSON.parse(readFileSync(configPath, 'utf8'))
  return config.key || config.Authorization
}

export async function searchHotels(keyword: string, city = '杭州'): Promise<string> {
  const token = getToken()

  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ city, query: keyword }),
  })

  if (!res.ok) {
    throw new Error(`美团 API 错误 ${res.status}: ${res.statusText}`)
  }

  const json = await res.json()
  if (json.code !== 0) {
    throw new Error(json.msg || '美团查询失败')
  }

  return json.data || ''
}
