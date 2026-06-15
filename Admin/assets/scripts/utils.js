'use strict';

/**
 * utils.js — Shared helpers used across all admin modules
 */

export function escHtml(str) {
    return String(str ?? '')
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#39;');
}

export function fmtNum(n) {
    return Number(n ?? 0).toLocaleString();
}

export function fmtPct(part, total) {
    if (!total) return '—';
    return (Math.round((part / total) * 1000) / 10).toFixed(1) + '%';
}

export function fmtDate(iso, full = false) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    if (full) {
        return d.toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    }
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function setLoading(el, on) {
    if (!el) return;
    if (on) {
        el.setAttribute('aria-busy', 'true');
        if (!el.querySelector('.spinner_wrap')) {
            const div = document.createElement('div');
            div.className = 'spinner_wrap';
            div.innerHTML = '<div class="spinner"></div>';
            el.prepend(div);
        }
    } else {
        el.removeAttribute('aria-busy');
        el.querySelector('.spinner_wrap')?.remove();
    }
}

// Toast notification — single stack, auto-dismiss after 4s
let _toastTimer = null;
export function showToast(message, type = 'info') {
    let toast = document.getElementById('adminToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'adminToast';
        document.body.appendChild(toast);
    }
    clearTimeout(_toastTimer);
    toast.textContent = message;
    toast.className   = `admin_toast toast_${type} toast_show`;
    _toastTimer = setTimeout(() => toast.classList.remove('toast_show'), 4000);
}

// ── Country code → readable name ──────────────────────────────────────────────

let _countryNames = null;

function _getDisplayNames() {
    if (_countryNames) return _countryNames;
    try {
        _countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
        _countryNames = null;
    }
    return _countryNames;
}

/**
 * Convert an ISO 3166-1 alpha-2 code (e.g. "CM") to a readable name
 * ("Cameroon"). Falls back to the raw code if the browser doesn't support
 * Intl.DisplayNames or the code is unrecognised.
 */
export function countryName(code) {
    if (!code) return '—';
    const dn = _getDisplayNames();
    if (!dn) return code;
    try {
        const name = dn.of(code.toUpperCase());
        return name && name !== code.toUpperCase() ? name : code;
    } catch {
        return code;
    }
}

// ── Admin theme ───────────────────────────────────────────────────────────────

const THEME_KEY = 'gtAdminTheme';

export const AdminTheme = {
    init() {
        const saved = localStorage.getItem(THEME_KEY) ?? 'dark';
        document.documentElement.setAttribute('data-theme', saved);
        _updateToggleIcon(saved);
    },

    toggle() {
        const current = document.documentElement.getAttribute('data-theme') ?? 'dark';
        const next    = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(THEME_KEY, next);
        _updateToggleIcon(next);
    },
};

function _updateToggleIcon(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (icon) {
        icon.className = theme === 'dark'
            ? 'fa-solid fa-sun'
            : 'fa-solid fa-moon';
    }
    btn.setAttribute('title', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('aria-label', btn.getAttribute('title'));
}
