'use strict';

/**
 * email.js — Email section: template management + compose/send + outbound history
 *
 * Three sub-views:
 *   Templates     — list all stored templates, click to edit subject/html_body inline
 *                   CodeMirror 5 is used for the HTML editor (syntax highlighting,
 *                   line numbers, auto-close tags). Falls back to plain textarea if
 *                   CodeMirror is not loaded from CDN.
 *   Compose       — send a custom or retry email tied to a specific contact
 *   Outbound      — paginated history of all outbound_emails with retry support
 */

import { api }                                                   from './api.js';
import { escHtml, showToast, setLoading, fmtDate, fmtNum }      from './utils.js';

const ROOT    = document.getElementById('emailSection');
const OUTROOT = document.getElementById('outboundSection');
const MODAL   = document.getElementById('composeModal');
const OVERLAY = document.getElementById('modalOverlay');


// ── Template cache ─────────────────────────────────────────────────────────────

/**
 * Module-level cache — populated once on init, reused for the lifetime of the page.
 * Key: `${category}/${email_type}`, Value: { subject, html_body }
 * Reset to null when a template is saved via the template editor.
 */
let _templateCache = null;

async function _loadTemplates() {
    if (_templateCache) return _templateCache;
    try {
        const data = await api.email.listTemplates();
        const list = data.templates ?? [];
        _templateCache = new Map(
            list.map(t => [`${t.category}/${t.type}`, t])
        );
    } catch {
        _templateCache = new Map();
    }
    return _templateCache;
}

// Preload on module init — templates rarely change, so one fetch is enough
_loadTemplates();

// ── CodeMirror helpers ────────────────────────────────────────────────────────

/** Map of element id → CodeMirror instance */
const _cmEditors = new Map();

const CM_OPTIONS = {
    mode:           'htmlmixed',
    theme:          'dracula',
    lineNumbers:    true,
    lineWrapping:   false,
    styleActiveLine: true,
    indentWithTabs: false,
    tabSize:        2,
    matchBrackets:  true,
    autoCloseTags:  true,
};

/**
 * Replace a <textarea> with a CodeMirror editor.
 * Returns the CM instance, or null if CodeMirror is not loaded.
 * Stores the instance in _cmEditors keyed by the textarea's id.
 */
function _initCM(textareaId) {
    if (typeof window.CodeMirror === 'undefined') return null;
    const ta = document.getElementById(textareaId);
    if (!ta || _cmEditors.has(textareaId)) return _cmEditors.get(textareaId) ?? null;

    const cm = window.CodeMirror.fromTextArea(ta, CM_OPTIONS);
    cm.setSize('100%', '340px');
    _cmEditors.set(textareaId, cm);
    return cm;
}

/** Get the current value from a CM instance or fall back to the textarea. */
function _getCMValue(textareaId) {
    const cm = _cmEditors.get(textareaId);
    if (cm) return cm.getValue();
    return document.getElementById(textareaId)?.value ?? '';
}

/** Destroy a CM instance (e.g. when modal closes). */
function _destroyCM(textareaId) {
    const cm = _cmEditors.get(textareaId);
    if (cm) { cm.toTextArea(); _cmEditors.delete(textareaId); }
}


// ── Templates view ────────────────────────────────────────────────────────────

export async function renderEmailTemplates() {
    if (!ROOT) return;
    _cmEditors.clear();
    setLoading(ROOT, true);
    try {
        const data      = await api.email.listTemplates();
        const templates = data.templates ?? [];
        ROOT.innerHTML  = buildTemplatesHTML(templates);
        _bindTemplateEvents();
    } catch (err) {
        ROOT.innerHTML = `<p class="error_msg">${escHtml(err.message)}</p>`;
    } finally {
        setLoading(ROOT, false);
    }
}

