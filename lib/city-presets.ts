export interface CityAreaPreset {
  name: string
  center: [number, number]
  description: string
  avgPrice: number
}

export const CITY_CENTERS: Record<string, [number, number]> = {
  杭州: [120.1551, 30.2741],
}

export const CITY_AREA_PRESETS: Record<string, CityAreaPreset[]> = {
  杭州: [
    { name: '西湖', center: [120.15, 30.25], description: '经典景区, 步行友好', avgPrice: 500 },
    { name: '武林广场', center: [120.16, 30.27], description: '市中心, 商圈便利', avgPrice: 420 },
    { name: '钱江新城', center: [120.21, 30.24], description: '商务新城, 江景夜景', avgPrice: 480 },
  ],
}
