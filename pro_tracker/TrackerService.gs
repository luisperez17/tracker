// ============================================================
// MTM TRACKER — SERVICIO DE SEGUIMIENTO SEMANAL
// ============================================================

/**
 * Configura la hoja de seguimiento semanal y logs de precios.
 */
function configurarSemanaTracker() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ui = SpreadsheetApp.getUi();

    var ws = ss.getSheetByName(SEMANA_SHEET);
    if (ws && ws.getLastRow() > 5) {
        var resp = ui.alert("⚠️ Conservar datos", "¿Deseas borrar los datos actuales para reconfigurar la hoja? (Si eliges NO, se cancelará la operación)", ui.ButtonSet.YES_NO);
        if (resp !== ui.Button.YES) return;
    }

    if (!ws) ws = ss.insertSheet(SEMANA_SHEET);
    formatearHojaSemana(ws);

    var log = ss.getSheetByName(LOG_SHEET);
    if (!log) {
        log = ss.insertSheet(LOG_SHEET);
        formatearScoreLog(log);
    }

    ss.toast("Semana Tracker listo.", "🎯 Semana Tracker", 8);
    ws.activate();
}

/**
 * Registra los precios y scores actuales en el Score Log.
 * Implementa la lógica secuencial: 10am crea fila y consulta Finviz, resto solo actualiza precio.
 */
function registrarPrecios(horaET, esManual) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName(SEMANA_SHEET);
    if (!ws || ws.getLastRow() < 6) {
        if (esManual) ss.toast("No hay datos en la hoja de Semana para registrar.", "⚠️", 5);
        return;
    }

    // 1. Obtener TODOS los tickers de la hoja Tracker
    var todos = obtenerTickersTrackeados();
    var listaCompleta = Object.keys(todos);

    if (listaCompleta.length === 0) {
        if (esManual) ss.toast("No se encontraron tickers para registrar.", "⚠️", 5);
        return;
    }

    var log = ss.getSheetByName(LOG_SHEET);
    if (!log) {
        log = ss.insertSheet(LOG_SHEET);
        formatearScoreLog(log);
    }

    var info = getInfoTiempoNY();
    var fechaHoy = new Date(info.fecha.getFullYear(), info.fecha.getMonth(), info.fecha.getDate());
    var fechaHoyStr = Utilities.formatDate(fechaHoy, "GMT", "yyyy-MM-dd");

    // DETERMINAR SI ES EL PRIMER REGISTRO DEL DÍA
    // Nota: Score Log tiene título en fila 1, encabezados en fila 2, datos desde fila 3
    var logRows = log.getLastRow();
    var isFirstOfDay = true;
    if (logRows >= 3) {
        var lastFecha = log.getRange(logRows, 1).getValue();
        var lastFechaStr = (lastFecha instanceof Date) ? Utilities.formatDate(lastFecha, "GMT", "yyyy-MM-dd") : "";
        if (lastFechaStr === fechaHoyStr) isFirstOfDay = false;
    }

    var is10AM = (horaET === 10);
    var colPrecio = obtenerColumnaPrecio(horaET);

    // --- CASO A: PRIMERA CAPTURA O 10 AM (SNAPSHOT COMPLETO) ---
    if (isFirstOfDay || is10AM) {
        ss.toast("📸 Generando snapshot diario (" + listaCompleta.length + " tickers)...", "📊 Score Log", 4);
        var scoreData = calcularScoreDiarioParaTickers(listaCompleta);
        var nuevasFilas = [];

        for (var i = 0; i < listaCompleta.length; i++) {
            var tk = listaCompleta[i];
            var precio = fetchPrecioYahoo(tk);
            var sd = scoreData[tk] || { score: 0, filtros: "" };

            // Construir fila (FECHA, TICKER, P. 10AM, SCORE, FILTROS, P. 11AM, P. 1PM, P. 2:30PM, P. 3:45PM, TRACKER?)
            var fila = [fechaHoy, tk, "", sd.score, sd.filtros, "", "", "", "", todos[tk].isTracked ? "SÍ" : "NO"];
            // Si la captura es de una hora específica, poner el precio en su sitio
            if (colPrecio >= 3 && colPrecio <= 9) {
                fila[colPrecio - 1] = precio;
            } else {
                fila[2] = precio; // Default 10am
            }

            nuevasFilas.push(fila);

            // Actualizar visual en Tracker (solo si está trackeado o es la hora justa)
            if (todos[tk].isTracked || is10AM) {
                actualizarCeldaSemana(ws, todos[tk], info.diaSemanaStr, horaET, precio);
            }
        }

        if (nuevasFilas.length > 0) {
            log.getRange(log.getLastRow() + 1, 1, nuevasFilas.length, 10).setValues(nuevasFilas);
            if (esManual) log.activate();
        }
        ss.toast("Snapshot completado.", "✅", 5);

    } else {
        // --- CASO B: ACTUALIZACIÓN INCREMENTAL (SOLO TRACKED) ---
        // Datos empiezan en fila 3 (fila 1 = título, fila 2 = encabezados)
        var logRange = logRows >= 3 ? log.getRange(3, 1, logRows - 2, 10) : null;
        var logData = logRange ? logRange.getValues() : [];
        var updCount = 0;

        ss.toast("Actualizando activos...", "⏳", 3);

        for (var j = 0; j < listaCompleta.length; j++) {
            var ticker = listaCompleta[j];
            if (!todos[ticker].isTracked) continue;

            var precioAct = fetchPrecioYahoo(ticker);
            if (precioAct === null) continue;

            var filaEncontrada = -1;
            for (var r = logData.length - 1; r >= 0; r--) {
                var fRowStr = (logData[r][0] instanceof Date) ? Utilities.formatDate(logData[r][0], "GMT", "yyyy-MM-dd") : "";
                if (fRowStr === fechaHoyStr && String(logData[r][1]).toUpperCase() === ticker) {
                    filaEncontrada = r + 3; // Offset fila 3
                    break;
                }
            }

            if (filaEncontrada !== -1) {
                log.getRange(filaEncontrada, colPrecio).setValue(precioAct);
                updCount++;
            } else {
                // Fallback extremo: si no existe y es tracked, la agregamos
                var sd = { score: 0, filtros: "" };
                var nuevaFila = [fechaHoy, ticker, "", 0, "", "", "", "", "", "SÍ"];
                log.appendRow(nuevaFila);
                log.getRange(log.getLastRow(), colPrecio).setValue(precioAct);
            }

            actualizarCeldaSemana(ws, todos[ticker], info.diaSemanaStr, horaET, precioAct);
        }
        ss.toast(updCount + " registros actualizados.", "📊 Score Log", 5);
    }

    // WHATSAPP: Solo para los que tienen Check
    var activasParaReporte = Object.values(todos).filter(function(t) { return t.isTracked; });
    if (activasParaReporte.length > 0) {
        // Asegurar precio actual para el resumen
        activasParaReporte.forEach(function(t) {
            if (!t.precioActual) t.precioActual = fetchPrecioYahoo(t.ticker);
        });
        enviarResumenWhatsApp(activasParaReporte);
    }
}