function buildTemplatesHTML(templates) {
    if (!templates.length) return '<p class="empty_msg">No templates found.</p>';

    const cards = templates.map(t => `
    <div class="template_card" data-id="${escHtml(t.id)}">
        <div class="template_header">
            <div>
                <span class="category_tag">${escHtml(t.category)}</span>
                <span class="type_badge type_${escHtml(t.type)}">${escHtml(t.type)}</span>
            </div>
            <button class="btn btn_sm btn_ghost edit_template_btn" data-id="${escHtml(t.id)}">
                <i class="fa-solid fa-pen" aria-hidden="true"></i> Edit
            </button>
        </div>
        <p class="template_subject"><strong>Subject:</strong> ${escHtml(t.subject)}</p>
        <p class="template_updated text_muted">Last updated: ${escHtml(t.updated_at?.slice(0, 10) ?? '—')}</p>

        <div class="template_editor" id="editor_${escHtml(t.id)}" hidden>
            <label class="form_label" for="subj_${escHtml(t.id)}">Subject</label>
            <input  class="form_input" id="subj_${escHtml(t.id)}" type="text" value="${escHtml(t.subject)}" maxlength="200">

            <div class="editor_tabs" id="editorTabs_${escHtml(t.id)}" style="margin-top:0.75rem">
                <button class="editor_tab active" data-tab="html">HTML</button>
                <button class="editor_tab"         data-tab="preview">Preview</button>
            </div>

            <div id="cm_wrap_${escHtml(t.id)}" class="cm_wrap">
                <textarea class="form_textarea code_textarea" id="body_${escHtml(t.id)}" rows="18">${escHtml(t.html_body)}</textarea>
            </div>
            <div class="html_preview" id="preview_${escHtml(t.id)}" hidden></div>

            <div class="editor_actions">
                <button class="btn btn_sm btn_ghost copy_html_btn" data-id="${escHtml(t.id)}"
                        title="Copy HTML to clipboard">
                    <i class="fa-solid fa-copy" aria-hidden="true"></i> Copy HTML
                </button>
                <button class="btn btn_sm btn_ghost cancel_edit_btn" data-id="${escHtml(t.id)}">Cancel</button>
                <button class="btn btn_sm btn_primary save_template_btn" data-id="${escHtml(t.id)}">Save changes</button>
            </div>
        </div>
    </div>`).join('');

    return `
    <div class="section_topbar">
        <h2 class="section_heading">Email Templates</h2>
        <p class="section_sub text_muted">Edit stored templates. Changes take effect on the next email send.</p>
    </div>
    <div class="templates_grid">${cards}</div>`;
}

function _bindTemplateEvents() {
    ROOT.addEventListener('click', async (e) => {

        // Edit toggle — open editor + init CodeMirror
        const editBtn = e.target.closest('.edit_template_btn');
        if (editBtn) {
            const id     = editBtn.dataset.id;
            const editor = document.getElementById(`editor_${id}`);
            if (!editor) return;
            const opening = editor.hidden;
            editor.hidden = !opening;
            if (opening) {
                // Init CM after the panel is visible
                requestAnimationFrame(() => _initCM(`body_${id}`));
            }
            return;
        }

        // Cancel
        const cancelBtn = e.target.closest('.cancel_edit_btn');
        if (cancelBtn) {
            const id     = cancelBtn.dataset.id;
            const editor = document.getElementById(`editor_${id}`);
            if (editor) editor.hidden = true;
            _destroyCM(`body_${id}`);
            return;
        }

        // Copy HTML
        const copyBtn = e.target.closest('.copy_html_btn');
        if (copyBtn) {
            const html = _getCMValue(`body_${copyBtn.dataset.id}`);
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(html);
                showToast('HTML copied to clipboard.', 'success');
            }
            return;
        }

        // HTML ↔ Preview tab
        const tab = e.target.closest('.editor_tab');
        if (tab) {
            const wrap    = tab.closest('.editor_tabs');
            const id      = wrap.id.replace('editorTabs_', '');
            const tabName = tab.dataset.tab;

            wrap.querySelectorAll('.editor_tab').forEach(t => t.classList.toggle('active', t === tab));

            const cmWrap  = document.getElementById(`cm_wrap_${id}`);
            const preview = document.getElementById(`preview_${id}`);

            if (tabName === 'preview' && preview) {
                preview.innerHTML = _getCMValue(`body_${id}`); // raw — admin-only
                if (cmWrap) cmWrap.hidden = true;
                preview.hidden = false;
            } else if (cmWrap && preview) {
                cmWrap.hidden  = false;
                preview.hidden = true;
                // Refresh CM layout after becoming visible
                const cm = _cmEditors.get(`body_${id}`);
                if (cm) requestAnimationFrame(() => cm.refresh());
            }
            return;
        }

        // Save
        const saveBtn = e.target.closest('.save_template_btn');
        if (saveBtn) {
            const id       = saveBtn.dataset.id;
            const subject  = document.getElementById(`subj_${id}`)?.value?.trim();
            const htmlBody = _getCMValue(`body_${id}`).trim();

            if (!subject || !htmlBody) {
                showToast('Subject and body cannot be empty.', 'error');
                return;
            }

            saveBtn.disabled    = true;
            saveBtn.textContent = 'Saving…';
            try {
                await api.email.updateTemplate(id, { subject, html_body: htmlBody });
                // Invalidate cache so next compose open fetches the updated template
                _templateCache = null;
                showToast('Template saved.', 'success');
                await renderEmailTemplates();
            } catch (err) {
                showToast(err.message, 'error');
                saveBtn.disabled    = false;
                saveBtn.textContent = 'Save changes';
            }
        }
    });
}


