-- ═══════════════════════════════════════════════════════════
-- 035 · El sistema dentro del sistema
--
-- Tres piezas que convierten en operacion automatica lo que hoy es
-- disciplina de una persona.
--
--   a) advance_collaboration()  la colaboracion se agenda sola
--   b) open_city()              abrir una ciudad es una operacion
--   c) system_health()          el sistema se revisa a si mismo
--
-- SEGURIDAD: (a) es un trigger BEFORE que solo toca la fila que se
-- esta escribiendo. (b) es DEFINER y valida app_is_direction() antes
-- de hacer nada. (c) es solo lectura.
-- ═══════════════════════════════════════════════════════════


-- ── a · La colaboracion se agenda sola ──────────────────────
-- Con mas de una colaboracion por dia, el paso que se saltea siempre
-- es el 6: reagendar. Este trigger lo hace innecesario. La Scouter
-- cambia UN campo, el estado, y el sistema pone la proxima accion que
-- corresponde a esa etapa, con su fecha.
--
-- Es BEFORE y modifica NEW: no dispara un segundo UPDATE, no recursa,
-- y no necesita permisos extra.
--
-- Respeta a la persona: si en la misma operacion el usuario escribio
-- una proxima accion a mano, esa gana.
CREATE OR REPLACE FUNCTION advance_collaboration()
RETURNS TRIGGER LANGUAGE plpgsql AS $advance_collaboration$
DECLARE v_at TIMESTAMPTZ;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.next_action IS DISTINCT FROM OLD.next_action THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'proposed' THEN
    NEW.next_action    := 'Confirmar con la marca y el creador';
    v_at               := now() + INTERVAL '1 day';

  ELSIF NEW.status = 'confirmed' THEN
    NEW.next_action    := 'Recordar a ambas partes';
    v_at               := coalesce(NEW.start_date::timestamptz - INTERVAL '2 days',
                                   now() + INTERVAL '1 day');

  ELSIF NEW.status = 'in_progress' THEN
    NEW.next_action    := 'Registrar que se ejecutó y pedir el contenido';
    v_at               := coalesce(NEW.start_date::timestamptz + INTERVAL '1 day',
                                   now() + INTERVAL '1 day');

  ELSIF NEW.status = 'content_pending' THEN
    NEW.next_action    := 'Pedir el contenido publicado';
    v_at               := now() + INTERVAL '2 days';

  ELSE
    NEW.next_action    := NULL;
    NEW.next_action_at := NULL;
    RETURN NEW;
  END IF;

  NEW.next_action_at := GREATEST(v_at, now() + INTERVAL '1 hour');
  RETURN NEW;
END $advance_collaboration$;

DROP TRIGGER IF EXISTS trg_advance_collaboration ON collaborations;
CREATE TRIGGER trg_advance_collaboration
  BEFORE INSERT OR UPDATE OF status ON collaborations
  FOR EACH ROW EXECUTE FUNCTION advance_collaboration();


