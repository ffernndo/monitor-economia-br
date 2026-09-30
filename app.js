/**
 * Brazil Economy Monitor | app.js
 * Dashboard of Brazilian economic indicators.
 * US dollar (PTAX), Selic (SGS-432) and IPCA (SGS-433/13522).
 */

Chart.register(ChartDataLabels);

/* ═══════════════════════════════════════
   PLUGIN: GROUPED HIERARCHICAL AXIS
   Config stored outside Chart.js to
   avoid a deep merge that destroys functions.
   ═══════════════════════════════════════ */
const _hAxisConfigs = {};

function setHierarchicalAxis(canvasId, config) {
    _hAxisConfigs[canvasId] = config;
}

const hierarchicalAxisPlugin = {
    id: 'hierarchicalAxis',
    afterDraw(chart) {
        try {
            const config = _hAxisConfigs[chart.canvas.id];
            if (!config?.levels) return;

            const { ctx } = chart;
            const xScale = chart.scales.x;
            if (!xScale) return;

            const labels = chart.data.labels;
            if (!labels || !labels.length) return;

            const bottom = chart.chartArea.bottom;
            const left = chart.chartArea.left;
            const right = chart.chartArea.right;

            // Extract dates from the labels
            const dates = [];
            for (let i = 0; i < labels.length; i++) {
                const parts = String(labels[i]).split('-');
                dates.push(new Date(
                    parseInt(parts[0]) || 2024,
                    parseInt(parts[1] || 1) - 1,
                    parseInt(parts[2] || 1)
                ));
            }

            if (!dates.length) return;

            const totalHeight = config.levels.length * 22;

            // Level 0 (finest): distribute evenly
            const level0 = config.levels[0];
            const slots = []; // { key, label, cx, slotStart, slotEnd }
            let lastKey0 = null;
            dates.forEach(d => {
                const key = level0.key(d);
                if (key !== lastKey0) {
                    slots.push({ key, label: level0.label(d), date: d });
                    lastKey0 = key;
                }
            });

            const n = slots.length;
            if (!n) return;

            const slotWidth = (right - left) / n;
            slots.forEach((s, i) => {
                s.slotStart = left + slotWidth * i;
                s.slotEnd = left + slotWidth * (i + 1);
                s.cx = s.slotStart + slotWidth / 2;
            });

            // Draw level 0 (months)
            const y0 = bottom + 14;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.font = level0.bold ? "bold 11px 'Inter', sans-serif" : "11px 'Inter', sans-serif";
            ctx.fillStyle = config.color || '#8b949e';

            slots.forEach((s, i) => {
                ctx.fillText(s.label, s.cx, y0);
                if (i > 0) {
                    const sepX = Math.round(s.slotStart) + 0.5;
                    ctx.beginPath();
                    ctx.strokeStyle = config.lineColor || '#30363d60';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([3, 3]);
                    ctx.moveTo(sepX, bottom + 4);
                    ctx.lineTo(sepX, bottom + 10 + totalHeight);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            });
            ctx.restore();

            // Upper levels (year, etc.): centre under the child slots
            for (let lvlIdx = 1; lvlIdx < config.levels.length; lvlIdx++) {
                const level = config.levels[lvlIdx];
                const y = bottom + 14 + lvlIdx * 22;

                // Group the previous level's slots by this level's key
                const groups = [];
                let cur = null;
                slots.forEach(s => {
                    const key = level.key(s.date);
                    if (!cur || cur.key !== key) {
                        cur = { key, label: level.label(s.date), startX: s.slotStart, endX: s.slotEnd };
                        groups.push(cur);
                    } else {
                        cur.endX = s.slotEnd;
                    }
                });

                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.font = level.bold ? "bold 11px 'Inter', sans-serif" : "11px 'Inter', sans-serif";
                ctx.fillStyle = config.color || '#8b949e';

                groups.forEach((g, gi) => {
                    const cx = (g.startX + g.endX) / 2;
                    ctx.fillText(g.label, cx, y);

                    if (gi > 0) {
                        const sepX = Math.round(g.startX) + 0.5;
                        ctx.beginPath();
                        ctx.strokeStyle = config.lineColor || '#30363d60';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([3, 3]);
                        ctx.moveTo(sepX, bottom + 4);
                        ctx.lineTo(sepX, bottom + 10 + totalHeight);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                });
                ctx.restore();
            }
        } catch (e) {
            console.warn('hierarchicalAxis plugin error:', e);
        }
    }
};
Chart.register(hierarchicalAxisPlugin);

const MESES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const AXIS_LEVEL_MONTH = {
    key: d => d.getFullYear() + '-' + d.getMonth(),
    label: d => MESES[d.getMonth()],
};
const AXIS_LEVEL_YEAR = {
    key: d => d.getFullYear(),
    label: d => String(d.getFullYear()),
    bold: true,
};

/* ═══════════════════════════════════════
   INDICATORS
   ═══════════════════════════════════════ */

const INDICATORS = {
    // Exchange rates: monthly quote
    usd:        { label: 'USD',  color: '--accent-blue', yAxis: 'yBRL', type: 'line', unit: 'R$', decimals: 2 },
    eur:        { label: 'EUR',  color: '#3498db',       yAxis: 'yBRL', type: 'line', unit: 'R$', decimals: 2 },
    gbp:        { label: 'GBP',  color: '#1abc9c',       yAxis: 'yBRL', type: 'line', unit: 'R$', decimals: 2 },
    chf:        { label: 'CHF',  color: '#e74c3c',       yAxis: 'yBRL', type: 'line', unit: 'R$', decimals: 2 },
    cad:        { label: 'CAD',  color: '#9b59b6',       yAxis: 'yBRL', type: 'line', unit: 'R$', decimals: 2 },
    // Selic
    selicMeta:  { label: 'Target',   color: '--accent-purple', yAxis: 'yPct', type: 'stepped', unit: '%', decimals: 1 },
    selicEfet:  { label: 'Effective', color: '#8e44ad',         yAxis: 'yPct', type: 'line',    unit: '%', decimals: 2 },
    // CDI
    cdi:        { label: 'Rate (p.a.)',    color: '--accent-green', yAxis: 'yPct', type: 'line', unit: '%', decimals: 2 },
    cdiAno:     { label: 'YTD',            color: '#27ae60',        yAxis: 'yPct', type: 'line', unit: '%', decimals: 2 },
    cdi12m:     { label: '12 months',      color: '#2ecc71',        yAxis: 'yPct', type: 'line', unit: '%', decimals: 2 },
    // IPCA
    ipca:       { label: 'Monthly',        color: '--accent-red',    yAxis: 'yPct', type: 'line',  unit: '%', decimals: 2 },
    ipcaAno:    { label: 'YTD',            color: '#c0392b',         yAxis: 'yPct', type: 'line', unit: '%', decimals: 2 },
    ipca12m:    { label: '12 months',      color: '--accent-yellow', yAxis: 'yPct', type: 'line', unit: '%', decimals: 1 },
    // IGP-M
    igpm:       { label: 'Monthly',        color: '#e67e22',  yAxis: 'yPct', type: 'line',  unit: '%', decimals: 2 },
    igpmAno:    { label: 'YTD',            color: '#d35400',  yAxis: 'yPct', type: 'line', unit: '%', decimals: 2 },
    igpm12m:    { label: '12 months',      color: '#f39c12',  yAxis: 'yPct', type: 'line', unit: '%', decimals: 2 },
    // INPC
    inpc:       { label: 'Monthly',        color: '#e84393',  yAxis: 'yPct', type: 'line',  unit: '%', decimals: 2 },
    inpcAno:    { label: 'YTD',            color: '#d63031',  yAxis: 'yPct', type: 'line', unit: '%', decimals: 2 },
    inpc12m:    { label: '12 months',      color: '#fd79a8',  yAxis: 'yPct', type: 'line', unit: '%', decimals: 2 },
    // Savings account
    poup:       { label: 'Monthly',        color: '#00cec9',  yAxis: 'yPct', type: 'line',  unit: '%', decimals: 2 },
    poupAno:    { label: 'YTD',            color: '#00b894',  yAxis: 'yPct', type: 'line', unit: '%', decimals: 2 },
    poup12m:    { label: '12 months',      color: '#55efc4',  yAxis: 'yPct', type: 'line', unit: '%', decimals: 2 },
};

const GROUPS = [
    { id: 'cambio',   label: 'FX rates',  indicators: ['usd', 'eur', 'gbp', 'chf', 'cad'] },
    { id: 'selic',    label: 'Selic',      indicators: ['selicMeta', 'selicEfet'] },
    { id: 'cdi',      label: 'CDI',        indicators: ['cdi', 'cdiAno', 'cdi12m'] },
    { id: 'ipca',     label: 'IPCA',       indicators: ['ipca', 'ipcaAno', 'ipca12m'] },
    { id: 'igpm',     label: 'IGP-M',      indicators: ['igpm', 'igpmAno', 'igpm12m'] },
    { id: 'inpc',     label: 'INPC',       indicators: ['inpc', 'inpcAno', 'inpc12m'] },
    { id: 'poupanca', label: 'Savings',    indicators: ['poup', 'poupAno', 'poup12m'] },
];

const CUTOFF = '2024-01';

const appState = {
    raw: {},
    monthly: {},
    enabled: ['usd'],
    chartInstance: null,
};

/* ═══════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════ */

function formatCurrency(n) { return n.toLocaleString('en-GB', { style: 'currency', currency: 'BRL' }); }
function formatPercent(n, d = 2) { return n.toFixed(d) + '%'; }
function formatVariation(n, suffix = '%') {
    if (n == null) return '—';
    return (n > 0 ? '+' : '') + n.toFixed(2) + suffix;
}
function variationClass(n, invert = false) {
    if (n == null || n === 0) return 'variation-neutral';
    return (invert ? n < 0 : n > 0) ? 'variation-up' : 'variation-down';
}
function formatDate(iso) { return new Date(iso).toLocaleDateString('pt-BR'); }
function formatDateTime(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB') + ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function getChartColors() {
    const s = getComputedStyle(document.documentElement);
    return { green: s.getPropertyValue('--accent-green').trim(), red: s.getPropertyValue('--accent-red').trim(),
        blue: s.getPropertyValue('--accent-blue').trim(), yellow: s.getPropertyValue('--accent-yellow').trim(),
        purple: s.getPropertyValue('--accent-purple').trim(), text: s.getPropertyValue('--text-secondary').trim(),
        border: s.getPropertyValue('--border').trim() };
}

function resolveColor(c) {
    if (c.startsWith('--')) return getComputedStyle(document.documentElement).getPropertyValue(c).trim();
    return c;
}

function labelStyle(color) {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const bg = isDark ? 'rgba(30, 38, 48, 0.95)' : 'rgba(235, 238, 242, 0.95)';
    const border = getComputedStyle(document.documentElement).getPropertyValue('--border').trim();
    return { color, backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: 5,
        padding: { top: 3, bottom: 3, left: 6, right: 6 }, font: { family: "'JetBrains Mono'", size: 10, weight: 600 } };
}

/* ═══════════════════════════════════════
   NORMALISATION: EVERYTHING MONTHLY
   ═══════════════════════════════════════ */

function normalizeMonthly() {
    const raw = appState.raw;

    // Currencies: monthly series already comes from fetch_moedas.py
    for (const moeda of ['usd', 'eur', 'gbp', 'chf', 'cad']) {
        if (raw.moedas?.[moeda]?.monthly) {
            appState.monthly[moeda] = raw.moedas[moeda].monthly.filter(m => m.data >= CUTOFF).map(m => ({ mes: m.data, valor: m.valor }));
        }
    }

    // Selic
    if (raw.selic?.meta_monthly) {
        appState.monthly.selicMeta = raw.selic.meta_monthly.filter(m => m.data >= CUTOFF).map(m => ({ mes: m.data, valor: m.taxa }));
    }
    if (raw.selic?.efetiva_monthly) {
        appState.monthly.selicEfet = raw.selic.efetiva_monthly.filter(m => m.data >= CUTOFF).map(m => ({ mes: m.data, valor: m.taxa }));
    }

    // CDI
    const f = (arr, field = 'valor') => arr ? arr.filter(m => m.data >= CUTOFF).map(m => ({ mes: m.data, valor: m[field] })) : [];
    if (raw.cdi) {
        appState.monthly.cdi = f(raw.cdi.monthly);
        appState.monthly.cdiAno = f(raw.cdi.acum_ano);
        appState.monthly.cdi12m = f(raw.cdi.acum_12m);
    }

    // IPCA
    if (raw.ipca) {
        appState.monthly.ipca = raw.ipca.monthly?.filter(m => m.data >= CUTOFF).map(m => ({ mes: m.data, valor: m.variacao })) || [];
        appState.monthly.ipca12m = raw.ipca.monthly?.filter(m => m.data >= CUTOFF && m.acumulado_12m != null).map(m => ({ mes: m.data, valor: m.acumulado_12m })) || [];
        appState.monthly.ipcaAno = f(raw.ipca.acum_ano);
    }

    // IGP-M
    if (raw.igpm) {
        appState.monthly.igpm = raw.igpm.monthly?.filter(m => m.data >= CUTOFF).map(m => ({ mes: m.data, valor: m.variacao })) || [];
        appState.monthly.igpmAno = f(raw.igpm.acum_ano);
        appState.monthly.igpm12m = f(raw.igpm.acum_12m);
    }

    // INPC
    if (raw.inpc) {
        appState.monthly.inpc = raw.inpc.monthly?.filter(m => m.data >= CUTOFF).map(m => ({ mes: m.data, valor: m.variacao })) || [];
        appState.monthly.inpc12m = raw.inpc.monthly?.filter(m => m.data >= CUTOFF && m.acumulado_12m != null).map(m => ({ mes: m.data, valor: m.acumulado_12m })) || [];
        appState.monthly.inpcAno = f(raw.inpc.acum_ano);
    }

    // Savings account
    if (raw.poupanca) {
        appState.monthly.poup = f(raw.poupanca.monthly);
        appState.monthly.poupAno = f(raw.poupanca.acum_ano);
        appState.monthly.poup12m = f(raw.poupanca.acum_12m);
    }
}

function getAllMonths() {
    const set = new Set();
    for (const id of Object.keys(INDICATORS)) {
        for (const d of (appState.monthly[id] || [])) set.add(d.mes);
    }
    return [...set].sort();
}

/* ═══════════════════════════════════════
   RENDER: HEADER
   ═══════════════════════════════════════ */

function renderHeader() {
    const ts = appState.raw.moedas?.last_updated ? formatDateTime(appState.raw.moedas.last_updated) : '—';
    return `
        <header class="header">
            <div class="header-left">
                <div class="header-logo">monitor_economia<span>_br</span></div>
                <span class="header-badge">Banco Central</span>
            </div>
            <div class="header-right">
                <span class="header-timestamp">Updated ${ts}</span>
                <button class="theme-toggle" id="themeToggle" title="Toggle theme">🌙</button>
            </div>
        </header>
    `;
}

/* ═══════════════════════════════════════
   RENDER: KPIs
   ═══════════════════════════════════════ */

function renderKPIs() {
    const usd = appState.raw.moedas?.usd;
    const s = appState.raw.selic;
    const i = appState.raw.ipca;
    const cdi = appState.raw.cdi;

    const dolarVar = usd?.variations?.day;
    const selicDir = s?.copom_decisions?.[0];
    const ipcaMeta = i?.meta_inflacao;

    return `
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label">US dollar (USD/BRL)</div>
                <div class="kpi-value">${usd?.current ? formatCurrency(usd.current.cotacao_venda) : '—'}</div>
                <div class="kpi-detail ${variationClass(dolarVar, true)}">${dolarVar != null ? formatVariation(dolarVar) + ' today' : '—'}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Selic target</div>
                <div class="kpi-value">${s?.current?.meta != null ? formatPercent(s.current.meta) + ' p.a.' : '—'}</div>
                <div class="kpi-detail">${selicDir ? 'COPOM ' + formatDate(selicDir.data) + ': ' + (({ alta: 'hike', corte: 'cut' })[selicDir.direcao] || selicDir.direcao) + ' ' + formatVariation(selicDir.variacao, ' p.p.') : '—'}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">IPCA 12 months</div>
                <div class="kpi-value">${i?.current?.acumulado_12m != null ? formatPercent(i.current.acumulado_12m) : '—'}</div>
                <div class="kpi-detail">${ipcaMeta ? 'Target: ' + formatPercent(ipcaMeta.centro) + ' (' + formatPercent(ipcaMeta.piso) + ' to ' + formatPercent(ipcaMeta.teto) + ')' : '—'}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">CDI 12 months</div>
                <div class="kpi-value">${cdi?.current?.acum_12m != null ? formatPercent(cdi.current.acum_12m) : '—'}</div>
                <div class="kpi-detail">${cdi?.current?.taxa != null ? 'Daily rate: ' + cdi.current.taxa.toFixed(4) + '%' : '—'}</div>
            </div>
        </div>
    `;
}

/* ═══════════════════════════════════════
   RENDER: INDICATOR SELECTOR
   ═══════════════════════════════════════ */

function renderIndicatorSelector() {
    const groupsHTML = GROUPS.map(group => {
        const chips = group.indicators.map(id => {
            const cfg = INDICATORS[id];
            const active = appState.enabled.includes(id);
            const color = resolveColor(cfg.color);
            return `<button class="indicator-chip ${active ? 'active' : ''}" data-indicator="${id}" style="--chip-color:${color}">
                <span class="chip-dot" style="background:${color}"></span> ${cfg.label}
            </button>`;
        }).join('');
        return `
            <div class="indicator-group">
                <span class="indicator-group-label">${group.label}</span>
                <div class="indicator-group-chips">${chips}</div>
            </div>
        `;
    }).join('');
    return `<div class="indicator-selector">${groupsHTML}</div>`;
}

/* ═══════════════════════════════════════
   RENDER: CHART
   ═══════════════════════════════════════ */

function renderChart() {
    return `
        <div class="content">
            <div class="chart-card">
                <div class="chart-title">Economic Indicators | Brazil (2024+)</div>
                <div class="chart-container"><canvas id="mainChart"></canvas></div>
            </div>
        </div>
    `;
}

function getFullLabel(id) {
    const group = GROUPS.find(g => g.indicators.includes(id));
    const cfg = INDICATORS[id];
    if (!group) return cfg.label;
    // For currencies, the chip label is enough (USD, EUR...)
    if (group.indicators.length === 1) return group.label;
    return group.label + ' | ' + cfg.label;
}

/* ═══════════════════════════════════════
   MOUNT: UNIFIED CHART
   ═══════════════════════════════════════ */

function mountChart() {
    const c = getChartColors();
    const allMonths = getAllMonths();
    if (!allMonths.length) return;

    const enabledCount = appState.enabled.length;
    const labelEvery = Math.max(1, Math.ceil(allMonths.length / Math.max(1, Math.floor(14 / enabledCount))));

    const datasets = appState.enabled.map(id => {
        const cfg = INDICATORS[id];
        const data = appState.monthly[id] || [];
        const dataMap = Object.fromEntries(data.map(d => [d.mes, d.valor]));
        const color = resolveColor(cfg.color);
        const isStepped = cfg.type === 'stepped';

        return {
            type: 'line',
            label: getFullLabel(id),
            data: allMonths.map(m => dataMap[m] ?? null),
            borderColor: color,
            backgroundColor: color + '15',
            borderWidth: 2,
            fill: true,
            stepped: isStepped,
            tension: isStepped ? 0 : 0.3,
            pointRadius: enabledCount <= 2 ? 3 : 0,
            pointHitRadius: 10,
            yAxisID: cfg.yAxis,
            spanGaps: true,
            datalabels: {
                ...labelStyle(color),
                display: (ctx) => {
                    if (enabledCount >= 4) return ctx.dataIndex === allMonths.length - 1;
                    return ctx.dataIndex % labelEvery === 0 || ctx.dataIndex === allMonths.length - 1;
                },
                anchor: 'end',
                align: 'top',
                offset: 4,
                formatter: v => {
                    if (v == null) return '';
                    return cfg.unit === 'R$'
                        ? 'R$ ' + v.toFixed(cfg.decimals)
                        : v.toFixed(cfg.decimals) + '%';
                },
            },
        };
    });

    setHierarchicalAxis('mainChart', {
        color: c.text,
        lineColor: c.border + '60',
        levels: [AXIS_LEVEL_MONTH, AXIS_LEVEL_YEAR],
    });

    const chart = new Chart(document.getElementById('mainChart'), {
        type: 'line',
        data: { labels: allMonths, datasets },
        options: {
            responsive: true, maintainAspectRatio: false, clip: false,
            layout: { padding: { top: 30, right: 60, left: 60, bottom: 50 } },
            scales: {
                x: { offset: true, ticks: { display: false }, grid: { display: false } },
                yBRL: { display: false, position: 'left', beginAtZero: false },
                yPct: { display: false, position: 'right', beginAtZero: false },
            },
            plugins: {
                legend: {
                    display: true, position: 'top',
                    labels: { color: c.text, font: { size: 11 }, usePointStyle: true, pointStyle: 'circle', padding: 16 },
                },
                datalabels: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,.85)',
                    titleFont: { family: "'Inter', sans-serif", size: 12 },
                    bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
                    padding: 12, cornerRadius: 8, mode: 'index', intersect: false,
                    callbacks: {
                        title: ctx => {
                            const m = ctx[0]?.label || '';
                            const parts = m.split('-');
                            if (parts.length >= 2) return MESES[parseInt(parts[1]) - 1] + '/' + parts[0];
                            return m;
                        },
                        label: ctx => {
                            const id = appState.enabled[ctx.datasetIndex];
                            const cfg = INDICATORS[id];
                            if (ctx.parsed.y == null) return null;
                            const val = cfg.unit === 'R$'
                                ? 'R$ ' + ctx.parsed.y.toFixed(cfg.decimals)
                                : ctx.parsed.y.toFixed(cfg.decimals) + '%';
                            return ' ' + getFullLabel(id) + ': ' + val;
                        },
                    },
                },
            },
        },
    });
    appState.chartInstance = chart;
}

