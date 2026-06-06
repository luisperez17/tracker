// ============================================================
// MTM TRACKER — SERVICIO DE SCORING Y CONSOLIDACIÓN
// ============================================================

/**
 * Calcula el score MTM de un ticker dado el array de índices de filtros donde aparece.
 * @param {Array<number>} filtrosIdx - Índices del array FILTROS.
 * @returns {number} Score calculado.
 */
function calcularScore(filtrosIdx) {
    var score = 0;
    var tierMaximo = 5;
    for (var i = 0; i < filtrosIdx.length; i++) {
        var key = FILTROS[filtrosIdx[i]].key;
        var ts = TIER_SCORES[key];
        if (ts) {
            score += ts.pts;
            if (ts.tier < tierMaximo) tierMaximo = ts.tier;
        }
    }
    // Bonus: si tiene al menos 1 filtro Tier 1 + 1 Tier 2 → +0.5 (confirmación cruzada)
    var hayT1 = filtrosIdx.some(function (fi) { return TIER_SCORES[FILTROS[fi].key] && TIER_SCORES[FILTROS[fi].key].tier === 1; });
    var hayT2 = filtrosIdx.some(function (fi) { return TIER_SCORES[FILTROS[fi].key] && TIER_SCORES[FILTROS[fi].key].tier === 2; });
    if (hayT1 && hayT2) score += 0.5;
    return Math.round(score * 100) / 100;
}

/**
 * Consolida todos los filtros en la hoja "Top Candidatos" calculando el Score MTM.
 * @param {Object} [perfMap] - Mapa de rendimientos opcional.
 */
