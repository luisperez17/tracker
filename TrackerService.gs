// ============================================================
// MTM TRACKER — SERVICIO DE SEGUIMIENTO SEMANAL
// ============================================================

/**
 * Configura la hoja de seguimiento semanal y logs de precios.
 */
function configurarSemanaTracker() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ui = SpreadsheetApp.getUi();

    var ws = ss.getSheetByName(SEMANA_SHEET);
    if (ws && ws.getLastRow() > 5) {
        var resp = ui.alert("⚠️ Conservar datos", "¿Deseas borrar los datos actuales para reconfigurar la hoja? (Si eliges NO, se cancelará la operación)", ui.ButtonSet.YES_NO);
        if (resp !== ui.Button.YES) return;
    }

    if (!ws) ws = ss.insertSheet(SEMANA_SHEET);
    formatearHojaSemana(ws);

    var log = ss.getSheetByName(PRICE_LOG);
    if (!log) { 
        log = ss.insertSheet(PRICE_LOG); 
        formatearPriceLog(log); 
    }

    ss.toast("Semana Tracker listo.", "🎯 Semana Tracker", 8);
    ws.activate();
}

/**
 * Registra los precios actuales para las candidatas activas.
 */
function registrarPrecios(horaET, esManual) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName(SEMANA_SHEET);
    if (!ws || ws.getLastRow() < 6) return;

    var datos = ws.getRange(6, 1, MAX_CAND, 8).getValues();
    var activas = [];
    for (var i = 0; i < datos.length; i++) {
        var tk = String(datos[i][0]).trim().toUpperCase();
        // Cambiado de === true a == true para mayor flexibilidad
        if (tk && datos[i][4] == true) { 
            activas.push({
                ticker: tk,
                row: 6 + i,
                entrada: parseFloat(datos[i][5]) || 0,
                stop: parseFloat(datos[i][6]) || 0,
                target: parseFloat(datos[i][7]) || 0
            });
        }
    }

    if (activas.length === 0) {
        ss.toast("No se encontraron tickers con el check 'Track' activado.", "⚠️", 5);
        return;
    }
    
    ss.toast("Procesando " + activas.length + " tickers activos...", "⏳", 4);

    var log = ss.getSheetByName(PRICE_LOG);
    if (!log) { 
        log = ss.insertSheet(PRICE_LOG); 
        formatearPriceLog(log); 
    }

    var now = new Date();
    var checkNum = HORAS_CHECK.indexOf(horaET) + 1;
    var dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    var diaNom = dias[now.getDay()];
    var esFinde = (diaNom === "Sáb" || diaNom === "Dom");
    var diaNomEfectivo = (esFinde && esManual) ? "Lun" : diaNom;

    var filas = [];
    for (var ti = 0; ti < activas.length; ti++) {
        var precio = fetchPrecioYahoo(activas[ti].ticker);
        if (precio !== null) {
            activas[ti].precioActual = precio; // Guardamos para el reporte
            filas.push([now, activas[ti].ticker, horaET, checkNum, diaNomEfectivo, precio]);
            actualizarCeldaSemana(ws, activas[ti], diaNomEfectivo, checkNum, precio, esManual);
        } else {
            // Fallback para evitar error si Yahoo falla
            activas[ti].precioActual = activas[ti].entrada; 
        }
        Utilities.sleep(600);
    }

    if (filas.length > 0) {
        var nextRow = log.getLastRow() + 1;
        log.getRange(nextRow, 1, filas.length, 6).setValues(filas);
        log.getRange(nextRow, 1, filas.length, 1).setNumberFormat("dd/mm/yyyy hh:mm");
        log.getRange(nextRow, 6, filas.length, 1).setNumberFormat('"$"#,##0.00');
    }

    ss.toast("Precios registrados para " + activas.length + " tickers.", "📊 Precios", 5);

    // NUEVO: Enviar resumen por WhatsApp automáticamente si está configurado
    enviarResumenWhatsApp(activas);
}

