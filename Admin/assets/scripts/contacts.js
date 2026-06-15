'use strict';

/**
 * contacts.js — Contact submissions section
 *
 * Renders the paginated, filterable contact list with:
 *   - Status badges (new / read / replied / follow_up)
 *   - Notification and acknowledgement flags
 *   - Dynamic action buttons based on current status workflow:
 *       new       → Mark Read  |  Email
 *       read      → Mark Replied | Email
 *       replied   → Mark Follow-up | Email
 *       follow_up → Mark Replied  | Email
 *   - Row expansion showing message + session/geo data
 *   - Cross-reference link to analytics by session_id
 *   - Country code → readable name via countryName()
 *   - Export to CSV
 */

import { api } from './api.js';
import { escHtml, fmtDate, showToast, setLoading, countryName } from './utils.js';
import { openEmailCompose }                                       from './email.js';
import { Export }                                                 from './export.js';

const ROOT = document.getElementById('contactsSection');

let _state = {
    page:     1,
    limit:    20,
    status:   '',
    category: '',
    from:     '',
    to:       '',
    total:    0,
    rows:     [],
};

export async function renderContacts(params = {}) {
    if (!ROOT) return;
    _state = { ..._state, ...params, page: params.page ?? 1 };
    setLoading(ROOT, true);

    try {
        const data = await api.contacts.list({
            page:     _state.page,
            limit:    _state.limit,
            status:   _state.status   || undefined,
            category: _state.category || undefined,
            from:     _state.from     || undefined,
            to:       _state.to       || undefined,
        });
        _state.rows  = data.contacts ?? [];
        _state.total = data.total    ?? 0;
        ROOT.innerHTML = buildContactsHTML(_state.rows, _state.total);
        _bindEvents();
    } catch (err) {
        ROOT.innerHTML = `<p class="error_msg">${escHtml(err.message)}</p>`;
    } finally {
        setLoading(ROOT, false);
    }
}

// ── Build HTML ────────────────────────────────────────────────────────────────

function buildContactsHTML(rows, total) {
    const filters   = buildFilters();
    const summary   = `<p class="list_summary">${fmtNum(total)} submission${total !== 1 ? 's' : ''}</p>`;
    const exportBtn = `<button class="btn btn_sm btn_ghost" id="exportContactsBtn"><i class="fa-solid fa-download"></i> Export CSV</button>`;

    if (!rows.length) {
        return `${filters}<div class="list_header">${summary}${exportBtn}</div><p class="empty_msg">No contacts match the current filters.</p>`;
    }

    const tableRows  = rows.map(buildRow).join('');
    const pagination = buildPagination(total, _state.page, _state.limit);

    return `
    ${filters}
    <div class="list_header">${summary}${exportBtn}</div>
    <div class="table_wrap">
        <table class="data_table contacts_table" id="contactsTable">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Notified</th>
                    <th>Acked</th>
                    <th>Country</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
        </table>
    </div>
    ${pagination}`;
}

function buildRow(c) {
    const status   = c.status ?? 'new';
    const notified = c.notified_at     ? '<span class="badge badge_ok">Yes</span>'   : '<span class="badge badge_warn">No</span>';
    const acked    = c.acknowledged_at ? '<span class="badge badge_ok">Yes</span>'   : '<span class="badge badge_warn">No</span>';
    const country  = c.country
        ? `<span class="flag_text">${escHtml(countryName(c.country))}</span>`
        : '<span class="text_muted">—</span>';

    return `
    <tr class="contact_row" data-id="${escHtml(c.id)}" data-status="${escHtml(status)}">
        <td class="date_cell">${fmtDate(c.created_at)}</td>
        <td>
            <button class="contact_name_btn" data-id="${escHtml(c.id)}" aria-expanded="false">
                ${escHtml(c.name)}
                <i class="fa-solid fa-chevron-down expand_icon" aria-hidden="true"></i>
            </button>
            <div class="contact_email text_muted">${escHtml(c.email)}</div>
        </td>
        <td><span class="category_tag">${escHtml(c.category ?? '—')}</span></td>
        <td><span class="status_badge status_${escHtml(status)}">${escHtml(status.replace('_', ' '))}</span></td>
        <td>${notified}</td>
        <td>${acked}</td>
        <td>${country}</td>
        <td>
            <div class="action_btns">
                ${buildActionButtons(c.id, status)}
            </div>
        </td>
    </tr>
    <tr class="contact_detail_row" id="detail_${escHtml(c.id)}" hidden>
        <td colspan="8">
            ${buildDetailPanel(c)}
        </td>
    </tr>`;
}

