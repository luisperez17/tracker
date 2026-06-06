// ============================================================
// MTM TRACKER — SERVICIO DE MERCADO (SPY)
// ============================================================

/**
 * Trigger diario — corre automáticamente cada día.
 * Actualiza el semáforo y las métricas del dashboard.
 */
function actualizarSemaforoDiario() {
    var now = new Date();
    var etDay = now.getDay(); // 0=Dom, 6=Sáb

    // Solo corre de lunes a viernes (o domingo para preparar semana)
    if (etDay === 6) return;

    actualizarSemaforoSPY();
    calcularRachasDashboard();
    actualizarFechaDashboard();
}

/**
 * Actualiza el semáforo de SPY en el Dashboard.
 * Calcula las SMA 50 y SMA 200 para determinar la condición de mercado.
 */
function actualizarSemaforoSPY() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var dash = ss.getSheetByName("📊 Dashboard");
    if (!dash) return;

    var datos = fetchSPYHistorico(210);
    if (!datos || datos.length < 50) return;

    var precioActual = datos[datos.length - 1];
    var sma50 = datos.slice(-50).reduce(function(a, b) { return a + b; }, 0) / 50;
    var sma200 = datos.slice(-200).reduce(function(a, b) { return a + b; }, 0) / 200;
    var tendenciaCortoPlazo = precioActual > datos[datos.length - 6];

    var semaforo, bgColor, fgColor, descripcion;

    if (precioActual > sma200 && precioActual > sma50 && tendenciaCortoPlazo) {
        semaforo = "🟢 Alcista"; bgColor = "#E8F5E9"; fgColor = "#1B5E20";
        descripcion = "✅ Sistema en pleno rendimiento — opera con normalidad";
    } else if (precioActual < sma200 && !tendenciaCortoPlazo) {
        semaforo = "🔴 Bajista"; bgColor = "#FFEBEE"; fgColor = "#B71C1C";
        descripcion = "🛑 Mercado bajista — pausa o solo Score ≥ 8 con ATR verde";
    } else {
        semaforo = "🟡 Lateral"; bgColor = "#FFF9C4"; fgColor = "#633806";
        descripcion = "⚠️ Mercado lateral — reduce a 1-2 posiciones, exige Score ≥ 5";
    }

    // Buscar marcador
    var markers = dash.getRange(1, 5, dash.getLastRow(), 1).getValues();
    var semaforoRow = -1;
    for (var d = 0; d < markers.length; d++) {
        if (String(markers[d][0]).trim() === "SEMAFORO_VAL") { semaforoRow = d + 1; break; }
    }

    if (semaforoRow > 0) {
        dash.getRange(semaforoRow, 2).setValue(semaforo).setBackground(bgColor).setFontColor(fgColor).setFontWeight("bold");
        dash.getRange(semaforoRow, 3, 1, 2).breakApart().merge().setValue(descripcion).setBackground(bgColor).setFontColor(fgColor);
        dash.getRange(semaforoRow + 1, 2).breakApart().setValue(new Date()).setNumberFormat("dd/mm/yyyy hh:mm");

        dash.getRange(semaforoRow, 2).setNote(
            "SPY: $" + precioActual.toFixed(2) + "\n" +
            "SMA 50: $" + sma50.toFixed(2) + "\n" +
            "SMA 200: $" + sma200.toFixed(2) + "\n" +
            "Actualizado: " + new Date().toLocaleString("es")
        );
    }
}

/**
 * Obtiene el histórico de precios de SPY desde Yahoo Finance.
 */
function fetchSPYHistorico(dias) {
    try {
        var ahora = Math.floor(Date.now() / 1000);
        var inicio = ahora - (dias * 24 * 60 * 60);
        var url = "https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&period1=" + inicio + "&period2=" + ahora;
        var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        if (r.getResponseCode() !== 200) return null;

        var json = JSON.parse(r.getContentText());
        var closes = json.chart.result[0].indicators.adjclose[0].adjclose;
        return closes.filter(function(v) { return v !== null; });
    } catch (e) { return null; }
}

/**
 * Actualiza manualmente el semáforo desde el menú.
 */
function actualizarSemaforoManual() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast("Consultando SPY...", "🚦", 10);
    actualizarSemaforoSPY();
    actualizarFechaDashboard();
    ss.toast("Semáforo actualizado.", "✅", 4);
}

/**
 * Actualiza la fecha de última actualización en el Dashboard.
 */
function actualizarFechaDashboard() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var dash = ss.getSheetByName("📊 Dashboard");
    if (!dash) return;

    var markers = dash.getRange(1, 5, dash.getLastRow(), 1).getValues();
    for (var d = 0; d < markers.length; d++) {
        if (String(markers[d][0]).trim() === "DASH_FECHA") {
            dash.getRange(d + 1, 2).setValue(new Date()).setNumberFormat("dd/mm/yyyy hh:mm").setFontColor("#00C853");
            break;
        }
    }
}