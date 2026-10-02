// Instalable en el celular: el Club y el Network usan cada uno su
// manifiesto. Va en un archivo (no inline en index.html) para que la
// Content-Security-Policy pueda prohibir scripts inline.
(function () {
  // La propuesta para marcas (partners.*) no se instala: sin manifiesto.
  if (location.hostname.indexOf('partners.') === 0) return
  var club = location.hostname.indexOf('club.') === 0
  var l = document.createElement('link')
  l.rel = 'manifest'
  l.href = club ? '/club.webmanifest' : '/manifest.webmanifest'
  document.head.appendChild(l)
  var t = document.createElement('meta')
  t.name = 'apple-mobile-web-app-title'
  t.content = club ? 'Resilio Club' : 'Network'
  document.head.appendChild(t)
})()
