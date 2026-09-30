-- ═══════════════════════════════════════════════════════════
-- 049 · Network, fase 2
--
--   1. Checklist por colaboración (columna nueva, vacía por defecto).
--   2. WhatsApp y teléfono con formato internacional al guardar:
--      countries.dial_code + norm_phone() + trigger en influencers y
--      marcas. Lo que ya está cargado NO se toca (solo se normaliza lo
--      que se guarda de acá en adelante).
--   3. Aviso de duplicado al escribir (Instagram, mail, WhatsApp o
--      nombre de marca): check_duplicate_v2().
--   4. Tiempo por etapa: se registra cada cambio de relationship_status
--      (tabla relationship_changes) y stage_funnel() arma el reporte del
--      Command Center. Mide desde que se instala esta migración.
--
-- Solo agrega. No borra ni cambia datos existentes. Rollback al final.
-- ═══════════════════════════════════════════════════════════
BEGIN;

-- ── 1 · Checklist de colaboración ───────────────────────────
-- { "confirmed": true, "visited": true, "content": false, "link": false, "brand_notified": false }
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS checklist JSONB NOT NULL DEFAULT '{}'::jsonb;


-- ── 2 · Formato internacional de WhatsApp / teléfono ───────
ALTER TABLE countries ADD COLUMN IF NOT EXISTS dial_code TEXT;

-- Códigos de los países más probables. Se busca por código ISO (2 o 3
-- letras) o por nombre, así funciona sea cual sea cómo se cargaron.
UPDATE countries c SET dial_code = v.dial
FROM (VALUES
  ('AR','ARG','{argentina}','54'),
  ('ES','ESP','{españa,espana,spain}','34'),
  ('UY','URY','{uruguay}','598'),
  ('CL','CHL','{chile}','56'),
  ('MX','MEX','{méxico,mexico}','52'),
  ('CO','COL','{colombia}','57'),
  ('PE','PER','{perú,peru}','51'),
  ('PY','PRY','{paraguay}','595'),
  ('BO','BOL','{bolivia}','591'),
  ('EC','ECU','{ecuador}','593'),
  ('VE','VEN','{venezuela}','58'),
  ('BR','BRA','{brasil,brazil}','55'),
  ('US','USA','{estados unidos,united states,eeuu,usa}','1'),
  ('IT','ITA','{italia,italy}','39'),
  ('FR','FRA','{francia,france}','33'),
  ('PT','PRT','{portugal}','351'),
  ('DE','DEU','{alemania,germany}','49'),
  ('GB','GBR','{reino unido,united kingdom,inglaterra}','44'),
  ('AD','AND','{andorra}','376')
) AS v(c2, c3, names, dial)
WHERE c.dial_code IS NULL
  -- to_jsonb(c)->>'code': si la columna code no existe, no falla.
  AND (upper(coalesce(to_jsonb(c)->>'code', '')) IN (v.c2, v.c3) OR lower(btrim(c.name)) = ANY (v.names::text[]));

-- Devuelve el número como +<código><número>, o el valor tal cual si no
-- se puede saber (país sin código, largo raro). Nunca devuelve NULL si
-- entró algo: no se pierde un dato por no entenderlo.
CREATE OR REPLACE FUNCTION norm_phone(p_raw TEXT, p_country UUID)
RETURNS TEXT LANGUAGE plpgsql STABLE SET search_path = public AS $f$
DECLARE
  v    TEXT;
  d    TEXT;
  dial TEXT;
BEGIN
  IF p_raw IS NULL OR btrim(p_raw) = '' THEN RETURN p_raw; END IF;
  v := regexp_replace(p_raw, '[^0-9+]', '', 'g');
  IF v LIKE '00%' THEN v := '+' || substr(v, 3); END IF;

  IF left(v, 1) = '+' THEN
    d := regexp_replace(v, '[^0-9]', '', 'g');
  ELSE
    SELECT dial_code INTO dial FROM countries WHERE id = p_country;
    IF dial IS NULL THEN RETURN p_raw; END IF;
    d := regexp_replace(v, '[^0-9]', '', 'g');
    IF d LIKE dial || '%' AND length(d) >= length(dial) + 9 THEN
      NULL;                                   -- ya trae el código, solo falta el +
    ELSE
      d := regexp_replace(d, '^0+', '');      -- 011…, 0341…, 06…
      -- Argentina: en WhatsApp los celulares llevan 9 después del 54.
      -- Si escribieron el "15" local (11 15 1234 5678) se saca.
      IF dial = '54' THEN
        d := regexp_replace(d, '^(\d{2,4})15(\d{6,8})$', '\1\2');
        IF length(d) = 10 THEN d := '9' || d; END IF;
      END IF;
      d := dial || d;
    END IF;
  END IF;

  -- Argentina con +54 pero sin el 9 de celular (+54 11 2345 6789).
  IF d ~ '^54[1-8][0-9]{9}$' THEN d := '549' || substr(d, 3); END IF;

  IF length(d) BETWEEN 8 AND 15 THEN RETURN '+' || d; END IF;
  RETURN p_raw;
