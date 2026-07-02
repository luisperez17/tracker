// ============================================================
// MTM TRACKER V4 — MOTOR RADAR SEMANAL
// ============================================================

/**
 * Función maestra: genera el Radar Semanal desde el WL CDI.
 * Ejecutar cada domingo o lunes 9am.
 */
function generarRadarSemanal() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast("Iniciando Radar V4...", "🎯", 30);

    // 1. Leer WL CDI
    var wlData = leerWLCDI();
    if (!wlData || wlData.length === 0) {
        ss.toast("No hay datos en " + SHEET_WL, "⚠️", 5);
        return;
    }

    ss.toast("Analizando " + wlData.length + " tickers desde WL...", "📊", 30);

    // 2. Procesar cada ticker (con batch y sleep para no saturar Yahoo)
    var resultados = [];
    for (var i = 0; i < wlData.length; i++) {
        var item = wlData[i];
        ss.toast(item.ticker + "...", "⏳", 2);
        var analisis = analizarTickerV4(item);
        if (analisis) resultados.push(analisis);
        if (i < wlData.length - 1) Utilities.sleep(800); // evitar rate limit Yahoo
    }

    // 3. Filtrar por umbral mínimo y ordenar
    var filtrados = resultados.filter(function(r) { return r.scoreV4 >= UMBRAL_MIN_SCORE; });
    filtrados.sort(function(a, b) { return b.scoreV4 - a.scoreV4; });

    // 4. Escribir hoja Radar
    escribirRadarSemanal(ss, filtrados);

    // 5. Actualizar Dashboard
    actualizarDashboardV4(ss, filtrados);

    ss.toast("Radar V4 listo: " + filtrados.length + " candidatas", "✅", 5);
}

/**
 * Lee la hoja WL CDI.
 * Formato esperado: Ticker | Empresa | Sector | ATR/LOW | Earnings | Perf Sem % | Perf Mes %
 */
function leerWLCDI() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName(SHEET_WL);
    if (!ws || ws.getLastRow() < 5) return [];

    // Leemos hasta 13 columnas para capturar datos técnicos del CDI
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
            // Datos técnicos opcionales del CDI (columnas 8-13)
            sctrRaw: data[i][7],       // SCTR (0-100)
            rsiRaw: data[i][8],        // RSI(14)
            adxRaw: data[i][9],        // ADX(14)
            betaRaw: data[i][10],      // Beta
            atr14Raw: data[i][11],     // ATR(14) numérico
            ema20Raw: data[i][12]      // EMA(20)
        });
    }
    return lista;
}

/**
 * Genera el Radar Semanal pero usando la WL V5 Generado (Motor Propio en Colab)
 * en vez de la WL CDI del Club.
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
            scoreV4: parseFloat(data[i][3]) || null,
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

/**
 * Analiza un ticker del WL: calcula Score V4 + datos técnicos.
 */
function analizarTickerV4(item) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // A. Extraer Performance del WL
    var pW = parsePct(item.perfWeekRaw);
    var pM = parsePct(item.perfMonthRaw);
    var pQ = null;

    // B. Consultar Yahoo Finance (SMA, ATH, precio actual)
    var yahoo = fetchYahooMetrics(item.ticker, 250);
    if (!yahoo) {
        Logger.log("Yahoo falló para " + item.ticker);
        // Fallback: intentar solo precio actual
        var fallbackPrecio = fetchPrecioYahooV4(item.ticker);
        if (!fallbackPrecio) return null;
        yahoo = { precioActual: fallbackPrecio, sma20: null, sma50: null, sma200: null, ath: null, distanciaATH: null, cambioPct: 0 };
    }

    // C. Consultar Finviz para Performance Quarter (si falta)
    var perfFinviz = null;
    if (pW === null || pM === null) {
        perfFinviz = fetchPerfFinviz(item.ticker);
        if (perfFinviz) {
            if (pW === null) pW = parsePct(perfFinviz.perfWeek);
            if (pM === null) pM = parsePct(perfFinviz.perfMonth);
            pQ = parsePct(perfFinviz.perfQuart);
        }
    }

    // D. Extraer datos técnicos del WL (CDI) si existen
    var sctr = parseFloat(item.sctrRaw) || null;
    var rsi = parseFloat(item.rsiRaw) || null;
    var adx = parseFloat(item.adxRaw) || null;
    var beta = parseFloat(item.betaRaw) || null;

    // E. Calcular Score V4 (ahora con más datos)
    var score = calcularScoreV4(pW, pM, pQ, item.atrLow, item.earnings, yahoo, sctr, rsi, adx, beta);

    // F. Calcular Setup sugerido (R/R)
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

// ============================================================
// SCORE V4
// ============================================================

