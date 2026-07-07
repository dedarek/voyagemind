import { NextResponse } from 'next/server'
import { getDrivingRoute, getWalkingRoute } from '@/lib/amap-api'
import { getErrorMessage } from '@/lib/errors'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = searchParams.get('origin') || ''
  const destination = searchParams.get('destination') || ''
  const type = searchParams.get('type') || 'driving'

  if (!origin || !destination) {
    return NextResponse.json({ error: '缺少 origin 或 destination 参数' }, { status: 400 })
  }

  try {
    const route = type === 'walking'
      ? await getWalkingRoute(origin, destination)
      : await getDrivingRoute(origin, destination)
    return NextResponse.json(route)
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error, '路线规划失败') }, { status: 500 })
  }
}