/**
 * Actualiza una celda específica en la hoja del Tracker Semanal basada en la hora ET.
 */
function actualizarCeldaSemana(ws, cand, diaNomStr, horaET, precio) {
    var diasMap = { "LUNES": 1, "MARTES": 2, "MIÉRCOLES": 3, "JUEVES": 4, "VIERNES": 5 };
    var d = diasMap[diaNomStr.toUpperCase()];
    if (!d) return;

    var checkNum = HORAS_CHECK.indexOf(horaET) + 1;
    if (checkNum === 0) return;

    var col = COL_PRECIOS_INI + (d - 1) * 5 + (checkNum - 1);
    var cell = ws.getRange(cand.row, col);

    var precioNum = Number(precio);
    if (isNaN(precioNum) || precioNum <= 0) return;

    cell.setValue(precioNum).setNumberFormat('"$"#,##0.00').setFontSize(8).setHorizontalAlignment("center");

    // Formato condicional básico vs Entrada
    if (cand.entrada > 0) {
        if (precioNum >= cand.entrada * 1.05) cell.setBackground("#E8F5E9").setFontColor("#1B5E20").setFontWeight("bold");
        else if (precioNum <= cand.entrada * 0.96) cell.setBackground("#FFEBEE").setFontColor("#B71C1C").setFontWeight("bold");
    }
}

/**
 * Determina qué columna del Score Log corresponde a cada hora.
 */
function obtenerColumnaPrecio(horaET) {
    if (horaET === 10) return 3;
    if (horaET === 11) return 6;
    if (horaET === 13) return 7;
    if (horaET === 14.5) return 8;
    if (horaET === 15.75) return 9;
    return 3;
}

/**
 * Consulta Finviz solo para los filtros Tier 1 y 2 para calcular el score de los tickers activos.
 */
function calcularScoreDiarioParaTickers(listaTickers) {
    var resultados = {};
    listaTickers.forEach(function(tk) { resultados[tk] = { score: 0, filtros: [] }; });

    TIER_10AM.forEach(function(fKey) {
        var filtro = FILTROS.find(function(f) { return f.key === fKey; });
        if (!filtro) return;

        try {
            var html = fetchFinviz(filtro.baseUrl);
            if (!html) return;
            var tickersEnFiltro = parsearV111(html, 100).map(function(a) { return a.ticker; });

            var pts = TIER_SCORES[fKey] ? TIER_SCORES[fKey].pts : 1;
            var label = TIER_SCORES[fKey] ? TIER_SCORES[fKey].label : fKey;

            listaTickers.forEach(function(tk) {
                if (tickersEnFiltro.indexOf(tk) >= 0) {
                    resultados[tk].score += pts;
                    resultados[tk].filtros.push(label);
                }
            });
            Utilities.sleep(800);
        } catch(e) { Logger.log("Error score 10am: " + e.message); }
    });

    // Limpiar etiquetas de filtros
    listaTickers.forEach(function(tk) {
        resultados[tk].filtros = resultados[tk].filtros.join(", ");
    });

    return resultados;
}

