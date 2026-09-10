-- ═══════════════════════════════════════════════════════════
-- NETWORK · PROMPT 02 — Habilitar el rol 'scouter'
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- OBLIGATORIO antes de asignar el rol desde el AdminPanel.
-- La tabla `users` tiene un CHECK que solo admite los 5 roles originales;
-- sin este ALTER, guardar un usuario con rol 'scouter' falla con:
--   new row for relation "users" violates check constraint "users_rol_check"
-- ═══════════════════════════════════════════════════════════

-- 1. Reemplazar el CHECK de rol
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_rol_check;

ALTER TABLE users ADD CONSTRAINT users_rol_check
  CHECK (rol IN ('super_admin','admin','editor','viewer','custom','scouter'));

-- 2. Verificación — debe listar los 6 roles
SELECT conname, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'users'::regclass AND conname = 'users_rol_check';

-- ═══════════════════════════════════════════════════════════
-- ROLLBACK (si hace falta volver atrás)
-- Ojo: falla si ya existe algún usuario con rol 'scouter'.
-- Reasignarlos primero:  UPDATE users SET rol='viewer' WHERE rol='scouter';
-- ═══════════════════════════════════════════════════════════
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_rol_check;
-- ALTER TABLE users ADD CONSTRAINT users_rol_check
--   CHECK (rol IN ('super_admin','admin','editor','viewer','custom'));
