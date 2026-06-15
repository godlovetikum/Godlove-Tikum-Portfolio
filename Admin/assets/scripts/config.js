/**
 *  assets/scripts/config.js
 *  Handles brand config tab on admin dashboard client
 */

import { api } from './api.js';
import { escHtml, showToast, setLoading } from './utils.js';

const ROOT = document.getElementById('configSection');

class Config {
    constructor() {
        this.rows = [];
    }

    async init() {
        await this.getAll();
    }

    async getAll() {
        if (!ROOT) return;
        setLoading(ROOT, true);
        try {
            const data  = await api.config.list();
            this.rows   = data.configs ?? [];
            ROOT.innerHTML = this._buildHTML(this.rows);
            this._bindEvents();
        } catch (err) {
            ROOT.innerHTML = `<p class="error_msg">${escHtml(err.message)}</p>`;
        } finally {
            setLoading(ROOT, false);
        }
    }

    _buildHTML(rows) {
        const addForm = `
        <div class="card" style="margin-bottom:1rem">
            <h3 class="card_title">Add Config Entry</h3>
            <div class="form_row">
                <input class="form_input" id="cfgNewKey"   type="text"   placeholder="key"   maxlength="120">
                <input class="form_input" id="cfgNewValue" type="text"   placeholder="value" maxlength="2000">
                <button class="btn btn_sm btn_primary" id="cfgAddBtn">Add</button>
            </div>
        </div>`;

        if (!rows.length) {
            return `
            <div class="section_topbar">
                <h2 class="section_heading">Brand Config</h2>
            </div>
            ${addForm}
            <p class="empty_msg">No config entries found.</p>`;
        }

        const tableRows = rows.map(r => `
        <tr data-key="${escHtml(r.key)}">
            <td class="ref_cell"><code>${escHtml(r.key)}</code></td>
            <td>
                <input class="form_input cfg_val_input"
                       data-key="${escHtml(r.key)}"
                       value="${escHtml(r.value ?? '')}"
                       maxlength="2000">
            </td>
            <td class="date_cell text_muted" style="font-size:0.76rem">${escHtml((r.updated_at ?? r.created_at ?? '').slice(0, 10))}</td>
            <td>
                <div class="action_btns">
                    <button class="btn btn_xs btn_primary cfg_save_btn" data-key="${escHtml(r.key)}">Save</button>
                    <button class="btn btn_xs btn_ghost  cfg_del_btn"  data-key="${escHtml(r.key)}">Delete</button>
                </div>
            </td>
        </tr>`).join('');

        return `
        <div class="section_topbar">
            <h2 class="section_heading">Brand Config</h2>
            <p class="section_sub text_muted">Manage key-value configuration entries for the site.</p>
        </div>
        ${addForm}
        <div class="table_wrap">
            <table class="data_table config_table">
                <thead>
                    <tr>
                        <th>Key</th>
                        <th>Value</th>
                        <th>Updated</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>`;
    }

    _bindEvents() {
        if (!ROOT) return;

        // Add new entry
        ROOT.querySelector('#cfgAddBtn')?.addEventListener('click', async () => {
            const keyEl = ROOT.querySelector('#cfgNewKey');
            const valEl = ROOT.querySelector('#cfgNewValue');
            const key   = keyEl?.value?.trim();
            const value = valEl?.value?.trim();
            if (!key || value === undefined) {
                showToast('Key and value are required.', 'error');
                return;
            }
            try {
                await api.config.create({ key, value });
                showToast(`Config "${key}" created.`, 'success');
                await this.getAll();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });

        // Save (update) existing entry
        ROOT.addEventListener('click', async (e) => {
            const saveBtn = e.target.closest('.cfg_save_btn');
            if (saveBtn) {
                const key    = saveBtn.dataset.key;
                const input  = ROOT.querySelector(`.cfg_val_input[data-key="${CSS.escape(key)}"]`);
                const value  = input?.value ?? '';
                saveBtn.disabled = true;
                try {
                    await api.config.update({ key, value });
                    showToast(`Config "${key}" updated.`, 'success');
                    await this.getAll();
                } catch (err) {
                    showToast(err.message, 'error');
                    saveBtn.disabled = false;
                }
                return;
            }

            const delBtn = e.target.closest('.cfg_del_btn');
            if (delBtn) {
                const key = delBtn.dataset.key;
                if (!confirm(`Delete config key "${key}"?`)) return;
                delBtn.disabled = true;
                try {
                    await api.config.delete({ key });
                    showToast(`Config "${key}" deleted.`, 'success');
                    await this.getAll();
                } catch (err) {
                    showToast(err.message, 'error');
                    delBtn.disabled = false;
                }
            }
        });
    }
}

export const config = new Config();
