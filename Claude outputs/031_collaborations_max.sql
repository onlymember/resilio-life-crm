-- ═══════════════════════════════════════════════════════════
-- 031 · Colaboraciones en su forma máxima
--
-- QUÉ RESUELVE
--   El análisis experto (sesión de Claude, 2026-09-13) identificó a
--   `collaborations` como la pieza estructuralmente más pobre del
--   modelo de datos frente a las otras tres entidades (influencers,
--   brands, opportunities ya tienen next_action/next_action_at desde
--   020_crm_fields.sql; collaborations no):
--
--   1) No aparece en el calendario/agenda — my_agenda() y
--      my_calendar_range() (022 y 029) sólo unen tasks + influencers
--      + brands + opportunities. Una colaboración confirmada con
--      fecha de entrega de contenido no genera ningún recordatorio.
--   2) No tiene next_action/next_action_at — no hay forma de agendar
--      "llamar para coordinar el shooting" sobre una colaboración
--      puntual, sólo sobre el influencer o la marca en general.
--   3) No hay enlace directo Oportunidad → Colaboración. Existe un
--      camino indirecto (opportunities.opportunity_id en `campaigns`,
--      y collaborations.campaign_id) pero `campaign_id` es opcional y
--      la mayoría de las colaboraciones de Network se crean sin pasar
--      por `campaigns`. Sin opportunity_id directo, no se puede medir
--      tasa de conversión pipeline → ejecución.
--   4) `deliverables` es un array plano sin fecha ni estado por ítem
--      — no se puede saber cuál entregable está vencido.
--   5) No hay columnas estructuradas de resultados (reach, engagement,
--      etc.) — sólo un JSONB `results` de forma libre, que no se
--      puede agregar ni graficar de forma confiable entre scouters.
--   6) No hay dónde guardar el link al contrato o la factura.
--
-- QUÉ HACE ESTA MIGRACIÓN (100% aditivo)
--   a) collaborations: + opportunity_id, next_action, next_action_at,
--      contract_url, invoice_url, y un set de columnas de KPIs
--      propuesto (ver nota "KPIs" abajo — es un default razonable,
--      no un requisito cerrado; se ajusta fácil en 032 si hace falta).
--   b) my_agenda() y my_calendar_range(): CREATE OR REPLACE con una
--      rama UNION ALL nueva para collaborations.next_action_at. Las
--      cuatro ramas existentes (task/influencer/brand/opportunity)
--      quedan carácter por carácter iguales — se pega el texto actual
--      de 022 y 029 sin tocarlo, sólo se agrega una rama al final.
--   c) complete_next_action() / set_next_action(): CREATE OR REPLACE
--      agregando 'collaboration' a la lista de entity_type válidos.
--   d) collaboration_deliverables: tabla nueva para reemplazar (sin
--      borrar) el array `deliverables`. RLS por EXISTS contra
--      collaborations — hereda la visibilidad de la colaboración
--      padre sin duplicar ninguna regla de scope. No es recursivo:
--      collaborations no consulta collaboration_deliverables en sus
--      propias policies (a diferencia del ciclo influencers/campaigns/
--      campaign_influencers que documenta 016_fix_policy_recursion.sql).
--      La columna vieja `deliverables` NO se toca ni se borra; queda
--      como legacy y esta migración intenta migrar sus datos a la
--      tabla nueva de forma best-effort (ver PASO 5).
--   e) v_collaborations_urgency: vista para poder ordenar el listado
--      de Colaboraciones por "próxima fecha que importa" (next_action,
--      entregable pendiente más próximo, o fecha de fin), en vez de
--      sólo por created_at como hoy.
--
-- QUÉ NO HACE (fuera de alcance, a propósito)
--   - No toca moneda/FX (currency ya existe en collaborations; una
--      estrategia de conversión multi-moneda es la fase separada de
--      "currency/FX" del plan, no se mezcla acá).
--   - No agrega Supabase Storage. contract_url/invoice_url son TEXT
--     (link pegado), igual que brands.logo e influencers.profile_image
--     hoy — se confirmó por grep que no hay uso de supabase.storage
--     en ningún lado del código, así que no hace falta infraestructura
--     nueva para esto.
--   - No agrega UNIQUE constraints (duplicados) ni enriquecimiento de
--     Influencers/Brands — eso es una fase aparte del plan.
--   - No borra `collaborations.deliverables` ni `collaborations.results`
--     (quedan legacy/deprecated, documentados como tal).
--
-- ADVERTENCIA — LO QUE ESTA MIGRACIÓN *NO* PUEDE VERIFICAR SOLA
--   `collaborations` (igual que `deliverables`, `results`, `campaign_id`,
--   etc.) no tiene ningún CREATE TABLE en los archivos versionados de
--   supabase/ — es, como `missions`/`reward_points` en la fase 3D, una
--   tabla creada directo en producción en algún momento no documentado
--   en el repo. Antes de correr esta migración, ejecutá el PASO 0
--   (diagnóstico) y confirmá:
--     1. Que `collaborations` existe con las columnas que asumimos acá
--        (ver lista completa en el PASO 0).
--     2. El tipo real de la columna `deliverables` (se asume JSONB
--        conteniendo un array de strings, que es el shape que usa
--        CollaborationDetailPage.jsx hoy). El backfill del PASO 5 es
--        tolerante: si el tipo no es el esperado, no rompe la
--        migración — emite un NOTICE y no migra esos datos, dejando
--        el array viejo intacto para migrar a mano después.
--     3. Que `collaborations` ya tiene RLS habilitada con políticas
--        reales (no `TEMP_open_until_auth`). Esta migración no crea
--        ni modifica ninguna política sobre `collaborations` en sí
--        — sólo lee su estructura. Si el PASO 0 muestra que
--        `collaborations` sigue abierta, avisá antes de seguir: es un
--        hallazgo importante y separado de esta migración.
--
-- KPIs — nota de diseño
--   El set de columnas (reach, impressions, likes, comments, shares,
--   saves, link_clicks, engagement_rate, estimated_media_value,
--   results_notes) es una propuesta razonable para reportar resultados
--   de una colaboración de forma comparable entre scouters/países, no
--   un requisito confirmado por vos. Si el set real que necesitás es
--   distinto (por red social, con métricas de Stories vs. Reels, etc.),
--   se ajusta en una migración chica aparte sin tocar nada de esto.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── 0) Registro de migraciones (guarda defensiva, igual que 027/029/030) ──
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT        PRIMARY KEY,
  descripcion TEXT,
  aplicada_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 1) collaborations: columnas nuevas ───────────────────────
