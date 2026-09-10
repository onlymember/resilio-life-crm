# TESTS — PROMPT 2A · Capa de datos completa

Pegar a Claude Code cuando diga que terminó el 2A.

---

```
El 2A no está terminado hasta que corras estos 10 tests y me pases el
resultado de cada uno. Un build sin errores NO es evidencia: en la Fase 1
compiló limpio con cinco bugs adentro, incluido uno que dejaba la app
colgada al recargar.

TESTS — PROMPT 2A

 1. Crear una campaña desde la UI → sobrevive un F5.
    (Antes vivía en localStorage; ahora tiene que estar en Supabase.)

 2. Agregar 3 influencers a esa campaña, con rates distintos
    → 3 filas en campaign_influencers, cada una con su rate.
    Verificar en SQL, no solo en pantalla.

 3. Sacar uno de los 3 → quedan 2 filas, y el influencer SIGUE
    EXISTIENDO en la tabla influencers. No se borra en cascada.

 4. Crear una colaboración → sobrevive un F5.
    ⚠️ Este es el bug histórico del sistema: CollabsPanel nunca persistió
    nada. Si este test no pasa, el 2A no sirvió para nada.

 5. Esa colaboración guarda su tipo LIFE / ESTÁNDAR / ESPECIAL y lo
    relee bien al recargar. El valor viene de activation_types
    (activation_type_id), NO de un string hardcodeado en el código.

 6. Crear una oportunidad y moverla new → contacted → won
    → aparecen 3 filas en activities, generadas por el trigger
    log_activity_auto, sin que el cliente las escriba.

 7. Entrar con el usuario Scouter: ve solo SUS campañas y SUS
    colaboraciones. Verificarlo desde la consola con
    await supabase.from('campaigns').select('*')
    y comparar contra lo que ve el super admin.

 8. localStorage ya no es fuente de verdad de nada de Network.
    Verificar que crm_inf_camps_v2, crm_collabs y crm_missions_v1 ya no
    se lean en App.jsx. Borrarlas del navegador y confirmar que la app
    sigue mostrando los mismos datos.

 9. await supabase.rpc('network_stats') devuelve números coherentes con
    lo que se cargó en los tests anteriores (campañas, colaboraciones,
    influencers).

10. REGRESIÓN: con el super admin, recorrer las 8 secciones del sidebar.
    Resilio Life, Agencia Creativa, Productora, Elevare, Gestión y
    Captación siguen funcionando igual que antes del 2A.

Pasame los 10 con su resultado, uno por uno. Si alguno falla, decilo
en vez de darlo por bueno: prefiero arreglarlo ahora que descubrirlo
con tres pantallas construidas encima.
```

---

## Los tres que más importan

| # | Qué prueba |
|---|---|
| **4** | Cierra el bug histórico: las colaboraciones nunca persistieron |
| **5** | La taxonomía real del negocio quedó modelada en la base, no en el código |
| **7** | El aislamiento por Scouter sigue vivo después de 4 entidades nuevas |

## Verificación SQL de apoyo

```sql
-- Test 2 y 3
SELECT c.name AS campaña, i.name AS influencer, ci.rate, ci.status
FROM campaign_influencers ci
JOIN campaigns   c ON c.id = ci.campaign_id
JOIN influencers i ON i.id = ci.influencer_id
ORDER BY c.name, i.name;

-- Test 5
SELECT co.id, at.name AS tipo, at.color, co.status
FROM collaborations co
LEFT JOIN activation_types at ON at.id = co.activation_type_id;

-- Test 6
SELECT entity_type, type, title, occurred_at
FROM activities ORDER BY occurred_at DESC LIMIT 10;

-- Test 9
SELECT network_stats();
```
