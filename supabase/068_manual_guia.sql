-- ═══════════════════════════════════════════════════════════
-- 068 · Manual: pestaña "Cómo usar Network" (guía para scouters)
--
--   Carga 8 temas nuevos en manual_categories (códigos 'guia_…') y
--   30 guías cortas en manual_sections, escritas como preguntas
--   ("¿Cómo cargo una influencer?"). La app las muestra en una pestaña
--   aparte dentro de Manual, con buscador y "Primeros pasos".
--
--   Dentro del texto de cada guía hay dos líneas especiales que la app
--   no muestra tal cual:
--     @ir <acción> | <texto del botón>   → botón "Llevame ahí"
--         acciones: crear:influencer | crear:brand | crear:task |
--                   crear:collaboration | buscar | arrancar | instalar |
--                   o una ruta que empiece con /network/
--     @claves palabra, palabra, …         → palabras extra para el buscador
--
--   Dirección las puede editar desde la app (mismo permiso que el
--   resto del manual). Si esta migración se corre de nuevo, NO pisa
--   lo que Dirección haya editado (ON CONFLICT DO NOTHING).
--
--   Solo agrega filas. No cambia tablas, funciones ni permisos.
-- ═══════════════════════════════════════════════════════════

BEGIN;

INSERT INTO manual_categories (code, name, sort_order, active) VALUES
  ('guia_influencers',    'Influencers',          901, true),
  ('guia_contacto',       'Contacto',             902, true),
  ('guia_invitacion',     'Invitación a la red',  903, true),
  ('guia_marcas',         'Marcas',               904, true),
  ('guia_dia',            'Mi día',               905, true),
  ('guia_colaboraciones', 'Colaboraciones',       906, true),
  ('guia_general',        'General',              907, true),
  ('guia_extras',         'Calendario, notas y misiones', 908, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO manual_sections (category, slug, title, subtitle, body, sort_order, min_level, active, direction_only) VALUES

-- ── Influencers ─────────────────────────────────────────────
('guia_influencers', 'guia-cargar-influencer', '¿Cómo cargo una influencer?', 'El alta en menos de un minuto.',
$b$1. Tocá **+ Influencer** en el Inicio, el **+** arriba de la lista de Influencers o, en el celular, el **logo de Resilio** del centro de la barra de abajo → **Influencer**.
2. Completá **Usuario (sin @)** o **Nombre** (con uno alcanza).
3. Si lo tenés, sumá **WhatsApp**, **Ciudad** y **Categoría**: son los datos que más se usan después.
4. Tocá **Guardar**. La ficha queda a tu nombre.

> El WhatsApp se acomoda solo al formato internacional según la ciudad.

@ir crear:influencer | Cargar una influencer
@claves alta, nueva, agregar, sumar, crear, influ, creadora, creador, perfil$b$, 10, 1, true, false),

('guia_influencers', 'guia-agregar-instagram', '¿Cómo la cargo pegando su Instagram?', 'Desde el Inicio, copiando el link del perfil.',
$b$1. En Instagram, abrí el perfil y copiá el link (o el @usuario).
2. En el **Inicio**, pegalo en **Agregar por Instagram** y tocá **Agregar**.
3. Se abre el alta con el usuario ya escrito: completá lo que falte y **Guardar**.

Si dice *"No reconozco ese usuario"*, pegá el link completo del perfil o escribí @usuario.

@ir /network/home | Ir al Inicio
@claves link, url, pegar, copiar, ig, insta, arroba, usuario$b$, 20, 1, true, false),

('guia_influencers', 'guia-duplicados', '¿Qué hago si me dice que ya existe?', 'El aviso amarillo de duplicado.',
$b$Mientras escribís el Instagram, el mail o el WhatsApp, Network revisa si esa persona ya está cargada.

- **"Ya existe: Nombre (Ciudad)"**: tocá **Abrir** y seguí desde esa ficha. No la cargues de nuevo.
- **"Es tuya"**: ya la tenías vos.
- **"Ya hay una ficha con este dato en…"**: la tiene otra persona del equipo. Avisale a tu líder antes de contactarla.

> Dos fichas de la misma persona hacen que se le escriba dos veces. Si ya pasó, Dirección las puede fusionar.

@claves duplicado, repetida, repetido, existe, ya está, doble, fusionar$b$, 30, 1, true, false),

('guia_influencers', 'guia-editar-ficha', '¿Cómo completo o corrijo una ficha?', 'Se guarda sola mientras escribís.',
$b$1. Abrí la influencer desde la lista (o buscala con la lupa).
2. Tocá el dato que quieras cambiar y escribí.
3. Arriba vas a ver **Guardando…** y después **Guardado**. No hay botón de guardar.

Si aparece **No se guardó · reintentar**, tocalo. Si sigue sin guardar, puede que la ficha no sea tuya: pedile a Dirección que la revise.

@ir /network/influencers | Ir a Influencers
@claves editar, cambiar, corregir, modificar, guardar, guardado, autoguardado, datos, ficha$b$, 40, 1, true, false),

('guia_influencers', 'guia-etapas', '¿Cómo cambio la etapa (Cold, Warm, Strong)?', 'Qué significa cada una y cómo moverla.',
$b$| Etapa | Qué significa |
|---|---|
| Cold | Todavía no hay conversación. |
| Warm | Ya respondió, hay charla. |
| Strong | Relación armada, colabora con Resilio. |
| Inactivo | No le interesa o dejó de responder. |

- **En la ficha**: tocá la etapa en la sección **Relación**.
- **En la lista (celular)**: deslizá la tarjeta a la derecha para subirla o a la izquierda para bajarla. Si te equivocás, tocá **Deshacer**.
- **Kanban**: con el botón de vista al lado de Filtros, las ves en columnas por etapa.

@ir /network/influencers | Ir a Influencers
@claves etapa, estado, cold, warm, strong, inactivo, inactiva, deslizar, swipe, kanban, columnas, relación$b$, 50, 1, true, false),

('guia_influencers', 'guia-completar-faltantes', '¿Cómo encuentro a las que les falta WhatsApp o categoría?', 'Completar datos sin entrar ficha por ficha.',
$b$1. En **Influencers**, tocá el filtro **Sin WhatsApp** (o **Sin categoría**).
2. Cada tarjeta muestra un campo para completar ahí mismo.
3. Escribí el WhatsApp con código de país (o elegí la categoría) y tocá **Guardar**. La tarjeta sale de la lista.

@ir /network/influencers | Ir a Influencers
@claves falta, faltan, incompleta, incompletas, completar, sin whatsapp, sin categoría, telefono, número$b$, 60, 1, true, false),

('guia_influencers', 'guia-filtros', '¿Cómo filtro y ordeno mi lista?', 'Encontrar rápido a quién escribirle.',
$b$- Los filtros de arriba (**Activos**, **Seguimiento hoy**, **Vencidos**, **Sin próxima acción**…) se tocan y listo.
- **Filtros** abre más opciones: Relación, Tier, Categoría y Ciudad. Después, **Aplicar**.
- **Ordenar por** cambia el orden: Recientes, Seguidores, Engagement o Último contacto.

Cuando entrás a una ficha y volvés, la lista queda con el mismo filtro y en el mismo lugar.

@ir /network/influencers | Ir a Influencers
@claves filtrar, filtro, ordenar, orden, buscar en la lista, tier, ciudad, categoría, seguidores$b$, 70, 1, true, false),

-- ── Contacto ────────────────────────────────────────────────
('guia_contacto', 'guia-contactar', '¿Cómo le escribo desde la ficha?', 'WhatsApp, Instagram o llamada, y queda anotado.',
$b$1. Abrí la ficha de la influencer (o de la marca).
2. Debajo del nombre tenés **WhatsApp**, **Instagram** y **Llamar**.
3. Tocá el que quieras: se abre la app y Network anota el contacto.

Esos contactos son los que suman a **Tu número del día** en el Inicio.

@ir /network/influencers | Ir a Influencers
@claves escribir, mensaje, whatsapp, wsp, wpp, whats, dm, instagram, llamar, llamada, contactar, contacto$b$, 10, 1, true, false),

('guia_contacto', 'guia-mensajes', '¿Cómo uso los mensajes ya armados?', 'Plantillas con su nombre ya puesto.',
$b$1. En la ficha, tocá **Mensajes** (arriba, al lado del nombre).
2. Aparecen los mensajes que corresponden a esa persona y a su etapa, con su nombre y su ciudad ya puestos.
3. Tocá **Abrir WhatsApp** para mandarlo, o **Copiar** para pegarlo donde quieras.

Si no aparece ninguno, es que todavía no hay mensajes para ese momento. Los carga Dirección.

@ir /network/influencers | Ir a Influencers
@claves plantilla, plantillas, mensaje armado, texto, copiar, template$b$, 20, 1, true, false),

('guia_contacto', 'guia-tanda', '¿Cómo les escribo a varias seguidas?', 'Mensajes en tanda, una por una.',
$b$1. En **Influencers** (o **Marcas**), tocá el ícono verde de mensajes de arriba.
2. Elegí a quiénes (o **Todas**) y tocá **Empezar**.
3. Elegí un mensaje o escribí uno propio.
4. Se abre WhatsApp con la primera. Mandalo, volvé y tocá **Enviar y seguir** (o **Saltar**).

Las que no tienen WhatsApp quedan afuera. Cada envío queda anotado como contacto.

@ir /network/influencers | Ir a Influencers
@claves tanda, varias, masivo, muchas, lote, grupo, batch, todas, seguidas$b$, 30, 1, true, false),

('guia_contacto', 'guia-respuesta-rapida', '¿Cómo anoto rápido lo que me respondió?', 'Tres botones y Network agenda el próximo paso.',
$b$Debajo de cada tarjeta de la lista y en la sección **Relación** de la ficha están:

- **Respondió**: pasa de Cold a Warm y te lo vuelve a mostrar en unos días.
- **Pidió info**: igual, y deja la nota "Pidió más información".
- **No le interesa**: la pasa a Inactivo y no te la vuelve a recordar.

No hace falta escribir la fecha del próximo contacto: Network la pone sola a las 10 de la mañana.

@ir /network/influencers | Ir a Influencers
@claves respondió, contestó, respuesta, pidió info, no le interesa, anotar, registrar, seguimiento$b$, 40, 1, true, false),

-- ── Invitación a la red ─────────────────────────────────────
('guia_invitacion', 'guia-que-es-invitacion', '¿Qué es la invitación a la red?', 'Un link personal para que se sume.',
$b$Es un link con su nombre que le presenta Resilio: qué gana, cómo funciona y qué necesitamos de ella. Al final toca **Me sumo**.

- No crea cuenta ni contraseña: el Club sigue cerrado.
- Lo que ella completa (ciudad, rubros, WhatsApp) se suma a su ficha solo si estaba vacío.
- Si algo no coincide con lo que tenías, la ficha te lo muestra para que elijas.

@claves invitación, invitar, link, sumarse, me sumo, red de creadores, club$b$, 10, 1, true, false),

('guia_invitacion', 'guia-mandar-invitacion', '¿Cómo le mando la invitación?', 'Desde la ficha, por WhatsApp.',
$b$1. Abrí la ficha y bajá hasta **Invitación a la red**.
2. Elegí el idioma (ES, EN o PT) y tocá **Crear invitación**.
3. Tocá **Enviar por WhatsApp**: se abre con el mensaje y el link listos.

Si ya tenía una invitación abierta, se usa la misma. El link dura 30 días; si vence, **Dar 30 días más**.

@ir /network/influencers | Ir a Influencers
@claves invitar, invitación, mandar link, enviar link, crear invitación, idioma$b$, 20, 1, true, false),

('guia_invitacion', 'guia-invitar-varias', '¿Cómo invito a varias de una vez?', 'Invitaciones en tanda.',
$b$1. En **Influencers**, tocá el ícono verde de mensajes y elegí a quiénes.
2. Tocá **Invitar a la red**.
3. Se abre WhatsApp una por una con su nombre y su link. Mandalo y tocá **Enviar invitación y seguir**.

Al final te dice cuántas mandaste. Si alguna ya tenía invitación vigente, se usa la misma.

@ir /network/influencers | Ir a Influencers
@claves varias, tanda, masivo, muchas, invitar varias, lote$b$, 30, 1, true, false),

('guia_invitacion', 'guia-estados-invitacion', '¿Qué significa cada estado de la invitación?', 'Lo que ves en la ficha.',
$b$| Estado | Qué pasó |
|---|---|
| Enviada | Se creó el link; todavía no lo abrió. |
| La abrió | Entró al link (te dice cuántas veces). |
| Se sumó | Tocó "Me sumo". Escribile para avanzar. |
| Respondió "Ahora no" | No quiere por ahora. Respetalo. |
| Indicó ser menor de 18 | No le propongas colaboraciones sin revisar con Dirección. |
| Vencida | Pasaron 30 días. Podés darle 30 días más. |
| Cerrada | Alguien cerró el link. |

En **Lo que contó** ves lo que completó ella.

@claves estado, estados, abrió, se sumó, vencida, cerrada, menor, ahora no$b$, 40, 1, true, false),

-- ── Marcas ──────────────────────────────────────────────────
('guia_marcas', 'guia-cargar-marca', '¿Cómo cargo una marca?', 'Locales, restaurantes, tiendas…',
$b$1. Tocá **+ Marca** en el Inicio o el **+** arriba de la lista de Marcas.
2. Solo el **Nombre** es obligatorio. Si podés, sumá categoría, ciudad y WhatsApp.
3. **Guardar**. Después completás el resto en la ficha: se guarda sola.

@ir crear:brand | Cargar una marca
@claves marca, local, restaurante, bar, tienda, negocio, cliente, empresa, alta, nueva$b$, 10, 1, true, false),

('guia_marcas', 'guia-propuesta-marca', '¿Cómo le mando la propuesta a una marca?', 'Un link privado, sin precios.',
$b$1. Abrí la ficha de la marca y bajá hasta **Propuesta**.
2. Elegí el idioma y tocá **Crear link de propuesta**.
3. Tocá **Mandar por WhatsApp** (o **Copiar**).

La marca elige un plan y responde 5 preguntas. En la ficha vas a ver si la abrió y qué eligió. Cuando elige, te aparece la tarea de mandarle los valores.

@ir /network/brands | Ir a Marcas
@claves propuesta, link, plan, presupuesto, precios, valores, ofrecer$b$, 20, 1, true, false),

-- ── Mi día ──────────────────────────────────────────────────
('guia_dia', 'guia-arrancar-dia', '¿Cómo arranco el día?', 'Todo lo pendiente, de a uno.',
$b$1. En el **Inicio**, tocá **Arrancar el día**. Aparece cuando tenés cosas vencidas o para hoy.
2. Te muestra un pendiente por vez. Para cada uno: **Completar**, **Mañana** o **Saltar**. **Abrir ficha** si necesitás ver más.
3. Al terminar dice **Día arrancado**.

Es la forma más rápida de no dejar nada colgado.

@ir arrancar | Arrancar el día
@claves arrancar, empezar, día, foco, pendientes, hoy, rutina, mañana$b$, 10, 1, true, false),

('guia_dia', 'guia-inicio', '¿Qué me muestra el Inicio?', 'Tu centro de operaciones.',
$b$- **Tu próximo paso**: lo más urgente, arriba de todo.
- **Agenda**: Vencido, Hoy y Próximos días. Deslizá a la derecha para completar o a la izquierda para pasarlo a mañana.
- **Tu número del día**: cuántos contactos llevás hoy contra tu meta (la cambiás con **Cambiar meta**) y tu racha.
- **Misión activa** y **Esta semana**: cómo vas.

@ir /network/home | Ir al Inicio
@claves inicio, home, agenda, próximo paso, meta, racha, número del día, resumen$b$, 20, 1, true, false),

('guia_dia', 'guia-crear-tarea', '¿Cómo creo una tarea?', 'Escribila como la dirías.',
$b$1. Tocá **+ Tarea** en el Inicio (o el logo de la barra de abajo → **Tarea**).
2. Escribí, por ejemplo: *"llamar a Sofi el jueves 11hs"*.
3. Network entiende el día y la hora, y si nombrás a alguien te sugiere su ficha.
4. **Crear tarea**.

Entiende: hoy, mañana, pasado mañana, "en 3 días", días de la semana, 15/10, 11hs, 11:30, 6pm.

@ir crear:task | Crear una tarea
@claves tarea, recordatorio, pendiente, agendar, recordar, to do, hacer$b$, 30, 1, true, false),

('guia_dia', 'guia-seguimientos', '¿Dónde veo todos mis seguimientos?', 'La lista completa de a quién volver a escribir.',
$b$1. Entrá a **Seguimiento** (en el menú).
2. Están agrupados: Vencidos, Hoy, Esta semana y Más adelante. Arriba filtrás por Influencers, Marcas, Oportunidades o Colaboraciones.
3. Al completar uno, contá **¿Qué pasó?**: Respondió, No respondió, No le interesa o Listo. Network agenda el próximo.

@ir /network/follow-ups | Ir a Seguimiento
@claves seguimiento, seguimientos, follow up, volver a escribir, vencidos, recordatorios$b$, 40, 1, true, false),

-- ── Colaboraciones ──────────────────────────────────────────
('guia_colaboraciones', 'guia-crear-colaboracion', '¿Cómo creo una colaboración?', 'Influencer + marca + fecha.',
$b$1. Tocá el logo de la barra de abajo → **Colaboración** (o **+ Nueva colaboración** en Colaboraciones).
2. Elegí la **Influencer** (obligatoria), la **Marca**, el tipo y la fecha si ya la sabés.
3. **Guardar**. Arranca como **Propuesta**.

Después la movés: Confirmada → En curso → Contenido pendiente → Completada.

@ir crear:collaboration | Crear una colaboración
@claves colaboración, colab, canje, activación, visita, crear, nueva$b$, 10, 1, true, false),

('guia_colaboraciones', 'guia-confirmacion-link', '¿Cómo le pido a la influencer que confirme?', 'Un link para que diga si va.',
$b$1. Abrí la colaboración y poné la **fecha** (es obligatoria para esto).
2. Tocá **Pedir confirmación por link** → **Mandar por WhatsApp**.
3. Ella responde desde el link: **Confirmó que va**, **Propuso otra fecha** o **Avisó que no puede ir**.

Si propone otra fecha, con **Aceptar esa fecha** se cambia y queda confirmada.

@ir /network/collaborations | Ir a Colaboraciones
@claves confirmar, confirmación, asistencia, va, fecha, link, cambio de fecha$b$, 20, 1, true, false),

('guia_colaboraciones', 'guia-checklist-duplicar', '¿Cómo uso el checklist y Duplicar?', 'Que no se escape ningún paso.',
$b$**Checklist**: en cada colaboración marcá Confirmada, Visita hecha, Contenido subido, Link recibido y Marca avisada a medida que pasan.

**Duplicar**: arriba de la colaboración. Copia la misma marca, tipo, entregables y monto; solo elegís otra influencer y la fecha → **Crear copia**.

@ir /network/collaborations | Ir a Colaboraciones
@claves checklist, lista, pasos, duplicar, copiar, repetir, otra influencer$b$, 30, 1, true, false),

-- ── General ─────────────────────────────────────────────────
('guia_general', 'guia-buscar', '¿Cómo busco cualquier cosa?', 'Una sola búsqueda para todo.',
$b$- En el celular, tocá la **lupa** de arriba. En la computadora, el cuadro **Buscar…** o **Ctrl K**.
- Escribí un nombre, un @usuario, una marca o una ciudad.
- Si elegís una ciudad, te lleva a sus influencers.

@ir buscar | Abrir la búsqueda
@claves buscar, búsqueda, lupa, encontrar, ctrl k, dónde está$b$, 10, 1, true, false),

('guia_general', 'guia-avisos', '¿Qué son los avisos de la campanita?', 'Lo que se venció y lo nuevo para vos.',
$b$La **campanita** (abajo en el celular, arriba en la computadora) junta:

- **Vencido**: algo tuyo que se pasó de fecha.
- **Nuevo**: algo que te asignaron.

Tocá un aviso para ir directo. Si no hay nada: *"Sin novedades recientes."*

@claves campanita, notificaciones, avisos, alertas, novedades, campana$b$, 20, 1, true, false),

('guia_general', 'guia-instalar-app', '¿Cómo instalo Network en el celular?', 'Como una app, con su ícono.',
$b$**Android (Chrome)**
1. Abrí Network en Chrome.
2. Menú **⋮** → **Instalar app** (o **Agregar a la pantalla principal**).

**iPhone (Safari)**
1. Abrí Network en Safari.
2. Botón **Compartir** → **Agregar a inicio**.

Queda el ícono de Resilio y se abre a pantalla completa, directo en el Inicio.

@ir instalar | Instalar ahora
@claves instalar, app, aplicación, ícono, pantalla de inicio, celular, iphone, android, acceso directo$b$, 30, 1, true, false),

-- ── Calendario, notas y misiones ────────────────────────────
('guia_extras', 'guia-calendario', '¿Cómo uso el calendario?', 'Tu agenda del mes.',
$b$- **Mi agenda**: tus tareas y seguimientos por día. Tocá un día para ver el detalle.
- **Colaboraciones**: las colaboraciones de una ciudad. Marca los días libres y los **choques de fecha** (dos en el mismo día).
- **Hoy** te vuelve al día de hoy.

@ir /network/calendar | Ir al Calendario
@claves calendario, agenda, mes, fechas, choque, días libres$b$, 10, 1, true, false),

('guia_extras', 'guia-notas', '¿Para qué sirven las Notas?', 'Tu cuaderno personal.',
$b$- **Mi cuaderno**: notas solo tuyas. **+ Nota** para escribir, **Fijar** para dejarla arriba.
- **Notas de Network**: las notas que se escribieron en fichas de influencers, marcas, oportunidades y colaboraciones, todas juntas.

@ir /network/notes | Ir a Notas
@claves notas, nota, cuaderno, apuntes, ideas, anotar$b$, 20, 1, true, false),

('guia_extras', 'guia-misiones', '¿Cómo funcionan las misiones y los puntos?', 'Objetivos que suman premios.',
$b$1. En **Misiones** ves los objetivos activos (por ejemplo, "5 influencers este mes") y cuánto llevás.
2. El avance se cuenta solo con lo que cargás y contactás.
3. Cuando completás una, los puntos se suman al abrir Misiones o Premios.
4. En **Premios** ves tus puntos acumulados y el historial.

@ir /network/missions | Ir a Misiones
@claves misiones, misión, puntos, premios, recompensas, objetivos, metas$b$, 30, 1, true, false)

ON CONFLICT (slug) DO NOTHING;

COMMIT;


-- ── Verificación: 2 filas con ok = true ─────────────────────
SELECT 'temas de la guía (8)' AS k,
       (SELECT count(*) FROM manual_categories WHERE code LIKE 'guia\_%') = 8 AS ok
UNION ALL
SELECT 'guías cargadas (30)',
       (SELECT count(*) FROM manual_sections WHERE category LIKE 'guia\_%' AND active) = 30;
