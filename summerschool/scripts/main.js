/**
 * Summerschool deck — minimal Reveal bootstrap.
 */
(function () {
    'use strict';

    var ssTabs = null;
    var lastDimsKey = '';

    function getSlideDimensions() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        var aspect = w / h;
        var isWide16x9 = aspect >= 1.72;
        return {
            width: 1920,
            height: isWide16x9 ? 1080 : 1200,
            margin: 0.02
        };
    }

    function dimsKey(dims) {
        return dims.width + 'x' + dims.height + '@' + dims.margin;
    }

    function applyViewportVars(dims) {
        document.documentElement.style.setProperty('--slide-width', String(dims.width));
        document.documentElement.style.setProperty('--slide-height', String(dims.height));
    }

    function enforceSlideDimensions(dims) {
        var d = dims || getSlideDimensions();
        document.querySelectorAll('.reveal .slides section').forEach(function (sec) {
            sec.style.setProperty('width', d.width + 'px', 'important');
            sec.style.setProperty('height', d.height + 'px', 'important');
        });
    }

    function isLeafSlide(section) {
        return !section.querySelector(':scope > section');
    }

    function injectSlideBrandLogos() {
        document.querySelectorAll('.reveal .slides section').forEach(function (sec) {
            if (!isLeafSlide(sec)) return;
            if (sec.querySelector(':scope > .slide-brand-logo')) return;
            var wrap = document.createElement('div');
            wrap.className = 'slide-brand-logo';
            wrap.setAttribute('aria-hidden', 'true');
            var img = document.createElement('img');
            img.loading = 'lazy';
            img.decoding = 'async';
            img.src = '../assets/logos/DMA-logo-black.png';
            img.alt = '';
            wrap.appendChild(img);
            sec.insertBefore(wrap, sec.firstChild);
        });
    }

    function bindDeckNavCluster() {
        var reveal = document.querySelector('.reveal');
        if (!reveal || reveal.querySelector('.deck-nav-cluster')) return;

        var controls = reveal.querySelector('.controls');
        var slideNumber = reveal.querySelector('.slide-number');
        if (!controls || !slideNumber) return;

        var left = controls.querySelector('.navigate-left');
        var right = controls.querySelector('.navigate-right');
        if (!left || !right) return;

        var cluster = document.createElement('div');
        cluster.className = 'deck-nav-cluster';
        cluster.appendChild(left);
        cluster.appendChild(slideNumber);
        cluster.appendChild(right);
        controls.appendChild(cluster);
    }

    function initSummerTabs(slide) {
        if (!slide || !slide.hasAttribute('data-ss-tabs') || typeof SummerTabs === 'undefined') {
            return;
        }
        var root = slide.querySelector('[data-ss-tabs-root]');
        if (!root) return;
        if (!root._ready) {
            ssTabs = new SummerTabs(root);
            root._ready = true;
        } else if (ssTabs) {
            ssTabs.reset();
        }
    }

    function initSummerSchedule(slide) {
        if (!slide || !slide.hasAttribute('data-ss-schedule') || typeof SummerSchedule === 'undefined') {
            return;
        }
        SummerSchedule.initSlide(slide);
    }

    function resetSummerSchedule(slide) {
        if (typeof SummerSchedule !== 'undefined') {
            SummerSchedule.reset(slide);
        }
    }

    function resetSlidePresentation(slide) {
        if (!slide) return;
        var layer = slide.querySelector('.slide-content-layer');
        if (layer) {
            layer.style.removeProperty('opacity');
            layer.style.removeProperty('transform');
            layer.style.removeProperty('filter');
            layer.style.removeProperty('clip-path');
            layer.style.removeProperty('visibility');
            layer.style.removeProperty('-webkit-mask-position');
            layer.style.removeProperty('mask-position');
            layer.classList.remove(
                'tx-layer-active', 'tx-flip-host', 'tx-blur-wipe', 'tx-neon',
                'tx-depth-host', 'tx-melt', 'tx-chroma', 'tx-glitching'
            );
        }
        slide.querySelectorAll('.tx-fx-overlay-root').forEach(function (node) {
            node.remove();
        });
    }

    function initSlideModules(slide) {
        initSummerTabs(slide);
        initSummerSchedule(slide);
    }

    function bootCurrentSlideModules() {
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                initSlideModules(Reveal.getCurrentSlide());
            });
        });
    }

    function bindSlideHooks() {
        Reveal.on('slidechanged', function (event) {
            resetSummerSchedule(event.previousSlide);
            resetSlidePresentation(event.previousSlide);
            resetSlidePresentation(event.currentSlide);
            initSlideModules(event.currentSlide);
        });
        Reveal.on('ready', function (event) {
            resetSlidePresentation(event.currentSlide);
        });
    }

    function initReveal() {
        injectSlideBrandLogos();
        var dims = getSlideDimensions();
        lastDimsKey = dimsKey(dims);
        applyViewportVars(dims);

        var shareLocked = typeof ShareLock !== 'undefined' && ShareLock.isActive();
        var shareOverrides = shareLocked ? ShareLock.getRevealConfigOverrides() : {};
        var plugins = typeof RevealNotes !== 'undefined' ? [RevealNotes] : [];
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
            keyboard: { 38: null, 40: null },
            plugins: plugins
        };

        Object.keys(shareOverrides).forEach(function (key) {
            revealConfig[key] = shareOverrides[key];
        });

        Reveal.initialize(revealConfig).then(function () {
            Reveal.layout();
            enforceSlideDimensions(dims);
            Reveal.layout();
            if (!shareLocked) {
                bindDeckNavCluster();
            }
            bindSlideHooks();
            if (!shareLocked && typeof SlideWheelNav !== 'undefined') {
                SlideWheelNav.bind({
                    ignoreWhen: function () {
                        if (typeof PortraitDeckAdapt !== 'undefined' && PortraitDeckAdapt.isPortrait()) {
                            return true;
                        }
                        return document.body.classList.contains('is-ss-schedule-modal-open');
                    }
                });
            }
            if (typeof PortraitDeckAdapt !== 'undefined') {
                PortraitDeckAdapt.bind(Reveal);
            }
            if (shareLocked && typeof ShareLock !== 'undefined') {
                ShareLock.applyAfterReady(Reveal);
            }
            bootCurrentSlideModules();
            if (!shareLocked && typeof SlideProgress !== 'undefined') {
                SlideProgress.init(Reveal);
            }
        }).catch(function (err) {
            console.error('[Reveal] initialize failed:', err);
        });

        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                var next = getSlideDimensions();
                applyViewportVars(next);
                if (!Reveal.isReady()) return;
                if (dimsKey(next) !== lastDimsKey) {
                    lastDimsKey = dimsKey(next);
                    Reveal.configure({
                        width: next.width,
                        height: next.height,
                        margin: next.margin
                    });
                }
                enforceSlideDimensions(next);
                Reveal.layout();
            }, 120);
        });
    }

    function boot() {
        if (!document.querySelector('.reveal')) return;
        if (typeof PortraitDeckAdapt !== 'undefined') {
            PortraitDeckAdapt.init();
        }
        function startReveal() {
            if (typeof SummerI18n !== 'undefined') {
                SummerI18n.init().then(initReveal).catch(initReveal);
            } else {
                initReveal();
            }
        }
        if (typeof ShareLock !== 'undefined') {
            ShareLock.init().then(function () {
                if (document.querySelector('.reveal')) {
                    startReveal();
                }
            });
            return;
        }
        startReveal();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
