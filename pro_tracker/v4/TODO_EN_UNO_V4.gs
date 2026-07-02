// ============================================================
// MTM TRACKER V4 — TODO EN UNO (Config + Services + Main + Setup)
// ============================================================
// Copia TODO este archivo y pégalo en Google Apps Script como UN SOLO archivo .gs
// Luego ejecuta: instalarV4()
// ============================================================

// ============================================================
// 1. CONFIGURACIÓN Y CONSTANTES
// ============================================================

/** @constant {string} Separador de fórmulas (español) */
var S = ";";

/** @constant {Object} Paleta de colores V4 */
var C4 = {
    DARK: "#1A1A2E", MID: "#16213E", ACCENT: "#0F3460",
    GREEN: "#00C853", YELLOW: "#FFD600", RED: "#FF1744",
    ORANGE: "#FF6D00", WHITE: "#FFFFFF", LIGHT: "#F0F4F8",
    LBLUE: "#E3F2FD", GRAY: "#B0BEC5", LGREEN: "#E8F5E9",
    LYELLOW: "#FFF9C4", LRED: "#FFEBEE"
};

var FILTROS_V4 = [
    {
        key: "catalyst",
        nombre: "🚀 Catalizador", hoja: "FV_Catalyst",
        desc: "Post Earnings Breakout + New High (eventos concretos)",
        baseUrl: "https://finviz.com/screener.ashx?v=111&f=earningsdate_thisweek|earningsdate_today|ta_newhigh&ft=4",
        perfBase: "https://finviz.com/screener.ashx?v=141&f=earningsdate_thisweek|earningsdate_today|ta_newhigh&ft=4",
        pts: 3, tier: 1
    },
    {
        key: "momentum",
        nombre: "📈 Momentum", hoja: "FV_Momentum",
        desc: "YTD Top + Ganadores Semana + Volumen",
        baseUrl: "https://finviz.com/screener.ashx?v=111&f=cap_midover,ta_perf_1w20o,ta_sma200_pa,ta_sma50_pa&ft=4",
        perfBase: "https://finviz.com/screener.ashx?v=141&f=cap_midover,ta_perf_1w20o,ta_sma200_pa,ta_sma50_pa&ft=4",
        pts: 2, tier: 2
    },
    {
        key: "trend",
        nombre: "📐 Tendencia", hoja: "FV_Trend",
        desc: "SMA 20/50/200 + Channel Up + RSI > 50",
        baseUrl: "https://finviz.com/screener.ashx?v=111&f=ta_sma20_pa,ta_sma200_pa,ta_sma50_pa,ta_rsi_ob50&ft=4",
        perfBase: "https://finviz.com/screener.ashx?v=141&f=ta_sma20_pa,ta_sma200_pa,ta_sma50_pa,ta_rsi_ob50&ft=4",
        pts: 1, tier: 3
    },
    {
        key: "quality",
        nombre: "🏭 Calidad", hoja: "FV_Quality",
        desc: "EPS 5yr > 20%, Revenue YoY > 20%",
        baseUrl: "https://finviz.com/screener.ashx?v=111&f=fa_eps5years_o20,fa_epsyoy_o20,fa_sales5years_o20&ft=4",
        perfBase: "https://finviz.com/screener.ashx?v=141&f=fa_eps5years_o20,fa_epsyoy_o20,fa_sales5years_o20&ft=4",
        pts: 1, tier: 3
    }
];

var SHEET_WL = "📋 WL CDI";
var SHEET_RADAR = "🎯 Radar Semanal";
var SHEET_TRACKER = "📈 Tracker Diario";
var SHEET_LOG = "📊 Score Log V4";
var SHEET_DASHBOARD = "📊 Dashboard V4";

var EMAIL_ALERTS = true;
var EMAIL_HORAS = [9.5, 11.5, 13.5, 15.5]; // 9:30, 11:30, 13:30, 15:30 ET (4 alertas al día)
var EMAIL_TO = "duardo07@hotmail.com";
var EMAIL_TO_CC = "pz910531@hotmail.com";
var CANAL_ALERTA = "ambos";
var WS_PHONE = "573124873708";
var WS_API_KEY = "1386524";

var UMBRAL_MIN_SCORE = 2.0;
var UMBRAL_ALTA_CONF = 4.5;
var UMBRAL_MEDIA_CONF = 3.0;

var PESO_MOMENTUM = 0.35;
var PESO_FUERZA_REL = 0.25;
var PESO_TENDENCIA = 0.25;
var PESO_RIESGO = 0.15;

var SMA_PERIODOS = [20, 50, 200];

// ============================================================
// 2. SERVICIO YAHOO FINANCE
// ============================================================

function fetchYahooMetrics(ticker, dias) {
    dias = dias || 400; // SMA200 necesita ~200 velas; 400 días asegura suficientes
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

function calcularSMA(arr, periodo) {
    if (!arr || arr.length < periodo) return null;
    var sum = 0;
    for (var i = arr.length - periodo; i < arr.length; i++) {
        sum += arr[i];
    }
    return sum / periodo;
}

function fetchPrecioYahooV4(ticker) {
    try {
        var url = "https://query1.finance.yahoo.com/v8/finance/chart/" + ticker + "?interval=1m&range=1d";
        var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        if (r.getResponseCode() !== 200) return null;
        var json = JSON.parse(r.getContentText());
        return json.chart.result[0].meta.regularMarketPrice || null;
    } catch (e) { return null; }
}

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

function cleanV4(html) {
    if (!html) return "";
    return html.replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
        .trim();
}

// ============================================================
// 3. MOTOR RADAR SEMANAL (SCORING MEJORADO)
// ============================================================

function generarRadarSemanal() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast("Iniciando Radar V4...", "🎯", 30);

    var wlData = leerWLCDI();
    if (!wlData || wlData.length === 0) {
        ss.toast("No hay datos en " + SHEET_WL, "⚠️", 5);
        return;
    }

    ss.toast("Analizando " + wlData.length + " tickers desde WL...", "📊", 30);

    var resultados = [];
    for (var i = 0; i < wlData.length; i++) {
        var item = wlData[i];
        ss.toast(item.ticker + "...", "⏳", 2);
        var analisis = analizarTickerV4(item);
        if (analisis) resultados.push(analisis);
        if (i < wlData.length - 1) Utilities.sleep(800);
    }

    var filtrados = resultados.filter(function(r) { return r.scoreV4 >= UMBRAL_MIN_SCORE; });
    filtrados.sort(function(a, b) { return b.scoreV4 - a.scoreV4; });

    escribirRadarSemanal(ss, filtrados);
    actualizarDashboardV4(ss, filtrados);
    guardarScoreLogV4(ss, filtrados);

    ss.toast("Radar V4 listo: " + filtrados.length + " candidatas", "✅", 5);
}

/**
 * Genera el Radar Semanal usando la WL V5 Generado (Motor Propio en Colab).
 */
function generarRadarDesdeV5() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast("Iniciando Radar desde WL V5...", "🎯", 30);

    var wlData = leerWLV5();
    if (!wlData || wlData.length === 0) {
        ss.toast("No hay datos en 📋 WL V5 Generado. Ejecutá el Colab primero.", "⚠️", 6);
        return;
    }

    ss.toast("Analizando " + wlData.length + " tickers desde WL V5...", "📊", 30);

    var resultados = [];
    for (var i = 0; i < wlData.length; i++) {
        var item = wlData[i];
        ss.toast(item.ticker + "...", "⏳", 2);
        var analisis = analizarTickerV4(item);
        if (analisis) resultados.push(analisis);
        if (i < wlData.length - 1) Utilities.sleep(800);
    }

    var filtrados = resultados.filter(function(r) { return r.scoreV4 >= UMBRAL_MIN_SCORE; });
    filtrados.sort(function(a, b) { return b.scoreV4 - a.scoreV4; });

    escribirRadarSemanal(ss, filtrados);
    actualizarDashboardV4(ss, filtrados);
    guardarScoreLogV4(ss, filtrados);

    ss.toast("Radar V5 listo: " + filtrados.length + " candidatas", "✅", 5);
}

/**
 * Genera el Radar COMBINANDO ambas fuentes: WL CDI + WL V5.
 * Elimina duplicados (prioriza datos del CDI si un ticker está en ambas).
 * Calcula setup completo (Entrada, Stop, Target, R/R) para todos.
 */
