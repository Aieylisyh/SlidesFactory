/**
 * Employment module — role salary chart tabs (国内大厂 + 4 US role views).
 */
(function (global) {
    'use strict';

    var VIEWS = {
        domestic: {
            label: '国内大厂',
            title: '大厂',
            showTitle: true,
            prefix: '国内-',
            src: 'assets/pdf-extracted/page-36-img-1.jpeg',
            alt: '国内大厂薪资水平'
        },
        dev: {
            label: '游戏开发',
            title: '游戏开发',
            showTitle: true,
            prefix: '美国-',
            src: 'assets/pdf-extracted/page-38-img-1.jpeg',
            alt: '游戏开发岗位薪资'
        },
        unreal: {
            label: 'Unreal',
            title: 'Unreal Engine',
            showTitle: true,
            prefix: '美国-',
            src: 'assets/pdf-extracted/page-39-img-1.jpeg',
            alt: 'Unreal Engine 相关岗位'
        },
        unity: {
            label: 'Unity',
            title: 'Unity',
            showTitle: true,
            prefix: '美国-',
            src: 'assets/pdf-extracted/page-40-img-1.jpeg',
            alt: 'Unity 相关岗位'
        },
        design: {
            label: '游戏设计',
            title: '游戏设计',
            showTitle: true,
            prefix: '美国-',
            src: 'assets/pdf-extracted/page-41-img-1.jpeg',
            alt: '游戏设计岗位薪资'
        }
    };

    function stopRevealNav(e) {
        e.stopPropagation();
    }

    function SalaryToggle(root) {
        this.root = root;
        this.toggleEl = root.querySelector('[data-salary-toggle]');
        this.titleEl = root.querySelector('[data-salary-title]');
        this.imgEl = root.querySelector('[data-salary-img]');
        this.current = 'domestic';
        this.bindNavBlock();
        this.renderToggle();
        this.setView('domestic', false);
    }

    SalaryToggle.prototype.bindNavBlock = function () {
        var self = this;
        ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend'].forEach(function (evt) {
            self.root.addEventListener(evt, stopRevealNav, false);
        });
    };

    SalaryToggle.prototype.renderToggle = function () {
        var self = this;
        this.toggleEl.innerHTML = '';
        Object.keys(VIEWS).forEach(function (key) {
            var view = VIEWS[key];
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'salary-toggle-btn';
            btn.dataset.view = key;
            btn.textContent = view.label;
            btn.setAttribute('aria-pressed', key === self.current ? 'true' : 'false');
            btn.addEventListener('click', function (e) {
                self.setView(key, true, e);
                if (document.activeElement === btn) {
                    btn.blur();
                }
            });
            self.toggleEl.appendChild(btn);
        });
    };

    SalaryToggle.prototype.setView = function (key, animate, e) {
        if (!VIEWS[key]) return;
        this.current = key;
        var view = VIEWS[key];
        this.toggleEl.querySelectorAll('.salary-toggle-btn').forEach(function (btn) {
            var active = btn.dataset.view === key;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
            if (active && e && typeof ClickFX !== 'undefined') {
                ClickFX.applyClick(btn, e);
            }
        });
        if (this.titleEl) {
            if (view.showTitle) {
                this.titleEl.textContent = (view.prefix || '') + view.title;
                this.titleEl.hidden = false;
                this.titleEl.classList.remove('is-hidden');
            } else {
                this.titleEl.textContent = '';
                this.titleEl.hidden = true;
                this.titleEl.classList.add('is-hidden');
            }
        }
        if (this.imgEl) {
            if (animate) {
                this.imgEl.classList.remove('is-swapping');
                void this.imgEl.offsetWidth;
                this.imgEl.classList.add('is-swapping');
            }
            this.imgEl.src = view.src;
            this.imgEl.alt = view.alt;
        }
    };

    SalaryToggle.prototype.reset = function () {
        this.setView('domestic', false);
    };

    global.SalaryToggle = SalaryToggle;
})(window);