function consolidarTop(perfMap) {
    perfMap = perfMap || {};
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var wsTop = ss.getSheetByName("🏆 Top Candidatos");
    if (!wsTop) {
        wsTop = ss.insertSheet("🏆 Top Candidatos");
        formatearHojaTop(wsTop);
    }

    // Construir mapa de tickers desde todos los filtros
    var mapa = {};
    for (var fi = 0; fi < FILTROS.length; fi++) {
        var ws = ss.getSheetByName(FILTROS[fi].hoja);
        if (!ws || ws.getLastRow() < 7) continue;
        var datos = ws.getRange(7, 1, ws.getLastRow() - 6, 15).getValues();
        for (var i = 0; i < datos.length; i++) {
            var ticker = String(datos[i][1]).trim();
            if (!ticker || ticker === "Ticker" || ticker === "") continue;
            if (!mapa[ticker]) {
                mapa[ticker] = {
                    empresa: datos[i][2] || "", sector: datos[i][3] || "",
                    price: datos[i][8] || "", change: String(datos[i][9] || ""),
                    perfWeek: datos[i][11] || "", perfMonth: datos[i][12] || "",
                    perfQuart: datos[i][13] || "", filtros: []
                };
            } else {
                if (!mapa[ticker].perfWeek && datos[i][11]) mapa[ticker].perfWeek = datos[i][11];
                if (!mapa[ticker].perfMonth && datos[i][12]) mapa[ticker].perfMonth = datos[i][12];
            }
            if (mapa[ticker].filtros.indexOf(fi) < 0) mapa[ticker].filtros.push(fi);
        }
    }

    // Leer WL CDI ANTES de calcular scores (para bonus de score)
    var wlSet = {};
    var wlSheet = ss.getSheetByName("📋 WL CDI");
    if (wlSheet && wlSheet.getLastRow() >= 5) {
        var wlData = wlSheet.getRange(5, 1, wlSheet.getLastRow() - 4, 5).getValues();
        for (var wi = 0; wi < wlData.length; wi++) {
            var wlTicker = String(wlData[wi][0]).trim().toUpperCase();
            if (wlTicker) wlSet[wlTicker] = { atr: String(wlData[wi][3]).trim(), earn: String(wlData[wi][4]).trim() };
        }
    }

    // Complementar con perfMap y calcular Score MTM (con bonus WL)
    var tickers = Object.keys(mapa);
    for (var ti = 0; ti < tickers.length; ti++) {
        var t = tickers[ti];
        var p = perfMap[t] || {};
        if (!mapa[t].perfWeek && p.perfWeek) mapa[t].perfWeek = p.perfWeek;
        if (!mapa[t].perfMonth && p.perfMonth) mapa[t].perfMonth = p.perfMonth;
        if (!mapa[t].perfQuart && p.perfQuart) mapa[t].perfQuart = p.perfQuart;
        var scoreBase = calcularScore(mapa[t].filtros);
        // Bonus WL: +1.0 si está en la lista curada semanal
        if (wlSet[t]) scoreBase += 1.0;
        mapa[t].scoreMTM = Math.round(scoreBase * 100) / 100;
    }

    // Ordenar: score desc → perfWeek desc
    function pNum(v) { return parseFloat(String(v).replace("%", "").replace("+", "")) || 0; }
    var ordenados = tickers.sort(function (a, b) {
        var ds = mapa[b].scoreMTM - mapa[a].scoreMTM;
        return ds !== 0 ? ds : pNum(mapa[b].perfWeek) - pNum(mapa[a].perfWeek);
    });

    // Columnas especiales
    var COL_NFILTROS = 9 + FILTROS.length;
    var COL_SCORE = COL_NFILTROS + 1;
    var COL_NFRAW = COL_NFILTROS + 2;
    var COL_WL = COL_NFILTROS + 3;
    var COL_ATR = COL_NFILTROS + 4;
    var COL_EARN = COL_NFILTROS + 5;
    var COL_SNAPDATE = COL_NFILTROS + 6;

    // Limpiar hoja
    var lr = wsTop.getLastRow();
    if (lr >= 5) wsTop.getRange(5, 1, lr - 4, COL_SNAPDATE).clearContent().clearFormat();
    wsTop.getRange(3, 1).setValue(
        ordenados.length + " tickers únicos  |  " + new Date().toLocaleString("es") +
        "  |  Orden: Score MTM → Perf Semana  |  Score = puntos por tier + 1.0 WL"
    ).setBackground(C.MID).setFontColor(C.GRAY).setFontSize(9);

    // Reset de encabezados de score, extras y snapshots
    restablecerEncabezadosTop(wsTop, COL_SCORE, COL_NFRAW, COL_WL, COL_ATR, COL_EARN, COL_SNAPDATE);

    // Escribir filas consolidadas
    for (var oi = 0; oi < ordenados.length; oi++) {
        var tk = ordenados[oi];
        var d = mapa[tk];
        var r = 5 + oi;
        var nF = d.filtros.length;
        var sc = d.scoreMTM;
        var enWL = wlSet[tk] ? true : false;
        var rowBg = (enWL && sc >= 4) ? "#FFFDE7" : (oi % 2 === 0 ? C.WHITE : C.LIGHT);

        wsTop.getRange(r, 1, 1, 8).setValues([[
            tk, d.empresa, d.sector,
            d.perfWeek, d.perfMonth, d.perfQuart,
            d.price, d.change
        ]]).setBackground(rowBg).setFontSize(9)
            .setVerticalAlignment("middle").setHorizontalAlignment("center");

        // Forzar formato numérico en precio para evitar fechas (bug locale español)
        wsTop.getRange(r, 7).setNumberFormat('"$"#,##0.00');

        wsTop.getRange(r, 1).setFontWeight("bold");
        wsTop.getRange(r, 2, 1, 2).setHorizontalAlignment("left");
        colorPct(wsTop.getRange(r, 4), d.perfWeek, 5, 0);
        colorPct(wsTop.getRange(r, 5), d.perfMonth, 10, 0);
        colorPct(wsTop.getRange(r, 6), d.perfQuart, 15, 0);
        wsTop.getRange(r, 8).setFontColor(pNum(d.change) >= 0 ? C.GREEN : C.RED).setFontWeight("bold");

        // Marcas de filtros
        for (var fi2 = 0; fi2 < FILTROS.length; fi2++) {
            var cell = wsTop.getRange(r, 9 + fi2);
            if (d.filtros.indexOf(fi2) >= 0) {
                var tierKey = TIER_SCORES[FILTROS[fi2].key];
                var checkBg = tierKey && tierKey.tier === 1 ? "#1B5E20" :
                    tierKey && tierKey.tier === 2 ? "#E8F5E9" :
                        tierKey && tierKey.tier === 3 ? "#E3F2FD" : C.LGREEN;
                var checkFg = tierKey && tierKey.tier === 1 ? "#FFFFFF" : C.GREEN;
                cell.setValue("✓").setFontColor(checkFg).setFontWeight("bold")
                    .setBackground(checkBg).setHorizontalAlignment("center");
            } else {
                cell.setValue("").setBackground("#F5F5FF");
            }
        }

        // Celda de Score MTM
        var scoreCell = wsTop.getRange(r, COL_SCORE);
        scoreCell.setValue(sc).setFontWeight("bold").setHorizontalAlignment("center").setNumberFormat("0.0");
        if (sc >= 6) scoreCell.setFontColor("#FFFFFF").setBackground("#E65100");
        else if (sc >= 4) scoreCell.setFontColor("#E65100").setBackground("#FFF3E0");
        else if (sc >= 2.5) scoreCell.setFontColor(C.ORANGE).setBackground(C.LYELLOW);
        else scoreCell.setFontColor(C.GRAY).setBackground(rowBg);

        wsTop.getRange(r, COL_NFRAW).setValue(nF).setHorizontalAlignment("center").setFontSize(9).setBackground(rowBg);

        // WL CDI / ATR / Earnings / Snapshot
        escribirColumnasExtrasTop(wsTop, r, tk, enWL, wlSet, rowBg, COL_WL, COL_ATR, COL_EARN, COL_SNAPDATE);

        wsTop.setRowHeight(r, 20);
    }
}

