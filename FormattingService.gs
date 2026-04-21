// ============================================================
// MTM TRACKER — SERVICIO DE FORMATEO Y DISEÑO
// ============================================================

/**
 * Configura todas las hojas del proyecto por primera vez.
 */
function configurarHojas() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var dash = ss.getSheetByName("📊 Dashboard");
    if (!dash) { 
        dash = ss.insertSheet("📊 Dashboard"); 
        ss.setActiveSheet(dash); 
        ss.moveActiveSheet(1); 
    }
    formatearDashboard(dash);

    var top = ss.getSheetByName("🏆 Top Candidatos");
    if (!top) top = ss.insertSheet("🏆 Top Candidatos");
    formatearHojaTop(top);

    for (var i = 0; i < FILTROS.length; i++) {
        var ws = ss.getSheetByName(FILTROS[i].hoja);
        if (!ws) ws = ss.insertSheet(FILTROS[i].hoja);
        formatearHojaFiltro(ws, FILTROS[i]);
    }

    var ops = ss.getSheetByName("📈 Operaciones");
    if (!ops) ops = ss.insertSheet("📈 Operaciones");
    formatearHojaOperaciones(ops);

    var wl = ss.getSheetByName("📋 WL CDI");
    if (!wl) wl = ss.insertSheet("📋 WL CDI");
    formatearHojaWL(wl);

    ss.getSheetByName("📊 Dashboard").activate();
    ss.toast("Listo. Usa 📊 MTM Tracker → Actualizar TODO", "✅", 5);
}

/**
 * Formatea una hoja de filtro específica.
 */
function formatearHojaFiltro(ws, filtro) {
    ws.getRange(1, 1, 1, 15).merge()
        .setValue("📋  " + filtro.nombre + "  —  " + filtro.desc)
        .setBackground(C.DARK).setFontColor(C.GREEN).setFontSize(12)
        .setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
    ws.setRowHeight(1, 34);

    ws.getRange(2, 1, 1, 15).merge()
        .setValue("Top " + MAX + " Perf Semana  +  Top " + MAX + " Perf Mes  →  hasta " + (MAX * 2) + " acciones únicas")
        .setBackground("#1A237E").setFontColor(C.YELLOW).setFontSize(9).setFontWeight("bold");
    ws.setRowHeight(2, 18);

    ws.getRange(3, 1, 1, 15).merge()
        .setValue("v=111: " + filtro.baseUrl)
        .setBackground("#0D1B2A").setFontColor("#78909C").setFontSize(8);
    ws.setRowHeight(3, 16);

    ws.getRange(5, 1, 1, 15).merge()
        .setValue("Última actualización: (pendiente)")
        .setBackground(C.ACCENT).setFontColor(C.YELLOW).setFontSize(9);
    ws.setRowHeight(5, 18);

    var hdrs = ["#", "Ticker", "Empresa", "Sector", "Industria", "País",
        "Mkt Cap", "P/E", "Precio", "Cambio %", "Volumen",
        "Perf Sem %", "Perf Mes %", "Perf Trim %", "Origen"];
    var ws_ = [40, 80, 200, 130, 180, 60, 80, 60, 80, 80, 100, 90, 90, 90, 70];
    
    for (var i = 0; i < hdrs.length; i++) {
        var bg = (i >= 11 && i <= 13) ? "#1A237E" : C.DARK;
        var fg = (i >= 11 && i <= 13) ? C.YELLOW : C.WHITE;
        ws.getRange(6, i + 1).setValue(hdrs[i]).setBackground(bg).setFontColor(fg)
            .setFontWeight("bold").setHorizontalAlignment("center").setWrap(true);
        ws.setColumnWidth(i + 1, ws_[i]);
    }
    ws.setRowHeight(6, 30);
    ws.setFrozenRows(6);
}

/**
 * Formatea la hoja "Top Candidatos".
 */