// ── Outbound email history ────────────────────────────────────────────────────

let _outState = {
    page:       1,
    limit:      20,
    status:     '',
    email_type: '',
    total:      0,
    rows:       [],
};

export async function renderOutboundHistory(params = {}) {
    if (!OUTROOT) return;
    _outState = { ..._outState, ...params, page: params.page ?? 1 };
    setLoading(OUTROOT, true);

    try {
        const data = await api.email.listOutbound({
            page:       _outState.page,
            limit:      _outState.limit,
            status:     _outState.status     || undefined,
            email_type: _outState.email_type || undefined,
        });
        _outState.rows  = data.emails ?? [];
        _outState.total = data.total  ?? 0;
        OUTROOT.innerHTML = buildOutboundHTML(_outState.rows, _outState.total);
        _bindOutboundEvents();
    } catch (err) {
        OUTROOT.innerHTML = `<p class="error_msg">${escHtml(err.message)}</p>`;
    } finally {
        setLoading(OUTROOT, false);
    }
}

function buildOutboundHTML(rows, total) {
    const filters   = buildOutboundFilters();
    const summary   = `<p class="list_summary">${fmtNum(total)} email${total !== 1 ? 's' : ''} sent</p>`;

    if (!rows.length) {
        return `${filters}<div class="list_header">${summary}</div><p class="empty_msg">No outbound emails match the current filters.</p>`;
    }

    const tableRows  = rows.map(buildOutboundRow).join('');
    const pagination = buildOutboundPagination(total, _outState.page, _outState.limit);

    return `
    ${filters}
    <div class="list_header">${summary}</div>
    <div class="table_wrap">
        <table class="data_table outbound_table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>To</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Subject</th>
                    <th>Retries</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
        </table>
    </div>
    ${pagination}`;
}

function buildOutboundRow(e) {
    const statusCls = {
        sent:    'badge_ok',
        failed:  'badge_err',
        pending: 'badge_warn',
    }[e.status] ?? 'badge_warn';

    const retryBtn = (e.status === 'failed' && e.contact_id)
        ? `<button class="btn btn_xs btn_ghost" data-outaction="retry"
               data-contact-id="${escHtml(e.contact_id)}"
               data-email-type="${escHtml(e.email_type)}">Retry</button>`
        : '';

    const previewBtn = `<button class="btn btn_xs btn_ghost" data-outaction="preview"
           data-id="${escHtml(e.id)}">Preview</button>`;

    return `
    <tr class="outbound_row" data-id="${escHtml(e.id)}">
        <td class="date_cell">${fmtDate(e.created_at)}</td>
        <td class="ref_cell">${escHtml(e.recipient ?? '—')}</td>
        <td><span class="category_tag">${escHtml(e.email_type ?? '—')}</span></td>
        <td><span class="badge ${statusCls}">${escHtml(e.status ?? '—')}</span></td>
        <td class="ref_cell">${escHtml(e.subject ?? '—')}</td>
        <td class="num_cell">${e.retry_count ?? 0}</td>
        <td>
            <div class="action_btns">
                ${previewBtn}
                ${retryBtn}
            </div>
        </td>
    </tr>
    <tr class="outbound_preview_row" id="outprev_${escHtml(e.id)}" hidden>
        <td colspan="7">
            <div class="outbound_preview_panel">
                <div class="html_preview">${e.html_body ?? '<em class="text_muted">No HTML body stored.</em>'}</div>
                ${e.text_body ? `<pre class="outbound_text_body">${escHtml(e.text_body)}</pre>` : ''}
                ${e.error_message ? `<p class="error_msg" style="margin-top:0.5rem"><strong>Error:</strong> ${escHtml(e.error_message)}</p>` : ''}
            </div>
        </td>
    </tr>`;
}

