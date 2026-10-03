-- ═══════════════════════════════════════════════════════════
-- 061 · Instagram: un solo dato
--
-- Al cargar una influencer se pide el usuario de Instagram y se
-- guardaba en "username". La ficha mostraba otro campo, "instagram",
-- vacío, y lo volvía a pedir (y el botón de Instagram no aparecía).
-- Desde esta versión se guardan los dos iguales. Esto completa las
-- fichas que ya existen: copia el usuario al campo Instagram cuando
-- está vacío. No pisa ningún Instagram ya cargado.
-- Se puede correr dos veces sin efecto.
-- ═══════════════════════════════════════════════════════════

BEGIN;

UPDATE influencers i
   SET instagram = lower(regexp_replace(btrim(i.username), '^@+', ''))
 WHERE coalesce(btrim(i.instagram), '') = ''
   AND coalesce(btrim(i.username), '') <> ''
   -- por si hay una regla de "Instagram único": no duplicar uno existente
   AND NOT EXISTS (SELECT 1 FROM influencers o
                    WHERE o.id <> i.id
                      AND lower(o.instagram) = lower(regexp_replace(btrim(i.username), '^@+', '')));

COMMIT;

-- Verificación: fichas con usuario y sin Instagram (tiene que dar 0 o muy pocas;
-- si queda alguna es porque ese Instagram ya lo tiene otra ficha: posible duplicado).
SELECT count(*) AS sin_instagram
  FROM influencers
 WHERE coalesce(btrim(instagram), '') = '' AND coalesce(btrim(username), '') <> '';
