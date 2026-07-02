// ============================================================
// MTM TRACKER V4 — SERVICIO YAHOO FINANCE
// ============================================================

/**
 * Obtiene histórico de precios desde Yahoo Finance para calcular SMA y ATH.
 * @param {string} ticker
 * @param {number} dias - Días de histórico (ej: 250 para SMA200)
 * @returns {Object|null} { precioActual, sma20, sma50, sma200, ath, cambioPct }
 */
function fetchYahooMetrics(ticker, dias) {
    dias = dias || 250;
    try {
        var ahora = Math.floor(Date.now() / 1000);
        var inicio = ahora - (dias * 24 * 60 * 60);
        var url = "https://query1.finance.yahoo.com/v8/finance/chart/" + ticker +
            "?interval=1d&period1=" + inicio + "&period2=" + ahora;
        var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        if (r.getResponseCode() !== 200) return null;

        var json = JSON.parse(r.getContentText());
        var result = json.chart.result[0];
        if (!result || !result.meta) return null;

        var closes = result.indicators.adjclose[0].adjclose;
        var closesValidos = closes.filter(function(v) { return v !== null && v > 0; });
        if (closesValidos.length < 20) return null;

        var precioActual = result.meta.regularMarketPrice || closesValidos[closesValidos.length - 1];
        var sma20 = calcularSMA(closesValidos, 20);
        var sma50 = calcularSMA(closesValidos, 50);
        var sma200 = calcularSMA(closesValidos, 200);
        var ath = Math.max.apply(null, closesValidos);
        var cambioPct = (closesValidos[closesValidos.length - 1] - closesValidos[closesValidos.length - 2]) / closesValidos[closesValidos.length - 2];

        return {
            precioActual: precioActual,
            sma20: sma20,
            sma50: sma50,
            sma200: sma200,
            ath: ath,
            distanciaATH: (ath - precioActual) / ath,
            cambioPct: cambioPct
        };
    } catch (e) {
        Logger.log("fetchYahooMetrics error " + ticker + ": " + e.message);
        return null;
    }
}

/**
 * Calcula SMA simple.
 */
function calcularSMA(arr, periodo) {
    if (!arr || arr.length < periodo) return null;
    var sum = 0;
    for (var i = arr.length - periodo; i < arr.length; i++) {
        sum += arr[i];
    }
    return sum / periodo;
}

/**
 * Obtiene solo el precio actual (rápido, para alertas).
 */
function fetchPrecioYahooV4(ticker) {
    try {
        var url = "https://query1.finance.yahoo.com/v8/finance/chart/" + ticker + "?interval=1m&range=1d";
        var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        if (r.getResponseCode() !== 200) return null;
        var json = JSON.parse(r.getContentText());
        return json.chart.result[0].meta.regularMarketPrice || null;
    } catch (e) { return null; }
}

/**
 * Consulta Finviz Performance (v141) para un ticker específico vía búsqueda.
 * Como Finviz no tiene API por ticker, scrapeamos la vista performance del primer filtro.
 */
function fetchPerfFinviz(ticker) {
    try {
        var url = "https://finviz.com/screener.ashx?v=141&t=" + ticker;
        var html = fetchFinvizV4(url);
        if (!html) return null;
        var rows = parsearV141V4(html, 1);
        return rows.length > 0 ? rows[0] : null;
    } catch (e) {
        Logger.log("fetchPerfFinviz error: " + e.message);
        return null;
    }
}

/**
 * Wrapper de fetch para Finviz (reutilizable).
 */
function fetchFinvizV4(url) {
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

/**
 * Parsea Finviz v141 (Performance) — versión V4.
 */
function parsearV141V4(html, maxRows) {
    var acciones = [];
    var trR = /class="styled-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
    var m;
    while ((m = trR.exec(html)) !== null && acciones.length < maxRows) {
        var tr = m[1];
        var cells = [];
        var tdR = /<td[^>]*>([\s\S]*?)<\/td>/g;
        var td;
        while ((td = tdR.exec(tr)) !== null) cells.push(cleanV4(td[1]));
        if (cells.length < 15) continue;
        var tkM = tr.match(/data-boxover-ticker="([^"]+)"/);
        var ticker = tkM ? tkM[1] : cells[1];
        if (!ticker || ticker === "Ticker") continue;
        acciones.push({
            ticker: ticker,
            perfWeek: cells[2], perfMonth: cells[3], perfQuart: cells[4], perfHalf: cells[5]
        });
    }
    return acciones;
}

/**
 * Limpia HTML.
 */
function cleanV4(html) {
    if (!html) return "";
    return html.replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
        .trim();
}
