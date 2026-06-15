'use strict';

/**
 * analytics.js — Analytics section renderer
 *
 * Views (controlled by tab strip in index.html):
 *   summary      — KPI cards, device split, referrers, geo, engagement
 *   trend        — daily visit/click sparkline chart
 *   raw_visitors — paginated table of individual visitor rows
 *   raw_clicks   — paginated table of individual click rows
 */

import { api } from './api.js';
import { fmtNum, fmtPct, escHtml, showToast, setLoading, countryName } from './utils.js';

const ROOT = document.getElementById('analyticsSection');

let _rawPage   = 1;
const RAW_LIMIT = 50;

export async function renderAnalytics(from, to, view = 'summary') {
    if (!ROOT) return;
    if (view === 'summary' || view === 'trend') {
        _rawPage = 1;
    }
    setLoading(ROOT, true);
    try {
        if (view === 'summary') {
            const [summary, geo] = await Promise.all([
                api.analytics.summary(from, to),
                api.analytics.raw('visitors', { limit: 200, from, to }).catch(() => ({ rows: [] })),
            ]);
            const geoRows = geo.rows ?? geo.data?.rows ?? [];
            ROOT.innerHTML = buildSummaryHTML(summary.data ?? summary, geoRows);

        } else if (view === 'trend') {
            const trend = await api.analytics.trend(from, to);
            ROOT.innerHTML = `<div class="card" style="margin-top:0.5rem">
                <h3 class="card_title">Daily Trend</h3>
                ${buildTrendChart(trend.data ?? trend)}
            </div>`;

        } else if (view === 'raw_visitors' || view === 'raw_clicks') {
            const type = view === 'raw_visitors' ? 'visitors' : 'clicks';
            const res  = await api.analytics.raw(type, { limit: RAW_LIMIT, page: _rawPage, from, to });
            const rows  = res.rows  ?? res.data?.rows  ?? [];
            const total = res.total ?? res.data?.total ?? rows.length;
            ROOT.innerHTML = buildRawHTML(rows, type, total, _rawPage, RAW_LIMIT);
            _bindRawPagination(from, to, view, total);
        }
    } catch (err) {
        ROOT.innerHTML = `<p class="error_msg">${escHtml(err.message)}</p>`;
    } finally {
        setLoading(ROOT, false);
    }
}

function _bindRawPagination(from, to, view, total) {
    const pages = Math.ceil(total / RAW_LIMIT);
    ROOT.querySelector('#rawPrevBtn')?.addEventListener('click', () => {
        if (_rawPage > 1) { _rawPage--; renderAnalytics(from, to, view); }
    });
    ROOT.querySelector('#rawNextBtn')?.addEventListener('click', () => {
        if (_rawPage < pages) { _rawPage++; renderAnalytics(from, to, view); }
    });
}

// ── Build HTML ─────────────────────────────────────────────────────────────────

function buildSummaryHTML(summary, geoRows) {
    const totalVisits    = summary.total_visits    ?? 0;
    const uniqueVisitors = summary.unique_visitors ?? 0;
    const totalClicks    = summary.total_clicks    ?? 0;
    const byDevice       = summary.by_device       ?? {};
    const byReferrer     = summary.by_referrer     ?? {};
    const byEvent        = summary.by_event        ?? {};
    const bySection      = summary.by_section      ?? {};
    const byTarget       = summary.by_target       ?? {};

    // Aggregate countries from raw visitor rows
    const byCountry = {};
    for (const v of geoRows) {
        const code = v.country;
        if (code) byCountry[code] = (byCountry[code] || 0) + 1;
    }

    return `
    <div class="kpi_row">
        ${kpi('Total Visits',      fmtNum(totalVisits),    'fa-eye',           'kpi_green')}
        ${kpi('Unique Visitors',   fmtNum(uniqueVisitors), 'fa-user',          'kpi_blue')}
        ${kpi('Total Clicks',      fmtNum(totalClicks),    'fa-arrow-pointer', 'kpi_amber')}
        ${kpi('Avg Clicks/Visit',  totalVisits > 0 ? (totalClicks / totalVisits).toFixed(1) : '—', 'fa-chart-simple', '')}
    </div>

    <div class="grid_2col">
        <div class="card">
            <h3 class="card_title">Device Split</h3>
            ${buildDeviceBar(byDevice, totalVisits)}
        </div>
        <div class="card">
            <h3 class="card_title">Top Referrers</h3>
            ${buildReferrerTable(byReferrer)}
        </div>
    </div>

    <div class="grid_2col">
        <div class="card">
            <h3 class="card_title">Top Countries</h3>
            ${buildCountryTable(byCountry)}
        </div>
        <div class="card">
            <h3 class="card_title">Engagement by Event</h3>
            ${buildBarChart(byEvent, totalClicks, 'event')}
        </div>
    </div>

    <div class="grid_2col">
        <div class="card">
            <h3 class="card_title">Clicks by Section</h3>
            ${buildBarChart(bySection, totalClicks, 'section')}
        </div>
        <div class="card" style="margin-bottom:1rem">
            <h3 class="card_title">Top Click Targets</h3>
            ${buildTargetTable(byTarget)}
        </div>
    </div>`;
}