function formatearHojaTop(ws) {
    var nCols = 9 + FILTROS.length + 6;

    ws.getRange(1, 1, 1, nCols).merge()
        .setValue("🏆  TOP CANDIDATOS  —  Todos los filtros  |  Perf Week/Month enriquecido")
        .setBackground(C.DARK).setFontColor(C.GREEN).setFontSize(13)
        .setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
    ws.setRowHeight(1, 40);

    ws.getRange(2, 1, 1, nCols).merge()
        .setValue("Orden: Score MTM → Perf Sem  |  Verde ≥ umbral  |  ✓ = aparece en ese filtro")
        .setBackground(C.ACCENT).setFontColor(C.YELLOW).setFontSize(10)
        .setFontWeight("bold").setHorizontalAlignment("left");
    ws.setRowHeight(2, 22);

    ws.getRange(3, 1, 1, nCols).merge()
        .setValue("Última actualización: (pendiente)")
        .setBackground(C.MID).setFontColor(C.GRAY).setFontSize(9);
    ws.setRowHeight(3, 18);

    var baseH = ["Ticker", "Empresa", "Sector", "Perf Sem %", "Perf Mes %", "Perf Trim %", "Precio", "Cambio %"];
    var baseW = [80, 180, 120, 90, 90, 90, 80, 80];

    for (var i = 0; i < baseH.length; i++) {
        var bg = (i >= 3 && i <= 5) ? "#1A237E" : C.DARK;
        var fg = (i >= 3 && i <= 5) ? C.YELLOW : C.WHITE;
        ws.getRange(4, i + 1).setValue(baseH[i]).setBackground(bg).setFontColor(fg)
            .setFontWeight("bold").setHorizontalAlignment("center").setWrap(true);
        ws.setColumnWidth(i + 1, baseW[i]);
    }

    for (var fi = 0; fi < FILTROS.length; fi++) {
        ws.getRange(4, 9 + fi)
            .setValue(FILTROS[fi].nombre.substring(0, 13))
            .setBackground(C.ACCENT).setFontColor(C.WHITE)
            .setFontWeight("bold").setHorizontalAlignment("center").setWrap(true);
        ws.setColumnWidth(9 + fi, 76);
    }

    var colIdx = 9 + FILTROS.length;
    ws.getRange(4, colIdx + 1).setValue("Score MTM").setBackground("#E65100").setFontColor(C.WHITE).setFontWeight("bold").setHorizontalAlignment("center");
    ws.setColumnWidth(colIdx + 1, 72);

    ws.getRange(4, colIdx + 2).setValue("# Filtros").setBackground(C.ACCENT).setFontColor(C.YELLOW).setFontWeight("bold").setHorizontalAlignment("center");
    ws.setColumnWidth(colIdx + 2, 72);

    ws.getRange(4, colIdx + 3).setValue("WL CDI").setBackground("#E65100").setFontColor(C.WHITE).setFontWeight("bold").setHorizontalAlignment("center");
    ws.setColumnWidth(colIdx + 3, 72);

    ws.getRange(4, colIdx + 4).setValue("ATR/LOW").setBackground("#1A237E").setFontColor(C.YELLOW).setFontWeight("bold").setHorizontalAlignment("center");
    ws.setColumnWidth(colIdx + 4, 80);

    ws.getRange(4, colIdx + 5).setValue("Earnings").setBackground("#B71C1C").setFontColor(C.WHITE).setFontWeight("bold").setHorizontalAlignment("center");
    ws.setColumnWidth(colIdx + 5, 90);

    ws.getRange(4, colIdx + 6).setValue("Snapshot").setBackground(C.MID).setFontColor(C.GRAY).setFontWeight("bold").setHorizontalAlignment("center");
    ws.setColumnWidth(colIdx + 6, 80);

    ws.setRowHeight(4, 42);
    ws.setFrozenRows(4);
}

/**
 * Formatea la hoja de Operaciones.
 */