function generarRadarCombinado() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast("Iniciando Radar COMBINADO (CDI + V5)...", "🎯", 30);

    var wlCDI = leerWLCDI();
    var wlV5 = leerWLV5();

    if ((!wlCDI || wlCDI.length === 0) && (!wlV5 || wlV5.length === 0)) {
        ss.toast("No hay datos ni en WL CDI ni en WL V5. Pegá al menos una fuente.", "⚠️", 6);
        return;
    }

    // Merge: ticker → datos (prioridad CDI)
    var mergeMap = {};

    if (wlV5) {
        for (var i = 0; i < wlV5.length; i++) {
            mergeMap[wlV5[i].ticker] = wlV5[i];
        }
    }

    if (wlCDI) {
        for (var i = 0; i < wlCDI.length; i++) {
            mergeMap[wlCDI[i].ticker] = wlCDI[i]; // Sobrescribe con CDI (prioridad)
        }
    }

    var unicos = Object.keys(mergeMap).map(function(tk) { return mergeMap[tk]; });
    ss.toast("Analizando " + unicos.length + " tickers combinados (CDI+V5)...", "📊", 30);

    var resultados = [];
    for (var i = 0; i < unicos.length; i++) {
        var item = unicos[i];
        ss.toast(item.ticker + "...", "⏳", 2);
        var analisis = analizarTickerV4(item);
        if (analisis) resultados.push(analisis);
        if (i < unicos.length - 1) Utilities.sleep(800);
    }

    var filtrados = resultados.filter(function(r) { return r.scoreV4 >= UMBRAL_MIN_SCORE; });
    filtrados.sort(function(a, b) { return b.scoreV4 - a.scoreV4; });

    escribirRadarSemanal(ss, filtrados);
    actualizarDashboardV4(ss, filtrados);
    guardarScoreLogV4(ss, filtrados);

    var deCDI = wlCDI ? wlCDI.length : 0;
    var deV5 = wlV5 ? wlV5.length : 0;
    ss.toast("Radar COMBINADO listo: " + filtrados.length + " candidatas (CDI:" + deCDI + " + V5:" + deV5 + ")", "✅", 5);
}

function leerWLCDI() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName(SHEET_WL);
    if (!ws || ws.getLastRow() < 5) return [];

    var lastCol = Math.min(ws.getLastColumn(), 13);
    var data = ws.getRange(5, 1, ws.getLastRow() - 4, lastCol).getValues();
    var lista = [];
    for (var i = 0; i < data.length; i++) {
        var tk = String(data[i][0]).trim().toUpperCase();
        if (!tk || tk === "Ticker") continue;
        lista.push({
            ticker: tk,
            empresa: String(data[i][1] || "").trim(),
            sector: String(data[i][2] || "").trim(),
            atrLow: String(data[i][3] || "").trim(),
            earnings: String(data[i][4] || "").trim(),
            perfWeekRaw: data[i][5],
            perfMonthRaw: data[i][6],
            sctrRaw: data[i][7],
            rsiRaw: data[i][8],
            adxRaw: data[i][9],
            betaRaw: data[i][10],
            atr14Raw: data[i][11],
            ema20Raw: data[i][12]
        });
    }
    return lista;
}

/**
 * Lee la WL V5 Generado (del Motor Propio en Colab).
 * Formato V5: Ticker(0), Empresa(1), Sector(2), Score V4(3), ATR/LOW(4), Earnings(5),
 *          Perf Sem %(6), Perf Mes %(7), SCTR(8), RSI(9), ADX(10), Beta(11), ATR(12), EMA20(13)
 */
function leerWLV5() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName('📋 WL V5 Generado');
    if (!ws || ws.getLastRow() < 2) return [];

    // Leer 14 columnas (incluye Score V4 en col D)
    var data = ws.getRange(2, 1, ws.getLastRow() - 1, 14).getValues();
    var lista = [];
    for (var i = 0; i < data.length; i++) {
        var tk = String(data[i][0]).trim().toUpperCase();
        if (!tk || tk === "Ticker") continue;
        lista.push({
            ticker: tk,
            empresa: String(data[i][1] || "").trim(),
            sector: String(data[i][2] || "").trim(),
            scoreV4: parseFloat(data[i][3]) || null, // Score V4 ya calculado en Colab
            atrLow: String(data[i][4] || "").trim(),
            earnings: String(data[i][5] || "").trim(),
            perfWeekRaw: data[i][6],
            perfMonthRaw: data[i][7],
            sctrRaw: data[i][8],
            rsiRaw: data[i][9],
            adxRaw: data[i][10],
            betaRaw: data[i][11],
            atr14Raw: data[i][12],
            ema20Raw: data[i][13]
        });
    }
    return lista;
}

function analizarTickerV4(item) {
    var pW = parsePct(item.perfWeekRaw);
    var pM = parsePct(item.perfMonthRaw);
    var pQ = null;

    var yahoo = fetchYahooMetrics(item.ticker, 250);
    if (!yahoo) {
        Logger.log("Yahoo falló para " + item.ticker);
        var fallbackPrecio = fetchPrecioYahooV4(item.ticker);
        if (!fallbackPrecio) return null;
        yahoo = { precioActual: fallbackPrecio, sma20: null, sma50: null, sma200: null, ath: null, distanciaATH: null, cambioPct: 0 };
    }

    var perfFinviz = null;
    if (pW === null || pM === null) {
        perfFinviz = fetchPerfFinviz(item.ticker);
        if (perfFinviz) {
            if (pW === null) pW = parsePct(perfFinviz.perfWeek);
            if (pM === null) pM = parsePct(perfFinviz.perfMonth);
            pQ = parsePct(perfFinviz.perfQuart);
        }
    }

    var sctr = parseFloat(item.sctrRaw) || null;
    var rsi = parseFloat(item.rsiRaw) || null;
    var adx = parseFloat(item.adxRaw) || null;
    var beta = parseFloat(item.betaRaw) || null;

    var score = calcularScoreV4(pW, pM, pQ, item.atrLow, item.earnings, yahoo, sctr, rsi, adx, beta);
    var setup = calcularSetupSugerido(yahoo, item.atrLow);

    return {
        ticker: item.ticker,
        empresa: item.empresa,
        sector: item.sector,
        precio: yahoo.precioActual,
        perfWeek: pW !== null ? pW : 0,
        perfMonth: pM !== null ? pM : 0,
        perfQuart: pQ !== null ? pQ : 0,
        sma20: yahoo.sma20,
        sma50: yahoo.sma50,
        sma200: yahoo.sma200,
        distanciaATH: yahoo.distanciaATH,
        atrLow: item.atrLow,
        earnings: item.earnings,
        scoreV4: score,
        entradaSug: setup.entrada,
        stopSug: setup.stop,
        targetSug: setup.target,
        rrSug: setup.rr,
        estado: score >= UMBRAL_ALTA_CONF ? "🟢 ALTA" : score >= UMBRAL_MEDIA_CONF ? "🟡 MEDIA" : "🟠 BASE"
    };
}

function calcularScoreV4(pW, pM, pQ, atrLow, earningsStr, yahoo, sctr, rsi, adx, beta) {
    var momentum = 0;
    if (pW > 20) momentum += 4;
    else if (pW > 15) momentum += 3;
    else if (pW > 10) momentum += 2;
    else if (pW > 5) momentum += 1;
    else if (pW > 0) momentum += 0.5;
    else if (pW !== null) momentum -= 1;

    if (pM > 20) momentum += 2;
    else if (pM > 10) momentum += 1.5;
    else if (pM > 0) momentum += 0.5;
    else if (pM !== null) momentum -= 0.5;

    if (pQ > 30) momentum += 1;
    else if (pQ > 15) momentum += 0.5;

    var fuerzaRel = 0;
    if (sctr !== null && !isNaN(sctr)) {
        if (sctr >= 98) fuerzaRel += 5;
        else if (sctr >= 95) fuerzaRel += 4.5;
        else if (sctr >= 90) fuerzaRel += 4;
        else if (sctr >= 85) fuerzaRel += 3;
        else if (sctr >= 80) fuerzaRel += 2;
        else if (sctr >= 70) fuerzaRel += 1;
        else if (sctr >= 50) fuerzaRel += 0.5;
    } else if (yahoo && yahoo.distanciaATH !== null && yahoo.distanciaATH < 0.10) {
        fuerzaRel += 1.5;
    }

    var tendencia = 0;
    if (yahoo && yahoo.precioActual) {
        if (yahoo.sma200 && yahoo.precioActual > yahoo.sma200) tendencia += 1.5;
        if (yahoo.sma50 && yahoo.precioActual > yahoo.sma50) tendencia += 1.0;
        if (yahoo.sma20 && yahoo.precioActual > yahoo.sma20) tendencia += 0.5;
    }
    if (adx !== null && !isNaN(adx)) {
        if (adx > 30) tendencia += 2.0;
        else if (adx > 25) tendencia += 1.5;
        else if (adx > 20) tendencia += 1.0;
        else if (adx < 15) tendencia -= 1.0;
    }

    var riesgo = 0;
    if (rsi !== null && !isNaN(rsi)) {
        if (rsi > 80) riesgo -= 1.5;
        else if (rsi > 70) riesgo -= 0.5;
        else if (rsi >= 50) riesgo += 1.5;
        else if (rsi >= 40) riesgo += 0.5;
        else riesgo -= 0.5;
    }
    if (beta !== null && !isNaN(beta)) {
        if (beta > 2.5) riesgo -= 1.0;
        else if (beta > 1.5) riesgo -= 0.5;
        else if (beta >= 0.8) riesgo += 0.5;
        else riesgo += 1.0;
    }
    var atrStr = String(atrLow).toLowerCase();
    if (atrStr.indexOf("verde") >= 0 || atrStr.indexOf("✅") >= 0) riesgo += 1;
    else if (atrStr.indexOf("rojo") >= 0 || atrStr.indexOf("❌") >= 0) riesgo -= 1;

    var diasEarn = diasHastaEarnings(earningsStr);
    if (diasEarn !== null) {
        if (diasEarn < 7 && diasEarn >= 0) riesgo -= 2;
        else if (diasEarn < 30 && diasEarn >= 0) riesgo -= 1;
        else if (diasEarn < 0) riesgo += 0.5;
    }

    var score = (momentum * PESO_MOMENTUM) +
                (fuerzaRel * PESO_FUERZA_REL) +
                (tendencia * PESO_TENDENCIA) +
                (riesgo * PESO_RIESGO);

    return Math.round(Math.max(0, Math.min(10, score)) * 100) / 100;
}

