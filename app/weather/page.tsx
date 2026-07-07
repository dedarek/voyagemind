'use client'

import { useCallback, useEffect, useState } from 'react'
import { Droplets, Wind, MapPin, Loader2 } from 'lucide-react'

interface WeatherLive {
  city: string
  weather: string
  temperature: string
  windDirection: string
  windPower: string
  humidity: string
  reportTime: string
}

interface WeatherForecast {
  date: string
  week: string
  dayWeather: string
  nightWeather: string
  dayTemp: string
  nightTemp: string
}

export default function WeatherPage() {
  const [city, setCity] = useState('杭州')
  const [live, setLive] = useState<WeatherLive | null>(null)
  const [forecast, setForecast] = useState<WeatherForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadWeather = useCallback((targetCity: string) => {
    setLoading(true)
    setError('')
    fetch(`/api/amap/weather?city=${encodeURIComponent(targetCity)}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setLive(data.live)
        setForecast(data.forecast || [])
      })
      .catch(err => setError(err instanceof Error ? err.message : '天气查询失败'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadWeather('杭州')
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadWeather])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  const weatherIcons: Record<string, string> = {
    '晴': '☀️', '多云': '⛅', '阴': '☁️', '小雨': '🌦️', '中雨': '🌧️',
    '大雨': '🌧️', '雷阵雨': '⛈️', '阵雨': '🌦️', '雾': '🌫️',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">天气查询</h1>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={city}
            onChange={e => setCity(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadWeather(city)}
            className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300"
            placeholder="城市"
          />
          <button
            onClick={() => loadWeather(city)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            查询
          </button>
        </div>
      </div>

      {/* 实时天气 */}
      {live && (
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-sky-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">{live.city || city} · 实时天气</p>
              <p className="mt-1 text-4xl font-bold">{live.temperature}°C</p>
              <p className="mt-1 text-lg text-slate-600">{live.weather}</p>
            </div>
            <div className="text-6xl">{weatherIcons[live.weather] || '🌤️'}</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-200 pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Wind className="h-4 w-4" />
              <span>{live.windDirection}风 {live.windPower}级</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Droplets className="h-4 w-4" />
              <span>湿度 {live.humidity}%</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <MapPin className="h-4 w-4" />
              <span>{live.city}</span>
            </div>
          </div>
        </div>
      )}

      {/* 预报 */}
      {forecast.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold">未来天气预报</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {forecast.map((day, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 text-center">
                <p className="text-sm font-medium">{day.week}</p>
                <p className="text-xs text-slate-400">{day.date}</p>
                <div className="my-2 text-2xl">{weatherIcons[day.dayWeather] || '🌤️'}</div>
                <p className="text-xs text-slate-500">{day.dayWeather}</p>
                <div className="mt-2 flex items-center justify-center gap-2 text-sm">
                  <span className="font-medium text-orange-500">{day.dayTemp}°</span>
                  <span className="text-slate-300">/</span>
                  <span className="text-blue-500">{day.nightTemp}°</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
