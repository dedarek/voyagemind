import { NextResponse } from 'next/server'
import { searchPOI } from '@/lib/amap-api'
import { getErrorMessage } from '@/lib/errors'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const keywords = searchParams.get('keywords') || ''
  const city = searchParams.get('city') || '三亚'
  const types = searchParams.get('types') || ''
  const location = searchParams.get('location') || ''

  try {
    const pois = await searchPOI(keywords, city, types, location)
    return NextResponse.json({ pois })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error, '地点搜索失败') }, { status: 500 })
  }
}
