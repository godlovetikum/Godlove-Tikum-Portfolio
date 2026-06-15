/**
 * email.js — Portfolio Google Apps Script
 *
 * Single file. Three responsibilities:
 *
 *   1. doPost(event)
 *      Receives email send requests from the Supabase email Edge Function.
 *      Authenticates every request via the GAS_API_KEY Script Property.
 *      Accepts both html_body and text_body; uses html_body when present.
 *      Sender display name comes from payload.sender_name if provided,
 *      falling back to the SENDER_NAME Script Property.
 *      Logs to EMAIL_SHEET light data for audit 
 *      Returns the standard { success, data, error } response shape on every path.
 *
 *   2. pingSupabase()
 *      Called by a time-based trigger every X days.
 *      GETs the ping Edge Function with the Authorization header.
 *      Logs one row to the KeepAlive sheet in the configured spreadsheet.
 *      Sends a failure alert email to NOTIFY_EMAIL if the ping fails.
 *      Uses LockService to prevent concurrent writes to the spreadsheet.
 *
 *   3. Trigger management utilities
 *      installTrigger()  — register the X-day schedule (run once manually)
 *      removeTrigger()   — remove the existing trigger (idempotent)
 *      triggerStatus()   — log whether the trigger is currently installed
 *
 * ─── SETUP ────────────────────────────────────────────────────────────────────
 * 1. Open script.google.com → New project → paste this file
 * 2. Project Settings → Script Properties → Add property (all six required):
 *      NOTIFY_EMAIL      — receives alert emails and failure notifications
 *      SENDER_NAME       — fallback display name for outbound emails
 *      GAS_API_KEY       — must match GAS_API_KEY env in Supabase 
 *      KEEP_ALIVE_URL    — https://<ref>.supabase.co/functions/v1/ping
 *      KEEP_ALIVE_SECRET — must match KEEP_ALIVE_SECRET env in Supabase
 *      SPREADSHEET_ID    — ID of the Google Sheet for ping logs
 * 3. Deploy → New deployment → Web App
 *      Execute as:     Me
 *      Who has access: Anyone
 *    Copy the URL → update GAS_EMAIL_URL env in Supabase
 * 4. Run installTrigger() once from the editor to register the ping schedule
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';


// ══════════════════════════════════════════════════════════════════════════════
// CONFIG LOADER
// Reads all Script Properties once per execution via a lazy singleton.
// Avoids repeated PropertiesService calls across warm invocations.
// ══════════════════════════════════════════════════════════════════════════════

let _config = null;

/**
 * Returns the full config object, loading it once per execution.
 * All functions call getConfig() instead of reading globals directly.
 * @returns {{ notifyEmail: string, senderName: string, gasApiKey: string,
 *             keepAliveUrl: string, keepAliveSecret: string, spreadsheetId: string }}
 */
function getConfig() {
    if (_config) return _config;

    const props = PropertiesService.getScriptProperties().getProperties();

    _config = {
        notifyEmail:     props['NOTIFY_EMAIL']       || '',
        senderName:      props['SENDER_NAME']         || '',
        gasApiKey:       props['GAS_API_KEY']         || '',
        keepAliveUrl:    props['KEEP_ALIVE_URL']      || '',
        keepAliveSecret: props['KEEP_ALIVE_SECRET']   || '',
        spreadsheetId:   props['SPREADSHEET_ID']      || '',
    };

    return _config;
}


// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const KEEP_ALIVE_SHEET   = 'KeepAlive';
const PING_INTERVAL_DAYS = 3;
const EMAIL_TYPES = ['notification', 'acknowledgement', 'standalone', 'reply', 'follow_up'];
const EMAIL_SHEET = 'EmailLogs'

