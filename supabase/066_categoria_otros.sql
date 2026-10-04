-- ═══════════════════════════════════════════════════════════
-- 066 · Categoría "Otros" en todo el sistema
--
--   · Invitación a la red (064): acepta el rubro 'otros'.
--   · Categorías de marca: se suma "Otros" al final de la lista.
--   (Las de influencers del CRM ya tenían "Otros"; las del Club y la
--   invitación se agregan en el código.)
--
-- Parte de la función real de la base (regla 3 de MIGRATIONS.md):
-- solo agrega 'otros' a la lista de rubros válidos.
-- Se puede correr dos veces sin efecto.
-- ═══════════════════════════════════════════════════════════

BEGIN;

DO $fix$
DECLARE def TEXT;
  a CONSTANT TEXT := $a$'musica','arte','tecnologia','deportes','maternidad','mascotas'];$a$;
  b CONSTANT TEXT := $b$'musica','arte','tecnologia','deportes','maternidad','mascotas','otros'];$b$;
BEGIN
  def := pg_get_functiondef('respond_influencer_invite(text,text,jsonb)'::regprocedure);
  IF position($c$'mascotas','otros']$c$ IN def) > 0 THEN RETURN; END IF;   -- ya aplicada
  IF position(a IN def) = 0 THEN
    RAISE EXCEPTION '066: respond_influencer_invite no es la de la 064; no se toca.';
  END IF;
  EXECUTE replace(def, a, b);
END $fix$;

INSERT INTO brand_categories (code, name, sort_order)
SELECT 'other', 'Otros', coalesce(max(sort_order), 0) + 1 FROM brand_categories
ON CONFLICT (code) DO NOTHING;

COMMIT;


-- ── Verificación: 2 filas con ok = true ─────────────────────
SELECT 'invitación acepta "otros"' AS k,
       position($c$'mascotas','otros']$c$ IN pg_get_functiondef('respond_influencer_invite(text,text,jsonb)'::regprocedure)) > 0 AS ok
UNION ALL
SELECT 'marcas tienen categoría Otros',
       EXISTS (SELECT 1 FROM brand_categories WHERE code = 'other' AND active);