function enviarResumenWhatsApp(activas) {
    try {
        if (!WS_PHONE || WS_PHONE.indexOf("...") >= 0 || !WS_API_KEY) {
            SpreadsheetApp.getActive().toast("Falta configurar el teléfono o API Key de WhatsApp.", "⚠️", 5);
            return;
        }
        if (!activas || activas.length === 0) {
            SpreadsheetApp.getActive().toast("No hay acciones activas para reportar.", "⚠️", 3);
            return;
        }

        var info = getInfoTiempoNY();
        var h = info.hora;
        var dia = info.diaSemanaStr;

        var msg = "📊 *RESUMEN MTM — " + dia + " " + h + ":00 NY*\n\n";
        msg += "```\n";
        msg += "TKR    ENT    ACT    RET% \n";
        msg += "────   ────   ────   ─────\n";

        var counts = { target: 0, stop: 0, profit: 0, loss: 0 };

        activas.forEach(function(cand) {
            var tk = (cand.ticker + "    ").substring(0, 4);
            var precio = Number(cand.precioActual) || 0;
            var entrada = Number(cand.entrada) || 0;
            var pnl = entrada > 0 ? ((precio - entrada) / entrada) : 0;

            var icon = "⚪";
            if (cand.target > 0 && precio >= cand.target) { icon = "🎯"; counts.target++; }
            else if (cand.stop > 0 && precio <= cand.stop) { icon = "🛑"; counts.stop++; }
            else if (pnl > 0) { icon = "📈"; counts.profit++; }
            else { icon = "📉"; counts.loss++; }

            var pnlStr = (pnl * 100).toFixed(1);
            if (pnl > 0) pnlStr = "+" + pnlStr;

            // Alineación manual de columnas para la "Grilla" (Monospace)
            var colEnt = (entrada.toFixed(1) + "      ").substring(0, 6);
            var colAct = (precio.toFixed(1) + "      ").substring(0, 6);
            var colRet = (pnlStr + "%      ").substring(0, 7);

            msg += tk + "   " + colEnt + " " + colAct + " " + colRet + icon + "\n";
        });

        msg += "```\n";
        msg += "\n*Estatus*: " + counts.target + " 🎯 | " + counts.stop + " 🛑 | " + counts.profit + " 📈 | " + counts.loss + " 📉";

        enviarWhatsApp(msg);
        SpreadsheetApp.getActive().toast("Reporte 'Grid' enviado a WhatsApp.", "📱", 3);

    } catch (e) {
        Logger.log("Error en enviarResumenWhatsApp: " + e.toString());
        SpreadsheetApp.getActive().toast("Error al enviar reporte: " + e.message, "❌", 6);
    }
}


/**
 * Generar el reporte consolidado del viernes leyendo del Score Log y comparando con los objetivos del Tracker.
 */
/**
 * Generar el reporte consolidado del viernes leyendo del Score Log y comparando con los objetivos del Tracker.
 */