/**
 * Dynamic action buttons based on the status workflow:
 *   new       → Mark Read
 *   read      → Mark Replied
 *   replied   → Mark Follow-up
 *   follow_up → Mark Replied  (cycle back)
 * Email button is always shown.
 */
function buildActionButtons(id, status) {
    const id_  = escHtml(id);
    const next = { new: 'read', read: 'replied', replied: 'follow_up', follow_up: 'replied' };
    const label= { read: 'Mark Read', replied: 'Mark Replied', follow_up: 'Follow-up' };

    const nextStatus = next[status];
    const progressBtn = nextStatus
        ? `<button class="btn btn_xs btn_ghost" data-action="${nextStatus}" data-id="${id_}">${label[nextStatus]}</button>`
        : '';

    const emailBtn = `<button class="btn btn_xs btn_primary" data-action="email" data-id="${id_}" data-email="${escHtml('')}" data-name="${escHtml('')}">Email</button>`;

    return `${progressBtn}${emailBtn}`;
}

function buildDetailPanel(c) {
    const session = c.session_id
        ? `<span class="mono_text">${escHtml(c.session_id)}</span>`
        : '<span class="text_muted">—</span>';
    const ip = c.ip_address ? escHtml(c.ip_address) : '<span class="text_muted">—</span>';
    const country = c.country ? escHtml(countryName(c.country)) : '—';

    return `
    <div class="detail_panel">
        <div class="detail_message">
            <span class="detail_label">Message</span>
            <p>${escHtml(c.message)}</p>
        </div>
        <div class="detail_meta">
            <div><span class="detail_label">Session ID</span>${session}</div>
            <div><span class="detail_label">IP</span>${ip}</div>
            <div><span class="detail_label">Country</span>${country}</div>
            <div><span class="detail_label">Page</span>${c.page ? `<a href="${escHtml(c.page)}" target="_blank" rel="noopener">${escHtml(c.page)}</a>` : '—'}</div>
            <div><span class="detail_label">Received</span>${fmtDate(c.created_at, true)}</div>
        </div>
    </div>`;
}

function buildFilters() {
    return `
    <div class="filters_bar">
        <select class="filter_select" id="filterStatus">
            <option value="">All statuses</option>
            <option value="new"       ${_state.status === 'new'       ? 'selected' : ''}>New</option>
            <option value="read"      ${_state.status === 'read'      ? 'selected' : ''}>Read</option>
            <option value="replied"   ${_state.status === 'replied'   ? 'selected' : ''}>Replied</option>
            <option value="follow_up" ${_state.status === 'follow_up' ? 'selected' : ''}>Follow-up</option>
        </select>
        <select class="filter_select" id="filterCategory">
            <option value="">All categories</option>
            <option value="new-website"      ${_state.category === 'new-website'      ? 'selected' : ''}>New website</option>
            <option value="fix-website"      ${_state.category === 'fix-website'      ? 'selected' : ''}>Fix website</option>
            <option value="book-call"        ${_state.category === 'book-call'        ? 'selected' : ''}>Book call</option>
            <option value="project-question" ${_state.category === 'project-question' ? 'selected' : ''}>Project question</option>
            <option value="other"            ${_state.category === 'other'            ? 'selected' : ''}>Other</option>
        </select>
        <input type="date" class="filter_input" id="filterFrom" value="${_state.from}" placeholder="From">
        <input type="date" class="filter_input" id="filterTo"   value="${_state.to}"   placeholder="To">
        <button class="btn btn_sm btn_ghost" id="applyFiltersBtn">Apply</button>
        <button class="btn btn_sm btn_ghost" id="clearFiltersBtn">Clear</button>
    </div>`;
}

