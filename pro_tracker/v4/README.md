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
| **Alertas** | WhatsApp (roto) | Email nativo (gratis) |
| **Análisis** | Solo reporte viernes básico | Python/Colab + GAS híbrido |

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
DOMINGO
  │
  ├──► Pegas el WL CDI en hoja "📋 WL CDI"
  ├──► Ejecutas "🔄 Actualizar Radar V4" (GAS)
  │      • Consulta Yahoo Finance: precio, SMA20/50/200, ATH
  │      • Consulta Finviz: Perf Week/Month/Quarter
  │      • Calcula Score V4 para todo el WL
  │      • Escribe hoja "🎯 Radar Semanal"
  │
  └──► Revisas el Radar, marcas 2-3 para trackear + 10 seguimiento ligero

LUNES-VIERNES (3x al día: 10am, 1pm, 3:45pm ET)
  │
  └──► Trigger automático:
         • Lee solo los marcados
         • Compara precio vs Entrada/Stop/Target
         • Email si: 🎯 Target hit | 🛑 Stop hit | 📈 Breakout

VIERNES
  │
  ├──► Ejecutas notebook Colab:
  │      • Lee Score Log completo
  │      • Curva de equity, win rate, drawdown
  │      • ¿Qué setup funcionó mejor?
  │
  └──► Guardas PDF del análisis en Drive
```

---

## El Score V4

### Fórmula

```
Score V4 = (Momentum × 0.50) + (Signal × 0.30) + (Risk × 0.20)

Momentum (base del CDI):
  • Perf Week > 20% = 5 pts | >15% = 4 | >10% = 3 | >5% = 1.5 | >0% = 0.5 | <0% = -2
  • Perf Month > 20% = +2 | >10% = +1 | <0% = -1
  • Perf Quarter > 30% = +1

Signal (validación Finviz):
  • Catalizador (Post Earnings / New High) = +3 pts
  • Momentum (YTD Top / Ganadores) = +2 pts
  • Confirmación (SMA / Uptrend) = +1 pts
  • Cruce T1 + T2 = +0.5 bonus

Risk (gestión del WL):
  • ATR/LOW Verde ✅ = +2 pts
  • ATR/LOW Amarillo ⚠️ = +0 pts
  • ATR/LOW Rojo ❌ = -2 pts (filtrar)
  • Earnings en <7 días = -2 pts
  • Earnings en <30 días = -1 pts
```

### Regla de oro

> **Si Score V4 < 2.0, no aparece en el Radar.** No es que tenga "bajo score", es que no cumple el mínimo de calidad.

---

## Hojas de Google Sheets (V4)

| Hoja | Origen | Propósito |
|---|---|---|
| `📋 WL CDI` | Pegado manual cada domingo | Input semanal del club |
| `🎯 Radar Semanal` | Generado por V4 | Ranking con Score V4, SMA, R/R |
| `📈 Tracker Diario` | Tu selección manual | Solo los que vas a operar (2-3) |
| `📊 Score Log` | Automático histórico | Precios y scores para backtesting |
| `🔬 Colab Output` | Pegado desde Colab | Gráficos, tablas de aprendizaje |

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

1. **[ ]** Crear hojas V4 en tu spreadsheet (Radar Semanal, Tracker Diario)
2. **[ ]** Subir scripts GAS desde `v4/gas/`
3. **[ ]** Probar con WL de esta semana
4. **[ ]** Configurar trigger de email (solo alertas, no spam)
5. **[ ]** Primera corrida del notebook Colab (viernes)
