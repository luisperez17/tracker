// ============================================================
// MTM PRO TRACKER V2 — FORMATEO Y RENDERIZADO
// ============================================================

/**
 * Renderiza los resultados del Scanner en la hoja correspondiente.
 */
function renderScannerResults(results) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName(SHEETS.SCANNER);
    if (!ws) return;

    // Limpiar datos previos (preservando encabezados en fila 4)
    var lr = ws.getLastRow();
    if (lr >= 5) ws.getRange(5, 1, lr - 4, 11).clearContent().clearFormat();

    if (results.length === 0) {
        ws.getRange(5, 1, 1, 11).merge().setValue("No se encontraron candidatos con el score mínimo.").setHorizontalAlignment("center");
        return;
    }

    var rows = [];
    results.forEach(function(r) {
        rows.push([
            r.ticker,
            r.name,
            r.sector,
            r.filterSource,
            r.score,
            r.relStrength,
            r.distSMA20,
            "", // Espacio para botones/notas
            "", // Placeholder
            r.price,
            r.change
        ]);
    });

    var range = ws.getRange(5, 1, rows.length, 11);
    range.setValues(rows).setFontSize(9).setVerticalAlignment("middle").setHorizontalAlignment("center");

    // Formateo Condicional de Colores
    for (var i = 0; i < rows.length; i++) {
        var rIdx = 5 + i;
        
        // Color Score
        var scoreCell = ws.getRange(rIdx, 5);
        var sc = rows[i][4];
        if (sc >= 6) scoreCell.setBackground(COLORS.SUCCESS).setFontColor("white").setFontWeight("bold");
        else if (sc >= 4) scoreCell.setBackground("#DCFCE7").setFontColor(COLORS.SUCCESS);
        
        // Color RS (Fuerza Relativa)
        var rsCell = ws.getRange(rIdx, 6);
        var rs = rows[i][5];
        rsCell.setFontColor(rs > 0 ? COLORS.SUCCESS : COLORS.DANGER).setFontWeight("bold").setNumberFormat("+0.00;-0.00");

        // Color Dist SMA 20 (Alerta FOMO)
        var distCell = ws.getRange(rIdx, 7);
        var dist = rows[i][6];
        distCell.setNumberFormat("0.0%");
        if (dist > RISK_SETTINGS.MAX_DIST_SMA20) distCell.setBackground(COLORS.DANGER).setFontColor("white");
        else if (dist < 0.02 && dist > 0) distCell.setBackground("#E0F2FE").setFontColor(COLORS.ACCENT);

        ws.setRowHeight(rIdx, 25);
    }
    
    ws.getRange("A5:K" + (5 + rows.length)).setBorder(true, true, true, true, true, true, "#E2E8F0", SpreadsheetApp.BorderStyle.SOLID);
}

/**
 * Cabeceras para el Tracker Activo
 */
function setupTrackerHeaders(ws) {
    var hdrs = [["Ticker", "Nombre", "Sector", "Fecha Ent", "Track", "Precio Ent", "Stop Loss", "Target", "PnL %", "Status"]];
    ws.getRange(5, 1, 1, 10).setValues(hdrs)
        .setBackground("#1E293B").setFontColor("white").setFontWeight("bold").setHorizontalAlignment("center");
}

/**
 * Cabeceras para el Dashboard Pro
 */
function setupDashboardHeaders(ws) {
    ws.getRange("B2").setValue("💎 MTM PRO DASHBOARD").setFontSize(18).setFontWeight("bold").setFontColor("#38BDF8");
    ws.getRange("B4").setValue("🚦 ESTADO DEL MERCADO:").setFontWeight("bold");
    ws.getRange("C4").setValue("Cargando...").setBackground("#334155");
}

/**
 * Configura los encabezados de la hoja Smart Scanner.
 */
function setupScannerHeaders(ws) {
    var hdrs = [["Ticker", "Nombre", "Sector", "Origen", "Score Pro", "Fuerza Rel", "Dist SMA20", "Acción", "Notas", "Precio", "Cambio %"]];
    ws.getRange(4, 1, 1, 11).setValues(hdrs)
        .setBackground(COLORS.BG_CARD)
        .setFontColor(COLORS.TEXT_MAIN)
        .setFontWeight("bold")
        .setHorizontalAlignment("center");
    
    ws.setColumnWidth(1, 70);
    ws.setColumnWidth(2, 180);
    ws.setColumnWidth(3, 120);
    ws.setColumnWidth(5, 80);
    ws.setColumnWidth(6, 80);
    ws.setColumnWidth(7, 80);
    ws.setColumnWidth(10, 80);
}
