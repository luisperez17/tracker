# 🎯 Plan de Trabajo MTM Tracker V4

## Estado actual: Fases 1, 2 y 3 COMPLETADAS (29/06/2026)

---

## ✅ FASE 1: Scoring V4 Mejorado (COMPLETADA)

### Qué se hizo:
- El score ya no depende solo de Finviz (que cambia todos los días).
- Se incorporaron los **datos reales del WL CDI**: SCTR, RSI, ADX, Beta.
- Se reestructuró el peso del score:
  - **Momentum (35%)**: Perf Semanal, Mensual, Trimestral
  - **Fuerza Relativa (25%)**: SCTR del CDI (0-100), distancia ATH
  - **Tendencia Técnica (25%)**: SMA20/50/200 + ADX
  - **Riesgo/Calidad (15%)**: RSI + Beta + ATR color + Earnings

### Resultado:
El WL CDI ahora tiene **peso real** en el score. Una acción con SCTR 98 (como BLLN) y momentum +20% va a estar arriba naturalmente, sin depender de cuántos filtros Finviz aparezca.

### Archivos modificados:
- `v4/gas/ConfigV4.gs` — Umbrales calibrados (Alta ≥ 4.5, Media ≥ 3.0, Base ≥ 2.0)
- `v4/gas/RadarServiceV4.gs` — Nuevo motor de scoring
- `v4/TODO_EN_UNO_V4.gs` — Todo integrado

---

## ✅ FASE 2: Alertas Dual Email + WhatsApp (COMPLETADA)

### Qué se hizo:
- Se eliminó el sistema roto de WhatsApp del V3.
- Se creó un sistema **dual** que puede enviar:
  - ✉️ **Solo Email** → `duardo07@hotmail.com`
  - 💬 **Solo WhatsApp** → CallMeBot
  - 📧📱 **Ambos** (por defecto)
- Se puede cambiar el canal desde el **menú del Spreadsheet**.
- La preferencia se guarda en `PropertiesService` (persiste entre sesiones).

### Funciones nuevas:
- `enviarAlertaDual()` — Envía según canal activo
- `cambiarCanalEmail()` / `cambiarCanalWhatsApp()` / `cambiarCanalAmbos()`
- `probarAlertaDual()` — Prueba manual
- `instalarAlertasDual()` / `eliminarAlertasDual()` — Triggers automáticos

### Archivos modificados:
- `v4/gas/AlertServiceV4.gs`
- `v4/gas/MainV4.gs`
- `v4/TODO_EN_UNO_V4.gs`

---

## ✅ FASE 3: Tracker Diario ↔ Radar Semanal Conectado (COMPLETADA)

### Qué se hizo:
- Se agregó `onEditTrackerV4(e)` — un trigger que escucha cuando pegás un ticker en la hoja **📈 Tracker Diario** (columna A).
- Cuando pegás un ticker, **auto-completa** automáticamente:
  - Empresa, Sector, Score V4
  - Entrada $, Stop $, Target $, R/R
  - Colorea el score según confianza
  - Agrega checkbox de "Track"

### Cómo activarlo:
1. En Apps Script, ve a **Activadores** (⏰)
2. Agregar trigger: `onEditTrackerV4`
3. Evento: `Al editar` → `Desde la hoja de cálculo`
4. Solo una vez, queda activo siempre.

### Archivos modificados:
- `v4/gas/MainV4.gs`
- `v4/TODO_EN_UNO_V4.gs`

---

## 🔄 FASE 4: Motor Propio (Independencia del WL CDI)

### Objetivo:
Poder generar el **propio universo de candidatas** sin depender del PDF semanal del Club.

### Cómo:
1. **Script Python/Colab** que escanee el universo USA (S&P 500, NASDAQ, etc.) vía Yahoo Finance.
2. Replicar la lógica del CDI:
   - Filtrar por momentum (Perf 1W, 1M)
   - Calcular SCTR propio (fuerza relativa vs SPY)
   - Calcular ADX, RSI, SMAs
   - Filtrar por liquidez (volumen)
   - Excluir earnings próximos
