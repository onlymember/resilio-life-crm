// Mis intereses. El único estado visible es por la oferta, no por una
// decisión del equipo: "Interés registrado" o "Finalizada".
import React, { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { myInterests, offerImageUrl } from '../api.js'
import { t, errText, useLang } from '../i18n.js'
import { ErrorBox } from '../components/ui.jsx'

export default function Interests() {
  useLang()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => { myInterests().then(setRows).catch(e => { setRows([]); setError(errText(e)) }) }, [])

  return (
    <>
      <h1>{t('interests.title')}</h1>
      <p className="muted" style={{ marginBottom: 18 }}>{t('interests.intro')}</p>
      <ErrorBox>{error}</ErrorBox>
      {rows === null ? (
        [0, 1, 2].map(i => <div key={i} className="club-skel" style={{ height: 80, marginBottom: 10 }}/>)
      ) : rows.length === 0 ? (
        <div className="club-empty">
          <div className="ico"><Heart size={24}/></div>
          <p className="muted">{t('interests.empty')}</p>
        </div>
      ) : rows.map(r => {
        const img = offerImageUrl(r.image_path)
        const live = r.display_status === 'registered'
        return (
          <div key={r.offer_id} className="club-row" style={{ opacity: live ? 1 : 0.6 }}>
            {img ? <img src={img} alt="" loading="lazy"/> : <div className="ph"/>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
              <div className="muted small">{[r.brand_name, r.city_name].filter(Boolean).join(' · ')}</div>
            </div>
            <span className={`club-status ${live ? 'on' : 'off'}`}>{live ? t('interests.registered') : t('interests.ended')}</span>
          </div>
        )
      })}
    </>
  )
}
