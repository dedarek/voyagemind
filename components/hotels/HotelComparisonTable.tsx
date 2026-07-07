'use client'

import { Star, MapPin } from 'lucide-react'
import type { Hotel } from '@/types/hotel'

interface Props {
  hotels: Hotel[]
}

export default function HotelComparisonTable({ hotels }: Props) {
  if (hotels.length < 2) return null

  const rows: { label: string; render: (h: Hotel) => React.ReactNode }[] = [
    {
      label: '价格',
      render: h => (h.priceMin > 0 ? `¥${h.priceMin}起/晚` : '-'),
    },
    {
      label: '评分',
      render: h =>
        h.rating > 0 ? (
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {h.rating}
          </span>
        ) : (
          '-'
        ),
    },
    {
      label: '区域',
      render: h => (
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-slate-400" />
          {h.area}
        </span>
      ),
    },
    {
      label: '特色',
      render: h =>
        h.features.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {h.features.map(f => (
              <span key={f} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                {f}
              </span>
            ))}
          </div>
        ) : (
          '-'
        ),
    },
    {
      label: '优惠',
      render: h =>
        h.coupons.length > 0 ? (
          <div className="space-y-1">
            {h.coupons.map((c, i) => (
              <p key={i} className="text-xs text-red-500">
                {c}
              </p>
            ))}
          </div>
        ) : (
          '-'
        ),
    },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="w-20 px-3 py-2 text-left text-xs font-medium text-slate-400">项目</th>
            {hotels.map(h => (
              <th key={h.id} className="min-w-[140px] px-3 py-2 text-left text-sm font-semibold">
                {h.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.label} className="border-t border-slate-100">
              <td className="whitespace-nowrap px-3 py-3 text-xs font-medium text-slate-400">{row.label}</td>
              {hotels.map(h => (
                <td key={h.id} className="px-3 py-3">
                  {row.render(h)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