END $f$;

CREATE OR REPLACE FUNCTION trg_norm_contact()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $f$
DECLARE v_country UUID := NEW.country_id;
BEGIN
  IF v_country IS NULL AND NEW.city_id IS NOT NULL THEN
    SELECT country_id INTO v_country FROM cities WHERE id = NEW.city_id;
  END IF;
  IF TG_OP = 'INSERT' OR NEW.whatsapp IS DISTINCT FROM OLD.whatsapp THEN
    NEW.whatsapp := norm_phone(NEW.whatsapp, v_country);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.phone IS DISTINCT FROM OLD.phone THEN
    NEW.phone := norm_phone(NEW.phone, v_country);
  END IF;
  RETURN NEW;
END $f$;

DROP TRIGGER IF EXISTS trg_influencers_norm_contact ON influencers;
CREATE TRIGGER trg_influencers_norm_contact BEFORE INSERT OR UPDATE OF whatsapp, phone ON influencers
  FOR EACH ROW EXECUTE FUNCTION trg_norm_contact();
DROP TRIGGER IF EXISTS trg_brands_norm_contact ON brands;
CREATE TRIGGER trg_brands_norm_contact BEFORE INSERT OR UPDATE OF whatsapp, phone ON brands
  FOR EACH ROW EXECUTE FUNCTION trg_norm_contact();


-- ── 3 · Duplicados al escribir ──────────────────────────────
-- Últimos 9 dígitos del número: así "+54 9 11 1234-5678" y "1112345678"
-- se reconocen como el mismo.
CREATE OR REPLACE FUNCTION phone_key(p TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $f$
  SELECT CASE WHEN length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) >= 8
              THEN right(regexp_replace(p, '\D', '', 'g'), 9) END
$f$;
CREATE INDEX IF NOT EXISTS idx_influencers_phone_key ON influencers (phone_key(whatsapp));
CREATE INDEX IF NOT EXISTS idx_brands_phone_key      ON brands (phone_key(whatsapp));

