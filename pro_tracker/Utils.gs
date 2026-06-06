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
 * Obtiene información detallada del tiempo actual en Nueva York (Eastern Time).
 * Centraliza la lógica de DST y zonas horarias para todo el script.
 */
function getInfoTiempoNY() {
    var now = new Date();
    // Offset de ET respecto a UTC: -4 en DST, -5 en standard
    var etOff = esDST(now) ? -4 : -5;

    // Calculamos la fecha técnica en NY
    var nyTime = new Date(now.getTime() + (etOff * 3600000) + (now.getTimezoneOffset() * 60000));

    var dias = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];

    return {
        fecha: nyTime,
        hora: nyTime.getHours(),
        minutos: nyTime.getMinutes(),
        diaSemana: nyTime.getDay(),
        diaSemanaStr: dias[nyTime.getDay()]
    };
}

/**
 * Obtiene la hora actual en Eastern Time (ET) como valor decimal (ej: 10.5 para 10:30).
 */
function obtenerHoraETNow() {
    var info = getInfoTiempoNY();
    return info.hora + (info.minutos / 60);
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
 * Verifica si ya se registró el precio para una hora específica hoy en el Score Log.
 */
function yaRegistradoHoy(horaET) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var log = ss.getSheetByName(LOG_SHEET);
    if (!log || log.getLastRow() < 2) return false;

    var info = getInfoTiempoNY();
    var fechaHoyStr = Utilities.formatDate(info.fecha, "GMT", "yyyy-MM-dd");

    var lastRow = log.getLastRow();
    if (lastRow < 2) return false;

    // Optimizamos: solo leemos las últimas ~100 filas
    var startRow = Math.max(2, lastRow - 100);
    var numRows = lastRow - startRow + 1;
    if (numRows <= 0) return false;

    var data = log.getRange(startRow, 1, numRows, 10).getValues();
    var colPrecio = obtenerColumnaPrecio(horaET);

    for (var i = data.length - 1; i >= 0; i--) {
        var fechaRow = data[i][0];
        var fechaRowStr = (fechaRow instanceof Date) ? Utilities.formatDate(fechaRow, "GMT", "yyyy-MM-dd") : "";

        if (fechaRowStr === fechaHoyStr) {
            // Si encontramos al menos un valor en la columna de la hora para hoy
            if (data[i][colPrecio - 1] !== "" && data[i][colPrecio - 1] !== null) return true;
        }
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

function limpiarValor(val) {
    if (val === null || val === undefined || val === "") return null;
    if (typeof val === "number") return val;

    var s = String(val).trim();
    // Remueve $ y espacios (CallMeBot no los quiere)
    s = s.replace(/\$/g, "").replace(/\s/g, "");

    // Si tiene comas y puntos (Formato complejo), decidir según posición
    if (s.indexOf(",") > -1 && s.indexOf(".") > -1) {
        if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
            // Estilo europeo: 1.234,56
            s = s.replace(/\./g, "").replace(",", ".");
        } else {
            // Estilo americano: 1,234.56
            s = s.replace(/,/g, "");
        }
    }
    // Si SOLO tiene coma (ej. 40,17), asumimos que es el decimal (Latam)
    else if (s.indexOf(",") > -1 && s.indexOf(".") === -1) {
        s = s.replace(",", ".");
    }

    var num = parseFloat(s);
    return isNaN(num) ? null : num;
}

/**
 * Envía un mensaje vía WhatsApp usando la API de CallMeBot.
 * @param {string} mensaje - El texto a enviar.
 */
function enviarWhatsApp(mensaje) {
    if (!WS_PHONE || WS_API_KEY === "123456") {
        Logger.log("WhatsApp no configurado. Mensaje omitido: " + mensaje);
        return;
    }

    try {
        // Limpiamos el número por si tiene + o espacios (CallMeBot no los quiere)
        var cleanPhone = String(WS_PHONE).replace(/\+/g, "").replace(/\s/g, "");
        var enc = encodeURIComponent(mensaje);
        var url = "https://api.callmebot.com/whatsapp.php?phone=" + cleanPhone + "&text=" + enc + "&apikey=" + WS_API_KEY;

        var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });

        if (r.getResponseCode() === 200) {
            Logger.log("WhatsApp enviado correctamente: " + mensaje);
        } else {
            Logger.log("Error de CallMeBot: " + r.getContentText());
        }
    } catch (e) {
        Logger.log("Excepción al enviar WhatsApp: " + e.toString());
    }
}
