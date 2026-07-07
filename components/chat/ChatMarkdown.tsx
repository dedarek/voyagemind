import { memo } from 'react'

function esc(html: string): string {
  return html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function parseInline(text: string): string {
  let html = esc(text)
  // 粗体+斜体
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  // 粗体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // 斜体
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1 py-0.5 text-xs text-rose-600 font-mono">$1</code>')
  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-blue-600 underline">$1</a>')
  return html
}

function parseTable(lines: string[], startIndex: number): { html: string; endIndex: number } | null {
  // 至少需要表头行 + 分隔行 + 1数据行
  if (startIndex + 2 >= lines.length) return null

  const headerLine = lines[startIndex]
  const sepLine = lines[startIndex + 1]

  // 检查表头行和分隔行
  if (!headerLine.startsWith('|') || !headerLine.endsWith('|')) return null
  if (!/^\|[\s\-:|]+\|$/.test(sepLine)) return null

  // 解析表头
  const headers = headerLine.slice(1, -1).split('|').map(s => s.trim())
  // 解析对齐
  const aligns = sepLine.slice(1, -1).split('|').map(s => {
    const t = s.trim()
    if (t.startsWith(':') && t.endsWith(':')) return 'center'
    if (t.endsWith(':')) return 'right'
    return 'left'
  })

  // 解析数据行
  const rows: string[][] = []
  let i = startIndex + 2
  while (i < lines.length) {
    const line = lines[i]
    if (!line.startsWith('|') || !line.endsWith('|')) break
    const cells = line.slice(1, -1).split('|').map(s => s.trim())
    rows.push(cells)
    i++
  }

  // 构建 HTML
  let html = '<div class="my-2 overflow-x-auto"><table class="min-w-full border-collapse text-xs"><thead><tr>'
  headers.forEach((h, idx) => {
    html += `<th class="border border-slate-300 bg-slate-100 px-2 py-1 text-${aligns[idx] || 'left'} font-semibold">${parseInline(h)}</th>`
  })
  html += '</tr></thead><tbody>'
  rows.forEach(row => {
    html += '<tr>'
    row.forEach((cell, idx) => {
      html += `<td class="border border-slate-200 px-2 py-1 text-${aligns[idx] || 'left'}">${parseInline(cell)}</td>`
    })
    html += '</tr>'
  })
  html += '</tbody></table></div>'

  return { html, endIndex: i - 1 }
}

function parseMarkdown(text: string): string {
  const lines = text.split('\n')
  const output: string[] = []
  let inCodeBlock = false
  let codeBuf = ''
  let listItems: string[] = []
  let listType: 'ul' | 'ol' | null = null

  function flushList() {
    if (listItems.length > 0 && listType) {
      const tag = listType === 'ol' ? 'ol' : 'ul'
      output.push(`<${tag} class="my-1">${listItems.join('')}</${tag}>`)
      listItems = []
      listType = null
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 代码块
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        output.push(`<pre class="my-2 rounded-lg bg-slate-800 p-3 overflow-x-auto"><code class="text-sm text-slate-100">${esc(codeBuf.trim())}</code></pre>`)
        codeBuf = ''
        inCodeBlock = false
        continue
      } else {
        flushList()
        inCodeBlock = true
        continue
      }
    }

    if (inCodeBlock) {
      codeBuf += line + '\n'
      continue
    }

    // 表格
    if (line.startsWith('|') && line.endsWith('|')) {
      flushList()
      const table = parseTable(lines, i)
      if (table) {
        output.push(table.html)
        i = table.endIndex
        continue
      }
    }

    // 空行
    if (line.trim() === '') {
      flushList()
      output.push('<br/>')
      continue
    }

    // 标题
    if (/^#### (.+)/.test(line)) {
      flushList()
      output.push(`<h4 class="text-sm font-semibold mt-3 mb-1">${parseInline(RegExp.$1)}</h4>`)
      continue
    }
    if (/^### (.+)/.test(line)) {
      flushList()
      output.push(`<h3 class="text-base font-semibold mt-3 mb-1">${parseInline(RegExp.$1)}</h3>`)
      continue
    }
    if (/^## (.+)/.test(line)) {
      flushList()
      output.push(`<h2 class="text-lg font-bold mt-4 mb-2">${parseInline(RegExp.$1)}</h2>`)
      continue
    }

    // 水平线
    if (/^---$/.test(line.trim())) {
      flushList()
      output.push('<hr class="my-2 border-slate-200" />')
      continue
    }

    // 无序列表
    if (/^- (.+)/.test(line)) {
      if (listType !== 'ul') { flushList(); listType = 'ul' }
      listItems.push(`<li class="ml-4 list-disc">${parseInline(RegExp.$1)}</li>`)
      continue
    }

    // 有序列表
    if (/^\d+\.\s+(.+)/.test(line)) {
      if (listType !== 'ol') { flushList(); listType = 'ol' }
      listItems.push(`<li class="ml-4 list-decimal">${parseInline(RegExp.$1)}</li>`)
      continue
    }

    // 普通段落
    flushList()
    output.push(`<span>${parseInline(line)}</span>`)
  }

  flushList()
  if (inCodeBlock) {
    output.push(`<pre class="my-2 rounded-lg bg-slate-800 p-3 overflow-x-auto"><code class="text-sm text-slate-100">${esc(codeBuf.trim())}</code></pre>`)
  }

  return output.join('\n')
}

export const ChatMarkdown = memo(function ChatMarkdown({ content }: { content: string }) {
  const html = parseMarkdown(content)
  return <span className="chat-markdown" dangerouslySetInnerHTML={{ __html: html }} />
})
