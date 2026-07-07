const AMAP_KEY = process.env.AMAP_MAPS_API_KEY || ''
const BASE = 'https://restapi.amap.com/v3'

let lastAmapCall = 0

interface AmapBaseResponse {
  status: string
  info?: string
  infocode?: string
}

interface AmapGeocodeResponse extends AmapBaseResponse {
  geocodes?: {
    formatted_address: string
    location: string
    province: string
    city: string
    district: string
  }[]
}

interface AmapPoiResponse extends AmapBaseResponse {
  pois?: {
    id: string
    name: string
    type: string
    address: string | string[]
    location: string
    biz_ext?: { rating?: string }
    photos?: { url: string }[]
  }[]
}

interface AmapWeatherResponse extends AmapBaseResponse {
  lives?: {
    city: string
    weather: string
    temperature: string
    winddirection: string
    windpower: string
    humidity: string
    reporttime: string
  }[]
  forecasts?: {
    casts?: {
      date: string
      week: string
      dayweather: string
      nightweather: string
      daytemp: string
      nighttemp: string
    }[]
  }[]
}

type AmapForecastCast = NonNullable<NonNullable<AmapWeatherResponse['forecasts']>[number]['casts']>[number]
type AmapRouteStep = NonNullable<NonNullable<AmapRouteResponse['route']>['paths']>[number]['steps'] extends (infer T)[] | undefined ? T : never

interface AmapRouteResponse extends AmapBaseResponse {
  route?: {
    paths?: {
      distance: string
      duration: string
      tolls?: string
      steps?: { instruction: string; distance: string; duration: string }[]
    }[]
  }
}

async function fetchAmap<T extends AmapBaseResponse>(path: string, params: Record<string, string>): Promise<T> {
  if (!AMAP_KEY) {
    throw new Error('缺少 AMAP_MAPS_API_KEY，请在 .env.local 中配置高德 Web 服务 API Key')
  }

  // QPS 限流：至少间隔 200ms
  const now = Date.now()
  const wait = Math.max(0, 200 - (now - lastAmapCall))
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  lastAmapCall = Date.now()

  const qs = new URLSearchParams({ key: AMAP_KEY, ...params })
  const url = `${BASE}${path}?${qs}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.status !== '1') {
    const code = data.infocode
    const msgMap: Record<string, string> = {
      '10001': '高德 API 密钥无效，请联系管理员检查 AMAP_MAPS_API_KEY',
      '10003': '高德 API 服务暂不可用，请稍后重试',
      '10004': '高德 API 配额已用完，请稍后再试',
      '10009': '高德 API 请求过于频繁，请稍后重试',
    }
    throw new Error(msgMap[code] || `高德服务异常: ${data.info || code}`)
  }
  return data as T
}

export interface GeoCodeResult {
  formattedAddress: string
  location: [number, number]
  province: string
  city: string
  district: string
}

export async function geoCode(address: string, city?: string): Promise<GeoCodeResult> {
  const data = await fetchAmap<AmapGeocodeResponse>('/geocode/geo', {
    address,
    city: city || '',
  })
  if (!data.geocodes?.length) {
    throw new Error(`未找到地址: ${address}`)
  }
  const g = data.geocodes[0]
  const [lng, lat] = g.location.split(',').map(Number)
  return {
    formattedAddress: g.formatted_address,
    location: [lng, lat],
    province: g.province,
    city: g.city,
    district: g.district,
  }
}

export interface POIResult {
  id: string
  name: string
  type: string
  address: string
  location: [number, number]
  rating?: string
  photos?: string[]
}

export async function searchPOI(
  keywords: string,
  city: string,
  types?: string,
  location?: string,
): Promise<POIResult[]> {
  const params: Record<string, string> = {
    keywords,
    city,
    offset: '25',
    page: '1',
    extensions: 'all',
  }
  if (types) params.types = types
  if (location) params.location = location

  const data = await fetchAmap<AmapPoiResponse>('/place/text', params)
  return (data.pois || []).map(p => ({
    id: p.id,
    name: p.name,
    type: p.type,
    address: Array.isArray(p.address) ? p.address.join('') : p.address,
    location: p.location.split(',').map(Number) as [number, number],
    rating: p.biz_ext?.rating,
    photos: p.photos?.map(ph => ph.url),
  }))
}

export async function getWeather(city: string) {
  const liveData = await fetchAmap<AmapWeatherResponse>('/weather/weatherInfo', {
    city,
    extensions: 'base',
  })
  const forecastData = await fetchAmap<AmapWeatherResponse>('/weather/weatherInfo', {
    city,
    extensions: 'all',
  })
  const rawLive = liveData.lives?.[0]
  const live = rawLive ? {
    city: rawLive.city,
    weather: rawLive.weather,
    temperature: rawLive.temperature,
    windDirection: rawLive.winddirection,
    windPower: rawLive.windpower,
    humidity: rawLive.humidity,
    reportTime: rawLive.reporttime,
  } : null
  const forecast = (forecastData.forecasts?.[0]?.casts || []).map((c: AmapForecastCast) => ({
    date: c.date,
    week: c.week,
    dayWeather: c.dayweather,
    nightWeather: c.nightweather,
    dayTemp: c.daytemp,
    nightTemp: c.nighttemp,
  }))
  return { live, forecast }
}

export interface RouteResult {
  distance: number
  duration: number
  tolls: number
  steps: { instruction: string; distance: number; duration: number }[]
}

export async function getDrivingRoute(
  origin: string,
  destination: string,
  strategy = '0',
): Promise<RouteResult> {
  const data = await fetchAmap<AmapRouteResponse>('/direction/driving', {
    origin,
    destination,
    strategy,
    extensions: 'all',
  })
  const route = data.route?.paths?.[0]
  if (!route) throw new Error('未找到驾车路线')
  return {
    distance: parseInt(route.distance) || 0,
    duration: parseInt(route.duration) || 0,
    tolls: parseInt(route.tolls || '0') || 0,
    steps: (route.steps || []).map((s: AmapRouteStep) => ({
      instruction: s.instruction,
      distance: parseInt(s.distance) || 0,
      duration: parseInt(s.duration) || 0,
    })),
  }
}

export async function getWalkingRoute(origin: string, destination: string): Promise<RouteResult> {
  const data = await fetchAmap<AmapRouteResponse>('/direction/walking', { origin, destination })
  const route = data.route?.paths?.[0]
  if (!route) throw new Error('未找到步行路线')
  return {
    distance: parseInt(route.distance) || 0,
    duration: parseInt(route.duration) || 0,
    tolls: 0,
    steps: (route.steps || []).map((s: AmapRouteStep) => ({
      instruction: s.instruction,
      distance: parseInt(s.distance) || 0,
      duration: parseInt(s.duration) || 0,
    })),
  }
}