function calcularSetupSugerido(yahoo, atrLow) {
    var precio = yahoo.precioActual;
    if (!precio) return { entrada: null, stop: null, target: null, rr: null };

    var entrada = precio;
    var stop;
    var atrStr = String(atrLow).toLowerCase();
    if (atrStr.indexOf("verde") >= 0 || atrStr.indexOf("✅") >= 0) {
        stop = yahoo.sma20 || (precio * 0.96);
    } else {
        stop = precio * 0.96;
    }

    if (stop >= entrada) stop = entrada * 0.95;

    var riesgo = entrada - stop;
    var target = entrada + (riesgo * 2.5);
    var rr = riesgo > 0 ? (target - entrada) / riesgo : 0;

    return {
        entrada: Math.round(entrada * 100) / 100,
        stop: Math.round(stop * 100) / 100,
        target: Math.round(target * 100) / 100,
        rr: Math.round(rr * 100) / 100
    };
}

function parsePct(val) {
    if (val === null || val === undefined || val === "") return null;
    var s = String(val).replace("%", "").replace("+", "").replace(",", ".").trim();
    var n = parseFloat(s);
    return isNaN(n) ? null : n;
}

function diasHastaEarnings(earnStr) {
    if (!earnStr || earnStr === "") return null;
    try {
        var d = new Date(earnStr);
        if (isNaN(d.getTime())) return null;
        var hoy = new Date();
        hoy.setHours(0,0,0,0);
        return Math.ceil((d - hoy) / (1000 * 60 * 60 * 24));
    } catch (e) { return null; }
}

function escribirRadarSemanal(ss, datos) {
    var ws = ss.getSheetByName(SHEET_RADAR);
    if (!ws) {
        ws = ss.insertSheet(SHEET_RADAR);
        formatearRadar(ws);
    }

    var lr = ws.getLastRow();
    if (lr > 5) ws.getRange(6, 1, lr - 5, 18).clearContent().clearFormat();

    ws.getRange(3, 1).setValue("Radar generado: " + new Date().toLocaleString("es") +
        " | " + datos.length + " candidatas | Score V4 = Momentum(35%) + FuerzaRel(25%) + Tendencia(25%) + Riesgo(15%)");

    for (var i = 0; i < datos.length; i++) {
        var d = datos[i];
        var r = 6 + i;
        var bg = d.estado.indexOf("ALTA") >= 0 ? C4.LGREEN :
                 d.estado.indexOf("MEDIA") >= 0 ? C4.LYELLOW : C4.LIGHT;

        ws.getRange(r, 1, 1, 18).setValues([[
            d.ticker, d.empresa, d.sector,
            d.precio, d.perfWeek, d.perfMonth, d.perfQuart,
            d.sma20 || "", d.sma50 || "", d.sma200 || "", d.distanciaATH || "",
            d.atrLow, d.earnings, d.scoreV4,
            d.entradaSug, d.stopSug, d.targetSug, d.rrSug
        ]]);

        ws.getRange(r, 1, 1, 18).setBackground(bg).setFontSize(9).setVerticalAlignment("middle").setHorizontalAlignment("center");
        ws.getRange(r, 1).setFontWeight("bold");
        ws.getRange(r, 2, 1, 2).setHorizontalAlignment("left");

        ws.getRange(r, 4).setNumberFormat('"$"#,##0.00');
        ws.getRange(r, 5, 1, 3).setNumberFormat("0.00%;+0.00%;-0.00%"); // Perf W/M/Q como %
        ws.getRange(r, 8, 1, 3).setNumberFormat('"$"#,##0.00'); // SMAs
        ws.getRange(r, 11).setNumberFormat("0.00%;+0.00%;-0.00%"); // Dist ATH como %
        ws.getRange(r, 16, 1, 3).setNumberFormat('"$"#,##0.00'); // Entrada/Stop/Target
        ws.getRange(r, 18).setNumberFormat("0.00x"); // R/R

        var scCell = ws.getRange(r, 14);
        scCell.setFontWeight("bold").setFontSize(10);
        if (d.scoreV4 >= UMBRAL_ALTA_CONF) scCell.setFontColor(C4.GREEN).setBackground("#1B5E20");
        else if (d.scoreV4 >= UMBRAL_MEDIA_CONF) scCell.setFontColor(C4.ORANGE).setBackground("#FFF3E0");
        else scCell.setFontColor(C4.GRAY);

        var rrCell = ws.getRange(r, 18);
        rrCell.setFontWeight("bold");
        if (d.rrSug >= 2) rrCell.setFontColor(C4.GREEN);
        else if (d.rrSug >= 1.5) rrCell.setFontColor(C4.YELLOW);
        else rrCell.setFontColor(C4.RED);

        ws.setRowHeight(r, 22);
    }
}

function formatearRadar(ws) {
    ws.clear();
    ws.getRange(1, 1, 1, 18).merge().setValue("🎯  RADAR SEMANAL V4  —  WL CDI + Momentum Score")
        .setBackground(C4.DARK).setFontColor(C4.GREEN).setFontSize(14).setFontWeight("bold").setHorizontalAlignment("center");
    ws.setRowHeight(1, 40);

    ws.getRange(2, 1, 1, 18).merge().setValue("Paso 1: Pegar WL CDI  |  Paso 2: Ejecutar generarRadarSemanal()  |  Paso 3: Revisar setups 🟢🟡🟠")
        .setBackground(C4.ACCENT).setFontColor(C4.YELLOW).setFontSize(10).setFontWeight("bold");
    ws.setRowHeight(2, 22);

    ws.getRange(3, 1, 1, 18).merge().setValue("Radar generado: (pendiente)")
        .setBackground(C4.MID).setFontColor(C4.GRAY).setFontSize(9);

    // Fila 4: descripciones breves de cada columna
    var descs = [
        "Símbolo", "Nombre compañía", "Industria", "Precio hoy (Yahoo)",
        "Rend. semanal %", "Rend. mensual %", "Rend. trimestral %",
        "Media 20 días", "Media 50 días", "Media 200 días",
        "% debajo del ATH", "Señal ATR", "Próx. Reporte", "Puntaje V4",
        "Precio sugerido", "Stop sugerido", "Target sugerido", "Relación Riesgo/Beneficio"
    ];
    for (var i = 0; i < descs.length; i++) {
        ws.getRange(4, i + 1).setValue(descs[i]).setBackground("#37474F").setFontColor(C4.GRAY)
            .setFontSize(8).setHorizontalAlignment("center").setWrap(true);
    }
    ws.setRowHeight(4, 28);

    var hdrs = ["Ticker", "Empresa", "Sector", "Precio", "Perf W%", "Perf M%", "Perf Q%",
        "SMA20", "SMA50", "SMA200", "Dist ATH", "ATR/LOW", "Earnings", "Score V4",
        "Entrada $", "Stop $", "Target $", "R/R"];
    var wCols = [70, 160, 120, 80, 70, 70, 70, 80, 80, 80, 75, 70, 90, 72, 80, 72, 80, 60];

    for (var i = 0; i < hdrs.length; i++) {
        var bg = (i >= 4 && i <= 6) ? "#1A237E" : C4.DARK;
        var fg = (i >= 4 && i <= 6) ? C4.YELLOW : C4.WHITE;
        ws.getRange(5, i + 1).setValue(hdrs[i]).setBackground(bg).setFontColor(fg)
            .setFontWeight("bold").setHorizontalAlignment("center").setWrap(true);
        ws.setColumnWidth(i + 1, wCols[i]);
    }
    ws.setRowHeight(5, 36);
    ws.setFrozenRows(5);
}

function actualizarDashboardV4(ss, datos) {
    var dash = ss.getSheetByName(SHEET_DASHBOARD);
    if (!dash) return;
    var alta = datos.filter(function(d){ return d.scoreV4 >= UMBRAL_ALTA_CONF; }).length;
    var media = datos.filter(function(d){ return d.scoreV4 >= UMBRAL_MEDIA_CONF && d.scoreV4 < UMBRAL_ALTA_CONF; }).length;
    var base = datos.filter(function(d){ return d.scoreV4 >= UMBRAL_MIN_SCORE && d.scoreV4 < UMBRAL_MEDIA_CONF; }).length;

    dash.getRange(3, 2).setValue(alta).setFontColor(C4.GREEN).setFontWeight("bold");
    dash.getRange(4, 2).setValue(media).setFontColor(C4.YELLOW).setFontWeight("bold");
    dash.getRange(5, 2).setValue(base).setFontColor(C4.ORANGE).setFontWeight("bold");
    dash.getRange(6, 2).setValue(new Date()).setNumberFormat("dd/mm/yyyy hh:mm").setFontColor(C4.GRAY);
}

