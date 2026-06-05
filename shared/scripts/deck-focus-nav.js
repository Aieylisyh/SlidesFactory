/**
 * Deck Focus Nav — in-iframe focus ring, spatial navigation, confirm actions.
 * Injected by presenter-bridge.js; see guides/REMOTE_FOCUS_MAP.md
 */
(function (global) {
    'use strict';

    var NAV_DATA = null;
    var RevealRef = null;
    var onStateChange = null;

    var IMPLEMENTED_PROFILES = {
        'segment-arrow-4': { selectors: ['[data-segment-arrow-segment]'], dynamic: false },
        'segment-arrow-3': { selectors: ['[data-segment-arrow-segment]'], dynamic: false },
        'case-card-grid': { selectors: ['[data-case-card][data-goto]'], dynamic: false },
        'case-match-page': {
            selectors: ['[data-case-card][data-goto]', '.match-chip:not(.is-placed)'],
            dynamic: true
        },
        'portfolio-axis': { selectors: ['.portfolio-axis-chip'], dynamic: true }
    };

    var rescanTimer = null;
    var rescanAttempts = 0;

    var state = {
        mode: 'deck',
        focusIndex: -1,
        targets: [],
        profileId: null
    };

    var ringEl = null;
    var styleInjected = false;

    function injectStyles() {
        if (styleInjected) return;
        styleInjected = true;
        var style = document.createElement('style');
        style.textContent =
            '.deck-remote-focus-ring{position:fixed;pointer-events:none;z-index:9999;' +
            'box-sizing:border-box;border:3px solid #e05688;border-radius:6px;' +
            'box-shadow:0 0 0 1px rgba(0,0,0,0.35),0 0 24px rgba(224,86,136,0.45);' +
            'transition:left 0.12s ease,top 0.12s ease,width 0.12s ease,height 0.12s ease;}' +
            '.deck-remote-focus-ring.is-dim{opacity:0.85;}' +
            '[data-deck-focus-active]{outline:none!important;}' +
            '.segment-arrow-segment--remote-focus .segment-arrow-segment-title,' +
            '.segment-arrow-segment--remote-focus .segment-arrow-segment-list{opacity:1!important;}' +
            '[data-deck-focus-active].portfolio-axis-chip,' +
            '[data-deck-focus-active].match-chip{box-shadow:0 0 0 3px #e05688,0 0 18px rgba(224,86,136,0.45);}';
        document.head.appendChild(style);
    }

    function ensureRing() {
        injectStyles();
        if (ringEl && ringEl.parentNode) return ringEl;
        ringEl = document.createElement('div');
        ringEl.className = 'deck-remote-focus-ring';
        ringEl.setAttribute('aria-hidden', 'true');
        ringEl.hidden = true;
        document.body.appendChild(ringEl);
        return ringEl;
    }

    function hideRing() {
        if (ringEl) ringEl.hidden = true;
        document.querySelectorAll('[data-deck-focus-active]').forEach(function (el) {
            el.removeAttribute('data-deck-focus-active');
        });
    }

    function updateRing(target) {
        var ring = ensureRing();
        if (!target || !target.element) {
            ring.hidden = true;
            return;
        }
        var rect = target.element.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) {
            ring.hidden = true;
            return;
        }
        ring.hidden = false;
        ring.style.left = rect.left + 'px';
        ring.style.top = rect.top + 'px';
        ring.style.width = rect.width + 'px';
        ring.style.height = rect.height + 'px';
    }

    function getCurrentSlideEl() {
        if (!RevealRef || !RevealRef.isReady()) return null;
        return RevealRef.getCurrentSlide();
    }

    function getSlideMeta() {
        if (!RevealRef || !NAV_DATA || !RevealRef.isReady()) return null;
        var indices = RevealRef.getIndices();
        var slide = NAV_DATA.slides.find(function (s) {
            return s.h === indices.h && s.v === indices.v;
        });
        if (!slide) {
            var el = getCurrentSlideEl();
            if (el && el.id) {
                slide = NAV_DATA.slides.find(function (s) { return s.id === el.id; });
            }
        }
        return slide || null;
    }

    function revealSlideFragments(slideEl) {
        if (!slideEl) return;
        slideEl.querySelectorAll('.fragment').forEach(function (frag) {
            frag.classList.add('visible');
        });
    }

    function isVisible(el) {
        if (!el || !el.getBoundingClientRect) return false;
        var rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return false;
        var st = global.getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden') return false;
        if (parseFloat(st.opacity) < 0.05) return false;
        if (el.disabled) return false;
        if (el.classList && el.classList.contains('is-placed')) return false;
        return true;
    }

    function readLabel(el, index) {
        var explicit = el.getAttribute('data-remote-label') || el.getAttribute('aria-label');
        if (explicit) return explicit.trim();
        var title = el.querySelector(
            '.segment-arrow-segment-title, .case-card-title, .portfolio-axis-chip-label, h3, h4'
        );
        if (title && title.textContent) return title.textContent.trim();
        var chipLabel = el.querySelector('.portfolio-axis-chip-label');
        if (chipLabel && chipLabel.textContent) return chipLabel.textContent.trim();
        var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (text.length > 48) text = text.slice(0, 45) + '…';
        return text || ('焦点 ' + (index + 1));
    }

    function cancelRescan() {
        if (rescanTimer) {
            global.clearTimeout(rescanTimer);
            rescanTimer = null;
        }
        rescanAttempts = 0;
    }

    function scheduleRescanIfNeeded(profileId, targetCount) {
        var profile = IMPLEMENTED_PROFILES[profileId];
        if (!profile || !profile.dynamic || targetCount > 0) {
            cancelRescan();
            return;
        }
        if (rescanAttempts >= 8) return;

        cancelRescan();
        rescanTimer = global.setTimeout(function () {
            rescanAttempts += 1;
            refreshTargets(true);
        }, 180);
    }

    function scanTargets(slideEl, profileId) {
        var profile = IMPLEMENTED_PROFILES[profileId];
        if (!profile || !slideEl) return [];

        var seen = [];
        var elements = [];

        profile.selectors.forEach(function (sel) {
            slideEl.querySelectorAll(sel).forEach(function (el) {
                if (elements.indexOf(el) === -1) elements.push(el);
            });
        });

        elements.forEach(function (el, i) {
            if (!isVisible(el)) return;
            var rect = el.getBoundingClientRect();
            seen.push({
                id: el.getAttribute('data-remote-focus') || (profileId + '-' + i),
                element: el,
                label: readLabel(el, i),
                action: 'click',
                cx: rect.left + rect.width / 2,
                cy: rect.top + rect.height / 2,
                order: i
            });
        });

        seen.sort(function (a, b) {
            if (Math.abs(a.cy - b.cy) > 24) return a.cy - b.cy;
            return a.cx - b.cx;
        });

        return seen;
    }

    function emitState() {
        if (typeof onStateChange === 'function') {
            onStateChange(getPublicState());
        }
    }

    function getPublicState() {
        var total = state.targets.length;
        var active = state.focusIndex >= 0 && state.focusIndex < total ? state.targets[state.focusIndex] : null;
        return {
            mode: state.mode,
            enabled: state.mode === 'focus' && total > 0,
            targetIndex: active ? state.focusIndex : -1,
            targetId: active ? active.id : null,
            label: active ? active.label : null,
            totalTargets: total,
            profileId: state.profileId
        };
    }

    function refreshTargets(isRescan) {
        if (!isRescan) cancelRescan();

        document.querySelectorAll('[data-deck-focus-active]').forEach(function (el) {
            el.removeAttribute('data-deck-focus-active');
        });

        var slideMeta = getSlideMeta();
        var slideEl = getCurrentSlideEl();
        if (slideEl) revealSlideFragments(slideEl);

        state.profileId = slideMeta && slideMeta.focusProfile ? slideMeta.focusProfile : null;
        state.targets = state.profileId ? scanTargets(slideEl, state.profileId) : [];

        if (!isRescan) {
            state.focusIndex = -1;
        } else if (state.focusIndex >= state.targets.length) {
            state.focusIndex = state.targets.length > 0 ? state.targets.length - 1 : -1;
        }

        if (state.mode === 'focus' && state.targets.length > 0) {
            if (state.focusIndex < 0) state.focusIndex = 0;
            applyFocusVisual();
        } else if (!state.targets.length) {
            hideRing();
            if (state.mode === 'focus') state.mode = 'deck';
        }

        scheduleRescanIfNeeded(state.profileId, state.targets.length);
        emitState();
    }

    function applyFocusVisual() {
        document.querySelectorAll('[data-deck-focus-active]').forEach(function (el) {
            el.removeAttribute('data-deck-focus-active');
        });

        if (state.focusIndex < 0 || state.focusIndex >= state.targets.length) {
            hideRing();
            return;
        }

        var target = state.targets[state.focusIndex];
        target.element.setAttribute('data-deck-focus-active', 'true');
        try {
            target.element.focus({ preventScroll: true });
        } catch (e) {
            target.element.focus();
        }

        var rect = target.element.getBoundingClientRect();
        target.cx = rect.left + rect.width / 2;
        target.cy = rect.top + rect.height / 2;

        updateRing(target);

        if (state.profileId && state.profileId.indexOf('segment-arrow') === 0) {
            target.element.classList.add('segment-arrow-segment--remote-focus');
        }

        emitState();
    }

    function clearRemoteFocusClass() {
        document.querySelectorAll('.segment-arrow-segment--remote-focus').forEach(function (el) {
            el.classList.remove('segment-arrow-segment--remote-focus');
        });
    }

    function pickNeighbor(dir) {
        if (state.focusIndex < 0 || !state.targets.length) return -1;

        var current = state.targets[state.focusIndex];
        var eps = 8;
        var best = -1;
        var bestScore = Infinity;

        state.targets.forEach(function (t, i) {
            if (i === state.focusIndex) return;

            var dx = t.cx - current.cx;
            var dy = t.cy - current.cy;
            var ok = false;
            var primary;
            var secondary;

            if (dir === 'right') {
                ok = dx > eps;
                primary = dy * dy;
                secondary = dx;
            } else if (dir === 'left') {
                ok = dx < -eps;
                primary = dy * dy;
                secondary = -dx;
            } else if (dir === 'down') {
                ok = dy > eps;
                primary = dx * dx;
                secondary = dy;
            } else if (dir === 'up') {
                ok = dy < -eps;
                primary = dx * dx;
                secondary = -dy;
            }

            if (!ok) return;

            var score = primary * 1.5 + secondary;
            if (score < bestScore) {
                bestScore = score;
                best = i;
            }
        });

        return best;
    }

    function setMode(enabled) {
        if (enabled) {
            var slideEl = getCurrentSlideEl();
            if (slideEl) revealSlideFragments(slideEl);
        }

        if (enabled && state.targets.length === 0) {
            refreshTargets(false);
        }
        if (enabled && state.targets.length === 0) {
            state.mode = 'deck';
            hideRing();
            emitState();
            return false;
        }

        state.mode = enabled ? 'focus' : 'deck';
        if (enabled) {
            if (state.focusIndex < 0) state.focusIndex = 0;
            applyFocusVisual();
        } else {
            state.focusIndex = -1;
            clearRemoteFocusClass();
            hideRing();
        }
        emitState();
        return true;
    }

    function move(dir) {
        if (state.mode !== 'focus') {
            if (!setMode(true)) return getPublicState();
        }

        if (!state.targets.length) return getPublicState();

        state.targets.forEach(function (t, i) {
            if (!t.element) return;
            var rect = t.element.getBoundingClientRect();
            t.cx = rect.left + rect.width / 2;
            t.cy = rect.top + rect.height / 2;
        });

        var next = pickNeighbor(dir);
        if (next === -1) return getPublicState();

        clearRemoteFocusClass();
        state.focusIndex = next;
        applyFocusVisual();
        return getPublicState();
    }

    function confirm() {
        if (state.mode !== 'focus' || state.focusIndex < 0) {
            return getPublicState();
        }

        var target = state.targets[state.focusIndex];
        if (!target || !target.element) return getPublicState();

        var el = target.element;
        try {
            el.focus({ preventScroll: true });
        } catch (e) {
            el.focus();
        }

        if (target.action === 'click' || !target.action) {
            el.click();
        }

        global.setTimeout(function () {
            refreshTargets();
        }, 120);

        return getPublicState();
    }

    function loadNavData(url) {
        return fetch(url + (url.indexOf('?') === -1 ? '?' : '&') + 'v=' + Date.now())
            .then(function (res) {
                if (!res.ok) throw new Error('nav fetch failed');
                return res.json();
            })
            .then(function (data) {
                NAV_DATA = data;
                return data;
            });
    }

    function bindReveal(Reveal) {
        RevealRef = Reveal;
        if (!Reveal || !Reveal.on) return;

        Reveal.on('slidechanged', function () {
            clearRemoteFocusClass();
            state.mode = 'deck';
            state.focusIndex = -1;
            hideRing();
            cancelRescan();
            global.setTimeout(function () { refreshTargets(false); }, 80);
            global.setTimeout(function () { refreshTargets(true); }, 350);
        });

        Reveal.on('ready', function () {
            refreshTargets();
        });

        global.addEventListener('resize', function () {
            if (state.mode === 'focus' && state.focusIndex >= 0) {
                applyFocusVisual();
            }
        });
    }

    function init(options) {
        options = options || {};
        onStateChange = options.onStateChange || null;
        var navUrl = options.navDataUrl || '/remoteNavigator/deck-nav.json';

        return loadNavData(navUrl).then(function () {
            refreshTargets();
            return NAV_DATA;
        }).catch(function (err) {
            console.warn('[DeckFocusNav] nav load failed:', err);
            return null;
        });
    }

    global.DeckFocusNav = {
        init: init,
        bindReveal: bindReveal,
        setMode: setMode,
        move: move,
        confirm: confirm,
        refreshTargets: refreshTargets,
        getState: getPublicState,
        getSlideMeta: getSlideMeta
    };
})(window);