function generarReporteViernes() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var log = ss.getSheetByName(LOG_SHEET);
    if (!log || log.getLastRow() < 3) {
        ss.toast("No hay datos en el Score Log para generar el reporte.", "⚠️", 5);
        return;
    }

    // 1. Obtener contexto de trades desde el Tracker (Entrada, Stop, Target)
    var todos = obtenerTickersTrackeados();

    // 2. Definir rango de la semana actual (Lunes a Viernes)
    var info = getInfoTiempoNY();
    var now = info.fecha;
    var day = now.getDay();
    var diff = now.getDate() - day + (day === 0 ? -6 : 1); // Lunes
    var lunes = new Date(now.setDate(diff));
    lunes.setHours(0,0,0,0);
    var viernes = new Date(lunes.getTime() + 4 * 24 * 60 * 60 * 1000);
    viernes.setHours(23,59,59,999);

    // Datos empiezan en fila 3 (fila 1 = título, fila 2 = encabezados)
    var logData = log.getRange(3, 1, log.getLastRow() - 2, 10).getValues();
    var stats = {}; // Ticker -> { ticker, inicio, fin, pMax, pMin, sumScore, countScore, filtros: Set, entries: [] }

    // 3. Agrupar datos del Log por Ticker para la semana actual
    for (var i = 0; i < logData.length; i++) {
        var fecha = new Date(logData[i][0]);
        if (fecha >= lunes && fecha <= viernes) {
            var tk = logData[i][1];

            // Solo procesar si está trackeado (según solicitud del usuario)
            if (!todos[tk] || !todos[tk].isTracked) continue;

            if (!stats[tk]) {
                var infoT = todos[tk];
                stats[tk] = {
                    ticker: tk,
                    inicio: infoT.entrada || null,
                    fin: null,
                    pMax: 0,
                    pMin: 999999,
                    sumScore: 0,
                    countScore: 0,
                    filtros: new Set(),
                    fechaRef: fecha,
                    entries: [],
                    rr: infoT.entrada > 0 && infoT.stop > 0 ? (infoT.target - infoT.entrada) / (infoT.entrada - infoT.stop) : 0,
                    target: infoT.target,
                    stop: infoT.stop
                };
            }

            // Consolidar Score y Filtros
            var scoreRow = parseFloat(logData[i][3]) || 0;
            var filtrosRow = String(logData[i][4] || "");
            if (scoreRow > 0) {
                stats[tk].sumScore += scoreRow;
                stats[tk].countScore++;
                filtrosRow.split(",").forEach(function(f) { if(f.trim()) stats[tk].filtros.add(f.trim()); });
            }

            // Capturar precios del día
            var dailyPrices = [];
            var priceIndices = [2, 5, 6, 7, 8];
            for (var pi = 0; pi < priceIndices.length; pi++) {
                var p = parseFloat(logData[i][priceIndices[pi]]);
                dailyPrices.push(p > 0 ? p : null);
                if (p > 0) {
                    if (stats[tk].inicio === null) stats[tk].inicio = p;
                    stats[tk].fin = p;
                    if (p > stats[tk].pMax) stats[tk].pMax = p;
                    if (p < stats[tk].pMin) stats[tk].pMin = p;
                }
            }
            stats[tk].entries.push({ fecha: fecha, prices: dailyPrices });
        }
    }

    var ranking = Object.values(stats);
    if (ranking.length === 0) {
        ss.toast("No hay acciones con 'Check' registradas esta semana.", "⚠️", 5);
        return;
    }

    // 4. Lógica de Negocio y Métricas
    var totalChecks = 0;
    var winnersCount = 0;
    var dayMinMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; // L-V
    var rrBajo = [];
    var rrAlto = [];
    var hitTargetList = [];
    var hitStopList = [];

    ranking.forEach(function(s) {
        // Ordenar entradas cronológicamente
        s.entries.sort(function(a, b) { return a.fecha - b.fecha; });

        var hitTarget = false;
        var hitStop = false;
        var finished = false;
        var minPrice = 999999;
        var dayOfMin = -1;

        s.entries.forEach(function(entry) {
            var d = entry.fecha.getDay();
            entry.prices.forEach(function(p) {
                if (p > 0) {
                    totalChecks++;
                    if (p < minPrice) { minPrice = p; dayOfMin = d; }

                    if (!finished) {
                        if (s.target > 0 && p >= s.target) { hitTarget = true; finished = true; }
                        else if (s.stop > 0 && p <= s.stop) { hitStop = true; finished = true; }
                    }
                }
            });
        });

        if (dayOfMin >= 1 && dayOfMin <= 5) dayMinMap[dayOfMin]++;
        if (hitTarget) { winnersCount++; hitTargetList.push(s.ticker); }
        if (hitStop) hitStopList.push(s.ticker);

        if (s.rr >= 2) rrAlto.push(s.ticker);
        else rrBajo.push(s.ticker);

        s.hitTarget = hitTarget;
        s.hitStop = hitStop;
        s.pnlFinal = s.inicio > 0 ? (s.fin - s.inicio) / s.inicio : 0;
        s.pnlPct = s.pnlFinal; // Asegurar compatibilidad con actualizarResumenSemana
        s.pnlMax = s.inicio > 0 ? (s.pMax - s.inicio) / s.inicio : 0;
    });

    // Determinar mejor día global
    var diasNombres = ["", "Lun", "Mar", "Mie", "Jue", "Vie"];
    var mejorDiaIdx = 1;
    for (var dIdx = 2; dIdx <= 5; dIdx++) {
        if (dayMinMap[dIdx] > dayMinMap[mejorDiaIdx]) mejorDiaIdx = dIdx;
    }
    var mejorDiaStr = diasNombres[mejorDiaIdx] + " — precios más bajos en " + dayMinMap[mejorDiaIdx] + " candidatas";

    // Ordenar ranking para Mejor/Peor
    ranking.sort(function(a, b) { return b.pnlFinal - a.pnlFinal; });
    var mejor = ranking[0];
    var peor = ranking[ranking.length - 1];

    // 5. Preparar filas de APRENDIZAJE
    var filasAprendizaje = [
        ["🏆 Mejor candidata de la semana", mejor.ticker + " → " + (mejor.pnlFinal * 100).toFixed(2) + "%", "¿Tenía R/R ≥ 2x y 3+ filtros Finviz? Si sí, es el setup ideal que buscas cada semana."],
        ["💀 Peor candidata de la semana", peor.ticker + " → " + (peor.pnlFinal * 100).toFixed(2) + "%", "¿Tenía R/R bajo o pocos filtros? Una pérdida con stop controlado es mejor que aguantar."],
        ["✅ En ganancia", winnersCount + " de " + ranking.length, "Si > 50%, selección buena. Si < 40%, revisar criterios de entrada de la semana siguiente."],
        ["⚠️ Candidatas con R/R < 2x (no debían entrar)", rrBajo.length > 0 ? rrBajo.join(", ") : "Ninguna", "El sistema dice no entrar, pero se trackea para aprender. Si subieron, observa si fue por suerte o por un catalizador que no tenías en cuenta."],
        ["📐 Candidatas con R/R ≥ 2x (sí podían entrar)", rrAlto.length > 0 ? rrAlto.join(", ") : "Ninguna", "Estas sí cumplían la regla. Compara su resultado con las de R/R < 2x — la diferencia a largo plazo justifica la disciplina."],
        ["🎯 Tocaron el target", hitTargetList.length > 0 ? hitTargetList.join(", ") : "Ninguna", "¿Eran las de mejor R/R y más filtros? La calidad del setup debe correlacionar con alcanzar el target."],
        ["🛑 Tocaron el stop", hitStopList.length > 0 ? hitStopList.join(", ") : "Ninguna", "Pérdidas controladas. ¿El stop era técnico (bajo soporte) o arbitrario?"],
        ["📅 Mejor día global para entrar", mejorDiaStr, "Si aparece consistente en 3-4 semanas, ese día es tu ventana de entrada natural en el mercado."],
        ["📊 Checks registrados promedio", (totalChecks / ranking.length).toFixed(1) + " de 25 posibles", "25 checks/semana = 5 días × 5 horas. A más semanas acumuladas, mejor identificas el patrón intraday."]
    ];

    // 6. Preparar filas de TABLA DETALLADA
    var filasReporte = ranking.map(function(s) {
        var scoreProm = s.countScore > 0 ? (s.sumScore / s.countScore) : 0;
        var estatus = "—";
        if (s.hitTarget) estatus = "🎯 TARGET HIT";
        else if (s.hitStop) estatus = "🛑 STOP HIT";
        else if (s.pnlFinal > 0) estatus = "📈 PROFIT";
        else if (s.pnlFinal < 0) estatus = "📉 LOSS";

        return [
            s.fechaRef,
            s.ticker,
            scoreProm.toFixed(1),
            Array.from(s.filtros).join(", "),
            s.inicio,
            s.fin,
            s.pMax, // Usamos pMax en la columna 7 (PnL Max) antes del PnL Final
            s.pnlFinal,
            estatus
        ];
    });

    // 7. ESCRIBIR EN LA HOJA
    var wsRep = ss.getSheetByName(REPORT_SHEET);
    if (!wsRep) wsRep = ss.insertSheet(REPORT_SHEET);
    formatearHojaReporte(wsRep);

    // Escribir Aprendizaje (Filas 5 a 13)
    wsRep.getRange(5, 1, filasAprendizaje.length, 3).setValues(filasAprendizaje);

    // Escribir Detalle (Fila 18 en adelante)
    var startRow = 18;
    if (filasReporte.length > 0) {
        wsRep.getRange(startRow, 1, filasReporte.length, 9).setValues(filasReporte);

        // Formatos Detalle
        for (var r = 0; r < filasReporte.length; r++) {
            var row = startRow + r;
            wsRep.getRange(row, 1).setNumberFormat("dd/mm/yyyy");
            wsRep.getRange(row, 5, 1, 3).setNumberFormat('"$"#,##0.00');
            wsRep.getRange(row, 8).setNumberFormat("+0.00%;-0.00%").setFontWeight("bold").setFontColor(filasReporte[r][7] >= 0 ? C.GREEN : C.RED);

            var statusCell = wsRep.getRange(row, 9);
            if (filasReporte[r][8].indexOf("TARGET") >= 0) statusCell.setBackground(C.LGREEN).setFontColor(C.GREEN).setFontWeight("bold");
            else if (filasReporte[r][8].indexOf("STOP") >= 0) statusCell.setBackground("#FFEBEE").setFontColor(C.RED).setFontWeight("bold");
            wsRep.setRowHeight(row, 22);
        }
    }

    // 8. Actualizar Tracker Semanal Visualmente
    actualizarResumenSemana(ranking);

    wsRep.activate();
    ss.toast("Reporte semanal generado con éxito.", "✅", 5);
}



