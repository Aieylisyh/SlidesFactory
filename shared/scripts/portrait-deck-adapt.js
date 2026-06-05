/**
 * Portrait deck adapt — lightweight vertical viewport mode (scale-first).
 *
 * Spec: guides/PORTRAIT_ADAPT_GUIDE.md
 * CSS:  styles/style-guide/10-portrait-adapt.css (html.deck-portrait)
 *
 * Call PortraitDeckAdapt.init() before Reveal.initialize();
 * Call PortraitDeckAdapt.bind(Reveal) after initialize resolves.
 */
(function (global) {
    'use strict';

    var DEFAULTS = {
        aspectMax: 0.95,
        hintStorageKey: 'sfk-deck-portrait-hint-dismissed',
        hintDelayMs: 400,
        debounceMs: 120,
        queryDisable: 'portrait',
        disableValue: '0',
        hintZIndex: 200000
    };

    var state = {
        portrait: false,
        inited: false,
        bound: false,
        hintEl: null,
        debounceTimer: null,
        hintTimer: null,
        options: {}
    };

    function mergeOptions(options) {
        state.options = Object.assign({}, DEFAULTS, options || {});
    }

    function isQueryDisabled() {
        try {
            var params = new URLSearchParams(global.location.search);
            return params.get(state.options.queryDisable) === state.options.disableValue;
        } catch (err) {
            return false;
        }
    }

    function measurePortrait() {
        if (isQueryDisabled()) return false;
        var w = global.innerWidth;
        var h = global.innerHeight;
        if (!w || !h) return false;
        return w / h < state.options.aspectMax;
    }

    function dispatchPortraitChange(isPortrait) {
        try {
            document.dispatchEvent(new CustomEvent('deckportraitchange', {
                bubbles: true,
                detail: { portrait: isPortrait }
            }));
        } catch (err) {
            /* CustomEvent unsupported */
        }
    }

    function clearHintTimer() {
        if (state.hintTimer) {
            clearTimeout(state.hintTimer);
            state.hintTimer = null;
        }
    }

    function isHintDismissed() {
        try {
            return sessionStorage.getItem(state.options.hintStorageKey) === '1';
        } catch (err) {
            return false;
        }
    }

    function setHintDismissed() {
        try {
            sessionStorage.setItem(state.options.hintStorageKey, '1');
        } catch (err2) {
            /* private mode */
        }
    }

    function hideHint() {
        clearHintTimer();
        if (!state.hintEl) return;
        state.hintEl.classList.remove('is-visible');
    }

    function bindHintEvents(el) {
        var dismissBtn = el.querySelector('[data-portrait-hint-dismiss]');
        var continueBtn = el.querySelector('[data-portrait-hint-continue]');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', function (e) {
                e.preventDefault();
                setHintDismissed();
                hideHint();
            });
        }
        if (continueBtn) {
            continueBtn.addEventListener('click', function (e) {
                e.preventDefault();
                hideHint();
            });
        }
    }

    function ensureHintElement() {
        if (state.hintEl) return state.hintEl;

        var el = document.createElement('div');
        el.className = 'deck-portrait-hint';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'false');
        el.setAttribute('aria-live', 'polite');
        el.setAttribute('aria-label', '浏览提示');
        el.style.zIndex = String(state.options.hintZIndex);
        el.innerHTML =
            '<div class="deck-portrait-hint__panel">' +
                '<p class="deck-portrait-hint__title">横屏体验更佳</p>' +
                '<p class="deck-portrait-hint__body">当前为竖屏浏览，内容已自动优化排版。旋转设备可获得更接近演示稿的体验。</p>' +
                '<div class="deck-portrait-hint__actions">' +
                    '<button type="button" class="deck-portrait-hint__btn deck-portrait-hint__btn--primary" data-portrait-hint-continue>继续竖屏浏览</button>' +
                    '<button type="button" class="deck-portrait-hint__btn deck-portrait-hint__btn--ghost" data-portrait-hint-dismiss>不再提示</button>' +
                '</div>' +
            '</div>';

        bindHintEvents(el);

        var root = document.body || document.documentElement;
        root.appendChild(el);
        state.hintEl = el;
        return el;
    }

    function scheduleHint() {
        if (isHintDismissed() || !state.portrait) return;
        clearHintTimer();
        state.hintTimer = setTimeout(function () {
            state.hintTimer = null;
            if (!state.portrait || isHintDismissed()) return;
            ensureHintElement().classList.add('is-visible');
        }, state.options.hintDelayMs);
    }

    function updatePortraitState() {
        var next = measurePortrait();
        if (next === state.portrait) return state.portrait;

        state.portrait = next;
        document.documentElement.classList.toggle('deck-portrait', next);

        if (next) {
            scheduleHint();
        } else {
            hideHint();
        }

        dispatchPortraitChange(next);
        return next;
    }

    function onResizeDebounced() {
        clearTimeout(state.debounceTimer);
        state.debounceTimer = setTimeout(function () {
            updatePortraitState();
            var Reveal = global.Reveal;
            if (Reveal && Reveal.isReady && Reveal.isReady()) {
                Reveal.layout();
            }
            try {
                global.dispatchEvent(new Event('resize'));
            } catch (err) {
                /* legacy */
            }
        }, state.options.debounceMs);
    }

    function init(options) {
        if (state.inited) {
            if (options) mergeOptions(options);
            updatePortraitState();
            return;
        }
        mergeOptions(options || {});
        state.inited = true;
        updatePortraitState();
        global.addEventListener('resize', onResizeDebounced);
        global.addEventListener('orientationchange', onResizeDebounced);
    }

    function bind(Reveal) {
        if (state.bound) return;
        state.bound = true;

        if (!Reveal) return;

        document.addEventListener('deckportraitchange', function () {
            if (!Reveal.isReady || !Reveal.isReady()) return;
            requestAnimationFrame(function () {
                Reveal.layout();
            });
        });

        Reveal.on('slidechanged', function () {
            if (!state.portrait) return;
            requestAnimationFrame(function () {
                if (Reveal.isReady && Reveal.isReady()) {
                    Reveal.layout();
                }
            });
        });
    }

    global.PortraitDeckAdapt = {
        init: init,
        bind: bind,
        isPortrait: function () {
            return state.portrait;
        },
        dismissHint: function () {
            setHintDismissed();
            hideHint();
        },
        update: updatePortraitState
    };
})(typeof window !== 'undefined' ? window : this);
