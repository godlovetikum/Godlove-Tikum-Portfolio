/**
 *  assets/scripts/auth.js
 *  Central controller of authentication client-side
 */

import { api } from './api.js';

class Auth {
    constructor() {
        this.key  = '_gt_admin_user';
        this.user = null;
        this._init();
    }

    /** Synchronous boot — reads cached profile from localStorage. */
    _init() {
        try {
            const stored = localStorage.getItem(this.key);
            if (stored) this.user = JSON.parse(stored);
        } catch {
            localStorage.removeItem(this.key);
        }
    }

    /** Login with email and password. */
    async login(payload = { email: null, password: null }) {
        const data  = await api.auth.login(payload);
        this.setUser(data.user);
        return data;
    }

    /** Logout and clear current authenticated user info. */
    async logout() {
        await api.auth.logout().catch(() => { /* ignore */ });
        this.clearUser();
        this.redirectToLogin();
    }

    /** Returns true when a cached user profile exists. */
    isLoggedIn() {
        return Boolean(this.user);
    }

    /**
     * Verify the current session with the server.
     * Throws if unauthenticated — let the caller (main.js) handle the redirect
     * via the 401 path in api.js.
     */
    async guard() {
        const data = await api.auth.me();
        this.setUser(data.user);
    }

    /** Returns the currently authenticated user profile or null. */
    getUser() {
        return this.user ?? null;
    }

    /** Persist an authenticated user profile. */
    setUser(profile) {
        localStorage.setItem(this.key, JSON.stringify(profile));
        this.user = profile;
    }

    /** Remove the cached user profile. */
    clearUser() {
        localStorage.removeItem(this.key);
        this.user = null;
    }

    /** Redirect to the login page if not already there. */
    redirectToLogin() {
        if (window.location.pathname !== '/') window.location.href = '/';
    }
}

export const auth = new Auth();