function enviarResumenWhatsApp(activas) {
    try {
        if (!WS_PHONE || WS_PHONE.indexOf("...") >= 0 || !WS_API_KEY) {
            SpreadsheetApp.getActive().toast("Falta configurar el teléfono o API Key de WhatsApp.", "⚠️", 5);
            return;
        }
        if (!activas || activas.length === 0) {
            SpreadsheetApp.getActive().toast("No hay acciones activas para reportar.", "⚠️", 3);
            return;
        }

        var info = getInfoTiempoNY();
        var h = info.hora;
        var dia = info.diaSemanaStr; 
        
        var msg = "📊 *RESUMEN MTM — " + dia + " " + h + ":00 NY*\n\n";
        msg += "```\n";
        msg += "TKR    ENT    ACT    RET% \n";
        msg += "────   ────   ────   ─────\n";

        var counts = { target: 0, stop: 0, profit: 0, loss: 0 };

        activas.forEach(function(cand) {
            var tk = (cand.ticker + "    ").substring(0, 4);
            var precio = Number(cand.precioActual) || 0;
            var entrada = Number(cand.entrada) || 0;
            var pnl = entrada > 0 ? ((precio - entrada) / entrada) : 0;
            
            var icon = "⚪";
            if (cand.target > 0 && precio >= cand.target) { icon = "🎯"; counts.target++; }
            else if (cand.stop > 0 && precio <= cand.stop) { icon = "🛑"; counts.stop++; }
            else if (pnl > 0) { icon = "📈"; counts.profit++; }
            else { icon = "📉"; counts.loss++; }

            var pnlStr = (pnl * 100).toFixed(1);
            if (pnl > 0) pnlStr = "+" + pnlStr;
            
            // Alineación manual de columnas para la "Grilla" (Monospace)
            var colEnt = (entrada.toFixed(1) + "      ").substring(0, 6);
            var colAct = (precio.toFixed(1) + "      ").substring(0, 6);
            var colRet = (pnlStr + "%      ").substring(0, 7);
            
            msg += tk + "   " + colEnt + " " + colAct + " " + colRet + icon + "\n";
        });
        
        msg += "```\n";
        msg += "\n*Estatus*: " + counts.target + " 🎯 | " + counts.stop + " 🛑 | " + counts.profit + " 📈 | " + counts.loss + " 📉";
        
        enviarWhatsApp(msg);
        SpreadsheetApp.getActive().toast("Reporte 'Grid' enviado a WhatsApp.", "📱", 3);
        
    } catch (e) {
        Logger.log("Error en enviarResumenWhatsApp: " + e.toString());
        SpreadsheetApp.getActive().toast("Error al enviar reporte: " + e.message, "❌", 6);
    }
}

/**
 * Actualiza una celda específica en la hoja del Tracker Semanal.
 */
function actualizarCeldaSemana(ws, cand, diaNom, checkNum, precio, esManual) {
    var mapDia = { "Lun": 1, "Mar": 2, "Mié": 3, "Jue": 4, "Vie": 5 };
    var d = mapDia[diaNom];
    if (!d) return;
    var col = COL_PRECIOS_INI + (d - 1) * 5 + (checkNum - 1);
    var cell = ws.getRange(cand.row, col);

    if (!esManual) {
        var existing = cell.getValue();
        if (existing !== "" && existing !== 0 && existing !== null) return;
    }

    var precioNum = Number(precio);
    if (isNaN(precioNum)) return;

    cell.setValue(precioNum).setNumberFormat('"$"#,##0.00').setFontSize(9).setHorizontalAlignment("center");

    if (cand.entrada > 0) {
        if (cand.target > 0 && precioNum >= cand.target) {
            cell.setBackground("#1B5E20").setFontColor("#FFFFFF").setFontWeight("bold");
        } else if (cand.stop > 0 && precioNum <= cand.stop) {
            cell.setBackground("#B71C1C").setFontColor("#FFFFFF").setFontWeight("bold");
        } else if (precioNum > cand.entrada) {
            cell.setBackground("#E8F5E9").setFontColor("#1B5E20");
        } else {
            cell.setBackground("#FFEBEE").setFontColor("#B71C1C");
        }
    }
}

/**
 * Genera el reporte consolidado del viernes.
 */
