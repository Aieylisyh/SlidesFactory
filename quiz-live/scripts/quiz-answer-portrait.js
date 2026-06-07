/**
 * quiz-answer portrait lock — force vertical viewport; no landscape layout.
 * Spec: docs/guides/QUIZ_LIVE_GUIDE.md § 观众端竖屏
 */
(function (global) {
    'use strict';

    var LANDSCAPE_RATIO = 1.02;
    var lockAttempted = false;

    function isQueryAllowLandscape() {
        try {
            return new URLSearchParams(global.location.search).get('landscape') === '1';
        } catch (err) {
            return false;
        }
    }

    function isLandscape() {
        if (isQueryAllowLandscape()) return false;
        var w = global.innerWidth;
        var h = global.innerHeight;
        if (!w || !h) return false;
        return w / h >= LANDSCAPE_RATIO;
    }

    function tryLockPortrait() {
        if (lockAttempted || isQueryAllowLandscape()) return;
        lockAttempted = true;
        try {
            var orientation = global.screen && global.screen.orientation;
            if (orientation && typeof orientation.lock === 'function') {
                orientation.lock('portrait').catch(function () {
                    lockAttempted = false;
                });
            }
        } catch (err) {
            lockAttempted = false;
        }
    }

    function update() {
        var html = document.documentElement;
        if (!html.classList.contains('ql-answer-page')) return;
        var landscape = isLandscape();
        html.classList.toggle('ql-answer-landscape', landscape);
        var overlay = document.querySelector('[data-orientation-lock]');
        if (overlay) {
            overlay.classList.toggle('ql-hidden', !landscape);
            overlay.setAttribute('aria-hidden', landscape ? 'false' : 'true');
        }
        if (!landscape) tryLockPortrait();
    }

    function bindInteractionLock() {
        var events = ['touchstart', 'click'];
        events.forEach(function (name) {
            document.addEventListener(name, tryLockPortrait, { once: true, passive: true });
        });
    }

    function init() {
        if (!document.documentElement.classList.contains('ql-answer-page')) return;
        update();
        bindInteractionLock();
        tryLockPortrait();
        global.addEventListener('resize', update);
        global.addEventListener('orientationchange', function () {
            setTimeout(update, 120);
        });
    }

    global.QuizAnswerPortrait = {
        init: init,
        update: update,
        isLandscape: isLandscape
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window);
