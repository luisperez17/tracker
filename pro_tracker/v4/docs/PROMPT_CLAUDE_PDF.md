# 🧠 Prompt para Claude (Gratuito) — Extraer tabla del PDF del Club

## Cómo usarlo (2 minutos)

1. Andá a [claude.ai](https://claude.ai) e iniciá sesión con tu cuenta gratis.
2. Hacé clic en el **clip 📎** para adjuntar archivos.
3. Subí el **PDF del Club**.
4. Pegá el prompt de abajo en el chat.
5. Claude extraerá la tabla y te la devolverá en formato listo para copiar.
6. Copiá la tabla, andá a tu Google Sheet `📋 WL CDI`, pegala en la celda **A5**.

---

## 📋 PROMPT (copiar y pegar tal cual)

```
Extraé la tabla de tickers del Club de Inversionistas de este documento.

Requisitos:
1. Identificá la tabla principal con los tickers recomendados.
2. Para cada ticker extraé estos campos:
   - Ticker (símbolo, ej: AAPL)
   - Empresa (nombre completo si aparece)
   - Sector (industria)
   - ATR/LOW (señal: verde/amarillo/rojo, o ✅/⚠️/❌)
   - Earnings (fecha del próximo reporte)
   - Perf Sem % (rendimiento semanal)
   - Perf Mes % (rendimiento mensual)
   - SCTR (score 0-100)
   - RSI(14)
   - ADX(14)
   - Beta
   - ATR(14) (valor numérico)
   - EMA20

3. Si algún campo no aparece en la tabla, dejalo vacío.

4. Devolvé el resultado como una tabla con formato TSV (tab-separated values) o como tabla markdown, de modo que pueda copiarla y pegarla directamente en Google Sheets.

5. Al final, agregá una fila con el número total de tickers extraídos.

IMPORTANTE: No agregues explicaciones ni texto adicional. Solo la tabla.
```

---

## 📝 Ejemplo de respuesta esperada

Claude debería devolver algo como esto:

```
Ticker	Empresa	Sector	ATR/LOW	Earnings	Perf Sem %	Perf Mes %	SCTR	RSI(14)	ADX(14)	Beta	ATR(14)	EMA20
AAPL	Apple Inc	Technology	verde	07/28	+5.2%	+12.3%	95	62	28	1.2	4.5	185.40
TSLA	Tesla Inc	Automotive	amarillo	07/19	+3.1%	+8.7%	88	58	24	2.1	8.2	245.30
NVDA	NVIDIA Corp	Technology	verde	08/05	+8.4%	+22.1%	98	71	32	1.8	6.1	420.50
```

---

## 📌 Tips para pegar en Google Sheets

1. **Copiá** la tabla que te dio Claude.
2. Andá a tu Google Sheet → hoja `📋 WL CDI`.
3. Hacé clic en la celda **A5**.
4. Pegá con **Ctrl+V** (o Cmd+V en Mac).
5. Google Sheets debería separar automáticamente las columnas por tabulaciones.

Si no se separa bien:
- Menú `Datos → Texto a columnas`
- Elegí **Delimitado** → **Tabulación** → `Aceptar`

---

## 💡 Consejos adicionales

- Si Claude no encuentra todos los campos, no importa. Lo importante es que extraiga **Ticker** y **Empresa**.
- Los demás datos (SCTR, RSI, etc.) los completará el Radar automáticamente con Yahoo Finance al generarse.
- Si el PDF tiene varias páginas, podés pedirle: "Extraé la tabla de la página 3" o simplemente dejá que Claude revise todo el documento.

---

## 🎯 Bonus: Preguntále a Claude sobre patrones

Si querés aprovechar para hacer backtesting cualitativo, preguntale después de extraer la tabla:

```
Ahora analizá este PDF a nivel cualitativo:
1. ¿Qué sectores están más representados en esta lista?
2. ¿Qué tickers aparecen por primera vez vs semanas anteriores?
3. ¿Hay algún catalyst o evento que el Club esté monitoreando?
4. ¿Cuál es el setup técnico promedio de estos tickers (RSI, ADX, Beta)?
```

Guardá estas respuestas en un documento de Drive para análisis futuro.
