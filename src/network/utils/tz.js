import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

export const DEFAULT_TZ = 'America/Argentina/Buenos_Aires'

let _resolved = null
let _pending  = null

async function fetchTz() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return DEFAULT_TZ
    const { data } = await supabase
      .from('scouters')
      .select('cities(timezone, countries(timezone))')
      .eq('user_id', user.id)
      .maybeSingle()
    return data?.cities?.timezone || data?.cities?.countries?.timezone || DEFAULT_TZ
  } catch { return DEFAULT_TZ }
}

export function useTz() {
  const [tz, setTz] = useState(() => _resolved || DEFAULT_TZ)

  useEffect(() => {
    if (_resolved) { setTz(_resolved); return }
    if (!_pending) _pending = fetchTz().then(resolved => { _resolved = resolved; return resolved })
    _pending.then(resolved => setTz(resolved))
  }, [])

  return tz
}