function buildPagination(total, page, limit) {
    const pages = Math.ceil(total / limit);
    if (pages <= 1) return '';
    const prev = page > 1     ? `<button class="btn btn_sm btn_ghost" id="prevPageBtn">← Prev</button>` : '';
    const next = page < pages ? `<button class="btn btn_sm btn_ghost" id="nextPageBtn">Next →</button>` : '';
    return `<div class="pagination">${prev}<span class="page_info">Page ${page} of ${pages}</span>${next}</div>`;
}

function fmtNum(n) { return Number(n).toLocaleString(); }

// ── Events ────────────────────────────────────────────────────────────────────

function _bindEvents() {
    ROOT.querySelector('#applyFiltersBtn')?.addEventListener('click', () => {
        renderContacts({
            status:   ROOT.querySelector('#filterStatus')?.value   ?? '',
            category: ROOT.querySelector('#filterCategory')?.value ?? '',
            from:     ROOT.querySelector('#filterFrom')?.value     ?? '',
            to:       ROOT.querySelector('#filterTo')?.value       ?? '',
            page: 1,
        });
    });

    ROOT.querySelector('#clearFiltersBtn')?.addEventListener('click', () => {
        renderContacts({ status: '', category: '', from: '', to: '', page: 1 });
    });

    ROOT.querySelector('#prevPageBtn')?.addEventListener('click', () =>
        renderContacts({ page: _state.page - 1 }));

    ROOT.querySelector('#nextPageBtn')?.addEventListener('click', () =>
        renderContacts({ page: _state.page + 1 }));

    ROOT.querySelector('#exportContactsBtn')?.addEventListener('click', () =>
        Export.contactsCSV(_state.rows));

    // Row expand / action buttons — single delegated listener
    ROOT.querySelector('.contacts_table')?.addEventListener('click', async (e) => {
        const btn     = e.target.closest('[data-action]');
        const namebtn = e.target.closest('.contact_name_btn');

        if (namebtn) {
            const id     = namebtn.dataset.id;
            const detail = document.getElementById(`detail_${id}`);
            if (detail) {
                const hidden = detail.hidden;
                detail.hidden = !hidden;
                namebtn.setAttribute('aria-expanded', String(!hidden));
                const icon = namebtn.querySelector('.expand_icon');
                if (icon) icon.style.transform = hidden ? 'rotate(180deg)' : '';
            }
            return;
        }

        if (!btn) return;
        const { action, id } = btn.dataset;

        if (action === 'email') {
            // Retrieve email/name from the row
            const row  = btn.closest('.contact_row');
            const emailEl = row?.querySelector('.contact_email');
            const nameEl  = row?.querySelector('.contact_name_btn');
            const email = emailEl?.textContent?.trim() ?? '';
            const name  = nameEl ? nameEl.childNodes[0]?.textContent?.trim() : '';
            openEmailCompose({ contact_id: id, to: email, name });
            return;
        }

        // Status progression: read | replied | follow_up
        const validStatuses = ['read', 'replied', 'follow_up'];
        if (validStatuses.includes(action)) {
            btn.disabled = true;
            try {
                const now = new Date().toISOString();
                const fields = { status: action };
                if (action === 'read')      fields.read_at      = now;
                if (action === 'replied')   fields.replied_at   = now;
                if (action === 'follow_up') fields.follow_up_at = now;
                await api.contacts.update(id, fields);
                showToast(`Marked as ${action.replace('_', ' ')}.`, 'success');
                await renderContacts();
            } catch (err) {
                showToast(err.message, 'error');
                btn.disabled = false;
            }
        }
    });
}