ALTER TABLE collaborations
  ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_action     TEXT,
  ADD COLUMN IF NOT EXISTS next_action_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_url    TEXT,
  ADD COLUMN IF NOT EXISTS invoice_url     TEXT,
  ADD COLUMN IF NOT EXISTS reach                 INT,
  ADD COLUMN IF NOT EXISTS impressions           INT,
  ADD COLUMN IF NOT EXISTS likes                 INT,
  ADD COLUMN IF NOT EXISTS comments              INT,
  ADD COLUMN IF NOT EXISTS shares                INT,
  ADD COLUMN IF NOT EXISTS saves                 INT,
  ADD COLUMN IF NOT EXISTS link_clicks           INT,
  ADD COLUMN IF NOT EXISTS engagement_rate       NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS estimated_media_value NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS results_notes         TEXT;

CREATE INDEX IF NOT EXISTS idx_collaborations_next_action_at
  ON collaborations (next_action_at)
  WHERE status NOT IN ('completed', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_collaborations_opportunity_id
  ON collaborations (opportunity_id) WHERE opportunity_id IS NOT NULL;

-- ── 2) my_agenda(): mismo texto REAL de producción + rama collaborations ─
-- IMPORTANTE: la versión de 022_scouter_home.sql en el repo NO es la que
-- está viva hoy. La real ya tiene 3 columnas de salida más
-- (whatsapp/instagram/phone, para los botones de contacto rápido de la
-- agenda) agregadas por una migración no versionada — confirmado el
-- 2026-09-13 vía `pg_get_functiondef` contra producción antes de aplicar
-- esto (ver también la nota en Arquitectura del doc del proyecto). El
-- texto de abajo es EXACTAMENTE el real (task/influencer/brand/opportunity
-- calcadas de `pg_get_functiondef`), con una quinta rama agregada al final
-- para collaboration. Como esta migración no agrega columnas de salida
-- nuevas (usa las 3 que ya existen), `CREATE OR REPLACE` no cambia el
-- shape de la función y no requiere DROP FUNCTION previo.
--
-- Para collaboration se usa el contacto del INFLUENCER (i2.whatsapp/
-- instagram/phone) — mismo criterio que la rama 'influencer', ya que
-- toda colaboración tiene un influencer asociado y normalmente el
-- "seguimiento" es coordinar con él/ella.
CREATE OR REPLACE FUNCTION my_agenda(
  p_days_ahead INT DEFAULT 7
) RETURNS TABLE (
  kind        TEXT,      -- 'task' | 'next_action'
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
         coalesce(t.description, ''), t.due_date, t.priority,
         (t.due_date IS NOT NULL AND t.due_date < now()),
         (t.due_date::date = CURRENT_DATE),
         NULL::text, NULL::text, NULL::text
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
         b.data->>'whatsapp', b.data->>'instagram', b.data->>'phone'
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
         NULL::text, NULL::text, NULL::text
  FROM opportunities o
  WHERE o.next_action_at IS NOT NULL
    AND o.status NOT IN ('won','lost')
    AND o.next_action_at::date <= CURRENT_DATE + p_days_ahead

  UNION ALL
  SELECT 'next_action', 'collaboration', c.id,
         coalesce(c.next_action, 'Seguimiento'),
         coalesce(i2.name, i2.username) || ' × ' || coalesce(br2.name, '—'),
         c.next_action_at, 'normal',
         (c.next_action_at < now()),
         (c.next_action_at::date = CURRENT_DATE),
         i2.whatsapp, i2.instagram, i2.phone
  FROM collaborations c
  LEFT JOIN influencers i2 ON i2.id = c.influencer_id
  LEFT JOIN brands      br2 ON br2.id = c.brand_id
  WHERE c.next_action_at IS NOT NULL
    AND c.status NOT IN ('completed','cancelled')
    AND c.next_action_at::date <= CURRENT_DATE + p_days_ahead

  ORDER BY 8 DESC, 6 ASC NULLS LAST;
$fn$;

-- ── 3) my_calendar_range(): mismo texto de 029 + rama collaborations ──
CREATE OR REPLACE FUNCTION my_calendar_range(
  p_from DATE,
  p_to   DATE
) RETURNS TABLE (
  kind        TEXT,
  entity_type TEXT,
  entity_id   UUID,
  title       TEXT,
  subtitle    TEXT,
  due_at      TIMESTAMPTZ,
  priority    TEXT,
  is_overdue  BOOLEAN,
  is_today    BOOLEAN
) LANGUAGE plpgsql STABLE AS $fn$
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from THEN
    RAISE EXCEPTION 'Rango inválido: p_from=% p_to=%', p_from, p_to;
  END IF;
  IF p_to - p_from > 366 THEN
    RAISE EXCEPTION 'Rango demasiado grande (máx. 366 días): % días', (p_to - p_from);
  END IF;

  RETURN QUERY
  SELECT 'task', 'task', t.id, t.title,
         coalesce(t.description, ''), t.due_date,
         t.priority,
         (t.due_date IS NOT NULL AND t.due_date < now()),
         (t.due_date::date = CURRENT_DATE)
  FROM tasks t
  WHERE t.assigned_to = auth.uid()
    AND t.status NOT IN ('completed','cancelled')
    AND t.due_date IS NOT NULL
    AND t.due_date::date BETWEEN p_from AND p_to

  UNION ALL
  SELECT 'next_action', 'influencer', i.id,
         coalesce(i.next_action, 'Seguimiento'),
         i.name, i.next_action_at, 'normal',
         (i.next_action_at < now()),
         (i.next_action_at::date = CURRENT_DATE)
  FROM influencers i
  WHERE i.next_action_at IS NOT NULL
    AND i.status = 'active'
    AND i.next_action_at::date BETWEEN p_from AND p_to

  UNION ALL
  SELECT 'next_action', 'brand', b.id,
         coalesce(b.next_action, 'Seguimiento'),
         b.name, b.next_action_at, 'normal',
         (b.next_action_at < now()),
         (b.next_action_at::date = CURRENT_DATE)
  FROM brands b
  WHERE b.next_action_at IS NOT NULL
    AND b.status = 'active'
    AND b.next_action_at::date BETWEEN p_from AND p_to

  UNION ALL
  SELECT 'next_action', 'opportunity', o.id,
         coalesce(o.next_action, 'Seguimiento'),
         o.title, o.next_action_at, 'normal',
         (o.next_action_at < now()),
         (o.next_action_at::date = CURRENT_DATE)
  FROM opportunities o
  WHERE o.next_action_at IS NOT NULL
    AND o.status NOT IN ('won','lost')
    AND o.next_action_at::date BETWEEN p_from AND p_to

  UNION ALL
  SELECT 'next_action', 'collaboration', c.id,
         coalesce(c.next_action, 'Seguimiento'),
         coalesce(i2.name, i2.username) || ' × ' || coalesce(br2.name, '—'),
         c.next_action_at, 'normal',
         (c.next_action_at < now()),
         (c.next_action_at::date = CURRENT_DATE)
  FROM collaborations c
  LEFT JOIN influencers i2 ON i2.id = c.influencer_id
  LEFT JOIN brands      br2 ON br2.id = c.brand_id
  WHERE c.next_action_at IS NOT NULL
    AND c.status NOT IN ('completed','cancelled')
    AND c.next_action_at::date BETWEEN p_from AND p_to

  ORDER BY 6 ASC NULLS LAST;
