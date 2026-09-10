import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Briefcase, ChevronLeft } from 'lucide-react'
import NextAction from '../components/NextAction.jsx'
import ActivityTimeline from '../components/ActivityTimeline.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'
import { dbGetActivities } from '../../lib/database.js'
import { supabase } from '../../lib/supabase.js'

async function fetchOpportunity(id) {
  const { data, error } = await supabase.from('opportunities').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: data.id, title: data.title, status: data.status,
    brandId: data.brand_id, scouterId: data.owner_scouter_id,
    value: data.value, currency: data.currency, notes: data.notes,
    createdAt: data.created_at, updatedAt: data.updated_at,
    nextAction: data.next_action ?? null, nextActionAt: data.next_action_at ?? null,
  }
}

export default function OpportunityDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [entity,     setEntity]     = useState(null)
  const [activities, setActivities] = useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([fetchOpportunity(id), dbGetActivities('opportunity', id, 20)])
      .then(([opp, acts]) => { setEntity(opp); setActivities(acts) })
      .catch(() => setEntity(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--text-secondary)' }}>{t('loading.generic')}</div>
  if (!entity)  return <EmptyState icon={Briefcase} title={t('errors.notFound')}/>

  const fmtMoney = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`

  return (
    <div>
      <div style={{ background:'var(--glass-bg)', backdropFilter:'blur(40px)', borderBottom:'1px solid var(--border-violet)', padding:'16px 20px' }}>
        <button onClick={() => navigate('/network/opportunities')} style={{ display:'flex', alignItems:'center', gap:6, color:'var(--text-secondary)', fontSize:12, marginBottom:14, background:'none', border:'none', cursor:'pointer', padding:0 }}>
          <ChevronLeft size={14}/>{t('nav.back')}
        </button>
        <div style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>{entity.title}</div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{entity.status}</span>
          {entity.value && <span style={{ fontSize:12, color:'var(--primary-violet-light)', fontWeight:600 }}>{fmtMoney(entity.value)}</span>}
        </div>
      </div>
      <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:20 }}>
        <section>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 }}>{t('nextAction.label')}</div>
          <NextAction action={entity.nextAction} actionAt={entity.nextActionAt}/>
        </section>
        <section>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 }}>{t('contextRail.recentActivity')}</div>
          <ActivityTimeline activities={activities}/>
        </section>
      </div>
    </div>
  )
}
