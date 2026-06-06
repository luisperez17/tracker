// ============================================================
// MTM TRACKER — PUNTOS DE ENTRADA PRINCIPALES
// ============================================================

/**
 * Función maestra para actualizar todos los filtros de Finviz, 
 * consolidar el Top Candidatos y actualizar el Dashboard.
 */
function actualizarTodo() {
    var ui = SpreadsheetApp.getUi();
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1: Perf map global
    ss.toast("Obteniendo Perf Week/Month general...", "⏳", 60);
    var perfMap = construirPerfMap();

    // 2: Iterar filtros
    var errores = [], ok = 0;
    for (var i = 0; i < FILTROS.length; i++) {
        try {
            ss.toast(FILTROS[i].nombre + "...", "⏳", 60);
            obtenerFiltroConPerf(FILTROS[i], perfMap, true);
            ok++;
        } catch (err) {
            errores.push(FILTROS[i].nombre + ": " + err.message);
        }
        Utilities.sleep(1300);
    }

    // 3: Consolidar Top
    ss.toast("Consolidando Top Candidatos...", "⏳", 10);
    consolidarTop(perfMap);

    // 4: Timestamps y señales de Dashboard
    ss.toast("Actualizando señales de mercado...", "⏳", 10);
    actualizarSemaforoSPY();
    actualizarTimestampsDashboard();
    actualizarFechaDashboard();

    ss.getSheetByName("🏆 Top Candidatos").activate();

    var msg = "✅ " + ok + "/" + FILTROS.length + " filtros actualizados.";
    if (errores.length > 0) msg += "\n\n⚠️ Errores:\n" + errores.join("\n");
    ui.alert("Actualización completa", msg, ui.ButtonSet.OK);
}

/**
 * Solo navega a la hoja de Top Candidatos tras consolidarla.
 */
function verTopCandidatos() {
    var perfMap = construirPerfMap();
    consolidarTop(perfMap);
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("🏆 Top Candidatos").activate();
}

/**
 * Re-ejecuta filtros y compara el estado actual vs el snapshot del domingo.
 */