function calcularScoreV4(pW, pM, pQ, atrLow, earningsStr, yahoo, sctr, rsi, adx, beta) {
    // ============================================================
    // 1. MOMENTUM (35% del peso, max ~7 puntos)
    // ============================================================
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

    // ============================================================
    // 2. FUERZA RELATIVA / SCTR (25% del peso, max ~5 puntos)
    // SCTR del CDI: 0-100, >90 = líderes de fuerza relativa
    // ============================================================
    var fuerzaRel = 0;
    if (sctr !== null && !isNaN(sctr)) {
        if (sctr >= 98) fuerzaRel += 5;
        else if (sctr >= 95) fuerzaRel += 4.5;
        else if (sctr >= 90) fuerzaRel += 4;
        else if (sctr >= 85) fuerzaRel += 3;
        else if (sctr >= 80) fuerzaRel += 2;
        else if (sctr >= 70) fuerzaRel += 1;
        else if (sctr >= 50) fuerzaRel += 0.5;
    }
    // Fallback: si no hay SCTR, usamos distancia ATH de Yahoo
    else if (yahoo && yahoo.distanciaATH !== null && yahoo.distanciaATH < 0.10) {
        fuerzaRel += 1.5; // Cerca de máximo histórico
    }

    // ============================================================
    // 3. TENDENCIA TÉCNICA (25% del peso, max ~5 puntos)
    // SMAs + ADX
    // ============================================================
    var tendencia = 0;
    if (yahoo && yahoo.precioActual) {
        if (yahoo.sma200 && yahoo.precioActual > yahoo.sma200) tendencia += 1.5;
        if (yahoo.sma50 && yahoo.precioActual > yahoo.sma50) tendencia += 1.0;
        if (yahoo.sma20 && yahoo.precioActual > yahoo.sma20) tendencia += 0.5;
    }
    if (adx !== null && !isNaN(adx)) {
        if (adx > 30) tendencia += 2.0;      // Tendencia muy fuerte
        else if (adx > 25) tendencia += 1.5; // Tendencia fuerte
        else if (adx > 20) tendencia += 1.0; // Tendencia presente
        else if (adx < 15) tendencia -= 1.0; // Sin tendencia, penalizar
    }

    // ============================================================
    // 4. RIESGO / CALIDAD (15% del peso, max ~3 puntos)
    // RSI + Beta + ATR color + Earnings
    // ============================================================
    var riesgo = 0;
    // RSI: zona saludable 50-70
    if (rsi !== null && !isNaN(rsi)) {
        if (rsi > 80) riesgo -= 1.5;         // Sobrecompra extrema
        else if (rsi > 70) riesgo -= 0.5;    // Sobrecompra
        else if (rsi >= 50) riesgo += 1.5;   // Zona de momentum sano
        else if (rsi >= 40) riesgo += 0.5;   // Zona neutral
        else riesgo -= 0.5;                  // Débil
    }
    // Beta: volatilidad vs mercado
    if (beta !== null && !isNaN(beta)) {
        if (beta > 2.5) riesgo -= 1.0;       // Muy volátil, riesgo alto
        else if (beta > 1.5) riesgo -= 0.5;  // Volátil
        else if (beta >= 0.8) riesgo += 0.5; // Movimiento razonable
        else riesgo += 1.0;                  // Defensivo, buen control
    }
    // ATR/LOW color del CDI (compatibilidad V3)
    var atrStr = String(atrLow).toLowerCase();
    if (atrStr.indexOf("verde") >= 0 || atrStr.indexOf("✅") >= 0) riesgo += 1;
    else if (atrStr.indexOf("rojo") >= 0 || atrStr.indexOf("❌") >= 0) riesgo -= 1;

    // Earnings: penalización si es esta semana
    var diasEarn = diasHastaEarnings(earningsStr);
    if (diasEarn !== null) {
        if (diasEarn < 7 && diasEarn >= 0) riesgo -= 2;
        else if (diasEarn < 30 && diasEarn >= 0) riesgo -= 1;
        else if (diasEarn < 0) riesgo += 0.5; // Earnings pasados = ya no hay riesgo
    }

    // ============================================================
    // 5. COMBINAR CON PESOS CONFIGURABLES
    // ============================================================
    var score = (momentum * PESO_MOMENTUM) +
                (fuerzaRel * PESO_FUERZA_REL) +
                (tendencia * PESO_TENDENCIA) +
                (riesgo * PESO_RIESGO);

    return Math.round(Math.max(0, Math.min(10, score)) * 100) / 100;
}

// ============================================================
// SETUP SUGERIDO (R/R)
// ============================================================

