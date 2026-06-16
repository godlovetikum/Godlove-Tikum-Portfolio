'use strict';

const SESSION_KEY = 'gtSessionId';

class ContactForm {
    constructor() {
        this.ENDPOINT  = '/api/contact';
        this.WA_NUMBER = '__OWNER_PHONE__';
        this.SITE_KEY  = '__SITE_KEY__';

        this.form         = document.getElementById('contactForm');
        this.ctFormWa     = document.getElementById('ctFormWa');
        this.overlay      = document.getElementById('formOverlay');
        this.statusEl     = document.getElementById('formStatus');
        this.category     = document.getElementById('fieldCategory');
        this.templateHint = document.getElementById('formTemplateHint');
        this.message      = document.getElementById('fieldMessage');

        this.EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        this.MESSAGE_TEMPLATES = {
            'new-website': `Hi __OWNER_FIRST_NAME__, I run a [type of business, e.g. clothing shop / salon / school etc] in [city].
            
I need a new website. My main goal is to get more customers to [call me / walk in / order online etc].

My budget is around [amount in your currency], and I'd like to launch by [rough timeline].

[Add any extra details to help me understand your business]`,

            'fix-website': `Hi __OWNER_FIRST_NAME__, I have a website at [yoursite.com] but it's not bringing in customers.

People visit and then leave without calling or messaging. I want to fix that.

Can you take a look and tell me what's wrong?`,

            'book-call': `Hi __OWNER_FIRST_NAME__, I'd like to schedule a call to discuss [what you want to talk about].

I'm available [days and times, e.g. Mon–Wed after 4pm].

What times work for you?`,

            'project-question': `Hi __OWNER_FIRST_NAME__, I have a question about your project [project name].

[Write your question here.]`,

            'other': `Hi __OWNER_FIRST_NAME__,

[Write your message here.]`,
        };

        this.TEMPLATE_HINTS = {
            'new-website':      'Template loaded — fill in the [bracketed] parts and send.',
            'fix-website':      'Template loaded — add your website link and send.',
            'book-call':        'Template loaded — add your available times and send.',
            'project-question': 'Template loaded — pick the project and write your question.',
            'other':            'Blank template — just write what you need.',
        };

        this.init();
    }

    init() {
        if (this.category) {
            this.category.addEventListener('change', () => this.handleCategoryChange());
        }
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        if (this.ctFormWa) {
            this.ctFormWa.addEventListener('click', (e) => this.handleSubmit(e, 'whatsapp'));
        }
    }

    handleCategoryChange() {
        const value = this.category.value;

        if (!value) {
            this.category.classList.remove('selected');
            this.templateHint?.classList.remove('form_template_hint_visible');
            return;
        }

        this.category.classList.add('selected');

        if (this.message && this.MESSAGE_TEMPLATES[value]) {
            this.message.value = this.MESSAGE_TEMPLATES[value];
            this.message.focus();
            this.message.setSelectionRange(0, 0);
        }

        if (this.templateHint && this.TEMPLATE_HINTS[value]) {
            this.templateHint.textContent = this.TEMPLATE_HINTS[value];
            this.templateHint.classList.add('form_template_hint_visible');
        }
    }

    async handleSubmit(e, target = '') {
        e.preventDefault();

        const submitBtn = this.form.querySelector('[type="submit"]');
        const name      = document.getElementById('fieldName');
        const email     = document.getElementById('fieldEmail');
        const company   = document.getElementById('company');
        const category  = this.category ? this.category.value : 'other';

        if (company && company.value.trim() !== '') return;

        const error = this.validate(name?.value, email?.value, this.message?.value);
        if (error) {
            this.showStatus(error, 'error');
            return;
        }

        submitBtn.disabled = true;
        this.showOverlay();
        this.showStatus('Sending…', 'neutral');

        const payload = {
            name:      name.value.trim(),
            email:     email.value.trim(),
            message:   this.message.value.trim(),
            category,
            company:   company?.value?.trim() || '',
            page:      window.location.href,
            siteKey:   this.SITE_KEY,
            sessionId: localStorage.getItem(SESSION_KEY) || '',
        };

        try {
            if (target === 'whatsapp') {
                this.openWhatsapp(payload);
                await fetch(this.ENDPOINT, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify(payload),
                }).catch(() => {});
            } else {
                const res          = await fetch(this.ENDPOINT, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify(payload),
                });
                const responseData = await res.json();

                if (res.ok && responseData.success) {
                    this.showStatus(responseData.data.message, 'success');
                    this.form.reset();
                    this.statusEl.classList.remove('form_status_visible');
                    this.category?.classList.remove('selected');
                    this.templateHint?.classList.remove('form_template_hint_visible');
                } else {
                    throw new Error(
                        responseData.error.message ??
                        'An unknown error occurred. Please try again or use WhatsApp or email directly.',
                    );
                }
            }
        } catch (error) {
            this.showStatus(error.message, 'error');
        } finally {
            this.hideOverlay();
            submitBtn.disabled = false;
        }
    }

    openWhatsapp(payload) {
        if (!payload) return;
        const message = `
Greetings __OWNER_FIRST_NAME__. I came across your portfolio at *${payload.page}*

My name: *${payload.name}*
My email: *${payload.email}*

What i want us to discuss about: *${payload.category}

*Message:* ${payload.message}`;

        const url = `https://wa.me/${this.WA_NUMBER}?text=${encodeURIComponent(message.trim())}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    validate(name, email, message) {
        if (!name || name.trim().length < 3)          return 'Please enter your name (at least 3 characters).';
        if (name.trim().length > 50)                  return 'Name must be under 50 characters.';
        if (!email || !this.EMAIL_REGEX.test(email.trim())) return 'Please enter a valid email address.';
        if (email.trim().length > 100)                return 'Email address is too long.';
        if (!message || message.trim().length < 20)   return 'Message must be at least 20 characters.';
        if (message.trim().length > 2000)             return 'Message must be under 2000 characters.';
        return null;
    }

    showOverlay() {
        if (!this.overlay) return;
        this.overlay.classList.add('form_overlay_active');
        this.overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    hideOverlay() {
        if (!this.overlay) return;
        this.overlay.classList.remove('form_overlay_active');
        this.overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    showStatus(text, type) {
        if (!this.statusEl) return;
        const colors = { neutral: 'var(--text_body)', success: 'var(--green)', error: 'var(--red)' };
        const color  = colors[type] || colors.neutral;
        this.statusEl.textContent  = text;
        this.statusEl.style.color  = color;
        this.statusEl.style.border = `1.5px solid ${color}`;
        this.statusEl.style.padding = '0.7rem 0.98rem';
        this.statusEl.classList.add('form_status_visible');
    }
}

new ContactForm();
