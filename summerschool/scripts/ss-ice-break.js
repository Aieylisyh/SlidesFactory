/**
 * Bridge keyboard and navigation events between Reveal and the ice-break iframe.
 */
(function () {
    'use strict';

    var MESSAGE_TYPE = 'ss-ice-break-navigate';
    var FORWARDED_KEY_TYPE = 'ss-ice-break-key';
    var lastWheelNavigationAt = 0;

    function getFrame() {
        return document.querySelector('#ice-break .ss-ice-break-frame');
    }

    function getChildApi() {
        var frame = getFrame();
        if (!frame || !frame.contentWindow) return null;
        try {
            return frame.contentWindow.IceBreakRemote || null;
        } catch (error) {
            return null;
        }
    }

    window.SummerIceBreakRemote = Object.freeze({
        getState: function () {
            var api = getChildApi();
            var state = api && api.getState ? api.getState() : null;
            return {
                kind: 'ice-break',
                ready: !!state,
                visible: !!(state && state.visible),
                rolling: !!(state && state.rolling)
            };
        },
        execute: function (action) {
            var api = getChildApi();
            return !!(api && api.execute && api.execute(action));
        }
    });

    function getActiveFrame() {
        if (typeof Reveal === 'undefined' || !Reveal.isReady()) return null;
        var slide = Reveal.getCurrentSlide();
        if (!slide || slide.id !== 'ice-break') return null;
        return slide.querySelector('.ss-ice-break-frame');
    }

    function isInteractiveTarget(target) {
        return target instanceof Element && Boolean(target.closest('button, input, textarea, select, a'));
    }

    window.addEventListener('keydown', function (event) {
        var frame = getActiveFrame();
        if (!frame || event.repeat || isInteractiveTarget(event.target)) return;
        if (event.code !== 'KeyD' && event.code !== 'Space') return;

        event.preventDefault();
        event.stopImmediatePropagation();
        frame.contentWindow.postMessage({
            type: FORWARDED_KEY_TYPE,
            code: event.code,
            key: event.key
        }, '*');
    }, true);

    window.addEventListener('message', function (event) {
        var frame = getActiveFrame();
        if (!frame || event.source !== frame.contentWindow || event.data?.type !== MESSAGE_TYPE) return;

        var now = Date.now();
        if (now - lastWheelNavigationAt < 420) return;
        lastWheelNavigationAt = now;

        if (event.data.direction === 'previous') {
            Reveal.prev();
        } else if (event.data.direction === 'next') {
            Reveal.next();
        }
    });
})();
