# Resilio — CRM, Network y Club

Un solo repo y un solo deploy (Vercel) con tres apps:

- **Network** (`/network/*`): CRM de scouters. Entra por `src/network/NetworkRoot.jsx`, sin cargar el CRM clásico.
- **CRM clásico** (`/`): `src/App.jsx` y `src/views/*`. También tiene el login.
- **Resilio Club** (`club.resilio.company`): app de influencers, `src/club/*`.

## Comandos

```
npm install        # una vez, o cuando cambie package.json
npm run dev        # CRM + Network en local
npm run dev:club   # Club en local
npm run lint       # revisión automática (errores = cosas que rompen)
npm test           # pruebas
npm run check      # lint + pruebas + build: correr antes de cada push
```

GitHub corre `lint`, `test` y `build` en cada push (`.github/workflows/ci.yml`).

## Estructura

- `src/lib/database.js` re-exporta la capa de datos, que vive en `src/lib/db/*.js` por tema.
- `src/lib/roles.js` es la única fuente de las listas de roles (alineadas con las funciones de la base).
- `supabase/` tiene las migraciones numeradas; ver `supabase/MIGRATIONS.md` para el estado y las reglas.

## Variables de entorno (`.env.local`, no se sube)

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
