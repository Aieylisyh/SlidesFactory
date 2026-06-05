/**
 * Reveal.js init, case cards & lazy slide hooks.
 */
(function () {
    'use strict';

    var matchGame = null;
    var majorPicker = null;
    var portfolioAxis = null;
    var segmentArrow = null;
    var salaryToggle = null;
    var salaryEcharts = null;
    var meshChipAttractCleanup = null;
    var lastDimsKey = '';

    /**
     * Match logical canvas to viewport aspect ratio:
     * - 16:10 (2560×1600, 1920×1200) → 1920×1200
     * - 16:9  (1920×1080, 2560×1440) → 1920×1080
     */
    function getSlideDimensions() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        var aspect = w / h;
        var isWide16x9 = aspect >= 1.72;
        var height = isWide16x9 ? 1080 : 1200;
        return {
            width: 1920,
            height: height,
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

    function isUnifiedTitleH2(h2) {
        var slide = h2.closest('section');
        if (!slide || !slide.classList.contains('content-slide')) return false;
        if (slide.classList.contains('section-opener') ||
            slide.classList.contains('slide-closing') ||
            slide.classList.contains('title-slide') ||
            slide.classList.contains('slide-agenda')) {
            return false;
        }
        var layer = slide.querySelector(':scope > .slide-content-layer');
        if (!layer) return false;
        var header = layer.querySelector(':scope > .slide-page-header');
        if (header && header.querySelector(':scope > h2') === h2) return true;
        return layer.querySelector(':scope > h2:first-child') === h2;
    }

    function measureTitleFontBounds(h2, maxTextH) {
        h2.style.setProperty('--slide-title-fit-size', 'var(--slide-title-font-max)');
        var cssStyles = getComputedStyle(h2);
        var hiFromToken = parseFloat(cssStyles.fontSize) || 40;
        var lhPx = parseFloat(cssStyles.lineHeight);
        if (isNaN(lhPx)) {
            lhPx = hiFromToken * 1.08;
        }
        var lhRatio = Math.max(lhPx / hiFromToken, 1);
        h2.style.setProperty('--slide-title-fit-size', 'var(--slide-title-font-min)');
        var lo = parseFloat(getComputedStyle(h2).fontSize) || 24;
        h2.style.removeProperty('--slide-title-fit-size');
        var hiFromHeight = maxTextH > 0 ? maxTextH / lhRatio : hiFromToken;
        return { lo: lo, hi: Math.max(hiFromToken, hiFromHeight) };
    }

    function titleFitsConstraints(h2, fontPx, maxW, maxScrollH) {
        h2.style.setProperty('--slide-title-fit-size', fontPx + 'px');
        h2.style.display = 'block';
        h2.style.whiteSpace = 'nowrap';
        var widthOk = h2.scrollWidth <= maxW + 0.5;
        var heightOk = h2.scrollHeight <= maxScrollH + 0.5;
        h2.style.whiteSpace = '';
        if (widthOk && heightOk) {
            h2.style.display = '';
            return true;
        }

        h2.style.whiteSpace = 'normal';
        widthOk = h2.scrollWidth <= maxW + 0.5;
        heightOk = h2.scrollHeight <= maxScrollH + 0.5;
        h2.style.whiteSpace = '';
        h2.style.display = '';
        return widthOk && heightOk;
    }

    function fitSlidePageTitle(h2) {
        if (!isUnifiedTitleH2(h2)) return;

        var layer = h2.closest('.slide-content-layer');
        if (!layer || layer.clientWidth <= 0) return;
        var maxW = layer.clientWidth * 0.7;

        var styles = getComputedStyle(h2);
        var zoneH = parseFloat(styles.height) || 0;
        var gap = parseFloat(styles.paddingBottom) || 0;
        var border = parseFloat(styles.borderBottomWidth) || 0;
        var maxScrollH = Math.max(0, zoneH - border);
        var maxTextH = Math.max(0, zoneH - gap - border);
        var bounds = measureTitleFontBounds(h2, maxTextH);

        h2.style.removeProperty('--slide-title-fit-size');
        if (titleFitsConstraints(h2, bounds.hi, maxW, maxScrollH)) {
            if (bounds.hi > bounds.lo + 0.5) {
                h2.style.setProperty('--slide-title-fit-size', Math.round(bounds.hi) + 'px');
            }
            return;
        }

        var best = bounds.lo;
        var low = Math.floor(bounds.lo);
        var high = Math.ceil(bounds.hi);
        while (low <= high) {
            var mid = Math.floor((low + high) / 2);
            if (titleFitsConstraints(h2, mid, maxW, maxScrollH)) {
                best = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        if (best >= bounds.hi - 0.5) {
            h2.style.setProperty('--slide-title-fit-size', Math.round(best) + 'px');
        } else {
            h2.style.setProperty('--slide-title-fit-size', best + 'px');
        }
    }

    function fitSlidePageTitles() {
        document.querySelectorAll(
            '.reveal .content-slide .slide-content-layer > h2:first-child,' +
            '.reveal .content-slide .slide-page-header > h2'
        ).forEach(fitSlidePageTitle);
    }

    function scheduleFitSlidePageTitles() {
        requestAnimationFrame(function () {
            requestAnimationFrame(fitSlidePageTitles);
        });
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
            img.src = 'assets/logos/DMA-logo-black.png';
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

    function initReveal() {
        injectSlideBrandLogos();
        var dims = getSlideDimensions();
        lastDimsKey = dimsKey(dims);
        applyViewportVars(dims);

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
            enforceSlideDimensions(dims);
            Reveal.layout();
            if (!shareLocked) {
                bindDeckNavCluster();
            }
            bindCaseCards();
            bindSlideHooks();
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
            bootCurrentSlideModules();
            scheduleFitSlidePageTitles();
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
                scheduleFitSlidePageTitles();
            }, 120);
        });
    }

    function navigateToSlide(target) {
        if (typeof ShareLock !== 'undefined' && ShareLock.isActive()) return;
        if (!target || !Reveal.isReady()) return;
        if (target.indexOf('#/') === 0) {
            var slideId = target.slice(2);
            var el = document.getElementById(slideId);
            if (el) {
                var indices = Reveal.getIndices(el);
                Reveal.slide(indices.h, indices.v);
                return;
            }
        }
        Reveal.slide(target);
    }

    function bindCaseCards() {
        var cards = document.querySelectorAll('[data-case-card]');
        cards.forEach(function (card) {
            card.addEventListener('click', function (e) {
                e.stopPropagation();
                if (typeof ClickFX !== 'undefined') {
                    ClickFX.applyClick(card, e);
                }
                cards.forEach(function (c) { c.classList.remove('is-active'); });
                card.classList.add('is-active');
                navigateToSlide(card.getAttribute('data-goto'));
            });
        });
    }

    function clearMeshChipAttract() {
        if (meshChipAttractCleanup) {
            meshChipAttractCleanup();
            meshChipAttractCleanup = null;
        }
    }

    function getSlideMeshGrid(slide) {
        if (!slide) return null;
        var host = slide.querySelector('[data-surround-mesh-grid]');
        return host && host._surroundMeshGrid && host._surroundMeshGrid.grid
            ? host._surroundMeshGrid.grid
            : null;
    }

    function initMeshChipAttract(slide) {
        clearMeshChipAttract();
        if (!slide || !slide.hasAttribute('data-mesh-chip-attract')) return;

        var pool = slide.querySelector('[data-major-pool]');
        var grid = getSlideMeshGrid(slide);
        if (!pool || !grid || !grid.setAttractPoints) return;

        var canvasHost = slide.querySelector('[data-surround-mesh-grid-canvas]');
        if (!canvasHost) return;
        var canvasWrap = canvasHost.parentElement;

        function canvasPointFromClient(clientX, clientY) {
            var rect = canvasWrap.getBoundingClientRect();
            return {
                x: clientX - rect.left,
                y: clientY - rect.top,
                strength: 1
            };
        }

        function onPoolMove(e) {
            var chip = e.target.closest('.major-pick-chip');
            if (!chip) {
                grid.setAttractPoints([]);
                return;
            }
            var rect = chip.getBoundingClientRect();
            grid.setAttractPoints([canvasPointFromClient(
                rect.left + rect.width / 2,
                rect.top + rect.height / 2
            )]);
        }

        function onPoolLeave() {
            grid.setAttractPoints([]);
        }

        pool.addEventListener('mousemove', onPoolMove);
        pool.addEventListener('mouseleave', onPoolLeave);
        meshChipAttractCleanup = function () {
            pool.removeEventListener('mousemove', onPoolMove);
            pool.removeEventListener('mouseleave', onPoolLeave);
            grid.setAttractPoints([]);
        };
    }

    function initMatchGame(slide) {
        if (!slide || !slide.hasAttribute('data-match-game') || typeof CaseMatchGame === 'undefined') {
            return;
        }
        var zone = slide.querySelector('[data-case-match-root]');
        if (!zone) return;
        if (!zone._gameReady) {
            matchGame = new CaseMatchGame(zone);
            zone._gameReady = true;
        } else if (matchGame) {
            matchGame.reset();
        }
    }

    function initMajorPicker(slide) {
        if (!slide || !slide.hasAttribute('data-major-picker') || typeof MajorPicker === 'undefined') {
            return;
        }
        var root = slide.querySelector('[data-major-picker-root]');
        if (!root) return;
        if (!root._ready) {
            majorPicker = new MajorPicker(root);
            root._ready = true;
        } else if (majorPicker) {
            majorPicker.reset();
        }
    }

    function initPortfolioAxis(slide) {
        if (!slide || !slide.hasAttribute('data-portfolio-axis') || typeof PortfolioAxisPicker === 'undefined') {
            return;
        }
        var root = slide.querySelector('[data-portfolio-axis-root]');
        if (!root) return;
        if (!root._ready) {
            portfolioAxis = new PortfolioAxisPicker(root);
            root._ready = true;
        } else if (portfolioAxis) {
            portfolioAxis.reset();
        }
    }

    function initSegmentArrow(slide) {
        if (!slide || !slide.hasAttribute('data-segment-arrow') || typeof SegmentArrow === 'undefined') {
            return;
        }
        var root = slide.querySelector('[data-segment-arrow-root]');
        if (!root) return;
        if (!root._ready) {
            segmentArrow = new SegmentArrow(root);
            root._ready = true;
        } else if (segmentArrow) {
            segmentArrow.reset();
        }
    }

    function initGrowthTimeline(slide) {
        initSegmentArrow(slide);
    }

    function initSalaryEcharts(slide) {
        if (!slide || !slide.hasAttribute('data-salary-echarts') || typeof SalaryEcharts === 'undefined') {
            return;
        }
        var root = slide.querySelector('[data-salary-echarts-root]');
        if (!root) return;
        if (!root._ready) {
            salaryEcharts = new SalaryEcharts(root);
            root._ready = true;
        } else if (salaryEcharts) {
            salaryEcharts.reset();
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    salaryEcharts.resize();
                });
            });
        }
    }

    function initSalaryToggle(slide) {
        if (!slide || !slide.hasAttribute('data-salary-toggle') || typeof SalaryToggle === 'undefined') {
            return;
        }
        var root = slide.querySelector('[data-salary-toggle-root]');
        if (!root) return;
        if (!root._ready) {
            salaryToggle = new SalaryToggle(root);
            root._ready = true;
        } else if (salaryToggle) {
            salaryToggle.reset();
        }
    }

    function initBilibiliEmbed(slide) {
        if (!slide || !slide.hasAttribute('data-bilibili-embed') || typeof BilibiliEmbed === 'undefined') {
            return;
        }
        BilibiliEmbed.initSlide(slide);
    }

    function teardownBilibiliEmbed(slide) {
        if (!slide || typeof BilibiliEmbed === 'undefined') return;
        BilibiliEmbed.teardownSlide(slide);
    }

    function initEmploymentHitSources(slide) {
        if (!slide || !slide.hasAttribute('data-employment-hit-sources') || typeof EmploymentHitSources === 'undefined') {
            return;
        }
        if (!slide._employmentHitSourcesReady) {
            EmploymentHitSources.initSlide(slide);
            slide._employmentHitSourcesReady = true;
        } else {
            EmploymentHitSources.reset(slide);
            EmploymentHitSources.initSlide(slide);
        }
    }

    function initEmploymentHitMascots(slide) {
        if (!slide || !slide.hasAttribute('data-employment-hit-sources') || typeof EmploymentHitMascots === 'undefined') {
            return;
        }
        if (!slide._employmentHitMascotsReady) {
            EmploymentHitMascots.initSlide(slide);
            slide._employmentHitMascotsReady = true;
        } else {
            EmploymentHitMascots.reset(slide);
            EmploymentHitMascots.initSlide(slide);
        }
    }

    function initSlideModules(slide) {
        initMatchGame(slide);
        initMajorPicker(slide);
        initPortfolioAxis(slide);
        initSegmentArrow(slide);
        initSalaryToggle(slide);
        initSalaryEcharts(slide);
        initEmploymentHitSources(slide);
        initEmploymentHitMascots(slide);
        initBilibiliEmbed(slide);
        if (typeof SurroundMeshGrid !== 'undefined') {
            SurroundMeshGrid.stopAllExcept(slide);
            SurroundMeshGrid.initSlide(slide);
        }
        if (slide && slide.hasAttribute('data-mesh-chip-attract')) {
            requestAnimationFrame(function () {
                initMeshChipAttract(slide);
            });
        } else {
            clearMeshChipAttract();
        }
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
            teardownBilibiliEmbed(event.previousSlide);
            if (typeof EmploymentHitSources !== 'undefined') {
                if (!event.currentSlide || !event.currentSlide.hasAttribute('data-employment-hit-sources')) {
                    EmploymentHitSources.reset();
                }
            }
            if (typeof EmploymentHitMascots !== 'undefined') {
                if (!event.currentSlide || !event.currentSlide.hasAttribute('data-employment-hit-sources')) {
                    EmploymentHitMascots.reset(event.previousSlide);
                }
            }
            initSlideModules(event.currentSlide);
            scheduleFitSlidePageTitles();
            if (typeof ChatLightbox !== 'undefined') {
                ChatLightbox.bindChatShots(event.currentSlide);
            }
        });
    }

    function boot() {
        if (!document.querySelector('.reveal')) return;
        if (typeof PortraitDeckAdapt !== 'undefined') {
            PortraitDeckAdapt.init();
        }
        if (typeof ShareLock !== 'undefined') {
            ShareLock.init().then(function () {
                if (document.querySelector('.reveal')) {
                    initReveal();
                }
            });
            return;
        }
        initReveal();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
