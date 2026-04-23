// ============================================================
// MTM PRO TRACKER V2 — SMART SCANNER
// ============================================================

/**
 * Ejecuta los escaneos profesionales y calcula métricas técnicas avanzadas.
 */
function runSmartScanner() {
    var regime = getMarketRegime();
    if (regime.status.indexOf("BEAR") >= 0) {
        SpreadsheetApp.getUi().alert("⛔ ALERTA DE RIESGO: El mercado está en tendencia bajista. Se recomienda no realizar nuevos escaneos hoy.");
        // return; // Podríamos bloquearlo, pero por ahora solo avisamos
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var results = [];

    PRO_FILTERS.forEach(function(filter) {
        ss.toast("Escaneando: " + filter.name, "🚀", 5);
        var stocks = fetchFinvizData(filter.url); // Reutilizamos el servicio de Finviz
        
        stocks.forEach(function(stock) {
            // Cálculo de métricas PRO
            var sma20 = fetchSMA20(stock.ticker);
            var distSMA20 = (stock.price - sma20) / sma20;
            var relStrength = calculateRelativeStrength(stock.ticker, regime.changeMarket || 0);

            results.push({
                ticker: stock.ticker,
                name: stock.empresa, // Sincronizado con FinvizService
                sector: stock.sector,
                price: stock.price,
                change: stock.change,
                distSMA20: distSMA20,
                relStrength: relStrength,
                filterSource: filter.name,
                score: calculateProScore(stock, distSMA20, relStrength, filter.weight)
            });
        });
    });

    // Ordenar por Score Pro
    results.sort(function(a, b) { return b.score - a.score; });
    
    // Escribir en la hoja Smart Scanner
    renderScannerResults(results);
}

/**
 * Calcula un score basado en momentum + calidad técnica.
 */
function calculateProScore(stock, distSMA20, relStrength, filterWeight) {
    var score = filterWeight;
    
    // Castigo por sobre-extensión (Anti-FOMO)
    if (distSMA20 > RISK_SETTINGS.MAX_DIST_SMA20) score -= 2;
    
    // Bonus por Fuerza Relativa
    if (relStrength > 0) score += 1.5;
    
    // Bonus por cercanía a la base (Entrada de bajo riesgo)
    if (distSMA20 > 0 && distSMA20 < 0.02) score += 1;

    return score;
}

/**
 * Simulación de Fuerza Relativa.
 * Compara el cambio de la acción vs el cambio del índice.
 */
function calculateRelativeStrength(ticker, marketChange) {
    // Implementación simplificada: Ticker Change - Market Change
    // En v2.1 usaremos RS de 3 meses comparado con SPY
    var stockChange = fetchStockChange(ticker);
    return stockChange - marketChange;
}

/**
 * Función simulada para SMA 20.
 */
function fetchSMA20(ticker) {
    var price = fetchPrecioYahoo(ticker);
    return price * 0.97; // Simulación
}
/**
 * Función puente para obtener y parsear datos de Finviz para el Pro Scanner.
 */
function fetchFinvizData(url) {
  var html = fetchFinviz(url); // Esta función ya la tienes en FinvizService.gs
  if (!html) return [];
  
  // Usamos el parseador que ya tienes configurado
  return parsearV111(html, 40); 
}

/**
 * Helper para obtener el cambio porcentual de una acción (Simulado para el Score).
 */
function fetchStockChange(ticker) {
  // En una versión final, esto vendría del parseo o de una API
  return 0; // Valor neutro por ahora
}