/**
 * Función de prueba para validar la conexión con WhatsApp.
 */
function testWhatsApp() {
    enviarWhatsApp("🚀 MTM Tracker: Prueba de conexión exitosa. El sistema de alertas está activo.");
    SpreadsheetApp.getActiveSpreadsheet().toast("Mensaje de prueba enviado. Revisa tu WhatsApp.", "📱", 4);
}

/**
 * Resetea los datos para una nueva semana de trading.
 * En esta versión PRO-LOG, NO se borra el Score Log.
 */
function resetearSemana() {
    var ui = SpreadsheetApp.getUi();
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var resp = ui.alert("🔄 Reset Semanal", "¿Confirmas el cierre de semana? (Se guardará el historial pero NO se borrará el Score Log)", ui.ButtonSet.YES_NO);
    if (resp !== ui.Button.YES) return;

    // 1. Guardar historial en la hoja de historial (opcional, como respaldo extra)
    // En la nueva lógica, el Score Log ya es el historial. Pero podemos guardar un resumen.
    // guardarHistorialSemana(generarRankingParaHistorial());

    var ws = ss.getSheetByName(SEMANA_SHEET);
    if (ws && ws.getLastRow() >= 6) {
        // Desactivar todos los checks de 'Track' para empezar la semana eligiendo de nuevo
        // Columna E (index 5)
        var lastR = ws.getLastRow();
        ws.getRange(6, 5, lastR - 5, 1).setValue(false);

        // Limpiar solo las columnas de precios y resumen de la vista actual
        // No borramos los tickers, así la hoja crece como histórico
        ws.getRange(6, COL_PRECIOS_INI, lastR - 5, 30).clearContent().clearFormat();

        ws.getRange(3, 2).setValue("Semana del " + new Date().toLocaleDateString("es"));
    }

    ss.toast("Semana reseteada. El Score Log permanece intacto.", "🔄", 5);
}

/**
 * Guarda el resumen de la semana en la hoja de historial.
 */
function guardarHistorialSemana(ranking) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hist = ss.getSheetByName("📚 Historial Semanal");
    if (!hist) {
        hist = ss.insertSheet("📚 Historial Semanal");
        formatearHistorialSemanal(hist);
    }

    var semanaStr = new Date().toLocaleDateString("es");
    var filas = ranking.map(function(r) {
        return [
            semanaStr, r.ticker, r.empresa, r.sector, r.scoreMTM || "", r.filtrosStr || "",
            r.entrada || "", r.stop || "", r.target || "", r.rr || "",
            r.rr >= 2 ? "✅ Sí" : "❌ No", r.pLunes || "", r.pVie || "", r.pnlPct || 0,
            r.hitTarget ? "★ Sí" : "—", r.hitStop ? "✗ Sí" : "—",
            r.mejorHora || "", r.tend || "", r.numChecks || 0
        ];
    });

    if (filas.length === 0) return;
    hist.getRange(hist.getLastRow() + 1, 1, filas.length, 19).setValues(filas);
    ss.toast("Historial actualizado.", "📚", 4);
}

