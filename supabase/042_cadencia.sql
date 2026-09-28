-- ═══════════════════════════════════════════════════════════
-- 042 · La cadencia: que ninguna ficha se caiga del circuito
--
-- QUE PASABA
--   handleComplete() en el Home hacía esto:
--
--     await dbCompleteNextAction(...)
--     setAgenda(prev => prev.filter(...))
--
--   Completaba la acción, sacaba la ficha de la lista, y no preguntaba
--   cuándo volver. La ficha quedaba sin next_action_at, o sea invisible
--   para siempre — exactamente el estado de las 272 que encontramos hoy.
--
--   Dicho de otro modo: el embudo de ENTRADA lo cerramos con la 041,
--   pero el de SALIDA seguía abierto. Cada seguimiento bien hecho
--   expulsaba a esa persona del sistema. Cuanto mejor trabajaba una
--   Scouter, más rápido se le vaciaba la cartera.
--
--   Para colaboraciones esto ya estaba resuelto: el trigger
--   advance_collaboration() de la 035 agenda el paso siguiente según el
--   estado. Nunca se aplicó a influencers ni marcas. Es el mismo
--   problema y la misma solución.
--
-- SEGURIDAD
--   Todo SECURITY INVOKER salvo lo que se aclara. RLS aplica adentro,
--   así que una Scouter solo puede avanzar o reacomodar lo suyo sin una
--   sola línea de código condicional. reschedule_overdue() es la única
--   que acepta operar sobre otra persona, y ahí sí exige Dirección.
-- ═══════════════════════════════════════════════════════════


-- ── a · La cadencia, en un solo lugar ───────────────────────
-- Cuántos días hasta el próximo toque, según qué tan viva está la
-- relación. No hace falta tabla nueva: relationship_status ya existe
-- desde la 020 con estos cuatro valores.
--
--   cold      3 días — todavía no contestó, hay que insistir seguido
--   warm      5 días — hay conversación, no conviene ahogar
--   strong   21 días — es relación, no venta; se mantiene viva
--   inactive  NULL   — dijo que no. Sale de la agenda y no vuelve.
--
-- Ese NULL es la pieza que hace habitable todo lo demás. Sin una
-- salida real, agendar automáticamente convierte la agenda en una
-- lista de gente que ya dijo que no.
CREATE OR REPLACE FUNCTION follow_up_days(p_rel relationship_status)
RETURNS INT LANGUAGE sql IMMUTABLE AS $follow_up_days$
  SELECT CASE p_rel
    WHEN 'cold'     THEN 3
    WHEN 'warm'     THEN 5
    WHEN 'strong'   THEN 21
    WHEN 'inactive' THEN NULL
  END;
$follow_up_days$;


