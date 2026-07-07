'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Filter } from 'lucide-react'
import HotelCard, { HotelCardSkeleton } from '@/components/hotels/HotelCard'
import HotelComparisonTable from '@/components/hotels/HotelComparisonTable'
import type { Hotel, HotelSearchResponse } from '@/types/hotel'
import { Suspense } from 'react'

function HotelSearchContent() {
  const searchParams = useSearchParams()
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '三亚酒店')
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [areas, setAreas] = useState<{ name: string; count: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedArea, setSelectedArea] = useState('')
  const [compareList, setCompareList] = useState<Hotel[]>([])
  const [showCompare, setShowCompare] = useState(false)

  const search = useCallback(async (kw: string) => {
    if (!kw.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/hotels/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw }),
      })
      const data: HotelSearchResponse & { error?: string } = await res.json()
      if (data.error) throw new Error(data.error)
      setHotels(data.hotels)
      setAreas(data.areas)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '搜索失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      search(keyword)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [search, keyword])

  const filteredHotels = selectedArea
    ? hotels.filter(h => h.area === selectedArea)
    : hotels

  const handleCompare = (hotel: Hotel) => {
    setCompareList(prev => {
      const exists = prev.find(h => h.id === hotel.id)
      if (exists) return prev.filter(h => h.id !== hotel.id)
      if (prev.length >= 4) return prev
      return [...prev, hotel]
    })
  }

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
          <Search className="ml-1 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search(keyword)}
            placeholder="搜索酒店..."
            className="flex-1 border-none bg-transparent text-sm outline-none"
          />
        </div>
        <button
          onClick={() => search(keyword)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          搜索
        </button>
      </div>

      {/* 区域筛选 */}
      {areas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedArea('')}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              !selectedArea ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            全部 ({hotels.length})
          </button>
          {areas.map(a => (
            <button
              key={a.name}
              onClick={() => setSelectedArea(a.name)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                selectedArea === a.name ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {a.name} ({a.count})
            </button>
          ))}
        </div>
      )}

      {/* 比价栏 */}
      {compareList.length >= 2 && (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
          <span className="text-sm text-blue-700">已选 {compareList.length} 家酒店</span>
          <button
            onClick={() => setShowCompare(true)}
            className="rounded-lg bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
          >
            对比
          </button>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => search(keyword)}
            className="mt-2 rounded-lg bg-red-600 px-4 py-1.5 text-sm text-white hover:bg-red-700"
          >
            重试
          </button>
        </div>
      )}

      {/* 加载中 */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <HotelCardSkeleton key={i} />)}
        </div>
      )}

      {/* 空状态 */}
      {!loading && !error && filteredHotels.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Filter className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-slate-500">没有找到匹配的酒店</p>
          <p className="text-sm text-slate-400">试试其他关键词或区域</p>
        </div>
      )}

      {/* 酒店列表 */}
      {!loading && filteredHotels.length > 0 && (
        <div className="space-y-3">
          {filteredHotels.map(hotel => (
            <HotelCard
              key={hotel.id}
              hotel={hotel}
              onCompare={handleCompare}
              selected={!!compareList.find(h => h.id === hotel.id)}
            />
          ))}
        </div>
      )}

      {/* 比价弹窗 */}
      {showCompare && compareList.length >= 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">酒店对比</h2>
              <button
                onClick={() => setShowCompare(false)}
                className="rounded-lg px-3 py-1 text-sm text-slate-500 hover:bg-slate-100"
              >
                关闭
              </button>
            </div>
            <HotelComparisonTable hotels={compareList} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function HotelsPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">酒店搜索</h1>
      <Suspense fallback={<div className="space-y-3">{[1, 2, 3].map(i => <HotelCardSkeleton key={i} />)}</div>}>
        <HotelSearchContent />
      </Suspense>
    </div>
  )
}
