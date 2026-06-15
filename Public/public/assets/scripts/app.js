'use strict';

class App {
    constructor() {
        this.cacheDOM();
        this.bindEvents();
        this.init();
    }

    /* =========================================================================
       1. CACHE DOM
       ========================================================================= */
    cacheDOM() {
        this.header       = document.querySelector('.header');
        this.navToggle    = document.getElementById('navToggle');
        this.navMenu      = document.getElementById('navMenu');
        this.navLinks     = document.querySelectorAll('.nav_link');
        this.themeToggle  = document.getElementById('themeToggle');
        this.revealEls    = document.querySelectorAll('.js_scroll_reveal');
        this.sections     = document.querySelectorAll('section[id]');
        this.yearSpan     = document.getElementById('yearSpan');
    }

    /* =========================================================================
       2. INIT
       ========================================================================= */
    init() {
        this.initTheme();
        this.setupNavMapping();
        this.setupObservers();
        this.setupSmoothScroll();
        this.updateHeaderState();
        this.updateYear();
        this.lazyLoadFallback();
        this.handleReducedMotion();
    }

    /* =========================================================================
       3. EVENTS
       ========================================================================= */
    bindEvents() {
        window.addEventListener('click', (e) => this.handleClick(e));
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        window.addEventListener('scroll', () => this.updateHeaderState(), { passive: true });
    }

    handleClick(e) {
        const themeBtn = e.target.closest('#themeToggle');
        if (themeBtn) { this.toggleTheme(); return; }

        const toggle   = e.target.closest('#navToggle');
        const navLink  = e.target.closest('.nav_link');
        const inside   = e.target.closest('#navMenu');

        if (toggle) {
            this.isMenuOpen() ? this.closeMenu(null) : this.openMenu();
            return;
        }

        if (inside) {
            if (navLink) this.closeMenu(navLink);
            return;
        }

        if (this.isMenuOpen()) {
            this.closeMenu(null);
        }
    }

    handleKeydown(e) {
        if (e.key === 'Escape' && this.isMenuOpen()) {
            this.closeMenu(null);
            this.navToggle?.focus();
        }
    }

    /* =========================================================================
       4. MOBILE NAV
       ========================================================================= */
    isMenuOpen() {
        return this.navMenu?.classList.contains('nav_list_open');
    }

    openMenu() {
        this.navMenu.classList.add('nav_list_open');
        this.navMenu.setAttribute('aria-hidden', 'false');
        this.navToggle.setAttribute('aria-expanded', 'true');
        this.navToggle.innerHTML = `<i class="fas fa-x"></i>`;
        document.body.style.overflowY = 'hidden';
    }

    closeMenu(activeLink) {
        this.navMenu.classList.remove('nav_list_open');
        this.navMenu.setAttribute('aria-hidden', 'true');
        this.navToggle.setAttribute('aria-expanded', 'false');
        this.navToggle.innerHTML = `<i class="fas fa-bars"></i>`;
        document.body.style.overflowY = '';

        if (activeLink) {
            this.navLinks.forEach(link => link.classList.remove('nav_link_active'));
            activeLink.classList.add('nav_link_active');
        }
    }

    /* =========================================================================
       5. HEADER STATE
       ========================================================================= */
    updateHeaderState() {
        const scrolled = window.scrollY > 10;
        this.header?.classList.toggle('header_scrolled', scrolled);
    }

    /* =========================================================================
       6. ACTIVE NAV TRACKING
       ========================================================================= */
    setupNavMapping() {
        this.navMap = {};
        this.navLinks.forEach(link => {
            const id = link.getAttribute('href')?.replace('#', '');
            if (id) this.navMap[id] = link;
        });
    }

    setActiveLink(id) {
        this.navLinks.forEach(link => link.classList.remove('nav_link_active'));
        this.navMap[id]?.classList.add('nav_link_active');
    }

    /* =========================================================================
       7. OBSERVERS
       ========================================================================= */
    setupObservers() {
        const offset = Math.floor(window.innerHeight * 0.4);

        this.sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.setActiveLink(entry.target.id);
                }
            });
        }, {
            rootMargin: `-${offset}px 0px -${offset}px 0px`,
            threshold: 0
        });

        this.sections.forEach(section => this.sectionObserver.observe(section));

        this.revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    this.revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        this.revealEls.forEach(el => this.revealObserver.observe(el));
    }

    /* =========================================================================
       8. SMOOTH SCROLL
       ========================================================================= */
    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const target = document.querySelector(anchor.getAttribute('href'));
                if (!target) return;

                e.preventDefault();

                const offset = this.header.offsetHeight + 16;
                const top = target.getBoundingClientRect().top + window.scrollY - offset;

                window.scrollTo({ top, behavior: 'smooth' });
            });
        });
    }

    /* =========================================================================
       9. YEAR
       ========================================================================= */
    updateYear() {
        if (this.yearSpan) {
            this.yearSpan.textContent = new Date().getFullYear();
        }
    }

    /* =========================================================================
       10. LAZY LOAD FALLBACK
       ========================================================================= */
    lazyLoadFallback() {
        if ('loading' in HTMLImageElement.prototype) return;

        document.querySelectorAll('img[loading="lazy"]').forEach(img => {
            if (img.dataset.src) img.src = img.dataset.src;
        });
    }

    /* =========================================================================
       11. REDUCED MOTION
       ========================================================================= */
    handleReducedMotion() {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (!media.matches) return;

        this.revealEls.forEach(el => {
            el.classList.remove('js_scroll_reveal');
            el.classList.add('active');
        });
    }

    /* =========================================================================
       12. THEME TOGGLE
       Reads from localStorage first, then falls back to OS preference.
       Preference is saved to localStorage under key 'gtTheme'.
       The icon flips between sun (shown in dark mode) and moon (shown in light mode).
       ========================================================================= */
    initTheme() {
        const saved       = localStorage.getItem('gtTheme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme       = saved ?? (prefersDark ? 'dark' : 'light');
        this.applyTheme(theme, false);
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') === 'light'
            ? 'light'
            : 'dark';
        this.applyTheme(current === 'dark' ? 'light' : 'dark', true);
    }

    applyTheme(theme, save = true) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }

        if (save) localStorage.setItem('gtTheme', theme);

        const icon = document.getElementById('themeIcon');
        if (icon) {
            icon.className = theme === 'light'
                ? 'fa-solid fa-moon'
                : 'fa-solid fa-sun';
        }

        if (this.themeToggle) {
            this.themeToggle.setAttribute(
                'aria-label',
                theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
            );
        }
    }
}

/* INIT */
document.addEventListener('DOMContentLoaded', () => {
    new App();
});