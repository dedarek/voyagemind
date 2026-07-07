import { NextResponse } from 'next/server'
import { searchHotels } from '@/lib/meituan-cli'
import { isValidHotel, parseHotelList, sortHotelsForRecommendation } from '@/lib/meituan-parser'
import { geoCode } from '@/lib/amap-api'
import { CITY_AREA_PRESETS, CITY_CENTERS } from '@/lib/city-presets'
import { getErrorMessage } from '@/lib/errors'
import type { Hotel, HotelSearchParams } from '@/types/hotel'
import NodeCache from 'node-cache'

const cache = new NodeCache({ stdTTL: 1800 }) // 30 分钟

export async function POST(request: Request) {
  try {
    const params: HotelSearchParams = await request.json()
    const city = params.city || '杭州'
    const keyword = params.keyword || `${city}酒店`

    // 检查缓存
    const cacheKey = `search:${city}:${keyword}`
    const cached = cache.get(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // 调美团 CLI
    const markdown = await searchHotels(keyword, city)

    // 解析
    const { hotels, areas } = parseHotelList(markdown)
    const validHotels = sortHotelsForRecommendation(hotels.filter(isValidHotel))

    if (validHotels.length === 0) {
      return NextResponse.json({
        hotels: [],
        areas: [],
        queryTime: new Date().toISOString(),
        filtered: hotels.length,
      })
    }

    // 地理编码（按区域批量）
    const areaGeos = new Map<string, { latitude: number; longitude: number }>()
    const uniqueAreas = [...new Set(validHotels.map(h => h.area))]
    for (const area of uniqueAreas) {
      const preset = (CITY_AREA_PRESETS[city] || []).find(a => area.includes(a.name) || a.name.includes(area))
      if (preset) {
        areaGeos.set(area, { latitude: preset.center[1], longitude: preset.center[0] })
      } else {
        try {
          const geo = await geoCode(`${city}${area}`, city)
          areaGeos.set(area, { latitude: geo.location[1], longitude: geo.location[0] })
        } catch {
          const center = CITY_CENTERS[city] || CITY_CENTERS.杭州
          areaGeos.set(area, { latitude: center[1], longitude: center[0] })
        }
      }
    }

    const enrichedHotels: Hotel[] = validHotels.map(h => {
      const geo = areaGeos.get(h.area)
      return {
        ...h,
        latitude: geo?.latitude,
        longitude: geo?.longitude,
      }
    })

    const result = {
      hotels: enrichedHotels,
      areas,
      filtered: hotels.length - validHotels.length,
      queryTime: new Date().toISOString(),
    }

    // 缓存
    cache.set(cacheKey, result)

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = getErrorMessage(error, '搜索失败')
    console.error('[search error]', message)
    return NextResponse.json(
      { error: message },
      { status: 500 },
    )
  }
}