function formatearHojaOperaciones(ws) {
    ws.getRange(1, 1, 1, 23).merge()
        .setValue("📈  OPERACIONES  —  Calculadora de Riesgo R/R y Tickers inteligentes")
        .setBackground(C.DARK).setFontColor(C.GREEN).setFontSize(11)
        .setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
    ws.setRowHeight(1, 34);

    ws.getRange(2, 1).setValue("Capital base ($)").setBackground(C.ACCENT).setFontColor(C.WHITE).setFontWeight("bold").setFontSize(9);
    ws.getRange(2, 2).setValue(2576).setBackground(C.LBLUE).setFontColor(C.ACCENT).setFontWeight("bold").setNumberFormat('"$"#,##0.00');
    
    ws.getRange(3, 1).setValue("Aportes acumulados ($)").setBackground(C.ACCENT).setFontColor(C.WHITE).setFontWeight("bold").setFontSize(9);
    ws.getRange(3, 2).setValue(0).setBackground("#FFF3E0").setFontColor("#E65100").setFontWeight("bold").setNumberFormat('"$"#,##0.00');

    ws.getRange(4, 1).setValue("Capital total ($)").setBackground("#1B5E20").setFontColor(C.WHITE).setFontWeight("bold").setFontSize(9);
    ws.getRange(4, 2).setFormula("=B2+B3").setBackground("#1E3A2F").setFontColor(C.GREEN).setFontWeight("bold").setNumberFormat('"$"#,##0.00');

    ws.getRange(5, 1).setValue("% Riesgo").setBackground(C.ACCENT).setFontColor(C.WHITE).setFontWeight("bold").setFontSize(9);
    ws.getRange(5, 2).setValue(0.03).setBackground(C.LBLUE).setFontColor(C.ACCENT).setFontWeight("bold").setNumberFormat("0%");
    ws.getRange(5, 3).setValue("→ Riesgo/op ($)").setBackground(C.ACCENT).setFontColor(C.WHITE).setFontWeight("bold").setFontSize(9);
    ws.getRange(5, 4).setFormula("=B4*B5").setBackground("#1E3A2F").setFontColor(C.GREEN).setFontWeight("bold").setNumberFormat('"$"#,##0.00');

    var hdrs = [
        "#", "Tipo", "Fecha", "Ticker", "Empresa", "Sector",
        "Perf Sem%", "Perf Mes%", "Entrada $", "Stop $",
        "Target Sug.", "Target Aplic.", "Acc. Sug.", "Acc. REAL",
        "Riesgo $", "Potencial $", "R/R", "Fecha Sal.", "Salida $",
        "P&L $", "P&L %", "Resultado", "Capital Acum."
    ];
    var wCol = [34, 70, 90, 80, 160, 100, 78, 78, 78, 72, 80, 80, 72, 78, 78, 86, 58, 90, 78, 74, 68, 100, 100];

    for (var i = 0; i < hdrs.length; i++) {
        ws.getRange(7, i + 1).setValue(hdrs[i])
            .setBackground(C.DARK).setFontColor(C.WHITE)
            .setFontWeight("bold").setHorizontalAlignment("center").setWrap(true);
        ws.setColumnWidth(i + 1, wCol[i]);
    }
    ws.setRowHeight(7, 40);
    ws.setFrozenRows(7);

    // Filas de datos
    for (var r = 8; r <= 57; r++) {
        var bg = r % 2 === 0 ? C.LIGHT : C.WHITE;
        ws.getRange(r, 1, 1, 23).setBackground(bg).setFontSize(9).setVerticalAlignment("middle").setHorizontalAlignment("center");
        ws.getRange(r, 1).setValue(r - 7);

        // Validación de Tipo
        ws.getRange(r, 2).setDataValidation(
            SpreadsheetApp.newDataValidation().requireValueInList(["⚡ Corto", "📈 Largo"], true).build()
        ).setValue("⚡ Corto");

        // Fórmulas automáticas
        var f = opF(r);
        ws.getRange(r, 11).setFormula(f.targetSug).setNumberFormat('"$"#,##0.00');
        ws.getRange(r, 13).setFormula(f.accSug);
        ws.getRange(r, 15).setFormula(f.riesgo).setNumberFormat('"$"#,##0.00');
        ws.getRange(r, 16).setFormula(f.potencial).setNumberFormat('"$"#,##0.00');
        ws.getRange(r, 17).setFormula(f.rr).setNumberFormat("0.00x");
        ws.getRange(r, 20).setFormula(f.pnl).setNumberFormat('"$"#,##0.00');
        ws.getRange(r, 21).setFormula(f.pnlPct).setNumberFormat("0.00%");
        ws.getRange(r, 22).setFormula(f.resultado);

        var capFormula = r === 8 ? '=IF(T8="";$B$4;$B$4+T8)' : '=IF(T' + r + '="";W' + (r - 1) + ';W' + (r - 1) + '+T' + r + ')';
        ws.getRange(r, 23).setFormula(capFormula).setNumberFormat('"$"#,##0.00');
    }
}