function calcularSetupSugerido(yahoo, atrLow) {
    var precio = yahoo.precioActual;
    if (!precio) return { entrada: null, stop: null, target: null, rr: null };

    var entrada = precio;
    var stop;

    // Si ATR/LOW es verde, usamos SMA20 como stop lógico
    var atrStr = String(atrLow).toLowerCase();
    if (atrStr.indexOf("verde") >= 0 || atrStr.indexOf("✅") >= 0) {
        stop = yahoo.sma20 || (precio * 0.96);
    } else {
        // Default: stop técnico al -4%
        stop = precio * 0.96;
    }

    // Asegurar que stop sea menor a entrada
    if (stop >= entrada) stop = entrada * 0.95;

    var riesgo = entrada - stop;
    var target = entrada + (riesgo * 2.5); // Buscar 2.5x
    var rr = riesgo > 0 ? (target - entrada) / riesgo : 0;

    return {
        entrada: Math.round(entrada * 100) / 100,
        stop: Math.round(stop * 100) / 100,
        target: Math.round(target * 100) / 100,
        rr: Math.round(rr * 100) / 100
    };
}

// ============================================================
// HELPERS
// ============================================================

function parsePct(val) {
    if (val === null || val === undefined || val === "") return null;
    var s = String(val).replace("%", "").replace("+", "").replace(",", ".").trim();
    var n = parseFloat(s);
    return isNaN(n) ? null : n;
}

function diasHastaEarnings(earnStr) {
    if (!earnStr || earnStr === "") return null;
    try {
        var parts = earnStr.split("/");
        if (parts.length < 2) return null;
        // Asumimos formato MM/DD/YYYY o similar
        var d = new Date(earnStr);
        if (isNaN(d.getTime())) return null;
        var hoy = new Date();
        hoy.setHours(0,0,0,0);
        return Math.ceil((d - hoy) / (1000 * 60 * 60 * 24));
    } catch (e) { return null; }
}

// ============================================================
// ESCRIBIR HOJA RADAR
// ============================================================

function escribirRadarSemanal(ss, datos) {
    var ws = ss.getSheetByName(SHEET_RADAR);
    if (!ws) {
        ws = ss.insertSheet(SHEET_RADAR);
        formatearRadar(ws);
    }

    // Limpiar anterior
    var lr = ws.getLastRow();
    if (lr > 5) ws.getRange(6, 1, lr - 5, 18).clearContent().clearFormat();

    // Encabezado actualizado
    ws.getRange(3, 1).setValue("Radar generado: " + new Date().toLocaleString("es") +
        " | " + datos.length + " candidatas | Score V4 = Momentum(50%) + Signal(30%) + Risk(20%)");

    // Escribir filas
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

        // Formato precios
        ws.getRange(r, 4).setNumberFormat('"$"#,##0.00');
        ws.getRange(r, 8, 1, 3).setNumberFormat('"$"#,##0.00');
        ws.getRange(r, 16, 1, 3).setNumberFormat('"$"#,##0.00');

        // Score coloreado
        var scCell = ws.getRange(r, 14);
        scCell.setFontWeight("bold").setFontSize(10);
        if (d.scoreV4 >= UMBRAL_ALTA_CONF) scCell.setFontColor(C4.GREEN).setBackground("#1B5E20");
        else if (d.scoreV4 >= UMBRAL_MEDIA_CONF) scCell.setFontColor(C4.ORANGE).setBackground("#FFF3E0");
        else scCell.setFontColor(C4.GRAY);

        // R/R coloreado
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

// ============================================================
// DASHBOARD V4
// ============================================================

function actualizarDashboardV4(ss, datos) {
    var dash = ss.getSheetByName(SHEET_DASHBOARD);
    if (!dash) return;
    // Simplificado: solo contar estados
    var alta = datos.filter(function(d){ return d.scoreV4 >= UMBRAL_ALTA_CONF; }).length;
    var media = datos.filter(function(d){ return d.scoreV4 >= UMBRAL_MEDIA_CONF && d.scoreV4 < UMBRAL_ALTA_CONF; }).length;
    var base = datos.filter(function(d){ return d.scoreV4 >= UMBRAL_MIN_SCORE && d.scoreV4 < UMBRAL_MEDIA_CONF; }).length;

    dash.getRange(3, 2).setValue(alta).setFontColor(C4.GREEN).setFontWeight("bold");
    dash.getRange(4, 2).setValue(media).setFontColor(C4.YELLOW).setFontWeight("bold");
    dash.getRange(5, 2).setValue(base).setFontColor(C4.ORANGE).setFontWeight("bold");
    dash.getRange(6, 2).setValue(new Date()).setNumberFormat("dd/mm/yyyy hh:mm").setFontColor(C4.GRAY);
}
