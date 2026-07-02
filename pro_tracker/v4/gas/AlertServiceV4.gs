// ============================================================
// MTM TRACKER V4 — ALERTAS DUAL: EMAIL + WHATSAPP
// ============================================================
// ⚠️  IMPORTANTE: NO copiar este archivo a Apps Script.
//     Este archivo es solo referencia local (módulo).
//     En Apps Script usá UNICAMENTE: TODO_EN_UNO_V4.gs

/**
 * Envía resumen dual según CANAL_ALERTA configurado.
 * Opciones: 'email' | 'whatsapp' | 'ambos'
 */
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
        ss.toast("No existe la hoja '" + SHEET_TRACKER + "'. Ejecutá 'Configurar hojas V4'.", "⚠️ Alertas", 6);
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

    Logger.log("=== DIAGNÓSTICO ALERTA ===");
    logs.forEach(function(l){ Logger.log(l); });
    Logger.log("==========================");
}

/**
 * Construye el HTML del email.
 */
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
    html += "<p style='font-size:11px;color:#999;margin-top:10px;'>MTM Tracker V4 | Canal: " + CANAL_ALERTA + " | Si recibiste STOP HIT o TARGET HIT, revisa tu posición.</p>";
    return html;
}

/**
 * Construye el mensaje de WhatsApp (formato texto plano).
 */
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

/**
 * Envía mensaje vía CallMeBot WhatsApp.
 */
function enviarWhatsAppV4(mensaje) {
    if (!WS_PHONE || !WS_API_KEY) {
        Logger.log("WhatsApp no configurado: falta WS_PHONE o WS_API_KEY");
        return false;
    }

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

/**
 * Prueba manual de alerta dual.
 */
function probarAlertaDual() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ui = SpreadsheetApp.getUi();
    var resp = ui.alert("📱📧 Prueba de Alerta", "Se enviará una alerta de prueba por " + CANAL_ALERTA + ". ¿Continuar?", ui.ButtonSet.YES_NO);
    if (resp === ui.Button.YES) {
        enviarAlertaDual();
        ss.toast("Prueba enviada por " + CANAL_ALERTA + ".", "📱📧", 6);
    }
}

/**
 * Instala triggers de alerta dual.
 */
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

// ============================================================
// CONFIGURACIÓN DE CANAL DESDE EL MENÚ
// ============================================================

function cambiarCanalEmail() {
    setCanalAlerta("email");
}
function cambiarCanalWhatsApp() {
    setCanalAlerta("whatsapp");
}
function cambiarCanalAmbos() {
    setCanalAlerta("ambos");
}

function setCanalAlerta(canal) {
    // En V4 usamos PropertiesService para persistir la preferencia
    PropertiesService.getScriptProperties().setProperty("CANAL_ALERTA_V4", canal);
    SpreadsheetApp.getActiveSpreadsheet().toast("Canal de alerta cambiado a: " + canal.toUpperCase(), "⚙️", 4);
}

/**
 * Lee el canal activo de PropertiesService (fallback a 'ambos').
 */
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
