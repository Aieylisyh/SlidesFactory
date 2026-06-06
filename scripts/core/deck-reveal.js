/**
 * Reveal.js initialize, resize, and post-ready chrome binding.
 */
(function (global) {
    'use strict';

    var SFK = global.SFKDeck = global.SFKDeck || {};
    var lastDimsKey = '';

    function initReveal() {
        SFK.injectSlideBrandLogos();
        var dims = SFK.getSlideDimensions();
        lastDimsKey = SFK.dimsKey(dims);
        SFK.applyViewportVars(dims);

        var shareLocked = typeof ShareLock !== 'undefined' && ShareLock.isActive();
        var shareOverrides = shareLocked ? ShareLock.getRevealConfigOverrides() : {};
        var defaultPlugins = typeof RevealNotes !== 'undefined' ? [RevealNotes] : [];
        var revealConfig = {
            hash: true,
            progress: true,
            slideNumber: 'c/t',
            transition: 'none',
            backgroundTransition: 'fade',
            navigationMode: 'linear',
            width: dims.width,
            height: dims.height,
            margin: dims.margin,
            center: true,
            view: 'slide',
            scrollActivationWidth: null,
            minScale: 0.2,
            maxScale: 2.5,
            keyboard: {
                38: null,
                40: null
            },
            plugins: defaultPlugins
        };

        Object.keys(shareOverrides).forEach(function (key) {
            revealConfig[key] = shareOverrides[key];
        });

        Reveal.initialize(revealConfig).then(function () {
            Reveal.layout();
            SFK.enforceSlideDimensions(dims);
            Reveal.layout();
            if (!shareLocked) {
                SFK.bindDeckNavCluster();
            }
            SFK.bindCaseCards();
            SFK.bindSlideHooks();
            if (!shareLocked && typeof SlideWheelNav !== 'undefined') {
                SlideWheelNav.bind({
                    ignoreWhen: function () {
                        return typeof PortraitDeckAdapt !== 'undefined' &&
                            PortraitDeckAdapt.isPortrait();
                    }
                });
            }
            if (typeof PortraitDeckAdapt !== 'undefined') {
                PortraitDeckAdapt.bind(Reveal);
            }
            if (shareLocked && typeof ShareLock !== 'undefined') {
                ShareLock.applyAfterReady(Reveal);
            }
            SFK.bootCurrentSlideModules();
            SFK.scheduleFitSlidePageTitles();
            if (typeof ChatLightbox !== 'undefined') {
                ChatLightbox.init();
            }
            if (typeof SlideTransitionFX !== 'undefined') {
                SlideTransitionFX.bind(Reveal);
            }
            if (!shareLocked && typeof SlideProgress !== 'undefined') {
                SlideProgress.init(Reveal);
            }
        }).catch(function (err) {
            console.error('[Reveal] initialize failed:', err);
        });

        var resizeTimer;
        global.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                var next = SFK.getSlideDimensions();
                SFK.applyViewportVars(next);
                if (!Reveal.isReady()) return;
                if (SFK.dimsKey(next) !== lastDimsKey) {
                    lastDimsKey = SFK.dimsKey(next);
                    Reveal.configure({
                        width: next.width,
                        height: next.height,
                        margin: next.margin
                    });
                }
                SFK.enforceSlideDimensions(next);
                Reveal.layout();
                SFK.scheduleFitSlidePageTitles();
            }, 120);
        });
    }

    SFK.initReveal = initReveal;
})(window);
