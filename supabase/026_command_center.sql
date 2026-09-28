-- ═══════════════════════════════════════════════════════════
-- 026 · Command Center — Scouters y asignación bulk
-- Volcado desde la base (2026-09-10). No editar a mano.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.network_scouters(
  p_city    uuid DEFAULT NULL::uuid,
  p_country uuid DEFAULT NULL::uuid,
  p_region  uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  user_id      uuid,
  nombre       text,
  email        text,
  ciudad       text,
  pais         text,
  city_id      uuid,
  level        integer,
  status       text,
  joined_at    date,
  influencers  bigint,
  brands       bigint,
  opportunities bigint,
  tasks_open   bigint,
  tasks_overdue bigint,
  last_activity timestamp with time zone,
  days_inactive integer
)
LANGUAGE sql
STABLE
AS $function$
  SELECT s.user_id,
         coalesce(p.sobrenombre, p.nombre, p.email),
         p.email, c.name, co.name, s.city_id,
         s.level, s.status, s.joined_at,
         (SELECT count(*) FROM influencers   i WHERE i.owner_scouter_id = s.user_id),
         (SELECT count(*) FROM brands        b WHERE b.owner_scouter_id = s.user_id),
         (SELECT count(*) FROM opportunities o WHERE o.owner_scouter_id = s.user_id
                                            AND o.status NOT IN ('won','lost')),
         (SELECT count(*) FROM tasks t WHERE t.assigned_to = s.user_id
                                    AND t.status NOT IN ('completed','cancelled')),
         (SELECT count(*) FROM tasks t WHERE t.assigned_to = s.user_id
                                    AND t.status NOT IN ('completed','cancelled')
                                    AND t.due_date < now()),
         (SELECT max(a.occurred_at) FROM activities a WHERE a.actor_id = s.user_id),
         (CURRENT_DATE - coalesce(
            (SELECT max(a.occurred_at)::date FROM activities a WHERE a.actor_id = s.user_id),
            s.joined_at))::int
  FROM scouters s
  JOIN profiles  p  ON p.id  = s.user_id
  JOIN cities    c  ON c.id  = s.city_id
  JOIN countries co ON co.id = c.country_id
  WHERE (p_city    IS NULL OR s.city_id    = p_city)
    AND (p_country IS NULL OR co.id        = p_country)
    AND (p_region  IS NULL OR co.region_id = p_region)
  ORDER BY 16 DESC NULLS LAST;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_scouter(
  p_user_id uuid,
  p_city_id uuid,
  p_team_id uuid    DEFAULT NULL::uuid,
  p_level   integer DEFAULT 1,
  p_status  text    DEFAULT 'active'::text
)
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

  INSERT INTO user_roles (user_id, role, scope, scope_id, ecosistemas, granted_by)
  VALUES (p_user_id, 'scouter', 'own', p_city_id, ARRAY['influencers'], auth.uid())
  ON CONFLICT (user_id, role, scope, scope_id)
  DO UPDATE SET revoked_at = NULL;

  INSERT INTO audit_log (actor_id, actor_email, action, entity_type, entity_id, new_value)
  VALUES (auth.uid(),
          (SELECT email FROM profiles WHERE id = auth.uid()),
          'upsert_scouter', 'scouter', p_user_id::text,
          jsonb_build_object('city_id', p_city_id, 'level', p_level, 'status', p_status));
END
$function$;


-- Asignacion en lote. SECURITY INVOKER a proposito: delega cada fila en
-- assign_entity(), que valida el permiso del actor. El BEGIN/EXCEPTION por
-- iteracion hace que una fila rechazada no aborte el lote entero: vuelve
-- en la columna `error` y las demas siguen.
CREATE OR REPLACE FUNCTION public.assign_entities_bulk(
  p_entity_type text,
  p_entity_ids  uuid[],
  p_to_owner    uuid,
  p_reason      text DEFAULT NULL::text
)
RETURNS TABLE(entity_id uuid, ok boolean, error text)
LANGUAGE plpgsql
AS $assign_entities_bulk$
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
END $assign_entities_bulk$;


-- Contadores de la fila "sin asignar" del Command Center.
-- SECURITY INVOKER: los numeros quedan acotados a lo que el que mira
-- puede ver, igual que los listados a los que enlazan.
CREATE OR REPLACE FUNCTION public.unassigned_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $unassigned_summary$
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
$unassigned_summary$;


-- ── Nota sobre network_scouters ─────────────────────────────
-- La definicion de arriba es la original. La migracion 030 la reemplaza
-- para que el nombre no vuelva vacio cuando sobrenombre es string vacio.
-- Correr siempre 030 despues de este archivo.
