/**
 * main.js — Dashboard orchestration
 *
 * Bootstraps auth, wires navigation, lazy-loads each section module,
 * and binds all dashboard-level UI events (theme, sidebar, export, compose).
 */

import { auth }                                        from './auth.js';
import { api }                                         from './api.js';
import { AdminTheme }                                  from './utils.js';
import { renderAnalytics }                             from './analytics.js';
import { renderContacts }                              from './contacts.js';
import { renderEmailTemplates,
         renderOutboundHistory,
         openEmailCompose }                            from './email.js';
import { Export }                                      from './export.js';
import { config as brandConfig }                       from './config.js';


// ── Theme ──────────────────────────────────────────────────────────────────────

AdminTheme.init();
document.getElementById('themeToggleBtn').addEventListener('click', () => AdminTheme.toggle());


// ── Auth guard ─────────────────────────────────────────────────────────────────
// guard() calls api.auth.me(); a 401 response automatically redirects to login
// via the 401 handler in api.js — no try/catch needed here.

await auth.guard();

const user = auth.getUser();
if (user?.email) {
    document.getElementById('topbarUser').textContent = user.email;
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await auth.logout();
});


// ── Section navigation ─────────────────────────────────────────────────────────

const PANELS = {
    analytics:       document.getElementById('analyticsPanel'),
    contacts:        document.getElementById('contactsPanel'),
    email_templates: document.getElementById('emailTemplatesPanel'),
    email_compose:   document.getElementById('emailComposePanel'),
    email_outbound:  document.getElementById('emailOutboundPanel'),
    export:          document.getElementById('exportPanel'),
    config:          document.getElementById('configPanel'),
};

let _activeSection = 'analytics';
let _loaded        = new Set();

function showSection(name) {
    if (!PANELS[name]) return;
    Object.values(PANELS).forEach(p => p.classList.remove('active'));
    PANELS[name].classList.add('active');

    document.querySelectorAll('.nav_item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === name);
    });

    _activeSection = name;

    if (name === 'analytics')                              _loadAnalytics();
    if (name === 'contacts'       && !_loaded.has('contacts'))    { renderContacts();        _loaded.add('contacts'); }
    if (name === 'email_templates')                        renderEmailTemplates();
    if (name === 'email_outbound' && !_loaded.has('outbound'))    { renderOutboundHistory(); _loaded.add('outbound'); }
    if (name === 'config'         && !_loaded.has('config'))      { brandConfig.init();      _loaded.add('config'); }
}

document.querySelectorAll('.nav_item[data-section]').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.section));
});


// ── Analytics date range ───────────────────────────────────────────────────────

function _getAnalyticsRange() {
    return {
        from: document.getElementById('analyticsFrom').value || null,
        to:   document.getElementById('analyticsTo').value   || null,
    };
}

function _loadAnalytics() {
    const { from, to } = _getAnalyticsRange();
    renderAnalytics(from, to);
}

document.getElementById('applyAnalyticsRange').addEventListener('click', _loadAnalytics);
document.getElementById('clearAnalyticsRange').addEventListener('click', () => {
    document.getElementById('analyticsFrom').value = '';
    document.getElementById('analyticsTo').value   = '';
    _loadAnalytics();
});


// ── Analytics export & print ───────────────────────────────────────────────────

document.getElementById('exportAnalyticsBtn').addEventListener('click', async () => {
    try {
        const { from, to } = _getAnalyticsRange();
        const data = await api.analytics.summary(from, to);
        Export.analyticsCSV(data);
    } catch (err) { alert(err.message); }
});
document.getElementById('printAnalyticsBtn').addEventListener('click', () =>
    Export.printSection('analyticsPanel'));

document.getElementById('exportAnalyticsCsvBtn')?.addEventListener('click', async () => {
    try {
        const { from, to } = _getAnalyticsRange();
        const data = await api.analytics.summary(from, to);
        Export.analyticsCSV(data);
    } catch (err) { alert(err.message); }
});
document.getElementById('printAnalyticsPageBtn')?.addEventListener('click', () =>
    Export.printSection('analyticsPanel'));


// ── Contacts export & print ────────────────────────────────────────────────────

document.getElementById('printContactsBtn').addEventListener('click', () =>
    Export.printSection('contactsPanel'));

document.getElementById('exportContactsCsvBtn')?.addEventListener('click', async () => {
    try {
        const data = await api.contacts.list({ limit: 100 });
        Export.contactsCSV(data.contacts ?? []);
    } catch (err) { alert(err.message); }
});
document.getElementById('printContactsPageBtn')?.addEventListener('click', () =>
    Export.printSection('contactsPanel'));


// ── Compose ────────────────────────────────────────────────────────────────────

document.getElementById('openComposeBtn')?.addEventListener('click', () => openEmailCompose());


// ── Mobile sidebar toggle ──────────────────────────────────────────────────────

document.getElementById('sidebarToggleBtn')?.addEventListener('click', () => {
    const sidebar = document.getElementById('mainSidebar');
    const btn     = document.getElementById('sidebarToggleBtn');
    const open    = sidebar.classList.toggle('sidebar_open');
    btn.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('.nav_item[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
        const sidebar = document.getElementById('mainSidebar');
        if (sidebar?.classList.contains('sidebar_open')) {
            sidebar.classList.remove('sidebar_open');
            document.getElementById('sidebarToggleBtn')?.setAttribute('aria-expanded', 'false');
        }
    });
});


// ── Analytics view tabs ────────────────────────────────────────────────────────

document.getElementById('analyticsViewTabs')?.addEventListener('click', (e) => {
    const tab = e.target.closest('.view_tab');
    if (!tab) return;
    document.querySelectorAll('#analyticsViewTabs .view_tab').forEach(t => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', String(t === tab));
    });
    const { from, to } = _getAnalyticsRange();
    renderAnalytics(from, to, tab.dataset.view);
});


// ── Initial load ───────────────────────────────────────────────────────────────

showSection('analytics');