END;
$fn$;

-- ── 4) complete_next_action() / set_next_action(): + 'collaboration' ──
-- Mismo texto de 022, sólo se agrega 'collaboration' a la lista
-- válida y su mapeo a tabla. `collaborations` no tiene columna
-- name/title, así que para el segundo valor de la RETURNING (v_name,
-- que 022 nunca usa después de leerlo — se descarta) usamos `status`
-- como placeholder inofensivo, sólo para no romper el formato de la
-- consulta dinámica.
CREATE OR REPLACE FUNCTION complete_next_action(
  p_entity_type TEXT,
  p_entity_id   UUID,
  p_activity_type TEXT DEFAULT 'follow_up',
  p_note        TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql AS $fn$
DECLARE v_action TEXT; v_name TEXT; v_tbl TEXT; v_col TEXT; v_n INT;
BEGIN
  IF p_entity_type NOT IN ('influencer','brand','opportunity','collaboration') THEN
    RAISE EXCEPTION 'entity_type inválido: %', p_entity_type;
  END IF;
  v_tbl := CASE p_entity_type
             WHEN 'influencer'    THEN 'influencers'
             WHEN 'brand'         THEN 'brands'
             WHEN 'collaboration' THEN 'collaborations'
             ELSE 'opportunities' END;
  v_col := CASE p_entity_type
             WHEN 'opportunity'   THEN 'title'
             WHEN 'collaboration' THEN 'status'
             ELSE 'name' END;

  EXECUTE format(
    'UPDATE %I SET next_action = NULL, next_action_at = NULL
      WHERE id = $1
      RETURNING coalesce(next_action, %L), %s',
      v_tbl, 'Seguimiento', v_col)
  INTO v_action, v_name USING p_entity_id;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'No se pudo completar: el registro no existe o no tenés permiso.';
  END IF;

  INSERT INTO activities (actor_id, entity_type, entity_id, type, title, description)
  VALUES (auth.uid(), p_entity_type, p_entity_id, p_activity_type,
          coalesce(v_action, 'Seguimiento completado'), p_note);
END $fn$;

CREATE OR REPLACE FUNCTION set_next_action(
  p_entity_type TEXT,
  p_entity_id   UUID,
  p_action      TEXT,
  p_at          TIMESTAMPTZ
) RETURNS VOID LANGUAGE plpgsql AS $fn$
DECLARE v_tbl TEXT; v_n INT;
BEGIN
  IF p_entity_type NOT IN ('influencer','brand','opportunity','collaboration') THEN
    RAISE EXCEPTION 'entity_type inválido: %', p_entity_type;
  END IF;
  v_tbl := CASE p_entity_type
             WHEN 'influencer'    THEN 'influencers'
             WHEN 'brand'         THEN 'brands'
             WHEN 'collaboration' THEN 'collaborations'
             ELSE 'opportunities' END;

  EXECUTE format('UPDATE %I SET next_action = $1, next_action_at = $2 WHERE id = $3', v_tbl)
    USING p_action, p_at, p_entity_id;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'No se pudo agendar: el registro no existe o no tenés permiso.';
  END IF;
END $fn$;

-- ── 5) collaboration_deliverables ────────────────────────────
CREATE TABLE IF NOT EXISTS collaboration_deliverables (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_id UUID NOT NULL REFERENCES collaborations(id) ON DELETE CASCADE,
  description      TEXT NOT NULL,
  due_date         DATE,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','submitted','approved','rejected')),
  content_url      TEXT,
  completed_at     TIMESTAMPTZ,
  sort_order       INT NOT NULL DEFAULT 0,
  created_by       UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collab_deliv_collaboration_id
  ON collaboration_deliverables (collaboration_id);
CREATE INDEX IF NOT EXISTS idx_collab_deliv_due_date
  ON collaboration_deliverables (due_date) WHERE status <> 'approved';

CREATE OR REPLACE FUNCTION touch_collaboration_deliverables_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $fn$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_touch_collab_deliv_updated_at ON collaboration_deliverables;
CREATE TRIGGER trg_touch_collab_deliv_updated_at
  BEFORE UPDATE ON collaboration_deliverables
  FOR EACH ROW EXECUTE FUNCTION touch_collaboration_deliverables_updated_at();

ALTER TABLE collaboration_deliverables ENABLE ROW LEVEL SECURITY;

-- Hereda la visibilidad de la colaboración padre. No es recursivo:
-- collaborations no referencia collaboration_deliverables en ninguna
-- policy propia.
DROP POLICY IF EXISTS cd_all ON collaboration_deliverables;
CREATE POLICY cd_all ON collaboration_deliverables
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM collaborations c WHERE c.id = collaboration_deliverables.collaboration_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM collaborations c WHERE c.id = collaboration_deliverables.collaboration_id)
  );

