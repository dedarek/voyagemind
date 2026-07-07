export interface POI {
  id: string
  name: string
  type: string
  address: string
  location: [number, number]
  distance?: number
  rating?: string
  photos?: string[]
}

export interface GeoResult {
  formattedAddress: string
  location: [number, number]
  province: string
  city: string
  district: string
}

export interface WeatherLive {
  city: string
  weather: string
  temperature: string
  windDirection: string
  windPower: string
  humidity: string
  reportTime: string
}

export interface WeatherForecast {
  date: string
  week: string
  dayWeather: string
  nightWeather: string
  dayTemp: string
  nightTemp: string
  dayWind: string
  nightWind: string
}

export interface RouteResult {
  distance: number
  duration: number
  tolls: number
  steps: { instruction: string; distance: number; duration: number }[]
}

export interface AmapApiResponse<T> {
  status: string
  info: string
  count?: string
  data?: T
}
