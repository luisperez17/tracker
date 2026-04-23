// ============================================================
// MTM PRO TRACKER V2 — PORTFOLIO & AUTOMATION
// ============================================================

/**
 * Añade una acción seleccionada del Scanner al Tracker de forma automática.
 */
function addToTrackerPro(ticker, data) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName(SHEETS.TRACKER);
    if (!ws) {
        SpreadsheetApp.getUi().alert("Error: No se encuentra la hoja " + SHEETS.TRACKER);
        return;
    }

    // Buscar primera fila libre
    var lastRow = ws.getLastRow();
    var nextRow = 6; // Asumimos que los datos empiezan en la fila 6
    if (lastRow >= 6) {
        var existingTickers = ws.getRange(6, 1, lastRow - 5, 1).getValues();
        for (var i = 0; i < existingTickers.length; i++) {
            if (existingTickers[i][0] === ticker) {
                ss.toast(ticker + " ya está en el Tracker.", "⚠️", 3);
                return;
            }
        }
        nextRow = lastRow + 1;
    }

    // Datos a insertar
    var rowData = [
        ticker,
        data.name,
        data.sector,
        new Date(),       // Fecha entrada
        true,             // Activar seguimiento
        data.price,       // Precio entrada
        data.price * (1 - RISK_SETTINGS.STOP_LOSS_DEFAULT), // Stop Loss calculado
        data.price * (1 + (RISK_SETTINGS.STOP_LOSS_DEFAULT * RISK_SETTINGS.TARGET_MIN_RR)) // Target calculado
    ];

    ws.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
    
    // Formateo rápido
    ws.getRange(nextRow, 1).setFontWeight("bold");
    ws.getRange(nextRow, 6, 1, 3).setNumberFormat('"$"#,##0.00');

    ss.toast(ticker + " añadido al Tracker con éxito.", "🎯", 4);
}

/**
 * Función que se llamará desde un botón en la hoja del Scanner.
 * Detecta qué fila está seleccionada y añade ese ticker.
 */
function actionAddSelectedToTracker() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    if (sheet.getName() !== SHEETS.SCANNER) return;

    var row = sheet.getActiveCell().getRow();
    if (row < 5) {
        SpreadsheetApp.getUi().alert("Selecciona una fila de acción válida en el Scanner.");
        return;
    }

    var ticker = sheet.getRange(row, 1).getValue();
    if (!ticker) return;

    var data = {
        name: sheet.getRange(row, 2).getValue(),
        sector: sheet.getRange(row, 3).getValue(),
        price: sheet.getRange(row, 10).getValue()
    };

    addToTrackerPro(ticker, data);
}
