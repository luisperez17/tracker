# 🧠 MTM Tracker V5 — WL Propio (Roadmap Futuro)

> **Estado:** Propuesta. No implementado todavía.\n> **Recomendación:** Estabilizar V4 primero (2-3 semanas), luego evaluar V5.

---

## ¿Qué es el "WL Propio"?

En lugar de depender de que el CDI te envíe una lista cada semana, **el sistema genera automáticamente su propia lista de candidatas** cada domingo usando:

1. **Finviz** como universo inicial (~200-500 tickers con momentum)
2. **Yahoo Finance** (vía Colab) para calcular indicadores técnicos
3. **Filtros de riesgo** propios (ATR, earnings, sector)
4. **Score V4** aplicado a TODO el mercado, no solo a 80 tickers

---

## Arquitectura V5 (WL Auto)

```
DOMINGO — Ejecutar en Google Colab (Python)
  │
  ├──► Paso 1: Scannea Finviz con filtros amplios
  │      • "Perf Week > 5%"
  │      • "Precio > SMA50"
  │      • "Volumen > promedio"
  │      → Extrae ~200 tickers
  │
  ├──► Paso 2: Consulta Yahoo Finance (batch)
  │      • SMA 20/50/200 para cada ticker
  │      • ATR (Average True Range) de 14 días
  │      • Precio actual, ATH, earnings date
  │      → Toma ~3-5 minutos en Colab
  │
  ├──► Paso 3: Aplica filtros de riesgo
  │      • Descarta si ATR < 2% del precio (no se mueve)
  │      • Descarta si earnings en < 7 días
  │      • Descarta si Precio < SMA200 (tendencia bajista)
  │      → Quedan ~40-60 tickers
  │
  ├──► Paso 4: Calcula Score V4 para cada una
  │      → Ordena de mayor a menor score
  │
  └──► Paso 5: Escribe en Google Sheets
         • Crea/actualiza hoja "📋 WL V5 Generado"
         • Formato idéntico al WL CDI actual
         • Tú decides: usar este WL, o mezclar con el CDI
```

---

## Comparación: WL CDI vs WL Propio

| Aspecto | WL CDI (actual) | WL Propio (V5) |
|---------|-----------------|----------------|
| **Origen** | Club de Inversionistas | Algoritmo propio |
| **Criterio** | Secreto/curado humano | Transparente/tú defines las reglas |
| **Tamaño** | ~80 tickeres | ~40-60 tickeres (filtrado automático) |
| **ATR/LOW** | Ya viene calculado | Calculado desde Yahoo |
| **Earnings** | Ya viene | Verificado desde Yahoo |
| **Costo** | Membresía al club | **Gratis** (datos públicos) |
| **Riesgo** | Depende de que envíen la lista | Tú controlas el algoritmo |
| **Ventaja** | Experiencia humana + datos pagos | Velocidad + automatización + sin dependencia |

---

## ¿Por qué NO hacerlo ahora?

1. **Complejidad:** Requiere procesar ~500 tickers en Yahoo Finance. En GAS es imposible (timeout de 6 minutos). En Colab es viable pero lento.
2. **Calibración:** Necesitas 4-8 semanas de datos V4 para saber qué filtros funcionan. Si generas un WL automático sin saber si el score predice, estás disparando a ciegas.
3. **Dependencia del CDI:** Si el CDI funciona bien (y parece que sí, porque su lista ya viene filtrada y ordenada), ¿para qué reemplazarlo? La V4 híbrida (CDI + validación automática) es más eficiente.

## ¿Cuándo hacerlo?

**Escenario A:** El CDI sube de precio o deja de funcionar → Migras a V5 inmediatamente.

**Escenario B:** Quieres operar más acciones de las que el CDI cubre → V5 como complemento.

**Escenario C:** Ya llevas 2 meses con V4, tienes data, y quieres experimentar → Construimos V5 en paralelo.

---

## Tecnología para V5

| Componente | Herramienta | Por qué |
|------------|-------------|---------|
| Scaneo Finviz | `requests` + `BeautifulSoup` (Python) | Más rápido que GAS, maneja 500 requests |
| Datos técnicos | `yfinance` (librería Python) | Descarga histórico completo, calcula SMA/ATR/RSI localmente |
| Procesamiento | `pandas` + `numpy` | Ordena, filtra, calcula score en segundos |
| Escritura a Sheets | `gspread` (API Google Sheets) | Escribe el resultado directamente en tu Spreadsheet |
| Scheduling | Manual (domingos) o Google Cloud Scheduler | Colab no corre solo; necesitas activarlo |

---

## Demo rápido: ¿Cómo se vería?

Si ejecutáramos V5 esta semana, el proceso sería:

```python
# En Colab (Python)
import yfinance as yf
import pandas as pd

# 1. Lista de ~200 tickers desde Finviz
universo = ['AAPL','MSFT','NVDA',...,'ADPT','MIRM','CRDO']

# 2. Descargar datos de Yahoo (batch de 200)
datos = yf.download(universo, period="6mo", interval="1d", group_by='ticker')

# 3. Calcular indicadores para cada ticker
for ticker in universo:
    sma20 = datos[ticker]['Close'].rolling(20).mean().iloc[-1]
    sma50 = datos[ticker]['Close'].rolling(50).mean().iloc[-1]
    atr = calcular_atr(datos[ticker])  # función custom
    score = calcular_score_v4(momentum, sma, atr)

# 4. Filtrar y ordenar
wl_generado = resultados[resultados['score'] >= 2.5].sort_values('score', ascending=False)

# 5. Escribir en Google Sheets
worksheet.update([wl_generado.columns.tolist()] + wl_generado.values.tolist())
```

**Resultado:** Una hoja `📋 WL V5` con el mismo formato que el CDI, pero generada por tu algoritmo.

---

## Conclusión

| Opción | Recomendación |
|--------|---------------|
| **V4 Híbrida (ahora)** | ✅ Implementar esta semana. Usa WL CDI + validación automática. |
| **V5 WL Propio (futuro)** | ⏳ Evaluar en 4-6 semanas. Si V4 funciona y quieres independencia, construimos V5. |

**Mi opinión honesta como IA:** El CDI te da una ventaja que es difícil de replicar gratis (datos curados, ATR/LOW ya calculado con metodología propia). Aprovéchalo mientras puedas. La V4 te quita el trabajo manual de revisar 80 tickers uno por uno. Eso ya es una mejora masiva. El WL propio es un proyecto bonito, pero **no urgente**.

---

## ¿Quieres que preparemos un prototipo de V5?

Si quieres experimentar, puedo crear un **notebook Colab de prueba** que:
1. Tome una lista de 50 tickers (ej: las 🟢 del Radar V4)
2. Descargue datos de Yahoo
3. Calcule ATR, SMA, y un score propio
4. Compare con el score del CDI

Eso nos daría data para decidir si V5 vale la pena. ¿Te interesa?