-- ── 5b) Backfill best-effort de collaborations.deliverables ──
-- Sólo corre si:
--   - la columna `deliverables` existe y es JSONB, y
--   - contiene un array (de strings u objetos), y
--   - todavía no se migró esa colaboración (evita duplicar en un
--     re-run de esta migración).
-- Si algo no calza con lo esperado, NO rompe la migración: emite un
-- NOTICE por fila con problema y sigue. `collaborations.deliverables`
-- nunca se modifica ni se borra acá.
DO $mig$
DECLARE
  r RECORD;
  item JSONB;
  v_desc TEXT;
  v_pos INT;
  v_col_type TEXT;
BEGIN
  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'collaborations' AND column_name = 'deliverables';

  IF v_col_type IS DISTINCT FROM 'jsonb' THEN
    RAISE NOTICE '031: collaborations.deliverables no es jsonb (es %). No se migra automáticamente — revisar a mano.', coalesce(v_col_type, 'columna inexistente');
    RETURN;
  END IF;

  FOR r IN
    SELECT c.id, c.deliverables
    FROM collaborations c
    WHERE c.deliverables IS NOT NULL
      AND jsonb_typeof(c.deliverables) = 'array'
      AND jsonb_array_length(c.deliverables) > 0
      AND NOT EXISTS (SELECT 1 FROM collaboration_deliverables cd WHERE cd.collaboration_id = c.id)
  LOOP
    v_pos := 0;
    FOR item IN SELECT * FROM jsonb_array_elements(r.deliverables)
    LOOP
      BEGIN
        v_desc := CASE jsonb_typeof(item)
                    WHEN 'string' THEN trim(both '"' from item::text)
                    WHEN 'object' THEN coalesce(item->>'description', item->>'label', item->>'title', item::text)
                    ELSE item::text
                  END;
        IF v_desc IS NOT NULL AND length(trim(v_desc)) > 0 THEN
          INSERT INTO collaboration_deliverables (collaboration_id, description, sort_order)
          VALUES (r.id, v_desc, v_pos);
        END IF;
        v_pos := v_pos + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '031: no se pudo migrar un deliverable de collaboration %: %', r.id, SQLERRM;
      END;
    END LOOP;
  END LOOP;
