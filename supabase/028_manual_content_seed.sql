-- ═══════════════════════════════════════════════════════════
-- 028 · Contenido real del Manual (Manual_Scouting_Resilio_Life.pdf)
--
-- 12 categorías = 12 secciones = las 12 entradas del índice del PDF,
-- una relación 1:1 a propósito: así la barra deslizable de
-- ManualNav, que hoy pagina por `category`, funciona exactamente
-- como se pidió — "elegir entre los títulos del manual" — sin
-- tocar ManualNav.jsx en absoluto.
--
-- SINTAXIS del campo `body` (ver PROMPT 3A, sección MANUAL, para la
-- implementación exacta en SimpleMarkdown.jsx):
--   **texto**       → negrita
--   *texto*         → cursiva
--   ## texto        → subtítulo dentro de la sección
--   > texto         → cita/recuadro destacado (los boxes violeta/rosa del PDF)
--   - texto         → lista con viñetas
--   1. texto        → lista numerada
--   | a | b |       → fila de tabla (la primera fila de un bloque de
--                     líneas "|...|" consecutivas es el header)
--   líneas separadas por una línea en blanco = párrafos distintos
--
-- Secciones 10, 11 y 12: el PDF fuente lista sus títulos en el
-- índice pero NO tiene contenido redactado para ellas (el documento
-- corta en la sección 09). Se cargan con un texto honesto que lo
-- dice, para que Dirección las complete desde el botón Editar
-- (ManualSection ya soporta edición inline para COMMAND_ROLES).
-- No se inventa contenido que el documento no tiene.
--
-- IDEMPOTENTE: usa slug como clave. Si ya cargaste algo a mano en
-- estas secciones, ESTO LO PISA. Si no estás seguro, correlo primero
-- contra staging o hacé un SELECT body FROM manual_sections antes de
-- correrlo, para tener con qué comparar.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── 0) Registro de migraciones (guarda defensiva) ────────────
-- Ya la crea 027, que corre antes que este archivo. Se repite acá
-- solo para que 028 también sea corrible de forma independiente sin
-- abortar la transacción si por algún motivo se corre suelto.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT        PRIMARY KEY,
  descripcion TEXT,
  aplicada_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Categorías (= títulos del índice, en orden) ──────────────