function buildOutboundFilters() {
    return `
    <div class="filters_bar">
        <select class="filter_select" id="outFilterStatus">
            <option value="">All statuses</option>
            <option value="sent"    ${_outState.status === 'sent'    ? 'selected' : ''}>Sent</option>
            <option value="failed"  ${_outState.status === 'failed'  ? 'selected' : ''}>Failed</option>
            <option value="pending" ${_outState.status === 'pending' ? 'selected' : ''}>Pending</option>
        </select>
        <select class="filter_select" id="outFilterType">
            <option value="">All types</option>
            <option value="notification"    ${_outState.email_type === 'notification'    ? 'selected' : ''}>Notification</option>
            <option value="acknowledgement" ${_outState.email_type === 'acknowledgement' ? 'selected' : ''}>Acknowledgement</option>
            <option value="reply"           ${_outState.email_type === 'reply'           ? 'selected' : ''}>Reply</option>
            <option value="follow_up"       ${_outState.email_type === 'follow_up'       ? 'selected' : ''}>Follow-up</option>
            <option value="standalone"      ${_outState.email_type === 'standalone'      ? 'selected' : ''}>Standalone</option>
        </select>
        <button class="btn btn_sm btn_ghost" id="applyOutFiltersBtn">Apply</button>
        <button class="btn btn_sm btn_ghost" id="clearOutFiltersBtn">Clear</button>
    </div>`;
}

function buildOutboundPagination(total, page, limit) {
    const pages = Math.ceil(total / limit);
    if (pages <= 1) return '';
    const prev = page > 1     ? `<button class="btn btn_sm btn_ghost" id="outPrevBtn">← Prev</button>` : '';
    const next = page < pages ? `<button class="btn btn_sm btn_ghost" id="outNextBtn">Next →</button>` : '';
    return `<div class="pagination">${prev}<span class="page_info">Page ${page} of ${pages}</span>${next}</div>`;
}

function _bindOutboundEvents() {
    OUTROOT.querySelector('#applyOutFiltersBtn')?.addEventListener('click', () => {
        renderOutboundHistory({
            status:     OUTROOT.querySelector('#outFilterStatus')?.value ?? '',
            email_type: OUTROOT.querySelector('#outFilterType')?.value   ?? '',
            page: 1,
        });
    });
    OUTROOT.querySelector('#clearOutFiltersBtn')?.addEventListener('click', () => {
        renderOutboundHistory({ status: '', email_type: '', page: 1 });
    });
    OUTROOT.querySelector('#outPrevBtn')?.addEventListener('click', () =>
        renderOutboundHistory({ page: _outState.page - 1 }));
    OUTROOT.querySelector('#outNextBtn')?.addEventListener('click', () =>
        renderOutboundHistory({ page: _outState.page + 1 }));

    OUTROOT.querySelector('.outbound_table')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-outaction]');
        if (!btn) return;
        const { outaction } = btn.dataset;

        if (outaction === 'preview') {
            const id  = btn.dataset.id;
            const row = document.getElementById(`outprev_${id}`);
            if (row) row.hidden = !row.hidden;
            return;
        }

        if (outaction === 'retry') {
            btn.disabled    = true;
            btn.textContent = 'Retrying…';
            try {
                await api.email.retryOutbound({
                    contact_id: btn.dataset.contactId,
                    email_type: btn.dataset.emailType,
                });
                showToast('Retry queued.', 'success');
                await renderOutboundHistory();
            } catch (err) {
                showToast(err.message, 'error');
                btn.disabled    = false;
                btn.textContent = 'Retry';
            }
        }
    });
}


// ── Compose modal ─────────────────────────────────────────────────────────────