function buildRawHTML(rows, type, total, page, limit) {
    const pages = Math.ceil(total / limit);
    const isVisitors = type === 'visitors';
    const cols = isVisitors
        ? ['Session', 'Device', 'Country', 'Referrer', 'Site Key']
        : ['Session', 'Event', 'Section', 'Target', 'External', 'Page'];

    const headerCells = cols.map(c => `<th>${c}</th>`).join('');
    const bodyRows = rows.map(r => isVisitors
        ? `<tr>
               <td class="ref_cell">${escHtml(r.session_id?.slice(0, 8) ?? '—')}…</td>
               <td>${escHtml(r.device ?? '—')}</td>
               <td>${escHtml(r.country ?? '—')}</td>
               <td class="ref_cell">${escHtml(r.referrer ?? '—')}</td>
               <td>${escHtml(r.site_key ?? '—')}</td>
           </tr>`
        : `<tr>
               <td class="ref_cell">${escHtml(r.session_id?.slice(0, 8) ?? '—')}…</td>
               <td>${escHtml(r.event ?? '—')}</td>
               <td>${escHtml(r.section ?? '—')}</td>
               <td>${escHtml(r.target ?? '—')}</td>
               <td>${r.external ? 'Yes' : 'No'}</td>
               <td class="ref_cell">${escHtml(r.page ?? '—')}</td>
           </tr>`
    ).join('');

    const pagination = pages > 1 ? `
    <div class="pagination">
        ${page > 1     ? `<button class="btn btn_sm btn_ghost" id="rawPrevBtn">← Prev</button>` : ''}
        <span class="page_info">Page ${page} of ${pages} (${fmtNum(total)} rows)</span>
        ${page < pages ? `<button class="btn btn_sm btn_ghost" id="rawNextBtn">Next →</button>` : ''}
    </div>` : `<p class="page_info" style="font-size:0.78rem;color:var(--text_muted);margin-top:0.5rem">${fmtNum(total)} row${total !== 1 ? 's' : ''}</p>`;

    if (!rows.length) {
        return `<p class="empty_msg">No ${type} data for this range.</p>`;
    }

    return `
    <div style="overflow-x:auto;margin-top:0.5rem">
        <table class="data_table">
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${bodyRows}</tbody>
        </table>
    </div>
    ${pagination}`;
}

// ── Components ────────────────────────────────────────────────────────────────

function kpi(label, value, icon, cls) {
    return `
    <div class="kpi_card ${cls}">
        <i class="fa-solid ${icon} kpi_icon" aria-hidden="true"></i>
        <div class="kpi_body">
            <span class="kpi_value">${value}</span>
            <span class="kpi_label">${label}</span>
        </div>
    </div>`;
}

function buildDeviceBar(byDevice, total) {
    const mobile  = byDevice.mobile  ?? 0;
    const desktop = byDevice.desktop ?? 0;
    const mPct    = total > 0 ? Math.round((mobile  / total) * 100) : 0;
    const dPct    = 100 - mPct;
    return `
    <div class="device_bar_wrap">
        <div class="device_bar">
            <div class="device_seg device_mobile"  style="width:${mPct}%" title="Mobile ${mPct}%"></div>
            <div class="device_seg device_desktop" style="width:${dPct}%" title="Desktop ${dPct}%"></div>
        </div>
        <div class="device_legend">
            <span class="dot dot_mobile"></span> Mobile <strong>${mPct}%</strong> (${fmtNum(mobile)})
            &nbsp;&nbsp;
            <span class="dot dot_desktop"></span> Desktop <strong>${dPct}%</strong> (${fmtNum(desktop)})
        </div>
    </div>`;
}