// ══════════════════════════════════════════════════════════════════════════════
// 1. EMAIL HANDLER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * doPost — entry point for all POST requests from the send-email Edge Function.
 *
 * Accepted payload shape:
 *   {
 *     api_key:     "secret",                    ← required, must match GAS_API_KEY
 *     caller:      "trigger" | "manual",
 *     type:        "notification" | "acknowledgement" | "standalone" | "reply" | "follow_up"
 *     to:          "recipient@email.com",
 *     subject:     "Resolved subject line",
 *     html_body:   "Complete rendered HTML",    optional — used when present
 *     text_body:   "Plain-text fallback",        optional — used when html_body absent
 *     sender_name: "Display name",               optional — falls back to SENDER_NAME
 *     reply_to:    "replyto@email.com",
 *   }
 *
 * @param {GoogleAppsScript.Events.DoPost} event
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doPost(event) {
    const cfg = getConfig();

    // ── Parse body ────────────────────────────────────────────────
    let payload;
    try {
        payload = JSON.parse(event.postData.contents);
    } catch (parseErr) {
        return buildResponse(false, null,
            'validation.invalid_input',
            'Request body could not be parsed as JSON.'
        );
    }

    // ── API key authentication ────────────────────────────────────
    // Validates that the caller is the Supabase send-email function.
    // Prevents this endpoint being used as an open email relay.
    if (!cfg.gasApiKey) {
        Logger.log('[doPost] GAS_API_KEY is not set in Script Properties.');
        return buildResponse(false, null,
            'server.configuration_error',
            'Email service configuration is incomplete.'
        );
    }

    const receivedKey = payload.api_key ? String(payload.api_key).trim() : '';
    if (!receivedKey || receivedKey !== cfg.gasApiKey) {
        Logger.log('[doPost] Rejected — invalid or missing api_key.');
        return buildResponse(false, null,
            'auth.unauthorized',
            "You don't have permission to make this request."
        );//
    }

    // ── Extract and validate fields ───────────────────────────────
    const type       = String(payload.email_type        || '').trim();
    const to         = String(payload.recipient          || '').trim();
    const subject    = String(payload.subject     || '').trim();
    const htmlBody   = payload.html_body  ? String(payload.html_body)  : '';
    const textBody   = payload.text_body  ? String(payload.text_body)  : '';
    const senderName = payload.sender_name ? String(payload.sender_name) : cfg.senderName;
    const replyTo    = payload.reply_to   ? String(payload.reply_to)   : cfg.notifyEmail;

    if (!type) {
        return buildResponse(false, null, 'validation.missing_field', 'The "email type" field is required.');
    }
    if (!to) {
        return buildResponse(false, null, 'validation.missing_field', 'The "recipient" field is required.');
    }
    if (!subject) {
        return buildResponse(false, null, 'validation.missing_field', 'The "subject" field is required.');
    }
    if (!htmlBody && !textBody) {
        return buildResponse(false, null,
            'validation.missing_email_body',
            'At least one of html or text body is required.'
        );
    }
    if (!EMAIL_TYPES.includes(type)) {
        return buildResponse(false, null,
            'validation.invalid_email_type',
            `The "email type" field must be one of: ${EMAIL_TYPES.join(', ')}.`
        );
    }
    // log email record to spreadsheet 
    try {
        const timestamp = new Date().toISOString();
        const notes = 'pre-send';
        logEmailResult(cfg, timestamp, to, type, stripHtml(htmlBody ?? textBody), notes)
    } catch { /* ignore */ }

    // ── Send email ────────────────────────────────────────────────
    try {
        const options = { name: senderName, replyTo: replyTo };

        if (htmlBody) {
            options.htmlBody = htmlBody;
        }

        // text_body is the canonical plain-text version.
        // Only fall back to regex-stripping when none was provided.
        const plainText = textBody || stripHtml(htmlBody);

        GmailApp.sendEmail(to, subject, plainText, options);

        return buildResponse(true, {
            message:    'Email sent successfully.',
            email_type: type,
            recipient: to
        }, null, null);

    } catch (sendErr) {
        let errorCode = 'email.send_failed';
        if (type === 'notification')    errorCode = 'email.notification_failed';
        if (type === 'acknowledgement') errorCode = 'email.acknowledgement_failed';

        Logger.log(`[doPost] Email send failed. type=${type} contact_id=${payload.contact_id || 'none'} error=${sendErr.message}`);

        return buildResponse(false, null, errorCode,
            `The email could not be sent. GmailApp returned: ${sendErr.message}`
        );
    }
}


