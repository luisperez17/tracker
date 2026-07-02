# 📋 PASO A PASO — Implementar MTM Tracker V4

> **Tiempo estimado total:** 45-60 minutos
> **Prerrequisitos:** Cuenta Google, tu Spreadsheet actual, esta semana un WL CDI pegado

---

## PARTE 1: Preparar tu Google Spreadsheet (10 min)

### Paso 1.1 — Abrir tu Spreadsheet actual
1. Ve a [sheets.google.com](https://sheets.google.com)
2. Abre tu MTM Tracker actual (el que ya usas con la V3)
3. **IMPORTANTE:** No borres las hojas viejas todavía. La V4 creará hojas NUEVAS.

### Paso 1.2 — Crear la hoja "📋 WL CDI"
1. En la parte inferior, haz clic en el **+** (añadir hoja)
2. Selecciona "Hoja de cálculo en blanco"
3. Haz clic derecho en la pestaña → **Cambiar nombre** → escribe: `📋 WL CDI`
4. Selecciona la celda **A1** y pega este encabezado:

```
Ticker	Empresa	Sector	ATR/LOW	Earnings	Perf Sem %	Perf Mes %
```

5. Desde la fila 2 en adelante, **pega tu WL CDI de esta semana** (el CSV que tienes).
6. Asegúrate de que:
   - Columna A = Ticker
   - Columna D = ✅, ⚠️ o ❌
   - Columna E = Fecha tipo `07/31/2026` o vacía
   - Columna F = `%` tipo `+19.57%`
   - Columna G = `%` tipo `+19.70%`

> **Tip:** Si el pegado se ve raro (todo en una celda), usa `Datos > Dividir texto en columnas > Separado por tabulaciones`.

---

## PARTE 2: Subir los scripts V4 a Google Apps Script (20 min)

### Paso 2.1 — Abrir el editor de Apps Script
1. En tu Spreadsheet, ve a **Extensiones > Apps Script**
2. Se abrirá una nueva pestaña con el editor de código
3. Verás los scripts viejos a la izquierda (Main, Config, etc.)

### Paso 2.2 — Crear archivos nuevos para V4

**NO borres los archivos viejos todavía.** Vamos a crear archivos NUEVO paralelos.

En el panel izquierdo del editor:
1. Haz clic en el **+** junto a "Archivos" (o el icono de +)
2. Selecciona **Script** (no HTML, no Sheets)
3. Nombra el archivo: `ConfigV4`
4. Borra el contenido por defecto (`function myFunction() {}`)
5. **Copia y pega** TODO el contenido del archivo `v4/gas/ConfigV4.gs` de este repositorio
6. Guarda (Ctrl+S o Cmd+S)

**Repite esto para cada archivo:**

| Archivo a crear | Contenido desde |
|---|---|
| `ConfigV4` | `v4/gas/ConfigV4.gs` |
| `YahooServiceV4` | `v4/gas/YahooServiceV4.gs` |
| `RadarServiceV4` | `v4/gas/RadarServiceV4.gs` |
| `AlertServiceV4` | `v4/gas/AlertServiceV4.gs` |
| `MainV4` | `v4/gas/MainV4.gs` |

### Paso 2.3 — Guardar y cerrar el editor
1. Presiona **Guardar proyecto** (el icono de disco 💾)
2. Cierra la pestaña del editor
3. Vuelve a tu Spreadsheet
4. **Refresca la página** (F5 o Cmd+R)

---

## PARTE 3: Configurar el menú V4 (5 min)

### Paso 3.1 — Instalar el menú
1. En tu Spreadsheet, ve a **Extensiones > Apps Script** (de nuevo)
2. En el editor, selecciona el archivo `MainV4` (en el panel izquierdo)
3. Busca la función `instalarMenuV4()` (línea ~15)
4. Coloca el cursor dentro de la función (haz clic en cualquier línea de la función)
5. Arriba, haz clic en el botón **▶️ Ejecutar** (triángulo de "play")
6. La primera vez pedirá **autorización**:
   - Haz clic en "Revisar permisos"
   - Selecciona tu cuenta Google
   - Verás una pantalla de advertencia "Google no ha verificado esta app"
   - Haz clic en **Avanzado > Ir a [nombre] (no seguro)**
   - Concede estos permisos: **Ver y gestionar hojas**, **Enviar correo como tú**, **Ver email**
   - Espera a que diga "Ejecución finalizada"

### Paso 3.2 — Verificar el menú
1. Cierra el editor de Apps Script
2. Vuelve a tu Spreadsheet
3. **Refresca** (F5)
4. Deberías ver un nuevo menú en la barra superior: **🎯 MTM Tracker V4**
5. ¡Si lo ves, todo está bien!

---

## PARTE 4: Generar el Radar por primera vez (10 min)

### Paso 4.1 — Ejecutar configuración inicial
1. En tu Spreadsheet, ve al menú **🎯 MTM Tracker V4**
2. Haz clic en **🏗️ Configurar hojas V4 (primera vez)**
3. Aparecerá un cuadro de diálogo: haz clic en **SÍ**
4. Espera ~10 segundos. Se crearán automáticamente:
   - `🎯 Radar Semanal` (vacía, con formato)
   - `📈 Tracker Diario` (vacía, con formato)
   - `📊 Score Log V4` (vacía, con formato)
   - `📊 Dashboard V4` (con métricas)
5. Verás un mensaje "Hojas V4 configuradas..."

### Paso 4.2 — Ejecutar el Radar
1. Ve al menú **🎯 MTM Tracker V4 > 🔄 Generar Radar Semanal**
2. Verás un mensaje "Iniciando Radar V4..." en la esquina inferior derecha
3. **ESPERA.** El sistema consulta Yahoo Finance para cada ticker de tu WL (80 tickers = ~90 segundos con sleeps).
4. Verás mensajes tipo "AAPL...", "TSLA..." en la barra de tostadas.
5. Cuando termine, verá: "Radar V4 listo: XX candidatas"

### Paso 4.3 — Revisar el Radar
1. Ve a la pestaña `🎯 Radar Semanal`
2. Deberías ver:
   - Filas ordenadas por Score V4 (de mayor a menor)
   - Columnas: Ticker, Empresa, Sector, Precio, Perf W%, Perf M%, SMA20, SMA50, SMA200, Dist ATH, ATR/LOW, Earnings, **Score V4**, Entrada$, Stop$, Target$, R/R
   - Colores: verde 🟢 para Score >= 3.5, naranja 🟡 para >= 2.5

---

## PARTE 5: Configurar alertas por Email (5 min)

### Paso 5.1 — Copiar al Tracker Diario
1. En `🎯 Radar Semanal`, selecciona las 2-3 mejores filas (las 🟢 o 🟡 más altas)
2. Copia las columnas A (Ticker), B (Empresa), C (Sector), N (Score V4)
3. Ve a `📈 Tracker Diario`
4. Pega en la fila 6 (primera fila de datos)
5. **Activa el check** en columna E (Track) para las que vas a seguir
6. Completa tus precios de Entrada, Stop, Target (o usa los sugeridos del Radar)

### Paso 5.2 — Probar email
1. Ve al menú **🎯 MTM Tracker V4 > 📧 Probar Alerta Email**
2. Confirma con SÍ
3. Revisa tu **bandeja de entrada** (y spam) en tu Gmail
4. Deberías ver un email de "MTM V4 Bot" con una tabla de tus activas

### Paso 5.3 — Instalar alertas automáticas
1. Ve al menú **🎯 MTM Tracker V4 > 📧 Instalar alertas automáticas**
2. Esto programa triggers para hoy a las 10am, 1pm y 3:45pm ET
3. Solo funciona de lunes a viernes

---

## PARTE 6: Google Colab (Viernes, análisis semanal)

### Paso 6.1 — Abrir el notebook
1. Ve a [colab.research.google.com](https://colab.research.google.com)
2. Ve a **Archivo > Subir cuaderno**
3. Selecciona el archivo `v4/colab/MTM_V4_Analysis.ipynb` de este repositorio

### Paso 6.2 — Conectar con tu Spreadsheet
1. En el primer bloque de código del notebook, encuentra esta línea:
```python
SPREADSHEET_ID = 'TU_SPREADSHEET_ID_AQUI'
```
2. **Obtener tu ID:** Abre tu Spreadsheet en el navegador. La URL se ve así:
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
```
3. Copia el ID (la parte larga entre `/d/` y `/edit`):
```
1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
```
4. Pégalo en el notebook, reemplazando `'TU_SPREADSHEET_ID_AQUI'`

### Paso 6.3 — Ejecutar el análisis
1. Ve a **Entorno de ejecución > Ejecutar todas las celdas** (o presiona Ctrl+F9)
2. La primera celda pedirá autenticación:
   - Aparecerá un link → ábrelo
   - Selecciona tu cuenta Google
   - Copia el código de autorización
   - Pégalo en el cuadro de Colab
3. Espera a que todas las celdas terminen (1-2 minutos)
4. Verás:
   - Un **scatter plot** de Score vs Resultado
   - La **curva de equity**
   - Tabla de **aprendizaje**

### Paso 6.4 — Guardar resultados en tu Sheet
El notebook automáticamente escribe los resultados en una hoja llamada `🔬 Colab Output`. Si no existe, la crea.

---

## PARTE 7: Flujo semanal (resumen)

| Día | Acción | Quién/Qué |
|-----|--------|-----------|
| **Domingo** | Pegar WL CDI en `📋 WL CDI` | Tú (manual, 3 min) |
| **Domingo** | Ejecutar `🔄 Generar Radar Semanal` | Menú V4 (automático, 2 min) |
| **Domingo** | Revisar Radar, copiar 2-3 al `📈 Tracker Diario` | Tú (5 min) |
| **Lunes-Viernes** | Recibir alertas por email | GAS automático (10am, 1pm, 3:45pm ET) |
| **Viernes** | Ejecutar notebook Colab | Tú (5 min en Colab) |
| **Viernes** | Revisar `🔬 Colab Output` para aprender | Tú (10 min) |

---

## 🆘 Solución de problemas

### "No veo el menú 🎯 MTM Tracker V4"
- Refresca la página (F5)
- Si sigue sin aparecer, ve a Extensiones > Apps Script, selecciona `MainV4`, y ejecuta `instalarMenuV4()` manualmente (triángulo ▶️)

### "El Radar dice 'No hay datos en 📋 WL CDI'"
- Asegúrate de que el WL está en la hoja `📋 WL CDI` (no en otra)
- Asegúrate de que los datos empiezan en la fila 2 (fila 1 = encabezados)

### "Yahoo Finance devuelve error para muchos tickers"
- Es normal. Yahoo a veces bloquea si hay muchas requests.
- El sistema tiene un sleep de 800ms entre cada ticker. Si falla más del 50%, espera 5 min y reintenta.
- O ignóralo: el Radar funcionará con los que sí respondan.

### "El email no llega"
- Revisa **Spam** y **Promociones**
- Asegúrate de que en `AlertServiceV4.gs` la variable `EMAIL_ALERTS` esté en `true`
- Prueba manual con `Probar Alerta Email`

### "Colab dice 'Spreadsheet not found'"
- Verifica que pegaste el **ID correcto** (la parte larga de la URL)
- Asegúrate de que la hoja `📊 Score Log V4` tenga datos (al menos una semana de tracking)

---

## 📁 Archivos que necesitas copiar

```
v4/gas/ConfigV4.gs         → Archivo ConfigV4 en Apps Script
v4/gas/YahooServiceV4.gs   → Archivo YahooServiceV4
v4/gas/RadarServiceV4.gs   → Archivo RadarServiceV4
v4/gas/AlertServiceV4.gs   → Archivo AlertServiceV4
v4/gas/MainV4.gs           → Archivo MainV4
v4/colab/MTM_V4_Analysis.ipynb → Subir a Google Colab
```

---

## 🎯 Próximo paso

¿Estás listo para comenzar? Solo dime:
1. **"Empecemos"** → Te preparo un **script de instalación automática** (un solo archivo que crea todo con un click)
2. **"Dame el script de instalación automática"** → Hago un `SetupV4.gs` que configura hojas, menú y todo en una sola ejecución
3. **"Quiero hacer mi propio WL primero"** → Pasamos a la V5 (generador automático de lista desde Finviz + Yahoo)
