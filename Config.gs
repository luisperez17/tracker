// ============================================================
// MTM TRACKER — CONFIGURACIÓN Y CONSTANTES
// ============================================================

/** @constant {number} Cantidad de acciones por orden (week + month = hasta 40 por hoja) */
var MAX = 20;

/** @constant {string} Separador de argumentos en fórmulas de Sheets (español = punto y coma) */
var S = ";";

/** @constant {Object} Paleta de colores para el diseño premium */
var C = {
    DARK: "#1A1A2E",
    MID: "#16213E",
    ACCENT: "#0F3460",
    GREEN: "#00C853",
    YELLOW: "#FFD600",
    RED: "#FF1744",
    ORANGE: "#FF6D00",
    WHITE: "#FFFFFF",
    LIGHT: "#F0F4F8",
    LBLUE: "#E3F2FD",
    GRAY: "#B0BEC5",
    LGREEN: "#E8F5E9",
    LYELLOW: "#FFF9C4"
};

/** @constant {Array<Object>} Definición de filtros de Finviz */
var FILTROS = [
    {
        key: "ytd",
        nombre: "YTD Top + Volumen", hoja: "FV_YTD",
        desc: "Mid+ cap, vol >2x, sobre SMA 20/50/200",
        baseUrl: "https://finviz.com/screener.ashx?v=111&f=cap_midover,sh_avgvol_o200,sh_price_o10,sh_relvol_o2,ta_sma20_pa,ta_sma200_pa,ta_sma50_pa&ft=4",
        perfBase: "https://finviz.com/screener.ashx?v=141&f=cap_midover,sh_avgvol_o200,sh_price_o10,sh_relvol_o2,ta_sma20_pa,ta_sma200_pa,ta_sma50_pa&ft=4"
    },
    {
        key: "uptrend",
        nombre: "Strong Uptrend", hoja: "FV_Uptrend",
        desc: "Canal alcista + RSI>60 + nuevo máximo 52W",
        baseUrl: "https://finviz.com/screener.ashx?v=111&f=cap_midover,sh_avgvol_o200,sh_price_o10,sh_relvol_o2,ta_gap_u,ta_highlow52w_nh,ta_pattern_channelup,ta_rsi_ob60,ta_sma200_pa&ft=3",
        perfBase: "https://finviz.com/screener.ashx?v=141&f=cap_midover,sh_avgvol_o200,sh_price_o10,sh_relvol_o2,ta_gap_u,ta_highlow52w_nh,ta_pattern_channelup,ta_rsi_ob60,ta_sma200_pa&ft=3"
    },
    {
        key: "sma",
        nombre: "SMA 20/50/200", hoja: "FV_SMA",
        desc: "1W y 1M positivos, sobre las 3 SMAs",
        baseUrl: "https://finviz.com/screener.ashx?v=111&f=ta_perf_1wup,ta_perf2_4wup,ta_sma20_pa,ta_sma200_pa,ta_sma50_pa&ft=3",
        perfBase: "https://finviz.com/screener.ashx?v=141&f=ta_perf_1wup,ta_perf2_4wup,ta_sma20_pa,ta_sma200_pa,ta_sma50_pa&ft=3"
    },
    {
        key: "earnings_week",
        nombre: "Earnings Week", hoja: "FV_EarningsWeek",
        desc: "Earnings esta semana + precio >$2 + perf 1W positivo",
        baseUrl: "https://finviz.com/screener.ashx?v=111&f=earningsdate_thisweek,sh_avgvol_o50,sh_price_o2,ta_perf_1wup&ft=4",
        perfBase: "https://finviz.com/screener.ashx?v=141&f=earningsdate_thisweek,sh_avgvol_o50,sh_price_o2,ta_perf_1wup&ft=4"
    },
    {
        key: "newhigh",
        nombre: "New High + Volumen", hoja: "FV_NewHigh",
        desc: "Nuevo máximo con vol >300K y relativo >2x",
        baseUrl: "https://finviz.com/screener.ashx?v=111&s=ta_newhigh&f=sh_curvol_o300,sh_relvol_o2&ft=4",
        perfBase: "https://finviz.com/screener.ashx?v=141&s=ta_newhigh&f=sh_curvol_o300,sh_relvol_o2&ft=4"
    },
    {
        key: "post_earnings",
        nombre: "Post Earnings Breakout", hoja: "FV_PostEarnings",
        desc: "Nuevo máximo post-earnings con volumen climático",
        baseUrl: "https://finviz.com/screener.ashx?v=111&s=ta_newhigh&f=earningsdate_today,sh_curvol_o1000,sh_price_o3",
        perfBase: "https://finviz.com/screener.ashx?v=141&s=ta_newhigh&f=earningsdate_today,sh_curvol_o1000,sh_price_o3"
    },
    {
        key: "reversal",
        nombre: "Intraday Strong Reversal", hoja: "FV_Reversal",
        desc: "Nuevos máximos intraday",
        baseUrl: "https://finviz.com/screener.ashx?v=111&s=ta_newhigh",
        perfBase: "https://finviz.com/screener.ashx?v=141&s=ta_newhigh"
    },
    {
        key: "revenue_eps",
        nombre: "Revenue + EPS + FCF", hoja: "FV_RevenueEPS",
        desc: "EPS 5yr>20%, YoY>20% — calidad + momentum",
        baseUrl: "https://finviz.com/screener.ashx?v=111&f=cap_midover,fa_eps5years_o20,fa_epsyoy_o20,fa_epsyoy1_o20,fa_sales5years_o20",
        perfBase: "https://finviz.com/screener.ashx?v=141&f=cap_midover,fa_eps5years_o20,fa_epsyoy_o20,fa_epsyoy1_o20,fa_sales5years_o20"
    },
    {
        key: "adr_vol",
        nombre: "ADR 4K Volumen", hoja: "FV_ADRVol",
        desc: "Fundamentales sólidos ordenados por mayor cambio",
        baseUrl: "https://finviz.com/screener.ashx?v=111&f=cap_midover,fa_eps5years_o20,fa_epsyoy_o20,fa_epsyoy1_o20,fa_sales5years_o20",
        perfBase: "https://finviz.com/screener.ashx?v=141&f=cap_midover,fa_eps5years_o20,fa_epsyoy_o20,fa_epsyoy1_o20,fa_sales5years_o20"
    },
    {
        key: "ganadores",
        nombre: "Ganadores Sem +20%", hoja: "FV_Ganadores",
        desc: "Subieron >20% en 1 semana — momentum extremo",
        baseUrl: "https://finviz.com/screener.ashx?v=111&f=sh_avgvol_o100,ta_perf_1w20o&ft=4",
        perfBase: "https://finviz.com/screener.ashx?v=141&f=sh_avgvol_o100,ta_perf_1w20o&ft=4"
    },
    {
        key: "volumen",
        nombre: "Volumen Climático", hoja: "FV_Volumen",
        desc: "Large cap, vol >5M, relativo >1.5x, subiendo",
        baseUrl: "https://finviz.com/screener.ashx?v=111&f=cap_large,ind_stocksonly,sh_curvol_o5000,sh_relvol_o1.5,ta_change_u,ta_changeopen_u,ta_perf_1wup,ta_perf2_4wup&ft=4",
        perfBase: "https://finviz.com/screener.ashx?v=141&f=cap_large,ind_stocksonly,sh_curvol_o5000,sh_relvol_o1.5,ta_change_u,ta_changeopen_u,ta_perf_1wup,ta_perf2_4wup&ft=4"
    },
];