function verificarSemana() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast("Iniciando verificación semanal... (incluyendo Tracker)", "🔍", 180);

    // 1: Leer snapshot base del Top Candidatos y Tickers en Seguimiento
    var wsTop = ss.getSheetByName("🏆 Top Candidatos");
    if (!wsTop || wsTop.getLastRow() < 5) {
        SpreadsheetApp.getUi().alert("⚠️ Ejecuta primero Actualizar TODO para tener un snapshot base.");
        return;
    }

    var COL_NFILTROS = 9 + FILTROS.length;
    var COL_SCORE_TOP = COL_NFILTROS + 1;
    var COL_SNAPDATE = COL_NFILTROS + 6;

    var topData = wsTop.getRange(5, 1, wsTop.getLastRow() - 4, COL_SNAPDATE).getValues();
    var snapshotBase = {};
    for (var ti = 0; ti < topData.length; ti++) {
        var tk = String(topData[ti][0]).trim().toUpperCase();
        if (!tk) continue;
        snapshotBase[tk] = { 
            scoreBase: parseFloat(topData[ti][COL_SCORE_TOP - 1]) || 0, 
            fechaBase: topData[ti][COL_SNAPDATE - 1] || "" 
        };
    }

    // 1.1: Obtener tickers que ya están en el Tracker
    var mapaTracker = obtenerTickersTrackeados();

    // 2: Re-ejecutar filtros ahora
    ss.toast("Obteniendo datos actuales de Finviz...", "🔍", 180);
    var perfMap = construirPerfMap();
    var errores = [];

    for (var fi2 = 0; fi2 < FILTROS.length; fi2++) {
        try { obtenerFiltroConPerf(FILTROS[fi2], perfMap, true); }
        catch (e) { errores.push(FILTROS[fi2].nombre + ": " + e.message); }
        Utilities.sleep(1000);
    }

    // 3: Reconstruir universo actual
    var mapaActual = {};
    for (var fi3 = 0; fi3 < FILTROS.length; fi3++) {
        var ws = ss.getSheetByName(FILTROS[fi3].hoja);
        if (!ws || ws.getLastRow() < 7) continue;
        var datos = ws.getRange(7, 1, ws.getLastRow() - 6, 15).getValues();
        for (var i = 0; i < datos.length; i++) {
            var ticker = String(datos[i][1]).trim().toUpperCase();
            if (!ticker || ticker === "Ticker" || ticker === "") continue;
            if (!mapaActual[ticker]) {
                mapaActual[ticker] = {
                    empresa: datos[i][2], sector: datos[i][3],
                    price: datos[i][8], change: String(datos[i][9]),
                    perfWeek: datos[i][11], perfMonth: datos[i][12],
                    filtros: []
                };
            }
            if (mapaActual[ticker].filtros.indexOf(fi3) < 0) mapaActual[ticker].filtros.push(fi3);
        }
    }

    // Calcular Scores Actuales
    var tickersActuales = Object.keys(mapaActual);
    for (var tai = 0; tai < tickersActuales.length; tai++) {
        var t = tickersActuales[tai];
        mapaActual[t].scoreActual = calcularScore(mapaActual[t].filtros);
    }

    // 4: Clasificar cambios con lógica de Tracker
    var enTracker = [], nuevas = [], mejoraron = [], estables = [], deterioraron = [], desaparecieron = [];
    
    // 4.1: Procesar los que están en el Tracker primero
    var tickersTrack = Object.keys(mapaTracker);
    for (var k = 0; k < tickersTrack.length; k++) {
        var tkT = tickersTrack[k];
        var infoActual = mapaActual[tkT];
        var infoBase = snapshotBase[tkT] || { scoreBase: mapaTracker[tkT].score || 0 };
        
        var precio = infoActual ? infoActual.price : fetchPrecioYahoo(tkT);
        var scoreA = infoActual ? infoActual.scoreActual : 0;
        
        var distStop = mapaTracker[tkT].stop > 0 && precio ? (precio - mapaTracker[tkT].stop) / precio : 1;
        var distTarget = mapaTracker[tkT].target > 0 && precio ? (mapaTracker[tkT].target - precio) / precio : 1;
        var statusTracker = "OK";
        if (precio <= mapaTracker[tkT].stop && mapaTracker[tkT].stop > 0) statusTracker = "🛑 STOP HIT";
        else if (precio >= mapaTracker[tkT].target && mapaTracker[tkT].target > 0) statusTracker = "🤑 TARGET HIT";

        enTracker.push({
            ticker: tkT, empresa: infoActual ? infoActual.empresa : mapaTracker[tkT].empresa,
            sector: infoActual ? infoActual.sector : mapaTracker[tkT].sector,
            scoreBase: infoBase.scoreBase, scoreActual: scoreA,
            delta: Math.round((scoreA - infoBase.scoreBase) * 100) / 100,
            perfWeek: infoActual ? infoActual.perfWeek : "", perfMonth: infoActual ? infoActual.perfMonth : "",
            price: precio, filtrosActual: infoActual ? infoActual.filtros : [],
            status: statusTracker
        });
    }

    // 4.2: Procesar resto del universo (excluyendo lo que ya está en Tracker)
    var tickersBase = Object.keys(snapshotBase);
    for (var bi = 0; bi < tickersBase.length; bi++) {
        var tkB = tickersBase[bi];
        if (mapaTracker[tkB]) continue; // Ya procesado en Tracker

        if (mapaActual[tkB]) {
            var delta = mapaActual[tkB].scoreActual - snapshotBase[tkB].scoreBase;
            var obj = {
                ticker: tkB, empresa: mapaActual[tkB].empresa, sector: mapaActual[tkB].sector,
                scoreBase: snapshotBase[tkB].scoreBase, scoreActual: mapaActual[tkB].scoreActual,
                delta: Math.round(delta * 100) / 100, perfWeek: mapaActual[tkB].perfWeek,
                perfMonth: mapaActual[tkB].perfMonth, price: mapaActual[tkB].price,
                filtrosActual: mapaActual[tkB].filtros, status: "Watchlist"
            };
            if (delta > 0.5) mejoraron.push(obj);
            else if (delta < -0.5) deterioraron.push(obj);
            else estables.push(obj);
        } else {
            desaparecieron.push({ 
                ticker: tkB, scoreBase: snapshotBase[tkB].scoreBase, scoreActual: 0, 
                delta: -snapshotBase[tkB].scoreBase, status: "Fuera de Filtros" 
            });
        }
    }

    // 4.3: Identificar Nuevas (No estaban en Snapshot ni están en Tracker)
    for (var ni = 0; ni < tickersActuales.length; ni++) {
        var tkN = tickersActuales[ni];
        if (!snapshotBase[tkN] && !mapaTracker[tkN] && mapaActual[tkN].scoreActual >= 3) {
            nuevas.push({
                ticker: tkN, empresa: mapaActual[tkN].empresa, sector: mapaActual[tkN].sector,
                scoreActual: mapaActual[tkN].scoreActual, scoreBase: 0, delta: mapaActual[tkN].scoreActual,
                perfWeek: mapaActual[tkN].perfWeek, perfMonth: mapaActual[tkN].perfMonth,
                price: mapaActual[tkN].price, filtrosActual: mapaActual[tkN].filtros, status: "NUEVA ⭐"
            });
        }
    }

    function byScore(a, b) { return b.scoreActual - a.scoreActual; }
    enTracker.sort(byScore); nuevas.sort(byScore); mejoraron.sort(function(a,b){return b.delta-a.delta;});
    estables.sort(byScore); deterioraron.sort(function(a,b){return a.delta-b.delta;});

    // 5: Escribir hoja Verificación
    var wsVer = ss.getSheetByName("📊 Verificación");
    if (!wsVer) wsVer = ss.insertSheet("📊 Verificación");
    formatearHojaVerificacion(wsVer);

    var row = 5;
    row = escribirBloqueVerif(wsVer, "🎯 ACTIVAS EN TRACKER", "#0D47A1", "#FFFFFF", enTracker, row);
    row = escribirBloqueVerif(wsVer, "⭐ NUEVAS OPORTUNIDADES", "#1B5E20", "#FFFFFF", nuevas, row);
    row = escribirBloqueVerif(wsVer, "🟢 MEJORARON", "#2E7D32", "#FFFFFF", mejoraron, row);
    row = escribirBloqueVerif(wsVer, "🟡 ESTABLES", "#F57F17", "#FFFFFF", estables, row);
    row = escribirBloqueVerif(wsVer, "🟠 DETERIORARON", "#E65100", "#FFFFFF", deterioraron, row);
    row = escribirBloqueVerif(wsVer, "🔴 SALIERON DEL RADAR", "#37474F", "#FFFFFF", desaparecieron, row);

    if (errores.length > 0) {
        wsVer.getRange(row, 1, 1, 11).merge().setValue("⚠️ Filtros con error: " + errores.join(" | ")).setBackground("#FFF9C4");
    }

    wsVer.activate();
    ss.toast("Verificación completa ✅", "🔍 Verificación", 8);
}

