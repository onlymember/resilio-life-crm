-- ═══════════════════════════════════════════════════════════
-- 065 · Invitación a la red: sin fecha de nacimiento
--
--   La página ya no pide la fecha de nacimiento. La influencer confirma
--   "Tengo 18 años o más y acepto…" en la misma casilla del
--   consentimiento, y eso queda guardado (adult_confirmed).
--   Si algún día se manda una fecha, se sigue validando igual.
--
-- Parte de la función real de la base (regla 3 de MIGRATIONS.md):
-- solo cambia dos bloques de respond_influencer_invite (064).
-- Se puede correr dos veces sin efecto.
-- ═══════════════════════════════════════════════════════════

BEGIN;

DO $fix$
DECLARE def TEXT; newd TEXT;
  a1 CONSTANT TEXT := $a$  IF v_birth IS NULL OR v_birth > current_date OR v_birth < current_date - INTERVAL '100 years' THEN
    RAISE EXCEPTION 'Fecha de nacimiento inválida.' USING HINT = 'bad_birthdate';
  END IF;
  v_age := date_part('year', age(current_date, v_birth))::int;$a$;
  b1 CONSTANT TEXT := $b$  -- 065: la fecha de nacimiento ya no se pide (alcanza con confirmar 18+ en la casilla).
  IF v_birth IS NOT NULL AND (v_birth > current_date OR v_birth < current_date - INTERVAL '100 years') THEN
    RAISE EXCEPTION 'Fecha de nacimiento inválida.' USING HINT = 'bad_birthdate';
  END IF;
  v_age := CASE WHEN v_birth IS NULL THEN NULL ELSE date_part('year', age(current_date, v_birth))::int END;$b$;
  a2 CONSTANT TEXT := $a$    'consent_at', now()));$a$;
  b2 CONSTANT TEXT := $b$    'consent_at', now(),
    'adult_confirmed', true));$b$;
BEGIN
  def := pg_get_functiondef('respond_influencer_invite(text,text,jsonb)'::regprocedure);
  IF position('-- 065:' IN def) > 0 THEN RETURN; END IF;           -- ya aplicada
  IF position(a1 IN def) = 0 OR position(a2 IN def) = 0 THEN
    RAISE EXCEPTION '065: respond_influencer_invite no es la de la 064; no se toca.';
  END IF;
  newd := replace(replace(def, a1, b1), a2, b2);
  EXECUTE newd;
END $fix$;

COMMIT;


-- ── Verificación: 1 fila con ok = true ──────────────────────
SELECT 'invitación sin fecha de nacimiento' AS k,
       position('-- 065:' IN pg_get_functiondef('respond_influencer_invite(text,text,jsonb)'::regprocedure)) > 0 AS ok;
