-- ═══════════════════════════════════════════════════════════
-- 023 · Agenda con datos de contacto
--
-- Extiende my_agenda() con tres columnas: whatsapp, instagram, phone.
-- Cada rama del UNION aporta lo suyo; tasks y oportunidades devuelven NULL.
-- Influencers: columnas directas. Marcas: desde el JSONB data->>.
-- Un solo round-trip; el cliente no necesita batch-fetch extra.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION my_agenda(
  p_days_ahead INT DEFAULT 7
) RETURNS TABLE (
  kind        TEXT,
  entity_type TEXT,
  entity_id   UUID,
  title       TEXT,
  subtitle    TEXT,
  due_at      TIMESTAMPTZ,
  priority    TEXT,
  is_overdue  BOOLEAN,
  is_today    BOOLEAN,
  whatsapp    TEXT,
  instagram   TEXT,
  phone       TEXT
) LANGUAGE sql STABLE AS $fn$
  SELECT 'task', 'task', t.id, t.title,
         coalesce(t.description, ''), t.due_date,
         t.priority,
         (t.due_date IS NOT NULL AND t.due_date < now()),
         (t.due_date::date = CURRENT_DATE),
         NULL::TEXT, NULL::TEXT, NULL::TEXT
  FROM tasks t
  WHERE t.assigned_to = auth.uid()
    AND t.status NOT IN ('completed','cancelled')
    AND (t.due_date IS NULL OR t.due_date::date <= CURRENT_DATE + p_days_ahead)

  UNION ALL
  SELECT 'next_action', 'influencer', i.id,
         coalesce(i.next_action, 'Seguimiento'),
         i.name, i.next_action_at, 'normal',
         (i.next_action_at < now()),
         (i.next_action_at::date = CURRENT_DATE),
         i.whatsapp, i.instagram, i.phone
  FROM influencers i
  WHERE i.next_action_at IS NOT NULL
    AND i.status = 'active'
    AND i.next_action_at::date <= CURRENT_DATE + p_days_ahead

  UNION ALL
  SELECT 'next_action', 'brand', b.id,
         coalesce(b.next_action, 'Seguimiento'),
         b.name, b.next_action_at, 'normal',
         (b.next_action_at < now()),
         (b.next_action_at::date = CURRENT_DATE),
         b.data->>'whatsapp', NULL, b.data->>'phone'
  FROM brands b
  WHERE b.next_action_at IS NOT NULL
    AND b.status = 'active'
    AND b.next_action_at::date <= CURRENT_DATE + p_days_ahead

  UNION ALL
  SELECT 'next_action', 'opportunity', o.id,
         coalesce(o.next_action, 'Seguimiento'),
         o.title, o.next_action_at, 'normal',
         (o.next_action_at < now()),
         (o.next_action_at::date = CURRENT_DATE),
         NULL::TEXT, NULL::TEXT, NULL::TEXT
  FROM opportunities o
  WHERE o.next_action_at IS NOT NULL
    AND o.status NOT IN ('won','lost')
    AND o.next_action_at::date <= CURRENT_DATE + p_days_ahead

  ORDER BY 8 DESC, 6 ASC NULLS LAST;
$fn$;