function generarReporteViernes() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName(SEMANA_SHEET);
    var log = ss.getSheetByName(PRICE_LOG);

    if (!ws || !log || log.getLastRow() < 3) {
        ss.toast("Sin datos suficientes en el Price Log para generar el reporte.", "⚠️", 5);
        return;
    }

    var ranking = generarRankingParaHistorial();
    if (!ranking || ranking.length === 0) {
        ss.toast("No hay tickers activos con precios registrados para procesar.", "⚠️", 5);
        return;
    }

    var wsRep = ss.getSheetByName(REPORT_SHEET);
    if (!wsRep) wsRep = ss.insertSheet(REPORT_SHEET);
    formatearHojaReporte(wsRep);

    // --- CÁLCULO DE MÉTRICAS DE RESUMEN ---
    var total = ranking.length;
    var ganadoras = ranking.filter(function(r) { return r.pnlPct > 0; }).length;
    var wr = total > 0 ? (ganadoras / total) : 0;
    var pnlProm = ranking.reduce(function(a, b) { return a + b.pnlPct; }, 0) / total;
    var mejor = ranking[0].ticker + " (" + (ranking[0].pnlPct * 100).toFixed(1) + "%)";

    wsRep.getRange(5, 2).setValue(total);
    wsRep.getRange(5, 3).setValue(wr).setNumberFormat("0%");
    wsRep.getRange(5, 4).setValue(pnlProm).setNumberFormat("+0.00%;-0.00%");
    wsRep.getRange(5, 5).setValue(mejor);

    // --- LLENADO DE TABLA ---
    var filas = [];
    for (var i = 0; i < ranking.length; i++) {
        var r = ranking[i];
        var estatus = r.hitTarget ? "🎯 TARGET" : (r.hitStop ? "🛑 STOP" : "⏳ ACTIVO");
        
        filas.push([
            i + 1,
            r.ticker,
            r.empresa,
            r.filtrosStr,
            r.scoreMTM,
            r.entrada,
            r.pVie,
            r.pnlPct,
            estatus,
            r.tend
        ]);
    }

    var dataRange = wsRep.getRange(8, 1, filas.length, 10);
    dataRange.setValues(filas).setFontSize(9).setVerticalAlignment("middle").setHorizontalAlignment("center");
    
    // Formatos condicionales y colores
    for (var row = 0; row < filas.length; row++) {
        var pnlCell = wsRep.getRange(8 + row, 8);
        var estCell = wsRep.getRange(8 + row, 9);
        var pVal = filas[row][7];
        
        pnlCell.setNumberFormat("+0.00%;-0.00%").setFontWeight("bold").setFontColor(pVal >= 0 ? C.GREEN : C.RED);
        
        var estVal = filas[row][8];
        if (estVal === "🎯 TARGET") estCell.setBackground("#1B5E20").setFontColor("#FFFFFF").setFontWeight("bold");
        if (estVal === "🛑 STOP") estCell.setBackground("#B71C1C").setFontColor("#FFFFFF").setFontWeight("bold");
        
        wsRep.setRowHeight(8 + row, 22);
    }

    wsRep.activate();
    ss.toast("Reporte de rendimiento generado con éxito.", "✅", 5);
}

/**
 * Escanea la semana y resalta acciones en riesgo o near target (Uso Miércoles).
 */
function verificarEstadoMiercoles() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName(SEMANA_SHEET);
    if (!ws || ws.getLastRow() < 6) return;

    var data = ws.getRange(6, 1, MAX_CAND, 11).getValues();
    var props = PropertiesService.getScriptProperties();
    var hoy = new Date().toLocaleDateString();
    var alertCount = 0;

    for (var i = 0; i < data.length; i++) {
        var tk = String(data[i][0]).trim();
        if (!tk) continue;

        var row = 6 + i;
        var entrada = parseFloat(data[i][5]);
        var stop = parseFloat(data[i][6]);
        var target = parseFloat(data[i][7]);
        if (!entrada) continue;

        var precioActual = fetchPrecioYahoo(tk);
        if (precioActual === null) continue;

        var distStop = stop > 0 ? (precioActual - stop) / precioActual : 1;
        var distTarget = target > 0 ? (target - precioActual) / precioActual : 1;

        // Lógica de Alerta de Riesgo (Stop Loss)
        if (distStop < 0.015 && distStop > -0.01) {
            ws.getRange(row, 1, 1, 3).setBackground("#FFEBEE");
            ws.getRange(row, 7).setBackground(C.RED).setFontColor("#FFFFFF");
            
            // Anti-spam: Solo enviar una vez al día por ticker
            if (props.getProperty("alert_stop_" + tk) !== hoy) {
                enviarWhatsApp("🛑 ALERTA MTM: " + tk + " está en riesgo. Precio: $" + precioActual.toFixed(2) + " (Cerca del Stop: $" + stop.toFixed(2) + ")");
                props.setProperty("alert_stop_" + tk, hoy);
            }
            alertCount++;
        } 
        // Lógica de Alerta de Beneficio (Target)
        else if (distTarget < 0.015 && distTarget > -0.01) {
            ws.getRange(row, 1, 1, 3).setBackground("#E8F5E9");
            ws.getRange(row, 8).setBackground(C.GREEN).setFontColor("#FFFFFF");
            
            if (props.getProperty("alert_target_" + tk) !== hoy) {
                enviarWhatsApp("🎯 ALERTA MTM: " + tk + " cerca del TARGET. Precio: $" + precioActual.toFixed(2) + " (Objetivo: $" + target.toFixed(2) + ")");
                props.setProperty("alert_target_" + tk, hoy);
            }
            alertCount++;
        }
    }

    if (alertCount > 0) {
        ss.toast(alertCount + " alertas detectadas y procesadas.", "⚠️ Gestión Riesgo", 6);
    } else {
        ss.toast("Sin alertas críticas. Todas las posiciones en zona segura.", "✅", 4);
    }
}

