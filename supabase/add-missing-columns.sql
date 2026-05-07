-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN: Agregar columnas faltantes a tabla users
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Estas columnas ya están en schema.sql pero faltan en el DB
-- existente porque fue creado con una versión anterior.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_color       TEXT     DEFAULT '#8B5CF6';
ALTER TABLE users ADD COLUMN IF NOT EXISTS permiso_analytics  BOOLEAN  DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS permiso_equipo     BOOLEAN  DEFAULT FALSE;

-- Verificación: mostrar columnas actuales de la tabla users
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