export function openEmailCompose({ contact_id, to, name, category } = {}) {
    if (!MODAL || !OVERLAY) return;

    // Destroy any previous compose CM instance
    _destroyCM('composeBody');

    MODAL.innerHTML = buildComposeHTML({ contact_id, to, name, category });
    MODAL.hidden    = false;
    OVERLAY.hidden  = false;

    // Init CodeMirror on the compose textarea
    requestAnimationFrame(() => _initCM('composeBody'));

    MODAL.querySelector('#composeSubject')?.focus();
    _bindComposeEvents({ contact_id, category });

    // Populate template selector (standalone) or pre-load template (contact-linked)
    _initComposeTemplates({ contact_id, category });
}

async function _initComposeTemplates({ contact_id, category }) {
    const cache = await _loadTemplates();

    if (!contact_id) {
        // Standalone compose: populate template selector with all cached templates
        const sel = MODAL.querySelector('#composeTemplateSelect');
        if (!sel) return;
        for (const [key, t] of cache.entries()) {
            const opt = document.createElement('option');
            opt.value       = key;
            opt.textContent = `${t.category} / ${t.email_type}`;
            sel.appendChild(opt);
        }
    } else {
        // Contact-linked: if a typed composeType is already set, pre-load its template
        const typeEl = MODAL.querySelector('#composeType');
        if (typeEl) _applyTemplateForType(typeEl.value, category, cache);
    }
}

function _applyTemplateForType(type, category, cache) {
    if (!['reply', 'follow_up'].includes(type)) return;
    const key = `${category ?? 'general'}/${type}`;
    const tpl = cache.get(key);
    if (!tpl) return;

    const subjectEl = MODAL.querySelector('#composeSubject');
    if (subjectEl && !subjectEl.value) subjectEl.value = tpl.subject ?? '';

    const cm = _cmEditors.get('composeBody');
    const ta = document.getElementById('composeBody');
    const currentVal = cm ? cm.getValue() : (ta?.value ?? '');
    if (!currentVal) {
        if (cm) cm.setValue(tpl.html_body ?? '');
        else if (ta) ta.value = tpl.html_body ?? '';
    }
}

function closeCompose() {
    _destroyCM('composeBody');
    if (MODAL)   { MODAL.hidden = true;   MODAL.innerHTML = ''; }
    if (OVERLAY) { OVERLAY.hidden = true; }
}

function buildComposeHTML({ contact_id, to, name, category } = {}) {
    const recipientRow = contact_id
        ? `<p class="compose_recipient">To: <strong>${escHtml(to ?? '')}</strong> (${escHtml(name ?? '')})</p>`
        : `<div class="form_group">
               <label class="form_label" for="composeTo">Recipient email</label>
               <input class="form_input" id="composeTo" type="email" placeholder="name@example.com">
           </div>`;

    const typeRow = contact_id ? `
    <div class="form_group">
        <label class="form_label" for="composeType">Send type</label>
        <select class="form_select" id="composeType">
            <option value="both">Both (notification + acknowledgement)</option>
            <option value="acknowledgement">Acknowledgement to visitor only</option>
            <option value="notification">Notification to admin only</option>
            <option value="reply">Reply to contact</option>
            <option value="follow_up">Follow-up to contact</option>
        </select>
    </div>
    <div class="compose_hint text_muted" id="composeTemplateHint">
        Selecting <em>reply</em> or <em>follow_up</em> loads the stored template into the editor — edit freely before sending.
    </div>` : `
    <div class="form_group">
        <label class="form_label" for="composeTemplateSelect">Start from a template
            <span class="text_muted">(optional)</span>
        </label>
        <select class="form_select" id="composeTemplateSelect">
            <option value="">— blank / custom —</option>
        </select>
    </div>`;

    return `
    <div class="modal_header">
        <h3 class="modal_title">Compose Email</h3>
        <button class="modal_close_btn" id="closeComposeBtn" aria-label="Close">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
    </div>
    <div class="modal_body">
        ${recipientRow}
        ${typeRow}
        <div class="form_group">
            <label class="form_label" for="composeSubject">Subject</label>
            <input class="form_input" id="composeSubject" type="text" placeholder="Re: Your enquiry" maxlength="200">
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.35rem">
            <div class="editor_tabs" id="composeTabs" style="border-bottom:none;margin:0">
                <button class="editor_tab active" data-tab="html">HTML</button>
                <button class="editor_tab"         data-tab="preview">Preview</button>
            </div>
            <button class="btn btn_xs btn_ghost" id="copyComposeHtmlBtn" title="Copy HTML to clipboard">
                <i class="fa-solid fa-copy"></i> Copy
            </button>
        </div>
        <div id="cm_compose_wrap" class="cm_wrap">
            <textarea class="form_textarea code_textarea" id="composeBody" rows="14"
                      placeholder="HTML body — leave empty to use stored template as-is…"></textarea>
        </div>
        <div class="html_preview" id="composePreview" hidden></div>
    </div>
    <div class="modal_footer">
        <button class="btn btn_ghost" id="cancelComposeBtn">Cancel</button>
        <button class="btn btn_primary" id="sendEmailBtn">
            <i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Send
        </button>
    </div>`;
}

