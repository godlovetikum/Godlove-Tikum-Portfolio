'use strict';

const SITE_KEY    = '__SITE_KEY__';
const SESSION_KEY = 'gtSessionId';

class Analytics {
    constructor() {
        this.ENDPOINT       = '/api/analytics';
        this.CLICK_DEBOUNCE = 1000;
        this.lastClickTs    = 0;
        this.init();
    }

    /* =========================================================================
       INIT
       ========================================================================= */
    init() {
        this.trackVisit();
        document.addEventListener('click', (e) => this.handleClick(e));
    }

    /* =========================================================================
       VISITOR TRACKING
       ========================================================================= */
    trackVisit() {
        const payload = {
            type:      'visitor',
            sessionId: this.getSessionId(),
            device:    window.innerWidth > 768 ? 'desktop' : 'mobile',
            referrer:  this.getReferrer(),
            siteKey:   SITE_KEY,
        };
        this.send(payload);
    }

    getReferrer() {
        const ref = document.referrer.toLowerCase();
        return ref ? ref.slice(0, 50) : 'direct';
    }

    /* =========================================================================
       CLICK TRACKING
       ========================================================================= */
    async handleClick(event) {
        const element = event.target.closest('[data-analytics]');
        if (!element) return;

        const now = Date.now();
        if (now - this.lastClickTs < this.CLICK_DEBOUNCE) return;
        this.lastClickTs = now;

        let meta;
        try {
            meta = JSON.parse(element.dataset.analytics);
        } catch {
            return;
        }

        const payload = {
            type:      'click',
            ...meta,
            page:      window.location.href,
            sessionId: this.getSessionId(),
            siteKey:   SITE_KEY,
        };

        await this.send(payload);
    }

    /* =========================================================================
       NETWORK
       ========================================================================= */
    async send(payload) {
        try {
            await fetch(this.ENDPOINT, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });
        } catch (err) {
            console.warn('[Analytics] send failed:', err);
        }
    }

    /* =========================================================================
       SESSION
       ========================================================================= */
    getSessionId() {
        let id = localStorage.getItem(SESSION_KEY);
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem(SESSION_KEY, id);
        }
        return id;
    }
}

new Analytics();
