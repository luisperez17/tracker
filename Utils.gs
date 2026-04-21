// ============================================================
// MTM TRACKER — UTILIDADES Y AYUDANTES
// ============================================================

/**
 * Limpia el HTML de una cadena, removiendo tags y convirtiendo entidades.
 */
function clean(html) {
    if (!html) return "";
    return html.replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
        .trim();
}

/**
 * Colorea un porcentaje en una celda según los umbrales t1 y t2.
 */
function colorPct(cell, val, t1, t2) {
    if (!val) return;
    var n = parseFloat(String(val).replace("%", "").replace("+", "")) || 0;
    cell.setFontWeight("bold");
    if (n >= t1) cell.setFontColor(C.GREEN);
    else if (n >= t2) cell.setFontColor("#4CAF50");
    else if (n >= -t2) cell.setFontColor(C.ORANGE);
    else cell.setFontColor(C.RED);
}

/**
 * Determina si la fecha dada está en horario de verano (DST).
 */
function esDST(date) {
    var jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
    var jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
    return date.getTimezoneOffset() < Math.max(jan, jul);
}

/**
 * Obtiene la hora actual en Eastern Time (ET).
 * @returns {number} La hora actual (0-23).
 */
function obtenerHoraETNow() {
    var now = new Date();
    var etOff = esDST(now) ? -4 : -5;
    return (now.getUTCHours() + etOff + 24) % 24;
}

/**
 * Obtiene el precio actual de un ticker desde Yahoo Finance.
 */
function fetchPrecioYahoo(ticker) {
    try {
        var url = "https://query1.finance.yahoo.com/v8/finance/chart/" + ticker + "?interval=1m&range=1d";
        var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        if (r.getResponseCode() !== 200) return null;
        var json = JSON.parse(r.getContentText());
        return json.chart.result[0].meta.regularMarketPrice || null;
    } catch (e) { return null; }
}

/**
 * Verifica si ya se registró el precio para una hora específica hoy.
 */
function yaRegistradoHoy(horaET) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var log = ss.getSheetByName(PRICE_LOG);
    if (!log || log.getLastRow() < 3) return false;
    var todayStr = new Date().toLocaleDateString("es");
    var data = log.getRange(3, 1, log.getLastRow() - 2, 3).getValues();
    for (var i = 0; i < data.length; i++) {
        if (new Date(data[i][0]).toLocaleDateString("es") === todayStr && Number(data[i][2]) === horaET) return true;
    }
    return false;
}

/**
 * Actualiza los timestamps de un filtro en el Dashboard.
 */
function actualizarTimestampsDashboardFiltro(filtro, count) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var dash = ss.getSheetByName("📊 Dashboard");
    if (!dash) return;
    
    var lastRow = dash.getLastRow();
    var data = dash.getRange(1, 2, lastRow, 1).getValues();
    for (var d = 0; d < data.length; d++) {
        if (String(data[d][0]).trim() === filtro.nombre) {
            dash.getRange(d + 1, 3).setValue(count);
            dash.getRange(d + 1, 4).setValue(new Date()).setNumberFormat("dd/mm/yyyy hh:mm");
            break;
        }
    }
}

/**
 * Limpia una cadena de texto para convertirla en un número válido.
 * Remueve $, espacios, comas de miles y normaliza el punto decimal.
 * @param {any} val - El valor a limpiar.
 * @returns {number|null} El número limpio o null si no es válido.
 */
function limpiarValor(val) {
    if (val === null || val === undefined || val === "") return null;
    if (typeof val === "number") return typeof val === "number" ? val : null;

    var s = String(val).trim();
    // Remueve $ y espacios
    s = s.replace(/\$/g, "").replace(/\s/g, "");
    
    // Si tiene comas y puntos, asumimos formato americano (1,234.56) o europeo (1.234,56)
    if (s.indexOf(",") > -1 && s.indexOf(".") > -1) {
        if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
            s = s.replace(/\./g, "").replace(",", "."); // Europeo
        } else {
            s = s.replace(/,/g, ""); // Americano
        }
    } else if (s.indexOf(",") > -1) {
        s = s.replace(",", ".");
    }
    
    var num = parseFloat(s);
    return isNaN(num) ? null : num;
}
