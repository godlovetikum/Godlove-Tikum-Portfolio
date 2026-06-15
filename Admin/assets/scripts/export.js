'use strict';

/**
 * export.js — CSV and print export helpers
 */

import { escHtml } from './utils.js';

export const Export = {

    // ── Contacts CSV ──────────────────────────────────────────────

    contactsCSV(rows) {
        if (!rows?.length) return;

        const COLS = ['id', 'name', 'email', 'message', 'category', 'status',
                      'notified_at', 'acknowledged_at', 'session_id',
                      'ip_address', 'country', 'page', 'created_at'];

        const header = COLS.join(',');
        const body   = rows.map(row =>
            COLS.map(col => _csvCell(row[col])).join(',')
        ).join('\n');

        _download(`contacts_${_dateSlug()}.csv`, 'text/csv', header + '\n' + body);
    },

    // ── Analytics CSV ─────────────────────────────────────────────

    analyticsCSV(summary) {
        if (!summary) return;

        const lines = ['metric,value'];
        const flat  = _flattenObj(summary, '');
        for (const [k, v] of Object.entries(flat)) {
            lines.push(`${_csvCell(k)},${_csvCell(v)}`);
        }

        _download(`analytics_${_dateSlug()}.csv`, 'text/csv', lines.join('\n'));
    },

    // ── Print ─────────────────────────────────────────────────────

    printSection(sectionId) {
        const el = document.getElementById(sectionId);
        if (!el) return;

        const win = window.open('', '_blank', 'width=900,height=700');
        win.document.write(`<!DOCTYPE html><html lang="en"><head>
            <meta charset="UTF-8">
            <title>Admin Report — ${new Date().toLocaleDateString()}</title>
            <link rel="stylesheet" href="/assets/styles/admin.css">
            <style>
                body { background: #fff; color: #0f172a; padding: 2rem; }
                .btn, .filters_bar, .pagination, .action_btns, .editor_actions,
                .modal_overlay, .compose_modal, #adminToast { display: none !important; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #cbd5e1; padding: 0.4rem 0.6rem; font-size: 0.8rem; }
                th { background: #f1f5f9; }
            </style>
        </head><body>
            <h2 style="margin-bottom:1rem">Admin Report — ${new Date().toLocaleString()}</h2>
            ${el.innerHTML}
        </body></html>`);
        win.document.close();
        win.focus();
        win.print();
    },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function _csvCell(val) {
    if (val == null) return '';
    const s = String(val).replace(/"/g, '""');
    return /[,"\n\r]/.test(s) ? `"${s}"` : s;
}

function _dateSlug() {
    return new Date().toISOString().slice(0, 10);
}

function _download(filename, mime, content) {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function _flattenObj(obj, prefix) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            Object.assign(out, _flattenObj(v, key));
        } else {
            out[key] = v;
        }
    }
    return out;
}
