import { runAgent, getSession, setSession, deleteSession, type ChatMessage, type StreamEvent } from '@/lib/agent'
import { appendFile, mkdir } from 'fs/promises'
import path from 'path'
import { getErrorMessage } from '@/lib/errors'

const LOG_DIR = path.join(process.cwd(), 'logs')

async function writeLog(sessionId: string, entry: Record<string, unknown>) {
  try {
    await mkdir(LOG_DIR, { recursive: true })
    const line = JSON.stringify({ ts: new Date().toISOString(), session: sessionId, ...entry }) + '\n'
    await appendFile(path.join(LOG_DIR, `${sessionId}.jsonl`), line)
  } catch {}
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  if (sessionId) deleteSession(sessionId)
  return Response.json({ ok: true })
}

export async function POST(request: Request) {
  const { messages, sessionId } = await request.json()
  const sid = sessionId || `session_${Date.now()}`
  const userMessage = messages?.[messages.length - 1]?.content || ''

  if (!userMessage.trim()) {
    return Response.json({ error: '消息不能为空' }, { status: 400 })
  }

  const history = getSession(sid)

  await writeLog(sid, { type: 'user', content: userMessage })

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (data: StreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const allMessages: ChatMessage[] = []

      try {
        const generator = runAgent(sid, userMessage, history)

        for await (const event of generator) {
          send(event)

          if (event.type === 'tool_call') {
            await writeLog(sid, { type: 'tool_call', name: event.name, args: event.args })
          } else if (event.type === 'tool_result') {
            const resultStr = JSON.stringify(event.result)
            await writeLog(sid, { type: 'tool_result', name: event.name, len: resultStr.length, preview: resultStr.slice(0, 500) })
          } else if (event.type === 'text' && event.content) {
            allMessages.push({ role: 'assistant', content: event.content })
          } else if (event.type === 'error') {
            await writeLog(sid, { type: 'error', content: event.content })
          }
        }

        const fullText = allMessages.map(m => m.content).join('')
        await writeLog(sid, { type: 'assistant', len: fullText.length, content: fullText.slice(0, 1000) })

        // 更新 session
        const updatedHistory = [
          ...history,
          { role: 'user' as const, content: userMessage },
          ...allMessages,
        ]
        setSession(sid, updatedHistory)

        controller.close()
      } catch (err: unknown) {
        const message = getErrorMessage(err)
        await writeLog(sid, { type: 'error', content: message })
        send({ type: 'error', content: message })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Session-Id': sid,
    },
  })
}
