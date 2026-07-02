// ============================================================
// MTM TRACKER V4 — INSTALACIÓN AUTOMÁTICA (ONE-CLICK)
// ============================================================
// Ejecutar esta función UNA SOLA VEZ para configurar todo.
// Crea hojas, instala menú, y deja listo para usar.
// ============================================================

/**
 * INSTALADOR MASTER V4
 * 1. Crea todas las hojas necesarias
 * 2. Formatea cada hoja
 * 3. Instala el menú personalizado
 * 4. Muestra mensaje de confirmación
 */
function instalarV4() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ui = SpreadsheetApp.getUi();

    // Confirmar
    var resp = ui.alert(
        "🏗️ Instalador MTM Tracker V4",
        "Esto creará las hojas: 📋 WL CDI, 🎯 Radar Semanal, 📈 Tracker Diario, 📊 Score Log V4, 📊 Dashboard V4.\n\n" +
        "No borrará tus hojas actuales (V3).\n\n¿Continuar?",
        ui.ButtonSet.YES_NO
    );
    if (resp !== ui.Button.YES) return;

    ss.toast("Creando hojas V4...", "🏗️", 10);

    // 1. WL CDI
    crearHojaSiNoExiste(ss, SHEET_WL, function(ws) {
        formatearWLV4(ws);
        // Pegar encabezados
        ws.getRange(1, 1).setValue("Pega aquí tu WL CDI semanal. Formato: Ticker | Empresa | Sector | ATR/LOW | Earnings | Perf Sem % | Perf Mes %");
    });

    // 2. Radar Semanal
    crearHojaSiNoExiste(ss, SHEET_RADAR, function(ws) {
        formatearRadar(ws);
    });

    // 3. Tracker Diario
    crearHojaSiNoExiste(ss, SHEET_TRACKER, function(ws) {
        formatearTrackerV4(ws);
    });

    // 4. Score Log V4
    crearHojaSiNoExiste(ss, SHEET_LOG, function(ws) {
        formatearScoreLogV4(ws);
    });

    // 5. Dashboard V4
    crearHojaSiNoExiste(ss, SHEET_DASHBOARD, function(ws) {
        formatearDashboardV4(ws);
    });

    // 6. Instalar menú
    instalarMenuV4();

    ss.toast("✅ V4 instalado. Ve a 📋 WL CDI, pega tu lista, y ejecuta 🔄 Generar Radar Semanal.", "🎯", 8);

    // Mostrar diálogo final con instrucciones
    ui.alert(
        "✅ Instalación completa",
        "Próximos pasos:\n\n" +
        "1. Ve a la hoja 📋 WL CDI\n" +
        "2. Pega tu WL CDI de esta semana (desde fila 2)\n" +
        "3. Ve al menú 🎯 MTM Tracker V4 > 🔄 Generar Radar Semanal\n\n" +
        "El sistema consultará Yahoo Finance para cada ticker y generará el ranking.",
        ui.ButtonSet.OK
    );
}

/**
 * Helper: crea hoja si no existe, o la limpia si ya existe.
 */
function crearHojaSiNoExiste(ss, nombre, formatearFn) {
    var ws = ss.getSheetByName(nombre);
    if (!ws) {
        ws = ss.insertSheet(nombre);
    } else {
        ws.clear();
        ws.clearContents();
        ws.clearFormats();
    }
    formatearFn(ws);
}

/**
 * DESINSTALADOR V4 (por si acaso)
 * Elimina hojas V4 y menú. Los datos de Score Log se conservan en tu backup.
 */
function desinstalarV4() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ui = SpreadsheetApp.getUi();
    var resp = ui.alert("¿Eliminar hojas V4?", "Esto borra las hojas V4. Las hojas V3 no se tocan.", ui.ButtonSet.YES_NO);
    if (resp !== ui.Button.YES) return;

    var nombres = [SHEET_RADAR, SHEET_TRACKER, SHEET_LOG, SHEET_DASHBOARD];
    for (var i = 0; i < nombres.length; i++) {
        var ws = ss.getSheetByName(nombres[i]);
        if (ws) ss.deleteSheet(ws);
    }
    ui.alert("Hojas V4 eliminadas. Recarga la página para quitar el menú.");
}
