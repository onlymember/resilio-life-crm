import React from 'react'

const escape = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

function renderInline(text) {
  const boldSplit = text.split(/(\*\*[^*]+\*\*)/)
  return boldSplit.flatMap((chunk, bi) => {
    if (chunk.startsWith('**') && chunk.endsWith('**') && chunk.length > 4) {
      return [<strong key={`b${bi}`} style={{ fontWeight: 700 }}>{chunk.slice(2, -2)}</strong>]
    }
    const italicSplit = chunk.split(/(\*[^*]+\*)/)
    return italicSplit.map((part, ii) => {
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return <em key={`b${bi}i${ii}`} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</em>
      }
      return part || null
    })
  })
}

function renderListItem(line, i) {
  const text = escape(line.replace(/^[-•]\s/, '').replace(/^\d+\.\s/, ''))
  return (
    <li key={i} style={{ marginBottom: 4, lineHeight: 1.7 }}>
      {renderInline(text)}
    </li>
  )
}

function parseTable(text) {
  const lines = text.split('\n').filter(l => l.trim().startsWith('|'))
  const isSep = (l) => /^\|[\s\-:|]+\|$/.test(l.trim())
  const dataLines = lines.filter(l => !isSep(l))
  if (dataLines.length === 0) return null
  const parseCells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
  return { headers: parseCells(dataLines[0]), rows: dataLines.slice(1).map(parseCells) }
}

function Block({ text, category }) {
  const lines = text.split('\n').filter(Boolean)
  if (lines.length === 0) return null

  // ── H2 heading ──────────────────────────────────────────────
  if (lines[0].startsWith('## ')) {
    return (
      <div style={{
        fontSize: 15, fontWeight: 800, color: '#3B1660',
        marginTop: 20, marginBottom: 12,
        paddingBottom: 7, borderBottom: '2px solid #E6337F',
        letterSpacing: 0.2,
      }}>
        {renderInline(escape(lines[0].slice(3).trim()))}
      </div>
    )
  }

  // ── Blockquote ───────────────────────────────────────────────
  if (lines.every(l => l.startsWith('> '))) {
    return (
      <div style={{
        background: '#FFE3EF',
        borderRadius: 12,
        padding: '14px 20px',
        textAlign: 'center',
      }}>
        {lines.map((l, i) => (
          <p key={i} style={{ margin: 0, lineHeight: 1.7, fontSize: 13, fontWeight: 700, color: '#3B1660' }}>
            {renderInline(escape(l.slice(2)))}
          </p>
        ))}
      </div>
    )
  }

  // ── Table ────────────────────────────────────────────────────
  if (lines.every(l => l.trim().startsWith('|'))) {
    const table = parseTable(text)
    if (table) {
      const headStyle = {
        padding: '10px 14px', textAlign: 'left', fontSize: 11,
        fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
        color: 'white', background: '#3B1660',
      }
      const cellStyle = {
        padding: '8px 14px', textAlign: 'left', fontSize: 12,
        color: '#1a0a30', lineHeight: 1.5,
      }
      return (
        <div style={{ borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(59,22,96,0.1)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
              <thead>
                <tr>{table.headers.map((h, i) => <th key={i} style={headStyle}>{renderInline(escape(h))}</th>)}</tr>
              </thead>
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? 'white' : '#F2EBFB' }}>
                    {row.map((cell, ci) => <td key={ci} style={cellStyle}>{renderInline(escape(cell))}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }
  }

  // ── Lists ────────────────────────────────────────────────────
  if (/^\d+\.\s/.test(lines[0])) {
    return (
      <ol style={{ margin: '0 0 0 20px', padding: 0 }}>
        {lines.map((l, i) => renderListItem(l, i))}
      </ol>
    )
  }
  if (/^[-•]\s/.test(lines[0])) {
    return (
      <ul style={{ margin: '0 0 0 20px', padding: 0 }}>
        {lines.map((l, i) => renderListItem(l, i))}
      </ul>
    )
  }

  // ── Paragraph / multi-line ───────────────────────────────────
  if (lines.length === 1) {
    return (
      <p style={{ margin: 0, lineHeight: 1.8 }}>
        {renderInline(escape(lines[0]))}
      </p>
    )
  }

  // Multi-line block: render each line separately.
  // In sec06, italic lines starting with "Enfoque:" are colored pink.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {lines.map((line, i) => {
        const isEnfoque = category === 'sec06' &&
          (line.startsWith('*Enfoque:') || line.startsWith('*Enfoque '))
        if (isEnfoque) {
          const inner = line.startsWith('*') && line.endsWith('*')
            ? line.slice(1, -1)
            : line
          return (
            <p key={i} style={{ margin: 0, lineHeight: 1.7, color: '#E6337F', fontStyle: 'italic' }}>
              {inner}
            </p>
          )
        }
        return (
          <p key={i} style={{ margin: 0, lineHeight: 1.8 }}>
            {renderInline(escape(line))}
          </p>
        )
      })}
    </div>
  )
}

export default function SimpleMarkdown({ body, style = {}, category = '' }) {
  if (!body) return null
  const blocks = body.split(/\n\n+/).filter(b => b.trim())
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, ...style }}>
      {blocks.map((b, i) => <Block key={i} text={b.trim()} category={category}/>)}
    </div>
  )
}