/**
 * Busca un ticker en todos los filtros y en el Top Candidatos.
 * @param {string} ticker - Símbolo a buscar.
 * @returns {Object|null} Información encontrada o null.
 */
function buscarTicker(ticker) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1: Buscar en Top Candidatos primero (tiene Score y Filtros ya calculados)
    var top = ss.getSheetByName("🏆 Top Candidatos");
    if (top && top.getLastRow() >= 5) {
        var nFiltros = FILTROS.length;
        var totalCols = 9 + nFiltros + 1; // Hasta Score MTM
        var datosTop = top.getRange(5, 1, top.getLastRow() - 4, totalCols).getValues();
        for (var j = 0; j < datosTop.length; j++) {
            if (String(datosTop[j][0]).trim().toUpperCase() === ticker) {
                var fltrs = [];
                for (var f = 0; f < nFiltros; f++) {
                    if (String(datosTop[j][8 + f]).trim() === "✓") fltrs.push(FILTROS[f].key.substring(0, 6));
                }
                return {
                    empresa: datosTop[j][1] || "",
                    sector: datosTop[j][2] || "",
                    perfWeek: datosTop[j][3] || "",
                    perfMonth: datosTop[j][4] || "",
                    score: datosTop[j][8 + nFiltros] || 0,
                    filtrosStr: fltrs.join(", ")
                };
            }
        }
    }

    // 2: Buscar en filtros individuales como fallback
    for (var fi = 0; fi < FILTROS.length; fi++) {
        var ws = ss.getSheetByName(FILTROS[fi].hoja);
        if (!ws || ws.getLastRow() < 7) continue;
        var datos = ws.getRange(7, 1, ws.getLastRow() - 6, 14).getValues();
        for (var i = 0; i < datos.length; i++) {
            if (String(datos[i][1]).trim().toUpperCase() === ticker) {
                return {
                    empresa: datos[i][2] || "",
                    sector: datos[i][3] || "",
                    perfWeek: datos[i][11] || "",
                    perfMonth: datos[i][12] || "",
                    score: "?",
                    filtrosStr: FILTROS[fi].nombre
                };
            }
        }
    }
    return null;
}

/**
 * Genera el ranking de la semana para guardar en el historial.
 * @returns {Array<Object>|null} Listado de objetos con el rendimiento.
 */