END $mig$;

-- ── 6) v_collaborations_urgency ───────────────────────────────
-- "Próxima fecha que importa" por colaboración, para poder ordenar
-- el listado (CollaborationsPage hoy sólo ordena por created_at).
-- security_invoker: la vista no expone nada que el usuario no vea ya
-- vía RLS de collaborations/collaboration_deliverables.
CREATE OR REPLACE VIEW v_collaborations_urgency
WITH (security_invoker = true) AS
SELECT
  c.id AS collaboration_id,
  c.status,
  c.next_action_at,
  c.end_date,
  d.next_deliverable_due,
  LEAST(
    c.next_action_at,
    d.next_deliverable_due::timestamptz,
    c.end_date::timestamptz
  ) AS urgency_at
FROM collaborations c
LEFT JOIN (
  SELECT collaboration_id, MIN(due_date) AS next_deliverable_due
  FROM collaboration_deliverables
  WHERE status <> 'approved' AND due_date IS NOT NULL
  GROUP BY collaboration_id
) d ON d.collaboration_id = c.id;

INSERT INTO schema_migrations (version, descripcion)
VALUES ('031_collaborations_max', 'Colaboraciones: opportunity_id, next_action(_at), KPIs, contract/invoice_url, collaboration_deliverables + RLS, v_collaborations_urgency, my_agenda/my_calendar_range/complete_next_action/set_next_action extendidas')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- PASO 0 — DIAGNÓSTICO (correr ANTES que todo lo de arriba)
-- ═══════════════════════════════════════════════════════════
-- 1) Confirmar columnas reales de collaborations y su tipo:
--    SELECT column_name, data_type
--    FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='collaborations'
--    ORDER BY ordinal_position;
--
-- 2) Confirmar que collaborations tiene RLS real (no TEMP_open):
--    SELECT polname, cmd, qual, with_check
--    FROM pg_policies WHERE tablename = 'collaborations';
--
-- 3) Confirmar que opportunities.id es el tipo esperado (UUID) para
--    que el FK de opportunity_id no falle:
--    SELECT column_name, data_type FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='opportunities' AND column_name='id';

