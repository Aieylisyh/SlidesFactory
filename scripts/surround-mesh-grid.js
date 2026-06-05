/**
 * Surround mesh grid — dual-layer interactive background.
 * Thick morphing grid + thin link mesh, center ellipse hole, mouse repel, enter flash.
 *
 * Depends on: grid-morph.js (GridMorph)
 *
 * HTML:
 *   <div data-surround-mesh-grid data-mesh-preset="traits" data-mouse-repel>
 *     <canvas data-surround-mesh-grid-canvas></canvas>
 *     <canvas data-surround-mesh-link-canvas></canvas>
 *   </div>
 *
 * JS:
 *   SurroundMeshGrid.mount(hostElement, { mouseRoot: sectionEl });
 *   SurroundMeshGrid.initSlide(slideElement);
 */
(function (global) {
    'use strict';

    var PRESETS = {
        traits: {
            cols: 11,
            rows: 6,
            lineColor: 'rgba(200, 36, 100, 0.58)',
            dotColor: 'rgba(224, 86, 136, 0.78)',
            linkLineColor: 'rgba(188, 72, 118, 0.44)',
            linkLineWidth: 0.78,
            speed: 0.00034,
            lineWidth: 1.2,
            showDots: true,
            mouseRepel: true,
            mouseRadius: 0.42,
            mousePush: 0.17,
            linkReach: 0.52
        },
        gray: {
            cols: 11,
            rows: 6,
            lineColor: 'rgba(94, 94, 102, 0.47)',
            dotColor: 'rgba(128, 128, 136, 0.55)',
            linkLineColor: 'rgba(82, 82, 90, 0.33)',
            linkLineWidth: 0.78,
            speed: 0.00038,
            lineWidth: 1.25,
            showDots: false,
            mouseRepel: true,
            mouseRadius: 0.42,
            mousePush: 0.17,
            linkReach: 0.52
        },
        blue: {
            cols: 11,
            rows: 6,
            lineColor: 'rgba(48, 140, 220, 0.52)',
            dotColor: 'rgba(72, 168, 240, 0.70)',
            linkLineColor: 'rgba(40, 124, 200, 0.40)',
            linkLineWidth: 0.78,
            speed: 0.00034,
            lineWidth: 1.1,
            showDots: false,
            mouseRepel: true,
            mouseRadius: 0.42,
            mousePush: 0.17,
            linkReach: 0.52
        },
        purple: {
            cols: 11,
            rows: 6,
            lineColor: 'rgba(136, 72, 216, 0.52)',
            dotColor: 'rgba(168, 104, 240, 0.70)',
            linkLineColor: 'rgba(112, 56, 192, 0.40)',
            linkLineWidth: 0.78,
            speed: 0.00034,
            lineWidth: 1.1,
            showDots: false,
            mouseRepel: true,
            mouseRadius: 0.42,
            mousePush: 0.17,
            linkReach: 0.52
        },
        orange: {
            cols: 11,
            rows: 6,
            lineColor: 'rgba(220, 118, 48, 0.52)',
            dotColor: 'rgba(244, 140, 72, 0.70)',
            linkLineColor: 'rgba(200, 108, 52, 0.40)',
            linkLineWidth: 0.78,
            speed: 0.00034,
            lineWidth: 1.1,
            showDots: false,
            mouseRepel: false,
            linkReach: 0.52
        },
        teal: {
            cols: 11,
            rows: 6,
            lineColor: 'rgba(0, 200, 150, 0.52)',
            dotColor: 'rgba(64, 224, 180, 0.70)',
            linkLineColor: 'rgba(0, 168, 126, 0.40)',
            linkLineWidth: 0.78,
            speed: 0.00034,
            lineWidth: 1.1,
            showDots: false,
            mouseRepel: false,
            linkReach: 0.52
        },
        employment: {
            cols: 11,
            rows: 6,
            lineColor: 'rgba(200, 36, 100, 0.40)',
            dotColor: 'rgba(224, 86, 136, 0.55)',
            linkLineColor: 'rgba(188, 72, 118, 0.32)',
            linkLineWidth: 0.78,
            speed: 0.00032,
            lineWidth: 1.15,
            showDots: false,
            mouseRepel: true,
            mouseRadius: 0.38,
            mousePush: 0.14,
            linkReach: 0.48
        }
    };

    function blockReveal(e) {
        e.stopPropagation();
    }

    function resolveOptions(options) {
        var presetName = (options && options.preset) || 'traits';
        var base = PRESETS[presetName] || PRESETS.traits;
        return Object.assign({}, base, options || {});
    }

    function buildSurroundVertices(cols, rows, hole) {
        var list = [];
        var gx;
        var gy;
        var x;
        var y;
        var dx;
        var dy;
        var holeX = (hole && hole.x) || 0.27;
        var holeY = (hole && hole.y) || 0.23;

        for (gy = 0; gy <= rows; gy++) {
            for (gx = 0; gx <= cols; gx++) {
                x = gx / cols;
                y = gy / rows;
                dx = (x - 0.5) / holeX;
                dy = (y - 0.5) / holeY;
                if (dx * dx + dy * dy < 1) {
                    continue;
                }
                list.push({ gx: gx, gy: gy });
            }
        }
        return list;
    }

    /**
     * Spatial-bucket link pass — same reach-based pairs as brute O(n²), ~O(n) average.
     * Cell size equals reach so only the 3×3 neighboring buckets need checking.
     */
    function drawLinksWithinReach(ctx, positions, reach, strokeStyle, lineWidth) {
        var count = positions.length;
        if (count < 2) return;

        var reachSq = reach * reach;
        var buckets = Object.create(null);
        var i;
        var j;
        var p;
        var cx;
        var cy;
        var key;
        var bucket;
        var ox;
        var oy;
        var nkey;
        var nb;
        var bi;
        var a;
        var b;
        var dx;
        var dy;
        var distSq;
        var dist;

        for (i = 0; i < count; i++) {
            p = positions[i];
            cx = (p.x / reach) | 0;
            cy = (p.y / reach) | 0;
            key = cx + ',' + cy;
            bucket = buckets[key];
            if (!bucket) {
                bucket = [];
                buckets[key] = bucket;
            }
            bucket.push(i);
        }

        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        for (i = 0; i < count; i++) {
            a = positions[i];
            cx = (a.x / reach) | 0;
            cy = (a.y / reach) | 0;
            for (ox = -1; ox <= 1; ox++) {
                for (oy = -1; oy <= 1; oy++) {
                    bucket = buckets[(cx + ox) + ',' + (cy + oy)];
                    if (!bucket) continue;
                    for (bi = 0; bi < bucket.length; bi++) {
                        j = bucket[bi];
                        if (j <= i) continue;
                        b = positions[j];
                        dx = a.x - b.x;
                        dy = a.y - b.y;
                        distSq = dx * dx + dy * dy;
                        if (distSq >= reachSq) continue;
                        dist = Math.sqrt(distSq);
                        ctx.globalAlpha = 0.36 + (1 - dist / reach) * 0.48;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
            }
        }
        ctx.globalAlpha = 1;
    }

    function bindMeshNavBlock(root) {
        if (!root || root._surroundMeshNavBound) return;
        root._surroundMeshNavBound = true;
        root.addEventListener('mousedown', blockReveal);
    }

    function bindMeshMouseRepel(root) {
        if (!root || root._surroundMeshMouseBound) return;
        root._surroundMeshMouseBound = true;
        root._mouseGlobalX = 0;
        root._mouseGlobalY = 0;
        root._mouseGlobalActive = false;

        function onMove(e) {
            e.stopPropagation();
            root._mouseGlobalX = e.clientX;
            root._mouseGlobalY = e.clientY;
            root._mouseGlobalActive = true;
        }

        function onLeave() {
            root._mouseGlobalActive = false;
        }

        root.addEventListener('mousemove', onMove);
        root.addEventListener('mouseleave', onLeave);
    }

    function findMeshRoot(slide) {
        if (!slide) return null;
        if (slide.matches && slide.matches('[data-surround-mesh-slide]')) {
            return slide;
        }
        return slide.querySelector('[data-surround-mesh-slide]');
    }

    function SurroundMeshGrid(hostEl, options) {
        this.host = hostEl;
        this.options = resolveOptions(options);
        this.mouseRoot = (options && options.mouseRoot) || hostEl.closest('[data-surround-mesh-slide]') || hostEl;
        this.gridCanvas = hostEl.querySelector('[data-surround-mesh-grid-canvas]');
        this.linkCanvas = hostEl.querySelector('[data-surround-mesh-link-canvas]');
        this.linkCtx = this.linkCanvas ? this.linkCanvas.getContext('2d') : null;
        this.grid = null;
        this.vertices = [];
        this.positions = [];
        this.width = 0;
        this.height = 0;
        this.running = false;
        this.rafId = null;
        this._resizeRaf = null;
        this._sizeRetries = 0;
        this.tick = this.tick.bind(this);
        this.onResize = this.onResize.bind(this);
        this.applyResize = this.applyResize.bind(this);
    }

    SurroundMeshGrid.prototype.buildVertices = function () {
        this.vertices = buildSurroundVertices(
            this.options.cols,
            this.options.rows,
            this.options.hole
        );
        this.positions = this.vertices.map(function (v) {
            return { gx: v.gx, gy: v.gy, x: 0, y: 0 };
        });
    };

    SurroundMeshGrid.prototype.setupGrid = function () {
        if (!this.gridCanvas || typeof global.GridMorph === 'undefined') return;
        if (this.grid && this.grid.stop) {
            this.grid.stop();
        }
        if (this.gridCanvas._gridMorph) {
            delete this.gridCanvas._gridMorph;
        }
        this.grid = global.GridMorph.init(this.gridCanvas, Object.assign({}, this.options, {
            externalResize: true
        }));
        if (this.options.mouseRepel && this.mouseRoot && this.grid.setMouseSourceRoot) {
            this.grid.setMouseSourceRoot(this.mouseRoot);
        }
        this.grid.start();
    };

    SurroundMeshGrid.prototype.syncPositions = function () {
        if (!this.grid) return;
        this.positions.forEach(function (p) {
            var v = this.grid.getVertex(p.gx, p.gy);
            if (v) {
                p.x = v.x;
                p.y = v.y;
            }
        }, this);
    };

    SurroundMeshGrid.prototype.drawLinks = function () {
        if (!this.linkCtx || this.positions.length < 2) return;
        var reach = Math.min(this.width, this.height) * (this.options.linkReach || 0.52);
        this.linkCtx.clearRect(0, 0, this.width, this.height);
        drawLinksWithinReach(
            this.linkCtx,
            this.positions,
            reach,
            this.options.linkLineColor || this.options.lineColor,
            this.options.linkLineWidth != null ? this.options.linkLineWidth : 0.78
        );
    };

    SurroundMeshGrid.prototype.tick = function () {
        if (!this.running) return;
        this.syncPositions();
        this.drawLinks();
        this.rafId = global.requestAnimationFrame(this.tick);
    };

    SurroundMeshGrid.prototype.onResize = function () {
        if (this._resizeRaf) {
            global.cancelAnimationFrame(this._resizeRaf);
        }
        this._resizeRaf = global.requestAnimationFrame(this.applyResize);
    };

    SurroundMeshGrid.prototype.applyResize = function () {
        this._resizeRaf = null;
        if (!this.host) return;

        var rect = this.host.getBoundingClientRect();
        var nextW = Math.max(1, Math.round(rect.width));
        var nextH = Math.max(1, Math.round(rect.height));
        var sizeChanged = nextW !== this.width || nextH !== this.height;
        this.width = nextW;
        this.height = nextH;
        if (this.grid && sizeChanged && this.grid.resize) {
            this.grid.resize();
        } else if (this.grid && this.grid.deform && this.grid.draw) {
            this.grid.deform();
            this.grid.draw();
        }
        if (this.grid && !this.grid.running && this.grid.start) {
            this.grid.start();
        }
        if (this.linkCanvas && this.linkCtx) {
            var dpr = global.devicePixelRatio || 1;
            this.linkCanvas.width = this.width * dpr;
            this.linkCanvas.height = this.height * dpr;
            this.linkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        if ((rect.width < 2 || rect.height < 2) && this._sizeRetries < 24) {
            this._sizeRetries += 1;
            var self = this;
            global.requestAnimationFrame(function () {
                self.onResize();
            });
        } else if (rect.width >= 2 && rect.height >= 2) {
            this._sizeRetries = 0;
        }
    };

    SurroundMeshGrid.prototype.flash = function () {
        if (!this.host) return;
        this.host.classList.remove('is-mesh-flash');
        void this.host.offsetWidth;
        this.host.classList.add('is-mesh-flash');
    };

    SurroundMeshGrid.prototype.scheduleFlash = function () {
        var self = this;
        global.requestAnimationFrame(function () {
            self.flash();
        });
    };

    SurroundMeshGrid.prototype.start = function (opts) {
        var withFlash = !opts || opts.flash !== false;
        if (this.mouseRoot) {
            bindMeshNavBlock(this.mouseRoot);
        }
        if (this.options.mouseRepel && this.mouseRoot) {
            bindMeshMouseRepel(this.mouseRoot);
            if (this.grid && this.grid.setMouseSourceRoot) {
                this.grid.setMouseSourceRoot(this.mouseRoot);
            }
        }
        this.buildVertices();
        this.setupGrid();
        this.onResize();
        if (!this._resizeObs && typeof ResizeObserver !== 'undefined') {
            this._resizeObs = new ResizeObserver(this.onResize);
            this._resizeObs.observe(this.host);
        } else if (!this._resizeBound) {
            this._resizeBound = true;
            global.addEventListener('resize', this.onResize);
        }
        if (!this.running) {
            this.running = true;
            this.rafId = global.requestAnimationFrame(this.tick);
        }
        if (withFlash) {
            this.scheduleFlash();
        }
    };

    SurroundMeshGrid.prototype.stop = function () {
        this.running = false;
        if (this.rafId) {
            global.cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        if (this.grid && this.grid.stop) {
            this.grid.stop();
        }
        if (this.linkCtx) {
            this.linkCtx.clearRect(0, 0, this.width, this.height);
        }
    };

    SurroundMeshGrid.prototype.restart = function (opts) {
        var flash = opts && opts.flash === true;
        if (this.mouseRoot) {
            bindMeshNavBlock(this.mouseRoot);
        }
        if (this.options.mouseRepel && this.mouseRoot) {
            bindMeshMouseRepel(this.mouseRoot);
            if (this.grid && this.grid.setMouseSourceRoot) {
                this.grid.setMouseSourceRoot(this.mouseRoot);
            }
        }
        if (!this.vertices.length) {
            this.buildVertices();
        }
        if (this.grid && !this.grid.running && this.grid.start) {
            this.grid.start();
        } else if (!this.grid) {
            this.setupGrid();
        }
        this.onResize();
        if (!this.running) {
            this.running = true;
            this.rafId = global.requestAnimationFrame(this.tick);
        }
        if (flash) {
            this.scheduleFlash();
        }
    };

    SurroundMeshGrid.prototype.destroy = function () {
        this.stop();
        if (this._resizeRaf) {
            global.cancelAnimationFrame(this._resizeRaf);
            this._resizeRaf = null;
        }
        if (this._resizeObs) {
            this._resizeObs.disconnect();
            this._resizeObs = null;
        }
        if (this.host) {
            this.host._surroundMeshGrid = null;
        }
    };

    function mount(hostEl, options) {
        if (!hostEl) return null;
        var opts = options || {};
        if (!opts.preset && hostEl.getAttribute('data-mesh-preset')) {
            opts.preset = hostEl.getAttribute('data-mesh-preset');
        }
        if (hostEl.hasAttribute('data-mouse-repel')) {
            opts.mouseRepel = true;
        }
        if (!opts.mouseRoot) {
            var slide = hostEl.closest('[data-surround-mesh-slide]');
            if (slide) opts.mouseRoot = slide;
        }
        if (hostEl._surroundMeshGrid) {
            if (opts.mouseRepel) {
                hostEl._surroundMeshGrid.options.mouseRepel = true;
            }
            return hostEl._surroundMeshGrid;
        }
        var instance = new SurroundMeshGrid(hostEl, opts);
        hostEl._surroundMeshGrid = instance;
        return instance;
    }

    function initHosts(root) {
        if (!root) return [];
        var hosts = root.matches && root.matches('[data-surround-mesh-grid]')
            ? [root]
            : Array.prototype.slice.call(root.querySelectorAll('[data-surround-mesh-grid]'));
        return hosts.map(function (host) {
            var isNew = !host._surroundMeshGrid;
            return { mesh: mount(host), isNew: isNew };
        });
    }

    function stopHosts(root) {
        if (!root) return;
        var hosts = root.matches && root.matches('[data-surround-mesh-grid]')
            ? [root]
            : Array.prototype.slice.call(root.querySelectorAll('[data-surround-mesh-grid]'));
        hosts.forEach(function (host) {
            if (host._surroundMeshGrid) {
                host._surroundMeshGrid.stop();
            }
        });
    }

    function initSlide(slide) {
        if (!slide) return;
        var root = findMeshRoot(slide) || slide;
        var run = function () {
            var meshes = initHosts(root);
            meshes.forEach(function (entry) {
                if (entry.isNew) {
                    entry.mesh.start();
                } else if (!entry.mesh.running) {
                    entry.mesh.restart({ flash: true });
                }
            });
        };
        global.requestAnimationFrame(function () {
            global.requestAnimationFrame(run);
        });
    }

    function stopAllExcept(slide) {
        document.querySelectorAll('[data-surround-mesh-grid]').forEach(function (host) {
            if (!slide || !slide.contains(host)) {
                if (host._surroundMeshGrid) {
                    host._surroundMeshGrid.stop();
                }
            }
        });
    }

    global.SurroundMeshGrid = {
        PRESETS: PRESETS,
        buildSurroundVertices: buildSurroundVertices,
        drawLinksWithinReach: drawLinksWithinReach,
        mount: mount,
        initHosts: initHosts,
        stopHosts: stopHosts,
        initSlide: initSlide,
        stopAllExcept: stopAllExcept,
        create: mount
    };
})(window);
