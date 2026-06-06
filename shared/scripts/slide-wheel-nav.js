/**
 * Deck wheel navigation — custom two-tick scroll to flip slides.
 *
 * Spec: docs/guides/WHEEL_NAV_GUIDE.md
 * Call SlideWheelNav.bind() after Reveal.initialize() resolves (see main.js).
 *
 * Interactive zones must NOT stopPropagation on "wheel" — only pointer / nav keys.
 */
(function (global) {
    'use strict';

    var DEFAULTS = {
        stepThreshold: 35,
        windowMs: 1000,
        cooldownMs: 550,
        ticksRequired: 2,
        revealSelector: '.reveal',
        lightboxBodyClass: 'is-chat-lightbox-open'
    };

    var wheelBound = false;
    var focusReleaseBound = false;

    function resolveRevealRoot(selector) {
        return document.querySelector(selector);
    }

    function getRevealApi() {
        return global.Reveal;
    }

    function SlideWheelNav_bind(options) {
        if (wheelBound) return;
        var opts = Object.assign({}, DEFAULTS, options || {});
        var revealEl = resolveRevealRoot(opts.revealSelector);
        if (!revealEl) return;

        var locked = false;
        var partialDelta = 0;
        var moveCount = 0;
        var moveDir = 0;
        var moveWindowStart = 0;

        function shouldIgnoreWheel() {
            var Reveal = getRevealApi();
            if (!Reveal || !Reveal.isReady || !Reveal.isReady()) return true;
            if (opts.ignoreWhen && opts.ignoreWhen()) return true;
            if (document.body.classList.contains(opts.lightboxBodyClass)) return true;
            return locked;
        }

        function resetMoveSequence() {
            moveCount = 0;
            moveDir = 0;
            moveWindowStart = 0;
        }

        function navigateByWheel(direction) {
            var Reveal = getRevealApi();
            if (!Reveal) return;
            locked = true;
            partialDelta = 0;
            resetMoveSequence();
            if (direction > 0) {
                Reveal.next();
            } else {
                Reveal.prev();
            }
            setTimeout(function () {
                locked = false;
            }, opts.cooldownMs);
        }

        document.documentElement.addEventListener('wheel', function (e) {
            if (!revealEl.contains(e.target)) return;
            if (shouldIgnoreWheel()) return;
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

            if (partialDelta !== 0 && Math.sign(e.deltaY) !== Math.sign(partialDelta)) {
                partialDelta = e.deltaY;
            } else {
                partialDelta += e.deltaY;
            }

            if (Math.abs(partialDelta) < opts.stepThreshold) return;

            var tickDir = partialDelta > 0 ? 1 : -1;
            partialDelta = 0;

            e.preventDefault();
            e.stopPropagation();

            var now = Date.now();
            if (moveDir !== tickDir || !moveWindowStart || (now - moveWindowStart) > opts.windowMs) {
                moveDir = tickDir;
                moveCount = 1;
                moveWindowStart = now;
                return;
            }

            moveCount += 1;
            if (moveCount >= opts.ticksRequired) {
                navigateByWheel(tickDir);
            }
        }, { passive: false, capture: true });

        wheelBound = true;
    }

    function SlideWheelNav_bindInteractiveFocusRelease() {
        if (focusReleaseBound) return;
        document.addEventListener('mouseout', function (e) {
            var zone = e.target && e.target.closest && e.target.closest('.interactive-zone');
            if (!zone) return;
            var related = e.relatedTarget;
            if (related && zone.contains(related)) return;
            var focused = document.activeElement;
            if (focused && zone.contains(focused)) {
                focused.blur();
            }
        }, true);
        focusReleaseBound = true;
    }

    function bind(options) {
        SlideWheelNav_bind(options);
        SlideWheelNav_bindInteractiveFocusRelease();
    }

    global.SlideWheelNav = {
        bind: bind,
        bindWheel: SlideWheelNav_bind,
        bindInteractiveFocusRelease: SlideWheelNav_bindInteractiveFocusRelease
    };
})(window);