/**
 * Actualiza el resumen de resultados en la hoja activo del Tracker.
 * @param {Array<Object>} ranking - Listado de estadísticas por ticker.
 */
function actualizarResumenSemana(ranking) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName(SEMANA_SHEET);
    if (!ws || !ranking) return;

    var wlData = ws.getRange(6, 1, MAX_CAND, 1).getValues();
    var filaMap = {};
    for (var i = 0; i < wlData.length; i++) {
        var tk = String(wlData[i][0]).trim().toUpperCase();
        if (tk) filaMap[tk] = 6 + i;
    }

    ranking.forEach(function(r) {
        var row = filaMap[r.ticker];
        if (!row) return;

        // PnL % (Columna AN - 40) -> Según COL_RESUMEN_INI = 39
        ws.getRange(row, COL_RESUMEN_INI).setValue(r.pnlPct).setNumberFormat("0.00%").setBackground(r.pnlPct >= 0 ? "#E8F5E9" : "#FFEBEE");

        // Tgt / Stop
        ws.getRange(row, COL_RESUMEN_INI + 1).setValue(r.hitTarget ? "★ SÍ" : "—").setFontColor(r.hitTarget ? C.GREEN : C.GRAY);
        ws.getRange(row, COL_RESUMEN_INI + 2).setValue(r.hitStop ? "✗ SÍ" : "—").setFontColor(r.hitStop ? C.RED : C.GRAY);

        // P. Máximo (Mejor precio alcanzado en la semana)
        ws.getRange(row, COL_RESUMEN_INI + 3).setValue(r.pMax || "").setNumberFormat('"$"#,##0.00').setFontSize(8);
    });
}

/**
 * Sanitiza y limpia decimales pegados como texto en la hoja del Tracker.
 */
function sanitizarDecimalesSemana() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName(SEMANA_SHEET);
    if (!ws) return;

    var corregidos = 0;
    for (var r = 6; r <= 6 + MAX_CAND - 1; r++) {
        for (var c = 6; c <= 8; c++) { // Entrada, Stop, Target
            var cell = ws.getRange(r, c);
            var val = cell.getValue();
            var num = limpiarValor(val);
            if (num !== null && num > 0) {
                cell.setValue(num).setNumberFormat('"$"#,##0.00');
                corregidos++;
            }
        }
    }
    ss.toast(corregidos + " valores corregidos en Semana Tracker.", "✅", 4);
}

/**
 * Sanitiza y limpia decimales en la hoja de Operaciones.
 */
function sanitizarDecimalesOperaciones() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName("📈 Operaciones");
    if (!ws) return;

    var corregidos = 0;

    // 1: Limpiar B2 (Capital Inicial)
    var cellB2 = ws.getRange(2, 2);
    var numB2 = limpiarValor(cellB2.getValue());
    if (numB2 !== null) {
        cellB2.setValue(numB2).setNumberFormat('"$"#,##0.00');
        corregidos++;
    }

    var lastRow = ws.getLastRow();
    if (lastRow < 8) return;

    // 2: Limpiar lista I(9), J(10), L(12)
    var cols = [9, 10, 12];
    for (var r = 8; r <= lastRow; r++) {
        for (var i = 0; i < cols.length; i++) {
            var cell = ws.getRange(r, cols[i]);
            var val = cell.getValue();
            var num = limpiarValor(val);
            if (num !== null && num > 0) {
                cell.setValue(num).setNumberFormat('"$"#,##0.00');
                corregidos++;
            }
        }
    }
    ss.toast(corregidos + " valores corregidos en Operaciones.", "✅", 4);
}
/**
 * Envía el resumen de WhatsApp manualmente con los datos actuales.
 */
function enviarResumenManual() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName(SEMANA_SHEET);
    if (!ws) return;

    var lastCol = ws.getLastColumn();
    var data = ws.getRange(6, 1, MAX_CAND, lastCol).getValues();
    var activas = [];

    for (var i = 0; i < data.length; i++) {
        var tk = String(data[i][0]).trim();
        var active = data[i][4]; // Col E (Active)
        if (tk && active === true) {
            // Buscamos el último precio registrado en las columnas de la derecha
            var ultimoPrecio = 0;
            // Columnas de precios empiezan en COL_PRECIOS_INI (col 14, index 13)
            for (var c = COL_PRECIOS_INI - 1; c < data[i].length; c++) {
               var val = limpiarValor(data[i][c]);
               if (val !== null && val > 0) ultimoPrecio = val;
            }

            var entrada = limpiarValor(data[i][5]) || 0;
            activas.push({
                ticker: tk,
                entrada: entrada,
                stop: limpiarValor(data[i][6]) || 0,
                target: limpiarValor(data[i][7]) || 0,
                precioActual: ultimoPrecio || entrada || 0
            });
        }
    }

    if (activas.length > 0) {
        enviarResumenWhatsApp(activas);
        ss.toast("Resumen enviado a WhatsApp.", "📱", 4);
    } else {
        ss.toast("No hay acciones activas para reportar.", "⚠️", 4);
    }
}

