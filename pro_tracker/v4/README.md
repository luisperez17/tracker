# 🎯 MTM Tracker V4 — WL-Driven Momentum System

> **Filosofía:** El WL CDI es la inteligencia. Los datos de mercado (Yahoo/Finviz) son la validación. El Score V4 mide probabilidad, no coincidencia.

---

## ¿Por qué V4?

La V3 tenía un score que medía *"¿en cuántos filtros aparece?"*. La V4 mide *"¿esta acción tiene momentum sostenido, setup técnico y riesgo controlado?"*.

| | V3 (viejo) | V4 (nuevo) |
|---|---|---|
| **Entrada** | 11 filtros Finviz automáticos | WL CDI curada (pegada semanal) |
| **Score** | Suma de filtros coincidentes | Momentum + Técnico + WL |
| **ATR/LOW** | Bonus opcional (+1.0) | Input principal de riesgo |
| **Earnings** | No penalizaba | Penalización inminente |
| **Alertas** | WhatsApp (roto) | Email + WhatsApp dual (4x/día) |
| **Análisis** | Solo reporte viernes básico | Python/Colab + GAS híbrido |
| **Motor Propio** | No tenía | Scanner V5 independiente (S&P 500) |

---

## Arquitectura V4

```
📁 v4/
├── 📁 gas/           → Google Apps Script (radar diario, alertas)
├── 📁 colab/         → Google Colab notebooks (análisis, backtesting)
├── 📁 docs/          → Documentación, screenshots, guías
└── 📁 config/        → Configuraciones, ejemplos de WL
```

### Flujo de trabajo semanal

```
SÁBADO — Fase 5: WL CDI desde PDF del Club
  │
  └──► Recibís el PDF del Club de Inversionistas
         • Andá a claude.ai (cuenta gratuita)
         • Adjuntás el PDF → pegás el prompt de `v4/docs/PROMPT_CLAUDE_PDF.md`
         • Claude extrae tabla en formato TSV → copiás y pegás en "📋 WL CDI"
         • Bonus: preguntale análisis cualitativo (sectores, novedades)

DOMINGO — Fase 3: Motor Propio V5 (opcional)
  │
  ├──► Ejecutás el **Motor Propio V5** en Colab (S&P 500)
  │      • Genera "📋 WL V5 Generado" con Score V4 incluido
  │      • ~200 tickers filtrados por momentum + SMA
  │
  └──► Verificás que "📋 WL CDI" tenga los tickers del Club

LUNES MAÑANA — Fase 1: Generar Radar
  │
  └──► Menú: "🔄 Generar Radar Semanal" — 3 opciones:
         • 📋 Solo WL CDI (Club) — recomendado si tenés CDI
         • 🤖 Solo WL V5 (Motor Propio) — si no hay CDI
         • 🔗 COMBINADO: CDI + V5 mergeados (prioriza CDI)
         • Consulta Yahoo Finance: precio, SMA20/50/200, ATH, ADX, RSI, Beta
         • Calcula Score V4 + Setup (Entrada/Stop/Target/R/R)
         • Guarda snapshot en "📊 Score Log V4" (nunca borrar)
         • Escribe "🎯 Radar Semanal" (fuente única de verdad)

LUNES MEDIODÍA — Tracker
  │
  └──► Copiás 2-3 tickers del Radar al "📈 Tracker Diario"
         • Se autocompletan solos (onEdit trigger)
         • Marcás Track=TRUE (col E) para recibir alertas

LUNES-VIERNES — Alertas automáticas
  │
  └──► 4x al día (9:30, 11:30, 13:30, 15:30 ET)
         • Email → duardo07@hotmail.com (CC: pz910531@hotmail.com)
         • WhatsApp → vía CallMeBot
         • Alertas: Target hit | Stop hit | Breakout | Danger
         • Dashboard se actualiza cada 1h (9:30–16:00 ET)

VIERNES — Fase 6: Backtesting
  │
  └──► Ejecutás `v4/colab/MTM_V6_Backtesting.ipynb`
         • Lee "📊 Score Log V4" (datos acumulados)
         • Descarga precios de cierre de Yahoo (1 semana después)
         • Calcula: Win rate por nivel, sector, R/R
         • Curva de equity simulada ($10,000 inicial)
         • Sharpe ratio, drawdown máximo, top/peores setups
         • Guarda resumen en "📊 Backtesting Resumen"
```

---

## El Score V4

### Fórmula (4 Pilares)

