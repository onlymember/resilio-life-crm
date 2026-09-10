import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Users } from 'lucide-react'
import EntityHeader from '../components/EntityHeader.jsx'
import NextAction from '../components/NextAction.jsx'
import ActivityTimeline from '../components/ActivityTimeline.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { t } from '../../i18n/index.js'
import { dbGetActivities, dbGetGeography } from '../../lib/database.js'
import { supabase } from '../../lib/supabase.js'

async function fetchInfluencer(id) {
  const { data, error } = await supabase.from('influencers').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: data.id, name: data.name, username: data.username, email: data.email, phone: data.phone,
    instagram: data.instagram, tiktok: data.tiktok, followers: data.followers ?? 0,
    category: data.category, tier: data.tier, status: data.status,
    cityId: data.city_id, countryId: data.country_id,
    ownerScouterId: data.owner_scouter_id, createdBy: data.created_by,
    notes: data.notes, createdAt: data.created_at, updatedAt: data.updated_at,
    relationshipStatus: data.relationship_status ?? 'cold',
    profileImage: data.profile_image ?? null, engagement: data.engagement ?? null,
    averageViews: data.average_views ?? null, nextAction: data.next_action ?? null,
    nextActionAt: data.next_action_at ?? null, lastContactAt: data.last_contact_at ?? null,
    ...(data.data || {}),
  }
}

export default function InfluencerDetailPage() {
  const { id } = useParams()
  const [entity,     setEntity]     = useState(null)
  const [activities, setActivities] = useState([])
  const [cityName,   setCityName]   = useState(null)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([fetchInfluencer(id), dbGetActivities('influencer', id, 20), dbGetGeography()])
      .then(([inf, acts, geo]) => {
        setEntity(inf)
        setActivities(acts)
        const city = (geo.cities || []).find(c => c.id === inf?.cityId)
        setCityName(city?.name || null)
      })
      .catch(() => setEntity(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>{t('loading.generic')}</div>
  if (!entity)  return <EmptyState icon={Users} title={t('errors.notFound')} subtitle={t('errors.notFoundAccess')}/>

  return (
    <div>
      <EntityHeader entity={entity} entityType="influencer" cityName={cityName} backPath="/network/influencers"/>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <section>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
            {t('nextAction.label')}
          </div>
          <NextAction action={entity.nextAction} actionAt={entity.nextActionAt}/>
        </section>
        <section>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
            {t('contextRail.recentActivity')}
          </div>
          <ActivityTimeline activities={activities}/>
        </section>
      </div>
    </div>
  )
}
