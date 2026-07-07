'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrainCircuit, Hotel, CloudSun, Calendar } from 'lucide-react'

const navItems = [
  { href: '/', label: 'AI规划', icon: BrainCircuit },
  { href: '/hotels', label: '酒店', icon: Hotel },
  { href: '/weather', label: '天气', icon: CloudSun },
  { href: '/itinerary', label: '行程', icon: Calendar },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop: top bar */}
      <header className="sticky top-0 z-50 hidden md:block border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-blue-600">
            <BrainCircuit className="h-5 w-5" />
            VoyageMind
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map(item => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Mobile: bottom tab bar (hidden on chat page which has its own input bar) */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-slate-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] ${pathname === '/' ? 'hidden' : ''}`}>
        <div className="flex items-center justify-around h-14">
          {navItems.map(item => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-slate-400'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
