import React from 'react'

// Escapa caracteres HTML antes de procesar markdown
const escape = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

// Convierte **text** → <strong> spans. Opera sobre texto ya escapado.
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{p.slice(2,-2)}</strong>
    }
    return p
  })
}

// Renders a single paragraph block (may be a list)
function Block({ text, style }) {
  const lines = text.split('\n').filter(Boolean)
  const isOrdered  = lines.length > 0 && /^\d+\.\s/.test(lines[0])
  const isUnordered = lines.length > 0 && /^[-•]\s/.test(lines[0])

  if (isOrdered) {
    return (
      <ol style={{ margin: '0 0 0 20px', padding: 0, ...style }}>
        {lines.map((l, i) => (
          <li key={i} style={{ marginBottom: 4, lineHeight: 1.7 }}>
            {renderInline(escape(l.replace(/^\d+\.\s/, '')))}
          </li>
        ))}
      </ol>
    )
  }
  if (isUnordered) {
    return (
      <ul style={{ margin: '0 0 0 20px', padding: 0, ...style }}>
        {lines.map((l, i) => (
          <li key={i} style={{ marginBottom: 4, lineHeight: 1.7 }}>
            {renderInline(escape(l.replace(/^[-•]\s/, '')))}
          </li>
        ))}
      </ul>
    )
  }
  return (
    <p style={{ margin: 0, lineHeight: 1.8, ...style }}>
      {renderInline(escape(lines.join(' ')))}
    </p>
  )
}

export default function SimpleMarkdown({ body, style = {} }) {
  if (!body) return null
  const blocks = body.split(/\n\n+/).filter(b => b.trim())
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, ...style }}>
      {blocks.map((b, i) => <Block key={i} text={b.trim()}/>)}
    </div>
  )
}
