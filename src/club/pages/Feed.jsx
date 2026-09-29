// Ofertas. Por defecto las de sus ciudades de interés (si no eligió
// ninguna, todas). Un toque cambia de ciudad. Cada voto saca la card.
import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Heart, X } from 'lucide-react'
import { myFeed, feedCities, voteOffer, markFeedSeen, offerImageUrl } from '../api.js'
import { t, errText, useLang, getLang } from '../i18n.js'
import { Chips, Toast } from '../components/ui.jsx'
import { useAuth } from '../components/chrome.jsx'

function OfferCard({ offer, onVote, leaving }) {
  const img = offerImageUrl(offer.image_path)
  const type = getLang() === 'en' ? offer.type_label_en : offer.type_label_es
  return (
    <article className={`club-card${leaving ? ' leaving' : ''}`}>
      <div className="club-card-img">
        {img && <img src={img} alt="" loading="lazy"/>}
        <span className={`club-badge${offer.is_new ? ' new' : ''}`}>{offer.is_new ? t('feed.new') : type}</span>
        <div className="club-card-over">
          <div className="club-card-meta">
            {offer.brand_logo && <img className="club-brand-logo" src={offer.brand_logo} alt=""/>}
            <span>{offer.brand_name}</span><span>·</span><span>{offer.city_name}</span>
            {offer.is_new && <><span>·</span><span>{type}</span></>}
          </div>
          <h3>{offer.title}</h3>
        </div>
      </div>
      <div className="club-card-actions">
        <button className="club-btn ghost" onClick={() => onVote(offer, 'not_interested')} disabled={leaving}>
          <X size={16}/>{t('feed.notInterested')}
        </button>
        <button className="club-btn" onClick={() => onVote(offer, 'interested')} disabled={leaving}>
          <Heart size={16}/>{t('feed.interested')}
        </button>
      </div>
    </article>
  )
}

export default function Feed() {
  useLang()
  const { profile } = useAuth()
  const hasCities = (profile?.city_ids || []).length > 0
  const [filter,  setFilter]  = useState('mine')   // 'mine' | 'all' | <cityId>
  const [cities,  setCities]  = useState([])
  const [offers,  setOffers]  = useState(null)
  const [leaving, setLeaving] = useState(new Set())
  const [toast,   setToast]   = useState(null)

  const load = useCallback(async (flt) => {
    setOffers(null)
    try {
      const args = flt === 'all' ? { all: true } : flt === 'mine' ? {} : { cityId: flt }
      setOffers(await myFeed(args))
    } catch (e) { setOffers([]); setToast(errText(e)) }
  }, [])

  useEffect(() => { feedCities().then(setCities).catch(() => {}) }, [])
  useEffect(() => { load(filter) }, [filter, load])

  // "Visto" al salir: las "Nueva" de esta visita dejan de serlo la próxima.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') markFeedSeen().catch(() => {}) }
    document.addEventListener('visibilitychange', onHide)
    return () => { document.removeEventListener('visibilitychange', onHide); markFeedSeen().catch(() => {}) }
  }, [])

  const vote = async (offer, v) => {
    setLeaving(prev => new Set(prev).add(offer.id))
    try {
      await voteOffer(offer.id, v)
      setTimeout(() => setOffers(prev => (prev || []).filter(o => o.id !== offer.id)), 420)
      setCities(prev => prev.map(c => c.city_name === offer.city_name ? { ...c, unvoted: Math.max(0, c.unvoted - 1) } : c))
    } catch (e) {
      setLeaving(prev => { const n = new Set(prev); n.delete(offer.id); return n })
      setToast(errText(e))
    }
  }

  const options = [
    ...(hasCities ? [{ value: 'mine', label: t('feed.mine') }] : []),
    { value: 'all', label: t('feed.all') },
    ...cities.map(c => ({ value: c.city_id, label: c.city_name, dot: Number(c.new_offers) > 0 })),
  ]
  const current = !hasCities && filter === 'mine' ? 'all' : filter

  return (
    <>
      <h1>{t('feed.title')}</h1>
      <div style={{ margin: '12px 0 18px' }}>
        <Chips scroll multi={false} value={current} onChange={setFilter} options={options}/>
      </div>

      {!hasCities && <div className="club-note" style={{ marginBottom: 16 }}>
        <Link to="/perfil">{t('feed.chooseCities')}</Link>
      </div>}

      {offers === null ? (
        <div className="club-skel" style={{ aspectRatio: '4 / 5', width: '100%' }}/>
      ) : offers.length === 0 ? (
        <div className="club-empty">
          <div className="ico"><Sparkles size={24}/></div>
          <h2>{t('feed.emptyTitle')}</h2>
          <p className="muted">{t('feed.emptyBody')}</p>
        </div>
      ) : (
        offers.map(o => <OfferCard key={o.id} offer={o} onVote={vote} leaving={leaving.has(o.id)}/>)
      )}
      <Toast message={toast} onDone={() => setToast(null)}/>
    </>
  )
}
