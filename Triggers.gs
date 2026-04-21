// ============================================================
// MTM TRACKER — DISPARADORES (TRIGGERS)
// ============================================================

/**
 * Disparador que se ejecuta al abrir la hoja de cálculo.
 * Crea el menú personalizado en la interfaz.
 */
function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu("📊 MTM Tracker")
        .addItem("🔄 Actualizar TODO", "actualizarTodo")
        .addSeparator()
        .addItem("① YTD Top + Volumen", "act_ytd")
        .addItem("② Strong Uptrend", "act_uptrend")
        .addItem("③ SMA 20/50/200", "act_sma")
        .addItem("④ Earnings Week", "act_earnings_week")
        .addItem("⑤ New High + Volumen", "act_newhigh")
        .addItem("⑥ Post Earnings Breakout", "act_post_earnings")
        .addItem("⑦ Intraday Strong Reversal", "act_reversal")
        .addItem("⑧ Revenue + EPS + FCF", "act_revenue_eps")
        .addItem("⑨ ADR 4K Volumen", "act_adr_vol")
        .addItem("⑩ Ganadores Sem +20%", "act_ganadores")
        .addItem("⑪ Volumen Climático", "act_volumen")
        .addSeparator()
        .addItem("🏆 Consolidar Top Candidatos", "verTopCandidatos")
        .addItem("🛠️  Configurar hojas (primera vez)", "configurarHojas")
        .addItem("🔧 Reconfigurar solo Operaciones", "reconfigurarSoloOperaciones")
        .addSeparator()
        .addItem("🎯 Configurar Semana Tracker", "configurarSemanaTracker")
        .addItem("🧹 Limpiar decimales (Semana Tracker)", "sanitizarDecimalesSemana")
        .addItem("🧹 Limpiar decimales (Operaciones)", "sanitizarDecimalesOperaciones")
        .addItem("🔍 Verificar semana", "verificarSemana")
        .addItem("📊 Registrar precios ahora (manual)", "registrarPreciosManual")
        .addItem("📋 Generar Reporte Viernes", "generarReporteViernes")
        .addItem("🔄 Reset Semana (cada domingo)", "resetearSemana")
        .addItem("⚙️ Instalar triggers automáticos", "instalarTriggers")
        .addItem("🔴 Desinstalar triggers", "desinstalarTriggers")
        .addSeparator()
        .addItem("🚦 Actualizar semáforo ahora", "actualizarSemaforoManual")
        .addItem("⚙️ Instalar trigger diario", "instalarTriggerDiario")
        .addItem("🔴 Desinstalar trigger diario", "desinstalarTriggerDiario")
        .addToUi();
}

/**
 * Disparador que se ejecuta al editar una celda.
 * Autocompleta la información del ticker en la hoja de Operaciones.
 */
function onEdit(e) {
    try {
        var range = e.range;
        var sheet = range.getSheet();
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var sheetName = sheet.getName();
        var numRows = range.getNumRows();
        var numCols = range.getNumColumns();
        var startRow = range.getRow();
        var startCol = range.getColumn();

        // Solo actuamos si la edición toca las columnas de Ticker (col 4 en Ops, col 1 en Semana)
        var isOps = (sheetName === "📈 Operaciones" && startCol <= 4 && (startCol + numCols - 1) >= 4);
        var isSem = (sheetName === SEMANA_SHEET && startCol <= 1 && (startCol + numCols - 1) >= 1);

        if (!isOps && !isSem) return;

        var values = range.getValues();

        for (var r = 0; r < numRows; r++) {
            for (var c = 0; c < numCols; c++) {
                var currentRow = startRow + r;
                var currentCol = startCol + c;
                var rawValue = values[r][c];
                var ticker = String(rawValue || "").trim().toUpperCase();
                if (!ticker) continue;

                // --- CASO A: HOJA DE OPERACIONES ---
                if (sheetName === "📈 Operaciones" && currentCol === 4 && currentRow >= 8) {
                    var sTracker = ss.getSheetByName(SEMANA_SHEET);
                    var syncData = null;
                    if (sTracker) {
                        var stData = sTracker.getRange(6, 1, MAX_CAND, 8).getValues();
                        for (var i = 0; i < stData.length; i++) {
                            if (String(stData[i][0]).trim().toUpperCase() === ticker) {
                                syncData = {
                                    fecha: stData[i][3], entrada: stData[i][5],
                                    stop: stData[i][6], target: stData[i][7]
                                };
                                break;
                            }
                        }
                    }

                    var infoOps = buscarTicker(ticker);
                    if (infoOps) {
                        sheet.getRange(currentRow, 5).setValue(infoOps.empresa || "");
                        sheet.getRange(currentRow, 6).setValue(infoOps.sector || "");
                        sheet.getRange(currentRow, 7).setValue(infoOps.perfWeek || "");
                        sheet.getRange(currentRow, 8).setValue(infoOps.perfMonth || "");
                        colorPct(sheet.getRange(currentRow, 7), infoOps.perfWeek, 5, 0);
                        colorPct(sheet.getRange(currentRow, 8), infoOps.perfMonth, 10, 0);

                        if (syncData) {
                            if (syncData.fecha) sheet.getRange(currentRow, 3).setValue(syncData.fecha);
                            if (syncData.entrada) sheet.getRange(currentRow, 9).setValue(syncData.entrada);
                            if (syncData.stop) sheet.getRange(currentRow, 10).setValue(syncData.stop);
                            if (syncData.target) sheet.getRange(currentRow, 12).setValue(syncData.target);
                        }
                    }
                }

                // --- CASO B: HOJA SEMANA TRACKER ---
                if (sheetName === SEMANA_SHEET && currentCol === 1 && currentRow >= 6) {
                    var infoSem = buscarTicker(ticker);
                    if (infoSem) {
                        sheet.getRange(currentRow, 1).setValue(ticker); // Asegurar mayúsculas
                        sheet.getRange(currentRow, 2).setValue(infoSem.empresa || "");
                        sheet.getRange(currentRow, 3).setValue(infoSem.sector || "");
                        sheet.getRange(currentRow, 11).setValue(infoSem.perfWeek || "");
                        sheet.getRange(currentRow, 12).setValue(infoSem.perfMonth || "");
                        colorPct(sheet.getRange(currentRow, 11), infoSem.perfWeek, 5, 0);
                        colorPct(sheet.getRange(currentRow, 12), infoSem.perfMonth, 10, 0);

                        var scoreFiltros = infoSem.score + " / " + infoSem.filtrosStr;
                        sheet.getRange(currentRow, 13).setValue(scoreFiltros).setFontSize(8).setHorizontalAlignment("center");
                    }
                }
            }
        }
        
        if (numRows * numCols < 5) {
            ss.toast("Autocompletado procesado", "✅", 2);
        } else {
            ss.toast("Procesado pegado masivo (" + (numRows * numCols) + " celdas)", "✅ Bulk", 3);
        }

    } catch (err) { Logger.log("onEdit: " + err.message); }
}