/**
 * Guarda un snapshot histórico en Score Log V4 cada vez que se genera el Radar.
 * Esto permite hacer backtesting y análisis de rendimiento posterior.
 */
function guardarScoreLogV4(ss, datos) {
    var log = ss.getSheetByName(SHEET_LOG);
    if (!log) {
        log = ss.insertSheet(SHEET_LOG);
        formatearScoreLogV4(log);
    }

    // Verificar qué tickers están en el Tracker (para la columna "Tracker?")
    var tracker = ss.getSheetByName(SHEET_TRACKER);
    var trackerTickers = {};
    if (tracker && tracker.getLastRow() >= 6) {
        var tData = tracker.getRange(6, 1, tracker.getLastRow() - 5, 1).getValues();
        for (var i = 0; i < tData.length; i++) {
            trackerTickers[String(tData[i][0]).trim().toUpperCase()] = true;
        }
    }

    var fecha = new Date();
    var filas = [];
    for (var i = 0; i < datos.length; i++) {
        var d = datos[i];
        filas.push([
            fecha,
            d.ticker,
            d.precio,
            d.scoreV4,
            d.estado || '',
            d.entradaSug || '',
            d.stopSug || '',
            d.targetSug || '',
            d.rrSug || '',
            d.perfWeek,
            d.perfMonth,
            d.sector || '',
            d.distanciaATH || '',
            d.atrLow || '',
            '', // SCTR (no disponible en objeto final, placeholder)
            'Radar', // Fuente (por ahora genérico; Fase 7 puede diferenciar)
            trackerTickers[d.ticker] ? 'SÍ' : 'NO'
        ]);
    }

    if (filas.length > 0) {
        var startRow = log.getLastRow() + 1;
        log.getRange(startRow, 1, filas.length, 17).setValues(filas);
        // Formatear fechas
        log.getRange(startRow, 1, filas.length, 1).setNumberFormat("dd/mm/yyyy hh:mm");
    }
}

// ============================================================
// 4. ALERTAS DUAL: EMAIL + WHATSAPP
// ============================================================

function enviarAlertaDual() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var canal = getCanalAlertaV4();
    var logs = [];

    if (!EMAIL_ALERTS && canal === "email") {
        ss.toast("EMAIL_ALERTS está en false. Actívalo en ConfigV4.", "⚠️ Alertas", 6);
        return;
    }

    var ws = ss.getSheetByName(SHEET_TRACKER);
    if (!ws) {
        ss.toast("No existe la hoja '" + SHEET_TRACKER + "'. Ejecuta 'Configurar hojas V4'.", "⚠️ Alertas", 6);
        return;
    }
    if (ws.getLastRow() < 6) {
        ss.toast("Tracker vacío (sin filas de datos). Agregá tickers en fila 6+.", "⚠️ Alertas", 6);
        return;
    }

    var data = ws.getRange(6, 1, ws.getLastRow() - 5, 10).getValues();
    logs.push("Filas en Tracker: " + data.length);

    var activas = [];
    var sinCheck = 0;
    var sinPrecio = 0;

    for (var i = 0; i < data.length; i++) {
        var tk = String(data[i][0]).trim().toUpperCase();
        var track = data[i][4];
        if (!tk) continue;
        if (track !== true) { sinCheck++; continue; }

        var entrada = parseFloat(data[i][5]) || 0;
        var stop = parseFloat(data[i][6]) || 0;
        var target = parseFloat(data[i][7]) || 0;
        var precioActual = fetchPrecioYahooV4(tk);

        if (precioActual === null) {
            sinPrecio++;
            logs.push(tk + ": sin precio Yahoo");
            continue;
        }

        var pnl = entrada > 0 ? (precioActual - entrada) / entrada : 0;
        var estado = "⚪ NEUTRO";
        if (target > 0 && precioActual >= target) estado = "🎯 TARGET HIT";
        else if (stop > 0 && precioActual <= stop) estado = "🛑 STOP HIT";
        else if (pnl > 0.05) estado = "📈 STRONG UP";
        else if (pnl > 0) estado = "📈 PROFIT";
        else if (pnl < -0.05) estado = "📉 DANGER";
        else estado = "📉 LOSS";

        activas.push({
            ticker: tk,
            entrada: entrada,
            precio: precioActual,
            pnl: pnl,
            estado: estado,
            stop: stop,
            target: target
        });
    }

    logs.push("Con Track=true: " + (data.length - sinCheck) + " | Sin precio Yahoo: " + sinPrecio + " | Activas válidas: " + activas.length);

    if (activas.length === 0) {
        var msg = "No se envió alerta. Revisá:\n" +
                  "• " + data.length + " filas en Tracker\n" +
                  "• " + sinCheck + " sin check (col E)\n" +
                  "• " + sinPrecio + " sin precio Yahoo\n\n" +
                  "Pasos: 1) Pegá tickers en col A. 2) Activá check en col E. 3) Asegurate de tener Radar generado.";
        ss.toast(msg, "⚠️ Sin alertas", 10);
        return;
    }

    var info = getInfoTiempoNYV4();
    var subject = "📊 MTM V4 — " + info.diaSemanaStr + " " + info.hora + ":" + (info.minutos < 10 ? "0" + info.minutos : info.minutos) + " ET";

    var okEmail = false, okWs = false;

    if (canal === "email" || canal === "ambos") {
        var html = construirHtmlAlerta(activas, info);
        try {
            MailApp.sendEmail({
                to: EMAIL_TO,
                cc: EMAIL_TO_CC,
                subject: subject,
                htmlBody: html,
                name: "MTM V4 Bot"
            });
            okEmail = true;
            logs.push("Email enviado a " + EMAIL_TO + " (CC: " + EMAIL_TO_CC + ")");
        } catch (e) {
            logs.push("ERROR Email: " + e.message);
        }
    }

    if (canal === "whatsapp" || canal === "ambos") {
        var msg = construirMensajeWhatsApp(activas, info);
        okWs = enviarWhatsAppV4(msg);
        logs.push("WhatsApp: " + (okWs ? "OK" : "FALLÓ"));
    }

    var resumen = "Enviadas: " + activas.length + " | " +
                  (canal === "email" || canal === "ambos" ? (okEmail ? "✅Email " : "❌Email ") : "") +
                  (canal === "whatsapp" || canal === "ambos" ? (okWs ? "✅WhatsApp" : "❌WhatsApp") : "");
    ss.toast(resumen, "📱📧 Alertas", 8);

    // Log detallado al Logger de Apps Script
    Logger.log("=== DIAGNÓSTICO ALERTA ===");
    logs.forEach(function(l){ Logger.log(l); });
    Logger.log("==========================");
}

function construirHtmlAlerta(activas, info) {
    var html = "<h2 style='color:#00C853;font-family:sans-serif;'>📊 MTM Tracker V4</h2>";
    html += "<p style='color:#666;font-size:12px;'>" + info.diaSemanaStr + " " + info.hora + ":" + (info.minutos < 10 ? "0" + info.minutos : info.minutos) + " NY Time</p>";
    html += "<table border='1' cellpadding='8' style='border-collapse:collapse;font-family:sans-serif;font-size:13px;'>";
    html += "<tr style='background:#1A1A2E;color:#fff;'><th>Ticker</th><th>Entrada</th><th>Actual</th><th>P&L %</th><th>Estado</th><th>Stop</th><th>Target</th></tr>";

    for (var a = 0; a < activas.length; a++) {
        var ac = activas[a];
        var bg = ac.estado.indexOf("TARGET") >= 0 ? "#E8F5E9" :
                 ac.estado.indexOf("STOP") >= 0 ? "#FFEBEE" :
                 ac.estado.indexOf("STRONG") >= 0 ? "#E8F5E9" :
                 ac.estado.indexOf("DANGER") >= 0 ? "#FFEBEE" : "#F0F4F8";
        var pnlStr = (ac.pnl * 100).toFixed(2);
        if (ac.pnl > 0) pnlStr = "+" + pnlStr;

        html += "<tr style='background:" + bg + ";'>";
        html += "<td><b>" + ac.ticker + "</b></td>";
        html += "<td>$" + ac.entrada.toFixed(2) + "</td>";
        html += "<td>$" + ac.precio.toFixed(2) + "</td>";
        html += "<td>" + pnlStr + "%</td>";
        html += "<td><b>" + ac.estado + "</b></td>";
        html += "<td>$" + ac.stop.toFixed(2) + "</td>";
        html += "<td>$" + ac.target.toFixed(2) + "</td>";
        html += "</tr>";
    }
    html += "</table>";
    html += "<p style='font-size:11px;color:#999;margin-top:10px;'>MTM Tracker V4 | Canal: " + getCanalAlertaV4() + " | Si recibiste STOP HIT o TARGET HIT, revisa tu posición.</p>";
    return html;
}

