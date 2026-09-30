// Service worker mínimo para que el Network (y el Club) se puedan
// instalar en el celular. A propósito NO guarda nada en caché: cada
// visita trae la versión recién publicada, así nunca queda una versión
// vieja pegada (el tipo de problema que ya tuvimos con el CSS).
// El manejador de "push" queda listo para cuando se sumen notificaciones.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { title: event.data?.text() } }
  event.waitUntil(self.registration.showNotification(data.title || 'Resilio', {
    body: data.body || '', icon: '/icon-192.png', badge: '/icon-192.png', data: { url: data.url || '/' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) if ('focus' in c) { c.navigate(url); return c.focus() }
    return self.clients.openWindow(url)
  }))
})
