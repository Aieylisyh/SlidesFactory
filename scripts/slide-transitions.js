/**
 * Per-slide custom enter transitions.
 * Each leaf slide gets a unique effect.
 */
(function (global) {
    'use strict';

    var FX_LIST = [
        { id: 'fade-up', label: '01 · 逐层上浮' },
        { id: 'glitch', label: '02 · 故障切片' },
        { id: 'zoom-blur', label: '03 · 电影变焦' },
        { id: 'curtain', label: '04 · 幕布揭幕' },
        { id: 'circle', label: '05 · 圆形扩散' },
        { id: 'flip-y', label: '06 · 3D 翻转' },
        { id: 'elastic', label: '07 · 弹性弹出' },
        { id: 'skew', label: '08 · 斜切滑入' },
        { id: 'split-x', label: '09 · 中线裂开' },
        { id: 'scanline', label: '10 · 扫描线' },
        { id: 'chroma', label: '11 · 色差冲击' },
        { id: 'slide-left', label: '12 · 横向冲刺' },
        { id: 'rotate-in', label: '13 · 旋转落定' },
        { id: 'blur-wipe', label: '14 · 模糊擦除' },
        { id: 'pixel-grid', label: '15 · 像素网格' },
        { id: 'neon', label: '16 · 霓虹闪烁' },
        { id: 'depth', label: '17 · 纵深叠入' },
        { id: 'ripple', label: '18 · 水波涟漪' },
        { id: 'shatter', label: '19 · 碎片聚合' },
        { id: 'melt', label: '20 · 熔融滴落' }
    ];

    var overlayRoot = null;
    var activeCleanup = null;
    var assigned = false;

    function prefersReducedMotion() {
        return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function getLeafSlides() {
        var slides = [];
        document.querySelectorAll('.reveal .slides section').forEach(function (sec) {
            if (sec.querySelector(':scope > section')) return;
            slides.push(sec);
        });
        return slides;
    }

    var KEY_FX = ['zoom-blur', 'curtain', 'flip-y'];
    var NORMAL_FX = ['depth', 'blur-wipe', 'chroma'];
    /** Legacy fixed pages — prefer data-transition-key on sections */
    var FIXED_KEY_PAGES = {};

    function getFxMeta(fxId) {
        for (var i = 0; i < FX_LIST.length; i += 1) {
            if (FX_LIST[i].id === fxId) return FX_LIST[i];
        }
        return FX_LIST[0];
    }

    function assignEffects() {
        if (assigned) return;
        var slides = getLeafSlides();
        var normalIndex = 0;
        var keyRotateIndex = 0;

        slides.forEach(function (slide, index) {
            var page = index + 1;
            var fxId;

            if (slide.hasAttribute('data-transition-skip')) {
                slide.setAttribute('data-transition-fx', 'none');
                return;
            }

            if (slide.getAttribute('data-transition-key')) {
                fxId = slide.getAttribute('data-transition-key');
            } else if (FIXED_KEY_PAGES[page]) {
                fxId = FIXED_KEY_PAGES[page];
            } else if (slide.getAttribute('data-transition-tier') === 'key') {
                fxId = KEY_FX[keyRotateIndex % KEY_FX.length];
                keyRotateIndex += 1;
            } else {
                fxId = NORMAL_FX[normalIndex % NORMAL_FX.length];
                normalIndex += 1;
            }

            var fx = getFxMeta(fxId);
            slide.setAttribute('data-transition-fx', fx.id);
            slide.setAttribute('data-transition-label', fx.label);
        });
        assigned = true;
    }

    function getLayer(slide) {
        return slide.querySelector('.slide-content-layer') || slide;
    }

    function resetSlide(slide) {
        if (!slide) return;
        var layer = getLayer(slide);
        layer.classList.remove('tx-layer-active');
        layer.style.removeProperty('transform');
        layer.style.removeProperty('filter');
        layer.style.removeProperty('opacity');
        layer.style.removeProperty('clip-path');
        layer.style.removeProperty('perspective');
        layer.style.removeProperty('will-change');
        slide.querySelectorAll('.tx-fx-child').forEach(function (node) {
            node.classList.remove('tx-fx-child');
            node.style.removeProperty('transform');
            node.style.removeProperty('opacity');
            node.style.removeProperty('filter');
            node.style.removeProperty('clip-path');
        });
        slide.querySelectorAll('.tx-fx-overlay').forEach(function (node) {
            node.remove();
        });
    }

    function cleanupActive() {
        if (typeof activeCleanup === 'function') {
            activeCleanup();
            activeCleanup = null;
        }
        if (overlayRoot) {
            overlayRoot.innerHTML = '';
        }
    }

    function ensureOverlayRoot(slide) {
        var host = slide.querySelector('.tx-fx-overlay-root');
        if (!host) {
            host = document.createElement('div');
            host.className = 'tx-fx-overlay-root';
            slide.insertBefore(host, slide.firstChild);
        }
        overlayRoot = host;
        return host;
    }

    function animate(el, keyframes, options) {
        if (!el || !el.animate) return null;
        var anim = el.animate(keyframes, options);
        return anim;
    }

    function staggerChildren(layer, keyframes, options, delayStep) {
        var children = Array.prototype.slice.call(layer.children);
        if (!children.length) children = [layer];
        var anims = [];
        children.forEach(function (child, i) {
            child.classList.add('tx-fx-child');
            var anim = animate(child, keyframes, Object.assign({}, options, {
                delay: (options.delay || 0) + i * (delayStep || 70)
            }));
            if (anim) anims.push(anim);
        });
        return anims;
    }

    function runSimple(layer, keyframes, options) {
        layer.classList.add('tx-layer-active');
        var anim = animate(layer, keyframes, options);
        return function () {
            if (anim) anim.cancel();
        };
    }

    var EFFECTS = {
        'fade-up': function (slide) {
            var layer = getLayer(slide);
            var anims = staggerChildren(layer,
                [
                    { opacity: 0, transform: 'translateY(48px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ],
                { duration: 620, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' },
                85
            );
            return function () { anims.forEach(function (a) { if (a) a.cancel(); }); };
        },

        glitch: function (slide) {
            var layer = getLayer(slide);
            layer.classList.add('tx-layer-active', 'tx-glitching');
            var anim = animate(layer, [
                { transform: 'translate(0,0)', filter: 'none' },
                { transform: 'translate(-6px,2px)', filter: 'hue-rotate(90deg) saturate(2)' },
                { transform: 'translate(5px,-3px)', filter: 'hue-rotate(-40deg)' },
                { transform: 'translate(-3px,1px)', filter: 'none' },
                { transform: 'translate(0,0)', filter: 'none' }
            ], { duration: 520, easing: 'steps(4, end)', fill: 'both' });
            var timer = setTimeout(function () {
                layer.classList.remove('tx-glitching');
            }, 540);
            return function () {
                clearTimeout(timer);
                layer.classList.remove('tx-glitching');
                if (anim) anim.cancel();
            };
        },

        'zoom-blur': function (slide) {
            return runSimple(getLayer(slide), [
                { opacity: 0, transform: 'scale(1.14)', filter: 'blur(18px)' },
                { opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }
            ], { duration: 780, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' });
        },

        curtain: function (slide) {
            var host = ensureOverlayRoot(slide);
            var curtain = document.createElement('div');
            curtain.className = 'tx-fx-overlay tx-curtain';
            host.appendChild(curtain);
            var anim = animate(curtain, [
                { transform: 'scaleX(1)' },
                { transform: 'scaleX(0)' }
            ], { duration: 700, easing: 'cubic-bezier(0.77, 0, 0.18, 1)', fill: 'both' });
            var layer = getLayer(slide);
            layer.classList.add('tx-layer-active');
            animate(layer, [
                { opacity: 0, transform: 'scale(0.96)' },
                { opacity: 1, transform: 'scale(1)' }
            ], { duration: 600, delay: 180, easing: 'ease-out', fill: 'both' });
            return function () {
                if (anim) anim.cancel();
                curtain.remove();
            };
        },

        circle: function (slide) {
            return runSimple(getLayer(slide), [
                { clipPath: 'circle(0% at 50% 50%)', opacity: 0.4 },
                { clipPath: 'circle(142% at 50% 50%)', opacity: 1 }
            ], { duration: 820, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' });
        },

        'flip-y': function (slide) {
            var layer = getLayer(slide);
            layer.classList.add('tx-layer-active', 'tx-flip-host');
            return runSimple(layer, [
                { transform: 'perspective(1200px) rotateY(-88deg)', opacity: 0 },
                { transform: 'perspective(1200px) rotateY(0deg)', opacity: 1 }
            ], { duration: 760, easing: 'cubic-bezier(0.34, 1.2, 0.64, 1)', fill: 'both' });
        },

        elastic: function (slide) {
            return runSimple(getLayer(slide), [
                { transform: 'scale(0.35)', opacity: 0 },
                { transform: 'scale(1.08)', opacity: 1, offset: 0.72 },
                { transform: 'scale(1)', opacity: 1 }
            ], { duration: 820, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'both' });
        },

        skew: function (slide) {
            return runSimple(getLayer(slide), [
                { transform: 'skewX(-7deg) translateX(-120px)', opacity: 0 },
                { transform: 'skewX(0deg) translateX(0)', opacity: 1 }
            ], { duration: 680, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' });
        },

        'split-x': function (slide) {
            return runSimple(getLayer(slide), [
                { clipPath: 'inset(0 50% 0 50%)', opacity: 0.5 },
                { clipPath: 'inset(0 0 0 0)', opacity: 1 }
            ], { duration: 720, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'both' });
        },

        scanline: function (slide) {
            var host = ensureOverlayRoot(slide);
            var scan = document.createElement('div');
            scan.className = 'tx-fx-overlay tx-scanline';
            host.appendChild(scan);
            var layer = getLayer(slide);
            layer.classList.add('tx-layer-active');
            animate(scan, [
                { transform: 'translateY(-110%)', opacity: 1 },
                { transform: 'translateY(110%)', opacity: 0.2 }
            ], { duration: 900, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'both' });
            return runSimple(layer, [
                { opacity: 0, filter: 'brightness(2) contrast(1.4)' },
                { opacity: 1, filter: 'brightness(1) contrast(1)' }
            ], { duration: 900, easing: 'ease-out', fill: 'both' });
        },

        chroma: function (slide) {
            var layer = getLayer(slide);
            layer.classList.add('tx-layer-active', 'tx-chroma');
            var anim = animate(layer, [
                { transform: 'translateX(0)', filter: 'drop-shadow(-8px 0 #C82464) drop-shadow(8px 0 #00e5ff)' },
                { transform: 'translateX(0)', filter: 'drop-shadow(0 0 0 transparent)' }
            ], { duration: 640, easing: 'ease-out', fill: 'both' });
            return function () {
                layer.classList.remove('tx-chroma');
                if (anim) anim.cancel();
            };
        },

        'slide-left': function (slide) {
            return runSimple(getLayer(slide), [
                { transform: 'translateX(18%)', opacity: 0 },
                { transform: 'translateX(0)', opacity: 1 }
            ], { duration: 640, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' });
        },

        'rotate-in': function (slide) {
            return runSimple(getLayer(slide), [
                { transform: 'rotate(-7deg) scale(0.88)', opacity: 0 },
                { transform: 'rotate(0deg) scale(1)', opacity: 1 }
            ], { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' });
        },

        'blur-wipe': function (slide) {
            var layer = getLayer(slide);
            layer.classList.add('tx-layer-active', 'tx-blur-wipe');
            var anim = animate(layer, [
                { maskPosition: '100% 0', opacity: 0.3 },
                { maskPosition: '0% 0', opacity: 1 }
            ], { duration: 760, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'both' });
            return function () {
                layer.classList.remove('tx-blur-wipe');
                if (anim) anim.cancel();
            };
        },

        'pixel-grid': function (slide) {
            var host = ensureOverlayRoot(slide);
            var grid = document.createElement('div');
            grid.className = 'tx-fx-overlay tx-pixel-grid';
            var cols = 10;
            var rows = 6;
            var cells = [];
            for (var r = 0; r < rows; r += 1) {
                for (var c = 0; c < cols; c += 1) {
                    var cell = document.createElement('span');
                    cell.className = 'tx-pixel-cell';
                    grid.appendChild(cell);
                    cells.push(cell);
                }
            }
            host.appendChild(grid);
            cells.sort(function () { return Math.random() - 0.5; });
            var anims = cells.map(function (cell, i) {
                return animate(cell, [
                    { opacity: 1, transform: 'scale(1)' },
                    { opacity: 0, transform: 'scale(0.55)' }
                ], {
                    duration: 420,
                    delay: i * 16,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    fill: 'forwards'
                });
            });
            var layer = getLayer(slide);
            layer.classList.add('tx-layer-active');
            animate(layer, [
                { opacity: 0 },
                { opacity: 1 }
            ], { duration: 360, delay: 200, fill: 'both' });
            var timer = setTimeout(function () { grid.remove(); }, cells.length * 16 + 520);
            return function () {
                clearTimeout(timer);
                anims.forEach(function (a) { if (a) a.cancel(); });
                grid.remove();
            };
        },

        neon: function (slide) {
            var layer = getLayer(slide);
            layer.classList.add('tx-layer-active', 'tx-neon');
            var anim = animate(layer, [
                { opacity: 0.1, filter: 'brightness(3)' },
                { opacity: 1, filter: 'brightness(1.1)' },
                { opacity: 0.35, filter: 'brightness(2.5)' },
                { opacity: 0.9, filter: 'brightness(1)' },
                { opacity: 0.5, filter: 'brightness(1.8)' },
                { opacity: 1, filter: 'brightness(1)' }
            ], { duration: 900, easing: 'linear', fill: 'both' });
            return function () {
                layer.classList.remove('tx-neon');
                if (anim) anim.cancel();
            };
        },

        depth: function (slide) {
            var layer = getLayer(slide);
            layer.classList.add('tx-layer-active', 'tx-depth-host');
            var children = Array.prototype.slice.call(layer.children);
            if (!children.length) children = [layer];
            var anims = children.map(function (child, i) {
                child.classList.add('tx-fx-child');
                return animate(child, [
                    { transform: 'translateZ(-220px) translateY(30px)', opacity: 0 },
                    { transform: 'translateZ(0) translateY(0)', opacity: 1 }
                ], {
                    duration: 700,
                    delay: i * 90,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                    fill: 'both'
                });
            });
            return function () { anims.forEach(function (a) { if (a) a.cancel(); }); };
        },

        ripple: function (slide) {
            var host = ensureOverlayRoot(slide);
            var ripple = document.createElement('div');
            ripple.className = 'tx-fx-overlay tx-ripple';
            host.appendChild(ripple);
            animate(ripple, [
                { transform: 'scale(0)', opacity: 0.85 },
                { transform: 'scale(2.6)', opacity: 0 }
            ], { duration: 900, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' });
            return runSimple(getLayer(slide), [
                { opacity: 0, transform: 'scale(0.97)' },
                { opacity: 1, transform: 'scale(1)' }
            ], { duration: 700, delay: 120, easing: 'ease-out', fill: 'both' });
        },

        shatter: function (slide) {
            var layer = getLayer(slide);
            layer.classList.add('tx-layer-active');
            var anim = animate(layer, [
                {
                    clipPath: 'polygon(8% 0, 42% 6%, 55% 0, 100% 12%, 92% 38%, 100% 62%, 88% 100%, 52% 92%, 38% 100%, 0 78%, 12% 44%, 0 18%)',
                    opacity: 0.2
                },
                { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', opacity: 1 }
            ], { duration: 780, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' });
            return function () { if (anim) anim.cancel(); };
        },

        melt: function (slide) {
            var layer = getLayer(slide);
            layer.classList.add('tx-layer-active', 'tx-melt');
            var anim = animate(layer, [
                { transform: 'translateY(-40px) scaleY(1.25)', opacity: 0, filter: 'blur(6px)' },
                { transform: 'translateY(8px) scaleY(0.96)', opacity: 1, filter: 'blur(0)' },
                { transform: 'translateY(0) scaleY(1)', opacity: 1, filter: 'blur(0)' }
            ], { duration: 860, easing: 'cubic-bezier(0.34, 1.25, 0.64, 1)', fill: 'both' });
            return function () {
                layer.classList.remove('tx-melt');
                if (anim) anim.cancel();
            };
        }
    };

    function runEnter(slide) {
        if (!slide) return;
        cleanupActive();
        resetSlide(slide);
        if (slide.getAttribute('data-transition-fx') === 'none') return;

        if (prefersReducedMotion()) {
            return;
        }

        var fxId = slide.getAttribute('data-transition-fx') || 'fade-up';
        var runner = EFFECTS[fxId] || EFFECTS['fade-up'];
        activeCleanup = runner(slide) || null;
    }

    function bindReveal(reveal) {
        assignEffects();

        reveal.on('ready', function (event) {
            runEnter(event.currentSlide);
        });

        reveal.on('slidechanged', function (event) {
            resetSlide(event.previousSlide);
            runEnter(event.currentSlide);
        });
    }

    global.SlideTransitionFX = {
        bind: bindReveal,
        assignEffects: assignEffects,
        list: FX_LIST,
        keyFx: KEY_FX,
        normalFx: NORMAL_FX,
        fixedKeyPages: FIXED_KEY_PAGES,
        resetSlide: resetSlide
    };
})(window);