/** @constant {Object} Puntuación ponderada por tier de señal */
var TIER_SCORES = {
    "post_earnings": { tier: 1, pts: 3, label: "Post Earnings Breakout", razon: "Catalizador concreto hoy + volumen extremo" },
    "newhigh": { tier: 1, pts: 3, label: "New High + Volumen", razon: "Breakout real con volumen climático" },
    "ytd": { tier: 2, pts: 2, label: "YTD Top + Volumen", razon: "Momentum sostenido meses + vol institucional" },
    "uptrend": { tier: 2, pts: 2, label: "Strong Uptrend", razon: "Canal alcista confirmado + RSI>60" },
    "sma": { tier: 3, pts: 1.5, label: "SMA 20/50/200", razon: "Confirmación técnica multi-timeframe" },
    "volumen": { tier: 3, pts: 1.5, label: "Volumen Climático", razon: "Institucionales entrando en large caps" },
    "earnings_week": { tier: 4, pts: 1, label: "Earnings Week", razon: "Contexto/riesgo — no entrada directa" },
    "revenue_eps": { tier: 4, pts: 1, label: "Revenue + EPS + FCF", razon: "Calidad fundamental de largo plazo" },
    "adr_vol": { tier: 4, pts: 1, label: "ADR 4K Volumen", razon: "Momentum intraday en empresa sólida" },
    "ganadores": { tier: 4, pts: 1, label: "Ganadores Sem +20%", razon: "Cuidado — puede ser momentum agotado" },
    "reversal": { tier: 4, pts: 1, label: "Intraday Reversal", razon: "Solo válido con ATR/LOW verde en WL CDI" }
};

/** @constant {string} Nombres de las hojas de trabajo del Tracker */
var SEMANA_SHEET = "🎯 Semana Tracker";
var PRICE_LOG = "📈 Price Log";
var REPORT_SHEET = "📊 Reporte Viernes";

/** @constant {Array<number>} Horas ET en que se captura precio */
var HORAS_CHECK = [10, 11, 13, 14, 15];

/** @constant {number} Máximo de candidatas a trackear simultáneamente */
var MAX_CAND = 10;

/** @constant {number} Índice de columna de inicio de precios y resumen */
var COL_PRECIOS_INI = 12;
var COL_RESUMEN_INI = 37;