function _bindComposeEvents({ contact_id, category }) {
    MODAL.querySelector('#closeComposeBtn')?.addEventListener('click',  closeCompose);
    MODAL.querySelector('#cancelComposeBtn')?.addEventListener('click', closeCompose);
    OVERLAY.addEventListener('click', closeCompose, { once: true });

    // Standalone compose: template selector populates subject + body
    MODAL.querySelector('#composeTemplateSelect')?.addEventListener('change', async (e) => {
        const key = e.target.value;
        if (!key) return;
        const cache = await _loadTemplates();
        const tpl   = cache.get(key);
        if (!tpl) return;
        const subjectEl = MODAL.querySelector('#composeSubject');
        if (subjectEl) subjectEl.value = tpl.subject ?? '';
        const cm = _cmEditors.get('composeBody');
        const ta = document.getElementById('composeBody');
        if (cm) cm.setValue(tpl.html_body ?? '');
        else if (ta) ta.value = tpl.html_body ?? '';
    });

    // Contact-linked compose: changing type to reply/follow_up loads template
    MODAL.querySelector('#composeType')?.addEventListener('change', async (e) => {
        const cache = await _loadTemplates();
        _applyTemplateForType(e.target.value, category, cache);
    });

    // Copy HTML
    MODAL.querySelector('#copyComposeHtmlBtn')?.addEventListener('click', async () => {
        const html = _getCMValue('composeBody');
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(html);
            showToast('HTML copied.', 'success');
        }
    });

    // HTML ↔ Preview
    MODAL.querySelector('#composeTabs')?.addEventListener('click', (e) => {
        const tab = e.target.closest('.editor_tab');
        if (!tab) return;
        MODAL.querySelectorAll('#composeTabs .editor_tab').forEach(t => t.classList.toggle('active', t === tab));
        const cmWrap = MODAL.querySelector('#cm_compose_wrap');
        const prev   = MODAL.querySelector('#composePreview');
        if (tab.dataset.tab === 'preview' && prev) {
            prev.innerHTML = _getCMValue('composeBody');
            if (cmWrap) cmWrap.hidden = true;
            prev.hidden = false;
        } else if (cmWrap && prev) {
            cmWrap.hidden = false;
            prev.hidden   = true;
            const cm = _cmEditors.get('composeBody');
            if (cm) requestAnimationFrame(() => cm.refresh());
        }
    });

    MODAL.querySelector('#sendEmailBtn')?.addEventListener('click', async () => {
        const sendBtn = MODAL.querySelector('#sendEmailBtn');
        const subject = MODAL.querySelector('#composeSubject')?.value?.trim();
        const body    = _getCMValue('composeBody').trim();
        const type    = MODAL.querySelector('#composeType')?.value ?? 'standalone';
        const to      = MODAL.querySelector('#composeTo')?.value?.trim();

        if (!contact_id && !to) {
            showToast('Recipient email is required.', 'error');
            return;
        }

        const payload = contact_id
            ? { contact_id, type, ...(subject && { subject }), ...(body && { html_body: body }) }
            : { type: 'standalone', to, subject, html_body: body };

        if (!contact_id && (!subject || !body)) {
            showToast('Subject and body are required for standalone emails.', 'error');
            return;
        }

        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…';
        try {
            await api.email.send(payload);
            showToast('Email sent successfully.', 'success');
            closeCompose();
        } catch (err) {
            showToast(err.message, 'error');
            sendBtn.disabled  = false;
            sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send';
        }
    });
}
