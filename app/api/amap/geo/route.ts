import { NextResponse } from 'next/server'
import { geoCode } from '@/lib/amap-api'
import { getErrorMessage } from '@/lib/errors'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')
  const city = searchParams.get('city') || ''

  if (!address) {
    return NextResponse.json({ error: '缺少 address 参数' }, { status: 400 })
  }

  try {
    const result = await geoCode(address, city)
    return NextResponse.json(result)
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error, '地理编码失败') }, { status: 500 })
  }
}