/**
 * doGet — health check endpoint.
 * Visiting the deployment URL in a browser confirms the script is live.
 * Returns a plain-text response with no sensitive information.
 */
function doGet() {
    return ContentService
        .createTextOutput('Email endpoint is live.')
        .setMimeType(ContentService.MimeType.TEXT);
}


// ══════════════════════════════════════════════════════════════════════════════
// 2. KEEP-ALIVE PING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * pingSupabase — called automatically by the time-based trigger every X days.
 *
 * Steps:
 *   1. Validate required config properties are present
 *   2. GET the keep-alive Edge Function with x-ping-secret header
 *   3. Parse the response and read contact status counts
 *   4. Acquire a script lock and append one row to the KeepAlive sheet
 *   5. If the ping failed, send a failure alert to NOTIFY_EMAIL
 */
function pingSupabase() {
    const cfg = getConfig();

    // ── Config guard ──────────────────────────────────────────────
    if (!cfg.keepAliveUrl) {
        Logger.log('[pingSupabase] KEEP_ALIVE_URL is not set in Script Properties. Aborting.');
        return;
    }
    if (!cfg.keepAliveSecret) {
        Logger.log('[pingSupabase] KEEP_ALIVE_SECRET is not set in Script Properties. Aborting.');
        return;
    }
    if (!cfg.spreadsheetId) {
        Logger.log('[pingSupabase] SPREADSHEET_ID is not set in Script Properties. Aborting.');
        return;
    }

    const timestamp = new Date().toISOString();
    let status    = 'failed';
    let total     = '-';
    let newCount  = '-';
    let readCount = '-';
    let replied   = '-';
    let notes     = '';

    // ── Fetch ─────────────────────────────────────────────────────
    try {
        const response = UrlFetchApp.fetch(cfg.keepAliveUrl, {
            method:             'GET',
            headers:            { 'Authorization': `Bearer ${cfg.keepAliveSecret}`},
            muteHttpExceptions: true,
        });

        const code = response.getResponseCode();
        const text = response.getContentText();

        if (code === 200) {
            const parsed = JSON.parse(text);

            if (parsed.success && parsed.data && parsed.data.contacts) {
                const c  = parsed.data.contacts;
                total     = c.total   !== undefined ? c.total   : '-';
                newCount  = c.new     !== undefined ? c.new     : '-';
                readCount = c.read    !== undefined ? c.read    : '-';
                replied   = c.replied !== undefined ? c.replied : '-';
                status    = 'success';
                notes     = 'Ping OK — project is active.';
            } else {
                status = 'unexpected_response';
                notes  = `HTTP 200 but response shape was unexpected: ${text.slice(0, 120)}`;
                sendPingFailureAlert(cfg, timestamp, notes);
            }
        } else {
            status = `http_error_${code}`;
            notes  = `HTTP ${code}: ${text.slice(0, 120)}`;
            Logger.log(`[pingSupabase] Non-200 response: ${notes}`);
            sendPingFailureAlert(cfg, timestamp, notes);
        }

    } catch (fetchErr) {
        status = 'network_error';
        notes  = fetchErr.message;
        Logger.log(`[pingSupabase] Network error: ${fetchErr.message}`);
        sendPingFailureAlert(cfg, timestamp, notes);
    }

    // ── Log to spreadsheet ────────────────────────────────────────
    logPingResult(cfg, timestamp, status, total, newCount, readCount, replied, notes);
}


// ── logPingResult ─────────────────────────────────────────────────────────────

/**
 * Appends one row to the KeepAlive sheet.
 * Creates the sheet with styled headers on first use.
 * Uses LockService to prevent concurrent writes corrupting the sheet.
 *
 * Columns: Timestamp | Status | Total Contacts | New | Read | Replied | Notes
 *
 * @param {object} cfg       Config from getConfig()
 * @param {string} timestamp ISO timestamp string
 * @param {string} status    Ping status label
 * @param {*}      total     Total contacts count or '-'
 * @param {*}      newCount  New contacts count or '-'
 * @param {*}      readCount Read contacts count or '-'
 * @param {*}      replied   Replied contacts count or '-'
 * @param {string} notes     Detail notes string
 */