/**
 * Genera las fórmulas para una fila de operaciones.
 */
function opF(r) {
    var I = "I" + r; var J = "J" + r;
    var K = "K" + r; var L = "L" + r;
    var M = "M" + r; var N = "N" + r;
    var S_ = "S" + r; var T = "T" + r;

    return {
        targetSug: "=IF(OR(" + I + "=\"\";" + J + "=\"\");\"\";VALUE(" + I + ")+2*(VALUE(" + I + ")-VALUE(" + J + ")))",
        accSug: "=IF(OR(" + I + "=\"\";" + J + "=\"\");\"\";IF((VALUE(" + I + ")-VALUE(" + J + "))>0;ROUND($B$6/(VALUE(" + I + ")-VALUE(" + J + "));0);\"\"))",
        riesgo: "=IF(OR(" + I + "=\"\";" + J + "=\"\");\"\";IF(" + N + "<>\"\";" + N + "*(VALUE(" + I + ")-VALUE(" + J + "));IF(" + M + "<>\"\";" + M + "*(VALUE(" + I + ")-VALUE(" + J + "));\"\")))",
        potencial: "=IF(OR(" + I + "=\"\";" + L + "=\"\");\"\";IF(" + N + "<>\"\";" + N + "*(VALUE(" + L + ")-VALUE(" + I + "));IF(" + M + "<>\"\";" + M + "*(VALUE(" + L + ")-VALUE(" + I + "));\"\")))",
        rr: "=IF(OR(" + I + "=\"\";" + J + "=\"\";" + L + "=\"\");\"\";IF((VALUE(" + I + ")-VALUE(" + J + "))>0;ROUND((VALUE(L" + r + ")-VALUE(I" + r + "))/(VALUE(I" + r + ")-VALUE(J" + r + "));2);\"\"))",
        pnl: "=IF(OR(" + S_ + "=\"\";" + I + "=\"\");\"\";IF(" + N + "<>\"\";" + N + "*(VALUE(" + S_ + ")-VALUE(" + I + "));IF(" + M + "<>\"\";" + M + "*(VALUE(" + S_ + ")-VALUE(" + I + "));\"\")))",
        pnlPct: "=IF(OR(" + S_ + "=\"\";" + I + "=\"\");\"\";VALUE(" + S_ + ")/VALUE(" + I + ")-1)",
        resultado: "=IF(" + S_ + "=\"\";\"🔵 Abierta\";IF(" + T + ">0;\"✅ Ganadora\";\"❌ Perdedora\"))"
    };
}

/**
 * Formatea el Dashboard principal.
 */
