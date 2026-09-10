import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import EntityHeader from '../components/EntityHeader.jsx'
import NextAction from '../components/NextAction.jsx'
import ActivityTimeline from '../components/ActivityTimeline.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'
import { dbGetActivities, dbGetGeography } from '../../lib/database.js'
import { supabase } from '../../lib/supabase.js'

async function fetchBrand(id) {
  const { data, error } = await supabase.from('brands').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: data.id, name: data.name, category: data.category,
    cityId: data.city_id, countryId: data.country_id, status: data.status,
    ownerScouterId: data.owner_scouter_id, createdBy: data.created_by,
    notes: data.notes, website: data.website,
    createdAt: data.created_at, updatedAt: data.updated_at,
    relationshipStatus: data.relationship_status ?? 'cold',
    logo: data.logo ?? null, potentialValue: data.potential_value ?? null,
    nextAction: data.next_action ?? null, nextActionAt: data.next_action_at ?? null,
    lastContactAt: data.last_contact_at ?? null,
    ...(data.data || {}),
  }
}

export default function BrandDetailPage() {
  const { id } = useParams()
  const [entity,     setEntity]     = useState(null)
  const [activities, setActivities] = useState([])
  const [cityName,   setCityName]   = useState(null)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([fetchBrand(id), dbGetActivities('brand', id, 20), dbGetGeography()])
      .then(([brand, acts, geo]) => {
        setEntity(brand)
        setActivities(acts)
        const city = (geo.cities||[]).find(c => c.id === brand?.cityId)
        setCityName(city?.name || null)
      })
      .catch(() => setEntity(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--text-secondary)' }}>{t('loading.generic')}</div>
  if (!entity)  return <EmptyState icon={Building2} title={t('errors.notFound')}/>

  return (
    <div>
      <EntityHeader entity={entity} entityType="brand" cityName={cityName} backPath="/network/brands"/>
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
