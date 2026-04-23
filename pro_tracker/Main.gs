// ============================================================
// MTM PRO TRACKER V2 — MAIN ENTRY POINT & UI
// ============================================================

/**
 * Inicializa el menú de la versión PRO.
 */
function onOpen() {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu("💎 MTM Pro")
        .addItem("🚦 Verificar Estado de Mercado", "uiCheckMarket")
        .addSeparator()
        .addItem("🚀 Ejecutar Smart Scanner", "runSmartScanner")
        .addItem("🎯 Añadir Selección al Tracker", "actionAddSelectedToTracker")
        .addSeparator()
        .addItem("📈 Actualizar Precios Tracker", "updateTrackerPricesPro")
        .addSeparator()
        .addItem("🛠️ Configurar Hojas PRO", "setupProSheets")
        .addToUi();
}

/**
 * Muestra el estado del mercado en un diálogo premium.
 */
function uiCheckMarket() {
    var regime = getMarketRegime();
    var ui = SpreadsheetApp.getUi();
    
    var html = "<div style='font-family: sans-serif; background: " + COLORS.BG_DARK + "; color: white; padding: 20px; border-radius: 8px;'>" +
               "<h2 style='color: " + regime.color + "; margin-top: 0;'>" + regime.status + "</h2>" +
               "<p><b>Precio SPY:</b> $" + regime.price.toFixed(2) + "</p>" +
               "<p><b>Recomendación:</b> " + regime.risk + "</p>" +
               "<hr style='border: 0; border-top: 1px solid #334155;'>" +
               "<p style='font-style: italic; color: " + COLORS.TEXT_DIM + ";'>" + regime.message + "</p>" +
               "</div>";
    
    var userInterface = HtmlService.createHtmlOutput(html)
        .setWidth(400)
        .setHeight(250);
    
    ui.showModalDialog(userInterface, "MTM Market Guard");
}

/**
 * Función para actualizar precios en la versión PRO.
 */
function updateTrackerPricesPro() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName(SHEETS.TRACKER);
    if (!ws || ws.getLastRow() < 6) return;

    var lastRow = ws.getLastRow();
    var data = ws.getRange(6, 1, lastRow - 5, 10).getValues();
    
    ss.toast("Actualizando precios de cartera activa...", "⏳", 5);

    for (var i = 0; i < data.length; i++) {
        var tk = data[i][0];
        var ent = parseFloat(data[i][5]);
        var stop = parseFloat(data[i][6]);
        var target = parseFloat(data[i][7]);
        if (!tk || !ent) continue;

        var price = fetchPrecioYahoo(tk);
        if (price) {
            var pnl = (price - ent) / ent;
            var status = "ACTIVO";
            if (price <= stop) status = "🛑 STOP HIT";
            else if (price >= target) status = "🎯 TARGET HIT";
            else if (pnl > 0) status = "📈 PROFIT";
            else status = "📉 LOSS";

            ws.getRange(6 + i, 9).setValue(pnl).setNumberFormat("0.00%").setFontWeight("bold").setFontColor(pnl >= 0 ? COLORS.SUCCESS : COLORS.DANGER);
            ws.getRange(6 + i, 10).setValue(status).setFontWeight("bold");
        }
    }
    ss.toast("Cartera actualizada.", "✅", 4);
}

/**
 * Crea y formatea las hojas necesarias para la versión PRO.
 */
function setupProSheets() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    Object.keys(SHEETS).forEach(function(key) {
        var name = SHEETS[key];
        var ws = ss.getSheetByName(name);
        if (!ws) {
            ws = ss.insertSheet(name);
        }
        
        // Aplicar cabeceras según la hoja
        if (name === SHEETS.SCANNER) setupScannerHeaders(ws);
        if (name === SHEETS.TRACKER) setupTrackerHeaders(ws);
        if (name === SHEETS.DASHBOARD) setupDashboardHeaders(ws);
    });
    
    ss.toast("Entorno Pro configurado y formateado.", "✅", 5);
}