/**
 * Obtiene todos los tickers de la hoja semanal, marcando cuáles están activos para seguimiento detallado.
 */
function obtenerTickersTrackeados() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName(SEMANA_SHEET);
    var todos = {};
    if (!ws || ws.getLastRow() < 6) return todos;

    var data = ws.getRange(6, 1, ws.getLastRow() - 5, 14).getValues();
    for (var i = 0; i < data.length; i++) {
        var tk = String(data[i][0]).trim().toUpperCase();
        if (tk) {
            todos[tk] = {
                ticker: tk,
                empresa: data[i][1],
                sector: data[i][2],
                entrada: parseFloat(data[i][5]) || 0,
                stop: parseFloat(data[i][6]) || 0,
                target: parseFloat(data[i][7]) || 0,
                score: data[i][12],
                filtros: data[i][13],
                isTracked: data[i][4] === true, // Check de la columna E
                row: 6 + i
            };
        }
    }
    return todos;
}

/**
 * Simulación manual para probar el check de las 10am (captura total).
 */
function testRegistrar10am() {
    registrarPrecios(10, true);
}

/**
 * Verificación diaria: consulta Finviz Tier 1/2 SOLO para tickers en Semana Tracker + Top 10.
 * Guarda resultados en 🔍 Verificación (Score Hoy vs Inicial).
 * NO regenera Top Candidatos completo.
 * @returns {Array<Object>} Datos de verificación para usar en el reporte.
 */
function verificarSemanaTracker() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var topSheet = ss.getSheetByName("🏆 Top Candidatos");
    var semSheet = ss.getSheetByName(SEMANA_SHEET);
    var verifSheet = ss.getSheetByName("🔍 Verificación");
    if (!verifSheet) {
        verifSheet = ss.insertSheet("🔍 Verificación");
        formatearHojaVerificacion(verifSheet);
    }

    // 1. Reunir tickers: todas las filas de Semana Tracker + Top 10
    var tickersSet = {};
    var topMap = {}; // ticker -> score inicial, empresa

    if (semSheet && semSheet.getLastRow() >= 6) {
        var semData = semSheet.getRange(6, 1, semSheet.getLastRow() - 5, 14).getValues();
        for (var s = 0; s < semData.length; s++) {
            var tk = String(semData[s][0]).trim().toUpperCase();
            if (tk) tickersSet[tk] = { empresa: semData[s][1] || "", tracked: semData[s][4] === true };
        }
    }

    if (topSheet && topSheet.getLastRow() >= 5) {
        var nFiltros = FILTROS.length;
        var colScore = 9 + nFiltros + 1;
        var topData = topSheet.getRange(5, 1, Math.min(10, topSheet.getLastRow() - 4), colScore).getValues();
        for (var t = 0; t < topData.length; t++) {
            var tk = String(topData[t][0]).trim().toUpperCase();
            if (!tk) continue;
            topMap[tk] = {
                scoreInicial: parseFloat(topData[t][colScore - 1]) || 0,
                empresa: topData[t][1] || "",
                price: topData[t][6] || ""
            };
            if (!tickersSet[tk]) tickersSet[tk] = { empresa: topData[t][1] || "", tracked: false };
        }
    }

    var listaTickers = Object.keys(tickersSet);
    if (listaTickers.length === 0) return [];

    // 2. Consultar Finviz Tier 1/2 (rápido)
    var scoreData = calcularScoreDiarioParaTickers(listaTickers);

    // 3. Leer WL para marcar
    var wlSet = {};
    var wlSheet = ss.getSheetByName("📋 WL CDI");
    if (wlSheet && wlSheet.getLastRow() >= 5) {
        var wlData = wlSheet.getRange(5, 1, wlSheet.getLastRow() - 4, 1).getValues();
        for (var w = 0; w < wlData.length; w++) {
            var wlTk = String(wlData[w][0]).trim().toUpperCase();
            if (wlTk) wlSet[wlTk] = true;
        }
    }

    // 4. Armar datos de verificación
    var verifData = [];
    for (var i = 0; i < listaTickers.length; i++) {
        var tk = listaTickers[i];
        var infoTk = tickersSet[tk];
        var topInfo = topMap[tk] || { scoreInicial: 0, empresa: infoTk.empresa, price: "" };
        var scoreHoy = scoreData[tk] ? scoreData[tk].score : 0;
        var filtrosHoy = scoreData[tk] ? scoreData[tk].filtros : "";
        var diff = Math.round((scoreHoy - topInfo.scoreInicial) * 100) / 100;

        // Precio actual
        var precio = fetchPrecioYahoo(tk);
        if (precio === null) precio = topInfo.price || 0;

        // Estado
        var estado = "⚪";
        if (infoTk.tracked && topInfo.scoreInicial > 0) {
            var precioIni = parseFloat(topInfo.price) || precio || 1;
            var pnl = (precio - precioIni) / precioIni;
            if (pnl >= 0.05) estado = "🎯";
            else if (pnl <= -0.05) estado = "🛑";
            else if (diff > 0) estado = "📈 Score";
            else if (diff < 0) estado = "📉 Score";
        }

        verifData.push({
            ticker: tk,
            empresa: topInfo.empresa || infoTk.empresa,
            scoreInicial: topInfo.scoreInicial,
            scoreHoy: scoreHoy,
            diff: diff,
            filtrosHoy: filtrosHoy,
            precio: precio,
            wl: wlSet[tk] ? "⭐" : "",
            estado: estado,
            tracked: infoTk.tracked
        });
    }

    // 5. Escribir en hoja Verificación (limpiar antes)
    var lr = verifSheet.getLastRow();
    if (lr >= 5) verifSheet.getRange(5, 1, lr - 4, 9).clearContent().clearFormat();
    verifSheet.getRange(2, 1, 1, 9).merge().setValue("Verificación: " + new Date().toLocaleString("es"))
        .setBackground(C.ACCENT).setFontColor(C.YELLOW).setFontWeight("bold").setFontSize(9);

    for (var r = 0; r < verifData.length; r++) {
        var d = verifData[r];
        var row = 5 + r;
        var bg = d.tracked ? "#FFF8E1" : (r % 2 === 0 ? C.LIGHT : C.WHITE);
        verifSheet.getRange(row, 1, 1, 9).setValues([[d.ticker, d.empresa, d.scoreInicial, d.scoreHoy, d.diff, d.filtrosHoy, d.precio, d.wl, d.estado]])
            .setBackground(bg).setFontSize(9).setVerticalAlignment("middle").setHorizontalAlignment("center");
        verifSheet.getRange(row, 5).setFontColor(d.diff > 0 ? C.GREEN : (d.diff < 0 ? C.RED : C.GRAY)).setFontWeight("bold");
    }

    return verifData;
}