// ============================================================
// GESTIÓN DE TRIGGERS TEMPORALES
// ============================================================

/**
 * Instala el trigger para registrar precios cada hora.
 */
function instalarTriggers() {
    ScriptApp.getProjectTriggers().forEach(function (t) {
        if (t.getHandlerFunction() === "registrarPreciosTrigger")
            ScriptApp.deleteTrigger(t);
    });
    ScriptApp.newTrigger("registrarPreciosTrigger")
        .timeBased().everyHours(1).create();
    SpreadsheetApp.getActiveSpreadsheet().toast(
        "Trigger instalado: verifica precios cada hora lun-vie.\n" +
        "Actúa solo en: 10am, 11am, 1pm, 2:30pm, 3:45pm ET.",
        "✅ Triggers instalados", 6
    );
}

/**
 * Desinstala el trigger de registro de precios.
 */
function desinstalarTriggers() {
    var n = 0;
    ScriptApp.getProjectTriggers().forEach(function (t) {
        if (t.getHandlerFunction() === "registrarPreciosTrigger") {
            ScriptApp.deleteTrigger(t); n++;
        }
    });
    SpreadsheetApp.getActiveSpreadsheet().toast(n + " trigger(s) eliminados.", "🔴", 4);
}

/**
 * Función que corre el trigger horario y decide si registrar precios.
 */
function registrarPreciosTrigger() {
    var etHour = obtenerHoraETNow();
    var etDay = new Date().getDay();

    if (etDay < 1 || etDay > 5) return;
    if (HORAS_CHECK.indexOf(etHour) < 0) return;
    if (yaRegistradoHoy(etHour)) return;

    registrarPrecios(etHour, false);  // false = trigger real
}

/**
 * Instala el trigger diario para el semáforo de SPY.
 */
function instalarTriggerDiario() {
    ScriptApp.getProjectTriggers().forEach(function (t) {
        if (t.getHandlerFunction() === "actualizarSemaforoDiario")
            ScriptApp.deleteTrigger(t);
    });

    ScriptApp.newTrigger("actualizarSemaforoDiario")
        .timeBased()
        .everyDays(1)
        .atHour(13) // ~9am ET
        .create();

    SpreadsheetApp.getActiveSpreadsheet().toast(
        "Trigger diario instalado — semáforo se actualiza automáticamente a las ~9am ET cada día.",
        "✅ Trigger diario", 6
    );
}

/**
 * Desinstala el trigger diario.
 */
function desinstalarTriggerDiario() {
    var n = 0;
    ScriptApp.getProjectTriggers().forEach(function (t) {
        if (t.getHandlerFunction() === "actualizarSemaforoDiario") {
            ScriptApp.deleteTrigger(t); n++;
        }
    });
    SpreadsheetApp.getActiveSpreadsheet().toast(
        n + " trigger(s) diario(s) eliminados.", "🔴", 4
    );
}
