// ============================================================
// MTM PRO TRACKER V2 — CONFIGURACIÓN MAESTRA
// ============================================================

var VERSION = "2.0.0 Pro";

/** @constant {Object} Parámetros de Riesgo y Gestión */
var RISK_SETTINGS = {
    MAX_POSITIONS: 10,          // Menos posiciones = más enfoque
    MAX_DIST_SMA20: 0.05,       // No entrar si está a más de 5% de la SMA 20 (Anti-FOMO)
    STOP_LOSS_DEFAULT: 0.04,    // 4% por defecto
    TARGET_MIN_RR: 2.0          // Ratio Riesgo/Beneficio mínimo
};

/** @constant {Object} Colores Premium (Paleta Dark Mode) */
var COLORS = {
    BG_DARK: "#0F172A",
    BG_CARD: "#1E293B",
    ACCENT: "#38BDF8",
    SUCCESS: "#22C55E",
    DANGER: "#EF4444",
    WARNING: "#F59E0B",
    TEXT_MAIN: "#F8FAFC",
    TEXT_DIM: "#94A3B8"
};

/** @constant {Array<Object>} Filtros Refinados (Solo Alta Probabilidad) */
var PRO_FILTERS = [
    {
        id: "core_uptrend",
        name: "Líderes en Tendencia",
        desc: "Acciones sobre SMA 20/50/200 con volumen institucional",
        url: "https://finviz.com/screener.ashx?v=111&f=cap_midover,sh_avgvol_o500,sh_price_o10,ta_sma20_pa,ta_sma200_pa,ta_sma50_pa&o=-perf1w",
        weight: 3
    },
    {
        id: "earnings_gap",
        name: "Post-Earnings Momentum",
        desc: "Reacción positiva a resultados con volumen climático",
        url: "https://finviz.com/screener.ashx?v=111&f=cap_midover,earningsdate_todayyield,sh_avgvol_o300,ta_change_u&o=-volume",
        weight: 4
    },
    {
        id: "relative_strength",
        name: "Fuerza Relativa (New Highs)",
        desc: "Nuevos máximos de 52 semanas en mercado lateral",
        url: "https://finviz.com/screener.ashx?v=111&f=cap_midover,sh_avgvol_o500,ta_highlow52w_nh&o=-perf1w",
        weight: 3
    },
    {
        id: "tight_consolidation",
        name: "Consolidación Estrecha",
        desc: "Baja volatilidad antes de un posible breakout",
        url: "https://finviz.com/screener.ashx?v=111&f=cap_midover,sh_avgvol_o500,ta_volatility_wo3&o=-volume",
        weight: 2
    }
];

/** @constant {Object} Configuración de Mercado */
var MARKET_INDEX = "SPY"; // El "jefe" a vigilar
var MARKET_THRESHOLDS = {
    BULLISH: "Above SMA 50",
    CAUTION: "Below SMA 50",
    BEARISH: "Below SMA 200"
};

/** @constant {string} Nombres de Hojas */
var SHEETS = {
    DASHBOARD: "💎 Pro Dashboard",
    SCANNER: "🚀 Smart Scanner",
    TRACKER: "🎯 Active Portfolio",
    HISTORY: "📚 Trading Journal"
};