/**
 * Función interna para escribir bloques en la hoja de Verificación.
 */
function escribirBloqueVerif(ws, titulo, bgTitulo, fgTitulo, items, row) {
    var C2 = { DARK: "#1A1A2E", WHITE: "#FFFFFF", LIGHT: "#F0F4F8", GREEN: "#00C853", RED: "#FF1744", GRAY: "#B0BEC5" };
    ws.getRange(row, 1, 1, 11).merge().setValue(titulo + " (" + items.length + ")").setBackground(bgTitulo).setFontColor(fgTitulo).setFontWeight("bold");
    row++;

    if (items.length === 0) {
        ws.getRange(row, 1, 1, 11).merge().setValue("— ninguno —").setBackground("#F5F5F5").setHorizontalAlignment("center");
        return row + 2;
    }

    var hdrs = ["Ticker", "Empresa", "Sector", "Score Base", "Score Ahora", "Δ Score", "Filtros", "Perf Sem%", "Perf Mes%", "Precio", "Estado / Riesgo"];
    for (var i = 0; i < hdrs.length; i++) {
        ws.getRange(row, i+1).setValue(hdrs[i]).setBackground(C2.DARK).setFontColor(C2.WHITE).setFontWeight("bold").setFontSize(8).setHorizontalAlignment("center");
    }
    row++;

    for (var ii = 0; ii < items.length; ii++) {
        var it = items[ii];
        var bg = ii % 2 === 0 ? C2.WHITE : C2.LIGHT;
        ws.getRange(row, 1, 1, 11).setBackground(bg).setFontSize(9).setHorizontalAlignment("center").setVerticalAlignment("middle");
        ws.getRange(row, 1).setValue(it.ticker).setFontWeight("bold");
        ws.getRange(row, 2).setValue(it.empresa || "").setHorizontalAlignment("left");
        ws.getRange(row, 3).setValue(it.sector || "").setHorizontalAlignment("left");
        ws.getRange(row, 4).setValue(it.scoreBase || 0).setNumberFormat("0.0");
        ws.getRange(row, 5).setValue(it.scoreActual || 0).setNumberFormat("0.0").setFontWeight("bold");
        
        var deltaCell = ws.getRange(row, 6);
        deltaCell.setValue(it.delta || 0).setNumberFormat("+0.0;-0.0;0.0").setFontWeight("bold");
        if (it.delta > 0) deltaCell.setFontColor(C2.GREEN);
        else if (it.delta < 0) deltaCell.setFontColor(C2.RED);

        var fNames = it.filtrosActual && it.filtrosActual.length > 0 ? it.filtrosActual.map(function(f){ return FILTROS[f].key.substring(0,6); }).join(", ") : "—";
        ws.getRange(row, 7).setValue(fNames).setFontSize(8);
        colorPct(ws.getRange(row, 8), it.perfWeek || "", 5, 0);
        colorPct(ws.getRange(row, 9), it.perfMonth || "", 10, 0);
        ws.getRange(row, 10).setValue(it.price || "").setNumberFormat('"$"#,##0.00');
        
        var statusCell = ws.getRange(row, 11);
        statusCell.setValue(it.status).setFontSize(8).setFontWeight("bold");
        if (it.status.indexOf("STOP") >= 0) statusCell.setBackground("#B71C1C").setFontColor("#FFFFFF");
        else if (it.status.indexOf("TARGET") >= 0) statusCell.setBackground("#1B5E20").setFontColor("#FFFFFF");
        else if (it.status.indexOf("NUEVA") >= 0) statusCell.setBackground("#E8F5E9").setFontColor("#1B5E20");
        
        row++;
    }
    return row + 1;
}


