'use client'

/* eslint-disable @next/next/no-img-element */

import { Star, MapPin, ChevronRight } from 'lucide-react'
import type { Hotel } from '@/types/hotel'
import Link from 'next/link'

interface HotelCardProps {
  hotel: Hotel
  onCompare?: (hotel: Hotel) => void
  selected?: boolean
}

export default function HotelCard({ hotel, onCompare, selected }: HotelCardProps) {
  return (
    <div className={`rounded-xl border bg-white p-4 transition-all hover:shadow-md ${selected ? 'border-blue-400 ring-1 ring-blue-400' : 'border-slate-200'}`}>
      <div className="flex gap-4">
        <div className="h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-100">
          {hotel.imageUrl ? (
            <img
              src={hotel.imageUrl}
              alt={hotel.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-300 text-sm">无图</div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <Link href={`/hotels/${encodeURIComponent(hotel.name)}`} className="hover:text-blue-600">
              <h3 className="font-semibold text-base leading-tight">{hotel.name}</h3>
            </Link>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <MapPin className="h-3 w-3" />
              <span>{hotel.area}</span>
              {hotel.rating > 0 && (
                <>
                  <Star className="h-3 w-3 text-amber-400" />
                  <span className="text-amber-600 font-medium">{hotel.rating}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              {hotel.priceMin > 0 && (
                <span className="text-lg font-bold text-blue-600">
                  ¥{hotel.priceMin}<span className="text-xs font-normal text-slate-400">起/晚</span>
                </span>
              )}
              <div className="mt-1 flex flex-wrap gap-1">
                {hotel.features.slice(0, 3).map(f => (
                  <span key={f} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{f}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onCompare && (
                <label className="flex cursor-pointer items-center gap-1 text-xs text-slate-400" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onCompare(hotel)}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                  比价
                </label>
              )}
              <Link
                href={`/hotels/${encodeURIComponent(hotel.name)}`}
                className="flex items-center gap-0.5 text-xs text-blue-600 hover:underline"
              >
                详情 <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      {hotel.coupons.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-100 pt-2">
          {hotel.coupons.map((c, i) => (
            <span key={i} className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-500">{c}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export function HotelCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex gap-4">
        <div className="skeleton h-24 w-32 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-5 w-48 rounded" />
          <div className="skeleton h-3 w-32 rounded" />
          <div className="skeleton h-6 w-20 rounded" />
        </div>
      </div>
    </div>
  )
}
