# Data Layer — Resilio Life CRM

## Stack

React 18 SPA + Supabase JS v2. No React Router — navigation via `currentView` useState in `App.jsx`. All DB access goes through `src/lib/database.js`. Auth wrappers are in `src/lib/auth.js` (re-exports from database.js). RPC metric wrappers are in `src/lib/metrics.js`.

---

## Module map

| File | Responsibility |
|------|---------------|
| `src/lib/supabase.js` | Single Supabase client instance |
| `src/lib/database.js` | All table CRUD + row mappers |
| `src/lib/auth.js` | Re-exports DB fns under short names; Supabase Auth wrappers |
| `src/lib/metrics.js` | RPC wrappers: network_stats, network_alerts, scouter_performance, goal_progress, global_search |

---

## Entities and their DB functions

### Profiles / Users
`dbGetUsers`, `dbGetCurrentUser`, `dbRegister`, `dbUpdateUser`, `dbApproveUser`, `dbBlockUser`, `dbUnblockUser`, `dbDeleteUser`

### Influencers
`dbGetInfluencers`, `dbSaveInfluencer`, `dbDeleteInfluencer`

### Brands
`dbGetBrands`, `dbSaveBrand`, `dbDeleteBrand`

### Locations (geography)
`dbGetLocations`, `dbGetGeography`, `dbSaveLocation`, `dbDeleteLocation`

### Campaigns (Influencer Agency)
`dbGetCampaigns`, `dbSaveCampaign`, `dbDeleteCampaign`

- Soft delete: `status = 'archived'` (filtered out by `dbGetCampaigns`)
- N:M influencer assignment via `campaign_influencers` join table
- `dbSaveCampaign` accepts `influencerIds: string[]` for bulk sync **or** `influencerIds: null` to skip CI sync entirely (use when the caller manages CIs individually).
- `dbGetCampaigns` returns campaigns with `influencerIds[]` attached (via join); the individual rates/fields require `dbGetCampaignInfluencers`.

### Campaign Influencers (campaign_influencers)

Per-participant data for a campaign. Each row stores rate, currency, deliverables and status independently.

| Function | Description |
|----------|-------------|
| `dbGetCampaignInfluencers(campaignId)` | Returns all rows for a campaign with rate, currency, deliverables, status |
| `dbAddInfluencerToCampaign(campId, infId, fields)` | INSERT with `{ rate, currency, deliverables[], status }` |
| `dbUpdateCampaignInfluencer(campId, infId, updates)` | Partial UPDATE by field |
| `dbRemoveInfluencerFromCampaign(campId, infId)` | DELETE the relationship row. **Does NOT touch `influencers` table.** |

UI usage: `CampaignModal` in `InfluencerAgencyView` uses these functions directly (via props from App.jsx). The modal loads existing CIs on open, shows one editable row per influencer, and calls add/update/remove on save.

### Opportunities

`dbGetOpportunities`, `dbSaveOpportunity`

- No soft delete yet — status transitions are meaningful (new → contacted → won/lost).
- Status changes trigger `log_activity_auto` (`trg_act_opportunity`) automatically.
- No UI yet (planned for 2C/2D). Verifiable via `scripts/test6_opportunities.mjs`.

### Collaborations
`dbGetCollaborations`, `dbSaveCollaboration`, `dbDeleteCollaboration`

- Soft delete: `status = 'cancelled'`
- `activation_type_id` is a UUID FK to `activation_types` (added in migration 018; the old `activation_type TEXT` column was removed)

### Activation Types
`dbGetActivationTypes(force?)`

- Module-level cache (`_actTypesCache`). Pass `force=true` to bypass.
- Reads from `activation_types` table where `active = true`, ordered by `sort_order`.
- Three seed rows: life / estandar / especial (with color).

### Activities (audit trail)
`dbLogActivityFor(actorId, entityType, entityId, type, title, description?, metadata?)`
`dbGetActivities(entityType, entityId, limit?)`

Real schema (from `05-transversales.sql`):

| Column | Type | Notes |
|--------|------|-------|
| actor_id | UUID | who performed the action |
| entity_type | TEXT | 'influencer', 'brand', 'campaign', 'admin', … |
| entity_id | TEXT | cast to string — column is TEXT not UUID |
| type | TEXT | action code, e.g. 'user_approved' |
| title | TEXT | human-readable summary |
| description | TEXT | nullable detail |
| metadata | JSONB | arbitrary extra data |
| occurred_at | TIMESTAMPTZ | auto-set by DB default |

**Do NOT insert into `activities` from the client for entity state changes.** The table exists for manual log entries (admin actions), but all business-entity changes (campaign created, opportunity status changed, etc.) are written exclusively by `log_activity_auto` in `011_activities_auto.sql`. Writing them from the client would create duplicates.

Triggers that auto-insert into `activities`:

| Table | Trigger | Events |
|-------|---------|--------|
| `influencers` | `trg_act_influencer` | INSERT (`created`), UPDATE status (`status_change`) |
| `brands` | `trg_act_brand` | same |
| `opportunities` | `trg_act_opportunity` | same |
| `campaigns` | `trg_act_campaign` | same |
| `collaborations` | `trg_act_collaboration` | same |

Admin panel compat shims: `dbLogActivity({ userId, userName, accion, detalle, seccion })` and `dbGetActivityLog(limit?)` map the old AdminPanel shape to the real schema (entity_type = 'admin').

### Missions / Goals
`dbGetMissions`

---

## Row mappers

Every `db*` function returns camelCase JS objects. The mapper pattern is:

```js
const rowToFoo = (r) => ({
  id:          r.id,
  someField:   r.some_field,
  createdAt:   r.created_at,
})
```

Never access raw `snake_case` keys outside of `database.js`.

---

## RLS rules (summary)

All tables use Row Level Security. Key policies:

- **Influencers**: visible to users whose city/country/region overlaps, or to Direction. Scouters see only their own.
- **Campaigns**: `app_can_see_campaign()` security-definer helper breaks recursion. `camp_update` allows owner or Direction to edit.
- **campaign_influencers**: `app_influencer_in_my_campaign()` / `app_campaign_has_my_influencer()` — security DEFINER to avoid recursive policy evaluation.
- **Activities**: insert-only from client (no update/delete policy).
- **audit_log**: no client policy — triggers only.

RLS recursion rule: **never have a policy query another RLS-protected table**. Use security DEFINER functions as intermediaries (see `016_fix_policy_recursion.sql`).

---

## Write pattern

All writes are DB-first. Never update local state before the DB confirms:

```js
const saved = await dbSaveFoo(data, currentUser.id)   // DB first
setFoos(prev => upsert(prev, saved))                   // local state second
```

New records: pass `id: null`. DB generates the UUID and returns it. `isUuid(id)` distinguishes INSERT (false) from UPDATE (true).

---

## Error handling

`friendly(error)` in `database.js` translates Postgres error codes to Spanish UI messages. Every `db*` function throws on error — callers show the message on screen. No error is silently discarded.

---

## Metrics RPCs

All defined in `src/lib/metrics.js`. All DB functions are `SECURITY INVOKER` — the result depends on the caller's RLS context, so a regional_lead and Dirección see the same screen with different data.

| Function | RPC | Params |
|----------|-----|--------|
| `getNetworkStats` | `network_stats` | cityId, countryId, regionId, from, to |
| `getNetworkAlerts` | `network_alerts` | — |
| `getScouterPerformance` | `scouter_performance` | userId, from, to |
| `getGoalProgress` | `goal_progress` | goalId |
| `searchGlobal` | `global_search` | q, lim |

---

## Migration history

| File | What it does |
|------|-------------|
| `fase1/01-schema.sql` … `fase1/05-transversales.sql` | Base schema |
| `011_activities_auto.sql` | Triggers: auto-insert activities on entity changes; audit_log for budget/delete |
| `012_metrics.sql` | goal_progress, scouter_performance views |
| `013_command_center.sql` | network_stats, network_alerts |
| `014_search_and_tasks.sql` | global_search, generate_recurring_tasks |
| `015_notifications.sql` | notifications table + triggers |
| `016_fix_policy_recursion.sql` | Security DEFINER helpers for RLS cycles |
| `017_reset_datos_prueba.sql` | TRUNCATE test data (no schema change) |
| `018_activation_types.sql` | activation_types table; collaborations.activation_type_id replaces activation_type TEXT |
| `019_fix_tasks_view.sql` | tasks_view SET security_invoker = true |
| `020_campaigns_archived.sql` | Add 'archived' to campaigns.status CHECK |

**Rule**: SQL is written as a file in `supabase/` first, then run in the dashboard. Never the reverse.

---

## localStorage — lo que ya NO se usa para datos de red

Las siguientes claves existían antes del 2A y están eliminadas del código:

| Clave localStorage | Era | Reemplazada por |
|--------------------|-----|-----------------|
| `crm_inf_camps_v2` | Campañas de influencers | `campaigns` en Supabase |
| `crm_collabs` | Colaboraciones | `collaborations` en Supabase |
| `crm_missions_v1` | Misiones | `missions` en Supabase |

Las que se siguen usando son solo preferencias de UX: `crm_theme`, `crm_view`, `crm_sidebar`.

---

## Scripts de verificación

```bash
# Test 3 — quitar influencer de campaña NO borra el influencer
TEST_EMAIL=tu@email.com TEST_PASSWORD=tu_pass node scripts/test3_cascade.mjs

# Test 6 — trigger log_activity_auto dispara 3 actividades al mover una oportunidad
TEST_EMAIL=tu@email.com TEST_PASSWORD=tu_pass node scripts/test6_opportunities.mjs
```