function generarRankingParaHistorial() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName(SEMANA_SHEET);
    var log = ss.getSheetByName(PRICE_LOG);
    if (!ws || !log || log.getLastRow() < 3) return null;

    var nItems = Math.min(ws.getLastRow() - 5, 20);
    if (nItems <= 0) return null;

    var wlData = ws.getRange(6, 1, nItems, 14).getValues();
    var cands = [];
    for (var i = 0; i < wlData.length; i++) {
        var tk = String(wlData[i][0]).trim().toUpperCase();
        if (!tk) continue;
        cands.push({
            ticker: tk,
            empresa: wlData[i][1] || "",
            sector: wlData[i][2] || "",
            fechaEntrada: wlData[i][3] || "", // col 4
            // Track check is at stData[i][4] -> skip
            entrada: parseFloat(wlData[i][5]) || 0, // col 6
            stop: parseFloat(wlData[i][6]) || 0,    // col 7
            target: parseFloat(wlData[i][7]) || 0,  // col 8
            tmin2x: parseFloat(wlData[i][8]) || 0,  // col 9
            rr: parseFloat(wlData[i][9]) || 0,      // col 10
            perfSem: wlData[i][10] || "",           // col 11
            perfMes: wlData[i][11] || "",           // col 12
            scoreMTM: wlData[i][12] || 0,           // col 13
            filtrosStr: wlData[i][13] || ""         // col 14
        });
    }

    var logData = log.getRange(3, 1, log.getLastRow() - 2, 6).getValues();
    var pmap = {};
    for (var li = 0; li < logData.length; li++) {
        var row = logData[li];
        var tk2 = String(row[1]).trim().toUpperCase();
        if (!pmap[tk2]) pmap[tk2] = [];
        pmap[tk2].push({
            date: row[0], hora: Number(row[2]),
            check: Number(row[3]), dia: row[4],
            precio: parseFloat(row[5]) || 0
        });
    }

    var ranking = [];
    for (var ci = 0; ci < cands.length; ci++) {
        var c = cands[ci];
        var prices = pmap[c.ticker] || [];
        if (prices.length === 0) continue;

        prices.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });

        var pLunes = prices[0].precio;
        var pVie = prices[prices.length - 1].precio;
        var pMax = Math.max.apply(null, prices.map(function (p) { return p.precio; }));
        var pMin = Math.min.apply(null, prices.map(function (p) { return p.precio; }));

        var pnlPct = c.entrada > 0 ? (pVie - c.entrada) / c.entrada : (pVie - pLunes) / pLunes;

        var hitTarget = c.target > 0 && pMax >= c.target;
        var hitStop = c.stop > 0 && pMin <= c.stop;

        var minRec = prices[0];
        for (var pi = 0; pi < prices.length; pi++) {
            if (prices[pi].precio < minRec.precio) minRec = prices[pi];
        }

        var tend;
        if (pVie > pLunes * 1.05) tend = "Alcista fuerte";
        else if (pVie > pLunes) tend = "Alcista";
        else if (pVie < pLunes * 0.95) tend = "Bajista fuerte";
        else tend = "Lateral";

        ranking.push({
            ticker: c.ticker, empresa: c.empresa, sector: c.sector,
            entrada: c.entrada, stop: c.stop, target: c.target,
            tmin2x: c.tmin2x, rr: c.rr,
            perfSem: c.perfSem, perfMes: c.perfMes,
            scoreMTM: c.scoreMTM, filtrosStr: c.filtrosStr,
            pLunes: pLunes, pVie: pVie,
            pMax: pMax, pMin: pMin,
            pnlPct: pnlPct,
            hitTarget: hitTarget, hitStop: hitStop,
            mejorHora: minRec.dia + " " + minRec.hora + ":00 ET",
            tend: tend, numChecks: prices.length
        });
    }

    ranking.sort(function (a, b) { return b.pnlPct - a.pnlPct; });
    return ranking;
}

/**
 * Función interna para limpiar y reencabezar la hoja Top.
 */