INSERT INTO manual_categories (code, name, sort_order, active) VALUES
  ('sec01', '¿Qué es Resilio Life?',                1,  true),
  ('sec02', 'Resilio Network',                       2,  true),
  ('sec03', 'Sistema de Niveles',                    3,  true),
  ('sec04', 'El trabajo del Scouter',                4,  true),
  ('sec05', 'El Estándar',                           5,  true),
  ('sec06', 'Manejo de Objeciones',                  6,  true),
  ('sec07', 'Herramientas de Venta',                 7,  true),
  ('sec08', 'Cómo Presentar Resilio',                8,  true),
  ('sec09', 'Sistema de Pago y Bonificaciones',      9,  true),
  ('sec10', 'Hoja de Ruta',                         10,  true),
  ('sec11', 'Acuerdo Comercial',                    11,  true),
  ('sec12', 'Anexo Interno',                        12,  true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, active = EXCLUDED.active;

-- ── Sección 01 ────────────────────────────────────────────────
INSERT INTO manual_sections (category, slug, title, subtitle, body, sort_order, min_level, direction_only)
VALUES ('sec01', 'que-es-resilio-life', '¿Qué es Resilio Life?', 'Quiénes somos y qué construimos', $sec01$
Resilio Life es una compañía creativa y de entretenimiento que construye marcas, experiencias y comunidades. Combina estrategia, creatividad, producción, tecnología, eventos, influencers y comunidad para crear proyectos con impacto real.

No trabajamos como un proveedor que solo ejecuta pedidos: pensamos, diseñamos, producimos y activamos proyectos de manera integral. El objetivo es conectar Marcas + Experiencias + Creadores + Comunidad para generar relaciones de largo plazo.

## Las 4 unidades de Resilio

| Unidad | Qué hace |
| Agencia Creativa | Branding, identidad visual, dirección creativa, naming, storytelling, estrategia, contenido, diseño, web, campañas, automatizaciones e IA. |
| Eventos & Experiencias | Eventos sociales y corporativos, pop-ups, activaciones, lanzamientos, experiencias de marca, producción integral, aftermovies. |
| PR & Hospitality | Experiencias VIP, hospitality, relaciones con venues, networking, activaciones especiales, conexión con comunidades específicas. |
| Influencers & Comunidad | Red propia de creadoras e influencers, seleccionados por comunidad, engagement, imagen, calidad de contenido y afinidad. |
$sec01$, 1, 1, false)
ON CONFLICT (slug) DO UPDATE SET category=EXCLUDED.category, title=EXCLUDED.title, subtitle=EXCLUDED.subtitle,
  body=EXCLUDED.body, sort_order=EXCLUDED.sort_order, min_level=EXCLUDED.min_level,
  direction_only=EXCLUDED.direction_only, updated_at=now();

-- ── Sección 02 ────────────────────────────────────────────────
INSERT INTO manual_sections (category, slug, title, subtitle, body, sort_order, min_level, direction_only)
VALUES ('sec02', 'resilio-network', 'Resilio Network', 'La visión, el funnel y la estructura de roles', $sec02$
## Por qué existe Network

Resilio no se construye únicamente a través de eventos, campañas o experiencias: se construye a través de las personas, marcas, creators, comunidades y relaciones que forman parte de su ecosistema. Resilio Network existe para conectar esos mundos, identificar oportunidades y desarrollar una red capaz de crecer ciudad por ciudad.

## Qué conecta la red

- Brands — Marcas y negocios con potencial de colaboración.
- Creators — Influencers y creadores capaces de generar alcance, contenido e influencia.
- Ambassadors — Personas con presencia, credibilidad y capacidad de representación local.
- Communities — Grupos y audiencias que comparten intereses, hábitos y cultura.
- Experiences — Eventos, hospitality, contenidos, activaciones.

## El funnel madre de Network

**Discover → Qualify → Connect → Build → Activate → Measure → Reload → Scale**

*Todas las demás vistas del proceso (comercial, base de datos, loop de crecimiento) son lecturas distintas de este mismo ciclo — no procesos nuevos.*

## Estructura de roles

| Rol | Responsabilidad |
| Network Direction | Define visión, estrategia y estándares. Valida incorporaciones relevantes, supervisa la calidad de la red, aprueba alianzas y diseña oportunidades de alto impacto. No administra cada contacto: diseña el sistema para que la red crezca. |
| City Scouting Lead | Un/a líder por ciudad. Construye y desarrolla el equipo local, organiza prioridades, supervisa la calidad de las oportunidades, coordina y reporta a Dirección. |
| Scouter | Primer punto de contacto entre Resilio y una nueva oportunidad. Detecta, entiende y desarrolla el vínculo antes de derivarlo; el trabajo real empieza después del descubrimiento. |
$sec02$, 2, 1, false)
ON CONFLICT (slug) DO UPDATE SET category=EXCLUDED.category, title=EXCLUDED.title, subtitle=EXCLUDED.subtitle,
  body=EXCLUDED.body, sort_order=EXCLUDED.sort_order, min_level=EXCLUDED.min_level,
  direction_only=EXCLUDED.direction_only, updated_at=now();

-- ── Sección 03 ────────────────────────────────────────────────
INSERT INTO manual_sections (category, slug, title, subtitle, body, sort_order, min_level, direction_only)
VALUES ('sec03', 'sistema-de-niveles', 'Sistema de Niveles', 'Nivel 1, 2, 3 y la regla de oro para ciudades nuevas', $sec03$
*No se empieza por arriba: se gana el siguiente nivel con resultados, no con tiempo.*

## Nivel 1 — Scouting de creadores

- ¿Qué hacés? En un principio contactás influencers de nuestra base de datos, invitando a eventos puntuales, relevando información.
- ¿Qué ganás? Fijo por evento puntuales + bono por cada cierre.
- ¿Cómo subís de nivel? Cuando dominás el guion y las objeciones no te frenan más. Sumás perfiles nuevos a la base y contactás marcas de tu base también.

## Nivel 2 — Marcas + coordinación

- ¿Qué hacés? Armás el cruce entre marca y creadora para una acción concreta. Pensás en paquetes: qué marca con qué creadora y qué acción.
- ¿Qué ganás? Comisión sobre el valor de la acción.
- ¿Cómo subís de nivel? Con tu propia red curada, se habilita el nivel 3.
- Toda condición comercial se valida con Dirección antes de cerrarse.

## Nivel 3 — Red / Referente de ciudad

- No se entra desde cero: se entra con una red propia armada.
- ¿Qué hacés? Activás tu propia Red, tanto de marcas como influencers.
- ¿Qué ganás? Comisión mayor sobre los cierres, posibilidad de ascender a ser referente.
- Tareas puntuales asignadas.
- Puerta de entrada natural a cada ciudad nueva, más la posibilidad de convertirse en embajador o referente de Resilio.

Arrancás sin red → conseguís gente → cuando ya la tenés armada, cruzás negocios → si venís con red propia, entrás directo.

> Regla para ciudades nuevas: 1 Nivel 3 (red existente) + Nivel 1 (volumen) → habilitación de Nivel 2 recién cuando hay tracción real.

*Es decir: en una ciudad nueva primero se arma la base (alguien con red + gente contactando), y recién cuando eso ya funciona, se empieza a negociar con marcas.*
$sec03$, 3, 1, false)
ON CONFLICT (slug) DO UPDATE SET category=EXCLUDED.category, title=EXCLUDED.title, subtitle=EXCLUDED.subtitle,
  body=EXCLUDED.body, sort_order=EXCLUDED.sort_order, min_level=EXCLUDED.min_level,
  direction_only=EXCLUDED.direction_only, updated_at=now();

-- ── Sección 04 ────────────────────────────────────────────────
INSERT INTO manual_sections (category, slug, title, subtitle, body, sort_order, min_level, direction_only)
VALUES ('sec04', 'el-trabajo-del-scouter', 'El trabajo del Scouter', 'Cómo se descubre, desarrolla, registra y activa una oportunidad', $sec04$
## Cómo empezar (cualquier scout nuevo)

1. Leer y entender este manual completo.
2. Practicar respuestas y objeciones con Dirección antes de salir a contactar.
3. Arrancar solo con las acciones o eventos definidos en ese momento, nunca salir a scoutear en general.
4. Recién ahí, sumar el foco variable del momento vigente.

## Qué buscamos (relevancia antes que volumen)

No todo contacto es una oportunidad. La pregunta no es *¿podemos incorporarlo?* sino *¿tiene sentido que forme parte de la red?*.

| Tipo | Qué evaluamos |
| Brands | Relevancia · Calidad · Posicionamiento · Ubicación · Audiencia · Potencial comercial · Capacidad de activación |
| Creators | Audiencia · Engagement · Contenido · Reputación · Afinidad · Ubicación · Influencia · Potencial de colaboración |
| Ambassadors | Comunidad · Credibilidad · Acceso · Representación · Conocimiento local · Capacidad de conexión |

> Brand + Creator + Community + City + Experience = The Right Activation. Marca + Creador + Comunidad + Ciudad + Experiencia = La activación adecuada.

## Clasificación comercial de marcas

| Categoría | Descripción |
| Everyday | Marcas vinculadas al consumo cotidiano. |
| Weekly | Productos, servicios y experiencias de alta recurrencia. |
| Monthly | Servicios y beneficios periódicos. |
| Premium | Productos y servicios de mayor ticket. |
| Experience | Hospitality, eventos, viajes y entretenimiento. |
| Culture | Moda, arte, música, diseño y creatividad. |

## El funnel comercial

**01 Contact → 02 Qualification → 03 Introduction → 04 Relationship → 05 Opportunity → 06 Proposal → 07 Activation → 08 Result → 09 Partnership**

01 Contacto → 02 Cualificación → 03 Introducción → 04 Relación → 05 Oportunidad → 06 Propuesta → 07 Activación → 08 Resultado → 09 Asociación

## La base de datos: si no está registrado, no existe

La información de la red debe estar centralizada: formularios de carga, base organizada por ciudad y estado, seguimiento por Scouter. No es una tarea administrativa, es la memoria del Network.

> Register → Qualify → Update → Validate → Track → Close → Report. Registrar → Cualificar → Actualizar → Validar → Seguimiento → Cerrar → Informar.

*El registro, la actualización de estado y la validación de Dirección para cambios comerciales son siempre obligatorios.*
$sec04$, 4, 1, false)
ON CONFLICT (slug) DO UPDATE SET category=EXCLUDED.category, title=EXCLUDED.title, subtitle=EXCLUDED.subtitle,
  body=EXCLUDED.body, sort_order=EXCLUDED.sort_order, min_level=EXCLUDED.min_level,
  direction_only=EXCLUDED.direction_only, updated_at=now();

-- ── Sección 05 ────────────────────────────────────────────────
INSERT INTO manual_sections (category, slug, title, subtitle, body, sort_order, min_level, direction_only)
VALUES ('sec05', 'el-estandar', 'El Estándar', 'Performance, profesionalismo y qué es un buen scouter', $sec05$
No medimos únicamente cuánto trabajamos. Medimos qué generó ese trabajo.

## Cómo medimos el éxito: impacto sobre intención

| Dimensión | Qué mide |
| Activity | Prospección · Contactos · Seguimientos · Perfiles detectados |
| Quality | Oportunidades calificadas · Afinidad · Información completa |
| Results | Activaciones · Revenue · Audiencia · Engagement · Conversiones |
| Long-term value | Retención · Nuevas oportunidades · Partnerships · Crecimiento de la red |

## Qué es un buen scouter

| Evitar | En cambio |
| Coleccionar contactos | Construir relaciones |
| Perseguir volumen | Encontrar relevancia |
| Trabajar en aislamiento | Usar la red |
| Prometer sin autorización | Proteger a Resilio |
| Detenerse en el primer mensaje | Desarrollar la relación |
| Reportar solo actividad | Reportar resultados |

## Estándares profesionales

- **Clarity:** comunicar correctamente quiénes somos y qué ofrecemos.
- **Professionalism:** respetar procesos y relaciones.
- **Consistency:** dar seguimiento.
- **Transparency:** registrar información real y actualizada.
- **Responsibility:** no comprometer condiciones que no hayan sido aprobadas.
- **Relevance:** priorizar oportunidades que realmente tengan sentido.
$sec05$, 5, 1, false)
ON CONFLICT (slug) DO UPDATE SET category=EXCLUDED.category, title=EXCLUDED.title, subtitle=EXCLUDED.subtitle,
  body=EXCLUDED.body, sort_order=EXCLUDED.sort_order, min_level=EXCLUDED.min_level,
  direction_only=EXCLUDED.direction_only, updated_at=now();

-- ── Sección 06 ────────────────────────────────────────────────
INSERT INTO manual_sections (category, slug, title, subtitle, body, sort_order, min_level, direction_only)
VALUES ('sec06', 'manejo-de-objeciones', 'Manejo de Objeciones', 'Guiones probados para marcas e influencers', $sec06$
*Estas respuestas usan las Técnicas de Cierre (Escasez, Autoridad, Comparación y Próximo Paso) del manual operativo. Primero se valida la objeción, después se responde — el objetivo no es "ganar" la conversación sino que la otra parte entienda el valor de Resilio.*

## Objeciones de marcas

**"Ya trabajo con influencers por canje, no necesito un sistema pago."**
*Enfoque: Cierre por Comparación, diferenciar el caos del orden profesional.*
Entiendo perfectamente. La diferencia con Resilio es que no hacemos canjes desordenados ni posteos sueltos. Acá entrás a un circuito estable con influencers bajo métricas reales. No buscamos una foto aislada, sino generar un hábito de consumo y lealtad en nuestra comunidad.

**"Me parece caro el fee de gestión."**
*Enfoque: Inversión vs. Costo, presentar el fee como una inversión previsible.*
Más que un costo, es una inversión estratégica. El fee cubre la selección técnica de perfiles, la gestión operativa y la entrega de reportes de impacto medible. Pagás por resultados concretos y visibilidad real, no por la intención de que alguien suba algo.

**"No sé si mi público está en esta red."**
*Enfoque: Cierre por Autoridad, basado en el sistema de segmentación.*
Nuestro sistema no es masivo, es segmentado. Seleccionamos influencers por ciudad, rubro y categoría de audiencia. Antes de activar, evaluamos la afinidad de tu marca con nuestra comunidad para asegurar que el contenido sea auténtico y el público, el correcto.

**"Lo quiero pensar / dejame ver cómo viene el mes."**
*Enfoque: Cierre por Escasez / Próximo Paso, crear urgencia y proponer una prueba.*
Bien, nosotros manejamos cupos limitados por rubro y zona para no saturar a la audiencia. Te propongo probar un primer mes con una acción piloto, analizar los resultados juntos y decidir después si avanzamos con el plan anual.

**"Ahora mismo no tenemos presupuesto para marketing."**
*Enfoque: Próximo Paso / Inversión vs. Costo, no perder el contacto.*
Perfecto, justamente podemos evaluar una activación inicial que tenga sentido para el momento actual de la marca. La idea no es que asumas un compromiso que hoy no te conviene, sino encontrar una acción concreta, medir qué respuesta genera y, a partir de esos resultados, decidir si vale la pena.

**"Ya tenemos una agencia que nos maneja esa área."**
*Enfoque: Cierre por Comparación, Resilio complementa, no reemplaza.*
Perfecto, no buscamos reemplazar ese trabajo. Funcionamos como un circuito complementario: nosotros seleccionamos y gestionamos perfiles, coordinamos activaciones y medimos el impacto. Tu agencia puede seguir manejando la estrategia general mientras nosotros potenciamos el vínculo con influencers y comunidad.

**"No quiero pagar y además entregar producto."**
*Enfoque: Comparación / Valor, diferenciar producto de fee de gestión.*
Entiendo la duda, son dos cosas distintas: el producto permite que el influencer tenga una experiencia real con la marca, mientras que el fee corresponde a todo el sistema detrás de la activación: selección, coordinación, seguimiento y medición.

**"¿Cómo sé que los influencers realmente van a publicar?"**
*Enfoque: Cierre por Autoridad, destacar gestión y seguimiento.*
Justamente ahí aparece el valor del sistema. No entregamos productos y esperamos a ver qué pasa. Cada activación tiene coordinación, condiciones definidas y seguimiento desde nuestro equipo, para reducir la incertidumbre que existe cuando una marca gestiona canjes aislados.

**"Ya probé con influencers y no me funcionó."**
*Enfoque: Cierre por Comparación, experiencias aisladas vs. sistema organizado.*
Es algo que escuchamos bastante, porque una acción aislada puede no generar resultado aunque el influencer tenga muchos seguidores. Nosotros trabajamos con otra lógica: selección por afinidad, continuidad, segmentación y medición. No es probar con otro influencer, es cambiar cómo se gestiona la estrategia.

**"¿Me garantizan ventas?"**
*Enfoque: Autoridad / Transparencia, no prometer lo que no se puede garantizar.*
No sería serio garantizarte una cantidad determinada de ventas, porque intervienen variables que exceden al influencer. Lo que sí podemos hacer es trabajar con criterios concretos de selección, ejecución y medición para evaluar el impacto real y optimizar las siguientes acciones.

**"¿Por qué tendría que pagar si hay influencers que trabajan por canje?"**
*Enfoque: Comparación / Segmentación por perfil.*
Depende del tamaño del perfil. Con influencers macro, el alcance ya representa una inversión publicitaria real, así que ahí trabajamos con fee. Con perfiles micro, el valor está en la cercanía y autenticidad, y ahí el canje sigue siendo el modelo más lógico. Armamos la propuesta según qué perfil se ajusta mejor a tu objetivo.

## Objeciones de influencers

**"¿Qué gano si me sumo al equipo de Resilio?"**
*Enfoque: Cierre por Autoridad, valor integral del ecosistema, no solo el evento puntual.*
Sumarte no es solamente participar de un evento aislado. Formás parte de un equipo oficial de creadoras e influencers, con acceso prioritario a eventos, y coordinamos directamente acciones entre marcas y creadoras: te acercamos oportunidades.

**"¿Las colaboraciones son pagas?"**
*Enfoque: Transparencia / Autoridad, depende de la marca, no se generaliza.*
Depende de cada marca y de cada acción. Hay marcas que trabajan con pago comercial y otras por canje. Antes de cada activación te contamos bajo qué modalidad es, para que decidas.

**"No me interesa trabajar solo por canje."**
*Enfoque: Comparación / Valor, el canje también tiene valor concreto.*
Entendemos, y por eso no todo es canje: hay colaboraciones comerciales con pago. Cuando sí es canje, buscamos que el valor sea real para vos, como acceso a eventos, experiencias gastronómicas, servicios de cuidado o estética, entre otros.

**"¿Qué tipo de canje ofrecen?"**
*Enfoque: Cierre por Autoridad, detallar beneficios concretos.*
El canje puede incluir acceso a eventos y experiencias exclusivas, desayuno, merienda o cena, y servicios de belleza como pelo o estética, según la marca y la activación.

**"¿Cómo sé cuánto gano por lo que yo genero?"**
*Enfoque: Cierre por Autoridad, sistema de código de tracking.*
Podemos armarte un código propio: cuando las personas que te siguen lo usan, ya sea para comprar o sumarse a una acción, queda registrado que viene de vos y recibís una comisión por esa tracción. Así el resultado de tu trabajo se mide de forma concreta.

**"Soy de otra ciudad, ¿esto me sirve igual?"**
*Enfoque: Autoridad / Alcance, aclarar el alcance nacional.*
Sí, los beneficios no son solo locales. Funcionan a nivel nacional, en cualquier lugar donde Resilio esté presente.

**"¿Por qué sumarme a Resilio y no manejar todo directamente con las marcas?"**
*Enfoque: Construcción de red vs. acción puntual.*
Porque una marca puede buscarte para una acción, pero nosotros construimos relaciones a largo plazo dentro de un ecosistema donde conectamos marcas, experiencias, eventos e influencers estratégicamente.

**"¿Por qué a otras les pagan y a mí me ofrecen canje?"**
*Enfoque: Transparencia / Segmentación por alcance, sin generar sensación de trato desigual.*
No es al azar, tiene que ver con el alcance del perfil. Cuando tu cuenta ya representa una inversión publicitaria real para la marca, se accede más fácil a colaboraciones pagas. Con perfiles más chicos, el canje sigue teniendo valor real, y además a veces tenés tu código propio para generar comisión. A medida que tu comunidad crece, las condiciones también mejoran.

## Objeciones por rubro

**Indumentaria**

- *"Ya mando canje a varias chicas y no sé si funciona."* — Enfoque: Comparación. Un sistema con seguimiento y métricas reemplaza el canje disperso sin control.
- *"¿Qué pasa si no usan la prenda que les mandamos?"* — Enfoque: Transparencia. Establecemos condiciones claras antes de la activación, con reposición o uso garantizado.

**Gastronomía**

- *"Ya invitamos a comer gratis a mucha gente y no vimos resultados."* — Enfoque: Comparación. La diferencia está entre invitar sin criterio y seleccionar por afinidad real con el rubro gastronómico.
- *"No puedo dar mesas gratis todos los días."* — Enfoque: Próximo Paso / Flexibilidad. Se define una frecuencia concreta (por ejemplo, 1 a 2 veces por semana), no es ilimitado.
- *"¿Cómo mido si esto trajo gente al local?"* — Enfoque: Autoridad. Reserva o pedido con código propio de la influencer.

**Belleza / Estética**

- *"Ya tengo influencers que vienen gratis al salón."* — Enfoque: Comparación. Genial, pero nosotros te ofrecemos curaduría y continuidad.
- *"El servicio tiene un costo real para mí, no es como mandar un producto."* — Enfoque: Valor. El servicio también genera contenido y experiencia que vale como inversión.
- *"¿Qué pasa si la clienta cancela el turno?"* — Enfoque: Transparencia. Armamos políticas de confirmación y cancelación definida con anticipación.

## Tips adicionales para scouters

- No discutir la objeción. Primero validarla y después responder; el objetivo no es demostrar que la marca o la influencer está equivocada, sino reducir la barrera que le impide avanzar.
- No prometer ventas. Resilio puede ofrecer selección, gestión, segmentación, seguimiento y medición; no corresponde garantizar una cantidad específica de ventas sin una base objetiva.
- Convertir objeciones en preguntas. Si la objeción es demasiado general, profundizar antes de responder: ¿lo que más te genera duda es el presupuesto, el tipo de influencers o el resultado que podría tener?
- Siempre buscar un Próximo Paso. Cuando exista interés, avanzar hacia una propuesta, reunión, acción piloto o fecha concreta de seguimiento.
- Usar Escasez únicamente cuando sea real. Cupos por rubro, exclusividad territorial o límites de campaña, solo cuando efectivamente existan.
- No forzar marcas ni perfiles que no encajen. Priorizar la calidad de la red por sobre la cantidad.
- Registrar el motivo del "no". Presupuesto, timing, falta de interés, decisión interna o experiencia negativa previa son objeciones distintas y permiten seguimientos más efectivos.

## Comparativo: sin Resilio / con Resilio

| Sin Resilio | Con Resilio |
| Canjes sueltos que se pierden en el feed | Circuito estable de creadoras curadas por métricas reales |
| Elegís a ciegas, sin métricas ni afinidad real | Selección por afinidad, ciudad, rubro y audiencia |
| Sin seguimiento de si el contenido salió o no | Coordinación y seguimiento de cada activación |
| Resultado: una foto aislada, sin continuidad | Resultado: hábito de consumo y lealtad en una comunidad |
| Alcance limitado a lo que gestionás sola | Acceso a eventos, red de marcas y alcance nacional |

> "Mismo presupuesto, mismo producto, la diferencia es el sistema detrás. Con el respaldo de Resilio."
$sec06$, 6, 1, false)
ON CONFLICT (slug) DO UPDATE SET category=EXCLUDED.category, title=EXCLUDED.title, subtitle=EXCLUDED.subtitle,
  body=EXCLUDED.body, sort_order=EXCLUDED.sort_order, min_level=EXCLUDED.min_level,
  direction_only=EXCLUDED.direction_only, updated_at=now();

-- ── Sección 07 ────────────────────────────────────────────────
INSERT INTO manual_sections (category, slug, title, subtitle, body, sort_order, min_level, direction_only)
VALUES ('sec07', 'herramientas-de-venta', 'Herramientas de Venta', 'Rate card, calculadora, checklist, guion de seguimiento y CRM', $sec07$
## Checklist de calificación (marca o influencer)

5 preguntas rápidas antes de mandar la propuesta:

1. Rubro / categoría.
2. Tamaño (seguidores si es influencer / nivel de presencia si es marca).
3. Ciudad / zona de alcance.
4. ¿Ya trabajó antes con influencers o con otras marcas?
5. Presupuesto aproximado disponible (o si solo puede ir por canje).

## Calculadora simple de costo por impacto

*Plantilla para completar en vivo con números reales de cada marca, los valores de ejemplo se reemplazan por los reales.*

> Costo por impacto = Inversión total ÷ Alcance real. Comparar ese número contra lo que la marca ya gasta en pauta tradicional, y ahí mostrar la diferencia en la conversación.

Es la cuenta que le hacemos a una marca en el momento: cuánto le sale llegar a una persona con lo que ya hace, contra cuánto le sale llegar a una persona con nosotros. No siempre gana el número más bajo, a veces gana la calidad del contacto.

## Rate card orientativa por rango de seguidores

| Categoría | Seguidores | Condición base | Fee orientativo (tentativo) |
| Nano | 1K–5K | Canje / acceso | $0 |
| Micro | 5K–20K | Canje + beneficios / fee bajo | $30K–$80K |
| Mid | 20K–100K | Fee | $80K–$200K |
| Macro | 100K+ | Fee | $200K+ |

Esto es una planilla informativa, los montos pueden variar, siempre hay que consultar qué valor cobra cada creador e intentar negociarlo con la marca.

> Regla interna de Resilio — Canje = acceso / experiencia. Fee = contenido o acción comercial. Fee mayor = contenido + presencia + alcance + derechos de uso.

## Guion de seguimiento (cadencia día 0 → día 7)

Para no perder contactos tibios que no respondieron al primer mensaje.

**Día 0: desde la cuenta de la scouter** (también pueden ser perfiles ya hablados por Resilio)
Primer acercamiento personal. Si responde, la conversación continúa. Si no responde, no se insiste desde la misma cuenta.

**Día 3–7**
Si la respuesta fue positiva, la scouter debe hacer el seguimiento del contacto entre los 3 y 7 días siguientes.

**Desde la cuenta oficial de Resilio**
Si no hubo respuesta en la segunda instancia, es más institucional: no es otra persona insistiendo, es la cuenta oficial convocando al equipo. Esto además valida que la propuesta es real.

**Si tampoco responde, cierre**
No se manda un tercer mensaje inmediato. Se deja descansar y se reactiva cuando exista una nueva acción concreta (por ejemplo, un próximo evento).
$sec07$, 7, 1, false)
ON CONFLICT (slug) DO UPDATE SET category=EXCLUDED.category, title=EXCLUDED.title, subtitle=EXCLUDED.subtitle,
  body=EXCLUDED.body, sort_order=EXCLUDED.sort_order, min_level=EXCLUDED.min_level,
  direction_only=EXCLUDED.direction_only, updated_at=now();

-- ── Sección 08 ────────────────────────────────────────────────
INSERT INTO manual_sections (category, slug, title, subtitle, body, sort_order, min_level, direction_only)
VALUES ('sec08', 'como-presentar-resilio', 'Cómo Presentar Resilio', 'Preguntas frecuentes, tono y límites del discurso', $sec08$
## El tono que queremos transmitir

> NO: "Necesitamos influencers para llenar un evento."

> SÍ: "Estamos construyendo una red de creadoras y conectándola con experiencias, marcas y oportunidades."

## Qué NO debe prometer nunca una scouter

- Fees determinados.
- Cantidad de campañas.
- Contratos con marcas.
- Regalos que no hayan sido confirmados.
- Ingreso garantizado a todos los eventos.
- Publicaciones obligatorias.
- Cantidades de seguidores requeridas.
- Campañas pagas aseguradas.

Si no sabe la respuesta, la frase correcta es: *"Eso depende de cada acción. Te lo puede explicar mejor el equipo de Resilio cuando avancemos."* Es mejor decir esto que improvisar.
$sec08$, 8, 1, false)
ON CONFLICT (slug) DO UPDATE SET category=EXCLUDED.category, title=EXCLUDED.title, subtitle=EXCLUDED.subtitle,
  body=EXCLUDED.body, sort_order=EXCLUDED.sort_order, min_level=EXCLUDED.min_level,
  direction_only=EXCLUDED.direction_only, updated_at=now();

-- ── Sección 09 ────────────────────────────────────────────────
INSERT INTO manual_sections (category, slug, title, subtitle, body, sort_order, min_level, direction_only)
VALUES ('sec09', 'sistema-de-pago-y-bonificaciones', 'Sistema de Pago y Bonificaciones', 'Cómo se compensa cada nivel y cada colaboración', $sec09$
## Lógica general

El principio de Network es que la remuneración está vinculada al valor generado, y el sistema diferencia claramente quién originó la oportunidad, quién la cerró, quién participó en la activación y quién generó resultados sostenibles en el tiempo. Esto permite que el esquema sea escalable y justo a medida que la red crece.

## Nivel 1 — Scouting de creadores

- Fijo mensual: monto **A DEFINIR** por Dirección según ciudad y dedicación.
- Piso de actividad diaria: 25 contactos, de lunes a viernes (mitad prospección nueva, mitad seguimiento de conversaciones abiertas), convocatoria firme por experiencias puntuales.
- Bono por cierre.

## Nivel 2 y 3 — Coordinación y Red

La compensación combina participación por Originación (quién generó la oportunidad), Cierre (quién desarrolló y concretó la relación comercial), Activación (quién participó en la ejecución) y Performance (quién genera resultados sostenibles). Los porcentajes y montos exactos de cada componente quedan **A DEFINIR** por Dirección según el tipo de acción.

## Esquema de bonificación de la Hoja de Ruta

Así está implementado hoy en la herramienta digital: cada colaboración cerrada con una influencer genera un bono base, cuyo monto final depende del origen de la marca involucrada.

| Origen de la marca | Bonificación |
| Marca propia de la influencer | Bono completo ($1.000 base por cierre) con posibilidad de aumentar por constancia |
| Marca de otra scouter (cruce) | Bono compartido, el reparto exacto queda a acuerdo interno entre ambas |
| Marca de la base de Resilio | Porcentaje del bono, definido caso por caso por Dirección en el momento del cierre |

## Fee de gestión a marcas

Se cotiza según la rate card de la sección 7 (Nano / Micro / Mid / Macro), evaluando además engagement real, calidad de contenido, alcance promedio y qué se le pide al perfil. Toda condición comercial final se valida con Dirección antes de cerrarse.
$sec09$, 9, 1, false)
ON CONFLICT (slug) DO UPDATE SET category=EXCLUDED.category, title=EXCLUDED.title, subtitle=EXCLUDED.subtitle,
  body=EXCLUDED.body, sort_order=EXCLUDED.sort_order, min_level=EXCLUDED.min_level,
  direction_only=EXCLUDED.direction_only, updated_at=now();

-- ── Sección 10 (el PDF no tiene contenido redactado) ─────────
INSERT INTO manual_sections (category, slug, title, subtitle, body, sort_order, min_level, direction_only)
VALUES ('sec10', 'hoja-de-ruta', 'Hoja de Ruta', 'La herramienta digital de gestión diaria', $sec10$
*Esta sección no tenía contenido redactado en el documento fuente (el PDF corta después de la sección 09). Lo que sigue es una descripción mínima de cómo funciona la herramienta hoy — Dirección puede ampliarla desde el botón Editar.*

La Hoja de Ruta es Resilio Network: la pantalla de Inicio muestra las tareas de hoy, los seguimientos vencidos y las oportunidades activas de cada Scouter, tomados directamente de la base de datos (Influencers, Marcas, Oportunidades, Colaboraciones, Tareas). Completar un seguimiento o una tarea desde el teléfono queda registrado automáticamente en el historial de esa marca o influencer.
$sec10$, 10, 1, false)
ON CONFLICT (slug) DO UPDATE SET category=EXCLUDED.category, title=EXCLUDED.title, subtitle=EXCLUDED.subtitle,
  body=EXCLUDED.body, sort_order=EXCLUDED.sort_order, min_level=EXCLUDED.min_level,
  direction_only=EXCLUDED.direction_only, updated_at=now();

-- ── Sección 11 — Acuerdo Comercial (uso interno / legal) ─────
INSERT INTO manual_sections (category, slug, title, subtitle, body, sort_order, min_level, direction_only)
VALUES ('sec11', 'acuerdo-comercial', 'Acuerdo Comercial', 'Plantilla a completar con Legales', $sec11$
*Esta sección no tenía contenido redactado en el documento fuente. Pendiente de carga por Dirección junto con el equipo Legal: plantilla de acuerdo comercial para marcas e influencers.*
$sec11$, 11, 1, true)
ON CONFLICT (slug) DO UPDATE SET category=EXCLUDED.category, title=EXCLUDED.title, subtitle=EXCLUDED.subtitle,
  body=EXCLUDED.body, sort_order=EXCLUDED.sort_order, min_level=EXCLUDED.min_level,
  direction_only=EXCLUDED.direction_only, updated_at=now();

-- ── Sección 12 — Anexo Interno (uso exclusivo de Dirección) ──
INSERT INTO manual_sections (category, slug, title, subtitle, body, sort_order, min_level, direction_only)
VALUES ('sec12', 'anexo-interno', 'Anexo Interno', 'Auditoría y recomendaciones (uso de Dirección)', $sec12$
*Sección de uso exclusivo de Dirección. No tenía contenido redactado en el documento fuente. Pendiente de carga.*
$sec12$, 12, 1, true)
ON CONFLICT (slug) DO UPDATE SET category=EXCLUDED.category, title=EXCLUDED.title, subtitle=EXCLUDED.subtitle,
  body=EXCLUDED.body, sort_order=EXCLUDED.sort_order, min_level=EXCLUDED.min_level,
  direction_only=EXCLUDED.direction_only, updated_at=now();

INSERT INTO schema_migrations (version, descripcion)
VALUES ('028_manual_content_seed', 'Contenido real de las 12 secciones del manual (PDF Manual Scouting Resilio Life)')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ── Verificación ──────────────────────────────────────────────
SELECT c.sort_order, c.name AS categoria, s.title, s.direction_only, length(s.body) AS largo_body
FROM manual_categories c
JOIN manual_sections s ON s.category = c.code
ORDER BY c.sort_order;
-- Esperado: 12 filas, sort_order 1..12, largo_body > 0 en todas,
-- direction_only = true SOLO en sec11 y sec12.