3. Generar un CSV o pegar directo en la hoja WL CDI.

### Estado: **PENDIENTE**

---

## 🔄 FASE 5: Extractor PDF Automatizado

### Objetivo:
Sacar los datos del PDF del CDI sin copiar y pegar manualmente.

### Cómo:
1. Script Python con `pdfplumber` o `tabula-py` para extraer tablas.
2. Mapear las columnas: Ticker, Empresa, Sector, %Chg, SCTR, etc.
3. Generar automáticamente el contenido para pegar en WL CDI.
4. O subir el PDF a una carpeta y que un script lo procese solo.

### Estado: **PENDIENTE**

---

## 🔄 FASE 6: Colab — Análisis del Universo Completo

### Objetivo:
Notebook de Google Colab que:
1. Descargue precios de ~3,000 tickers USA vía Yahoo Finance.
2. Calcule métricas de momentum (perf 1W, 1M, 3M, 6M).
3. Calcule SCTR propio (fuerza relativa).
4. Detecte cruce de SMAs, RSI, ADX.
5. Genere un ranking curado estilo CDI.
6. Exporte directo al Google Sheet via Sheets API.

### Estado: **PENDIENTE**

---

## 📋 INSTRUCCIONES PARA USAR AHORA

### Paso 1: Copiar TODO_EN_UNO_V4.gs
1. Abrí `v4/TODO_EN_UNO_V4.gs` en este repo.
2. Copiá **TODO** el contenido.
3. En tu Google Sheet V4, andá a **Extensiones → Apps Script**.
4. Borrá todo lo que haya y pegá el código nuevo.
5. Guardá (Ctrl+S).

### Paso 2: Instalar
1. En Apps Script, ejecutá `instalarV4()`.
2. Te va a crear las 5 hojas.

### Paso 3: Pegar WL CDI
1. Andá a la hoja 📋 WL CDI.
2. Desde la **fila 5** pegá los datos del PDF.
3. Las columnas recomendadas son:
   - A: Ticker
   - B: Empresa
   - C: Sector
   - D: ATR/LOW
   - E: Earnings
   - F: Perf Sem %
   - G: Perf Mes %
   - H: SCTR
   - I: RSI(14)
   - J: ADX(14)
   - K: Beta
   - L: ATR(14)
   - M: EMA20

### Paso 4: Generar Radar
1. Menú: 🎯 MTM Tracker V4 → 🔄 Generar Radar Semanal.
2. Esperá que consulte Yahoo Finance para cada ticker.

### Paso 5: Configurar Tracker
1. Andá a 📈 Tracker Diario.
2. Pegá un ticker en la columna A (fila 6 en adelante).
3. Se auto-completa todo desde el Radar.
4. Activá el checkbox "Track" para recibir alertas.

### Paso 6: Configurar Alertas
1. Menú: 📧📱 Canal → elegí Email, WhatsApp o Ambos.
2. Menú: 📧📱 Instalar alertas automáticas.
3. O usá "Enviar Alerta Ahora" para probar.

### Paso 7: Trigger onEdit (IMPORTANTE)
1. En Apps Script, panel izquierdo (⏰) → Activadores.
2. Agregar trigger → Función: `onEditTrackerV4`.
3. Evento: `Al editar` → `Desde la hoja de cálculo`.
4. Guardar.

---

## 🐛 PRECAUCIONES CONOCIDAS

1. **Precios del PDF**: Algunos precios del CDI pueden estar mal por OCR (ej: MU a $1,132). El sistema usa **Yahoo Finance** para precios reales, así que no importa.
2. **CallMeBot**: WhatsApp es un servicio gratuito de terceros. A veces falla o tiene rate limits. Por eso el **email es el backup**.
3. **Yahoo Finance rate limits**: Si tenés 74 tickers, el Radar tarda ~2-3 minutos. No hay problema.

---

## 📅 PRÓXIMA REUNIÓN DE TRABAJO

¿Querés que armemos la **FASE 4** (motor propio) o la **FASE 5** (extractor PDF) primero?
