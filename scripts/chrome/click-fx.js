/**
 * Shared click feedback — punch scale + monochrome ripple.
 */
(function (global) {
    'use strict';

    function playPunch(el, className) {
        if (!el) return;
        className = className || 'is-punching';
        el.classList.remove(className);
        void el.offsetWidth;
        el.classList.add(className);
        el.addEventListener('animationend', function onEnd() {
            el.classList.remove(className);
            el.removeEventListener('animationend', onEnd);
        });
    }

    function spawnRipple(el, e, options) {
        if (!el) return;
        options = options || {};
        var rippleClass = options.rippleClass || 'click-fx-ripple';
        var rippleScale = options.rippleScale != null ? options.rippleScale : 1;
        var rect = el.getBoundingClientRect();
        var ripple = document.createElement('span');
        ripple.className = rippleClass;
        var size = Math.max(rect.width, rect.height) * rippleScale;
        ripple.style.width = ripple.style.height = size + 'px';
        var clientX = e && e.clientX != null ? e.clientX : rect.left + rect.width / 2;
        var clientY = e && e.clientY != null ? e.clientY : rect.top + rect.height / 2;
        ripple.style.left = (clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (clientY - rect.top - size / 2) + 'px';
        el.appendChild(ripple);
        ripple.addEventListener('animationend', function () {
            ripple.remove();
        });
    }

    function applyClick(el, e, options) {
        playPunch(el, options && options.punchClass);
        spawnRipple(el, e, options);
    }

    global.ClickFX = {
        playPunch: playPunch,
        spawnRipple: spawnRipple,
        applyClick: applyClick
    };
})(window);
