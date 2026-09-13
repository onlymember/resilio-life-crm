# PROMPT 2C — SCOUTER HOME Y TAREAS

**Antes de ejecutar:** correr `supabase/022_scouter_home.sql` en el SQL Editor
("Run without RLS"). Tiene que listar las 5 funciones al final.

Pegar a Claude Code: primero las 13 reglas globales de la Fase 2, después
todo el bloque de abajo.

---

```
PROMPT 2C — SCOUTER HOME Y TAREAS

## CONTEXT

2B cerrado: Network tiene shell, navegación mobile y desktop, routing con
deep links, guards por rol, i18n con t(), y la capa de datos pagina y
filtra en la base. Los 11 componentes de src/network/components/ existen
y funcionan: NetworkCard, EntityHeader, ContextRail, NextAction,
ActivityTimeline, FilterSheet, CreateSheet, EmptyState,
RelationshipBadge, ComingSoon.

La migración 022_scouter_home.sql agregó cinco funciones, todas
SECURITY INVOKER (cada usuario recibe lo suyo, RLS adentro):

  my_agenda(days_ahead)   → tareas + próximas acciones de influencers,
                            marcas y oportunidades, unificadas y
                            ordenadas: vencidas primero, después hoy
  my_network_stats()      → contadores del bloque MI NETWORK
  my_missions()           → misiones activas con mi progreso calculado
  complete_next_action()  → limpia la acción Y registra la actividad,
                            en una sola operación
  set_next_action()       → agenda una próxima acción

Hoy /network/home es un shell vacío con EmptyState.

## OBJECTIVE

La pantalla que responde una sola pregunta: "¿qué tengo que hacer hoy?".
Un Scouter abre el teléfono, ve qué le toca, lo hace, y lo registra.
Más la pantalla de Tareas completa.

Se diseña en 390px PRIMERO y después se expande a desktop. Al revés no
funciona: un CRM de escritorio comprimido es exactamente lo que hay que
evitar.

## FILES TO INSPECT

src/network/pages/HomePage.jsx
src/network/pages/TasksPage.jsx
src/network/components/         (los 11 — se USAN, no se reescriben)
src/network/MobileLayout.jsx
src/network/NetworkLayout.jsx
src/lib/metrics.js
src/lib/database.js             (dbGetTasks, dbSaveTask, dbCompleteTask)
src/i18n/es.json
supabase/022_scouter_home.sql

## FILES TO MODIFY

src/network/pages/HomePage.jsx
src/network/pages/TasksPage.jsx
src/lib/metrics.js              → wrappers de las 5 funciones nuevas
src/lib/database.js             → dbCompleteNextAction, dbSetNextAction
src/i18n/es.json + en.json      → claves nuevas

## FILES TO CREATE

src/network/components/AgendaItem.jsx      fila de agenda, mobile-first
src/network/components/StatTile.jsx        contador de MI NETWORK
src/network/components/MissionProgress.jsx barra de progreso
src/network/components/QuickActions.jsx    WhatsApp · IG · llamar · nota
src/network/components/TaskRow.jsx         fila de tarea con check grande
src/network/components/DateTimePicker.jsx  agendar próxima acción

## LA PANTALLA

Orden exacto, de arriba abajo, en mobile:

  1 · SALUDO
      "Buenos días, Luca" — según la hora en el timezone de SU ciudad,
      no del servidor ni del navegador.

  2 · HOY
      4 tareas · 3 seguimientos · 2 oportunidades
      Números de my_network_stats(). Tocables: llevan a la lista filtrada.

  3 · NECESITA ATENCIÓN
      Lo más importante de la pantalla. De my_agenda(), vencidos primero.
      Cada fila (AgendaItem):
        título de la acción · nombre de la entidad · cuándo
        [Completar]  [Reagendar]  [quick actions]
      "Completar" llama a complete_next_action() — una sola operación.
      Máximo 5 visibles, con "Ver todas".

  4 · MI NETWORK
      128 influencers · 24 marcas · 7 oportunidades · 3 colaboraciones
      Cada tile lleva a su listado filtrado por dueño = yo.

  5 · MISIONES
      De my_missions(). Barra de progreso, 12/20, puntos.
      Si no hay misiones activas, la sección NO se muestra.
      Nada de "no tenés misiones": ocupar espacio con vacío es ruido.

Desktop: las mismas secciones en dos columnas, con el Context Rail
mostrando el detalle del ítem de agenda seleccionado. NO es la versión
mobile estirada.

## PANTALLA DE TAREAS

  Agrupadas: Vencidas · Hoy · Esta semana · Después
  Filtros: tipo, prioridad, estado
  Crear tarea desde el ＋
  Completar con un toque (TaskRow con checkbox de 44px mínimo)
  En mobile, swipe para completar además del checkbox

`is_overdue` se lee de tasks_view, NO se calcula en el cliente ni se
guarda como estado.

## QUICK ACTIONS

Por cada entidad de la agenda, según lo que tenga cargado:
  WhatsApp   https://wa.me/<numero sin + ni espacios>
  Instagram  instagram://user?username=<user>  con fallback a
             https://instagram.com/<user>
  Llamar     tel:<numero>
  Nota       registra una activity de tipo 'note'

Si el influencer no tiene whatsapp cargado, el botón NO aparece.
Un botón que no puede hacer nada es peor que ningún botón.

## UX — REGLAS DURAS

Permitido: bottom sheets, CTAs sticky, controles de 44px mínimo,
búsqueda instantánea, formularios cortos, autosave.

Prohibido: tablas horizontales, controles chicos, interacciones que
dependan de hover, formularios interminables, layouts de escritorio
comprimidos, y gráficos decorativos.

Preservar las CSS vars de GlobalStyles. Signal over decoration.

## SECURITY

Todo pasa por las funciones SECURITY INVOKER: un Scouter ve lo suyo, un
lead ve su territorio, con la misma pantalla. NO filtres por owner en el
cliente — ya lo hace RLS, y duplicarlo esconde bugs.

complete_next_action y set_next_action fallan con excepción si el usuario
no tiene permiso. Traducir ese error a lenguaje humano, no mostrar el
crudo de Postgres.

## EDGE CASES

- Scouter sin nada: EmptyState que PROPONE una acción
  ("Cargá tu primer influencer"), nunca un vacío mudo.
- Scouter nuevo: onboarding mínimo que apunta al Manual y a los 3
  niveles del sistema.
- Las fechas se muestran en el timezone de la ciudad del Scouter
  (scouters.city_id → cities.timezone, con fallback al del país).
  Una tarea que vence a las 23:00 en Miami no está vencida a las 21:00
  en Rosario.
- Agenda con 40 ítems vencidos: mostrar 5 y "ver todas", no una lista
  infinita que abruma.
- Completar dos veces la misma acción (doble tap): la segunda tiene que
  fallar silenciosamente o estar deshabilitada, no duplicar la actividad.
- Sin conexión: no perder un formulario a medio llenar.
- Un lead abre /network/home: ve su propia agenda, no la de sus Scouters.
  Eso es correcto y no hay que "arreglarlo".

## TESTS

 1. Login con el Scouter → /network/home muestra el saludo con su nombre.
 2. Crear un influencer, agendarle una acción para hoy → aparece en
    NECESITA ATENCIÓN.
 3. Agendar una para ayer → aparece arriba de la de hoy, marcada vencida.
 4. Tocar "Completar" → desaparece de la agenda Y aparece una fila en
    activities. Verificar las dos cosas.
 5. Los contadores de MI NETWORK coinciden con
    SELECT count(*) FROM influencers WHERE owner_scouter_id = <scouter>.
 6. Crear una tarea, completarla desde la lista: máximo 3 toques.
 7. En 390px: sin scroll horizontal en Home ni en Tareas.
 8. Un influencer sin whatsapp no muestra el botón de WhatsApp.
 9. Con el super admin: /network/home muestra SU agenda, no la del
    Scouter.
10. Ningún string visible hardcodeado: correr el grep del TEST 8 de 2B.

## ACCEPTANCE CRITERIA

1. Un Scouter abre el teléfono y sabe qué hacer sin preguntarle a nadie.
2. Completar un seguimiento es un toque y queda registrado en activities.
3. Los números salen de las funciones SQL, no de contar arrays en el
   cliente.
4. Cero scroll horizontal en 390px.
5. Las fechas respetan el timezone de la ciudad del Scouter.
6. Ningún estado vacío sin acción propuesta.
7. Todo el texto sale de t().
8. Cero regresión fuera de Network.

## DO NOT

- No construyas el Command Center (2D) ni los CRM de detalle (2E).
- No reescribas los 11 componentes de 2B: usalos.
- No agregues dependencias.
- No calcules is_overdue en el cliente.
- No filtres por owner en el cliente.
- No pongas gráficos decorativos: el Home responde qué hacer, no muestra
  estadísticas.

## ANTES DE ESCRIBIR CÓDIGO

Leé FILES TO INSPECT, verificá que el CONTEXT coincida con el repo, y
presentame el plan con los archivos que vas a tocar. Si encontrás una
contradicción entre este prompt y el código, reportala en vez de asumir.
```

---

## Los dos tests que deciden si la pantalla sirve

**Test 4 — completar con un toque.** Si registrar un seguimiento cuesta tres
pantallas, nadie lo va a hacer, y sin registro el timeline y las métricas
quedan vacíos.

**Test 5 — el timezone.** Si un Scouter de Miami ve tareas marcadas como
vencidas que todavía no vencieron, deja de creerle a la pantalla. La ciudad
ya tiene su `timezone` cargado desde el seed: hay que usarlo.