-- ── b · Abrir una ciudad es UNA operacion ───────────────────
-- Hoy abrir una ciudad son diez pasos que alguien recuerda: crear la
-- ciudad, buscar el perfil, darlo de alta como Scouter, asignarle el
-- rol, verificar que quedo bien. Cada paso es una chance de olvidarse
-- uno, y ya vimos lo que cuesta: una cuenta duplicada, un mail con un
-- typo, fichas sin ciudad.
--
-- La unidad que se repite al escalar no es el dia ni el mes: es la
-- ciudad. Esto la vuelve una sola llamada, verificable y reversible.
CREATE OR REPLACE FUNCTION open_city(
  p_city_name    TEXT,
  p_country_code TEXT,
  p_scouter_email TEXT DEFAULT NULL,
  p_timezone     TEXT DEFAULT NULL,
  p_level        INT  DEFAULT 1
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $open_city$
DECLARE
  v_country countries;
  v_city_id UUID;
  v_user_id UUID;
  v_slug    TEXT;
  v_created BOOLEAN := FALSE;
BEGIN
  IF NOT app_is_direction() THEN
    RAISE EXCEPTION 'Solo Dirección puede abrir una ciudad.';
  END IF;

  SELECT * INTO v_country FROM countries WHERE upper(code) = upper(p_country_code);
  IF v_country.id IS NULL THEN
    RAISE EXCEPTION 'No existe el país %. Creálo primero desde Geografía, con su moneda, huso y locale.', p_country_code;
  END IF;

  v_slug := lower(regexp_replace(
              translate(btrim(p_city_name),
                        'áéíóúÁÉÍÓÚñÑüÜàèìòùâêîôûçÇ',
                        'aeiouAEIOUnNuUaeiouaeioucC'),
              '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := btrim(v_slug, '-');

  SELECT id INTO v_city_id FROM cities
   WHERE country_id = v_country.id AND slug = v_slug;

  IF v_city_id IS NULL THEN
    INSERT INTO cities (country_id, name, slug, timezone)
    VALUES (v_country.id, btrim(p_city_name), v_slug,
            coalesce(p_timezone, v_country.timezone))
    RETURNING id INTO v_city_id;
    v_created := TRUE;
  END IF;

  IF p_scouter_email IS NOT NULL THEN
    SELECT id INTO v_user_id FROM profiles WHERE lower(email) = lower(btrim(p_scouter_email));
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'No hay ningún perfil con el mail %. Esa persona tiene que registrarse antes.', p_scouter_email;
    END IF;
    PERFORM upsert_scouter(v_user_id, v_city_id, NULL, p_level, 'active');
  END IF;

  RETURN jsonb_build_object(
    'city_id',      v_city_id,
    'city',         btrim(p_city_name),
    'slug',         v_slug,
    'country',      v_country.name,
    'timezone',     coalesce(p_timezone, v_country.timezone),
    'currency',     v_country.currency,
    'city_created', v_created,
    'scouter',      p_scouter_email
  );
END $open_city$;


-- ── c · El sistema se revisa a si mismo ─────────────────────
-- Esta funcion FALTABA en este archivo. Se corrio pegandola en el
-- editor de Supabase y nunca quedo en el repo: el archivo terminaba en
-- open_city(). Lo que sigue es el volcado literal de lo que esta vivo
-- en la base al 2026-09-28 (pg_get_functiondef), no una reescritura.
--
-- Es solo lectura y devuelve una fila por hallazgo, ordenada por
-- severidad. Cero filas es el estado sano.
CREATE OR REPLACE FUNCTION public.system_health()
 RETURNS TABLE(severidad text, control text, detalle text)
 LANGUAGE sql
 STABLE
AS $function$

  SELECT 'alta', 'Tabla sin RLS',
         c.relname || ' está expuesta por la API sin ninguna restricción'
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity

  UNION ALL
  SELECT 'alta', 'Policy abierta sobre datos de negocio',
         tablename || '.' || policyname || ' no filtra nada'
  FROM pg_policies
  WHERE schemaname = 'public'
    AND qual IN ('true', '(true)')
    AND tablename IN ('influencers','brands','profiles','user_roles','opportunities',
                      'collaborations','tasks','activities','assignments','scouters')

  UNION ALL
  SELECT 'alta', 'Vista que saltea RLS',
         c.relname || ' corre con permisos de quien la creó'
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'v'
    AND coalesce(c.reloptions::text, '') NOT LIKE '%security_invoker=true%'

  UNION ALL
  SELECT 'alta', 'Mail con error de tipeo',
         p.email || ' termina en un dominio que no existe'
  FROM profiles p
  WHERE split_part(p.email, '.', array_length(string_to_array(p.email, '.'), 1))
        IN ('con','cmo','vom','col','comm','cm')

  UNION ALL
  SELECT 'alta', 'Persona con dos cuentas de Scouter',
         x.nombre || ' aparece en ' || x.n || ' cuentas distintas'
  FROM (
    SELECT lower(btrim(coalesce(nullif(btrim(p.sobrenombre),''), p.nombre))) AS nombre,
           count(*) AS n
    FROM scouters s JOIN profiles p ON p.id = s.user_id
    WHERE s.status = 'active'
    GROUP BY 1 HAVING count(*) > 1
  ) x

  UNION ALL
  SELECT 'alta', 'Ficha sin dueño',
         'Hay ' || count(*) || ' influencers o marcas que no le aparecen a nadie'
  FROM (
    SELECT id FROM influencers WHERE owner_scouter_id IS NULL
    UNION ALL
    SELECT id FROM brands      WHERE owner_scouter_id IS NULL
  ) y
  HAVING count(*) > 0

  UNION ALL
  SELECT 'media', 'Ficha sin ciudad',
         'Hay ' || count(*) || ' fichas que solo ve Dirección'
  FROM (
    SELECT id FROM influencers WHERE city_id IS NULL
    UNION ALL
    SELECT id FROM brands      WHERE city_id IS NULL
  ) z
  HAVING count(*) > 0

  UNION ALL
  SELECT 'media', 'Colaboración confirmada sin próxima acción',
         'Hay ' || count(*) || ' que no le van a aparecer a nadie en la agenda'
  FROM collaborations
  WHERE status IN ('confirmed','in_progress','content_pending')
    AND next_action_at IS NULL
  HAVING count(*) > 0

  UNION ALL
  SELECT 'media', 'Base sin seguimiento agendado',
         'Hay ' || count(*) || ' fichas activas sin próxima acción'
  FROM (
    SELECT id FROM influencers WHERE status = 'active' AND next_action_at IS NULL
    UNION ALL
    SELECT id FROM brands      WHERE status = 'active' AND next_action_at IS NULL
  ) w
  HAVING count(*) > 0

  UNION ALL
  SELECT 'media', 'Scouter activo sin actividad',
         coalesce(nullif(btrim(p.sobrenombre),''), p.nombre, p.email)
         || ' hace ' || (CURRENT_DATE - coalesce(max(a.occurred_at)::date, s.joined_at)) || ' días'
  FROM scouters s
  JOIN profiles p ON p.id = s.user_id
  LEFT JOIN activities a ON a.actor_id = s.user_id
  WHERE s.status = 'active'
  GROUP BY p.sobrenombre, p.nombre, p.email, s.joined_at
  HAVING coalesce(max(a.occurred_at)::date, s.joined_at) < CURRENT_DATE - 5

  UNION ALL
  SELECT 'media', 'Tarea vencida hace más de una semana',
         'Hay ' || count(*) || ' tareas que nadie va a hacer'
  FROM tasks
  WHERE status NOT IN ('completed','cancelled')
    AND due_date < now() - INTERVAL '7 days'
  HAVING count(*) > 0

  UNION ALL
  SELECT 'baja', 'Plantilla de tarea recurrente sin usar',
         'No hay ninguna plantilla activa: las tareas se están cargando a mano'
  FROM (SELECT 1) u
  WHERE NOT EXISTS (SELECT 1 FROM task_templates WHERE active AND recurrence <> 'one_time')

  ORDER BY 1, 2;
$function$;


-- ── Verificacion ────────────────────────────────────────────
-- Cero filas es el estado sano. Cada fila es algo que hay que mirar.
SELECT * FROM system_health();