/**
 * Registrar precios forzando modo manual.
 */
function registrarPreciosManual() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var currentTime = obtenerHoraETNow(); // Esto ya trae hora + (minutos/60)
    
    // Buscar el slot de HORAS_CHECK más cercano
    var mejorHora = HORAS_CHECK[0];
    var minDiff = 24;
    for (var i = 0; i < HORAS_CHECK.length; i++) {
        var diff = Math.abs(currentTime - HORAS_CHECK[i]);
        if (diff < minDiff) {
            minDiff = diff;
            mejorHora = HORAS_CHECK[i];
        }
    }

    var h = Math.floor(mejorHora);
    var m = (mejorHora - h) * 60;
    var displayHora = h + ":" + (m === 0 ? "00" : m);
    
    ss.toast("Detectado: Bloque " + displayHora + " ET. Registrando...", "⏳ Registro Manual", 6);
    
    registrarPrecios(mejorHora, true);
}

// ── Atajos para menús individuales ──────────────────────────
function act_ytd() { obtenerFiltro(FILTROS[0]); }
function act_uptrend() { obtenerFiltro(FILTROS[1]); }
function act_sma() { obtenerFiltro(FILTROS[2]); }
function act_earnings_week() { obtenerFiltro(FILTROS[3]); }
function act_newhigh() { obtenerFiltro(FILTROS[4]); }
function act_post_earnings() { obtenerFiltro(FILTROS[5]); }
function act_reversal() { obtenerFiltro(FILTROS[6]); }
function act_revenue_eps() { obtenerFiltro(FILTROS[7]); }
function act_adr_vol() { obtenerFiltro(FILTROS[8]); }
function act_ganadores() { obtenerFiltro(FILTROS[9]); }
function act_volumen() { obtenerFiltro(FILTROS[10]); }

/**
 * Actualiza todos los timestamps del Dashboard recorriendo cada filtro.
 */
function actualizarTimestampsDashboard() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var dash = ss.getSheetByName("📊 Dashboard");
    if (!dash) return;
    
    var lastRow = dash.getLastRow();
    if (lastRow < 5) return;
    
    var data = dash.getRange(1, 2, lastRow, 1).getValues();
    for (var d = 0; d < data.length; d++) {
        for (var fi = 0; fi < FILTROS.length; fi++) {
            if (String(data[d][0]).trim() === FILTROS[fi].nombre) {
                var ws = ss.getSheetByName(FILTROS[fi].hoja);
                var count = ws && ws.getLastRow() >= 7 ? ws.getLastRow() - 6 : 0;
                dash.getRange(d + 1, 3).setValue(count);
                dash.getRange(d + 1, 4).setValue(new Date()).setNumberFormat("dd/mm/yyyy hh:mm");
                break;
            }
        }
    }
}