/**
 * Función de prueba para validar la conexión con WhatsApp.
 */
function testWhatsApp() {
    enviarWhatsApp("🚀 MTM Tracker: Prueba de conexión exitosa. El sistema de alertas está activo.");
    SpreadsheetApp.getActiveSpreadsheet().toast("Mensaje de prueba enviado. Revisa tu WhatsApp.", "📱", 4);
}

/**
 * Resetea los datos para una nueva semana de trading.
 */
function resetearSemana() {
    var ui = SpreadsheetApp.getUi();
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var resp = ui.alert("🔄 Reset Semanal", "¿Confirmas el reset para la próxima semana?", ui.ButtonSet.YES_NO);
    if (resp !== ui.Button.YES) return;

    var ranking = generarRankingParaHistorial();
    if (ranking && ranking.length > 0) {
        guardarHistorialSemana(ranking);
    }

    var log = ss.getSheetByName(PRICE_LOG);
    if (log && log.getLastRow() > 2) {
        var semN = "📦 Log " + new Date().toLocaleDateString("es").replace(/\//g, "-");
        var arch = ss.insertSheet(semN);
        var logData = log.getRange(1, 1, log.getLastRow(), 6).getValues();
        arch.getRange(1, 1, logData.length, 6).setValues(logData);
        log.getRange(3, 1, log.getLastRow() - 2, 6).clearContent();
    }

    var ws = ss.getSheetByName(SEMANA_SHEET);
    if (ws && ws.getLastRow() >= 6) {
        // Limpiar 30 columnas desde el inicio de precios (25 precios + 5 de resumen/extras)
        ws.getRange(6, COL_PRECIOS_INI, ws.getLastRow() - 5, 30).clearContent().clearFormat();
        ws.getRange(3, 2).setValue("Semana del " + new Date().toLocaleDateString("es"));
    }

    ss.toast("Reset completo. Listo para nueva semana.", "🔄", 5);
}

/**
 * Guarda el resumen de la semana en la hoja de historial.
 */
function guardarHistorialSemana(ranking) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hist = ss.getSheetByName("📚 Historial Semanal");
    if (!hist) { 
        hist = ss.insertSheet("📚 Historial Semanal"); 
        formatearHistorialSemanal(hist); 
    }

    var semanaStr = new Date().toLocaleDateString("es");
    var filas = ranking.map(function(r) {
        return [
            semanaStr, r.ticker, r.empresa, r.sector, r.scoreMTM || "", r.filtrosStr || "",
            r.entrada || "", r.stop || "", r.target || "", r.rr || "", 
            r.rr >= 2 ? "✅ Sí" : "❌ No", r.pLunes || "", r.pVie || "", r.pnlPct || 0,
            r.hitTarget ? "★ Sí" : "—", r.hitStop ? "✗ Sí" : "—", 
            r.mejorHora || "", r.tend || "", r.numChecks || 0
        ];
    });

    if (filas.length === 0) return;
    hist.getRange(hist.getLastRow() + 1, 1, filas.length, 19).setValues(filas);
    ss.toast("Historial actualizado.", "📚", 4);
}

/**
 * Actualiza el resumen de resultados en la hoja activo del Tracker.
 */
