// ============================================================
// MTM TRACKER V4 — CONFIGURACIÓN Y CONSTANTES
// ============================================================
// ⚠️  IMPORTANTE: NO copiar este archivo a Apps Script.
//     Este archivo es solo referencia local (módulo).
//     En Apps Script usá UNICAMENTE: TODO_EN_UNO_V4.gs

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

// ============================================================
// FILTROS DE VALIDACIÓN (solo 4, como validadores, no generadores)
// ============================================================
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

// ============================================================
// NOMBRES DE HOJAS V4
// ============================================================
var SHEET_WL = "📋 WL CDI";
var SHEET_RADAR = "🎯 Radar Semanal";
var SHEET_TRACKER = "📈 Tracker Diario";
var SHEET_LOG = "📊 Score Log V4";
var SHEET_DASHBOARD = "📊 Dashboard V4";

// ============================================================
// ALERTAS DUAL: EMAIL + WHATSAPP
// ============================================================
var EMAIL_ALERTS = true;
var EMAIL_HORAS = [9.5, 11.5, 13.5, 15.5]; // 9:30, 11:30, 13:30, 15:30 ET (4 alertas al día)

/** @constant {string} Email destino para alertas (tu email real) */
var EMAIL_TO = "duardo07@hotmail.com";

/** @constant {string} Email CC para alertas adicionales */
var EMAIL_TO_CC = "pz910531@hotmail.com";

/** @constant {string} Canal activo: 'email' | 'whatsapp' | 'ambos' */
var CANAL_ALERTA = "ambos";

// CallMeBot WhatsApp (mismo número del V3)
var WS_PHONE = "573124873708";
var WS_API_KEY = "1386524";

// ============================================================
// UMBRALES DEL SCORE V4 (calibrados con WL real CDI)
// Score típico range: 0 - 8
// ============================================================
var UMBRAL_MIN_SCORE = 2.0;    // por debajo: no entra al radar
var UMBRAL_ALTA_CONF = 4.5;    // score >= 4.5: color verde fuerte 🟢
var UMBRAL_MEDIA_CONF = 3.0;   // score >= 3.0: amarillo/naranja 🟡

// ============================================================
// PESOS DEL SCORE V4 (más equilibrados)
// ============================================================
var PESO_MOMENTUM = 0.35;
var PESO_FUERZA_REL = 0.25;    // SCTR
var PESO_TENDENCIA = 0.25;     // SMAs + ADX
var PESO_RIESGO = 0.15;        // RSI + Beta + Earnings

// ============================================================
// TÉCNICO (SMA)
// ============================================================
var SMA_PERIODOS = [20, 50, 200];
