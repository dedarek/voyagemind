import { NextResponse } from 'next/server'
import { searchHotels } from '@/lib/meituan-cli'
import { isValidHotel, parseHotelList, sortHotelsForRecommendation } from '@/lib/meituan-parser'
import { geoCode, searchPOI } from '@/lib/amap-api'
import { CITY_AREA_PRESETS } from '@/lib/city-presets'
import { getErrorMessage } from '@/lib/errors'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params
    const { searchParams } = new URL(request.url)
    const keyword = decodeURIComponent(name)
    const city = searchParams.get('city') || '杭州'

    // 用酒店名重新搜索
    const markdown = await searchHotels(keyword, city)
    const { hotels } = parseHotelList(markdown)
    const validHotels = sortHotelsForRecommendation(hotels.filter(isValidHotel))

    // 找匹配的酒店
    const hotel = validHotels.find(h => h.name.includes(keyword) || keyword.includes(h.name))
    if (!hotel) {
      return NextResponse.json(validHotels[0] || null)
    }

    // 地理编码
    try {
      const preset = (CITY_AREA_PRESETS[city] || []).find(({ name }) => hotel.area.includes(name))

      if (preset) {
        hotel.longitude = preset.center[0]
        hotel.latitude = preset.center[1]
      } else {
        const geo = await geoCode(hotel.name, city)
        hotel.longitude = geo.location[0]
        hotel.latitude = geo.location[1]
      }
    } catch { /* 忽略地理编码失败 */ }

    // 附近 POI
    if (hotel.latitude && hotel.longitude) {
      try {
        const pois = await searchPOI(
          '景点|餐饮|购物',
          city,
          '',
          `${hotel.longitude},${hotel.latitude}`,
        )
        hotel.nearbyPOIs = pois.slice(0, 10)
      } catch { /* 忽略 POI 搜索失败 */ }
    }

    return NextResponse.json(hotel)
  } catch (error: unknown) {
    const message = getErrorMessage(error, '酒店详情获取失败')
    console.error('[hotel detail error]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
