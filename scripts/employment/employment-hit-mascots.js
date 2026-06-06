/**
 * Employment hits slide — click vector mascots (Wukong / Nezha style) to play CSS animations.
 */
(function (global) {
    'use strict';

    var ACTING_CLASS = {
        wukong: 'is-wukong-acting',
        nezha: 'is-nezha-acting'
    };

    function stopRevealNav(e) {
        e.stopPropagation();
    }

    function stopRevealNavKeys(e) {
        var keys = [' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'];
        if (keys.indexOf(e.key) !== -1) {
            e.stopPropagation();
            e.preventDefault();
        }
    }

    function playMascot(btn) {
        var kind = btn.getAttribute('data-hit-mascot');
        var cls = ACTING_CLASS[kind];
        if (!cls) return;

        Object.keys(ACTING_CLASS).forEach(function (k) {
            btn.classList.remove(ACTING_CLASS[k]);
        });
        void btn.offsetWidth;
        btn.classList.add(cls);
        btn.setAttribute('aria-pressed', 'true');
    }

    function bindMascot(btn) {
        if (!btn || btn._mascotBound) return;
        btn._mascotBound = true;

        btn.addEventListener('mousedown', stopRevealNav);
        btn.addEventListener('mouseup', stopRevealNav);
        btn.addEventListener('click', function (e) {
            stopRevealNav(e);
            if (typeof ClickFX !== 'undefined') {
                ClickFX.playPunch(btn, 'is-punching-mascot');
                ClickFX.spawnRipple(btn, e, {
                    rippleScale: 0.25,
                    rippleClass: 'click-fx-ripple click-fx-ripple--mascot'
                });
            }
            playMascot(btn);
        });
        btn.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                stopRevealNav(e);
                e.preventDefault();
                playMascot(btn);
            } else {
                stopRevealNavKeys(e);
            }
        });
        btn.addEventListener('animationend', function (e) {
            if (e.target !== btn) return;
            Object.keys(ACTING_CLASS).forEach(function (k) {
                btn.classList.remove(ACTING_CLASS[k]);
            });
            btn.setAttribute('aria-pressed', 'false');
        });
    }

    function initSlide(slide) {
        if (!slide) return;
        slide.querySelectorAll('[data-hit-mascot]').forEach(bindMascot);
    }

    function resetSlide(slide) {
        if (!slide) return;
        slide.querySelectorAll('[data-hit-mascot]').forEach(function (btn) {
            Object.keys(ACTING_CLASS).forEach(function (k) {
                btn.classList.remove(ACTING_CLASS[k]);
            });
            btn.setAttribute('aria-pressed', 'false');
        });
    }

    global.EmploymentHitMascots = {
        initSlide: initSlide,
        reset: resetSlide
    };
})(window);
