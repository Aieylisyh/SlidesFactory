/**
 * Summerschool — simple tab panels (课程支持).
 */
(function (global) {
    'use strict';

    var TAB_ATTR = 'data-ss-tab';
    var PANEL_ATTR = 'data-ss-panel';

    function stopRevealNav(e) {
        e.stopPropagation();
    }

    function SummerTabs(root) {
        this.root = root;
        this.bar = root.querySelector('[data-ss-tabs-bar]');
        this.buttons = this.bar ? Array.prototype.slice.call(this.bar.querySelectorAll('[data-ss-tab]')) : [];
        this.panels = Array.prototype.slice.call(root.querySelectorAll('[data-ss-panel]'));
        this.current = this.buttons.length ? this.buttons[0].getAttribute(TAB_ATTR) : null;
        this.bindNavBlock();
        this.bindButtons();
        if (this.current) this.activate(this.current);
    }

    SummerTabs.prototype.bindNavBlock = function () {
        var nodes = [this.root, this.bar].concat(this.buttons, this.panels);
        nodes.forEach(function (el) {
            if (!el) return;
            el.addEventListener('mousedown', stopRevealNav);
            el.addEventListener('touchstart', stopRevealNav, { passive: true });
        });
    };

    SummerTabs.prototype.bindButtons = function () {
        var self = this;
        this.buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                self.activate(btn.getAttribute(TAB_ATTR));
            });
        });
    };

    SummerTabs.prototype.activate = function (key) {
        if (!key) return;
        this.current = key;
        this.buttons.forEach(function (btn) {
            var active = btn.getAttribute(TAB_ATTR) === key;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        this.panels.forEach(function (panel) {
            var show = panel.getAttribute(PANEL_ATTR) === key;
            panel.hidden = !show;
        });
    };

    SummerTabs.prototype.reset = function () {
        if (this.buttons.length) {
            this.activate(this.buttons[0].getAttribute(TAB_ATTR));
        }
    };

    global.SummerTabs = SummerTabs;
})(window);
