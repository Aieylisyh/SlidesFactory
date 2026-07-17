/**
 * Summerschool deck — i18n loader, DOM apply, language switcher.
 */
(function (global) {
    'use strict';

    var DATA_URL = 'data/i18n.json?v=7';
    var STORAGE_KEY = 'ss-deck-locale';
    var LOCALES = ['zh', 'ja', 'en'];
    var DEFAULT_LOCALE = 'zh';

    var data = null;
    var locale = DEFAULT_LOCALE;
    var ready = false;
    var readyQueue = [];

    var FLAG_META = [
        {
            locale: 'zh',
            label: '中文',
            svg: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#DE2910"/><path fill="#FFDE00" d="M7.5 7.2l1.05 3.23h3.4l-2.75 2 1.05 3.23-2.75-2-2.75 2 1.05-3.23-2.75-2h3.4z"/><path fill="#FFDE00" d="M14.2 4.2l.35 1.08h1.13l-.92.67.35 1.08-.92-.67-.92.67.35-1.08-.92-.67h1.13z"/><path fill="#FFDE00" d="M16.2 8.4l.35 1.08h1.13l-.92.67.35 1.08-.92-.67-.92.67.35-1.08-.92-.67h1.13z"/><path fill="#FFDE00" d="M15.2 12.8l.35 1.08h1.13l-.92.67.35 1.08-.92-.67-.92.67.35-1.08-.92-.67h1.13z"/><path fill="#FFDE00" d="M12.4 10.8l.35 1.08h1.13l-.92.67.35 1.08-.92-.67-.92.67.35-1.08-.92-.67h1.13z"/></svg>'
        },
        {
            locale: 'ja',
            label: '\u65E5\u672C\u8A9E',
            svg: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" fill="#fff"/><circle cx="16" cy="16" r="9" fill="#BC002D"/></svg>'
        },
        {
            locale: 'en',
            label: 'English',
            svg: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" fill="#B22234"/><path fill="#fff" d="M0 2.46h32V4.92H0zm0 4.92h32v2.46H0zm0 4.92h32v2.46H0zm0 4.92h32v2.46H0zm0 4.92h32v2.46H0zm0 4.92h32V32H0z"/><rect width="13" height="14" fill="#3C3B6E"/></svg>'
        }
    ];

    function resolve(obj, path) {
        if (!obj || !path) return undefined;
        var parts = path.split('.');
        var cur = obj;
        for (var i = 0; i < parts.length; i += 1) {
            if (cur == null || typeof cur !== 'object') return undefined;
            cur = cur[parts[i]];
        }
        return cur;
    }

    function readStoredLocale() {
        try {
            var stored = localStorage.getItem(STORAGE_KEY);
            if (stored && LOCALES.indexOf(stored) !== -1) return stored;
        } catch (err) { /* ignore */ }
        return DEFAULT_LOCALE;
    }

    function writeStoredLocale(next) {
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch (err) { /* ignore */ }
    }

    function fetchData() {
        if (data) return Promise.resolve(data);
        return fetch(DATA_URL, { cache: 'no-store' })
            .then(function (res) {
                if (!res.ok) throw new Error('i18n.json ' + res.status);
                return res.json();
            })
            .then(function (json) {
                data = json;
                return data;
            });
    }

    function lookup(key) {
        if (!data || !key) return undefined;
        var entry = data.strings[key];
        if (!entry) {
            entry = resolve(data.strings, key);
        }
        if (entry && typeof entry === 'object' && entry[locale] != null) {
            return entry[locale];
        }
        return undefined;
    }

    function t(key, fallback) {
        var val = lookup(key);
        if (val != null && val !== '') return val;
        return fallback != null ? fallback : key;
    }

    function scheduleLookup(kind, id, field) {
        if (!data || !data.schedule) return undefined;
        var bucket = data.schedule[kind];
        if (!bucket) return undefined;
        var entry = bucket[id];
        if (!entry) return undefined;
        var val = entry[field];
        if (val && typeof val === 'object' && val[locale] != null) {
            return val[locale];
        }
        return undefined;
    }

    function syllabusBody(key) {
        return scheduleLookup('syllabus', key, 'body') || '';
    }

    function cellLabel(key) {
        return scheduleLookup('cells', key, 'label') || '';
    }

    function onlineTitle(key) {
        return scheduleLookup('online', key, 'title') || '';
    }

    function weekdayLabel(key) {
        return scheduleLookup('weekdays', key, 'label') || '';
    }

    function applyElement(el) {
        var key = el.getAttribute('data-i18n');
        var htmlKey = el.getAttribute('data-i18n-html');
        var activeKey = htmlKey || key;
        if (!activeKey) return;

        var text = t(activeKey, el.textContent);
        if (htmlKey) {
            el.innerHTML = text;
        } else {
            el.textContent = text;
        }

        var attrMap = el.getAttribute('data-i18n-attrs');
        if (attrMap) {
            attrMap.split(';').forEach(function (pair) {
                var bits = pair.split(':');
                if (bits.length !== 2) return;
                var attr = bits[0].trim();
                var attrKey = bits[1].trim();
                if (!attr || !attrKey) return;
                el.setAttribute(attr, t(attrKey, el.getAttribute(attr) || ''));
            });
        }
    }

    function apply(root) {
        var scope = root || document;
        scope.querySelectorAll('[data-i18n], [data-i18n-html]').forEach(applyElement);

        var titleKey = document.documentElement.getAttribute('data-i18n-title');
        if (!root && titleKey) {
            var shareLocked = typeof ShareLock !== 'undefined' && ShareLock.isActive();
            if (!shareLocked) {
                document.title = t(titleKey, document.title);
            }
        }

        if (!root) {
            document.documentElement.lang = locale === 'zh' ? 'zh-CN' : (locale === 'ja' ? 'ja' : 'en');
        }
    }

    function dispatchLocaleChange() {
        document.dispatchEvent(new CustomEvent('ss-locale-change', {
            detail: { locale: locale }
        }));
    }

    var DICT_ICON_SVG = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="currentColor" d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h1v-2H6V4h10v16h-1v2h1c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H6zm3 3h7v2H9V5zm0 4h7v2H9V9zm0 4h5v2H9v-2z"/><path fill="currentColor" d="M14 6h6c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2h-6V6zm2 2v12h4V8h-4z"/></svg>';

    function setSwitcherExpanded(switcher, expanded) {
        if (!switcher) return;
        var open = !!expanded;
        switcher.classList.toggle('is-expanded', open);
        var toggle = switcher.querySelector('.ss-lang-switcher__toggle');
        var panel = switcher.querySelector('.ss-lang-switcher__panel');
        if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (panel) panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    }

    function collapseSwitcher(switcher) {
        setSwitcherExpanded(switcher, false);
    }

    function setSwitcherActive(switcher) {
        if (!switcher) return;
        switcher.querySelectorAll('[data-ss-locale]').forEach(function (btn) {
            var active = btn.getAttribute('data-ss-locale') === locale;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    }

    function setLocale(next, options) {
        if (LOCALES.indexOf(next) === -1) return;
        if (next === locale && ready && !(options && options.force)) return;

        locale = next;
        writeStoredLocale(locale);
        apply();
        setSwitcherActive(global.document.getElementById('ss-lang-switcher'));
        if (ready) dispatchLocaleChange();
    }

    function cycleLocale() {
        var idx = LOCALES.indexOf(locale);
        setLocale(LOCALES[(idx + 1) % LOCALES.length]);
    }

    function stopRevealNav(e) {
        e.stopPropagation();
    }

    function mountSwitcher() {
        if (document.getElementById('ss-lang-switcher')) return;

        var wrap = document.createElement('div');
        wrap.id = 'ss-lang-switcher';
        wrap.className = 'ss-lang-switcher';
        wrap.setAttribute('role', 'group');
        wrap.setAttribute('aria-label', t('ui.langSwitcher', 'Language'));

        var panel = document.createElement('div');
        panel.className = 'ss-lang-switcher__panel';
        panel.setAttribute('aria-hidden', 'true');

        FLAG_META.forEach(function (meta) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ss-lang-switcher__btn';
            btn.setAttribute('data-ss-locale', meta.locale);
            btn.setAttribute('title', meta.label);
            btn.setAttribute('aria-label', meta.label);

            var flag = document.createElement('span');
            flag.className = 'ss-lang-switcher__flag';
            flag.setAttribute('aria-hidden', 'true');
            flag.innerHTML = meta.svg;
            btn.appendChild(flag);

            btn.addEventListener('mousedown', stopRevealNav);
            btn.addEventListener('touchstart', stopRevealNav, { passive: true });
            btn.addEventListener('click', function (e) {
                stopRevealNav(e);
                setLocale(meta.locale);
                collapseSwitcher(wrap);
            });
            panel.appendChild(btn);
        });

        var toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'ss-lang-switcher__toggle';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-controls', 'ss-lang-switcher-panel');
        toggle.setAttribute('title', t('ui.langSwitcher', 'Language'));
        toggle.setAttribute('aria-label', t('ui.langSwitcher', 'Language'));

        var icon = document.createElement('span');
        icon.className = 'ss-lang-switcher__icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = DICT_ICON_SVG;
        toggle.appendChild(icon);

        panel.id = 'ss-lang-switcher-panel';

        toggle.addEventListener('mousedown', stopRevealNav);
        toggle.addEventListener('touchstart', stopRevealNav, { passive: true });
        toggle.addEventListener('click', function (e) {
            stopRevealNav(e);
            setSwitcherExpanded(wrap, !wrap.classList.contains('is-expanded'));
        });

        wrap.appendChild(toggle);
        wrap.appendChild(panel);

        wrap.addEventListener('mousedown', stopRevealNav);
        wrap.addEventListener('touchstart', stopRevealNav, { passive: true });

        document.addEventListener('click', function (e) {
            if (!wrap.classList.contains('is-expanded')) return;
            if (wrap.contains(e.target)) return;
            collapseSwitcher(wrap);
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && wrap.classList.contains('is-expanded')) {
                collapseSwitcher(wrap);
            }
        });

        document.body.appendChild(wrap);
        setSwitcherActive(wrap);
    }

    function whenReady(fn) {
        if (ready) {
            fn();
        } else {
            readyQueue.push(fn);
        }
    }

    function init() {
        locale = readStoredLocale();
        return fetchData()
            .then(function () {
                mountSwitcher();
                apply();
                ready = true;
                readyQueue.forEach(function (fn) { fn(); });
                readyQueue = [];
                dispatchLocaleChange();
            })
            .catch(function (err) {
                console.error('[SS i18n]', err);
                mountSwitcher();
                ready = true;
            });
    }

    global.SummerI18n = {
        init: init,
        whenReady: whenReady,
        t: t,
        getLocale: function () { return locale; },
        setLocale: setLocale,
        cycleLocale: cycleLocale,
        apply: apply,
        syllabusBody: syllabusBody,
        cellLabel: cellLabel,
        onlineTitle: onlineTitle,
        weekdayLabel: weekdayLabel,
        LOCALES: LOCALES
    };
})(window);
