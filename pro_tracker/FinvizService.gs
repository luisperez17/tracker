// ============================================================
// MTM TRACKER — SERVICIO FINVIZ
// ============================================================

/**
 * Obtiene un filtro individual (llamado desde el menú).
 * @param {Object} filtro - Objeto de configuración del filtro.
 * @param {boolean} [silencioso=false] - Si es true, no muestra toasts.
 */
function obtenerFiltro(filtro, silencioso) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast("Obteniendo Perf Week/Month...", "⏳", 30);
    var perfMap = construirPerfMap();
    obtenerFiltroConPerf(filtro, perfMap, silencioso || false);
    if (!silencioso) {
        ss.toast(filtro.nombre + " actualizado con Perf Week/Month", "✅", 4);
    }
}

/**
 * Obtiene datos de Finviz para un filtro específico, incluyendo rendimiento semanal y mensual.
 * @param {Object} filtro - Objeto de configuración del filtro.
 * @param {Object} perfMap - Mapa de rendimientos previos.
 * @param {boolean} silencioso - Si es true, no muestra alertas.
 */
function obtenerFiltroConPerf(filtro, perfMap, silencioso) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName(filtro.hoja);
    if (!ws) { 
        ws = ss.insertSheet(filtro.hoja); 
        formatearHojaFiltro(ws, filtro); 
    }

    var htmlWeek = fetchFinviz(filtro.baseUrl + "&o=-perf1w");
    Utilities.sleep(900);
    var htmlMonth = fetchFinviz(filtro.baseUrl + "&o=-perf4w");

    if (!htmlWeek && !htmlMonth) throw new Error("Sin respuesta de Finviz");

    var accW = htmlWeek ? parsearV111(htmlWeek, MAX) : [];
    var accM = htmlMonth ? parsearV111(htmlMonth, MAX) : [];

    // Combinar deduplicando
    var mapa = {};
    for (var i = 0; i < accW.length; i++) {
        mapa[accW[i].ticker] = accW[i];
        mapa[accW[i].ticker].origenSem = true;
        mapa[accW[i].ticker].origenMes = false;
    }
    for (var j = 0; j < accM.length; j++) {
        if (mapa[accM[j].ticker]) {
            mapa[accM[j].ticker].origenMes = true;
        } else {
            mapa[accM[j].ticker] = accM[j];
            mapa[accM[j].ticker].origenSem = false;
            mapa[accM[j].ticker].origenMes = true;
        }
    }

    var combinadas = Object.values(mapa);
    if (combinadas.length === 0) throw new Error("0 acciones. Reintenta en 1 minuto.");

    // Enriquecer con perf
    for (var k = 0; k < combinadas.length; k++) {
        var p = perfMap[combinadas[k].ticker] || {};
        combinadas[k].perfWeek = p.perfWeek || "";
        combinadas[k].perfMonth = p.perfMonth || "";
        combinadas[k].perfQuart = p.perfQuart || "";
    }

    escribirHojaFiltro(ws, combinadas, filtro);

    // Actualizar timestamp en Dashboard
    actualizarTimestampsDashboardFiltro(filtro, combinadas.length);
}

/**
 * Escribe los datos de las acciones en la hoja del filtro correspondiente.
 */
function escribirHojaFiltro(ws, acciones, filtro) {
    var lastRow = ws.getLastRow();
    if (lastRow >= 7) ws.getRange(7, 1, lastRow - 6, 15).clearContent().clearFormat();

    ws.getRange(5, 1).setValue(
        "Top " + MAX + " Perf Sem + Top " + MAX + " Perf Mes = " +
        acciones.length + " únicos  |  " + new Date().toLocaleString("es")
    ).setBackground(C.ACCENT).setFontColor(C.YELLOW).setFontSize(9);

    if (acciones.length === 0) return;

    var filas = [];
    for (var i = 0; i < acciones.length; i++) {
        var a = acciones[i];
        var origen = (a.origenSem && a.origenMes) ? "Sem+Mes" : a.origenSem ? "Sem" : "Mes";
        filas.push([i + 1, a.ticker, a.empresa, a.sector, a.industria,
        a.pais, a.mktcap, a.pe, a.price, a.change, a.volume,
        a.perfWeek || "", a.perfMonth || "", a.perfQuart || "", origen]);
    }
    ws.getRange(7, 1, filas.length, 15).setValues(filas);
    // Forzar formato numérico en precios para evitar interpretación como fecha (locale es)
    ws.getRange(7, 9, filas.length, 1).setNumberFormat('"$"#,##0.00');

    // Formatear filas
    for (var i = 0; i < acciones.length; i++) {
        var r = 7 + i;
        var bg = i % 2 === 0 ? C.WHITE : C.LIGHT;
        ws.getRange(r, 1, 1, 15).setBackground(bg).setFontSize(9)
            .setVerticalAlignment("middle").setHorizontalAlignment("center");
        ws.getRange(r, 2).setFontWeight("bold");
        ws.getRange(r, 3, 1, 3).setHorizontalAlignment("left");
        ws.getRange(r, 10).setFontColor(acciones[i].changePos ? C.GREEN : C.RED).setFontWeight("bold");
        colorPct(ws.getRange(r, 12), acciones[i].perfWeek, 5, 0);
        colorPct(ws.getRange(r, 13), acciones[i].perfMonth, 10, 0);
        colorPct(ws.getRange(r, 14), acciones[i].perfQuart, 15, 0);

        var oc = ws.getRange(r, 15);
        if (acciones[i].origenSem && acciones[i].origenMes) {
            oc.setFontColor(C.GREEN).setFontWeight("bold").setBackground(C.LGREEN);
        } else if (acciones[i].origenSem) {
            oc.setFontColor("#1565C0").setFontWeight("bold").setBackground("#E3F2FD");
        } else {
            oc.setFontColor("#6A1B9A").setFontWeight("bold").setBackground("#F3E5F5");
        }
        ws.setRowHeight(r, 20);
    }
}

