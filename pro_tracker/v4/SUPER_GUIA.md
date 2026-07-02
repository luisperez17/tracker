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
│   ├── MTM_V4_Analysis.ipynb     ← Análisis histórico (Viernes)
│   └── MTM_V5_Motor_Propio.ipynb ← Scanner independiente (Domingo)
├── docs/
│   ├── PASO_A_PASO.md
│   ├── PLAN_TRABAJO.md
│   └── WL_PROPIO.md
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
4. El resultado se escribe en la hoja `📋 WL V5 Generado`.

### Lunes mañana: Pegar WL CDI

1. Recibís el PDF del Club.
2. Copiá la tabla y pegala en la hoja `📋 WL CDI` (desde fila 5).

### Lunes mañana: Generar Radar

1. Menú: `🎯 MTM Tracker V4 → 🔄 Generar Radar Semanal`.
2. Esperá ~3-5 minutos (consulta Yahoo Finance ticker por ticker).
3. Revisá el `🎯 Radar Semanal`:
   - 🟢 Alta Confianza (Score ≥ 4.5)
   - 🟡 Media Confianza (Score 3.0–4.5)
   - 🟠 Base (Score 2.0–3.0)

### Lunes mediodía: Tracker Diario

1. Copiá tickers del Radar que vayas a operar.
2. Pegalos en `📈 Tracker Diario` (col A, fila 6+).
3. Se autocompletan solos (Empresa, Sector, Score, Entrada, Stop, Target, R/R).
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

**¿Dudas? Ejecutá `🔍 Diagnosticar sistema` desde el menú.** Te dice exactamente qué falta.
