'use strict';

/**
 * api.js
 *
 * Centralised API client for the admin dashboard.
 *
 * Auth is handled entirely via HTTP-only cookies by the Cloudflare Pages Function.
 * This file never reads or attaches tokens — the browser sends the cookies
 * automatically with every same-origin request.
 *
 * On 401 responses, it redirects to the login page.
 */

import { auth } from './auth.js';

class AppError extends Error {
    constructor(code, message) {
        super(message);
        this.name    = 'AppError';
        this.message = message;
        this.code    = code;
    }
}


async function request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const options = { method, headers, credentials: 'same-origin' };
    if (body && method !== 'GET') options['body'] = JSON.stringify(body);

    let apiResponse, responseBody;
    try {
        apiResponse = await fetch(path, options);
    } catch {
        responseBody = {
            success: false, data: null,
            error: { code: 'unknown', message: 'An unknown error occurred. Check your internet connection and try again.' },
        };
    }

    if (apiResponse) {
        try {
            responseBody = await apiResponse.json();
        } catch {
            responseBody = {
                success: false, data: null,
                error: { code: 'unknown', message: 'Received an unexpected response. Please refresh and try again.' },
            };
        }
    }

    if (!responseBody?.success) {
        if (
            apiResponse?.status === 401 ||
            responseBody?.error?.code === 'auth.unauthenticated' ||
            responseBody?.error?.code === 'auth.session_expired'
        ) {
            auth.clearUser();
            auth.redirectToLogin();
            throw new AppError(
                responseBody?.error?.code ?? 'auth.unauthenticated',
                responseBody?.error?.message ?? 'Session expired! Please sign in before trying again.',
            );
        }
        throw new AppError(
            responseBody?.error?.code ?? 'unknown',
            responseBody?.error?.message ?? 'An unexpected error occurred. Please try again.',
        );
    }

    return responseBody.data;
}


export const api = {
    auth: {
        login: (p) => request('POST', '/api/auth?action=login', p),
        me:    ()  => request('GET',  '/api/auth?action=me'),
        logout:()  => request('DELETE', '/api/auth?action=logout'),
    },

    contacts: {
        list(params = {}) {
            const qs = new URLSearchParams(
                Object.fromEntries(
                    Object.entries({ action: 'list', ...params }).filter(([, v]) => v != null && v !== ''),
                ),
            ).toString();
            return request('GET', `/api/contacts?${qs}`);
        },
        update(id, fields) {
            return request('PATCH', '/api/contacts?action=update', { id, ...fields });
        },
    },

    analytics: {
        summary(from, to) {
            const qs = new URLSearchParams({ action: 'summary', view: 'summary', ...(from && { from }), ...(to && { to }) });
            return request('GET', `/api/analytics?${qs}`);
        },
        trend(from, to) {
            const qs = new URLSearchParams({ action: 'trend', view: 'trend', ...(from && { from }), ...(to && { to }) });
            return request('GET', `/api/analytics?${qs}`);
        },
        raw(table, params = {}) {
            const qs = new URLSearchParams({ action: 'raw', view: 'raw', table, ...params });
            return request('GET', `/api/analytics?${qs}`);
        },
    },

    email: {
        listTemplates() {
            return request('GET', '/api/email?action=templates');
        },
        getTemplate(id) {
            return request('GET', `/api/email?action=template&id=${encodeURIComponent(id)}`);
        },
        updateTemplate(id, fields) {
            return request('PATCH', `/api/email?action=template&id=${encodeURIComponent(id)}`, { id, ...fields });
        },
        send(payload) {
            return request('POST', '/api/email?action=send', { caller: 'manual', ...payload });
        },
        listOutbound(params = {}) {
            const qs = new URLSearchParams({
                action: 'outbound',
                ...Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== '')),
            });
            return request('GET', `/api/email?${qs}`);
        },
        retryOutbound({ contact_id, email_type }) {
            return request('POST', '/api/email?action=retry', { caller: 'manual', contact_id, email_type });
        },
    },

    config: {
        list() {
            return request('GET', '/api/config?action=list');
        },
        create({ key, value }) {
            return request('POST', '/api/config?action=create', { key, value });
        },
        update({ key, value }) {
            return request('PATCH', '/api/config?action=update', { key, value });
        },
        delete({ key }) {
            return request('DELETE', '/api/config?action=delete', { key });
        },
    },
};