-- ═══════════════════════════════════════════════════════════
-- VERIFICACIÓN (correr DESPUÉS de aplicar)
-- ═══════════════════════════════════════════════════════════
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='collaborations'
--   AND column_name IN ('opportunity_id','next_action','next_action_at',
--                        'contract_url','invoice_url','reach','impressions',
--                        'likes','comments','shares','saves','link_clicks',
--                        'engagement_rate','estimated_media_value','results_notes')
-- ORDER BY column_name;
-- -- Esperado: las 15.
--
-- SELECT proname FROM pg_proc WHERE proname IN
--   ('my_agenda','my_calendar_range','complete_next_action','set_next_action');
-- -- Esperado: las 4 (siguen existiendo, con CREATE OR REPLACE).
--
-- SELECT count(*) FROM collaboration_deliverables;
-- -- Debería ser > 0 si había colaboraciones con `deliverables` no vacío
-- -- y la columna era jsonb array (ver NOTICEs de la migración si no).
--
-- SELECT * FROM v_collaborations_urgency LIMIT 5;
--
-- SELECT polname FROM pg_policies WHERE tablename = 'collaboration_deliverables';
-- -- Esperado: cd_all

-- ═══════════════════════════════════════════════════════════
-- ROLLBACK
-- ═══════════════════════════════════════════════════════════
--   DROP VIEW IF EXISTS v_collaborations_urgency;
--   DROP TABLE IF EXISTS collaboration_deliverables;
--   DROP FUNCTION IF EXISTS touch_collaboration_deliverables_updated_at();
--
--   -- Revertir my_agenda/complete_next_action/set_next_action a la versión
--   -- REAL de producción (capturada arriba con pg_get_functiondef antes de
--   -- aplicar 031 — NO es la de 022_scouter_home.sql, que ya estaba
--   -- desactualizada), sin la rama 'collaboration' ni sus parámetros extra.
--   -- my_calendar_range() sí coincide con 029_calendar.sql, ese sí se
--   -- puede revertir pegando el texto de ese archivo.
--
--   ALTER TABLE collaborations
--     DROP COLUMN IF EXISTS opportunity_id,
--     DROP COLUMN IF EXISTS next_action,
--     DROP COLUMN IF EXISTS next_action_at,
--     DROP COLUMN IF EXISTS contract_url,
--     DROP COLUMN IF EXISTS invoice_url,
--     DROP COLUMN IF EXISTS reach,
--     DROP COLUMN IF EXISTS impressions,
--     DROP COLUMN IF EXISTS likes,
--     DROP COLUMN IF EXISTS comments,
--     DROP COLUMN IF EXISTS shares,
--     DROP COLUMN IF EXISTS saves,
--     DROP COLUMN IF EXISTS link_clicks,
--     DROP COLUMN IF EXISTS engagement_rate,
--     DROP COLUMN IF EXISTS estimated_media_value,
--     DROP COLUMN IF EXISTS results_notes;
--
--   DROP INDEX IF EXISTS idx_collaborations_next_action_at;
--   DROP INDEX IF EXISTS idx_collaborations_opportunity_id;
--   DELETE FROM schema_migrations WHERE version='031_collaborations_max';
-- ═══════════════════════════════════════════════════════════