/* ═══════════════════════════════════════
   MAIN RENDER
   ═══════════════════════════════════════ */

function render() {
    if (appState.chartInstance) { appState.chartInstance.destroy(); appState.chartInstance = null; }

    const app = document.getElementById('app');
    let html = renderHeader();
    html += renderKPIs();
    html += renderIndicatorSelector();
    html += renderChart();
    html += `
        <footer class="footer">
            Sources: <a href="https://dadosabertos.bcb.gov.br/" target="_blank">Banco Central do Brasil</a> (PTAX, SGS) |
            <a href="https://github.com/Fexndev/monitor-economia-br" target="_blank">GitHub</a>
        </footer>
    `;
    app.innerHTML = html;

    try { mountChart(); } catch (e) { console.error('Error mounting chart:', e); }
    bindEvents();
}

/* ═══════════════════════════════════════
   EVENTS
   ═══════════════════════════════════════ */

function bindEvents() {
    document.getElementById('themeToggle')?.addEventListener('click', () => {
        const html = document.documentElement;
        const isDark = html.getAttribute('data-theme') === 'dark';
        html.setAttribute('data-theme', isDark ? 'light' : 'dark');
        localStorage.setItem('theme', isDark ? 'light' : 'dark');
        render();
    });

    document.querySelectorAll('[data-indicator]').forEach(el => {
        el.addEventListener('click', () => {
            const id = el.dataset.indicator;
            const idx = appState.enabled.indexOf(id);
            if (idx >= 0) {
                if (appState.enabled.length > 1) appState.enabled.splice(idx, 1);
            } else {
                appState.enabled.push(id);
            }
            render();
        });
    });
}

/* ═══════════════════════════════════════
   INIT
   ═══════════════════════════════════════ */

async function init() {
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);

    try {
        const files = ['moedas', 'selic', 'ipca', 'cdi', 'igpm', 'inpc', 'poupanca'];
        const responses = await Promise.all(files.map(f => fetch('data/' + f + '.json')));

        for (let i = 0; i < files.length; i++) {
            if (responses[i].ok) appState.raw[files[i]] = await responses[i].json();
        }

        console.log('Raw data loaded:', Object.keys(appState.raw));
        try { normalizeMonthly(); } catch (e) { console.error('normalizeMonthly error:', e); }
        console.log('Monthly keys:', Object.keys(appState.monthly));
        render();
    } catch (err) {
        console.error('Error loading data:', err);
        document.getElementById('app').innerHTML = `<div class="loading"><p>Error loading data: ${err.message}</p></div>`;
    }
}

init();