-- Igual que check_duplicate (037) más WhatsApp y el campo que coincidió.
-- El nombre y el id se devuelven solo si la ficha es tuya o sos
-- Dirección; al resto solo se le dice que existe y en qué ciudad.
CREATE OR REPLACE FUNCTION check_duplicate_v2(
  p_type      TEXT,
  p_instagram TEXT DEFAULT NULL,
  p_email     TEXT DEFAULT NULL,
  p_whatsapp  TEXT DEFAULT NULL,
  p_name      TEXT DEFAULT NULL,
  p_exclude   UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $f$
DECLARE
  v_ig    TEXT := nullif(lower(btrim(replace(coalesce(p_instagram, ''), '@', ''))), '');
  v_mail  TEXT := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_wa    TEXT := phone_key(p_whatsapp);
  v_name  TEXT := nullif(lower(btrim(coalesce(p_name, ''))), '');
  r       RECORD;
  v_show  BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('exists', false); END IF;

  IF p_type = 'influencer' THEN
    SELECT i.id, i.name, c.name AS city, i.owner_scouter_id AS owner,
           CASE WHEN v_ig IS NOT NULL AND lower(replace(coalesce(i.instagram, ''), '@', '')) = v_ig THEN 'instagram'
                WHEN v_ig IS NOT NULL AND lower(coalesce(i.username, '')) = v_ig THEN 'instagram'
                WHEN v_mail IS NOT NULL AND lower(coalesce(i.email, '')) = v_mail THEN 'email'
                ELSE 'whatsapp' END AS field
      INTO r
    FROM influencers i LEFT JOIN cities c ON c.id = i.city_id
    WHERE (p_exclude IS NULL OR i.id <> p_exclude)
      AND ((v_ig   IS NOT NULL AND (lower(replace(coalesce(i.instagram, ''), '@', '')) = v_ig OR lower(coalesce(i.username, '')) = v_ig))
        OR (v_mail IS NOT NULL AND lower(coalesce(i.email, '')) = v_mail)
        OR (v_wa   IS NOT NULL AND phone_key(i.whatsapp) = v_wa))
    LIMIT 1;
  ELSE
    SELECT b.id, b.name, c.name AS city, b.owner_scouter_id AS owner,
           CASE WHEN v_mail IS NOT NULL AND lower(coalesce(b.email, '')) = v_mail THEN 'email'
                WHEN v_wa IS NOT NULL AND phone_key(b.whatsapp) = v_wa THEN 'whatsapp'
                ELSE 'name' END AS field
      INTO r
    FROM brands b LEFT JOIN cities c ON c.id = b.city_id
    WHERE (p_exclude IS NULL OR b.id <> p_exclude)
      AND ((v_mail IS NOT NULL AND lower(coalesce(b.email, '')) = v_mail)
        OR (v_wa   IS NOT NULL AND phone_key(b.whatsapp) = v_wa)
        OR (v_name IS NOT NULL AND lower(btrim(b.name)) = v_name))
    LIMIT 1;
  END IF;

  IF r.id IS NULL THEN RETURN jsonb_build_object('exists', false); END IF;
  v_show := (r.owner = auth.uid()) OR app_is_direction();
  RETURN jsonb_build_object(
    'exists', true,
    'field',  r.field,
    'city',   coalesce(r.city, 'sin ciudad'),
    'mine',   coalesce(r.owner = auth.uid(), false),
    'id',     CASE WHEN v_show THEN r.id END,
    'name',   CASE WHEN v_show THEN r.name END);
END $f$;


-- ── 4 · Tiempo por etapa ────────────────────────────────────
CREATE TABLE IF NOT EXISTS relationship_changes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('influencer', 'brand')),
  entity_id    UUID NOT NULL,
  from_stage   TEXT,
  to_stage     TEXT NOT NULL,
  changed_by   UUID,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_relchg_entity ON relationship_changes (entity_type, entity_id, changed_at);

ALTER TABLE relationship_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON relationship_changes FROM anon;
REVOKE INSERT, UPDATE, DELETE ON relationship_changes FROM authenticated;
DROP POLICY IF EXISTS relchg_select ON relationship_changes;
CREATE POLICY relchg_select ON relationship_changes FOR SELECT TO authenticated
  USING (app_is_direction());

CREATE OR REPLACE FUNCTION trg_log_relationship_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
BEGIN
  IF NEW.relationship_status IS DISTINCT FROM OLD.relationship_status THEN
    INSERT INTO relationship_changes (entity_type, entity_id, from_stage, to_stage, changed_by)
    VALUES (TG_ARGV[0], NEW.id, OLD.relationship_status::text, NEW.relationship_status::text, auth.uid());
  END IF;
  RETURN NEW;
END $f$;

DROP TRIGGER IF EXISTS trg_influencers_relchg ON influencers;
CREATE TRIGGER trg_influencers_relchg AFTER UPDATE OF relationship_status ON influencers
  FOR EACH ROW EXECUTE FUNCTION trg_log_relationship_change('influencer');
DROP TRIGGER IF EXISTS trg_brands_relchg ON brands;
CREATE TRIGGER trg_brands_relchg AFTER UPDATE OF relationship_status ON brands
  FOR EACH ROW EXECUTE FUNCTION trg_log_relationship_change('brand');

