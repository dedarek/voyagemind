'use client'

import { useState } from 'react'
import { Plus, Trash2, Sun } from 'lucide-react'

interface Activity {
  id: string
  time: string
  title: string
  location: string
  note: string
}

interface DayPlan {
  id: string
  day: number
  title: string
  activities: Activity[]
}

export default function ItineraryPage() {
  const [days, setDays] = useState<DayPlan[]>([
    {
      id: '1', day: 1, title: '第一天',
      activities: [
        { id: 'a1', time: '14:00', title: '抵达目的地，入住酒店', location: '酒店', note: '' },
        { id: 'a2', time: '18:00', title: '晚餐与周边散步', location: '酒店周边', note: '' },
      ],
    },
    {
      id: '2', day: 2, title: '第二天',
      activities: [
        { id: 'a3', time: '09:00', title: '亚龙湾沙滩', location: '亚龙湾', note: '' },
        { id: 'a4', time: '12:00', title: '午餐', location: '亚龙湾', note: '' },
        { id: 'a5', time: '15:00', title: '热带天堂森林公园', location: '亚龙湾', note: '' },
      ],
    },
  ])

  const addDay = () => setDays([...days, { id: String(Date.now()), day: days.length + 1, title: `第${days.length + 1}天`, activities: [] }])

  const removeDay = (id: string) => setDays(days.filter(d => d.id !== id))

  const addActivity = (dayId: string) => setDays(days.map(d =>
    d.id !== dayId ? d : { ...d, activities: [...d.activities, { id: String(Date.now()), time: '', title: '', location: '', note: '' }] }
  ))

  const updateActivity = (dayId: string, activityId: string, field: keyof Activity, value: string) => setDays(days.map(d =>
    d.id !== dayId ? d : { ...d, activities: d.activities.map(a => a.id === activityId ? { ...a, [field]: value } : a) }
  ))

  const removeActivity = (dayId: string, activityId: string) => setDays(days.map(d =>
    d.id !== dayId ? d : { ...d, activities: d.activities.filter(a => a.id !== activityId) }
  ))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">行程规划</h1>
        <button onClick={addDay} className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> 添加天数
        </button>
      </div>
      {days.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Sun className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-slate-500">还没有行程</p>
          <p className="text-sm text-slate-400">点击上方按钮添加行程天数</p>
        </div>
      )}
      <div className="space-y-4">
        {days.map(day => (
          <div key={day.id} className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="font-semibold">{day.title}</h2>
              <button onClick={() => removeDay(day.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2 p-4">
              {day.activities.map((activity, i) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">{i + 1}</div>
                    {i < day.activities.length - 1 && <div className="h-full w-px bg-slate-200" />}
                  </div>
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <input type="text" value={activity.time} onChange={e => updateActivity(day.id, activity.id, 'time', e.target.value)} placeholder="时间" className="w-16 rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-blue-300" />
                    <input type="text" value={activity.title} onChange={e => updateActivity(day.id, activity.id, 'title', e.target.value)} placeholder="活动内容" className="min-w-[120px] flex-1 rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-300" />
                    <input type="text" value={activity.location} onChange={e => updateActivity(day.id, activity.id, 'location', e.target.value)} placeholder="地点" className="w-24 rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-blue-300" />
                    <button onClick={() => removeActivity(day.id, activity.id)} className="text-red-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
              <button onClick={() => addActivity(day.id)} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"><Plus className="h-3 w-3" /> 添加活动</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
