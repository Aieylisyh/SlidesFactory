/**
 * Per-slide module init/teardown on slidechanged.
 */
(function (global) {
    'use strict';

    var SFK = global.SFKDeck = global.SFKDeck || {};
    var scheduleFitSlidePageTitles = SFK.scheduleFitSlidePageTitles;

    var matchGame = null;
    var majorPicker = null;
    var portfolioAxis = null;
    var segmentArrow = null;
    var salaryToggle = null;
    var salaryEcharts = null;
    var meshChipAttractCleanup = null;

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
            if (scheduleFitSlidePageTitles) {
                scheduleFitSlidePageTitles();
            }
            if (typeof ChatLightbox !== 'undefined') {
                ChatLightbox.bindChatShots(event.currentSlide);
            }
        });
    }

    SFK.bindCaseCards = bindCaseCards;
    SFK.bindSlideHooks = bindSlideHooks;
    SFK.bootCurrentSlideModules = bootCurrentSlideModules;
})(window);