function buildTrendChart(trend) {
    if (!Array.isArray(trend) || trend.length === 0) {
        return '<p class="empty_msg">No trend data available.</p>';
    }

    const W = 540, H = 120, PAD = { top: 12, right: 8, bottom: 28, left: 36 };
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top  - PAD.bottom;

    const maxVal = Math.max(...trend.map(d => Math.max(d.visitors, d.clicks)), 1);
    const xStep  = innerW / Math.max(trend.length - 1, 1);

    const pts = (key) => trend.map((d, i) => {
        const x = PAD.left + i * xStep;
        const y = PAD.top  + innerH - (d[key] / maxVal) * innerH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const visitPts = pts('visitors');
    const clickPts = pts('clicks');

    const xLabels = [0, Math.floor(trend.length / 2), trend.length - 1]
        .filter((v, i, a) => a.indexOf(v) === i)
        .map(i => {
            const d = trend[i];
            const x = PAD.left + i * xStep;
            const label = d.date.slice(5);
            return `<text x="${x.toFixed(1)}" y="${H - 4}" class="chart_label">${label}</text>`;
        }).join('');

    const yLabels = [0, Math.ceil(maxVal / 2), maxVal].map(v => {
        const y = PAD.top + innerH - (v / maxVal) * innerH;
        return `<text x="${PAD.left - 4}" y="${y.toFixed(1)}" class="chart_label" text-anchor="end">${v}</text>`;
    }).join('');

    return `
    <svg viewBox="0 0 ${W} ${H}" class="trend_chart" aria-label="Traffic trend chart">
        <polyline points="${visitPts}" class="line_visits" fill="none"/>
        <polyline points="${clickPts}" class="line_clicks" fill="none"/>
        ${xLabels}${yLabels}
    </svg>
    <div class="chart_legend">
        <span class="dot dot_visits"></span> Visits &nbsp;
        <span class="dot dot_clicks"></span> Clicks
    </div>`;
}

function buildReferrerTable(byReferrer) {
    const entries = Object.entries(byReferrer).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (!entries.length) return '<p class="empty_msg">No referrer data.</p>';
    const total = entries.reduce((s, [, v]) => s + v, 0);
    const rows  = entries.map(([ref, count]) => `
        <tr>
            <td class="ref_cell">${escHtml(ref)}</td>
            <td class="num_cell">${fmtNum(count)}</td>
            <td class="pct_cell">${fmtPct(count, total)}</td>
        </tr>`).join('');
    return `<table class="data_table"><thead><tr><th>Source</th><th>Visits</th><th>%</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function buildCountryTable(byCountry) {
    const entries = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (!entries.length) return '<p class="empty_msg">No geographic data in current range.</p>';
    const total = entries.reduce((s, [, v]) => s + v, 0);
    const rows  = entries.map(([code, count]) => `
        <tr>
            <td>
                <span class="flag_text">${escHtml(countryName(code))}</span>
                <span class="text_muted" style="font-size:0.72rem;margin-left:0.35rem">${escHtml(code)}</span>
            </td>
            <td class="num_cell">${fmtNum(count)}</td>
            <td class="pct_cell">${fmtPct(count, total)}</td>
        </tr>`).join('');
    return `<table class="data_table"><thead><tr><th>Country</th><th>Visitors</th><th>%</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function buildBarChart(obj, total, labelKey) {
    const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (!entries.length) return '<p class="empty_msg">No data available.</p>';
    const max = entries[0][1];
    return `<div class="bar_list">` + entries.map(([label, count]) => `
        <div class="bar_row">
            <span class="bar_label">${escHtml(label)}</span>
            <div class="bar_track">
                <div class="bar_fill" style="width:${Math.round((count / max) * 100)}%"></div>
            </div>
            <span class="bar_num">${fmtNum(count)}</span>
        </div>`).join('') + `</div>`;
}

function buildTargetTable(byTarget) {
    const entries = Object.entries(byTarget).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (!entries.length) return '<p class="empty_msg">No target data.</p>';
    const total = Object.values(byTarget).reduce((s, v) => s + v, 0);
    const rows  = entries.map(([target, count]) => `
        <tr>
            <td>${escHtml(target)}</td>
            <td class="num_cell">${fmtNum(count)}</td>
            <td class="pct_cell">${fmtPct(count, total)}</td>
        </tr>`).join('');
    return `<table class="data_table"><thead><tr><th>Target</th><th>Clicks</th><th>%</th></tr></thead><tbody>${rows}</tbody></table>`;
}
