# Plan 2G — Manual, Seguimiento, Colaboraciones, Oportunidades

## Context check

### Confirmed DB state (from SQL files)
- `opportunities` table: has `description TEXT`, `source TEXT`, `lost_reason TEXT` in original schema.
  `status` is enum `opportunity_status` with all 8 values already: new · qualifying · contacted · in_conversation · proposal · won · lost · on_hold.
  Column is `estimated_value` in schema but JS code writes `value` — actual DB column is `value` (code already works for creates).
- `manual_sections` / `manual_categories`: created per prompt (migrations already applied).
  RLS filters by `min_level` against `scouters.level`. NOT duplicated in client.
- `collaborations`: fully wired from 2A. `dbGetCollaborations`, `dbSaveCollaboration`, `dbGetActivationTypes` exist.
- `my_agenda(p_days_ahead)`: exists in metrics.js, used by HomePage with 7 days. FollowUpsPage uses 365.

### Gaps in database.js
- `rowToOpportunity` missing: `description`, `source`, `lostReason`
- `dbGetOpportunities` missing: `cityId` filter
- `dbSaveOpportunity` missing: `description`, `source`, `lostReason`
- `dbPatchOpportunity` — doesn't exist
- `dbPatchCollaboration` — doesn't exist
- `dbGetCollaborations` — no pagination, no join for names
- `dbGetManual`, `dbGetManualCategories`, `dbPatchManual` — don't exist

### No SQL needed
All DB structures exist. `rowToOpportunity` just needs to map the 3 extra fields.

---

## Files to create (7)

| File | Purpose |
|------|---------|
| `src/network/pages/ManualPage.jsx` | Single-page readable manual, scrollspy nav, inline edit for Direction |
| `src/network/pages/FollowUpsPage.jsx` | All follow-ups (365d), grouped by period, per-group pagination |
| `src/network/pages/CollaborationDetailPage.jsx` | Editable collab detail, same pattern as BrandDetailPage |
| `src/network/components/ManualNav.jsx` | Sticky horizontal category bar + scrollspy listener |
| `src/network/components/ManualSection.jsx` | Renders one section: title/subtitle/body + edit button for Direction |
| `src/network/components/SimpleMarkdown.jsx` | `**bold**`, paragraphs, `1. list` → React elements, no innerHTML |
| `src/network/components/CollaborationCard.jsx` | Collab list card with activation type color badge |

## Files to modify (9)

| File | What changes |
|------|-------------|
| `src/lib/database.js` | +dbGetManual, +dbGetManualCategories, +dbPatchManual, +dbPatchCollaboration, +dbPatchOpportunity; update rowToOpportunity (+3 fields), dbGetOpportunities (+cityId), dbSaveOpportunity (+desc/source/lostReason), dbGetCollaborations (+pagination+join) |
| `src/network/pages/CollaborationsPage.jsx` | Shell → real list with CollaborationCard, status chips, pagination |
| `src/network/pages/OpportunitiesPage.jsx` | Add kanban (desktop) + grouped list (mobile) + filters |
| `src/network/pages/OpportunityDetailPage.jsx` | Shell → full editable detail (7 sections) |
| `src/network/nav.js` | Manual under INICIO soon:false; follow-ups soon:false |
| `src/network/routes.js` | manual+follow-ups soon:false; add /collaborations/:id |
| `src/network/NetworkApp.jsx` | Add CollaborationDetailPage route; wire ManualPage, FollowUpsPage |
| `src/i18n/es.json` | manual.*, followups.*, collab.*, opportunities.status.* all 8 |
| `src/i18n/en.json` | same keys in English |

---

## Key design decisions

### Manual
- `dbGetManual()` → `supabase.from('manual_sections').select('*, manual_categories(code, name)')` ordered by `manual_categories.sort_order` then `sort_order`. RLS handles level filtering.
- Scrollspy: `IntersectionObserver` on section elements (threshold 0.3). First category whose first section is visible wins.
- Scroll to section: `element.scrollIntoView({ behavior: 'smooth', block: 'start' })`. Guard with a 300ms debounce on the observer to prevent fighting the smooth scroll.
- Inline edit: on save calls `dbPatchManual(id, { body: newBody })`. Only shows edit button if `currentUser.rol` is in COMMAND_ROLES (Direction check handled by RLS too — belt-and-suspenders for UX, not security).
- Reading layout: `maxWidth: '65ch'`, `lineHeight: 1.8`, section gap 32px, body font-size 15px.

