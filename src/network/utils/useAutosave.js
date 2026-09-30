// Guardado automático de una ficha: guarda solo lo cambiado, un momento
// después de dejar de escribir. Si se sale de la pantalla con algo sin
// guardar, lo guarda igual al salir.
//   state: 'idle' | 'pending' | 'saving' | 'saved' | 'error'
import { useEffect, useRef, useState } from 'react'

export function useAutosave({ dirty, save, delay = 1200, enabled = true }) {
  const [state, setState] = useState('idle')
  const saveRef = useRef(save)
  saveRef.current = save
  const hasDirty = Object.keys(dirty || {}).length > 0
  const pendingRef = useRef(false)
  pendingRef.current = hasDirty && enabled
  const key = JSON.stringify(dirty || {})

  useEffect(() => {
    if (!hasDirty || !enabled) return
    setState('pending')
    const id = setTimeout(async () => {
      setState('saving')
      const ok = await saveRef.current()
      setState(ok ? 'saved' : 'error')
    }, delay)
    return () => clearTimeout(id)
  }, [key, enabled])

  // Salir con cambios pendientes: se guardan igual.
  useEffect(() => () => { if (pendingRef.current) saveRef.current() }, [])

  return state
}
