# 🚀 SUPER GUÍA — MTM Tracker V4

> **Versión actual:** V4.1 (Julio 2026)  
> **Objetivo:** Trading con WL CDI + Score V4 + Alertas automáticas + Motor Propio (Colab)

---

## 📁 Archivos del proyecto

```
v4/
├── TODO_EN_UNO_V4.gs              ← ⭐ ÚNICO archivo que copiás a Apps Script
├── gas/                           ← Referencia (archivos separados por módulo)
│   ├── ConfigV4.gs
│   ├── YahooServiceV4.gs
│   ├── RadarServiceV4.gs
│   ├── AlertServiceV4.gs
│   ├── MainV4.gs
│   └── SetupV4.gs
├── colab/
│   ├── MTM_V4_Analysis.ipynb      ← Análisis histórico (Viernes)
│   ├── MTM_V5_Motor_Propio.ipynb  ← Scanner independiente (Domingo, Fase 3)
│   └── MTM_V6_Backtesting.ipynb   ← Backtesting Score Log (Viernes, Fase 6)
├── docs/
│   ├── PASO_A_PASO.md
│   ├── PLAN_TRABAJO.md
│   ├── WL_PROPIO.md
│   └── PROMPT_CLAUDE_PDF.md     ← Prompt para extraer PDF del Club (Fase 5)
└── README.md
```

> **IMPORTANTE:** No subas archivos `.json` ni credenciales a Git/GitHub.

---

## PARTE 1: Instalar V4 en Apps Script (15 minutos)

### Paso 1.1 — Abrir Apps Script

1. Abrí tu **Google Spreadsheet**.
2. Menú: `Extensiones → Apps Script`.
3. Se abre el editor. Borrá los archivos viejos (V3) si los tenés.

### Paso 1.2 — Crear TODO_EN_UNO_V4

1. A la izquierda del editor, hacé clic en **+** → **Script**.
2. Nombre: `TODO_EN_UNO_V4`.
3. Borrá el contenido por defecto.
4. Copiá TODO el contenido de `v4/TODO_EN_UNO_V4.gs` y pegalo.
5. Guardá con **Ctrl+S**.

### Paso 1.3 — Autorizar

1. Seleccioná la función `instalarV4` en el dropdown.
2. Presioná **▶️ Ejecutar**.
3. La primera vez Google pide autorización:
   - Clic en **Revisar permisos**.
   - Seleccioná tu cuenta.
   - Clic en **Avanzado** → **Ir a [proyecto] (no seguro)**.
   - Marcá todos los permisos → **Permitir**.
4. Vuelve al Spreadsheet. Te aparece un popup. Dale **SÍ**.

### Paso 1.4 — Verificar menú

1. **Recargá** el Spreadsheet (`F5`).
2. Debe aparecer el menú: `🎯 MTM Tracker V4`.
3. Si no aparece, ejecutá `instalarMenuV4` desde Apps Script.

---

## PARTE 2: Configurar alertas y Tracker (5 minutos)

### Paso 2.1 — Instalar trigger onEdit (autocompletar Tracker)

> Esto hace que el **Tracker Diario** se llene solo al pegar tickers.

1. Menú: `🎯 MTM Tracker V4 → ⚡ Instalar trigger onEdit`.
2. Confirmá. Ahora al pegar un ticker en columna A del Tracker, se autocompleta.

### Paso 2.2 — Activar Dashboard automático

> Actualiza la tabla de seguimiento en vivo cada 1 hora.

1. Menú: `🎯 MTM Tracker V4 → 📊 Activar Dashboard automático (cada 1h)`.

### Paso 2.3 — Instalar alertas Email/WhatsApp

1. Menú: `🎯 MTM Tracker V4 → 📧📱 Canal de Alertas → 📧📱 Ambos`.
2. Menú: `🎯 MTM Tracker V4 → 📧📱 Instalar alertas automáticas`.
   - Se programan **4 alertas al día**: 9:30, 11:30, 13:30, 15:30 ET.
   - Se envían a: `duardo07@hotmail.com` y `pz910531@hotmail.com` (CC).
   - También a WhatsApp vía CallMeBot.

### Paso 2.4 — Probar alertas

1. Menú: `🎯 MTM Tracker V4 → 📧📱 Probar Alerta`.
2. Revisá tu email y WhatsApp.

---

## PARTE 3: Flujo semanal (WL CDI + Motor Propio)

