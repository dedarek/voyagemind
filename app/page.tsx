'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Hotel, CloudSun, MapPin, Route, Plus, MessageCircle, ChevronDown, ChevronRight, Sparkles, MessageSquareText, Square } from 'lucide-react'
import { ChatMarkdown } from '@/components/chat/ChatMarkdown'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolName?: string
  toolArgs?: Record<string, unknown>
  toolResult?: unknown
  isStreaming?: boolean
  expanded?: boolean
}

const WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '你好，我是小途，你的 AI 旅行规划助手。\n\n我可以帮你搜索酒店、天气、景点口碑和路线，把结果整理成可调整的旅行方案。\n\n告诉我目的地、时间、人数、预算和旅行节奏就能开始。',
}

const QUICK_PROMPTS = [
  '国庆情侣去大理丽江，预算6000，想轻松一点',
  '成都亲子周末两天，预算2000，想住得方便',
  '三亚四天三晚，想看海、吃海鲜、找性价比酒店',
]

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem('chat_messages')
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length > 0) return arr
    }
  } catch {}
  return [WELCOME_MSG]
}

function saveMessages(msgs: ChatMessage[]) {
  const slim = msgs.filter(m => m.role !== 'tool')
  try {
    localStorage.setItem('chat_messages', JSON.stringify(slim))
  } catch {}
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [hydrated, setHydrated] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setMessages(loadMessages())
    setHydrated(true)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('chat_session_id')
    if (saved) setSessionId(saved)
  }, [])

  useEffect(() => {
    if (hydrated && !messages.some(m => m.isStreaming)) {
      saveMessages(messages)
    }
  }, [messages, hydrated])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    const assistantId = `assistant_${Date.now()}`
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    }])

    const sid = sessionId || `session_${Date.now()}`
    if (!sessionId) {
      setSessionId(sid)
      localStorage.setItem('chat_session_id', sid)
    }

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sid,
          messages: messages.filter(m => m.role !== 'tool' && m.id !== 'welcome').map(m => ({
            role: m.role,
            content: m.content,
          })).concat({ role: 'user', content: text }),
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '请求失败')
      }

      const newSid = res.headers.get('X-Session-Id')
      if (newSid && newSid !== sessionId) {
        setSessionId(newSid)
        localStorage.setItem('chat_session_id', newSid)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('无法读取响应流')

      const decoder = new TextDecoder()
      let buffer = ''
      let currentText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6)
          try {
            const event = JSON.parse(jsonStr)

            switch (event.type) {
              case 'text':
                currentText += event.content
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: currentText } : m
                ))
                break

              case 'tool_call':
                if (event.name === 'update_requirements_md') break
                setMessages(prev => {
                  const assistantIdx = prev.findIndex(m => m.id === assistantId)
                  const toolMsg: ChatMessage = {
                    id: `tool_${Date.now()}_${event.name}`,
                    role: 'tool',
                    content: '',
                    toolName: event.name,
                    toolArgs: event.args,
                    expanded: false,
                  }
                  if (assistantIdx === -1) return [...prev, toolMsg]
                  const next = [...prev]
                  next.splice(assistantIdx, 0, toolMsg)
                  return next
                })
                break

              case 'tool_result':
                if (event.name === 'update_requirements_md') break
                setMessages(prev => {
                  const reversed = [...prev].reverse()
                  const toolMsg = reversed.find(m => m.role === 'tool' && m.toolName === event.name && !m.toolResult)
                  if (!toolMsg) return prev
                  return prev.map(m =>
                    m.id === toolMsg.id ? { ...m, toolResult: event.result } : m
                  )
                })
                break

              case 'error':
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: `❌ 出错了: ${event.content}`, isStreaming: false } : m
                ))
                break

              case 'done':
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, isStreaming: false } : m
                ))
                break
            }
          } catch {}
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, isStreaming: false } : m
      ))
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: `连接失败：${err instanceof Error ? err.message : '请稍后重试'}`, isStreaming: false } : m
      ))
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [input, isLoading, messages, sessionId])

  const handleNewChat = () => {
    if (sessionId) {
      fetch(`/api/chat?sessionId=${encodeURIComponent(sessionId)}`, { method: 'DELETE' }).catch(() => {})
    }
    const newSid = `session_${Date.now()}`
    setSessionId(newSid)
    localStorage.setItem('chat_session_id', newSid)
    localStorage.removeItem('chat_messages')
    setMessages([WELCOME_MSG])
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setMessages(prev => prev.map(m =>
      m.isStreaming ? { ...m, content: m.content || '已停止生成。', isStreaming: false } : m
    ))
    setIsLoading(false)
    abortRef.current = null
  }

  const toggleExpand = (id: string) => {
    setMessages(prev => prev.map(m =>
      m.id === id ? { ...m, expanded: !m.expanded } : m
    ))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toolIcon = (name?: string) => {
    switch (name) {
      case 'search_hotels': return <Hotel className="h-4 w-4" />
      case 'get_weather': return <CloudSun className="h-4 w-4" />
      case 'search_attractions': return <MapPin className="h-4 w-4" />
      case 'get_route': return <Route className="h-4 w-4" />
      case 'search_zhihu': return <MessageSquareText className="h-4 w-4" />
      default: return <Loader2 className="h-4 w-4" />
    }
  }

  const toolLabel = (name?: string) => {
    switch (name) {
      case 'search_hotels': return '搜索酒店'
      case 'get_weather': return '查看天气'
      case 'search_attractions': return '搜索景点'
      case 'get_route': return '路线规划'
      case 'search_zhihu': return '搜索社区评价'
      default: return name
    }
  }

  const toolSummary = (name?: string, result?: unknown): string => {
    if (!result) return ''
    const r = result as Record<string, unknown>
    switch (name) {
      case 'search_hotels': {
        const filtered = r.filtered as number
        let s = `可用 ${r.total} 家酒店，覆盖 ${(r.areas as Array<unknown>)?.length || 0} 个区域`
        if (filtered) s += `（已过滤 ${filtered} 家信息不全）`
        return s
      }
      case 'get_weather': {
        const live = r.live as Record<string, unknown> | undefined
        if (live) return `${live.weather} ${live.temperature}°C`
        return '天气信息'
      }
      case 'search_attractions': {
        const arr = r as unknown as Array<unknown> | undefined
        return `找到 ${arr?.length || 0} 个地点`
      }
      case 'get_route': {
        return `距离 ${(Number(r.distance) / 1000).toFixed(1)}km · 约 ${Math.round(Number(r.duration) / 60)} 分钟`
      }
      case 'search_zhihu': {
        const arr = r as unknown as Array<Record<string, unknown>> | undefined
        return `找到 ${arr?.length || 0} 条社区讨论`
      }
      default: return ''
    }
  }

  const formatToolResult = (name?: string, result?: unknown): string => {
    if (!result) return ''
    const r = result as Record<string, unknown>

    switch (name) {
      case 'search_hotels': {
        const hotels = r.hotels as Array<Record<string, unknown>> | undefined
        if (!hotels?.length) return '未找到酒店'
        const lines = hotels.map((h, i) => {
          const features = (h.features as string[]) || []
          const tags = features.filter(f => {
            const highlight = ['早餐', '接送', '海景', '泳池', '健身房', '亲子', '浴缸', '阳台', '智能']
            return highlight.some(k => f.includes(k))
          })
          const tagStr = tags.length > 0 ? tags.map(t => `\`${t}\``).join(' ') : ''
          return `${i + 1}. **${h.name}** — ¥${h.priceMin}起/晚 · 评分 ${h.rating}  ${tagStr}`
        })
        const note = r.filtered ? `\n> 已自动过滤 ${r.filtered} 家价格或评分异常的结果` : ''
        return lines.join('\n') + note
      }
      case 'get_weather': {
        const live = r.live as Record<string, unknown> | undefined
        const forecast = r.forecast as Array<Record<string, unknown>> | undefined
        let s = ''
        if (live) s += `${live.weather} ${live.temperature}°C | 湿度${live.humidity}% | ${live.windDirection}风${live.windPower}级`
        if (forecast?.length) {
          s += '\n预报：' + forecast.slice(0, 4).map(f => `${f.date?.toString().slice(-5)} ${f.dayWeather} ${f.dayTemp}~${f.nightTemp}°`).join(' | ')
        }
        return s
      }
      case 'search_attractions': {
        const pois = r as unknown as Array<Record<string, unknown>> | undefined
        if (!pois?.length) return '未找到结果'
        return pois.slice(0, 10).map((p, i) => `${i + 1}. ${p.name} (${p.type})${p.rating ? ' ⭐' + p.rating : ''}`).join('\n')
      }
      case 'get_route': {
        return `${r.summary ? (r.summary as string[]).join(' → ') : ''}\n距离: ${(Number(r.distance) / 1000).toFixed(1)}km | 耗时: ${Math.round(Number(r.duration) / 60)}分钟`
      }
      case 'search_zhihu': {
        const items = r as unknown as Array<Record<string, unknown>> | undefined
        if (!items?.length) return '未找到相关讨论'
        return items.slice(0, 8).map((item, i) => {
          const badge = item.authorBadge ? ` \`${item.authorBadge}\`` : ''
          return `${i + 1}. **${item.title}**\n   👤 ${item.author}${badge} | 👍 ${item.votes} | 💬 ${item.comments}\n   > ${(item.content as string)?.slice(0, 150)}...`
        }).join('\n')
      }
      default:
        return JSON.stringify(result).slice(0, 200)
    }
  }

  const renderMessage = (msg: ChatMessage) => {
    if (msg.role === 'tool') {
      const hasResult = msg.toolResult != null
      const summary = hasResult ? toolSummary(msg.toolName, msg.toolResult) : ''
      const isExpanded = msg.expanded === true

      return (
        <div key={msg.id} className="flex justify-center px-3 md:px-4">
          <button
            onClick={() => toggleExpand(msg.id)}
            className="w-full max-w-sm md:max-w-md rounded-lg border border-blue-200 bg-blue-50/50 px-3 md:px-4 py-2 text-left transition-colors hover:bg-blue-100/50 active:bg-blue-100"
          >
            <div className="flex items-center gap-2">
              {hasResult ? (
                <span className="flex items-center gap-1 text-green-600">✅</span>
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              )}
              {toolIcon(msg.toolName)}
              <span className="text-sm font-medium text-blue-700">{toolLabel(msg.toolName)}</span>
              {hasResult && summary && (
                <span className="text-xs text-blue-400 truncate">· {summary}</span>
              )}
              {hasResult && (
                <span className="ml-auto text-slate-400">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
              )}
            </div>
            {msg.toolArgs && Object.keys(msg.toolArgs).length > 0 && !hasResult && (
              <p className="mt-1 text-xs text-blue-500">
                {Object.entries(msg.toolArgs).map(([k, v]) => `${k}=${v}`).join(', ')}
              </p>
            )}
            {hasResult && isExpanded && (
              <div className="mt-2 text-xs text-slate-600 border-t border-blue-100 pt-2">
                <ChatMarkdown content={formatToolResult(msg.toolName, msg.toolResult)} />
              </div>
            )}
          </button>
        </div>
      )
    }

    const isUser = msg.role === 'user'
    return (
      <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-3 md:px-4`}>
        <div className={`flex max-w-[88%] md:max-w-[75%] gap-2 md:gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className={`flex h-7 w-7 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-full text-sm ${
            isUser ? 'bg-blue-600 text-white' : 'bg-amber-100 text-amber-600'
          }`}>
            {isUser ? '👤' : '🗺️'}
          </div>
          <div className={`rounded-xl px-3 py-2.5 md:px-4 md:py-3 min-w-0 ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-slate-200 text-slate-700'
          }`}>
            {msg.isStreaming && !msg.content ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Sparkles className="h-4 w-4 animate-pulse" />
                <span>小途正在思考...</span>
              </div>
            ) : (
              <div className="text-sm leading-relaxed">
                {isUser ? (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                ) : (
                  <ChatMarkdown content={msg.content} />
                )}
                {msg.isStreaming && (
                  <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-blue-600" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] md:h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex-1 overflow-y-auto py-3 md:py-4 space-y-3 md:space-y-4">
        {messages.map(renderMessage)}
        {messages.length === 1 && (
          <div className="mx-auto grid max-w-3xl gap-2 px-3 md:grid-cols-3 md:px-4">
            {QUICK_PROMPTS.map(prompt => (
              <button
                key={prompt}
                type="button"
                onClick={() => setInput(prompt)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs leading-relaxed text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-200 bg-white px-3 md:px-4 py-3 md:py-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-4">
        <div className="mx-auto flex max-w-3xl items-center gap-2 md:gap-3">
          <button
            onClick={handleNewChat}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 md:px-3 text-xs text-slate-500 hover:bg-slate-50 active:bg-slate-100"
            title="新对话"
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 md:px-4 py-2 transition-colors focus-within:border-blue-300 focus-within:bg-white">
            <MessageCircle className="h-5 w-5 shrink-0 text-slate-400 hidden md:block" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="告诉小途你的旅行想法..."
              disabled={isLoading}
              className="flex-1 border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            <button
              onClick={isLoading ? handleStop : handleSend}
              disabled={!isLoading && !input.trim()}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-3 md:px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
            >
              {isLoading ? (
                <Square className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-slate-400 hidden md:block">
          小途会循循善诱地了解你的需求，为你定制旅行计划
        </p>
      </div>
    </div>
  )
}