function construirMensajeWhatsApp(activas, info) {
    var msg = "📊 *MTM V4 — " + info.diaSemanaStr + " " + info.hora + ":" + (info.minutos < 10 ? "0" + info.minutos : info.minutos) + " ET*\n\n";
    msg += "```\n";
    msg += "TKR   ENT    ACT    RET%   EST\n";
    msg += "────  ────   ────   ─────  ─────\n";

    for (var a = 0; a < activas.length; a++) {
        var ac = activas[a];
        var tk = (ac.ticker + "     ").substring(0, 5);
        var ent = (ac.entrada.toFixed(1) + "     ").substring(0, 5);
        var act = (ac.precio.toFixed(1) + "     ").substring(0, 5);
        var pnlStr = (ac.pnl * 100).toFixed(1);
        if (ac.pnl > 0) pnlStr = "+" + pnlStr;
        var ret = (pnlStr + "%     ").substring(0, 6);
        var est = ac.estado;
        msg += tk + "  " + ent + " " + act + " " + ret + " " + est + "\n";
    }
    msg += "```\n";
    msg += "_MTM V4 | " + activas.length + " activas_";
    return msg;
}

function enviarWhatsAppV4(mensaje) {
    if (!WS_PHONE || !WS_API_KEY) {
        Logger.log("WhatsApp no configurado: falta WS_PHONE o WS_API_KEY");
        return false;
    }

    // CallMeBot tiene límite de ~1000 caracteres
    var MAX_LEN = 900;
    if (mensaje.length > MAX_LEN) {
        mensaje = mensaje.substring(0, MAX_LEN) + "\n... (truncado)";
        Logger.log("Mensaje WhatsApp truncado a " + MAX_LEN + " chars");
    }

    try {
        var cleanPhone = String(WS_PHONE).replace(/\+/g, "").replace(/\s/g, "");
        var enc = encodeURIComponent(mensaje);
        var url = "https://api.callmebot.com/whatsapp.php?phone=" + cleanPhone + "&text=" + enc + "&apikey=" + WS_API_KEY;

        Logger.log("WhatsApp URL: " + url.substring(0, 120) + "...");

        var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        var code = r.getResponseCode();
        var body = r.getContentText();

        Logger.log("WhatsApp HTTP " + code + ": " + body.substring(0, 200));

        if (code === 200 && body.indexOf("ERROR") < 0) {
            Logger.log("WhatsApp enviado OK");
            return true;
        } else {
            Logger.log("CallMeBot error HTTP " + code + ": " + body);
            return false;
        }
    } catch (e) {
        Logger.log("Excepción WhatsApp: " + e.toString());
        return false;
    }
}

function probarAlertaDual() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ui = SpreadsheetApp.getUi();
    var resp = ui.alert("📱📧 Prueba de Alerta", "Se enviará una alerta de prueba por " + getCanalAlertaV4() + ". ¿Continuar?", ui.ButtonSet.YES_NO);
    if (resp === ui.Button.YES) {
        enviarAlertaDual();
        ss.toast("Prueba enviada.", "📱📧", 6);
    }
}

function instalarAlertasDual() {
    eliminarAlertasDual();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var info = getInfoTiempoNYV4();
    var now = info.fecha;
    var diaSem = info.diaSemana;

    if (diaSem < 1 || diaSem > 5) {
        ss.toast("Solo se instalan de Lunes a Viernes.", "⚠️", 4);
        return;
    }

    // 4 alertas al día: apertura, media mañana, media tarde, cierre
    var slots = [9.5, 11.5, 13.5, 15.5]; // 9:30, 11:30, 13:30, 15:30 ET
    var triggersCreados = 0;

    for (var i = 0; i < slots.length; i++) {
        var h = Math.floor(slots[i]);
        var m = Math.round((slots[i] - h) * 60);
        var target = new Date(now.getTime());
        target.setHours(h, m, 0, 0);
        if (target > now) {
            ScriptApp.newTrigger("enviarAlertaDual")
                .timeBased()
                .at(target)
                .create();
            triggersCreados++;
        }
    }

    // Trigger diario para reinstalar cada día
    ScriptApp.newTrigger("instalarAlertasDual")
        .timeBased()
        .everyDays(1)
        .atHour(8)
        .nearMinute(30)
        .create();

    ss.toast("Alertas " + getCanalAlertaV4() + " programadas: " + triggersCreados + " hoy (9:30, 11:30, 13:30, 15:30 ET).", "📱📧", 6);
}

function eliminarAlertasDual() {
    var triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function(t) {
        if (t.getHandlerFunction() === "enviarAlertaDual" || t.getHandlerFunction() === "instalarAlertasDual") {
            ScriptApp.deleteTrigger(t);
        }
    });
}

function cambiarCanalEmail() { setCanalAlerta("email"); }
function cambiarCanalWhatsApp() { setCanalAlerta("whatsapp"); }
function cambiarCanalAmbos() { setCanalAlerta("ambos"); }

function setCanalAlerta(canal) {
    PropertiesService.getScriptProperties().setProperty("CANAL_ALERTA_V4", canal);
    SpreadsheetApp.getActiveSpreadsheet().toast("Canal de alerta cambiado a: " + canal.toUpperCase(), "⚙️", 4);
}

function getCanalAlertaV4() {
    return PropertiesService.getScriptProperties().getProperty("CANAL_ALERTA_V4") || "ambos";
}

function getInfoTiempoNYV4() {
    var now = new Date();
    var jan = new Date(now.getFullYear(), 0, 1).getTimezoneOffset();
    var jul = new Date(now.getFullYear(), 6, 1).getTimezoneOffset();
    var isDst = now.getTimezoneOffset() < Math.max(jan, jul);
    var etOff = isDst ? -4 : -5;
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

// ============================================================
// 5. MENÚ PRINCIPAL + TRACKER ↔ RADAR
// ============================================================

function onOpen() {
    var canal = getCanalAlertaV4();
    var ui = SpreadsheetApp.getUi();
    ui.createMenu("🎯 MTM Tracker V4")
        .addSubMenu(
            ui.createMenu("🔄 Generar Radar Semanal")
                .addItem("📋 Desde WL CDI (Club)", "generarRadarSemanal")
                .addItem("🤖 Desde WL V5 (Motor Propio)", "generarRadarDesdeV5")
                .addItem("🔗 COMBINADO: CDI + V5", "generarRadarCombinado")
        )
        .addSubMenu(
            ui.createMenu("📧📱 Canal (ahora: " + canal.toUpperCase() + ")")
                .addItem("✉️ Solo Email", "cambiarCanalEmail")
                .addItem("💬 Solo WhatsApp", "cambiarCanalWhatsApp")
                .addItem("📧📱 Ambos", "cambiarCanalAmbos")
        )
        .addItem("📧📱 Enviar Alerta Ahora", "enviarAlertaDual")
        .addItem("📧📱 Probar Alerta", "probarAlertaDual")
        .addItem("📧📱 Instalar alertas automáticas", "instalarAlertasDual")
        .addItem("🔕 Desinstalar alertas", "eliminarAlertasDual")
        .addSeparator()
        .addItem("📊 Actualizar seguimiento en vivo", "actualizarSeguimientoVivo")
        .addItem("📊 Activar Dashboard automático (cada 1h)", "instalarDashboardAutoV4")
        .addItem("📊 Desactivar Dashboard automático", "eliminarDashboardAutoV4")
        .addItem("🔍 Diagnosticar sistema", "diagnosticarSistemaV4")
        .addSeparator()
        .addItem("⚡ Instalar trigger onEdit (autocompletar Tracker)", "instalarOnEditV4")
        .addItem("🏗️ Configurar hojas V4 (primera vez)", "configurarHojasV4")
        .addItem("🧹 Limpiar Radar Semanal", "limpiarRadarSemanal")
        .addSeparator()
        .addItem("📊 Actualizar Dashboard V4", "generarRadarSemanal")
        .addToUi();
}

function instalarMenuV4() {
    onOpen();
    SpreadsheetApp.getActiveSpreadsheet().toast("Menú V4 instalado.", "✅", 3);
}

function configurarHojasV4() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ui = SpreadsheetApp.getUi();

    var resp = ui.alert("🏗️ Configurar V4", "Esto creará las hojas: 📋 WL CDI, 🎯 Radar Semanal, 📈 Tracker Diario, 📊 Score Log V4, 📊 Dashboard V4. ¿Continuar?", ui.ButtonSet.YES_NO);
    if (resp !== ui.Button.YES) return;

    var wl = ss.getSheetByName(SHEET_WL);
    if (!wl) wl = ss.insertSheet(SHEET_WL);
    formatearWLV4(wl);

    var radar = ss.getSheetByName(SHEET_RADAR);
    if (!radar) radar = ss.insertSheet(SHEET_RADAR);
    formatearRadar(radar);

    var tracker = ss.getSheetByName(SHEET_TRACKER);
    if (!tracker) tracker = ss.insertSheet(SHEET_TRACKER);
    formatearTrackerV4(tracker);

    var log = ss.getSheetByName(SHEET_LOG);
    if (!log) log = ss.insertSheet(SHEET_LOG);
    formatearScoreLogV4(log);

    var dash = ss.getSheetByName(SHEET_DASHBOARD);
    if (!dash) {
        dash = ss.insertSheet(SHEET_DASHBOARD);
        ss.setActiveSheet(dash);
        ss.moveActiveSheet(1);
    }
    formatearDashboardV4(dash);

    ss.getSheetByName(SHEET_WL).activate();
    ss.toast("Hojas V4 configuradas. Pega tu WL CDI y ejecuta 🔄 Generar Radar Semanal.", "✅", 6);
}

