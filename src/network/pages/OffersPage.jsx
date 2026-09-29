// Ofertas: lo que ven las influencers en club.resilio.company.
// Solo super_admin, admin y network_direction (la base lo exige igual).
// Flujo: se elige una marca del sistema → "Nueva oferta" (foto, título,
// ciudad, tipo) → se activa o desactiva.
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Gift, Search, Plus, ImagePlus, Heart, Pencil } from 'lucide-react'
import EmptyState from '../components/EmptyState.jsx'
import { t, currentLocale } from '../../i18n/index.js'
import { dbGetBrands, dbGetGeography } from '../../lib/database.js'
import {
  redGetOffers, redGetOfferTypes, redGetInterestCounts, redSaveOffer,
  redSetOfferStatus, redUploadOfferImage,
  OFFER_IMAGE_TYPES, OFFER_IMAGE_MAX_BYTES,
} from '../../lib/red.js'
import { Sheet, ErrorLine, btn, inputStyle, labelStyle, card } from '../red/ui.jsx'

const typeLabel = (types, slug) => {
  const ty = types.find(x => x.slug === slug)
  if (!ty) return slug
  return currentLocale() === 'en' ? ty.labelEn : ty.labelEs
}

function Switch({ on, onChange, disabled, label }) {
  return (
    <button
      role="switch" aria-checked={on} aria-label={label} disabled={disabled}
      onClick={e => { e.stopPropagation(); onChange(!on) }}
      style={{
        width: 40, height: 22, borderRadius: 11, border: 'none', padding: 2, flexShrink: 0,
        background: on ? 'var(--primary-violet)' : 'rgba(255,255,255,0.15)',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        transition: 'background .15s',
      }}
    >
      <span style={{ display: 'block', width: 18, height: 18, borderRadius: 9, background: 'white', transform: on ? 'translateX(18px)' : 'none', transition: 'transform .15s' }}/>
    </button>
  )
}

