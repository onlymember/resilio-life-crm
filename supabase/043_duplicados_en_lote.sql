-- ═══════════════════════════════════════════════════════════
-- 043 · Detectar duplicados de un archivo entero, en una llamada
--
-- QUE PASABA
--   check_duplicate() existe desde la 037 y no la usa NADIE. Lo
--   verifiqué: cero referencias en todo el cliente. Quedó escrita y
--   muerta, así que hoy se puede importar la misma marca dos veces sin
--   que nada avise.
--
--   El problema que eso causa no es técnico sino social: dos Scouters
--   de la misma red escribiéndole a la misma marca la misma semana.
--   Eso se nota del otro lado y cuesta caro.
--
--   No se cableó la de la 037 porque es de a una: revisar un CSV de 500
--   filas serían 500 llamadas. Esta recibe el archivo entero y devuelve
--   un mapa de coincidencias en un solo viaje.
--
-- QUE DEVUELVE
--   { "<clave de fila>": { "city": "...", "mine": true, "owner": "..." } }
--   Solo las filas que YA existen. Las que no aparecen están limpias.
--
-- SEGURIDAD · la parte que hay que leer con atención
--   Es SECURITY DEFINER, o sea que mira TODA la base, salteando RLS.
--   Tiene que ser así: el sentido de esto es avisarte de una ficha que
--   justamente NO podés ver, porque es de otra Scouter. Si respetara
--   RLS solo detectaría tus propios duplicados, que son los únicos que
--   no importan.
--
--   Por eso devuelve lo mínimo que resuelve el problema: que existe, y
--   en qué ciudad. Con eso alcanza para no cargarla.
--
--   El nombre de quien la tiene solo viaja si quien pregunta es
--   Dirección, o si la ficha ya es suya. Una Scouter se entera de que
--   la marca está tomada, no de por quién: para coordinar con alguien
--   está la directora, y filtrar acá es más barato que explicar después
--   por qué el sistema cuenta cosas de más.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_duplicates_bulk(
  p_type TEXT,
  p_rows JSONB          -- [{k, instagram, email, name}, ...]
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $check_duplicates_bulk$
DECLARE
  v_out   JSONB := '{}'::jsonb;
  r       JSONB;
  v_ig    TEXT;
  v_mail  TEXT;
  v_name  TEXT;
  v_city  TEXT;
  v_mine  BOOLEAN;
  v_owner TEXT;
  v_dir   BOOLEAN := app_is_direction();
BEGIN
  IF p_type NOT IN ('influencer','brand') THEN
    RAISE EXCEPTION 'type inválido: %', p_type;
  END IF;

  -- Tope para que una llamada no se vuelva un escaneo eterno. Coincide
  -- con el tamaño de archivo que el importador acepta de una.
  IF jsonb_array_length(p_rows) > 1000 THEN
    RAISE EXCEPTION 'Demasiadas filas de una sola vez (máximo 1000).';
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_ig   := nullif(lower(btrim(replace(coalesce(r->>'instagram',''), '@',''))), '');
    v_mail := nullif(lower(btrim(coalesce(r->>'email',''))), '');
    v_name := nullif(lower(btrim(coalesce(r->>'name',''))), '');

    IF p_type = 'influencer' THEN
      -- Un influencer se identifica por su Instagram o su mail. Por
      -- nombre NO: hay tres Sofía Fernández y ninguna es la otra.
      CONTINUE WHEN v_ig IS NULL AND v_mail IS NULL;

      SELECT c.name,
             (i.owner_scouter_id = auth.uid()),
             coalesce(nullif(btrim(p.sobrenombre),''), p.nombre, p.email)
        INTO v_city, v_mine, v_owner
      FROM influencers i
      LEFT JOIN cities   c ON c.id = i.city_id
      LEFT JOIN profiles p ON p.id = i.owner_scouter_id
      WHERE (v_ig   IS NOT NULL AND lower(replace(coalesce(i.instagram,''), '@','')) = v_ig)
         OR (v_mail IS NOT NULL AND lower(coalesce(i.email,'')) = v_mail)
      LIMIT 1;
    ELSE
      -- Una marca sí se identifica por nombre: "Havanna" es Havanna.
      CONTINUE WHEN v_mail IS NULL AND v_name IS NULL;

      SELECT c.name,
             (b.owner_scouter_id = auth.uid()),
             coalesce(nullif(btrim(p.sobrenombre),''), p.nombre, p.email)
        INTO v_city, v_mine, v_owner
      FROM brands b
      LEFT JOIN cities   c ON c.id = b.city_id
      LEFT JOIN profiles p ON p.id = b.owner_scouter_id
      WHERE (v_mail IS NOT NULL AND lower(coalesce(b.email,'')) = v_mail)
         OR (v_name IS NOT NULL AND lower(btrim(b.name)) = v_name)
      LIMIT 1;
    END IF;

    IF FOUND THEN
      v_out := v_out || jsonb_build_object(
        r->>'k',
        jsonb_build_object(
          'city',  coalesce(v_city, 'sin ciudad'),
          'mine',  coalesce(v_mine, false),
          'owner', CASE WHEN v_dir OR coalesce(v_mine, false) THEN v_owner ELSE NULL END));
    END IF;
  END LOOP;

  RETURN v_out;
END $check_duplicates_bulk$;


-- ── Verificacion ────────────────────────────────────────────
-- Una marca que existe y una inventada. La primera tiene que volver,
-- la segunda no. Cambiá el nombre por uno que sepas que está cargado.
SELECT jsonb_pretty(check_duplicates_bulk('brand', jsonb_build_array(
  jsonb_build_object('k','1','name','Havanna'),
  jsonb_build_object('k','2','name','Marca Que No Existe 9999')
)));