function formatearDashboard(ws) {
    ws.clear();
    ws.clearContents();
    ws.clearFormats();
    ws.getRange(1, 1, ws.getMaxRows(), ws.getMaxColumns()).setDataValidation(null);
    
    ws.setColumnWidth(1, 230); ws.setColumnWidth(2, 150);
    ws.setColumnWidth(3, 150); ws.setColumnWidth(4, 360);

    var row = 1;
    ws.getRange(row, 1, 1, 4).merge().setValue("📊  MTM TRACKER  —  Dashboard de Rendimiento").setBackground(C.DARK).setFontColor(C.GREEN).setFontSize(15).setFontWeight("bold").setHorizontalAlignment("center");
    ws.setRowHeight(row, 44); row += 2;

    ws.getRange(row, 1, 1, 4).merge().setValue("🚦  CONDICIÓN DE MERCADO").setBackground(C.MID).setFontColor(C.GREEN).setFontWeight("bold"); row++;
    ws.getRange(row, 1).setValue("Condición SPY:").setBackground(C.ACCENT).setFontColor(C.WHITE).setFontWeight("bold");
    ws.getRange(row, 2).setValue("🟡 Calculando...").setBackground("#FFF9C4").setFontWeight("bold").setHorizontalAlignment("center");
    ws.getRange(row, 5).setValue("SEMAFORO_VAL").setFontColor(C.WHITE).setBackground(C.WHITE); row += 2;

    ws.getRange(row, 1, 1, 4).merge().setValue("📋  MÉTRICAS DEL PLAN").setBackground(C.MID).setFontColor(C.GREEN).setFontWeight("bold"); row++;
    var metricsHeaders = ["Parámetro", "Valor", "Recomendado", "Nota"];
    for (var i = 0; i < 4; i++) ws.getRange(row, i + 1).setValue(metricsHeaders[i]).setBackground(C.ACCENT).setFontColor(C.WHITE).setFontWeight("bold");
    row++;

    var planParams = [
        ["Capital total ($)", "=📈 Operaciones!B4", "—", "Capital real operando"],
        ["% Riesgo por op", "3%", "3%", "Estándar de disciplina"],
        ["Score MTM mínimo", "≥ 4", "≥ 4", "Filtro de calidad"],
        ["Win Rate real (%)", "0%", "45%", "Objetivo de rentabilidad"]
    ];
    for (var j = 0; j < planParams.length; j++) {
        var bg = j % 2 === 0 ? C.LIGHT : C.WHITE;
        ws.getRange(row, 1).setValue(planParams[j][0]).setBackground(bg).setFontWeight("bold");
        ws.getRange(row, 2).setValue(planParams[j][1]).setBackground(C.LBLUE).setHorizontalAlignment("center");
        ws.getRange(row, 3).setValue(planParams[j][2]).setBackground("#E8F5E9").setHorizontalAlignment("center");
        ws.getRange(row, 4).setValue(planParams[j][3]).setBackground(bg).setFontSize(9).setFontColor(C.GRAY);
        row++;
    }
    
    row += 2;
    ws.getRange(row, 1, 1, 4).merge().setValue("🔗  ESTADO DE FILTROS").setBackground(C.MID).setFontColor(C.GREEN).setFontWeight("bold"); row++;
    for (var f = 0; f < FILTROS.length; f++) {
        var fbg = f % 2 === 0 ? C.LIGHT : C.WHITE;
        ws.getRange(row, 1).setValue(f + 1).setBackground(fbg);
        ws.getRange(row, 2).setValue(FILTROS[f].nombre).setBackground(fbg).setFontWeight("bold");
        ws.getRange(row, 3).setValue("—").setBackground(fbg).setHorizontalAlignment("center");
        ws.getRange(row, 4).setValue("Nunca").setBackground(C.LYELLOW).setHorizontalAlignment("center");
        row++;
    }
}

/**
 * Formatea la hoja "WL CDI".
 */
function formatearHojaWL(ws) {
    ws.getRange(1, 1, 1, 7).merge().setValue("📋  Watchlist CDI (Club de Inversionistas)").setBackground(C.DARK).setFontColor(C.GREEN).setFontWeight("bold").setHorizontalAlignment("center");
    var hdrs = ["Ticker", "Empresa", "Sector", "ATR/LOW", "Earnings", "Perf Sem %", "Notas"];
    for (var i = 0; i < hdrs.length; i++) {
        ws.getRange(4, i + 1).setValue(hdrs[i]).setBackground(C.DARK).setFontColor(C.WHITE).setFontWeight("bold").setHorizontalAlignment("center");
    }
    ws.setFrozenRows(4);
}