function OfferRow({ offer, types, count, onToggle, onEdit, busy, showBrand }) {
  return (
    <div style={{ ...card, display: 'flex', gap: 12, alignItems: 'center', padding: 10 }}>
      <div style={{ width: 64, height: 64, borderRadius: 10, flexShrink: 0, overflow: 'hidden', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {offer.imageUrl
          ? <img src={offer.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          : <ImagePlus size={20} color="var(--text-secondary)"/>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{offer.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
          {[showBrand && offer.brandName, offer.cityName, typeLabel(types, offer.typeSlug)].filter(Boolean).join(' · ')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
          <Heart size={11}/>{t('red.offers.interested', { n: count || 0 })}
        </div>
      </div>
      <button onClick={() => onEdit(offer)} aria-label={t('red.offers.edit')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 6 }}>
        <Pencil size={15}/>
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <Switch
          on={offer.status === 'active'}
          disabled={busy || (!offer.imagePath && offer.status !== 'active')}
          onChange={on => onToggle(offer, on)}
          label={t('red.offers.activeLabel')}
        />
        <span style={{ fontSize: 10, color: offer.status === 'active' ? 'var(--primary-violet-light)' : 'var(--text-secondary)' }}>
          {offer.status === 'active' ? t('red.offers.active') : t('red.offers.inactive')}
        </span>
      </div>
    </div>
  )
}

function OfferSheet({ brand, offer, cities, types, onClose, onSaved }) {
  const editing = !!offer
  const [title,    setTitle]    = useState(offer?.title ?? '')
  const [cityId,   setCityId]   = useState(offer?.cityId ?? brand?.cityId ?? '')
  const [typeSlug, setTypeSlug] = useState(offer?.typeSlug ?? '')
  const [file,     setFile]     = useState(null)
  const [preview,  setPreview]  = useState(offer?.imageUrl ?? null)
  const [activate, setActivate] = useState(offer ? offer.status === 'active' : true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)

  useEffect(() => () => { if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview) }, [preview])

  const pick = (f) => {
    setError(null)
    if (!f) return
    if (!OFFER_IMAGE_TYPES.includes(f.type)) { setError(t('red.offers.errImageType')); return }
    if (f.size > OFFER_IMAGE_MAX_BYTES)     { setError(t('red.offers.errImageSize')); return }
    setFile(f); setPreview(URL.createObjectURL(f))
  }

  const hasImage = !!file || !!offer?.imagePath
  const valid = title.trim().length >= 3 && cityId && typeSlug && hasImage

  const save = async () => {
    if (!valid || saving) return
    setSaving(true); setError(null)
    try {
      const brandId = offer?.brandId ?? brand.id
      const imagePath = file ? await redUploadOfferImage(file, brandId) : offer?.imagePath
      const saved = await redSaveOffer({
        id: offer?.id, brandId, cityId, title, typeSlug, imagePath,
        status: activate ? 'active' : 'inactive',
      })
      onSaved(saved)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Sheet
      title={editing ? t('red.offers.editTitle') : t('red.offers.newTitle')}
      subtitle={offer?.brandName ?? brand?.name}
      onClose={onClose}
      footer={
        <button onClick={save} disabled={!valid || saving} style={{ ...btn.primary, width: '100%', opacity: !valid || saving ? 0.5 : 1 }}>
          {saving ? t('red.common.saving') : editing ? t('red.common.save') : t('red.offers.create')}
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={{ display: 'block', cursor: 'pointer' }}>
          <span style={labelStyle}>{t('red.offers.photo')} *</span>
          <div style={{ height: 180, borderRadius: 14, overflow: 'hidden', border: '1px dashed var(--border-violet)', background: 'rgba(139,92,246,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6, color: 'var(--text-secondary)', fontSize: 12 }}>
            {preview
              ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              : <><ImagePlus size={22}/>{t('red.offers.photoHint')}</>}
          </div>
          <input type="file" accept={OFFER_IMAGE_TYPES.join(',')} onChange={e => pick(e.target.files?.[0])} style={{ display: 'none' }}/>
        </label>

        <div>
          <label style={labelStyle} htmlFor="offer-title">{t('red.offers.titleField')} *</label>
          <input id="offer-title" value={title} maxLength={120} onChange={e => setTitle(e.target.value)} placeholder={t('red.offers.titlePlaceholder')} style={inputStyle}/>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle} htmlFor="offer-city">{t('red.offers.city')} *</label>
            <select id="offer-city" value={cityId} onChange={e => setCityId(e.target.value)} style={inputStyle}>
              <option value="">{t('red.common.choose')}</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="offer-type">{t('red.offers.type')} *</label>
            <select id="offer-type" value={typeSlug} onChange={e => setTypeSlug(e.target.value)} style={inputStyle}>
              <option value="">{t('red.common.choose')}</option>
              {types.map(ty => <option key={ty.slug} value={ty.slug}>{typeLabel(types, ty.slug)}</option>)}
            </select>
          </div>
        </div>

        <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{t('red.offers.activeLabel')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{t('red.offers.activeHint')}</div>
          </div>
          <Switch on={activate} onChange={setActivate} label={t('red.offers.activeLabel')}/>
        </div>

        <ErrorLine error={error}/>
      </div>
    </Sheet>
  )
}

export default function OffersPage() {
  const [tab,       setTab]       = useState('brands')
  const [brands,    setBrands]    = useState([])
  const [brandTotal,setBrandTotal]= useState(0)
  const [search,    setSearch]    = useState('')
  const [offers,    setOffers]    = useState([])
  const [counts,    setCounts]    = useState({})
  const [types,     setTypes]     = useState([])
  const [cities,    setCities]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [statusF,   setStatusF]   = useState('all')
  const [sheet,     setSheet]     = useState(null)   // { brand } | { offer }
  const [busyId,    setBusyId]    = useState(null)

  const loadOffers = useCallback(async () => {
    const list = await redGetOffers()
    setOffers(list)
    setCounts(await redGetInterestCounts(list.map(o => o.id)))
  }, [])

  const loadBrands = useCallback(async (s = '') => {
    const res = await dbGetBrands({ page: 0, pageSize: 50, search: s || undefined, orderBy: 'name', orderDir: 'asc' })
    setBrands(res.rows); setBrandTotal(res.total)
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadOffers(), loadBrands(), redGetOfferTypes(), dbGetGeography()])
      .then(([, , ty, geo]) => { setTypes(ty); setCities(geo.cities || []) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [loadOffers, loadBrands])

  const offersByBrand = useMemo(() => {
    const m = {}
    for (const o of offers) (m[o.brandId] ||= []).push(o)
    return m
  }, [offers])

  const handleSearch = (v) => {
    setSearch(v)
    loadBrands(v).catch(e => setError(e.message))
  }

  const toggle = async (offer, on) => {
    setBusyId(offer.id); setError(null)
    try {
      const saved = await redSetOfferStatus(offer.id, on ? 'active' : 'inactive')
      setOffers(prev => prev.map(o => o.id === saved.id ? saved : o))
    } catch (e) { setError(e.message) }
    finally { setBusyId(null) }
  }

  const onSaved = (saved) => {
    setOffers(prev => prev.some(o => o.id === saved.id)
      ? prev.map(o => o.id === saved.id ? saved : o)
      : [saved, ...prev])
    setSheet(null)
  }

  const visibleOffers = offers.filter(o => statusF === 'all' || o.status === statusF)
  const activeCount = offers.filter(o => o.status === 'active').length

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setTab(id)} style={{
      padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
      background: tab === id ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.07)',
      color: tab === id ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
      border: tab === id ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border-violet)',
    }}>{label}</button>
  )

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{t('red.offers.title')}</h1>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('red.offers.subtitle', { active: activeCount, total: offers.length })}</p>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {tabBtn('brands', t('red.offers.tabBrands'))}
        {tabBtn('offers', t('red.offers.tabOffers'))}
      </div>

      <ErrorLine error={error}/>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map(i => <div key={i} style={{ height: 80, borderRadius: 14, background: 'rgba(139,92,246,0.06)', border: '1px solid var(--border-violet)' }}/>)}
        </div>
      ) : tab === 'brands' ? (
        <>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}/>
            <input value={search} onChange={e => handleSearch(e.target.value)} placeholder={t('red.offers.searchBrand')} style={{ ...inputStyle, paddingLeft: 34 }}/>
          </div>
          {brands.length === 0 ? (
            <EmptyState icon={Gift} title={search ? t('empty.noResults') : t('empty.noBrands')}/>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {brands.map(b => {
                const list = offersByBrand[b.id] || []
                return (
                  <div key={b.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--primary-violet-light)' }}>
                        {b.logo ? <img src={b.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : (b.name || '?').slice(0, 1).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {t('red.offers.brandCount', { active: list.filter(o => o.status === 'active').length, total: list.length })}
                        </div>
                      </div>
                      <button onClick={() => setSheet({ brand: b })} style={btn.primary}>
                        <Plus size={14}/>{t('red.offers.newShort')}
                      </button>
                    </div>
                    {list.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {list.map(o => (
                          <OfferRow key={o.id} offer={o} types={types} count={counts[o.id]}
                            busy={busyId === o.id} onToggle={toggle} onEdit={off => setSheet({ offer: off })}/>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {brandTotal > brands.length && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', padding: 8 }}>
                  {t('red.offers.moreBrands', { n: brandTotal - brands.length })}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['all', t('red.offers.filterAll')], ['active', t('red.offers.filterActive')], ['inactive', t('red.offers.filterInactive')]].map(([id, label]) => (
              <button key={id} onClick={() => setStatusF(id)} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: statusF === id ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.07)',
                color: statusF === id ? 'var(--primary-violet-light)' : 'var(--text-secondary)',
                border: statusF === id ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border-violet)',
              }}>{label}</button>
            ))}
          </div>
          {visibleOffers.length === 0 ? (
            <EmptyState icon={Gift} title={t('red.offers.empty')} subtitle={t('red.offers.emptyHint')}
              actionLabel={t('red.offers.tabBrands')} onAction={() => setTab('brands')}/>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visibleOffers.map(o => (
                <OfferRow key={o.id} offer={o} types={types} count={counts[o.id]} showBrand
                  busy={busyId === o.id} onToggle={toggle} onEdit={off => setSheet({ offer: off })}/>
              ))}
            </div>
          )}
        </>
      )}

      {sheet && (
        <OfferSheet
          brand={sheet.brand} offer={sheet.offer}
          cities={cities} types={types}
          onClose={() => setSheet(null)} onSaved={onSaved}
        />
      )}
    </div>
  )
}

