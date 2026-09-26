-- ═══════════════════════════════════════════════════════════
-- 030 · El nombre del Scouter no puede volver vacío
--
-- SÍNTOMA
--   En Tareas, el selector de Responsable mostraba " · Rosario":
--   solo la ciudad, sin nombre. Lo mismo en las listas de asignación.
--
-- CAUSA
--   network_scouters() resolvía el nombre con
--     coalesce(p.sobrenombre, p.nombre, p.email)
--   y coalesce solo salta NULL. Un perfil con sobrenombre = ''
--   (string vacío, no NULL) hace que coalesce devuelva '' y ahí
--   termina la cadena: nunca llega a nombre ni a email.
--
--   Un formulario que guarda '' en vez de NULL es lo normal, así que
--   el arreglo va acá y no en los datos.
--
-- CÓMO
--   nullif(btrim(x), '') convierte '' y "   " en NULL, y entonces
--   coalesce sí sigue a la opción siguiente. Se mantiene todo lo
--   demás de la función igual.
--
-- SEGURIDAD: CREATE OR REPLACE, misma firma, mismas columnas.
-- No toca datos. Sigue siendo SECURITY INVOKER: cada rol ve su
-- alcance por RLS, como antes.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.network_scouters(
  p_city    uuid DEFAULT NULL::uuid,
  p_country uuid DEFAULT NULL::uuid,
  p_region  uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  user_id       uuid,
  nombre        text,
  email         text,
  ciudad        text,
  pais          text,
  city_id       uuid,
  level         integer,
  status        text,
  joined_at     date,
  influencers   bigint,
  brands        bigint,
  opportunities bigint,
  tasks_open    bigint,
  tasks_overdue bigint,
  last_activity timestamp with time zone,
  days_inactive integer
)
LANGUAGE sql
STABLE
AS $network_scouters$
  SELECT s.user_id,
         coalesce(
           nullif(btrim(p.sobrenombre), ''),
           nullif(btrim(p.nombre),      ''),
           nullif(btrim(p.email),       ''),
           'Sin nombre'
         ),
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
  JOIN profiles p  ON p.id  = s.user_id
  JOIN cities   c  ON c.id  = s.city_id
  JOIN countries co ON co.id = c.country_id
  WHERE (p_city    IS NULL OR s.city_id     = p_city)
    AND (p_country IS NULL OR c.country_id  = p_country)
    AND (p_region  IS NULL OR co.region_id  = p_region)
  ORDER BY 2;
$network_scouters$;


-- ── Verificación ────────────────────────────────────────────
-- Tiene que devolver una fila por Scouter, con nombre NO vacío.
-- La columna `problema` marca lo que antes se veía como solo ciudad.
SELECT user_id, nombre, email, ciudad,
       (btrim(coalesce(nombre,'')) = '') AS problema
FROM network_scouters()
ORDER BY nombre;
