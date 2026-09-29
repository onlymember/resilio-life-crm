// Inicio: pantalla fija, sin scroll vertical.
//   Arriba: buscador de ciudad + país, y una fila con Mis ciudades /
//   Todas / cada ciudad. Abajo: una oferta a la vez, solo la imagen,
//   con "No me interesa" / "Me interesa" encima. Al votar pasa a la otra.
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Sparkles, Heart, X, Search } from 'lucide-react'
import { myFeed, feedCities, voteOffer, markFeedSeen, offerImageUrl, listCities } from '../api.js'
import { t, errText, useLang } from '../i18n.js'
import { Chips, Toast } from '../components/ui.jsx'
import { useAuth } from '../components/chrome.jsx'

export default function Feed() {
  useLang()
  const { profile } = useAuth()
  const hasCities = (profile?.city_ids || []).length > 0
  const [filter,   setFilter]   = useState(hasCities ? 'mine' : 'all')
  const [cities,   setCities]   = useState([])     // con ofertas activas
  const [catalog,  setCatalog]  = useState({})     // id → { countryId, countryName }
  const [q,        setQ]        = useState('')
  const [country,  setCountry]  = useState('')
  const [offers,   setOffers]   = useState(null)
  const [leaving,  setLeaving]  = useState(false)
  const [toast,    setToast]    = useState(null)

  const load = useCallback(async (flt) => {
    setOffers(null)
    try {
      const args = flt === 'all' ? { all: true } : flt === 'mine' ? {} : { cityId: flt }
      setOffers(await myFeed(args))
    } catch (e) { setOffers([]); setToast(errText(e)) }
  }, [])

  useEffect(() => {
    feedCities().then(setCities).catch(() => {})
    listCities().then(list => { const m = {}; list.forEach(c => { m[c.id] = c }); setCatalog(m) })
  }, [])
  useEffect(() => { load(filter) }, [filter, load])

  // "Visto" al salir: las "Nueva" de esta visita dejan de serlo la próxima.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') markFeedSeen().catch(() => {}) }
    document.addEventListener('visibilitychange', onHide)
    return () => { document.removeEventListener('visibilitychange', onHide); markFeedSeen().catch(() => {}) }
  }, [])

  const countries = useMemo(() => {
    const m = {}
    cities.forEach(c => { const k = catalog[c.city_id]; if (k?.countryId) m[k.countryId] = k.countryName })
    return Object.entries(m).sort((a, b) => a[1].localeCompare(b[1]))
  }, [cities, catalog])

  const visibleCities = cities.filter(c =>
    (!country || catalog[c.city_id]?.countryId === country) &&
    (!q || c.city_name.toLowerCase().includes(q.trim().toLowerCase())))

  const options = [
    ...(hasCities ? [{ value: 'mine', label: t('feed.mine') }] : []),
    { value: 'all', label: t('feed.all') },
    ...visibleCities.map(c => ({ value: c.city_id, label: c.city_name, dot: Number(c.new_offers) > 0 })),
  ]

  const offer = offers?.[0]
  const vote = async (v) => {
    if (!offer || leaving) return
    setLeaving(true)
    try {
      await voteOffer(offer.id, v)
      setTimeout(() => { setOffers(prev => (prev || []).slice(1)); setLeaving(false) }, 350)
    } catch (e) { setLeaving(false); setToast(errText(e)) }
  }

  return (
    <div className="club-feed">
      <div className="club-feed-bar">
        <div className="club-feed-search">
          <div className="club-feed-search-in">
            <Search size={14}/>
            <input className="club-input" value={q} onChange={e => setQ(e.target.value)} placeholder={t('feed.searchCity')} aria-label={t('feed.searchCity')}/>
          </div>
          {countries.length > 1 && (
            <select className="club-input" value={country} onChange={e => setCountry(e.target.value)} aria-label={t('feed.allCountries')}>
              <option value="">{t('feed.allCountries')}</option>
              {countries.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          )}
        </div>
        <Chips scroll multi={false} value={filter} onChange={setFilter} options={options}/>
      </div>

      <div className="club-feed-stage">
        {offers === null ? (
          <div className="club-skel" style={{ width: '100%', height: '100%' }}/>
        ) : !offer ? (
          <div className="club-empty">
            <div className="ico"><Sparkles size={24}/></div>
            <h2>{t('feed.emptyTitle')}</h2>
            <p className="muted">{t('feed.emptyBody')}</p>
          </div>
        ) : (
          <div key={offer.id} className={`club-feed-card${leaving ? ' leaving' : ''}`}>
            <img src={offerImageUrl(offer.image_path)} alt={offer.title}/>
            {offer.is_new && <span className="club-badge new">{t('feed.new')}</span>}
            <div className="club-feed-actions">
              <button className="club-btn ghost" onClick={() => vote('not_interested')} disabled={leaving} aria-label={t('feed.notInterested')}>
                <X size={16}/>{t('feed.notInterested')}
              </button>
              <button className="club-btn" onClick={() => vote('interested')} disabled={leaving} aria-label={t('feed.interested')}>
                <Heart size={16}/>{t('feed.interested')}
              </button>
            </div>
          </div>
        )}
      </div>
      <Toast message={toast} onDone={() => setToast(null)}/>
    </div>
  )
}
