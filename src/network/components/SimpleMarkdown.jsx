import React from 'react'

const escape = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

// ── Inline: **bold** y *italic*, sin dejar asteriscos sueltos ──────────────
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

// ── Tokenizer: recorre línea por línea, sin asumir nada del bloque ─────────
// Cualquier línea que empiece con #, ##, ###, >, -, •, "1." o | se procesa
// como su propio tipo — nunca queda un símbolo de markdown suelto en pantalla,
// pase lo que pase con los saltos de línea del texto original.
function tokenize(body) {
  const rawLines = body.replace(/\r\n/g, '\n').split('\n')
  const tokens = []
  let i = 0

  const isHeading = (l) => /^#{1,3}\s+/.test(l)
  const isTableRow = (l) => l.startsWith('|')
  const isQuote = (l) => l.startsWith('>')
  const isUl = (l) => /^[-•]\s+/.test(l)
  const isOl = (l) => /^\d+\.\s+/.test(l)
  const isSpecial = (l) => isHeading(l) || isTableRow(l) || isQuote(l) || isUl(l) || isOl(l)

  while (i < rawLines.length) {
    const line = rawLines[i].trim()
    if (line === '') { i++; continue }

    const h3 = /^###\s+(.*)/.exec(line)
    const h2 = !h3 && /^##\s+(.*)/.exec(line)
    const h1 = !h3 && !h2 && /^#\s+(.*)/.exec(line)
    if (h3) { tokens.push({ type: 'h3', text: h3[1].trim() }); i++; continue }
    if (h2) { tokens.push({ type: 'h2', text: h2[1].trim() }); i++; continue }
    if (h1) { tokens.push({ type: 'h1', text: h1[1].trim() }); i++; continue }

    if (isTableRow(line)) {
      const lines = []
      while (i < rawLines.length && isTableRow(rawLines[i].trim())) { lines.push(rawLines[i].trim()); i++ }
      tokens.push({ type: 'table', lines })
      continue
    }

    if (isQuote(line)) {
      const lines = []
      while (i < rawLines.length && isQuote(rawLines[i].trim())) {
        lines.push(rawLines[i].trim().replace(/^>\s?/, '')); i++
      }
      tokens.push({ type: 'quote', lines })
      continue
    }

    if (isUl(line) || isOl(line)) {
      const ordered = isOl(line)
      const items = []
      while (i < rawLines.length) {
        const l = rawLines[i].trim()
        if (l === '') break
        const m = ordered ? /^\d+\.\s+(.*)/.exec(l) : /^[-•]\s+(.*)/.exec(l)
        if (!m) break
        items.push(m[1]); i++
      }
      tokens.push({ type: ordered ? 'ol' : 'ul', items })
      continue
    }

    // Párrafo: junta líneas seguidas hasta línea vacía o hasta que arranque
    // algo especial — cada línea del párrafo se muestra en su propio renglón.
    const lines = [line]
    i++
    while (i < rawLines.length) {
      const l = rawLines[i].trim()
      if (l === '' || isSpecial(l)) break
      lines.push(l); i++
    }
    tokens.push({ type: 'p', lines })
  }

  return tokens
}

const HEAD_STYLE = {
  h1: { fontSize: 19, fontWeight: 800, color: '#3B1660', marginTop: 22, marginBottom: 12, letterSpacing: 0.2 },
  h2: {
    fontSize: 15, fontWeight: 800, color: '#3B1660',
    marginTop: 20, marginBottom: 12,
    paddingBottom: 7, borderBottom: '2px solid #E6337F',
    letterSpacing: 0.2,
  },
  h3: { fontSize: 13, fontWeight: 700, color: '#6B2FB3', marginTop: 16, marginBottom: 8, letterSpacing: 0.3, textTransform: 'uppercase' },
}

function parseTable(lines) {
  const isSep = (l) => /^\|[\s\-:|]+\|$/.test(l)
  const dataLines = lines.filter(l => !isSep(l))
  if (dataLines.length === 0) return null
  const parseCells = (l) => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim())
  return { headers: parseCells(dataLines[0]), rows: dataLines.slice(1).map(parseCells) }
}

function Token({ token, index, category }) {
  const revealStyle = { '--i': index }

  switch (token.type) {
    case 'h1':
    case 'h2':
    case 'h3':
      return (
        <div className="manual-block" style={{ ...HEAD_STYLE[token.type], ...revealStyle }}>
          {renderInline(escape(token.text))}
        </div>
      )

    case 'quote':
      return (
        <div className="manual-block manual-card" style={{ background: '#FFE3EF', borderRadius: 12, padding: '14px 20px', textAlign: 'center', ...revealStyle }}>
          {token.lines.map((l, i) => (
            <p key={i} style={{ margin: 0, lineHeight: 1.7, fontSize: 13, fontWeight: 700, color: '#3B1660' }}>
              {renderInline(escape(l))}
            </p>
          ))}
        </div>
      )

    case 'table': {
      const table = parseTable(token.lines)
      if (!table) return null
      const headStyle = {
        padding: '10px 14px', textAlign: 'left', fontSize: 11,
        fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
        color: 'white', background: '#3B1660',
      }
      const cellStyle = { padding: '8px 14px', textAlign: 'left', fontSize: 12, color: '#1a0a30', lineHeight: 1.5 }
      return (
        <div className="manual-block manual-card" style={{ borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(59,22,96,0.1)', ...revealStyle }}>
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

    case 'ol':
    case 'ul':
      return React.createElement(
        token.type,
        { className: 'manual-block', style: { margin: '0 0 0 20px', padding: 0, ...revealStyle } },
        token.items.map((item, i) => (
          <li key={i} style={{ marginBottom: 4, lineHeight: 1.7 }}>{renderInline(escape(item))}</li>
        ))
      )

    case 'p':
    default:
      return (
        <div className="manual-block" style={{ display: 'flex', flexDirection: 'column', gap: 5, ...revealStyle }}>
          {token.lines.map((line, i) => {
            const isEnfoque = category === 'sec06' &&
              (line.startsWith('*Enfoque:') || line.startsWith('*Enfoque '))
            if (isEnfoque) {
              const inner = line.startsWith('*') && line.endsWith('*') ? line.slice(1, -1) : line
              return (
                <p key={i} style={{ margin: 0, lineHeight: 1.7, color: '#E6337F', fontStyle: 'italic' }}>
                  {renderInline(escape(inner))}
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
}

export default function SimpleMarkdown({ body, style = {}, category = '' }) {
  if (!body) return null
  const tokens = tokenize(body)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, ...style }}>
      <style>{`
        @keyframes manualBlockIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .manual-block {
          animation: manualBlockIn 0.5s cubic-bezier(0.16,1,0.3,1) both;
          animation-delay: calc(var(--i, 0) * 45ms);
        }
        .manual-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .manual-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(59,22,96,0.18); }
        @media (prefers-reduced-motion: reduce) {
          .manual-block { animation: none !important; }
          .manual-card:hover { transform: none; }
        }
      `}</style>
      {tokens.map((tok, i) => <Token key={i} token={tok} index={i} category={category}/>)}
    </div>
  )
}