/**
 * Reporte de verificación diaria a las 9am ET.
 * Paso 1: ejecuta verificarSemanaTracker() (consulta Tier 1/2 liviano).
 * Paso 2: lee 🔍 Verificación y envía WhatsApp.
 * Se ejecuta automáticamente de lunes a viernes.
 */
function reporteVerificacion9AM() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var info = getInfoTiempoNY();
    var diaStr = info.diaSemanaStr;

    // 1. Ejecutar verificación (consulta Finviz Tier 1/2 y guarda en hoja)
    var verifData = verificarSemanaTracker();

    // 2. Separar: activas vs oportunidades
    var activas = verifData.filter(function(d) { return d.tracked; });
    var noActivas = verifData.filter(function(d) { return !d.tracked; });
    noActivas.sort(function(a, b) { return b.scoreHoy - a.scoreHoy; });
    var top5 = noActivas.slice(0, 5);

    // 3. Obtener precios actuales y PnL para activas
    for (var i = 0; i < activas.length; i++) {
        var a = activas[i];
        var precio = fetchPrecioYahoo(a.ticker);
        if (precio === null) precio = a.precio;
        a.precioActual = precio;
        var precioRef = parseFloat(a.precio) || 0;
        a.pnl = precioRef > 0 ? (precio - precioRef) / precioRef : 0;
    }

    // 4. Armar mensaje WhatsApp
    var msg = "🔍 *VERIFICACIÓN 9AM — " + diaStr + "*\n";
    msg += "_Scores actualizados con Finviz Tier 1/2_\n\n";

    if (activas.length > 0) {
        msg += "*ACTIVAS EN TRACKER:*\n";
        msg += "```\n";
        msg += "TKR   S+/-  S-HOY  PREC  RET%  EST\n";
        msg += "───   ───   ───   ───  ────  ─────\n";
        for (var a = 0; a < activas.length; a++) {
            var ra = activas[a];
            var tk = (ra.ticker + "     ").substring(0, 5);
            var dStr = (ra.diff >= 0 ? "+" : "") + ra.diff.toFixed(1);
            dStr = (dStr + "     ").substring(0, 4);
            var sHoy = (String(ra.scoreHoy) + "     ").substring(0, 4);
            var pr = (ra.precioActual.toFixed(1) + "     ").substring(0, 4);
            var ret = ((ra.pnl * 100).toFixed(1) + "%    ").substring(0, 5);
            if (ra.pnl > 0) ret = "+" + ret;
            var est = ra.estado;
            msg += tk + " " + dStr + " " + sHoy + " " + pr + " " + ret + " " + est + "\n";
        }
        msg += "```\n";
    } else {
        msg += "*No hay activas con Track.*\n\n";
    }

    if (top5.length > 0) {
        msg += "*TOP 5 OPORTUNIDADES (NO ACTIVAS):*\n";
        msg += "```\n";
        msg += "TKR    S-HOY  S-INI  DIFF  FILTROS\n";
        msg += "────   ────   ───   ───   ───────\n";
        for (var t5 = 0; t5 < top5.length; t5++) {
            var tp = top5[t5];
            var tk = (tp.ticker + "     ").substring(0, 5);
            var sc = (String(tp.scoreHoy) + "     ").substring(0, 4);
            var si = (String(tp.scoreInicial) + "     ").substring(0, 4);
            var df = (tp.diff >= 0 ? "+" : "") + tp.diff.toFixed(1);
            df = (df + "    ").substring(0, 4);
            var fl = (tp.filtrosHoy + "               ").substring(0, 15);
            msg += tk + "  " + sc + "  " + si + "  " + df + " " + fl + "\n";
        }
        msg += "```\n";
    }

    // 5. Enviar
    enviarWhatsApp(msg);
    ss.toast("Verificación 9am enviada por WhatsApp.", "📱", 4);
}
