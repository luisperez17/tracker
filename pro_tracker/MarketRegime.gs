// ============================================================
// MTM PRO TRACKER V2 — EL SEMÁFORO DEL MERCADO
// ============================================================

/**
 * Analiza el estado de salud del mercado general.
 * @returns {Object} Estado del mercado y recomendación de riesgo.
 */
function getMarketRegime() {
    try {
        var spy = MARKET_INDEX;
        var price = fetchPrecioYahoo(spy);
        if (!price) return { status: "UNKNOWN", risk: "LOW", color: COLORS.TEXT_DIM };

        // Simulamos la obtención de medias móviles (en un entorno real usaríamos una API o histórico)
        // Para este MVP, usaremos una lógica de comparación simplificada
        var sma50 = fetchSMAYahoo(spy, 50); 
        var sma200 = fetchSMAYahoo(spy, 200);

        var status, risk, color, msg;

        if (price > sma50 && price > sma200) {
            status = "BULL MARKET";
            risk = "NORMAL / HIGH";
            color = COLORS.SUCCESS;
            msg = "El mercado está sano. Puedes operar momentum con confianza.";
        } else if (price < sma50 && price > sma200) {
            status = "CAUTION / PULLBACK";
            risk = "REDUCED (50%)";
            color = COLORS.WARNING;
            msg = "Mercado en corrección. Solo entra en las acciones más fuertes.";
        } else {
            status = "BEAR MARKET / DANGER";
            risk = "CASH ONLY";
            color = COLORS.DANGER;
            msg = "Mercado bajo presión. El riesgo de fallo es muy alto. Quédate en cash.";
        }

        return {
            price: price,
            sma50: sma50,
            sma200: sma200,
            status: status,
            risk: risk,
            color: color,
            message: msg,
            lastUpdate: new Date()
        };
    } catch (e) {
        Logger.log("Error en getMarketRegime: " + e.toString());
        return null;
    }
}

/**
 * Función auxiliar para obtener SMA (Simulada para este paso)
 * En una implementación completa, esto consultaría una tabla de históricos.
 */
function fetchSMAYahoo(ticker, period) {
    // Por ahora, como no tenemos histórico guardado, vamos a usar un valor referencial
    // para que el usuario entienda la lógica.
    // TODO: Implementar guardado de precios diarios para calcular SMA real.
    var price = fetchPrecioYahoo(ticker);
    if (period === 50) return price * 0.98; // Simula que estamos un poco arriba de la media
    if (period === 200) return price * 0.92;
    return price;
}
