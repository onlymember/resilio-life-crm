-- ═══════════════════════════════════════════════════════════
-- 039 · Las funciones de permiso (RECUPERADO)
--
-- POR QUE VA AL FINAL Y NO EN EL 000
--   Estas funciones son el corazon del RBAC, asi que la tentacion es
--   numerarlas primero. No se puede: PostgreSQL parsea el cuerpo de una
--   funcion SQL al crearla, y estas leen cities, countries, scouters,
--   profiles, campaigns, assignments y audit_log. En una base vacia
--   fallan con "relation does not exist". Por eso van despues de que
--   todas las tablas existen.
--
--   Consecuencia: este repo NO se puede reproducir de cero corriendo
--   las migraciones en orden. Lo arregla `supabase db dump`, no esto.
--   Lo que este archivo sí resuelve es que las funciones dejen de
--   existir unicamente adentro de la base.
--
-- DE DONDE SALIO
--   pg_get_functiondef() sobre la base el 2026-09-28, via
--   supabase/dump_deriva.sql. Es el codigo que corre hoy, letra por
--   letra. No se reescribio ni se "mejoro" nada: un archivo de
--   recuperacion que corrige de memoria deja de ser evidencia.
--
-- SEGURIDAD: todo CREATE OR REPLACE. Sobre la base actual es un no-op,
-- reemplaza cada funcion por si misma. No toca datos ni policies.
-- ═══════════════════════════════════════════════════════════


-- ── Los dos chequeos de base ────────────────────────────────
-- app_is_direction() es mas estrecha que COMMAND_ROLES del cliente: los
-- tres roles de territorio NO pasan por aca. Ver docs/network/RBAC.md.
CREATE OR REPLACE FUNCTION public.app_is_direction()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND revoked_at IS NULL
      AND role IN ('super_admin','network_direction'));
$function$;

-- Habilita por SCOPE, no por rol. Un Scouter tiene scope='own', que no
-- coincide con ninguna de las cuatro ramas, asi que recibe vacio: eso
-- es lo que hace que solo vea lo suyo.
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
      AND ( r.scope = 'global'
         OR (r.scope = 'region'  AND r.scope_id = co.region_id)
         OR (r.scope = 'country' AND r.scope_id = co.id)
         OR (r.scope = 'city'    AND r.scope_id = c.id) )
  );
$function$;

-- La otra puerta a lectura amplia, heredada del CRM anterior. Exige rol
-- admin/editor/viewer Y el ecosistema en el array. Es el unico agujero
-- que queda abierto y es de datos: ver la consulta final de RBAC.md.
CREATE OR REPLACE FUNCTION public.app_has_broad_read(eco text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND revoked_at IS NULL
      AND role IN ('admin','editor','viewer')
      AND eco = ANY(ecosistemas));
$function$;

CREATE OR REPLACE FUNCTION public.app_my_scope_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid()
  UNION
  SELECT s.city_id FROM scouters s WHERE s.user_id = auth.uid()
  UNION
  SELECT c.country_id FROM scouters s
    JOIN cities c ON c.id = s.city_id WHERE s.user_id = auth.uid()
  UNION
  SELECT co.region_id FROM scouters s
    JOIN cities c ON c.id = s.city_id
    JOIN countries co ON co.id = c.country_id WHERE s.user_id = auth.uid()
  UNION
  SELECT app_visible_city_ids();
$function$;


-- ── Los chequeos que rompen la recursion de policies ────────
-- Son DEFINER a proposito: sin ellas las policies se llaman entre si y
-- Postgres aborta con "infinite recursion detected in policy". Reciben
-- un id y devuelven un booleano; no exponen ninguna fila.
CREATE OR REPLACE FUNCTION public.app_influencer_in_my_campaign(p_inf uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM campaign_influencers ci
    JOIN campaigns c ON c.id = ci.campaign_id
    WHERE ci.influencer_id = p_inf
      AND (c.owner_id = auth.uid() OR c.created_by = auth.uid()));
$function$;

CREATE OR REPLACE FUNCTION public.app_campaign_has_my_influencer(p_camp uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM campaign_influencers ci
    JOIN influencers i ON i.id = ci.influencer_id
    WHERE ci.campaign_id = p_camp AND i.owner_scouter_id = auth.uid());
$function$;

