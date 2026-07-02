// ============================================================
// MTM TRACKER V4 — MENÚ PRINCIPAL Y PUNTOS DE ENTRADA
// ============================================================

/**
 * Crea el menú personalizado al abrir la hoja.
 */
function onOpen() {
    var canal = getCanalAlertaV4();
    var ui = SpreadsheetApp.getUi();
    ui.createMenu("🎯 MTM Tracker V4")
        .addItem("🔄 Generar Radar Semanal", "generarRadarSemanal")
        .addSeparator()
        .addSubMenu(
            ui.createMenu("📧📱 Canal de Alertas (ahora: " + canal.toUpperCase() + ")")
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

/**
 * Instala el menú V4 (llamar manualmente una vez si onOpen no corre).
 */
function instalarMenuV4() {
    onOpen();
    SpreadsheetApp.getActiveSpreadsheet().toast("Menú V4 instalado.", "✅", 3);
}

/**
 * Configura todas las hojas V4 por primera vez.
 */
function configurarHojasV4() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ui = SpreadsheetApp.getUi();

    var resp = ui.alert("🏗️ Configurar V4", "Esto creará las hojas: 📋 WL CDI, 🎯 Radar Semanal, 📈 Tracker Diario, 📊 Score Log V4, 📊 Dashboard V4. ¿Continuar?", ui.ButtonSet.YES_NO);
    if (resp !== ui.Button.YES) return;

    // WL CDI
    var wl = ss.getSheetByName(SHEET_WL);
    if (!wl) wl = ss.insertSheet(SHEET_WL);
    formatearWLV4(wl);

    // Radar Semanal
    var radar = ss.getSheetByName(SHEET_RADAR);
    if (!radar) radar = ss.insertSheet(SHEET_RADAR);
    formatearRadar(radar);

    // Tracker Diario
    var tracker = ss.getSheetByName(SHEET_TRACKER);
    if (!tracker) tracker = ss.insertSheet(SHEET_TRACKER);
    formatearTrackerV4(tracker);

    // Score Log
    var log = ss.getSheetByName(SHEET_LOG);
    if (!log) log = ss.insertSheet(SHEET_LOG);
    formatearScoreLogV4(log);

    // Dashboard
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

/**
 * Limpia el radar semanal (conservando formato).
 */
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

// ============================================================
// CONEXIÓN TRACKER DIARIO ↔ RADAR SEMANAL
// ============================================================

/**
 * Trigger onEdit para el Tracker Diario.
 * Cuando pegás un ticker en col A, auto-completa datos desde el Radar.
 */
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

        var radar = ss.getSheetByName(SHEET_RADAR);
        if (!radar || radar.getLastRow() < 6) {
            ss.toast("Radar Semanal vacío. Ejecutá 'Generar Radar Semanal' primero.", "⚠️ Tracker", 5);
            return;
        }

        var radarData = radar.getRange(6, 1, radar.getLastRow() - 5, 18).getValues();
        var cargados = 0;

        for (var r = 0; r < valores.length; r++) {
            for (var c = 0; c < valores[r].length; c++) {
                var ticker = String(valores[r][c] || "").trim().toUpperCase();
                if (!ticker) continue;

                var row = range.getRow() + r;
                var found = false;

                for (var i = 0; i < radarData.length; i++) {
                    if (String(radarData[i][0]).trim().toUpperCase() === ticker) {
                        var d = radarData[i];
                        sheet.getRange(row, 2).setValue(d[1] || "");
                        sheet.getRange(row, 3).setValue(d[2] || "");
                        sheet.getRange(row, 4).setValue(d[13]).setNumberFormat("0.0");
                        sheet.getRange(row, 6).setValue(d[14]).setNumberFormat('"$"#,##0.00');
                        sheet.getRange(row, 7).setValue(d[15]).setNumberFormat('"$"#,##0.00');
                        sheet.getRange(row, 8).setValue(d[16]).setNumberFormat('"$"#,##0.00');
                        sheet.getRange(row, 9).setValue(d[17]).setNumberFormat("0.00x");

                        var scCell = sheet.getRange(row, 4);
                        if (d[13] >= UMBRAL_ALTA_CONF) {
                            scCell.setFontColor(C4.GREEN).setBackground("#1B5E20").setFontWeight("bold");
                        } else if (d[13] >= UMBRAL_MEDIA_CONF) {
                            scCell.setFontColor(C4.ORANGE).setBackground("#FFF3E0").setFontWeight("bold");
                        } else {
                            scCell.setFontColor(C4.GRAY).setBackground(C4.LIGHT).setFontWeight("bold");
                        }

                        sheet.getRange(row, 5).setDataValidation(
                            SpreadsheetApp.newDataValidation().requireCheckbox().build()
                        ).setHorizontalAlignment("center");

                        cargados++;
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    ss.toast(ticker + " NO encontrado en Radar. Verificá el ticker.", "⚠️ Tracker", 3);
                }
            }
        }

        if (cargados > 0) {
            ss.toast(cargados + " ticker(s) cargado(s) desde Radar ✅", "V4 Tracker", 3);
        }
    } catch (err) {
        ss.toast("ERROR en Tracker: " + err.message + " — Revisá el menú > Ver > Registros", "❌ Tracker", 8);
        Logger.log("ERROR onEditTrackerV4: " + err.stack);
    }
}

function onEdit(e) {
    onEditTrackerV4(e);
}

// ============================================================
// TRIGGERS Y DASHBOARD AUTOMÁTICO
// ============================================================

function instalarOnEditV4() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
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
    ss.toast("Trigger onEdit instalado. Tracker se autocompletará al pegar tickers.", "✅ Trigger", 6);
}

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

    ScriptApp.newTrigger("instalarDashboardAutoV4")
        .timeBased()
        .everyDays(1)
        .atHour(8)
        .nearMinute(15)
        .create();

    ss.toast("Dashboard auto: " + creados + " actualizaciones hoy (cada 1h 9:30-16:00 ET).", "📊 Auto", 6);
}

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
// FORMATEO DE HOJAS AUXILIARES
// ============================================================

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
    ws.getRange(1, 1, 1, 8).merge().setValue("📊  SCORE LOG V4 — Histórico de precios y scores")
        .setBackground(C4.DARK).setFontColor(C4.GREEN).setFontWeight("bold").setHorizontalAlignment("center");
    var hdrs = ["FECHA", "TICKER", "PRECIO", "SCORE V4", "PERF W", "PERF M", "SMA20", "TRACKER?"];
    for (var i = 0; i < hdrs.length; i++) {
        ws.getRange(2, i + 1).setValue(hdrs[i]).setBackground(C4.ACCENT).setFontColor(C4.WHITE)
            .setFontWeight("bold").setHorizontalAlignment("center");
    }
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
