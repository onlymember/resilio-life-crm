-- ═══════════════════════════════════════════════════════════
-- 067 · Invitación sin tarea automática + guardado de fichas
--
--   1. Cuando una influencer toca "Me sumo" ya NO se crea la tarea
--      "X se sumó a la red". Queda la nota en la actividad y el estado
--      en la tarjeta "Invitación a la red" de la ficha.
--
--   2. Guardado de fichas: si quien edita no tenía permiso, la base
--      ignoraba el cambio sin avisar (la ficha decía "Guardado" pero al
--      volver a entrar estaba igual). Se suman permisos de edición:
--        · quien cargó la ficha (created_by) la puede editar;
--        · Dirección y Admin (app_can_manage_offers) editan cualquiera.
--      Marcas, influencers y colaboraciones. Las reglas que ya había
--      no se tocan: estas se suman a ellas.
--      (Desde la v34 la app además avisa si un cambio no se guardó.)
--
-- Parte de la función real de la base (regla 3 de MIGRATIONS.md).
-- Se puede correr dos veces sin efecto.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── 1 · Sin tarea al sumarse ────────────────────────────────
DO $fix$
DECLARE def TEXT;
  a CONSTANT TEXT := $a$  IF first_join AND v_owner IS NOT NULL THEN$a$;
  b CONSTANT TEXT := $b$  IF false AND first_join AND v_owner IS NOT NULL THEN  -- 067: sin tarea automática$b$;
BEGIN
  def := pg_get_functiondef('respond_influencer_invite(text,text,jsonb)'::regprocedure);
  IF position('-- 067:' IN def) > 0 THEN RETURN; END IF;           -- ya aplicada
  IF position(a IN def) = 0 THEN
    RAISE EXCEPTION '067: respond_influencer_invite no es la de la 064; no se toca.';
  END IF;
  EXECUTE replace(def, a, b);
END $fix$;


-- ── 2 · Permisos de edición que se suman ────────────────────
DROP POLICY IF EXISTS br_update_extra ON brands;
CREATE POLICY br_update_extra ON brands FOR UPDATE TO authenticated
  USING ((SELECT app_is_team_member())
         AND ((SELECT app_can_manage_offers()) OR created_by = (SELECT auth.uid())))
  WITH CHECK ((SELECT app_is_team_member())
         AND ((SELECT app_can_manage_offers()) OR created_by = (SELECT auth.uid())));

DROP POLICY IF EXISTS inf_update_extra ON influencers;
CREATE POLICY inf_update_extra ON influencers FOR UPDATE TO authenticated
  USING ((SELECT app_is_team_member())
         AND ((SELECT app_can_manage_offers()) OR created_by = (SELECT auth.uid())))
  WITH CHECK ((SELECT app_is_team_member())
         AND ((SELECT app_can_manage_offers()) OR created_by = (SELECT auth.uid())));

DROP POLICY IF EXISTS col_update_extra ON collaborations;
CREATE POLICY col_update_extra ON collaborations FOR UPDATE TO authenticated
  USING ((SELECT app_is_team_member())
         AND ((SELECT app_can_manage_offers()) OR created_by = (SELECT auth.uid())))
  WITH CHECK ((SELECT app_is_team_member())
         AND ((SELECT app_can_manage_offers()) OR created_by = (SELECT auth.uid())));

COMMIT;


-- ── Verificación: 4 filas con ok = true ─────────────────────
SELECT 'invitación sin tarea automática' AS k,
       position('-- 067:' IN pg_get_functiondef('respond_influencer_invite(text,text,jsonb)'::regprocedure)) > 0 AS ok
UNION ALL
SELECT 'marcas: editar quien la cargó y Dirección/Admin',
       EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brands' AND policyname = 'br_update_extra')
UNION ALL
SELECT 'influencers: ídem',
       EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'influencers' AND policyname = 'inf_update_extra')
UNION ALL
SELECT 'colaboraciones: ídem',
       EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'collaborations' AND policyname = 'col_update_extra');