### Domingo: Generar WL V5 (Motor Propio)

> El **Motor Propio** scanea el S&P 500 y genera una WL alternativa sin depender del CDI.

1. Andá a [colab.research.google.com](https://colab.research.google.com).
2. Subí: `v4/colab/MTM_V5_Motor_Propio.ipynb`.
3. Ejecutá las celdas en orden:
   - **Paso 0:** Instala librerías.
   - **Paso 1:** Te aparece un link → hacé clic → elegí tu cuenta de Google → "Permitir".
   - **Paso 2:** Pegá el `SPREADSHEET_ID` de tu hoja.
   - **Paso 3-8:** Corren solos.
4. El resultado se escribe en la hoja `📋 WL V5 Generado` con columna **Score V4** incluida (ordenada de mayor a menor).

### Sábado: Recibir PDF del Club y extraer tickers (Fase 5)

> **Nota:** Los PDFs del Club suelen tener tablas como **imágenes** (no texto seleccionable). La mejor solución es usar **Claude** (gratuito) que puede ver el PDF como un humano.

**Pasos (2 minutos):**
1. Recibís el PDF del Club por email.
2. Andá a [claude.ai](https://claude.ai) e iniciá sesión con tu cuenta gratuita.
3. Hacé clic en el **clip 📎** para adjuntar archivos y subí el PDF.
4. Copiá el prompt de `v4/docs/PROMPT_CLAUDE_PDF.md` y pegalo en el chat.
5. Claude extraerá la tabla y te la devolverá en formato listo para copiar.
6. Copiá la tabla, andá a tu Google Sheet `📋 WL CDI`, y pegala en la celda **A5**.

**Si Claude no está disponible:**
- Usá [ChatGPT](https://chatgpt.com) con el mismo prompt (también permite subir archivos en la versión gratuita).

**Si el PDF no se puede subir:**
- Tomá **screenshots** de las páginas con la tabla y adjuntalas en el chat.

**Bonus:** Después de extraer la tabla, preguntale a Claude:
```
Ahora analizá este PDF cualitativamente: ¿Qué sectores están más representados? ¿Qué tickers son nuevos vs semanas anteriores? ¿Qué catalysts monitorea el Club?
```
Guardá la respuesta en un documento de Drive para análisis futuro (backtesting cualitativo).

### Lunes mañana: Revisar WL CDI

1. Verificá que `📋 WL CDI` tenga los tickers y datos del Club.
2. Si algo falta (SCTR, RSI, etc.), no importa — el Radar lo completará con Yahoo Finance al generarse.

### Lunes mañana: Generar Radar

**3 opciones en el menú:**

| Opción | Cuándo usarla |
|---|---|
| `📋 Desde WL CDI (Club)` | Tenés la lista del Club y querés solo esa |
| `🤖 Desde WL V5 (Motor Propio)` | No tenés CDI o querés probar el scanner solo |
| `🔗 COMBINADO: CDI + V5` | **Recomendado** — mergea ambas fuentes, prioriza CDI si hay duplicados |

1. Menú: `🎯 MTM Tracker V4 → 🔄 Generar Radar Semanal → [elegí opción]`.
2. Esperá ~3-5 minutos (consulta Yahoo Finance ticker por ticker).
3. Revisá el `🎯 Radar Semanal`:
   - 🟢 Alta Confianza (Score ≥ 4.5)
   - 🟡 Media Confianza (Score 3.0–4.5)
   - 🟠 Base (Score 2.0–3.0)

### Lunes mediodía: Tracker Diario

1. Copiá tickers del **🎯 Radar Semanal** que vayas a operar.
2. Pegalos en `📈 Tracker Diario` (col A, fila 6+).
3. Se autocompletan solos con **todo** (Empresa, Sector, Score, Entrada, Stop, Target, R/R) porque el Radar ya calculó el setup.
4. Marcá el check en col E (Track) para recibir alertas.

### Martes–Viernes: Alertas automáticas

- **Dashboard:** Se actualiza solo cada 1 hora (9:30–16:00 ET).
- **Email/WhatsApp:** 4 alertas al día con P&L de tus activas.

---

## PARTE 4: Diagnóstico y solución de problemas

| Problema | Solución |
|---|---|
| Tracker no se autocompleta | Menú → `⚡ Instalar trigger onEdit`. Verificá que el Radar tenga datos. |
| No llegan alertas | Menú → `🔍 Diagnosticar sistema`. Revisa si tenés tickers con Track=TRUE. |
| Menú no aparece | Apps Script → Ejecutar `instalarMenuV4` → recargar Sheets. |
| Yahoo Finance lento | Normal. El script ya tiene pausas de 800ms. No toques nada. |
| Colab no conecta | Asegurate de estar logueado con la **misma cuenta** de Google. |
| WhatsApp no llega | Revisá el chat de CallMeBot en tu celular. A veces está archivado. |
| Dashboard texto blanco | Ya corregido en la última versión. Recargá el código desde `TODO_EN_UNO_V4.gs`. |

---

## 🎯 Comparación: WL CDI vs WL V5 (Motor Propio)

| Aspecto | WL CDI | WL V5 Motor Propio |
|---|---|---|
| **Origen** | Club de Inversionistas | Algoritmo propio (S&P 500) |
| **Criterio** | Curado humano + eventos | Momentum + SMA + ATR |
| **Tamaño** | ~80 tickers | ~200-500 tickers |
| **Score V4** | ✅ Sí | ✅ Sí (calculado en Colab) |
| **SCTR/ADX** | ✅ Incluido | ❌ No disponible gratis |
| **Earnings exacto** | ✅ Sí | ⚠️ Aproximado (Yahoo) |
| **Independencia** | Depende del Club | **100% independiente** |

**Recomendación:** Usá **ambos**. El CDI como base principal, y el Motor Propio como complemento o backup.

---

## ✅ Checklist antes de operar

- [ ] WL CDI pegada en `📋 WL CDI` (o `📋 WL V5 Generado` si usás el Motor Propio)
- [ ] Radar Semanal generado esta semana
- [ ] Tracker Diario con tickers + Track=TRUE
- [ ] Alertas instaladas (Menu → `📧📱 Instalar alertas automáticas`)
- [ ] Dashboard automático activado (Menu → `📊 Activar Dashboard automático`)
- [ ] Trigger onEdit instalado (Menu → `⚡ Instalar trigger onEdit`)

---

## 🗺️ Roadmap de Fases

| Fase | Nombre | Estado | Descripción |
|---|---|---|---|
| **Fase 1** | Radar + Tracker + Alertas | ✅ **Listo** | WL CDI → Score V4 → Tracker → Email/WhatsApp |
| **Fase 2** | Motor Propio V5 (Colab) | ✅ **Listo** | Scanner independiente del S&P 500 con Score V4 |
| **Fase 3** | Integración V5 → Radar | ✅ **Listo** | WL V5 se puede usar para generar Radar (solo o combinado) |
| **Fase 4** | Independencia total | ✅ **Listo** | Radar Combinado (CDI + V5) sin depender de una sola fuente |
| **Fase 5** | Extractor PDF (Claude) | ✅ **Listo** | Manual: subís PDF a Claude.ai, copiás resultado a `📋 WL CDI` |
| **Fase 6** | Backtesting | ✅ **Listo** | Colab lee Score Log → win rate, curva de equity, drawdown, sector, R/R |
| **Fase 7** | Universo Propio | 🚧 **Pendiente** | Ampliar Motor Propio con NASDAQ-100 + Russell 2000 + tickers CDI históricos |

---

## 📊 Fase 6: Backtesting (Viernes)

### Flujo de trabajo

1. **Ejecutar notebook** `MTM_V6_Backtesting.ipynb` en Colab
2. **Pegar `SPREADSHEET_ID`** en el Paso 1
3. **Ejecutar todo** (`Entorno de ejecución → Ejecutar todo`)
4. Esperar 3-5 minutos (descarga precios de Yahoo Finance)

### Resultados generados

El notebook genera automáticamente:

| Reporte | Formato | Ubicación | Detalle |
|---|---|---|---|
| Resumen ejecutivo | `.txt` | `Drive/MTM_V4_Resultados/` | Métricas, win rates, top 10, conclusiones |
| Reporte completo | `.html` | Descarga manual de Colab | Con gráficos y tablas (más completo) |
| Notebook editable | `.ipynb` | Descarga manual de Colab | Para re-ejecutar otra semana |

### Cómo guardar el HTML (recomendado)

1. En Colab: `Archivo → Descargar → Descargar .html`
2. Guardarlo en tu Google Drive: `MTM_V4_Resultados/`
3. Se abre en Chrome/Firefox y tiene TODO: gráficos, tablas, métricas
4. Para PDF: Abrí el HTML → `Ctrl+P → Guardar como PDF`

### Qué analiza el backtesting

- **Todo el Radar**: Cómo funcionó el sistema en general
- **Mis trades**: Solo los tickers que pusiste en el Tracker (TRACKER? = SÍ)
- **Top 3 por Score**: Simulación si solo operabas las 3 mejores
- **Por nivel**: Alta vs Media vs Base confianza
- **Por sector**: Cuál sector tuvo mejor win rate (si hay datos)
- **Por R/R**: Si setups con mejor R/R funcionaron más (si hay datos)
- **Curva de equity**: Crecimiento simulado de $10,000
- **Drawdown**: Máxima caída del capital

> 💡 **Regla de oro:** Con menos de 20 trades las estadísticas no son significativas. Esperá 2-3 meses de datos antes de ajustar el sistema.

---

## 💡 Recomendaciones prácticas (importante)

### 1. Radar: mantenelo en ~20 tickers

Un Radar de 50-80 tickers es inmanejable. **20 es el número máximo operable.**

El Radar actual ya filtra por `Score >= 2.0`, pero eso puede generar muchos. Para forzar un Radar más enfocado:
- **Opción A:** Usá el Radar Combinado y seleccioná manualmente las mejores 15-20 para el Tracker
- **Opción B:** En el Colab, ajustá el filtro a `Score >= 3.5` (ya lo hace el Colab)
- **Opción C:** En Apps Script, cambiá `UMBRAL_MIN_SCORE` de `2.0` a `3.5` para ver solo Alta + Media Confianza

> 💡 **Regla:** Si una semana no hay 20 tickers que pasen el filtro, **no forzés**. Es señal de que el mercado está débil.

### 2. Score Log: NUNCA lo borres

El `📊 Score Log V4` es tu **oro para el backtesting.** Cada vez que generás el Radar, se guarda un snapshot con:
- Fecha, ticker, precio, score
- Setup sugerido (entrada, stop, target, R/R)
- Sector, distancia ATH, ATR/LOW
- Si estaba en el Tracker o no

**Usos futuros (Fase 6):**
- "Las de Score >= 4.5 tuvieron 65% de win rate"
- "El setup Breakout funcionó mejor en tech que en energy"
- "El CDI acertó un 12% más que el Motor Propio"

> ⚠️ **NUNA borres ni limpies esta hoja.** Acumulá datos por al menos 3 meses antes de hacer análisis estadístico.

### 3. Del Radar al Tracker: filtrá en 3 pasos

No metas TODO el Radar al Tracker. Sé selectivo:

**Paso 1 — Filtro técnico (descarta):**
- Score < 3.5 (Media o Base)
- Earnings esta semana
- R/R < 2.0
- Precio < SMA200 (no está en tendencia)

**Paso 2 — Filtro cualitativo (elegí):**
- Conocés la empresa? Entendés su negocio?
- Hay un catalyst visible esta semana?
- El sector está de moda (rotación de mercado)?

**Paso 3 — Tamaño de posición:**
- **Máximo 2-3 posiciones por semana**
- **Nunca más del 10% del capital por ticker**
- Si tenés dudas, no entrés. Esperá a la siguiente semana.

### 4. Comparación honesta: V3 vs V4

| | V3 | V4 (actual) |
|---|---|---|
| **Cómo detecta** | 11 filtros Finviz automáticos | WL CDI humana + validación algorítmica |
| **Por qué un ticker está** | ❌ Caja negra | ✅ Score transparente (4 pilares) |
| **Estabilidad** | ❌ Cambiaba diario | ✅ CDI estable toda la semana |
| **Alertas** | ❌ WhatsApp roto | ✅ Email + WhatsApp dual |
| **Backup sin CDI** | ❌ No funcionaba | ✅ Motor Propio V5 |
| **Setup** | ❌ No calculaba | ✅ Entrada/Stop/Target automático |
| **Histórico** | ❌ Sin log | ✅ Score Log acumulativo |

**Conclusión:** El V3 era útil pero era un scanner ciego. El V4 es un **sistema de trading híbrido**: humano + algoritmo. Es más lento de configurar la primera vez, pero es **más confiable y explicable**.

---

**¿Dudas? Ejecutá `🔍 Diagnosticar sistema` desde el menú.** Te dice exactamente qué falta.
