// Etiquetas Open Graph de la invitación (las usa api/invite-og.js).
// Aparte para poder probarlas sin red.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const TEXT = {
  es: { title: (n) => n ? `${n}, te invitamos a la red de creadores de Resilio` : 'Te invitamos a la red de creadores de Resilio',
        desc: (c) => c ? `Invitación personal · Colaboraciones, experiencias y comunidad en ${c}.` : 'Invitación personal · Colaboraciones, experiencias y comunidad.' },
  en: { title: (n) => n ? `${n}, you’re invited to the Resilio creator network` : 'You’re invited to the Resilio creator network',
        desc: (c) => c ? `Personal invitation · Collaborations, experiences and community in ${c}.` : 'Personal invitation · Collaborations, experiences and community.' },
  pt: { title: (n) => n ? `${n}, um convite para a rede de criadores da Resilio` : 'Convite para a rede de criadores da Resilio',
        desc: (c) => c ? `Convite pessoal · Colaborações, experiências e comunidade em ${c}.` : 'Convite pessoal · Colaborações, experiências e comunidade.' },
}

export function ogTags({ firstName, city, lang, url, image }) {
  const L = TEXT[lang] || TEXT.es
  const name = String(firstName || '').trim().slice(0, 40)
  const title = L.title(name)
  const desc = L.desc(String(city || '').trim().slice(0, 60))
  return [
    `<title>${esc(title)}</title>`,
    '<meta name="robots" content="noindex, nofollow">',
    `<meta name="description" content="${esc(desc)}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Resilio">',
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta name="twitter:card" content="summary_large_image">',
  ].join('\n')
}