/**
 * Parsea el HTML de Finviz (vista v111 - Overview).
 */
function parsearV111(html, maxRows) {
    var acciones = [];
    var trR = /class="styled-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
    var m;
    while ((m = trR.exec(html)) !== null && acciones.length < maxRows) {
        var tr = m[1];
        var cells = [];
        var tdR = /<td[^>]*>([\s\S]*?)<\/td>/g;
        var td;
        while ((td = tdR.exec(tr)) !== null) cells.push(clean(td[1]));
        if (cells.length < 11) continue;
        var tkM = tr.match(/data-boxover-ticker="([^"]+)"/);
        var ticker = tkM ? tkM[1] : cells[1];
        if (!ticker || ticker.length > 6 || ticker === "Ticker") continue;
        var spans = tr.match(/class="color-text is-(positive|negative)"/g) || [];
        var changePos = (spans[spans.length - 1] || "").indexOf("is-positive") >= 0;
        acciones.push({
            ticker: ticker, empresa: cells[2], sector: cells[3], industria: cells[4],
            pais: cells[5], mktcap: cells[6], pe: cells[7], price: cells[8],
            change: cells[9], volume: cells[10], changePos: changePos
        });
    }
    return acciones;
}

/**
 * Parsea el HTML de Finviz (vista v141 - Performance).
 */
function parsearV141(html, maxRows) {
    var acciones = [];
    var trR = /class="styled-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
    var m;
    while ((m = trR.exec(html)) !== null && acciones.length < maxRows) {
        var tr = m[1];
        var cells = [];
        var tdR = /<td[^>]*>([\s\S]*?)<\/td>/g;
        var td;
        while ((td = tdR.exec(tr)) !== null) cells.push(clean(td[1]));
        if (cells.length < 15) continue;
        var tkM = tr.match(/data-boxover-ticker="([^"]+)"/);
        var ticker = tkM ? tkM[1] : cells[1];
        if (!ticker || ticker.length > 6 || ticker === "Ticker") continue;
        acciones.push({
            ticker: ticker, perfWeek: cells[2], perfMonth: cells[3],
            perfQuart: cells[4], perfHalf: cells[5]
        });
    }
    return acciones;
}

/**
 * Construye un mapa de rendimientos (performance) para todos los filtros.
 */
function construirPerfMap() {
    var perfMap = {};
    for (var fi = 0; fi < FILTROS.length; fi++) {
        var base = FILTROS[fi].perfBase;
        var urls = [base + "&o=-perf1w", base + "&o=-perf4w"];
        for (var ui = 0; ui < urls.length; ui++) {
            try {
                var html = fetchFinviz(urls[ui]);
                if (!html) continue;
                var rows = parsearV141(html, MAX);
                for (var i = 0; i < rows.length; i++) {
                    var r = rows[i];
                    if (!perfMap[r.ticker]) {
                        perfMap[r.ticker] = { perfWeek: r.perfWeek, perfMonth: r.perfMonth, perfQuart: r.perfQuart };
                    } else {
                        if (!perfMap[r.ticker].perfWeek && r.perfWeek) perfMap[r.ticker].perfWeek = r.perfWeek;
                        if (!perfMap[r.ticker].perfMonth && r.perfMonth) perfMap[r.ticker].perfMonth = r.perfMonth;
                        if (!perfMap[r.ticker].perfQuart && r.perfQuart) perfMap[r.ticker].perfQuart = r.perfQuart;
                    }
                }
                Utilities.sleep(800);
            } catch (e) { Logger.log("perfMap[" + FILTROS[fi].key + "]: " + e.message); }
        }
    }
    return perfMap;
}

/**
 * Realiza la petición HTTP a Finviz con headers personalizados.
 */
function fetchFinviz(url) {
    try {
        var r = UrlFetchApp.fetch(url, {
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.9"
            },
            muteHttpExceptions: true, 
            followRedirects: true
        });
        return r.getResponseCode() === 200 ? r.getContentText() : null;
    } catch (e) { return null; }
}
