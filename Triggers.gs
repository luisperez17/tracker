// ============================================================
// MTM TRACKER — DISPARADORES (TRIGGERS)
// ============================================================

/**
 * Disparador que se ejecuta al abrir la hoja de cálculo.
 * Crea el menú personalizado en la interfaz.
 */
function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu("📊 MTM Tracker")
        .addItem("🔄 Actualizar TODO", "actualizarTodo")
        .addSeparator()
        .addItem("① YTD Top + Volumen", "act_ytd")
        .addItem("② Strong Uptrend", "act_uptrend")
        .addItem("③ SMA 20/50/200", "act_sma")
        .addItem("④ Earnings Week", "act_earnings_week")
        .addItem("⑤ New High + Volumen", "act_newhigh")
        .addItem("⑥ Post Earnings Breakout", "act_post_earnings")
        .addItem("⑦ Intraday Strong Reversal", "act_reversal")
        .addItem("⑧ Revenue + EPS + FCF", "act_revenue_eps")
        .addItem("⑨ ADR 4K Volumen", "act_adr_vol")
        .addItem("⑩ Ganadores Sem +20%", "act_ganadores")
        .addItem("⑪ Volumen Climático", "act_volumen")
        .addSeparator()
        .addItem("🏆 Consolidar Top Candidatos", "verTopCandidatos")
        .addItem("🛠️  Configurar hojas (primera vez)", "configurarHojas")
        .addItem("🔧 Reconfigurar solo Operaciones", "reconfigurarSoloOperaciones")
        .addSeparator()
        .addItem("🎯 Configurar Semana Tracker", "configurarSemanaTracker")
        .addItem("🧹 Limpiar decimales (pegar desde Top)", "sanitizarDecimalesSemana")
        .addItem("🔍 Verificar semana", "verificarSemana")
        .addItem("📊 Registrar precios ahora (manual)", "registrarPreciosManual")
        .addItem("📋 Generar Reporte Viernes", "generarReporteViernes")
        .addItem("🔄 Reset Semana (cada domingo)", "resetearSemana")
        .addItem("⚙️ Instalar triggers automáticos", "instalarTriggers")
        .addItem("🔴 Desinstalar triggers", "desinstalarTriggers")
        .addSeparator()
        .addItem("🚦 Actualizar semáforo ahora", "actualizarSemaforoManual")
        .addItem("⚙️ Instalar trigger diario", "instalarTriggerDiario")
        .addItem("🔴 Desinstalar trigger diario", "desinstalarTriggerDiario")
        .addToUi();
}

/**
 * Disparador que se ejecuta al editar una celda.
 * Autocompleta la información del ticker en la hoja de Operaciones.
 */
function onEdit(e) {
    try {
        var range = e.range;
        var sheet = range.getSheet();
        if (sheet.getName() !== "📈 Operaciones") return;
        if (range.getColumn() !== 4) return;   // col D = Ticker
        if (range.getRow() < 8) return;

        var ticker = String(e.value || "").trim().toUpperCase();
        var row = range.getRow();
        if (!ticker) return;

        sheet.getRange(row, 4).setValue(ticker);
        var info = buscarTicker(ticker);

        if (info) {
            sheet.getRange(row, 5).setValue(info.empresa || "");  // E
            sheet.getRange(row, 6).setValue(info.sector || "");  // F
            sheet.getRange(row, 7).setValue(info.perfWeek || ""); // G
            sheet.getRange(row, 8).setValue(info.perfMonth || ""); // H
            colorPct(sheet.getRange(row, 7), info.perfWeek, 5, 0);
            colorPct(sheet.getRange(row, 8), info.perfMonth, 10, 0);
            SpreadsheetApp.getActiveSpreadsheet().toast(
                ticker + " → " + info.empresa + " | Sem: " + info.perfWeek + " | Mes: " + info.perfMonth,
                "✅ Autocompleto", 4);
        } else {
            sheet.getRange(row, 5).setValue("No encontrado — actualiza filtros");
            SpreadsheetApp.getActiveSpreadsheet().toast(
                ticker + " no está en la WL. Actualiza los filtros primero.", "⚠️", 4);
        }
    } catch (err) { Logger.log("onEdit: " + err.message); }
}

// ============================================================
// GESTIÓN DE TRIGGERS TEMPORALES
// ============================================================

/**
 * Instala el trigger para registrar precios cada hora.
 */
function instalarTriggers() {
    ScriptApp.getProjectTriggers().forEach(function (t) {
        if (t.getHandlerFunction() === "registrarPreciosTrigger")
            ScriptApp.deleteTrigger(t);
    });
    ScriptApp.newTrigger("registrarPreciosTrigger")
        .timeBased().everyHours(1).create();
    SpreadsheetApp.getActiveSpreadsheet().toast(
        "Trigger instalado: verifica precios cada hora lun-vie.\n" +
        "Actúa solo en: 10am, 11am, 1pm, 2:30pm, 3:45pm ET.",
        "✅ Triggers instalados", 6
    );
}

/**
 * Desinstala el trigger de registro de precios.
 */
function desinstalarTriggers() {
    var n = 0;
    ScriptApp.getProjectTriggers().forEach(function (t) {
        if (t.getHandlerFunction() === "registrarPreciosTrigger") {
            ScriptApp.deleteTrigger(t); n++;
        }
    });
    SpreadsheetApp.getActiveSpreadsheet().toast(n + " trigger(s) eliminados.", "🔴", 4);
}

/**
 * Función que corre el trigger horario y decide si registrar precios.
 */
function registrarPreciosTrigger() {
    var now = new Date();
    var etOff = esDST(now) ? -4 : -5;
    var etHour = (now.getUTCHours() + etOff + 24) % 24;
    var etDay = now.getDay();

    if (etDay < 1 || etDay > 5) return;
    if (HORAS_CHECK.indexOf(etHour) < 0) return;
    if (yaRegistradoHoy(etHour)) return;

    registrarPrecios(etHour, false);  // false = trigger real
}

/**
 * Instala el trigger diario para el semáforo de SPY.
 */
function instalarTriggerDiario() {
    ScriptApp.getProjectTriggers().forEach(function (t) {
        if (t.getHandlerFunction() === "actualizarSemaforoDiario")
            ScriptApp.deleteTrigger(t);
    });

    ScriptApp.newTrigger("actualizarSemaforoDiario")
        .timeBased()
        .everyDays(1)
        .atHour(13) // ~9am ET
        .create();

    SpreadsheetApp.getActiveSpreadsheet().toast(
        "Trigger diario instalado — semáforo se actualiza automáticamente a las ~9am ET cada día.",
        "✅ Trigger diario", 6
    );
}

/**
 * Desinstala el trigger diario.
 */
function desinstalarTriggerDiario() {
    var n = 0;
    ScriptApp.getProjectTriggers().forEach(function (t) {
        if (t.getHandlerFunction() === "actualizarSemaforoDiario") {
            ScriptApp.deleteTrigger(t); n++;
        }
    });
    SpreadsheetApp.getActiveSpreadsheet().toast(
        n + " trigger(s) diario(s) eliminados.", "🔴", 4
    );
}