function limpiarRadarSemanal() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName(SHEET_RADAR);
    if (!ws) return;
    var lr = ws.getLastRow();
    if (lr > 5) {
        ws.getRange(6, 1, lr - 5, 18).clearContent().clearFormat();
        ss.toast("Radar limpiado.", "🧹", 3);
    }
}

function onEditTrackerV4(e) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    try {
        var range = e.range;
        var sheet = range.getSheet();
        if (sheet.getName() !== SHEET_TRACKER) return;
        if (range.getColumn() !== 1) return;
        if (range.getRow() < 6) return;

        var valores;
        if (e.value && typeof e.value === 'object' && Array.isArray(e.value)) {
            valores = e.value;
        } else if (e.value !== undefined && e.value !== null) {
            valores = [[e.value]];
        } else {
            valores = range.getValues();
        }

        // ── El Tracker SOLO lee del Radar Semanal (fuente única de verdad) ──
        var radar = ss.getSheetByName(SHEET_RADAR);
        if (!radar || radar.getLastRow() < 6) {
            ss.toast("Radar Semanal vacío. Generá el Radar primero (CDI, V5 o Combinado).", "⚠️ Tracker", 6);
            return;
        }

        var radarData = radar.getRange(6, 1, radar.getLastRow() - 5, 18).getValues();
        var datosMap = {};
        for (var i = 0; i < radarData.length; i++) {
            var tk = String(radarData[i][0] || "").trim().toUpperCase();
            if (!tk || tk === "TICKER") continue;
            datosMap[tk] = {
                empresa: radarData[i][1] || "",
                sector: radarData[i][2] || "",
                score: parseFloat(radarData[i][13]) || 0,
                entrada: radarData[i][14] || "",
                stop: radarData[i][15] || "",
                target: radarData[i][16] || "",
                rr: radarData[i][17] || "",
                hasSetup: !!(radarData[i][14] || radarData[i][15] || radarData[i][16] || radarData[i][17])
            };
        }

        if (Object.keys(datosMap).length === 0) {
            ss.toast("Radar Semanal sin tickers válidos. Generá el Radar primero.", "⚠️ Tracker", 6);
            return;
        }

        var cargados = 0;

        for (var r = 0; r < valores.length; r++) {
            for (var c = 0; c < valores[r].length; c++) {
                var ticker = String(valores[r][c] || "").trim().toUpperCase();
                if (!ticker) continue;

                var row = range.getRow() + r;
                var d = datosMap[ticker];

                if (!d) {
                    ss.toast(ticker + " NO encontrado en Radar Semanal. Verificá el ticker o regenerá el Radar.", "⚠️ Tracker", 4);
                    continue;
                }

                sheet.getRange(row, 2).setValue(d.empresa);
                sheet.getRange(row, 3).setValue(d.sector);
                sheet.getRange(row, 4).setValue(d.score).setNumberFormat("0.0");

                if (d.hasSetup) {
                    sheet.getRange(row, 6).setValue(d.entrada).setNumberFormat('"$"#,##0.00');
                    sheet.getRange(row, 7).setValue(d.stop).setNumberFormat('"$"#,##0.00');
                    sheet.getRange(row, 8).setValue(d.target).setNumberFormat('"$"#,##0.00');
                    sheet.getRange(row, 9).setValue(d.rr).setNumberFormat("0.00x");
                } else {
                    sheet.getRange(row, 6, 1, 4).clearContent();
                }

                var scCell = sheet.getRange(row, 4);
                if (d.score >= UMBRAL_ALTA_CONF) {
                    scCell.setFontColor(C4.GREEN).setBackground("#1B5E20").setFontWeight("bold");
                } else if (d.score >= UMBRAL_MEDIA_CONF) {
                    scCell.setFontColor(C4.ORANGE).setBackground("#FFF3E0").setFontWeight("bold");
                } else {
                    scCell.setFontColor(C4.GRAY).setBackground(C4.LIGHT).setFontWeight("bold");
                }

                sheet.getRange(row, 5).setDataValidation(
                    SpreadsheetApp.newDataValidation().requireCheckbox().build()
                ).setHorizontalAlignment("center");

                cargados++;
            }
        }

        if (cargados > 0) {
            ss.toast(cargados + " ticker(s) cargado(s) desde 🎯 Radar Semanal ✅", "V4 Tracker", 4);
        }
    } catch (err) {
        ss.toast("ERROR en Tracker: " + err.message + " — Revisá el menú > Ver > Registros", "❌ Tracker", 8);
        Logger.log("ERROR onEditTrackerV4: " + err.stack);
    }
}

/**
 * Wrapper NATIVO de Apps Script para el trigger onEdit.
 * Apps Script busca una función llamada exactamente 'onEdit(e)' para triggers simples.
 * Si usás un trigger INSTALADO (manual), puede apuntar a 'onEditTrackerV4'.
 * Ambas formas funcionan; esta garantiza compatibilidad con triggers simples.
 */
function onEdit(e) {
    onEditTrackerV4(e);
}

/**
 * Diagnóstico completo del sistema V4.
 * Revisa hojas, triggers, conectividad y configuración.
 * Muestra un popup con resultados detallados.
 */
function diagnosticarSistemaV4() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ui = SpreadsheetApp.getUi();
    var reporte = [];
    var errores = [];

    reporte.push("🔍 DIAGNÓSTICO MTM V4 — " + new Date().toLocaleString("es"));
    reporte.push("");

    // 1. Hojas
    var hojas = [SHEET_WL, SHEET_RADAR, SHEET_TRACKER, SHEET_LOG, SHEET_DASHBOARD];
    reporte.push("📋 HOJAS:");
    hojas.forEach(function(n) {
        var h = ss.getSheetByName(n);
        if (h) reporte.push("   ✅ " + n + " (filas: " + h.getLastRow() + ")");
        else { reporte.push("   ❌ " + n + " NO EXISTE"); errores.push("Falta hoja: " + n); }
    });
    reporte.push("");

    // 2. Configuración
    reporte.push("⚙️ CONFIGURACIÓN:");
    reporte.push("   EMAIL_TO: " + EMAIL_TO);
    reporte.push("   CANAL_ALERTA: " + getCanalAlertaV4());
    reporte.push("   WS_PHONE: " + (WS_PHONE || "(vacío)"));
    reporte.push("   WS_API_KEY: " + (WS_API_KEY ? "****" + WS_API_KEY.slice(-3) : "(vacío)"));
    reporte.push("   UMBRAL_MIN_SCORE: " + UMBRAL_MIN_SCORE);
    reporte.push("   EMAIL_ALERTS: " + EMAIL_ALERTS);
    reporte.push("");

    // 3. Radar
    reporte.push("🎯 RADAR:");
    var radar = ss.getSheetByName(SHEET_RADAR);
    if (radar && radar.getLastRow() >= 6) {
        var radarData = radar.getRange(6, 1, radar.getLastRow() - 5, 18).getValues();
        reporte.push("   Tickers en Radar: " + radarData.length);
        var altas = radarData.filter(function(r){ return parseFloat(r[13]) >= UMBRAL_ALTA_CONF; }).length;
        reporte.push("   Alta confianza: " + altas);
    } else {
        reporte.push("   ❌ Radar vacío o no existe");
        errores.push("Radar vacío");
    }
    reporte.push("");

    // 4. Tracker
    reporte.push("📈 TRACKER:");
    var tracker = ss.getSheetByName(SHEET_TRACKER);
    if (tracker && tracker.getLastRow() >= 6) {
        var tData = tracker.getRange(6, 1, tracker.getLastRow() - 5, 10).getValues();
        reporte.push("   Filas: " + tData.length);
        var checks = 0;
        for (var i = 0; i < tData.length; i++) { if (tData[i][4] === true) checks++; }
        reporte.push("   Con Track=true: " + checks);
        if (checks === 0) errores.push("Ningún ticker tiene Track activado (col E)");
    } else {
        reporte.push("   ❌ Tracker vacío o no existe");
        errores.push("Tracker vacío");
    }
    reporte.push("");

    // 5. Precio Yahoo (test)
    reporte.push("💰 PRECIO YAHOO (test con AAPL):");
    var precioTest = fetchPrecioYahooV4("AAPL");
    if (precioTest) reporte.push("   ✅ Precio AAPL: $" + precioTest);
    else { reporte.push("   ❌ No pudo obtener precio de AAPL"); errores.push("Yahoo Finance no responde"); }
    reporte.push("");

    // 6. Triggers
    reporte.push("⏰ TRIGGERS INSTALADOS:");
    var triggers = ScriptApp.getProjectTriggers();
    var tAlertas = triggers.filter(function(t){ return t.getHandlerFunction() === "enviarAlertaDual"; }).length;
    var tInstalar = triggers.filter(function(t){ return t.getHandlerFunction() === "instalarAlertasDual"; }).length;
    var tOnEdit = triggers.filter(function(t){ return t.getHandlerFunction() === "onEdit" && t.getTriggerSource() === ScriptApp.TriggerSource.SPREADSHEETS; }).length;
    reporte.push("   enviarAlertaDual: " + tAlertas);
    reporte.push("   instalarAlertasDual: " + tInstalar);
    reporte.push("   onEdit (Tracker): " + tOnEdit);
    if (tOnEdit === 0) {
        reporte.push("   ❌ NO hay trigger onEdit. El Tracker NO se autocompletará.");
        errores.push("Falta trigger onEdit. Andá al menú > Instalar trigger onEdit.");
    } else {
        reporte.push("   ✅ Trigger onEdit activo");
    }
    if (tAlertas === 0 && tInstalar === 0) {
        reporte.push("   ⚠️ No hay triggers de alerta instalados.");
        reporte.push("   Usá: Menú > Instalar alertas automáticas");
    }

    var tDash = triggers.filter(function(t){ return t.getHandlerFunction() === "actualizarSeguimientoVivo"; }).length;
    reporte.push("   Dashboard auto: " + tDash);
    if (tDash === 0) {
        reporte.push("   ⚠️ Dashboard NO se actualiza automáticamente.");
        reporte.push("   Usá: Menú > Activar Dashboard automático");
    } else {
        reporte.push("   ✅ Dashboard auto activo (" + tDash + " triggers hoy)");
    }
    reporte.push("");

    // 7. WhatsApp (test ping ligero)
    reporte.push("📱 WHATSAPP (test con 'Hola'):");
    var wsOk = enviarWhatsAppV4("Hola");
    reporte.push("   Resultado: " + (wsOk ? "✅ Enviado" : "❌ Falló — revisá WS_PHONE y WS_API_KEY"));
    reporte.push("");

    // Resumen
    reporte.push("═══════════════════════════════════════");
    if (errores.length > 0) {
        reporte.push("⚠️ ERRORES ENCONTRADOS (" + errores.length + "):");
        errores.forEach(function(e){ reporte.push("   • " + e); });
        reporte.push("");
        reporte.push("💡 Pasos sugeridos:");
        reporte.push("   1) Configurar hojas V4 (menú > Configurar)");
        reporte.push("   2) Pegar WL CDI y generar Radar");
        reporte.push("   3) Agregar tickers al Tracker + activar check");
        reporte.push("   4) Instalar alertas automáticas");
    } else {
        reporte.push("✅ TODO ESTÁ CONFIGURADO CORRECTAMENTE");
    }

    var texto = reporte.join("\n");
    Logger.log(texto);
    ui.alert("🔍 Diagnóstico MTM V4", texto, ui.ButtonSet.OK);
}