function restablecerEncabezadosTop(wsTop, COL_SCORE, COL_NFRAW, COL_WL, COL_ATR, COL_EARN, COL_SNAPDATE) {
    wsTop.getRange(4, COL_SCORE).setValue("Score MTM")
        .setBackground("#E65100").setFontColor("#FFFFFF")
        .setFontWeight("bold").setHorizontalAlignment("center").setFontSize(8).setWrap(true);
    wsTop.getRange(4, COL_SCORE).setNote("Score MTM: puntuación ponderada por tier de señal + 1.0 si está en WL CDI");
    wsTop.setColumnWidth(COL_SCORE, 72);

    wsTop.getRange(4, COL_NFRAW).setValue("# Filtros")
        .setBackground(C.ACCENT).setFontColor("#FFFFFF")
        .setFontWeight("bold").setHorizontalAlignment("center").setFontSize(8).setWrap(true);
    wsTop.setColumnWidth(COL_NFRAW, 62);

    wsTop.getRange(4, COL_WL).setValue("WL CDI")
        .setBackground("#E65100").setFontColor("#FFFFFF")
        .setFontWeight("bold").setHorizontalAlignment("center").setFontSize(8).setWrap(true);
    wsTop.setColumnWidth(COL_WL, 72);

    wsTop.getRange(4, COL_ATR).setValue("ATR/LOW")
        .setBackground("#1A237E").setFontColor(C.YELLOW)
        .setFontWeight("bold").setHorizontalAlignment("center").setFontSize(8).setWrap(true);
    wsTop.setColumnWidth(COL_ATR, 80);

    wsTop.getRange(4, COL_EARN).setValue("Earnings")
        .setBackground("#B71C1C").setFontColor("#FFFFFF")
        .setFontWeight("bold").setHorizontalAlignment("center").setFontSize(8).setWrap(true);
    wsTop.setColumnWidth(COL_EARN, 90);

    wsTop.getRange(4, COL_SNAPDATE).setValue("Snapshot")
        .setBackground(C.MID).setFontColor(C.GRAY)
        .setFontWeight("bold").setHorizontalAlignment("center").setFontSize(8).setWrap(true);
    wsTop.setColumnWidth(COL_SNAPDATE, 80);
}

/**
 * Función interna para escribir las columnas extras (WL, ATR, Earnings, Snapshot) en el Top.
 */
function escribirColumnasExtrasTop(wsTop, r, tk, enWL, wlSet, rowBg, COL_WL, COL_ATR, COL_EARN, COL_SNAPDATE) {
    // WL CDI
    var wlCell = wsTop.getRange(r, COL_WL);
    if (enWL) {
        wlCell.setValue("⭐ WL").setFontColor("#F57F17").setFontWeight("bold")
            .setBackground("#FFF8E1").setHorizontalAlignment("center");
    } else {
        wlCell.setValue("").setBackground(rowBg);
    }

    // ATR/LOW
    var atrCell = wsTop.getRange(r, COL_ATR);
    if (enWL && wlSet[tk].atr) {
        var atrVal = wlSet[tk].atr;
        atrCell.setValue(atrVal).setHorizontalAlignment("center").setFontSize(9);
        if (atrVal.toLowerCase().indexOf("verde") >= 0 || atrVal === "✅") {
            atrCell.setFontColor(C.GREEN).setFontWeight("bold").setBackground(C.LGREEN);
        } else if (atrVal.toLowerCase().indexOf("rojo") >= 0 || atrVal === "❌") {
            atrCell.setFontColor(C.RED).setBackground("#FFEBEE");
        } else {
            atrCell.setFontColor(C.ORANGE).setBackground(C.LYELLOW);
        }
    } else {
        atrCell.setValue("").setBackground(rowBg);
    }

    // Earnings
    var earnCell = wsTop.getRange(r, COL_EARN);
    if (enWL && wlSet[tk].earn && wlSet[tk].earn !== "") {
        earnCell.setValue("⚠️ " + wlSet[tk].earn).setFontColor(C.RED)
            .setFontWeight("bold").setBackground("#FFEBEE")
            .setHorizontalAlignment("center").setFontSize(9);
    } else {
        earnCell.setValue("").setBackground(rowBg);
    }

    // Snapshot date
    wsTop.getRange(r, COL_SNAPDATE)
        .setValue(new Date()).setNumberFormat("dd/mm/yyyy")
        .setBackground(C.MID).setFontColor(C.GRAY)
        .setHorizontalAlignment("center").setFontSize(8);
}
