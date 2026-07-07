import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navbar from '@/components/layout/Navbar'

export const metadata: Metadata = {
  title: 'VoyageMind',
  description: 'Tool-calling AI travel planner for hotels, weather, POI discovery, community reviews, and itineraries.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        <Navbar />
        <main className="pb-16 md:pb-0">{children}</main>
      </body>
    </html>
  )
}
