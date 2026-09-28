-- ═══════════════════════════════════════════════════════════
-- 041 · Repartir una ficha la pone en la agenda
--
-- QUE PASABA
--   Una ficha sin next_action_at no aparece en el Home de nadie: la
--   agenda se arma por esa columna. Y el formulario de carga no la
--   pide. Resultado: 272 fichas cargadas y ninguna visible.
--
--   El primer diseño ponía la próxima acción AL CARGAR. Está mal: el
--   flujo real es cargar primero (la ficha queda a nombre de quien
--   carga) y repartir después. Al cargar todavía no se sabe de quién
--   va a ser, así que fechar ahí le llena la agenda a la persona
--   equivocada.
--
--   El momento correcto es el reparto. Por eso esto vive dentro de
--   assign_entity(), que es el único camino para cambiar de dueño y
--   por donde pasan el botón de reasignar, la barra de selección
--   múltiple y el reparto en lote.
--
-- EL ESCALONADO, Y POR QUE NO ALCANZA CON "MAÑANA"
--   Repartir 300 marcas y fecharlas todas para mañana deja una agenda
--   de 300 items en un día. Eso es tan inútil como tenerlas invisibles:
--   nadie abre una lista así. next_free_slot() busca el primer día que
--   le quede lugar a esa persona y la pone ahí.
--
-- SEGURIDAD
--   assign_entity() mantiene su firma y su chequeo de permisos intacto.
--   Lo único que se agrega es fechar la ficha DESPUES de que el cambio
--   de dueño ya fue autorizado. No toca owner_scouter_id ni la tabla
--   assignments.
-- ═══════════════════════════════════════════════════════════


-- ── El ritmo ────────────────────────────────────────────────
-- Un solo número, en un solo lugar. 20 por día es el orden de magnitud
-- del plan de activación (10 influencers + 3 marcas de contacto nuevo,
-- más el seguimiento de lo ya abierto). Para cambiarlo, se cambia acá.
--
-- VOLATILE a propósito, y no es un descuido: repartir un lote llama a
-- esta función una vez por ficha dentro de la misma transacción. Si
-- fuera STABLE podría no ver las fichas que las iteraciones anteriores
-- acaban de fechar, y las 300 caerían el mismo día — justo lo que esto
-- viene a evitar.
CREATE OR REPLACE FUNCTION next_free_slot(p_owner UUID, p_cap INT DEFAULT 20)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $slot$
DECLARE
  v_tz  TEXT;
  v_day DATE;
  v_n   INT;
  i     INT;
BEGIN
  -- El huso de la ciudad de esa persona. Si no es Scouter (por ejemplo
  -- Dirección quedándose una ficha para trabajarla), el huso de quien
  -- está repartiendo.
  SELECT coalesce(c.timezone, co.timezone) INTO v_tz
  FROM scouters s
  JOIN cities    c  ON c.id  = s.city_id
  JOIN countries co ON co.id = c.country_id
  WHERE s.user_id = p_owner;

  v_tz := coalesce(v_tz, my_timezone(), 'UTC');

  -- Arranca mañana: fechar algo para hoy a las 10 cuando ya son las 18
  -- es crear un vencido en el mismo acto de repartirlo.
  FOR i IN 1..180 LOOP
    v_day := (now() AT TIME ZONE v_tz)::date + i;

    SELECT count(*) INTO v_n FROM (
      SELECT next_action_at FROM influencers
        WHERE owner_scouter_id = p_owner AND next_action_at IS NOT NULL
      UNION ALL
      SELECT next_action_at FROM brands
        WHERE owner_scouter_id = p_owner AND next_action_at IS NOT NULL
    ) x
    WHERE (x.next_action_at AT TIME ZONE v_tz)::date = v_day;

    IF v_n < p_cap THEN
      RETURN (v_day + TIME '10:00') AT TIME ZONE v_tz;
    END IF;
  END LOOP;

  -- Seis meses llenos. Devolver algo igual es mejor que fallar el
  -- reparto entero: la ficha queda visible, aunque lejos.
  RETURN (((now() AT TIME ZONE v_tz)::date + 181) + TIME '10:00') AT TIME ZONE v_tz;
END $slot$;


-- ── assign_entity(), con la fecha al final ──────────────────
-- Cuerpo idéntico al que estaba vivo (volcado el 2026-09-28), más el
-- bloque marcado al final. Se reemplaza entero y no por partes para
-- que el archivo siga siendo lectura completa de lo que corre.
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

  -- ── NUEVO (041) · la ficha entra a la agenda ──────────────
  -- Solo influencers y marcas: oportunidades y colaboraciones ya tienen
  -- su propio ciclo de próxima acción (ver el trigger de la 035).
  --
  -- coalesce en las dos columnas: si la ficha YA traía una próxima
  -- acción, se respeta. Repartir no es motivo para pisar lo que alguien
  -- ya decidió.
  --
  -- Va después del cambio de dueño y con app.assigning ya apagado: este
  -- UPDATE no toca la columna de propiedad, así que el trigger
  -- protect_owner_column lo deja pasar.
  IF p_entity_type IN ('influencer','brand') AND p_to_owner IS NOT NULL THEN
    EXECUTE format(
      'UPDATE %I SET next_action = coalesce(next_action, $1),
                     next_action_at = coalesce(next_action_at, $2)
        WHERE id = $3', v_tbl)
      USING 'Primer contacto', next_free_slot(p_to_owner), p_entity_id;
  END IF;
END $function$;


-- ── Verificacion ────────────────────────────────────────────
-- 1) Cuantas fichas sin proxima accion quedan, y de quien son.
--    Estas son las que entran a la agenda a medida que las repartas.
SELECT coalesce(nullif(btrim(p.sobrenombre),''), p.nombre, p.email, '— sin dueño —') AS duenio,
       count(*) AS sin_proxima_accion
FROM (
  SELECT owner_scouter_id FROM influencers WHERE next_action_at IS NULL
  UNION ALL
  SELECT owner_scouter_id FROM brands      WHERE next_action_at IS NULL
) f
LEFT JOIN profiles p ON p.id = f.owner_scouter_id
GROUP BY 1
ORDER BY 2 DESC;

-- 2) Como quedaria repartido el proximo lote para una persona.
--    Cambiar el UUID por el de una Scouter y correrlo tres veces: tiene
--    que devolver el mismo dia hasta llenarlo, y recien ahi pasar al
--    siguiente.
-- SELECT next_free_slot('<uuid-de-la-scouter>');
