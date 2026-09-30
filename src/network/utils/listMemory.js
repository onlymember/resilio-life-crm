// Recuerda filtros, búsqueda y posición de una lista al entrar a una
// ficha (se guarda al tocar la tarjeta), para volver exactamente al mismo lugar. Vive en sessionStorage
// (se borra al cerrar la pestaña) y vence a los 30 minutos.
const KEY = (k) => `nw.list.${k}`
const MAX_AGE = 30 * 60 * 1000

export const saveList = (k, state) => {
  try { sessionStorage.setItem(KEY(k), JSON.stringify({ ...state, scrollY: window.scrollY, at: Date.now() })) }
  catch { /* sin storage: la lista arranca de cero, como antes */ }
}

export const readList = (k) => {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY(k)) || 'null')
    return v && Date.now() - v.at < MAX_AGE ? v : null
  } catch { return null }
}

// Se usa una sola vez: la lista lo borra al montarse, así entrar después
// desde el menú arranca limpia.
export const clearList = (k) => {
  try { sessionStorage.removeItem(KEY(k)) } catch { /* ok */ }
}

export const restoreScroll = (y) => {
  if (!y) return
  // Dos frames: el primero pinta las filas, el segundo ya tiene altura.
  requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)))
}
