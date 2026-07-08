import type { Hotel } from '@/types/hotel'

const AREA_PATTERN = /##\s+([一二三四五六七八九十]+)[、.．]\s*([^·\n]+)(?:[··]([^\n]+))?/g

const HOTEL_BLOCK_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)\s*\n\s*\[(?:\*{1,2})?([^\]]+?)(?:\*{1,2})?\]\(([^)]+)\)/g

const PRICE_PATTERN = /[¥￥](\d+)\s*起\s*\/?\s*晚/
const RATING_PATTERN = /(?:美团真实评分|评分)[：:]?\s*(\d+(?:\.\d+)?)/
const FEATURE_PATTERN = /(?:开业|装修|新开业)[^。]*?(?:。|$)([^。]*(?:免费|服务|设施|停车|早餐|泳池|健身房|接送|海景|浴缸)[^。]*)?/
const MIN_REASONABLE_PRICE = 50

function cleanMarkdownText(value: string): string {
  return value
    .replace(/\\([()[\]{}*_`~])/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isUsefulFeature(value: string): boolean {
  const text = cleanMarkdownText(value)
  if (!text || text.length > 18) return false
  if (/如果你|比如|或者|当然|建议|升级|Skill|工具|推荐|搜索|需求|小团|完整功能|最佳体验|告诉|##/.test(text)) return false
  return true
}

export function isValidHotel(hotel: Hotel): boolean {
  return hotel.priceMin >= MIN_REASONABLE_PRICE && hotel.rating > 0 && Boolean(hotel.name)
}

export function sortHotelsForRecommendation(hotels: Hotel[]): Hotel[] {
  return [...hotels].sort((a, b) => {
    const ratingDiff = b.rating - a.rating
    if (Math.abs(ratingDiff) > 0.01) return ratingDiff
    return a.priceMin - b.priceMin
  })
}

export function parseHotelList(markdown: string): { hotels: Hotel[]; areas: { name: string; count: number }[] } {
  const hotels: Hotel[] = []

  const areaMatches = [...markdown.matchAll(AREA_PATTERN)]
  const areas: { name: string; count: number }[] = areaMatches.map(m => ({
    name: m[2].trim(),
    count: 0,
  }))

  const blocks = [...markdown.matchAll(HOTEL_BLOCK_PATTERN)]
  let areaIndex = 0

  for (let i = 0; i < blocks.length; i++) {
    const [, , imgUrl, name, bookingUrl] = blocks[i]
    const blockStart = blocks[i].index ?? 0

    while (areaIndex < areaMatches.length - 1 && (areaMatches[areaIndex + 1].index ?? 0) < blockStart) {
      areaIndex++
    }

    const currentArea = areaMatches[areaIndex] ? cleanMarkdownText(areaMatches[areaIndex][2]) : '未知区域'

    const blockEnd = i < blocks.length - 1 ? (blocks[i + 1].index ?? markdown.length) : markdown.length
    const blockText = markdown.slice(blockStart, blockEnd)

    const priceMatch = blockText.match(PRICE_PATTERN)
    const ratingMatch = blockText.match(RATING_PATTERN)

    const features: string[] = []
    const coupons: string[] = []

    const fcMatch = blockText.match(FEATURE_PATTERN)
    if (fcMatch?.[1]) {
      features.push(...fcMatch[1].split(/[，,、]/).map(cleanMarkdownText).filter(isUsefulFeature))
    }

    const couponMatch = blockText.match(/(?:积分可抵|优惠券|优惠)[：:]?\s*([^\n]+)/)
    if (couponMatch) {
      coupons.push(cleanMarkdownText(couponMatch[1]))
    }

    hotelMarkdownParser_commonFeatureExtract(blockText, features)

    const hotel: Hotel = {
      id: name.trim().toLowerCase().replace(/[^a-z0-9一-龥]/g, '-').slice(0, 50),
      name: cleanMarkdownText(name),
      area: currentArea,
      areaSubcategory: areaMatches[areaIndex]?.[3] ? cleanMarkdownText(areaMatches[areaIndex][3]) : undefined,
      priceMin: priceMatch ? parseInt(priceMatch[1]) : 0,
      rating: ratingMatch ? parseFloat(ratingMatch[1]) : 0,
      ratingLabel: ratingMatch ? '美团真实评分' : '',
      imageUrl: imgUrl,
      bookingUrl,
      features: [...new Set(features.map(cleanMarkdownText).filter(isUsefulFeature))],
      coupons: coupons.filter(Boolean),
      description: cleanMarkdownText(blockText.replace(/!\[.*?\]\(.*?\)\s*/g, '').replace(/\[.*?\]\(.*?\)/g, '')).slice(0, 200),
    }

    hotels.push(hotel)
  }

  // 统计每个区域的酒店数
  const areaCount = new Map<string, number>()
  hotels.forEach(h => {
    areaCount.set(h.area, (areaCount.get(h.area) || 0) + 1)
  })
  const uniqueAreas = [...new Set(hotels.map(h => h.area))].map(name => ({
    name,
    count: areaCount.get(name) || 0,
  }))

  return { hotels, areas: uniqueAreas.length > 0 ? uniqueAreas : areas }
}

function hotelMarkdownParser_commonFeatureExtract(text: string, features: string[]) {
  const commonFeatures = [
    '免费停车场', '机器人服务', '叫醒服务', '行李寄存', '24小时前台',
    '洗衣服务', '送餐服务', '健身室', '游泳池', '健身房',
    '接机服务', '海景房', '亲子', '情侣', '商务',
    '浴缸', '智能', '早餐', '接送', '海景', '阳台',
  ]
  commonFeatures.forEach(f => {
    if (text.includes(f) && !features.includes(f)) {
      features.push(cleanMarkdownText(f))
    }
  })
}