```
Score V4 = (Momentum × 0.35) + (FuerzaRel × 0.25) + (Tendencia × 0.25) + (Riesgo × 0.15)

Pilar 1 — Momentum (35%):
  • Perf Week  >20%=4pts | >15%=3 | >10%=2 | >5%=1 | >0%=0.5 | ≤0%=-1
  • Perf Month >20%=+2   | >10%=+1.5 | >0%=+0.5 | ≤0%=-0.5
  • Perf Qtr   >30%=+1   | >15%=+0.5

Pilar 2 — Fuerza Relativa (25%):
  • SCTR ≥98 = 5pts | ≥95=4.5 | ≥90=4 | ≥85=3 | ≥80=2 | ≥70=1 | ≥50=0.5
  • Si no hay SCTR pero distancia ATH <10% → +1.5

Pilar 3 — Tendencia (25%):
  • Precio > SMA200 → +1.5 | > SMA50 → +1.0 | > SMA20 → +0.5
  • ADX >30 → +2.0 | >25 → +1.5 | >20 → +1.0 | <15 → -1.0

Pilar 4 — Riesgo (15%):
  • RSI ≥50 → +1.5 | 40-50 → +0.5 | >80 → -1.5 | >70 → -0.5 | <40 → -0.5
  • Beta 0.8-1.5 → +0.5 | <0.8 → +1.0 | 1.5-2.5 → -0.5 | >2.5 → -1.0
  • ATR/LOW Verde → +1 | Rojo → -1
  • Earnings <7 días → -2 | <30 días → -1 | Pasado → +0.5
```

### Regla de oro

> **Si Score V4 < 2.0, no aparece en el Radar.** No es que tenga "bajo score", es que no cumple el mínimo de calidad.

> **Score ≥ 4.5 = 🟢 Alta Confianza | 3.0–4.5 = 🟡 Media | 2.0–3.0 = 🟠 Base | < 2.0 = 🔴 Fuera**

---

## Hojas de Google Sheets (V4)

| Hoja | Origen | Propósito | ⚠️ |
|---|---|---|---|
| `📋 WL CDI` | Pegado manual (Fase 5) | Input semanal del Club | No borrar historial |
| `📋 WL V5 Generado` | Colab Motor Propio | Scanner S&P 500 independiente | Se sobreescribe cada domingo |
| `🎯 Radar Semanal` | Generado por V4 | Ranking Score V4 + setup | **Fuente única de verdad** |
| `📈 Tracker Diario` | Tu selección manual | Alertas + seguimiento | Solo 2-3 tickers |
| `📊 Score Log V4` | Automático (cada Radar) | Historial para backtesting | **NUNA BORRAR** |
| `📊 Backtesting Resumen` | Colab Fase 6 | Métricas de rendimiento | Se sobreescribe cada viernes |
| `📊 Dashboard` | Apps Script | Tabla de seguimiento en vivo | Se actualiza cada 1h |

---

## Tecnologías

| Uso | Herramienta | Costo |
|---|---|---|
| Radar diario, alertas | Google Apps Script | **Gratis** |
| Análisis semanal, gráficos | Google Colab (Python) | **Gratis** |
| Precios e indicadores | Yahoo Finance API v8 | **Gratis** |
| Screener validación | Finviz (web scraping) | **Gratis** |
| Alertas | Gmail (MailApp GAS) | **Gratis** |

---

## Próximos pasos

### Fases completadas ✅
1. ✅ Fase 1: Radar + Tracker + Alertas
2. ✅ Fase 2: Motor Propio V5 (Colab)
3. ✅ Fase 3: Integración V5 → Radar (3 opciones de generación)
4. ✅ Fase 4: Independencia total (Radar Combinado)
5. ✅ Fase 5: Extractor PDF (manual con Claude.ai)
6. ✅ Fase 6: Backtesting (notebook Colab V6)

### Fase pendiente 🚧
7. **[ ]** Fase 7: Universo Propio — ampliar Motor Propio con NASDAQ-100 + Russell 2000 + tickers CDI históricos

### Próximas acciones sugeridas

**Semanal (cada viernes):**
- [ ] Ejecutar `MTM_V6_Backtesting.ipynb` en Colab
- [ ] Pegar `SPREADSHEET_ID` y correr todo (`Entorno de ejecución → Ejecutar todo`)
- [ ] Revisar métricas: win rate, sharpe ratio, drawdown
- [ ] Comparar "Todo el Radar" vs "Mis trades" (Tracker=SÍ)
- [ ] Guardar `.txt` automático en `Drive/MTM_V4_Resultados/`
- [ ] Descargar `.html` de Colab (`Archivo → Descargar → .html`) para gráficos
- [ ] Si hay tendencias claras (ej: Alta Confianza > 60% win rate), ajustar filtros

**Mensual (cada 4 semanas):**
- [ ] Revisar acumulado: ¿el sistema está mejorando o empeorando?
- [ ] Si win rate de "Alta Confianza" ≥ 55%, priorizar solo esas entradas
- [ ] Si un sector domina el backtesting, enfocarse allí temporalmente
- [ ] Si después de 2 meses el win rate < 45%, revisar el Score V4 o los umbrales

**Con capital de $2,000:**
- [ ] Operar máximo 2 tickers por semana
- [ ] Nunca más del 25% del capital por posición ($500 máximo)
- [ ] Solo entradas con Score ≥ 3.0 (Media o Alta confianza)
- [ ] R/R mínimo 2.5x (el riesgo debe valer la pena)
- [ ] Stop loss obligatorio al 4-5%
- [ ] Si no hay setups que califiquen, **no operar** (mejor preservar capital)