/**
 * Formatea la hoja "Price Log".
 */
function formatearPriceLog(ws) {
    ws.getRange(1, 1, 1, 6).merge().setValue("📈  LOG DE PRECIOS").setBackground(C.DARK).setFontColor(C.GREEN).setFontWeight("bold").setHorizontalAlignment("center");
    var hdrs = ["Timestamp", "Ticker", "Hora ET", "Check #", "Día", "Precio $"];
    for (var i = 0; i < hdrs.length; i++) {
        ws.getRange(2, i + 1).setValue(hdrs[i]).setBackground(C.ACCENT).setFontColor(C.WHITE).setFontWeight("bold").setHorizontalAlignment("center");
    }
}

/**
 * Formatea la hoja "Historial Semanal".
 */
function formatearHistorialSemanal(ws) {
    ws.getRange(1, 1, 1, 19).merge().setValue("📚  HISTORIAL SEMANAL").setBackground(C.DARK).setFontColor(C.GREEN).setFontWeight("bold").setHorizontalAlignment("center");
    var hdrs = ["Semana", "Ticker", "Empresa", "Sector", "Score MTM", "Filtros", "Entrada $", "Stop $", "Target $", "R/R", "Cumplió 2x", "Lun$", "Vie$", "P&L%", "Tgt?", "Stop?", "Mejor Ent.", "Tendencia", "#Checks"];
    for (var i = 0; i < hdrs.length; i++) {
        ws.getRange(3, i + 1).setValue(hdrs[i]).setBackground(C.DARK).setFontColor(C.WHITE).setFontWeight("bold").setFontSize(8).setHorizontalAlignment("center");
    }
    ws.setFrozenRows(3);
}

/**
 * Formatea la hoja de Verificación.
 */
function formatearHojaVerificacion(ws) {
    ws.getRange(1, 1, 1, 10).merge().setValue("🔍  VERIFICACIÓN VS SNAPSHOT").setBackground(C.DARK).setFontColor(C.GREEN).setFontWeight("bold").setHorizontalAlignment("center");
}

/**
 * Reconfigura solo la hoja de Operaciones manteniendo los datos.
 */
function reconfigurarSoloOperaciones() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ops = ss.getSheetByName("📈 Operaciones");
    if (!ops) return;

    var ultimaFila = ops.getLastRow();
    var datosGuardados = [];
    if (ultimaFila >= 8) {
        datosGuardados = ops.getRange(8, 1, ultimaFila - 7, 23).getValues();
    }

    formatearHojaOperaciones(ops);

    if (datosGuardados.length > 0) {
        for (var r = 0; r < datosGuardados.length; r++) {
            var fila = r + 8;
            var d = datosGuardados[r];
            if (!d[3]) continue;
            ops.getRange(fila, 3).setValue(d[2]); // Fecha
            ops.getRange(fila, 4).setValue(d[3]); // Ticker
            ops.getRange(fila, 5).setValue(d[4]); // Empresa
            ops.getRange(fila, 6).setValue(d[5]); // Sector
            ops.getRange(fila, 7).setValue(d[6]); // Perf Sem
            ops.getRange(fila, 8).setValue(d[7]); // Perf Mes
            ops.getRange(fila, 9).setValue(d[8]); // Entrada
            ops.getRange(fila, 10).setValue(d[9]); // Stop
            ops.getRange(fila, 12).setValue(d[11]); // Target Aplicado
            ops.getRange(fila, 14).setValue(d[13]); // Acc Real
            ops.getRange(fila, 18).setValue(d[17]); // Fecha Salida
            ops.getRange(fila, 19).setValue(d[18]); // Precio Salida
        }
    }
}