### SimpleMarkdown
Pattern: split body by `\n\n` → paragraphs. Each paragraph: if starts with `\d+\. ` lines → render as `<ol>`. Otherwise render as `<p>` with `**text**` → `<strong>` spans (regex split). NEVER uses dangerouslySetInnerHTML. Escapes `<`, `>`, `&` before processing.

### FollowUpsPage
Groups:
- VENCIDOS: `item.isOverdue === true`
- HOY: `item.isToday === true && !item.isOverdue`
- ESTA SEMANA: dueAt within next 7 days, not today/overdue
- MÁS ADELANTE: everything else

Pagination per group: show first 20, "Ver más (N)" button per group. No network re-fetch — slice from the loaded array.

Filter by entity type (influencer/brand/opportunity) and state (overdue/upcoming) applied client-side on the already-loaded array.

### CollaborationsPage
- Load: `dbGetCollaborations({ page, pageSize: 30, ...filters })` + `dbGetActivationTypes()` in parallel.
- Type badge: `activation_types` row by ID → `{ name, color }`. Never hardcoded.
- Status chips: proposed · confirmed · in_progress · content_pending · completed. Cancelled hidden by default (dbGetCollaborations already filters them out).
- Clicking card → navigate to `/network/collaborations/:id`.

### CollaborationDetailPage
- Fetch: `collab`, `dbGetEntityTimeline('collaboration', id)`, `dbGetActivationTypes()`, plus if we need influencer/brand names: fetch `profiles` (influencer) and `brands` (brand) by ID.
- Sections: DATOS (influencer selector, brand selector, campaign id, activation type), FECHAS, ENTREGABLES (editable list with add/remove), ESTADO (status + content_status + payment_status), ECONOMÍA (amount + currency), RESULTADOS (free JSON display, editable as textarea → JSON.parse), ACTIVIDAD.
- `dbPatchCollaboration` saves only dirty fields.

### OpportunitiesPage — Kanban (desktop)
- Drag: native HTML5. Each card: `draggable`. `onDragStart` sets `dataTransfer.setData('cardId', id)` and `dataTransfer.setData('fromStatus', status)`.
- Column: `onDragOver={e => e.preventDefault()}` + `onDrop` reads the card ID, calls `dbPatchOpportunity(id, { status: colStatus })`, updates local state.
- All records loaded with `pageSize: 200` (show note if hasMore). Groups by status.
- Columns scrollable vertically, container scrolls horizontally.

### OpportunitiesPage — List (mobile)
- Grouped by status, collapsible sections or just visual headers.
- Inline status select on each card → calls `dbPatchOpportunity`.

### OpportunityDetailPage
Sections:
1. DATOS — title, brand (selector dbListAllBrands), description, source
2. UBICACIÓN — city (selector), country
3. PIPELINE — status (selector, 8 options with colors)
4. VALOR — value (numeric), currency (text)
5. RELACIÓN — owner display (read-only), nextAction + nextActionAt, notes
6. CIERRE — lost_reason textarea (shown only when status === 'lost')
7. VÍNCULOS — campaigns + collaborations linked to this opp (read-only list)
8. ACTIVIDAD — ActivityTimeline with `dbGetEntityTimeline('opportunity', id)`

Status change triggers `log_activity_auto` via DB — no client write needed.

---

## Implementation order

1. `database.js` — all new/updated functions
2. `es.json` + `en.json` — all keys
3. `SimpleMarkdown.jsx` + `ManualNav.jsx` + `ManualSection.jsx` → `ManualPage.jsx`
4. `FollowUpsPage.jsx`
5. `CollaborationCard.jsx` + `CollaborationsPage.jsx` + `CollaborationDetailPage.jsx`
6. `OpportunitiesPage.jsx` (kanban + mobile) + `OpportunityDetailPage.jsx`
7. `nav.js` + `routes.js` + `NetworkApp.jsx`
8. Build check

---

## Edge cases handled
- Body vacío: SimpleMarkdown returns null / empty container, no crash
- Collab sin campaign_id: campaignId null, hide campaign field in detail
- Activation type inactivo en collab vieja: show it in detail (was active when created), not offered in create form (dbGetActivationTypes only returns active:true)
- Scroll spy vs smooth scroll: 300ms debounce on observer after programmatic scroll
- Manual bar overflow: `overflowX:'auto'`, `whiteSpace:'nowrap'` on the nav container, page body never gets overflow-x
- 200 vencidos: per-group slice to 20 with "Ver más" client-side pagination
