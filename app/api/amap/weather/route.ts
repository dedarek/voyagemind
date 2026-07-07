import { NextResponse } from 'next/server'
import { getWeather } from '@/lib/amap-api'
import { getErrorMessage } from '@/lib/errors'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city') || '杭州'

  try {
    const weather = await getWeather(city)
    return NextResponse.json(weather)
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error, '天气查询失败') }, { status: 500 })
  }
}
