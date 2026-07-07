import { POI } from './amap'
import { XHSNote } from './xhs'

export type { POI, XHSNote }

export interface Hotel {
  id: string
  name: string
  area: string
  areaSubcategory?: string
  priceMin: number
  rating: number
  ratingLabel?: string
  imageUrl: string
  bookingUrl: string
  features: string[]
  coupons: string[]
  description: string
  // 高德补齐
  latitude?: number
  longitude?: number
  address?: string
  nearbyPOIs?: POI[]
  // 小红书
  xhsMentions?: XHSNote[]
}

export interface HotelSearchParams {
  keyword: string
  area?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
}

export interface HotelSearchResponse {
  hotels: Hotel[]
  areas: { name: string; count: number }[]
  queryTime: string
  raw?: string
}
