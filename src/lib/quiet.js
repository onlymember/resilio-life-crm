// Para promesas cuyo fallo no debe interrumpir la pantalla (datos
// opcionales, avisos, registros de contacto). Antes se descartaba el
// error en silencio y nadie se enteraba de que algo fallaba: ahora
// queda en la consola del navegador con el lugar donde pasó.
export const quiet = (where) => (err) => {
  console.warn(`[${where}]`, err?.message || err)
}