function formatearWLV4(ws) {
    ws.clear();
    ws.getRange(1, 1, 1, 13).merge().setValue("📋  WL CDI — Input semanal del Club")
        .setBackground(C4.DARK).setFontColor(C4.GREEN).setFontSize(14).setFontWeight("bold").setHorizontalAlignment("center");
    ws.setRowHeight(1, 40);

    ws.getRange(2, 1, 1, 13).merge().setValue("Pega aquí la lista semanal. Columnas: Ticker | Empresa | Sector | ATR/LOW | Earnings | Perf Sem % | Perf Mes % | SCTR | RSI | ADX | Beta | ATR(14) | EMA20")
        .setBackground(C4.ACCENT).setFontColor(C4.YELLOW).setFontSize(9).setFontWeight("bold");
    ws.setRowHeight(2, 22);

    var hdrs = ["Ticker", "Empresa", "Sector", "ATR/LOW", "Earnings", "Perf Sem %", "Perf Mes %", "SCTR", "RSI(14)", "ADX(14)", "Beta", "ATR(14)", "EMA20"];
    var wCol = [70, 160, 130, 90, 110, 90, 90, 70, 65, 65, 55, 70, 70];
    for (var i = 0; i < hdrs.length; i++) {
        ws.getRange(4, i + 1).setValue(hdrs[i]).setBackground(C4.DARK).setFontColor(C4.WHITE)
            .setFontWeight("bold").setHorizontalAlignment("center").setWrap(true);
        ws.setColumnWidth(i + 1, wCol[i]);
    }
    ws.setRowHeight(4, 36);
    ws.setFrozenRows(4);
}

function formatearTrackerV4(ws) {
    ws.clear();
    ws.getRange(1, 1, 1, 10).merge().setValue("📈  TRACKER DIARIO — Selección manual del Radar")
        .setBackground(C4.DARK).setFontColor(C4.GREEN).setFontSize(14).setFontWeight("bold").setHorizontalAlignment("center");
    ws.setRowHeight(1, 40);

    ws.getRange(2, 1, 1, 10).merge().setValue("Pegá tickers en col A desde el Radar. Activa el check para recibir alertas.")
        .setBackground(C4.ACCENT).setFontColor(C4.YELLOW).setFontSize(10).setFontWeight("bold");

    var hdrs = ["Ticker", "Empresa", "Sector", "Score V4", "Track", "Entrada $", "Stop $", "Target $", "R/R", "Notas"];
    var wCol = [70, 160, 130, 72, 50, 80, 72, 80, 60, 150];
    for (var i = 0; i < hdrs.length; i++) {
        ws.getRange(5, i + 1).setValue(hdrs[i]).setBackground(C4.DARK).setFontColor(C4.WHITE)
            .setFontWeight("bold").setHorizontalAlignment("center").setWrap(true);
        ws.setColumnWidth(i + 1, wCol[i]);
    }
    ws.setRowHeight(5, 36);
    ws.setFrozenRows(5);
}

function formatearScoreLogV4(ws) {
    ws.clear();
    ws.getRange(1, 1, 1, 17).merge().setValue("📊  SCORE LOG V4 — Histórico completo (NUNA BORRAR)")
        .setBackground(C4.DARK).setFontColor(C4.GREEN).setFontWeight("bold").setHorizontalAlignment("center");
    var hdrs = ["FECHA", "TICKER", "PRECIO", "SCORE V4", "ESTADO", "ENTRADA", "STOP", "TARGET", "R/R",
                "PERF W", "PERF M", "SECTOR", "DIST ATH", "ATR/LOW", "SCTR", "FUENTE", "TRACKER?"];
    for (var i = 0; i < hdrs.length; i++) {
        ws.getRange(2, i + 1).setValue(hdrs[i]).setBackground(C4.ACCENT).setFontColor(C4.WHITE)
            .setFontWeight("bold").setHorizontalAlignment("center");
        ws.setColumnWidth(i + 1, [90, 70, 70, 72, 80, 72, 72, 72, 55, 65, 65, 110, 70, 70, 55, 90, 65][i]);
    }
    ws.setFrozenRows(2);
}

function formatearDashboardV4(ws) {
    ws.clear();
    ws.getRange(1, 1, 1, 4).merge().setValue("📊  MTM DASHBOARD V4")
        .setBackground(C4.DARK).setFontColor(C4.GREEN).setFontSize(16).setFontWeight("bold").setHorizontalAlignment("center");
    ws.setRowHeight(1, 44);

    var metrics = [
        ["🟢 Alta Confianza (Score ≥ " + UMBRAL_ALTA_CONF + ")", 0, " setups ideales"],
        ["🟡 Media Confianza (Score " + UMBRAL_MEDIA_CONF + "-" + UMBRAL_ALTA_CONF + ")", 0, " revisar setup"],
        ["🟠 Base (Score " + UMBRAL_MIN_SCORE + "-" + UMBRAL_MEDIA_CONF + ")", 0, " observar"],
        ["Última actualización", "—", ""]
    ];
    for (var i = 0; i < metrics.length; i++) {
        ws.getRange(3 + i, 1).setValue(metrics[i][0]).setBackground(C4.ACCENT).setFontColor(C4.WHITE).setFontWeight("bold");
        ws.getRange(3 + i, 2).setValue(metrics[i][1]).setBackground(C4.LBLUE).setFontWeight("bold").setHorizontalAlignment("center");
        ws.getRange(3 + i, 3).setValue(metrics[i][2]).setBackground(C4.LIGHT).setFontSize(9).setFontColor(C4.GRAY);
    }
}

/**
 * Instala el trigger onEdit para el Tracker (se dispara al escribir en la hoja).
 * Es necesario para que el Tracker se autocomplete al pegar tickers.
 */
function instalarOnEditV4() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    // Eliminar triggers onEdit duplicados primero
    var triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function(t) {
        if (t.getHandlerFunction() === "onEdit" && t.getTriggerSource() === ScriptApp.TriggerSource.SPREADSHEETS) {
            ScriptApp.deleteTrigger(t);
        }
    });

    ScriptApp.newTrigger("onEdit")
        .forSpreadsheet(ss)
        .onEdit()
        .create();

    ss.toast("Trigger onEdit instalado. Ahora el Tracker se autocompletará al pegar tickers.", "✅ Trigger", 6);
}

