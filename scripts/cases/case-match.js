/**
 * Light matching mini-game: pair student names with career outcomes.
 */
(function (global) {
    'use strict';

    var PAIRS = [
        { id: 'cui', label: '崔同学', target: '腾讯天美核心项目' },
        { id: 'huang', label: '黄同学', target: '网易正式设计师' },
        { id: 'li', label: '李同学', target: '小厂-鹰角-腾讯' },
        { id: 'lu', label: '卢同学', target: '育碧 → 米哈游' },
        { id: 'ma', label: '马同学', target: '本科应届进大厂' }
    ];

    function shuffle(arr) {
        var copy = arr.slice();
        for (var i = copy.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = copy[i];
            copy[i] = copy[j];
            copy[j] = tmp;
        }
        return copy;
    }

    function stopRevealNav(e) {
        e.stopPropagation();
    }

    function CaseMatchGame(root) {
        this.root = root;
        this.pool = root.querySelector('[data-match-pool]');
        this.targets = root.querySelector('[data-match-targets]');
        this.status = root.querySelector('[data-match-status]');
        this.selectedChip = null;
        this.placed = {};
        this.init();
    }

    CaseMatchGame.prototype.bindNavBlock = function () {
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

    CaseMatchGame.prototype.render = function () {
        this.pool.innerHTML = '';
        this.targets.innerHTML = '';
        var labels = shuffle(PAIRS.map(function (p) { return p.label; }));
        var targets = shuffle(PAIRS.map(function (p) { return p.target; }));

        labels.forEach(function (label) {
            var chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'match-chip match-chip-name';
            chip.textContent = label;
            chip.dataset.label = label;
            chip.addEventListener('click', this.onChipClick.bind(this, chip));
            this.pool.appendChild(chip);
        }, this);

        targets.forEach(function (target) {
            var slot = document.createElement('button');
            slot.type = 'button';
            slot.className = 'match-chip match-chip-target';
            slot.dataset.target = target;
            slot.textContent = target;
            slot.addEventListener('click', this.onTargetClick.bind(this, slot));
            this.targets.appendChild(slot);
        }, this);

        this.updateStatus('点击左侧姓名，再点击右侧对应去向完成配对。');
    };

    CaseMatchGame.prototype.feedbackClick = function (el, e) {
        if (typeof ClickFX !== 'undefined') {
            ClickFX.applyClick(el, e);
        }
    };

    CaseMatchGame.prototype.onChipClick = function (chip, e) {
        if (chip.classList.contains('is-placed')) return;
        this.feedbackClick(chip, e);
        if (this.selectedChip) this.selectedChip.classList.remove('is-selected');
        this.selectedChip = chip;
        chip.classList.add('is-selected');
        this.updateStatus('已选「' + chip.dataset.label + '」，请点击对应去向。');
    };

    CaseMatchGame.prototype.onTargetClick = function (slot, e) {
        this.feedbackClick(slot, e);
        if (!this.selectedChip) {
            this.updateStatus('请先选择一位学员姓名。');
            return;
        }
        var label = this.selectedChip.dataset.label;
        var pair = PAIRS.find(function (p) { return p.label === label; });
        var correct = pair && pair.target === slot.dataset.target;

        if (correct) {
            slot.textContent = label + ' → ' + pair.target;
            slot.classList.remove('is-wrong');
            slot.classList.add('is-matched');
            slot.disabled = true;
            this.selectedChip.classList.remove('is-selected');
            this.selectedChip.classList.add('is-placed');
            this.selectedChip.classList.add('is-matched');
            this.selectedChip.disabled = true;
            this.placed[label] = true;
            this.selectedChip = null;
            if (Object.keys(this.placed).length === PAIRS.length) {
                this.updateStatus('全部配对正确！按 → 继续浏览各学员详情。');
            } else {
                this.updateStatus('配对正确，继续下一位。');
            }
        } else {
            slot.classList.add('is-wrong');
            var self = this;
            setTimeout(function () { slot.classList.remove('is-wrong'); }, 600);
            this.updateStatus('不太对，再想想这位同学的去向？');
        }
    };

    CaseMatchGame.prototype.updateStatus = function (msg) {
        if (this.status) this.status.textContent = msg;
    };

    CaseMatchGame.prototype.init = function () {
        this.bindNavBlock();
        this.render();
    };

    CaseMatchGame.prototype.reset = function () {
        this.selectedChip = null;
        this.placed = {};
        this.render();
    };

    global.CaseMatchGame = CaseMatchGame;
})(window);
