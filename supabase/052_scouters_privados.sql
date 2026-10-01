-- ═══════════════════════════════════════════════════════════
-- 052 · Cada Scouter ve lo suyo (y las marcas de su ciudad)
--
-- EL PROBLEMA
--   El panel de Admin aprobaba a las Scouters con alcance 'city'.
--   app_visible_city_ids() trata 'city' como alcance de Líder de Ciudad,
--   así que esas Scouters veían Y PODÍAN EDITAR influencers, marcas,
--   oportunidades y colaboraciones de toda su ciudad. Con "Todas las
--   ciudades" tildado quedaba 'global': veían la red entera.
--
-- LO QUE HACE
--   1. app_visible_city_ids() ignora las filas con rol 'scouter'. El
--      alcance territorial es solo para Dirección y Líderes. Aunque
--      vuelva a entrar una fila mal cargada, no abre nada.
--   2. Marcas: la Scouter VE (no edita) las marcas activas de su ciudad,
--      para poder elegirlas al crear una oportunidad o colaboración.
--   3. Las filas de Scouter con alcance 'city' o 'global' pasan a 'own',
--      que es lo que inserta upsert_scouter(). Se conserva la ciudad.
--
-- NO TOCA: Dirección, Líderes, misiones (usan la ciudad de la tabla
--   scouters por otro camino), el Club ni ninguna ficha.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── 1 · El alcance territorial deja afuera a las Scouters ───
CREATE OR REPLACE FUNCTION public.app_visible_city_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT c.id
  FROM cities c
  JOIN countries co ON co.id = c.country_id
  WHERE EXISTS (
    SELECT 1 FROM user_roles r
    WHERE r.user_id = auth.uid() AND r.revoked_at IS NULL
      AND r.role <> 'scouter'
      AND ( r.scope = 'global'
         OR (r.scope = 'region'  AND r.scope_id = co.region_id)
         OR (r.scope = 'country' AND r.scope_id = co.id)
         OR (r.scope = 'city'    AND r.scope_id = c.id) )
  );
$function$;


-- ── 2 · Las ciudades de la Scouter (solo para ver marcas) ───
-- DEFINER para no depender de la RLS de scouters/user_roles dentro de
-- una policy. Toma la ciudad de la ficha de Scouter y las de sus roles.
CREATE OR REPLACE FUNCTION public.app_my_scouter_city_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.city_id FROM scouters s
   WHERE s.user_id = auth.uid() AND s.city_id IS NOT NULL
  UNION
  SELECT r.scope_id FROM user_roles r
   WHERE r.user_id = auth.uid() AND r.revoked_at IS NULL
     AND r.role = 'scouter' AND r.scope_id IS NOT NULL;
$function$;

REVOKE ALL ON FUNCTION public.app_my_scouter_city_ids() FROM anon;

DROP POLICY IF EXISTS br_select ON brands;
CREATE POLICY br_select ON brands FOR SELECT TO authenticated
USING (
  app_is_direction()
  OR app_has_broad_read('influencers')
  OR app_has_broad_read('resilio')
  OR owner_scouter_id = auth.uid()
  OR city_id IN (SELECT app_visible_city_ids())
  OR city_id IN (SELECT app_my_scouter_city_ids())   -- marcas de su ciudad: solo lectura
);
-- br_update NO cambia: editar sigue siendo del dueño, Líderes y Dirección.

-- El timeline de la marca usa app_can_see_entity: misma regla que la policy.
CREATE OR REPLACE FUNCTION public.app_can_see_entity(p_type text, p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v BOOLEAN := false;
BEGIN
  IF app_is_direction() THEN RETURN true; END IF;

  CASE p_type
    WHEN 'influencer' THEN
      SELECT ( app_has_broad_read('influencers')
            OR app_has_broad_read('resilio')
            OR i.owner_scouter_id = auth.uid()
            OR i.city_id IN (SELECT app_visible_city_ids())
            OR app_influencer_in_my_campaign(i.id) )
        INTO v FROM influencers i WHERE i.id = p_id;

    WHEN 'brand' THEN
      SELECT ( app_has_broad_read('influencers')
            OR app_has_broad_read('resilio')
            OR b.owner_scouter_id = auth.uid()
            OR b.city_id IN (SELECT app_visible_city_ids())
            OR b.city_id IN (SELECT app_my_scouter_city_ids()) )
        INTO v FROM brands b WHERE b.id = p_id;

    WHEN 'opportunity' THEN
      SELECT ( o.owner_scouter_id = auth.uid()
            OR o.created_by = auth.uid()
            OR o.city_id IN (SELECT app_visible_city_ids()) )
        INTO v FROM opportunities o WHERE o.id = p_id;

    WHEN 'campaign' THEN
      SELECT app_can_see_campaign(p_id) INTO v;

    WHEN 'collaboration' THEN
      SELECT ( c.scouter_id = auth.uid()
            OR c.created_by = auth.uid()
            OR c.city_id IN (SELECT app_visible_city_ids()) )
        INTO v FROM collaborations c WHERE c.id = p_id;

    ELSE v := false;
  END CASE;

  RETURN COALESCE(v, false);
END $function$;


-- ── 3 · Ordenar los datos: Scouter = 'own' ──────────────────
-- Hay un UNIQUE (user_id, role, scope, scope_id) que no mira revoked_at.
-- Si ya existe la fila 'own' de esa ciudad (aunque esté revocada), se
-- reactiva esa y se revoca la de 'city'. Si no, la de 'city' pasa a 'own'.
UPDATE user_roles o
   SET revoked_at = NULL, ecosistemas = r.ecosistemas
  FROM user_roles r
 WHERE r.role = 'scouter' AND r.revoked_at IS NULL AND r.scope IN ('city','global')
   AND o.user_id = r.user_id AND o.role = 'scouter' AND o.scope = 'own'
   AND o.scope_id IS NOT DISTINCT FROM r.scope_id;

UPDATE user_roles r
   SET revoked_at = now()
 WHERE r.role = 'scouter' AND r.revoked_at IS NULL AND r.scope IN ('city','global')
   AND EXISTS (SELECT 1 FROM user_roles o
                WHERE o.user_id = r.user_id AND o.role = 'scouter' AND o.scope = 'own'
                  AND o.scope_id IS NOT DISTINCT FROM r.scope_id);

UPDATE user_roles
   SET scope = 'own'
 WHERE role = 'scouter' AND revoked_at IS NULL AND scope IN ('city','global');

COMMIT;


-- ── Verificación ────────────────────────────────────────────
-- Tiene que dar: scouters_abiertas = 0 · scouters_own = 13 o más.
SELECT
  (SELECT count(*) FROM user_roles WHERE role = 'scouter' AND revoked_at IS NULL AND scope <> 'own') AS scouters_abiertas,
  (SELECT count(DISTINCT user_id) FROM user_roles WHERE role = 'scouter' AND revoked_at IS NULL AND scope = 'own') AS scouters_own;

-- ROLLBACK (vuelve al comportamiento anterior, NO recomendado):
--   volver a correr el bloque de app_visible_city_ids de 039_rbac_recuperado.sql
--   y la policy br_select sin la última línea.
