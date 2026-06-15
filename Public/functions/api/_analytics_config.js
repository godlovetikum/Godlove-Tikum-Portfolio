/**
 * functions/api/_analytics_config.js
 *
 * Allowed analytics event combinations.
 * Imported directly by analytics.js — no filesystem reads needed.
 *
 * Each object must exactly match the data-analytics attributes in index.html.
 * Any payload not present here is silently rejected by the gateway.
 */

export const ALLOWED_ANALYTICS_PAYLOADS = [
    { event: 'brand',      section: 'header',   target: 'home',                external: false },
    { event: 'navigation', section: 'header',   target: 'home',                external: false },
    { event: 'navigation', section: 'header',   target: 'about',               external: false },
    { event: 'navigation', section: 'header',   target: 'services',            external: false },
    { event: 'navigation', section: 'header',   target: 'projects',            external: false },
    { event: 'cta',        section: 'header',   target: 'contact',             external: false },
    { event: 'images',     section: 'hero',     target: 'godlove_image',       external: false },
    { event: 'cta',        section: 'hero',     target: 'whatsapp',            external: true  },
    { event: 'cta',        section: 'hero',     target: 'projects',            external: false },
    { event: 'navigation', section: 'about',    target: 'services',            external: false },
    { event: 'contact',    section: 'services', target: 'whatsapp',            external: true  },
    { event: 'contact',    section: 'services', target: 'email',               external: true  },
    { event: 'project',    section: 'projects', target: 'circleledger_card',   external: false },
    { event: 'images',     section: 'projects', target: 'circleledger_image',  external: false },
    { event: 'project',    section: 'projects', target: 'circleledger_preview',external: true  },
    { event: 'project',    section: 'projects', target: 'circleledger_waitlist',external: true },
    { event: 'project',    section: 'projects', target: 'basedeck_card',       external: false },
    { event: 'images',     section: 'projects', target: 'basedeck_image',      external: false },
    { event: 'project',    section: 'projects', target: 'basedeck_open',       external: true  },
    { event: 'project',    section: 'projects', target: 'basedeck_docs',       external: true  },
    { event: 'project',    section: 'projects', target: 'quickwalink_card',    external: false },
    { event: 'images',     section: 'projects', target: 'quickwalink_image',   external: false },
    { event: 'project',    section: 'projects', target: 'quickwalink_open',    external: true  },
    { event: 'project',    section: 'projects', target: 'quickwalink_github',  external: true  },
    { event: 'project',    section: 'projects', target: 'github_profile',      external: true  },
    { event: 'navigation', section: 'contact',  target: 'basedeck',            external: true  },
    { event: 'navigation', section: 'contact',  target: 'bd_docs',             external: true  },
    { event: 'navigation', section: 'contact',  target: 'circleledger',        external: true  },
    { event: 'navigation', section: 'contact',  target: 'cl_waitlist',         external: true  },
    { event: 'contact',    section: 'contact',  target: 'whatsapp',            external: true  },
    { event: 'contact',    section: 'contact',  target: 'email',               external: true  },
    { event: 'form',       section: 'contact',  target: 'contact-form',        external: false },
    { event: 'form',       section: 'contact',  target: 'whatsapp',            external: true  },
    { event: 'footer',     section: 'footer',   target: 'circleledger',        external: true  },
    { event: 'footer',     section: 'footer',   target: 'cl_waitlist',         external: true  },
    { event: 'footer',     section: 'footer',   target: 'basedeck',            external: true  },
    { event: 'footer',     section: 'footer',   target: 'bd_docs',             external: true  },
    { event: 'footer',     section: 'footer',   target: 'quickwalink',         external: true  },
    { event: 'social',     section: 'footer',   target: 'facebook',            external: true  },
    { event: 'social',     section: 'footer',   target: 'instagram',           external: true  },
    { event: 'social',     section: 'footer',   target: 'twitter',             external: true  },
    { event: 'social',     section: 'footer',   target: 'github',              external: true  },
    { event: 'social',     section: 'footer',   target: 'whatsapp',            external: true  },
    { event: 'social',     section: 'footer',   target: 'youtube',             external: true  },
];