/**
 * Elimina el trigger onEdit.
 */
function eliminarOnEditV4() {
    var triggers = ScriptApp.getProjectTriggers();
    var eliminados = 0;
    triggers.forEach(function(t) {
        if (t.getHandlerFunction() === "onEdit" && t.getTriggerSource() === ScriptApp.TriggerSource.SPREADSHEETS) {
            ScriptApp.deleteTrigger(t);
            eliminados++;
        }
    });
    SpreadsheetApp.getActiveSpreadsheet().toast("Triggers onEdit eliminados: " + eliminados, "🔕", 4);
}

/**
 * Instala triggers para actualizar el Dashboard automáticamente cada 1 hora
 * durante el horario del mercado (9:30 - 16:00 ET).
 * Esto NO envía emails ni WhatsApp, solo actualiza la tabla de seguimiento.
 */
function instalarDashboardAutoV4() {
    eliminarDashboardAutoV4();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var info = getInfoTiempoNYV4();
    var now = info.fecha;
    var diaSem = info.diaSemana;

    if (diaSem < 1 || diaSem > 5) {
        ss.toast("Solo se instalan de Lunes a Viernes.", "⚠️", 4);
        return;
    }

    var horasMercado = [9, 10, 11, 12, 13, 14, 15, 16];
    var creados = 0;

    for (var i = 0; i < horasMercado.length; i++) {
        var h = horasMercado[i];
        var minutos = (h === 9) ? 30 : 0;

        var target = new Date(now.getTime());
        target.setHours(h, minutos, 0, 0);

        if (target > now) {
            ScriptApp.newTrigger("actualizarSeguimientoVivo")
                .timeBased()
                .at(target)
                .create();
            creados++;
        }
    }

    // Trigger diario para reinstalar
    ScriptApp.newTrigger("instalarDashboardAutoV4")
        .timeBased()
        .everyDays(1)
        .atHour(8)
        .nearMinute(15)
        .create();

    ss.toast("Dashboard auto: " + creados + " actualizaciones hoy (cada 1h 9:30-16:00 ET).", "📊 Auto", 6);
}

/**
 * Elimina los triggers de Dashboard automático.
 */
function eliminarDashboardAutoV4() {
    var triggers = ScriptApp.getProjectTriggers();
    var eliminados = 0;
    triggers.forEach(function(t) {
        if (t.getHandlerFunction() === "actualizarSeguimientoVivo" || t.getHandlerFunction() === "instalarDashboardAutoV4") {
            ScriptApp.deleteTrigger(t);
            eliminados++;
        }
    });
    SpreadsheetApp.getActiveSpreadsheet().toast("Triggers Dashboard eliminados: " + eliminados, "🔕", 4);
}

// ============================================================
// 6. SEGUIMIENTO EN VIVO (tabla actualizable manualmente)
// ============================================================

/**
 * Actualiza una tabla de seguimiento en vivo en el Dashboard.
 * Lee el Tracker, obtiene precios actuales, calcula P&L y pinta colores.
 * Ejecutar manualmente cuando quieras ver el estado actual.
 */
function actualizarSeguimientoVivo() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tracker = ss.getSheetByName(SHEET_TRACKER);
    if (!tracker || tracker.getLastRow() < 6) {
        ss.toast("Tracker vacío. Agregá tickers primero.", "⚠️", 4);
        return;
    }

    var dash = ss.getSheetByName(SHEET_DASHBOARD);
    if (!dash) {
        ss.toast("Dashboard no existe. Ejecutá Configurar hojas V4.", "⚠️", 4);
        return;
    }

    ss.toast("Obteniendo precios en vivo...", "📊", 15);

    var data = tracker.getRange(6, 1, tracker.getLastRow() - 5, 10).getValues();
    var resultados = [];

    for (var i = 0; i < data.length; i++) {
        var tk = String(data[i][0]).trim().toUpperCase();
        if (!tk) continue;
        var entrada = parseFloat(data[i][5]) || 0;
        var stop = parseFloat(data[i][6]) || 0;
        var target = parseFloat(data[i][7]) || 0;
        var track = data[i][4] === true;

        var precio = fetchPrecioYahooV4(tk);
        if (precio === null) continue;

        var pnl = entrada > 0 ? (precio - entrada) / entrada : 0;
        var estado = "⚪ NEUTRO";
        if (target > 0 && precio >= target) estado = "🎯 TARGET";
        else if (stop > 0 && precio <= stop) estado = "🛑 STOP";
        else if (pnl > 0.05) estado = "📈 STRONG";
        else if (pnl > 0) estado = "📈 PROFIT";
        else if (pnl < -0.05) estado = "📉 DANGER";
        else estado = "📉 LOSS";

        resultados.push([tk, entrada, precio, pnl, estado, stop, target, track ? "✅" : ""]);
    }

    // Escribir en Dashboard a partir de fila 10
    var startRow = 10;
    var lastRow = dash.getLastRow();
    if (lastRow >= startRow) {
        dash.getRange(startRow, 1, lastRow - startRow + 1, 8).clearContent().clearFormat();
    }

    // Header
    var hdrs = ["Ticker", "Entrada", "Actual", "P&L %", "Estado", "Stop", "Target", "Track"];
    dash.getRange(startRow, 1, 1, 8).setValues([hdrs])
        .setBackground(C4.DARK).setFontColor(C4.WHITE).setFontWeight("bold").setHorizontalAlignment("center");

    for (var r = 0; r < resultados.length; r++) {
        var row = startRow + 1 + r;
        var d = resultados[r];
        dash.getRange(row, 1, 1, 8).setValues([d]);

        // Formato
        dash.getRange(row, 2).setNumberFormat('"$"#,##0.00');
        dash.getRange(row, 3).setNumberFormat('"$"#,##0.00');
        dash.getRange(row, 4).setNumberFormat("0.00%;+0.00%;-0.00%");
        dash.getRange(row, 6).setNumberFormat('"$"#,##0.00');
        dash.getRange(row, 7).setNumberFormat('"$"#,##0.00');

        // Color por estado
        var bg = C4.LIGHT;
        var fg = C4.DARK; // texto oscuro para mejor contraste sobre fondos claros
        if (d[4].indexOf("TARGET") >= 0) { bg = C4.LGREEN; fg = "#1B5E20"; }
        else if (d[4].indexOf("STOP") >= 0) { bg = C4.LRED; fg = "#B71C1C"; }
        else if (d[4].indexOf("STRONG") >= 0) { bg = C4.LGREEN; fg = "#1B5E20"; }
        else if (d[4].indexOf("DANGER") >= 0) { bg = C4.LRED; fg = "#B71C1C"; }
        else if (d[4].indexOf("PROFIT") >= 0) { bg = "#FFF3E0"; fg = "#E65100"; }

        dash.getRange(row, 1, 1, 8).setBackground(bg).setFontColor(fg).setHorizontalAlignment("center");
        dash.getRange(row, 1).setFontWeight("bold");
    }

    ss.toast("Seguimiento actualizado: " + resultados.length + " tickers.", "📊 Vivo", 5);
}

// ============================================================
// 7. INSTALACIÓN AUTOMÁTICA (ONE-CLICK)
// ============================================================

function instalarV4() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ui = SpreadsheetApp.getUi();

    var resp = ui.alert(
        "🏗️ Instalador MTM Tracker V4",
        "Esto creará las hojas: 📋 WL CDI, 🎯 Radar Semanal, 📈 Tracker Diario, 📊 Score Log V4, 📊 Dashboard V4.\n\n" +
        "No borrará tus hojas actuales (V3).\n\n¿Continuar?",
        ui.ButtonSet.YES_NO
    );
    if (resp !== ui.Button.YES) return;

    ss.toast("Creando hojas V4...", "🏗️", 10);

    crearHojaSiNoExiste(ss, SHEET_WL, function(ws) {
        formatearWLV4(ws);
    });

    crearHojaSiNoExiste(ss, SHEET_RADAR, function(ws) {
        formatearRadar(ws);
    });

    crearHojaSiNoExiste(ss, SHEET_TRACKER, function(ws) {
        formatearTrackerV4(ws);
    });

    crearHojaSiNoExiste(ss, SHEET_LOG, function(ws) {
        formatearScoreLogV4(ws);
    });

    crearHojaSiNoExiste(ss, SHEET_DASHBOARD, function(ws) {
        formatearDashboardV4(ws);
    });

    instalarMenuV4();

    ss.toast("✅ V4 instalado. Ve a 📋 WL CDI, pega tu lista, y ejecuta 🔄 Generar Radar Semanal.", "🎯", 8);

    ui.alert(
        "✅ Instalación completa",
        "Próximos pasos:\n\n" +
        "1. Ve a la hoja 📋 WL CDI\n" +
        "2. Pega tu WL CDI de esta semana (desde fila 5)\n" +
        "3. Ve al menú 🎯 MTM Tracker V4 > 🔄 Generar Radar Semanal\n\n" +
        "4. Para conectar Tracker: pegá tickers en 📈 Tracker Diario col A",
        ui.ButtonSet.OK
    );
}

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
