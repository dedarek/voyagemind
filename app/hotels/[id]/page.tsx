'use client'

/* eslint-disable @next/next/no-img-element */

import { Star, MapPin, ExternalLink, ArrowLeft } from 'lucide-react'
import type { Hotel } from '@/types/hotel'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function HotelDetailPage() {
  const params = useParams()
  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const name = params.id as string
    if (!name) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')
      fetch(`/api/hotels/${encodeURIComponent(name)}`, { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          if (data.error) throw new Error(data.error)
          setHotel(data)
        })
        .catch(err => {
          if (err instanceof Error && err.name !== 'AbortError') setError(err.message)
        })
        .finally(() => setLoading(false))
    }, 0)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-64 w-full rounded-xl" />
        <div className="skeleton h-8 w-64 rounded" />
        <div className="skeleton h-4 w-96 rounded" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-600">{error}</p>
        <Link href="/hotels" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          返回搜索结果
        </Link>
      </div>
    )
  }

  if (!hotel) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-500">酒店未找到</p>
        <Link href="/hotels" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          返回搜索结果
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/hotels"
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600"
      >
        <ArrowLeft className="h-4 w-4" />
        返回搜索结果
      </Link>

      {/* 主图 */}
      <div className="overflow-hidden rounded-xl bg-slate-100">
        {hotel.imageUrl ? (
          <img
            src={hotel.imageUrl}
            alt={hotel.name}
            className="h-64 w-full object-cover md:h-80"
          />
        ) : (
          <div className="flex h-64 items-center justify-center text-slate-300">暂无图片</div>
        )}
      </div>

      {/* 基本信息 */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{hotel.name}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {hotel.area}
              </span>
              {hotel.rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {hotel.rating} {hotel.ratingLabel || ''}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            {hotel.priceMin > 0 && (
              <div className="text-2xl font-bold text-blue-600">
                ¥{hotel.priceMin}
                <span className="text-sm font-normal text-slate-400">起/晚</span>
              </div>
            )}
            {hotel.bookingUrl && (
              <a
                href={hotel.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
              >
                预订 <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 特色标签 */}
      {hotel.features.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {hotel.features.map(f => (
            <span key={f} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{f}</span>
          ))}
        </div>
      )}

      {/* 优惠券 */}
      {hotel.coupons.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-medium text-red-600">优惠信息</p>
          {hotel.coupons.map((c, i) => (
            <p key={i} className="text-sm text-red-500">{c}</p>
          ))}
        </div>
      )}

      {/* 地图 */}
      {hotel.latitude && hotel.longitude && (
        <div className="space-y-2">
          <h2 className="font-semibold">位置</h2>
          <div className="h-48 overflow-hidden rounded-xl bg-slate-100">
            <img
              src={`https://restapi.amap.com/v3/staticmap?location=${hotel.longitude},${hotel.latitude}&zoom=14&size=600*300&markers=mid,0xFF0000,A:${hotel.longitude},${hotel.latitude}&key=${process.env.NEXT_PUBLIC_AMAP_MAPS_API_KEY || ''}`}
              alt="酒店位置"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      )}

      {/* 附近景点 */}
      {hotel.nearbyPOIs && hotel.nearbyPOIs.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold">附近景点 & 设施</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {hotel.nearbyPOIs.slice(0, 6).map(poi => (
              <div key={poi.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm font-medium">{poi.name}</p>
                <p className="text-xs text-slate-400">{poi.type}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