function logPingResult(cfg, timestamp, status, total, newCount, readCount, replied, notes) {
    const lock = LockService.getScriptLock();

    try {
        // Wait up to 10 seconds for any concurrent execution to finish writing.
        // If we can't get the lock in time, log and bail rather than writing bad data.
        lock.waitLock(10000);
    } catch (lockErr) {
        Logger.log('[logPingResult] Could not acquire script lock — skipping write to avoid race condition.');
        return;
    }

    try {
        const spreadsheet = SpreadsheetApp.openById(cfg.spreadsheetId);
        let sheet         = spreadsheet.getSheetByName(KEEP_ALIVE_SHEET);

        if (!sheet) {
            sheet = spreadsheet.insertSheet(KEEP_ALIVE_SHEET);

            const headers     = ['Timestamp', 'Status', 'Total Contacts', 'New', 'Read', 'Replied', 'Notes'];
            const headerRange = sheet.getRange(1, 1, 1, headers.length);
            headerRange.setValues([headers]);
            headerRange.setFontWeight('bold');
            headerRange.setBackground('#07101F');
            headerRange.setFontColor('#0BDA8A');

            [200, 140, 120, 80, 80, 80, 360].forEach((w, i) => {
                sheet.setColumnWidth(i + 1, w);
            });

            sheet.setFrozenRows(1);
        }

        sheet.appendRow([timestamp, status, total, newCount, readCount, replied, notes]);

    } catch (sheetErr) {
        Logger.log(`[logPingResult] Could not write to spreadsheet: ${sheetErr.message}`);

        // Notify on spreadsheet failure — keep-alive logging is critical monitoring.
        // We don't want silent sheet failures to hide real Supabase outages.
        sendPingFailureAlert(cfg, timestamp,
            `Spreadsheet write failed: ${sheetErr.message}. Ping status was: ${status}`
        );

    } finally {
        lock.releaseLock();
    }
}


// ── sendPingFailureAlert ──────────────────────────────────────────────────────

/**
 * Sends a plain-text alert email to NOTIFY_EMAIL when a ping or log fails.
 *
 * @param {object} cfg       Config from getConfig()
 * @param {string} timestamp ISO timestamp of the failed ping
 * @param {string} detail    Error description
 */
function sendPingFailureAlert(cfg, timestamp, detail) {
    if (!cfg.notifyEmail) {
        Logger.log('[sendPingFailureAlert] NOTIFY_EMAIL not set — cannot send alert.');
        return;
    }

    try {
        const subject = `Supabase keep-alive ping failed — ${new Date().toDateString()}`;
        const body    = `
The scheduled keep-alive ping to the Supabase project could not complete.

Timestamp : ${timestamp}
Detail    : ${detail}

Likely causes:
  1. Supabase project is paused — review at https://supabase.com/dashboard/projects
  2. KEEP_ALIVE_URL is incorrect — check the GAS Script Property
  3. KEEP_ALIVE_SECRET does not match the Supabase secret

— Portfolio Keep-Alive GAS Script
 `.trim();

        GmailApp.sendEmail(cfg.notifyEmail, subject, body);

    } catch (mailErr) {
        Logger.log(`[sendPingFailureAlert] Could not send alert email: ${mailErr.message}`);
    }
}


// ══════════════════════════════════════════════════════════════════════════════
// 3. TRIGGER MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * installTrigger — registers the time-based ping trigger.
 * Run ONCE manually from the Apps Script editor.
 * Removes any existing pingSupabase trigger first to prevent duplicates.
 */
function installTrigger() {
    removeTrigger();

    ScriptApp.newTrigger('pingSupabase')
        .timeBased()
        .everyDays(PING_INTERVAL_DAYS)
        .create();

    Logger.log(`[installTrigger] Trigger installed. pingSupabase will run every ${PING_INTERVAL_DAYS} days.`);
}