-- Embudo de las fichas creadas en los últimos p_days días:
--   cold → warm → strong → colaboración, cuántas llegan a cada paso y
--   cuántos días tardan en promedio. "Llegar a warm" cuenta también a
--   quien saltó directo a strong o a colaboración.
CREATE OR REPLACE FUNCTION stage_funnel(p_days INT DEFAULT 90)
RETURNS TABLE (entity_type TEXT, step TEXT, entered BIGINT, advanced BIGINT, pct NUMERIC, avg_days NUMERIC)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $f$
BEGIN
  IF NOT app_is_direction() THEN
    RAISE EXCEPTION 'Solo Dirección.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH ents AS (
    SELECT 'influencer'::text AS et, i.id, i.created_at FROM influencers i
     WHERE i.created_at >= now() - make_interval(days => p_days)
    UNION ALL
    SELECT 'brand', b.id, b.created_at FROM brands b
     WHERE b.created_at >= now() - make_interval(days => p_days)
  ),
  t AS (
    SELECT e.et, e.id, e.created_at AS t_cold,
      (SELECT min(rc.changed_at) FROM relationship_changes rc WHERE rc.entity_type = e.et AND rc.entity_id = e.id AND rc.to_stage = 'warm')   AS t_warm,
      (SELECT min(rc.changed_at) FROM relationship_changes rc WHERE rc.entity_type = e.et AND rc.entity_id = e.id AND rc.to_stage = 'strong') AS t_strong,
      (SELECT min(c.created_at) FROM collaborations c
        WHERE (e.et = 'influencer' AND c.influencer_id = e.id) OR (e.et = 'brand' AND c.brand_id = e.id))                          AS t_collab
    FROM ents e
  ),
  r AS (
    SELECT et, t_cold,
           least(t_warm, t_strong, t_collab) AS r_warm,
           least(t_strong, t_collab)         AS r_strong,
           t_collab                          AS r_collab
    FROM t
  ),
  steps AS (
    SELECT et, 'cold_warm'::text AS step, 1 AS ord, t_cold AS a, r_warm   AS b FROM r
    UNION ALL SELECT et, 'warm_strong',   2, r_warm,   r_strong FROM r WHERE r_warm IS NOT NULL
    UNION ALL SELECT et, 'strong_collab', 3, r_strong, r_collab FROM r WHERE r_strong IS NOT NULL
    UNION ALL SELECT et, 'cold_collab',   4, t_cold,   r_collab FROM r
  )
  SELECT s.et, s.step, count(*)::bigint, count(s.b)::bigint,
         CASE WHEN count(*) > 0 THEN round(100.0 * count(s.b) / count(*), 1) END,
         round((avg(extract(epoch FROM (s.b - s.a))) FILTER (WHERE s.b IS NOT NULL AND s.b >= s.a) / 86400)::numeric, 1)
  FROM steps s
  GROUP BY s.et, s.step, s.ord
  ORDER BY s.et DESC, s.ord;
END $f$;


-- ── Permisos ────────────────────────────────────────────────
REVOKE ALL ON FUNCTION check_duplicate_v2(text, text, text, text, text, uuid), stage_funnel(int)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION check_duplicate_v2(text, text, text, text, text, uuid), stage_funnel(int)
  TO authenticated;

COMMIT;

-- Verificación: tiene que dar 4 filas con ok = true.
SELECT 'checklist' AS k, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collaborations' AND column_name = 'checklist') AS ok
UNION ALL SELECT 'dial_code (países con código: ' || (SELECT count(*) FROM countries WHERE dial_code IS NOT NULL) || ')', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'dial_code')
UNION ALL SELECT 'relationship_changes', (SELECT relrowsecurity FROM pg_class WHERE relname = 'relationship_changes')
UNION ALL SELECT 'funciones', (SELECT count(*) = 3 FROM pg_proc WHERE proname IN ('norm_phone', 'check_duplicate_v2', 'stage_funnel'));

-- ROLLBACK (solo si hace falta):
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_influencers_norm_contact ON influencers;
-- DROP TRIGGER IF EXISTS trg_brands_norm_contact ON brands;
-- DROP TRIGGER IF EXISTS trg_influencers_relchg ON influencers;
-- DROP TRIGGER IF EXISTS trg_brands_relchg ON brands;
-- DROP FUNCTION IF EXISTS stage_funnel(int), trg_log_relationship_change(), check_duplicate_v2(text, text, text, text, text, uuid),
--   trg_norm_contact(), norm_phone(text, uuid);
-- DROP INDEX IF EXISTS idx_influencers_phone_key, idx_brands_phone_key;
-- DROP FUNCTION IF EXISTS phone_key(text);
-- DROP TABLE IF EXISTS relationship_changes;
-- ALTER TABLE collaborations DROP COLUMN IF EXISTS checklist;
-- ALTER TABLE countries DROP COLUMN IF EXISTS dial_code;
-- COMMIT;