function actualizarResumenSemana(ranking) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName(SEMANA_SHEET);
    if (!ws || !ranking) return;

    var wlData = ws.getRange(6, 1, MAX_CAND, 1).getValues();
    var filaMap = {};
    for (var i = 0; i < wlData.length; i++) {
        var tk = String(wlData[i][0]).trim().toUpperCase();
        if (tk) filaMap[tk] = 6 + i;
    }

    for (var ri = 0; ri < ranking.length; ri++) {
        var r2 = ranking[ri];
        var row = filaMap[r2.ticker];
        if (!row) continue;

        ws.getRange(row, COL_RESUMEN_INI).setValue(r2.pnlPct).setNumberFormat("0.00%").setBackground(r2.pnlPct >= 0 ? "#E8F5E9" : "#FFEBEE");
        ws.getRange(row, COL_RESUMEN_INI + 1).setValue(r2.hitTarget ? "★ SÍ" : "—");
        ws.getRange(row, COL_RESUMEN_INI + 2).setValue(r2.hitStop ? "✗ SÍ" : "—");
        ws.getRange(row, COL_RESUMEN_INI + 3).setValue(r2.mejorHora).setFontSize(8).setFontColor("#E65100");
    }
}

/**
 * Sanitiza y limpia decimales pegados como texto en la hoja del Tracker.
 */
function sanitizarDecimalesSemana() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName(SEMANA_SHEET);
    if (!ws) return;

    var corregidos = 0;
    for (var r = 6; r <= 6 + MAX_CAND - 1; r++) {
        for (var c = 6; c <= 8; c++) { // Entrada, Stop, Target
            var cell = ws.getRange(r, c);
            var val = cell.getValue();
            var num = limpiarValor(val);
            if (num !== null && num > 0) {
                cell.setValue(num).setNumberFormat('"$"#,##0.00');
                corregidos++;
            }
        }
    }
    ss.toast(corregidos + " valores corregidos en Semana Tracker.", "✅", 4);
}

/**
 * Sanitiza y limpia decimales en la hoja de Operaciones.
 */
function sanitizarDecimalesOperaciones() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName("📈 Operaciones");
    if (!ws) return;

    var corregidos = 0;
    
    // 1: Limpiar B2 (Capital Inicial)
    var cellB2 = ws.getRange(2, 2);
    var numB2 = limpiarValor(cellB2.getValue());
    if (numB2 !== null) {
        cellB2.setValue(numB2).setNumberFormat('"$"#,##0.00');
        corregidos++;
    }

    var lastRow = ws.getLastRow();
    if (lastRow < 8) return;

    // 2: Limpiar lista I(9), J(10), L(12)
    var cols = [9, 10, 12];
    for (var r = 8; r <= lastRow; r++) {
        for (var i = 0; i < cols.length; i++) {
            var cell = ws.getRange(r, cols[i]);
            var val = cell.getValue();
            var num = limpiarValor(val);
            if (num !== null && num > 0) {
                cell.setValue(num).setNumberFormat('"$"#,##0.00');
                corregidos++;
            }
        }
    }
    ss.toast(corregidos + " valores corregidos en Operaciones.", "✅", 4);
}
/**
 * Envía el resumen de WhatsApp manualmente con los datos actuales.
 */
function enviarResumenManual() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName(SEMANA_SHEET);
    if (!ws) return;
    
    var lastCol = ws.getLastColumn();
    var data = ws.getRange(6, 1, MAX_CAND, lastCol).getValues();
    var activas = [];
    
    for (var i = 0; i < data.length; i++) {
        var tk = String(data[i][0]).trim();
        var active = data[i][4]; // Col E (Active)
        if (tk && active === true) {
            // Buscamos el último precio registrado en las columnas de la derecha
            var ultimoPrecio = 0;
            // Columnas de precios empiezan en COL_PRECIOS_INI (col 14, index 13)
            for (var c = COL_PRECIOS_INI - 1; c < data[i].length; c++) {
               var val = limpiarValor(data[i][c]);
               if (val !== null && val > 0) ultimoPrecio = val;
            }
            
            var entrada = limpiarValor(data[i][5]) || 0;
            activas.push({
                ticker: tk,
                entrada: entrada,
                stop: limpiarValor(data[i][6]) || 0,
                target: limpiarValor(data[i][7]) || 0,
                precioActual: ultimoPrecio || entrada || 0 
            });
        }
    }
    
    if (activas.length > 0) {
        enviarResumenWhatsApp(activas);
        ss.toast("Resumen enviado a WhatsApp.", "📱", 4);
    } else {
        ss.toast("No hay acciones activas para reportar.", "⚠️", 4);
    }
}