-- ── b · Completar y agendar en un solo acto ─────────────────
-- Reemplaza a complete_next_action() en el flujo de la agenda. No la
-- pisa: la llama. Así el registro en activities, el borrado de la
-- acción vieja y el chequeo de permisos siguen viviendo en un solo
-- lugar y no hay dos versiones que se puedan separar.
--
--   p_days    NULL → usa la cadencia · >= 0 → esos días · -1 → cerrar
--   p_outcome 'answered' | 'no_answer' | 'not_interested'
--
-- p_outcome no es decoración: queda como activities.type, que es texto
-- libre, así que la tasa de respuesta por Scouter y por ciudad sale de
-- un count(*) sin agregar una sola tabla.
CREATE OR REPLACE FUNCTION advance_follow_up(
  p_entity_type TEXT,
  p_entity_id   UUID,
  p_days        INT  DEFAULT NULL,
  p_outcome     TEXT DEFAULT NULL,
  p_note        TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql AS $advance_follow_up$
DECLARE
  v_tbl   TEXT;
  v_rel   relationship_status;
  v_days  INT;
  v_tz    TEXT;
  v_at    TIMESTAMPTZ;
  v_title TEXT;
BEGIN
  IF p_outcome IS NOT NULL
     AND p_outcome NOT IN ('answered','no_answer','not_interested') THEN
    RAISE EXCEPTION 'outcome inválido: %', p_outcome;
  END IF;

  -- Oportunidades y colaboraciones tienen su propio ciclo: la 035 les
  -- pone la próxima acción según la etapa. Meterles una cadencia de
  -- relación encima sería pisar esa lógica con una peor.
  IF p_entity_type IN ('opportunity','collaboration') THEN
    PERFORM complete_next_action(p_entity_type, p_entity_id,
                                 coalesce(p_outcome, 'follow_up'), p_note);
    RETURN jsonb_build_object('closed', true, 'reason', 'ciclo propio');
  END IF;

  IF p_entity_type NOT IN ('influencer','brand') THEN
    RAISE EXCEPTION 'entity_type inválido: %', p_entity_type;
  END IF;

  v_tbl := CASE p_entity_type WHEN 'influencer' THEN 'influencers' ELSE 'brands' END;

  EXECUTE format('SELECT relationship_status FROM %I WHERE id = $1', v_tbl)
    INTO v_rel USING p_entity_id;

  IF v_rel IS NULL THEN
    RAISE EXCEPTION 'No existe la ficha o no tenés permiso para verla.';
  END IF;

  -- El resultado del contacto mueve la relación, pero solo un escalón y
  -- solo hacia arriba. Saltar de cold a strong con una respuesta
  -- inflaría el número que la directora usa para decidir dónde poner
  -- energía; que algo sea "strong" lo decide una persona, no un click.
  IF p_outcome = 'answered' AND v_rel = 'cold' THEN
    v_rel := 'warm';
  ELSIF p_outcome = 'not_interested' THEN
    v_rel := 'inactive';
  END IF;

  EXECUTE format('UPDATE %I SET relationship_status = $1 WHERE id = $2', v_tbl)
    USING v_rel, p_entity_id;

  -- Completar: limpia la acción vieja y deja el rastro en activities.
  PERFORM complete_next_action(p_entity_type, p_entity_id,
                               coalesce(p_outcome, 'follow_up'), p_note);

  v_days := CASE
              WHEN p_days = -1    THEN NULL
              WHEN p_days IS NULL THEN follow_up_days(v_rel)
              ELSE p_days
            END;

  IF v_days IS NULL THEN
    RETURN jsonb_build_object(
      'closed', true,
      'relationship_status', v_rel);
  END IF;

  v_tz := coalesce(my_timezone(), 'UTC');
  v_at := ((now() AT TIME ZONE v_tz)::date + v_days + TIME '10:00') AT TIME ZONE v_tz;

  v_title := CASE v_rel
               WHEN 'cold'   THEN 'Insistir'
               WHEN 'warm'   THEN 'Seguir la conversación'
               WHEN 'strong' THEN 'Mantener el vínculo'
               ELSE 'Seguimiento'
             END;

  PERFORM set_next_action(p_entity_type, p_entity_id, v_title, v_at);

  RETURN jsonb_build_object(
    'closed', false,
    'relationship_status', v_rel,
    'days', v_days,
    'next_action', v_title,
    'next_action_at', v_at);
END $advance_follow_up$;


-- ── c · Reacomodar lo vencido de un saque ───────────────────
-- Una Scouter vuelve de tres días y tiene cuarenta vencidas. Hoy eso
-- son cuarenta reagendadas a mano, así que no lo hace nadie y la
-- agenda queda podrida para siempre: el sistema pasa a ser una lista
-- que da culpa en vez de una herramienta.
--
-- Lo más viejo primero, y con el mismo escalonado del reparto (041):
-- mover cuarenta vencidas a mañana no arregla nada, solo cambia el día
-- del atasco.
--
-- SECURITY DEFINER por una sola razón: Dirección tiene que poder
-- reacomodarle la agenda a una Scouter que se fue de vacaciones. El
-- permiso se chequea explícitamente en la primera línea.
CREATE OR REPLACE FUNCTION reschedule_overdue(
  p_owner UUID DEFAULT NULL,
  p_cap   INT  DEFAULT 20
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $reschedule_overdue$
DECLARE
  v_owner UUID := coalesce(p_owner, auth.uid());
  r       RECORD;
  n       INT := 0;
BEGIN
  IF v_owner IS DISTINCT FROM auth.uid() AND NOT app_is_direction() THEN
    RAISE EXCEPTION 'Solo Dirección puede reacomodar la agenda de otra persona.';
  END IF;

  FOR r IN
    SELECT 'influencer' AS kind, i.id, i.next_action_at
      FROM influencers i
     WHERE i.owner_scouter_id = v_owner AND i.next_action_at < now()
    UNION ALL
    SELECT 'brand', b.id, b.next_action_at
      FROM brands b
     WHERE b.owner_scouter_id = v_owner AND b.next_action_at < now()
    ORDER BY 3 ASC
  LOOP
    IF r.kind = 'influencer' THEN
      UPDATE influencers SET next_action_at = next_free_slot(v_owner, p_cap)
       WHERE id = r.id;
    ELSE
      UPDATE brands SET next_action_at = next_free_slot(v_owner, p_cap)
       WHERE id = r.id;
    END IF;
    n := n + 1;
  END LOOP;

  RETURN n;
END $reschedule_overdue$;


-- ── d · Las tareas vencidas viejas no se reagendan ──────────
-- Una tarea es un hábito del día: "contactar 10 influencers nuevos".
-- Arrastrar la de hace seis días a hoy no tiene sentido — ese día ya
-- pasó y hoy ya tiene la suya. Reagendarlas solo duplicaría el hábito.
--
-- Lo honesto es cerrarlas como 'cancelled', que es distinto de
-- 'completed': la métrica de cumplimiento no se infla, y la directora
-- ve cuántas se cancelaron, que es justamente la señal de que alguien
-- no está entrando al sistema.
--
-- Solo toca tareas generadas por plantilla. Una tarea que alguien
-- escribió a mano puede seguir teniendo sentido una semana después y
-- no le corresponde al sistema decidir eso.
CREATE OR REPLACE FUNCTION cancel_stale_tasks(
  p_days  INT  DEFAULT 3,
  p_owner UUID DEFAULT NULL
) RETURNS INT LANGUAGE plpgsql AS $cancel_stale_tasks$
DECLARE
  v_owner UUID := coalesce(p_owner, auth.uid());
  n INT;
BEGIN
  UPDATE tasks
     SET status = 'cancelled'
   WHERE assigned_to = v_owner
     AND template_id IS NOT NULL
     AND status NOT IN ('completed','cancelled')
     AND due_date < now() - make_interval(days => p_days);

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $cancel_stale_tasks$;


-- ── Verificacion ────────────────────────────────────────────
-- 1) La cadencia, escrita
SELECT unnest(enum_range(NULL::relationship_status)) AS estado,
       follow_up_days(unnest(enum_range(NULL::relationship_status))) AS dias;

-- 2) Cuantas vencidas tiene cada persona hoy. Es lo que el boton de
--    reacomodar va a resolver de un toque.
SELECT coalesce(nullif(btrim(p.sobrenombre),''), p.nombre, p.email) AS scouter,
       count(*) AS vencidas
FROM (
  SELECT owner_scouter_id, next_action_at FROM influencers WHERE next_action_at < now()
  UNION ALL
  SELECT owner_scouter_id, next_action_at FROM brands      WHERE next_action_at < now()
) v
JOIN profiles p ON p.id = v.owner_scouter_id
GROUP BY 1
ORDER BY 2 DESC;