CREATE OR REPLACE FUNCTION public.app_can_see_campaign(p_camp uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM campaigns c WHERE c.id = p_camp
    AND ( app_is_direction() OR c.owner_id = auth.uid()
       OR c.created_by = auth.uid()
       OR c.city_id IN (SELECT app_visible_city_ids())
       OR app_campaign_has_my_influencer(c.id) ));
$function$;

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
            OR b.city_id IN (SELECT app_visible_city_ids()) )
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

CREATE OR REPLACE FUNCTION public.my_scouter_level()
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  SELECT coalesce(
    (SELECT level FROM scouters WHERE user_id = auth.uid()),
    1
  );
$function$;


-- ── Alta de Scouter y cambio de dueño ───────────────────────
-- upsert_scouter() es la unica via de alta. Inserta scope='own', que es
-- exactamente lo que deja a la Scouter viendo solo lo suyo. Cambiar ese
-- valor por 'city' le abriria la ciudad entera sin tocar una policy.
CREATE OR REPLACE FUNCTION public.upsert_scouter(p_user_id uuid, p_city_id uuid, p_team_id uuid DEFAULT NULL::uuid, p_level integer DEFAULT 1, p_status text DEFAULT 'active'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (app_is_direction() OR p_city_id IN (SELECT app_visible_city_ids())) THEN
    RAISE EXCEPTION 'Sin permiso para gestionar Scouters en esa ciudad.';
  END IF;

  INSERT INTO scouters (user_id, city_id, team_id, level, status)
  VALUES (p_user_id, p_city_id, p_team_id, p_level, p_status)
  ON CONFLICT (user_id) DO UPDATE
    SET city_id = EXCLUDED.city_id,
        team_id = EXCLUDED.team_id,
        level   = EXCLUDED.level,
        status  = EXCLUDED.status;

  UPDATE profiles SET estado = 'aprobado'
   WHERE id = p_user_id AND estado = 'pendiente';

  UPDATE user_roles SET revoked_at = now()
   WHERE user_id = p_user_id
     AND role = 'scouter'
     AND revoked_at IS NULL
     AND (scope_id IS DISTINCT FROM p_city_id);

  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'scouter' AND scope = 'own' AND scope_id = p_city_id
  ) THEN
    UPDATE user_roles
    SET revoked_at = NULL, ecosistemas = ARRAY['influencers'], granted_by = auth.uid()
    WHERE user_id = p_user_id AND role = 'scouter' AND scope = 'own' AND scope_id = p_city_id;
  ELSE
    INSERT INTO user_roles (user_id, role, scope, scope_id, ecosistemas, granted_by)
    VALUES (p_user_id, 'scouter', 'own', p_city_id, ARRAY['influencers'], auth.uid());
  END IF;

  INSERT INTO audit_log (actor_id, actor_email, action, entity_type, entity_id, new_value)
  VALUES (auth.uid(),
          (SELECT email FROM profiles WHERE id = auth.uid()),
          'upsert_scouter', 'scouter', p_user_id::text,
          jsonb_build_object('city_id', p_city_id, 'level', p_level, 'status', p_status));
END
$function$;

