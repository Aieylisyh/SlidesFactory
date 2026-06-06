/**
 * Major direction module — pick interests, surface path suggestions.
 */
(function (global) {
    'use strict';

    var TAGS = [
        { id: 'visual', label: '画世界', accent: '#99FFCC', paths: ['游戏美术', '动画', '视觉设计'] },
        { id: '3d', label: '做模型', accent: '#88FFDD', paths: ['3D 艺术', '技术美术（TA）'] },
        { id: 'code', label: '写逻辑', accent: '#77FFEE', paths: ['游戏开发', 'Technical Designer'] },
        { id: 'systems', label: '搭系统', accent: '#66EEFF', paths: ['系统策划', '关卡设计'] },
        { id: 'research', label: '挖题材', accent: '#77DDFF', paths: ['概念设计', '交互 / UX 设计'] },
        { id: 'team', label: '带项目', accent: '#88CCFF', paths: ['独立制作人向', '项目管理 / 运营'] },
        { id: 'sound', label: '调声音', accent: '#99BBFF', paths: ['音效设计', '配乐 / 音频'] },
        { id: 'story', label: '讲故事', accent: '#AACCFF', paths: ['叙事设计', '编剧 / 分镜'] },
        { id: 'ui', label: '搭界面', accent: '#BBDDFF', paths: ['UI 设计', 'UX / 交互'] },
        { id: 'motion', label: '做动效', accent: '#CCDDFF', paths: ['动效设计', '视频 / 剪辑'] }
    ];

    function stopRevealNav(e) {
        e.stopPropagation();
    }

    function MajorPicker(root) {
        this.root = root;
        this.pool = root.querySelector('[data-major-pool]');
        this.result = root.querySelector('[data-major-result]');
        this.selected = [];
        this.prevPaths = [];
        this.bindNavBlock();
        this.renderTags();
    }

    MajorPicker.prototype.bindNavBlock = function () {
        var self = this;
        ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend'].forEach(function (evt) {
            self.root.addEventListener(evt, stopRevealNav, false);
        });
        self.root.addEventListener('keydown', function (e) {
            var keys = [' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'];
            if (keys.indexOf(e.key) !== -1) {
                e.stopPropagation();
                e.preventDefault();
            }
        }, true);
    };

    function hexToRgba(hex, alpha) {
        var n = parseInt(hex.slice(1), 16);
        var r = (n >> 16) & 255;
        var g = (n >> 8) & 255;
        var b = n & 255;
        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
    }

    MajorPicker.prototype.setChipSelected = function (btn, tag, selected) {
        if (selected) {
            btn.classList.add('is-selected');
            btn.style.setProperty('--chip-accent', tag.accent);
            btn.style.borderColor = tag.accent;
            btn.style.color = tag.accent;
            btn.style.background = hexToRgba(tag.accent, 0.24);
            btn.style.boxShadow = '0 0 20px ' + hexToRgba(tag.accent, 0.5);
        } else {
            btn.classList.remove('is-selected');
            btn.style.removeProperty('--chip-accent');
            btn.style.borderColor = '';
            btn.style.color = '';
            btn.style.background = '';
            btn.style.boxShadow = '';
        }
    };

    MajorPicker.prototype.renderTags = function () {
        this.pool.innerHTML = '';
        this.selected = [];
        this.prevPaths = [];
        this.result.innerHTML = '';

        TAGS.forEach(function (tag) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'major-pick-chip';
            btn.textContent = tag.label;
            btn.dataset.id = tag.id;
            btn.addEventListener('click', this.onTagClick.bind(this, btn, tag));
            this.pool.appendChild(btn);
        }, this);
    };

    MajorPicker.prototype.playPunch = function (btn) {
        btn.classList.remove('is-punching');
        void btn.offsetWidth;
        btn.classList.add('is-punching');
        btn.addEventListener('animationend', function onEnd() {
            btn.classList.remove('is-punching');
            btn.removeEventListener('animationend', onEnd);
        });
    };

    MajorPicker.prototype.spawnRipple = function (btn, e) {
        var rect = btn.getBoundingClientRect();
        var ripple = document.createElement('span');
        ripple.className = 'major-chip-ripple';
        var size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        var clientX = e.clientX != null ? e.clientX : rect.left + rect.width / 2;
        var clientY = e.clientY != null ? e.clientY : rect.top + rect.height / 2;
        ripple.style.left = (clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', function () {
            ripple.remove();
        });
    };

    MajorPicker.prototype.onTagClick = function (btn, tag, e) {
        var idx = this.selected.indexOf(tag.id);
        var selecting = idx === -1;

        if (selecting) {
            this.selected.push(tag.id);
            this.setChipSelected(btn, tag, true);
            this.spawnRipple(btn, e);
        } else {
            this.selected.splice(idx, 1);
            this.setChipSelected(btn, tag, false);
        }

        this.playPunch(btn);
        this.renderResult();
        if (document.activeElement === btn) {
            btn.blur();
        }
    };

    MajorPicker.prototype.renderResult = function () {
        if (!this.selected.length) {
            this.result.innerHTML = '';
            this.prevPaths = [];
            return;
        }

        var paths = [];
        this.selected.forEach(function (id) {
            var tag = TAGS.find(function (t) { return t.id === id; });
            if (tag) paths = paths.concat(tag.paths);
        });
        var unique = paths.filter(function (p, i) { return paths.indexOf(p) === i; });
        var self = this;

        this.result.innerHTML = unique.map(function (p) {
            var isNew = self.prevPaths.indexOf(p) === -1;
            return '<span class="major-path-tag' + (isNew ? ' is-new' : '') + '">' + p + '</span>';
        }).join('');

        this.prevPaths = unique.slice();
    };

    MajorPicker.prototype.reset = function () {
        this.renderTags();
    };

    global.MajorPicker = MajorPicker;
})(window);