/**
 * removeTrigger — deletes any existing pingSupabase trigger.
 * Safe to run multiple times — idempotent.
 */
function removeTrigger() {
    ScriptApp.getProjectTriggers().forEach(trigger => {
        if (trigger.getHandlerFunction() === 'pingSupabase') {
            ScriptApp.deleteTrigger(trigger);
            Logger.log('[removeTrigger] Removed existing pingSupabase trigger.');
        }
    });
}


/**
 * triggerStatus — logs whether the pingSupabase trigger is currently installed.
 * Run from the editor to check without making any changes.
 */
function triggerStatus() {
    const active = ScriptApp.getProjectTriggers()
        .some(t => t.getHandlerFunction() === 'pingSupabase');

    Logger.log(active
        ? '[triggerStatus] Trigger is ACTIVE — pingSupabase is registered.'
        : '[triggerStatus] Trigger is NOT installed. Run installTrigger() to set it up.'
    );
}


// ══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * buildResponse — returns the standard { success, data, error } JSON TextOutput.
 * Mirrors the universal response shape used by all Supabase Edge Functions.
 *
 * @param {boolean}      success
 * @param {object|null}  data     Populated when success is true.
 * @param {string|null}  code     Error code when success is false.
 * @param {string|null}  message  Error message when success is false.
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function buildResponse(success, data, code, message) {
    const body = {
        success,
        data:  success ? data : null,
        error: success ? null : { code, message },
    };

    return ContentService
        .createTextOutput(JSON.stringify(body))
        .setMimeType(ContentService.MimeType.JSON);
}


/**
 * stripHtml — strips HTML tags to produce a plain-text fallback.
 * Used only when no text_body is provided by the caller.
 * Note: regex-based stripping is intentionally simple here — the caller
 * (Supabase Edge Function) is trusted and the html_body is server-generated,
 * not user-supplied raw input.
 *
 * @param  {string} html
 * @returns {string}
 */
function stripHtml(html) {
    return String(html || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}


// ── logEmailResult ─────────────────────────────────────────────────────────────

/**
 * Appends one row to the email sheet.
 * Creates the sheet with styled headers on first use.
 * Uses LockService to prevent concurrent writes corrupting the sheet.
 *
 * Columns: Timestamp | Recipient | Type | Body | Notes
 *
 * @param {object} cfg       Config from getConfig()
 * @param {string} timestamp ISO timestamp string
 * @param {string} recipient Receiving email address 
 * @param {string} type      Email type being sent 
 * @param {string} body      Plain text of the email body
 * @param {string} notes     Any note (e.g failure reason) for review
 */
function logEmailResult(cfg, timestamp, status, recipient, type, body, notes) {
    const lock = LockService.getScriptLock();

    try {
        // Wait up to 10 seconds for any concurrent execution to finish writing.
        // If we can't get the lock in time, log and bail rather than writing bad data.
        lock.waitLock(10000);
    } catch (lockErr) {
        Logger.log('[logEmailResult] Could not acquire script lock — skipping write to avoid race condition.');
        return;
    }

    try {
        const spreadsheet = SpreadsheetApp.openById(cfg.spreadsheetId);
        let sheet         = spreadsheet.getSheetByName(EMAIL_SHEET);

        if (!sheet) {
            sheet = spreadsheet.insertSheet(EMAIL_SHEET);

            const headers     = ['Timestamp', 'Recipient', 'Type', 'Body', 'Notes'];
            const headerRange = sheet.getRange(1, 1, 1, headers.length);
            headerRange.setValues([headers]);
            headerRange.setFontWeight('bold');
            headerRange.setBackground('#07101F');
            headerRange.setFontColor('#0BDA8A');

            [200, 120, 120, 360, 360].forEach((w, i) => {
                sheet.setColumnWidth(i + 1, w);
            });

            sheet.setFrozenRows(1);
        }

        sheet.appendRow([timestamp, recipient, type, body, notes]);

    } catch (sheetErr) {
        Logger.log(`[logEmailResult] Could not write to spreadsheet: ${sheetErr.message}`);
    } finally {
        lock.releaseLock();
    }
}
