/**
 * Transparent wireframe grid with slow vertex deformation.
 * Used as global background and per-slide canvas hosts.
 */
(function (global) {
    'use strict';

    function GridMorphCanvas(canvas, options) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.options = Object.assign({
            cols: 14,
            rows: 8,
            lineColor: 'rgba(200, 36, 100, 0.35)',
            dotColor: 'rgba(224, 86, 136, 0.45)',
            speed: 0.00035,
            showDots: true,
            mouseRepel: false,
            mouseRadius: 0.4,
            mousePush: 0.15,
            externalResize: false
        }, options || {});
        this.points = [];
        this.time = Math.random() * 1000;
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseActive = false;
        this.mouseSourceRoot = null;
        this.attractPoints = [];
        this.rafId = null;
        this.running = false;
        this.resizeHandler = this.resize.bind(this);
        this.loopBound = this.loop.bind(this);
    }

    GridMorphCanvas.prototype.setAttractPoints = function (points) {
        this.attractPoints = Array.isArray(points) ? points : [];
    };

    GridMorphCanvas.prototype.resize = function () {
        var rect = this.canvas.parentElement
            ? this.canvas.parentElement.getBoundingClientRect()
            : { width: window.innerWidth, height: window.innerHeight };
        var dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.width = rect.width;
        this.height = rect.height;
        this.buildPoints();
    };

    GridMorphCanvas.prototype.buildPoints = function () {
        var cols = this.options.cols;
        var rows = this.options.rows;
        var oldPoints = this.points;
        this.points = [];
        for (var y = 0; y <= rows; y++) {
            var row = [];
            for (var x = 0; x <= cols; x++) {
                var oldPoint = oldPoints[y] && oldPoints[y][x];
                row.push({
                    ox: (x / cols) * this.width,
                    oy: (y / rows) * this.height,
                    x: 0,
                    y: 0,
                    phase: oldPoint ? oldPoint.phase : Math.random() * Math.PI * 2,
                    mx: oldPoint ? oldPoint.mx : 0,
                    my: oldPoint ? oldPoint.my : 0
                });
            }
            this.points.push(row);
        }
    };

    GridMorphCanvas.prototype.syncMouseFromRoot = function () {
        if (!this.mouseSourceRoot || !this.canvas) return;
        var rect = this.canvas.parentElement
            ? this.canvas.parentElement.getBoundingClientRect()
            : { left: 0, top: 0 };
        this.mouseActive = !!this.mouseSourceRoot._mouseGlobalActive;
        if (this.mouseActive) {
            this.mouseX = this.mouseSourceRoot._mouseGlobalX - rect.left;
            this.mouseY = this.mouseSourceRoot._mouseGlobalY - rect.top;
        }
    };

    GridMorphCanvas.prototype.deform = function () {
        var amp = Math.min(this.width, this.height) * 0.018;
        var mouseRepel = this.options.mouseRepel;
        var radius = Math.min(this.width, this.height) * this.options.mouseRadius;
        var maxPush = Math.min(this.width, this.height) * this.options.mousePush;

        if (mouseRepel) {
            this.syncMouseFromRoot();
        }

        for (var y = 0; y < this.points.length; y++) {
            for (var x = 0; x < this.points[y].length; x++) {
                var p = this.points[y][x];
                var baseX = p.ox + Math.sin(this.time * 1.3 + p.phase + x * 0.4) * amp;
                var baseY = p.oy + Math.cos(this.time * 1.1 + p.phase + y * 0.35) * amp;
                var targetMx = 0;
                var targetMy = 0;

                if (mouseRepel && this.mouseActive) {
                    var dx = baseX - this.mouseX;
                    var dy = baseY - this.mouseY;
                    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    if (dist < radius) {
                        var t = 1 - dist / radius;
                        var push = maxPush * t;
                        targetMx = (dx / dist) * push;
                        targetMy = (dy / dist) * push;
                    }
                }

                if (this.attractPoints.length) {
                    var ai;
                    var ap;
                    var adx;
                    var ady;
                    var adist;
                    var at;
                    var apull;
                    var attractRadius = radius * 0.72;
                    var maxAttract = maxPush * 0.42;
                    for (ai = 0; ai < this.attractPoints.length; ai++) {
                        ap = this.attractPoints[ai];
                        if (!ap || ap.x == null || ap.y == null) continue;
                        adx = ap.x - baseX;
                        ady = ap.y - baseY;
                        adist = Math.sqrt(adx * adx + ady * ady) || 1;
                        if (adist < attractRadius) {
                            at = 1 - adist / attractRadius;
                            apull = maxAttract * at * (ap.strength != null ? ap.strength : 1);
                            targetMx += (adx / adist) * apull;
                            targetMy += (ady / adist) * apull;
                        }
                    }
                }

                p.mx += (targetMx - p.mx) * (this.mouseActive || this.attractPoints.length ? 0.18 : 0.1);
                p.my += (targetMy - p.my) * (this.mouseActive ? 0.18 : 0.1);
                p.x = baseX + p.mx;
                p.y = baseY + p.my;
            }
        }
    };

    GridMorphCanvas.prototype.draw = function () {
        var ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.strokeStyle = this.options.lineColor;
        ctx.lineWidth = this.options.lineWidth || 1;

        for (var y = 0; y < this.points.length; y++) {
            for (var x = 0; x < this.points[y].length; x++) {
                var p = this.points[y][x];
                if (x < this.points[y].length - 1) {
                    var right = this.points[y][x + 1];
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(right.x, right.y);
                    ctx.stroke();
                }
                if (y < this.points.length - 1) {
                    var down = this.points[y + 1][x];
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(down.x, down.y);
                    ctx.stroke();
                }
                if (this.options.showDots !== false) {
                    ctx.fillStyle = this.options.dotColor;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    };

    GridMorphCanvas.prototype.loop = function () {
        if (!this.running) return;
        this.time += this.options.speed * 16;
        this.deform();
        this.draw();
        this.rafId = requestAnimationFrame(this.loopBound);
    };

    GridMorphCanvas.prototype.start = function () {
        if (this.running) return;
        this.running = true;
        this.resize();
        if (!this.options.externalResize) {
            window.addEventListener('resize', this.resizeHandler);
        }
        this.loop();
    };

    GridMorphCanvas.prototype.stop = function () {
        this.running = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        window.removeEventListener('resize', this.resizeHandler);
    };

    GridMorphCanvas.prototype.setMouseSourceRoot = function (root) {
        this.mouseSourceRoot = root || null;
    };

    GridMorphCanvas.prototype.getVertex = function (col, row) {
        var rowPts = this.points[row];
        if (!rowPts) return null;
        var p = rowPts[col];
        if (!p) return null;
        return { x: p.x, y: p.y };
    };

    GridMorphCanvas.prototype.getVertexNorm = function (col, row) {
        var cols = this.options.cols;
        var rows = this.options.rows;
        return {
            x: col / cols,
            y: row / rows
        };
    };

    function initCanvas(canvas, options) {
        if (!canvas) return null;
        if (canvas._gridMorph) {
            Object.assign(canvas._gridMorph.options, options || {});
            return canvas._gridMorph;
        }
        var instance = new GridMorphCanvas(canvas, options);
        canvas._gridMorph = instance;
        return instance;
    }

    global.GridMorph = {
        init: initCanvas,
        startAll: function (selector) {
            var nodes = document.querySelectorAll(selector || 'canvas[data-grid-morph]');
            nodes.forEach(function (node) {
                initCanvas(node).start();
            });
        },
        stopAll: function (selector) {
            var nodes = document.querySelectorAll(selector || 'canvas[data-grid-morph]');
            nodes.forEach(function (node) {
                if (node._gridMorph) node._gridMorph.stop();
            });
        }
    };
})(window);