-- El unico camino para cambiar owner_scouter_id: un trigger rechaza el
-- UPDATE directo. Valida el permiso DEL ACTOR, no el del destino, y
-- deja el cambio en la tabla assignments.
CREATE OR REPLACE FUNCTION public.assign_entity(p_entity_type text, p_entity_id uuid, p_to_owner uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_from uuid; v_city uuid; v_tbl text; v_owner_col text;
  v_rows int; v_has_assigned boolean;
BEGIN
  IF p_entity_type NOT IN ('influencer','brand','opportunity','collaboration') THEN
    RAISE EXCEPTION 'entity_type inválido: %', p_entity_type;
  END IF;

  v_tbl := CASE p_entity_type
             WHEN 'influencer'  THEN 'influencers'
             WHEN 'brand'       THEN 'brands'
             WHEN 'opportunity' THEN 'opportunities'
             ELSE 'collaborations' END;

  -- collaborations guarda el dueño en scouter_id, no en owner_scouter_id
  v_owner_col := CASE p_entity_type WHEN 'collaboration' THEN 'scouter_id'
                                    ELSE 'owner_scouter_id' END;

  EXECUTE format('SELECT %I, city_id FROM %I WHERE id = $1', v_owner_col, v_tbl)
    INTO v_from, v_city USING p_entity_id;
  -- EXECUTE no actualiza FOUND (documentado en PostgreSQL): hay que leer ROW_COUNT.
  -- Con el IF NOT FOUND anterior, esta función cortaba SIEMPRE.
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'Entidad inexistente'; END IF;

  -- Un city_id en null no puede colarse como permiso: eso solo lo reasigna Dirección.
  IF NOT (app_is_direction()
          OR (v_city IS NOT NULL AND v_city IN (SELECT app_visible_city_ids()))) THEN
    RAISE EXCEPTION 'Sin permiso para reasignar en esa ciudad';
  END IF;

  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name=v_tbl
                    AND column_name='assigned_by') INTO v_has_assigned;

  PERFORM set_config('app.assigning','on',true);
  IF v_has_assigned THEN
    EXECUTE format('UPDATE %I SET %I=$1, assigned_by=$2, assigned_at=now() WHERE id=$3',
                   v_tbl, v_owner_col) USING p_to_owner, auth.uid(), p_entity_id;
  ELSE
    EXECUTE format('UPDATE %I SET %I=$1 WHERE id=$2', v_tbl, v_owner_col)
      USING p_to_owner, p_entity_id;
  END IF;
  PERFORM set_config('app.assigning','off',true);

  INSERT INTO assignments(entity_type, entity_id, from_owner_id, to_owner_id, assigned_by, reason)
  VALUES (p_entity_type, p_entity_id, v_from, p_to_owner, auth.uid(), p_reason);

  INSERT INTO audit_log(actor_id, actor_email, action, entity_type, entity_id, old_value, new_value)
  VALUES (auth.uid(), (SELECT email FROM profiles WHERE id = auth.uid()),
          'reassign', p_entity_type, p_entity_id::text,
          jsonb_build_object('owner', v_from), jsonb_build_object('owner', p_to_owner));
END $function$;

-- Reasignar en lote sin que un error corte el resto: cada entidad tiene
-- su propio BEGIN/EXCEPTION y devuelve su fila con ok/error.
CREATE OR REPLACE FUNCTION public.assign_entities_bulk(p_entity_type text, p_entity_ids uuid[], p_to_owner uuid, p_reason text DEFAULT NULL::text)
 RETURNS TABLE(entity_id uuid, ok boolean, error text)
 LANGUAGE plpgsql
AS $function$
DECLARE v_id UUID;
BEGIN
  FOREACH v_id IN ARRAY p_entity_ids LOOP
    BEGIN
      PERFORM assign_entity(p_entity_type, v_id, p_to_owner, p_reason);
      entity_id := v_id; ok := true;  error := NULL;
    EXCEPTION WHEN OTHERS THEN
      entity_id := v_id; ok := false; error := SQLERRM;
    END;
    RETURN NEXT;
  END LOOP;
END $function$;


-- ── Los contadores del Command Center ───────────────────────
CREATE OR REPLACE FUNCTION public.unassigned_summary()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  SELECT jsonb_build_object(
    'influencers',   (SELECT count(*) FROM influencers   WHERE owner_scouter_id IS NULL),
    'brands',        (SELECT count(*) FROM brands        WHERE owner_scouter_id IS NULL),
    'opportunities', (SELECT count(*) FROM opportunities WHERE owner_scouter_id IS NULL),
    'no_city_inf',   (SELECT count(*) FROM influencers   WHERE city_id IS NULL),
    'no_city_brands',(SELECT count(*) FROM brands        WHERE city_id IS NULL),
    'users_no_role', (SELECT count(*) FROM profiles p
                       WHERE p.estado = 'aprobado'
                         AND NOT EXISTS (SELECT 1 FROM user_roles r
                                          WHERE r.user_id = p.id AND r.revoked_at IS NULL))
  );
$function$;


-- ── Verificacion ────────────────────────────────────────────
-- Las trece tienen que aparecer, y la columna seguridad tiene que
-- coincidir con lo que dice docs/network/RBAC.md.
SELECT p.proname,
       CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END AS seguridad
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('app_is_direction','app_visible_city_ids','app_has_broad_read',
                    'app_my_scope_ids','app_can_see_entity','app_can_see_campaign',
                    'app_influencer_in_my_campaign','app_campaign_has_my_influencer',
                    'my_scouter_level','upsert_scouter','assign_entity',
                    'assign_entities_bulk','unassigned_summary')
ORDER BY p.proname;
