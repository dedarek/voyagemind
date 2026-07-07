export interface DayPlan {
  day: number
  date: string
  title: string
  activities: Activity[]
  meals: { breakfast?: string; lunch?: string; dinner?: string }
  accommodation?: string
  notes?: string
}

export interface Activity {
  time: string
  name: string
  type: 'attraction' | 'food' | 'transport' | 'shopping' | 'rest'
  poiId?: string
  location?: [number, number]
  duration: string
  cost?: number
  description?: string
}

export interface Itinerary {
  id: string
  title: string
  destination: string
  days: DayPlan[]
  totalBudget?: {
    accommodation: number
    food: number
    activities: number
    transport: number
  }
}
