-- ═══════════════════════════════════════════════════════════
-- FIX · Recursión infinita entre políticas
--
-- Síntoma: "infinite recursion detected in policy for relation
--           campaign_influencers" al guardar un influencer.
--
-- Causa: tres políticas del 008_rls.sql se consultan entre sí.
--   influencers.inf_select  → campaign_influencers
--   campaign_influencers.ci_all → campaigns
--   campaigns.camp_select   → campaign_influencers + influencers
-- Un INSERT con .select() evalúa inf_select y entra al bucle.
--
-- Solución: los chequeos CRUZADOS salen a funciones SECURITY DEFINER.
-- Corren como el dueño de las tablas, así que no vuelven a evaluar RLS
-- y el ciclo se corta. Los chequeos sobre columnas propias quedan
-- inline, que es más rápido.
--
-- Solo lectura de permisos: no cambia quién ve qué, solo cómo se calcula.
-- ═══════════════════════════════════════════════════════════

-- ── Helpers que cortan el ciclo ─────────────────────────────

-- ¿Este influencer participa de alguna campaña que yo manejo?
CREATE OR REPLACE FUNCTION app_influencer_in_my_campaign(p_inf UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM campaign_influencers ci
    JOIN campaigns c ON c.id = ci.campaign_id
    WHERE ci.influencer_id = p_inf
      AND (c.owner_id = auth.uid() OR c.created_by = auth.uid())
  );
$$;

-- ¿Esta campaña incluye algún influencer mío?
CREATE OR REPLACE FUNCTION app_campaign_has_my_influencer(p_camp UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM campaign_influencers ci
    JOIN influencers i ON i.id = ci.influencer_id
    WHERE ci.campaign_id = p_camp
      AND i.owner_scouter_id = auth.uid()
  );
$$;

-- ¿Puedo ver esta campaña? Encapsula toda la lógica de camp_select
-- para que campaign_influencers no tenga que consultar campaigns
-- bajo RLS.
CREATE OR REPLACE FUNCTION app_can_see_campaign(p_camp UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = p_camp
      AND ( app_is_direction()
         OR c.owner_id   = auth.uid()
         OR c.created_by = auth.uid()
         OR c.city_id IN (SELECT app_visible_city_ids())
         OR app_campaign_has_my_influencer(c.id) )
  );
$$;

-- ── Políticas reescritas ────────────────────────────────────

DROP POLICY IF EXISTS inf_select ON influencers;
CREATE POLICY inf_select ON influencers FOR SELECT TO authenticated
USING (
  app_is_direction()
  OR app_has_broad_read('influencers')      -- Resilio Life: sin regresión
  OR app_has_broad_read('resilio')
  OR owner_scouter_id = auth.uid()          -- el Scouter, lo suyo
  OR city_id IN (SELECT app_visible_city_ids())
  OR app_influencer_in_my_campaign(id)      -- lo que le asignaron
);

DROP POLICY IF EXISTS camp_select ON campaigns;
CREATE POLICY camp_select ON campaigns FOR SELECT TO authenticated
USING (
  app_is_direction()
  OR owner_id   = auth.uid()
  OR created_by = auth.uid()
  OR city_id IN (SELECT app_visible_city_ids())
  OR app_campaign_has_my_influencer(id)
);

DROP POLICY IF EXISTS ci_all ON campaign_influencers;
CREATE POLICY ci_all ON campaign_influencers FOR ALL TO authenticated
USING      (app_can_see_campaign(campaign_id))
WITH CHECK (app_can_see_campaign(campaign_id));

-- ── Verificación ────────────────────────────────────────────

-- 1. Ninguna tabla con RLS y sin políticas (debe dar 0 filas)
SELECT t.tablename FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public' AND c.relrowsecurity
  AND NOT EXISTS (SELECT 1 FROM pg_policies p
                  WHERE p.schemaname = 'public' AND p.tablename = t.tablename);

-- 2. Ninguna política se sigue nombrando entre tablas (debe dar 0 filas)
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND (   (tablename = 'influencers'          AND qual ILIKE '%campaign_influencers%')
       OR (tablename = 'campaigns'            AND qual ILIKE '%campaign_influencers%')
       OR (tablename = 'campaign_influencers' AND qual ILIKE '%FROM campaigns%') );

-- 3. La consulta que rompía ahora responde
SELECT count(*) AS influencers_visibles FROM influencers;
