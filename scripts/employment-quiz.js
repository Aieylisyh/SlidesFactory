/**
 * Employment module — "这和我有关吗？" quick relevance quiz.
 */
(function (global) {
    'use strict';

    var PROMPTS = [
        {
            text: '手游与跨平台商业化，仍是国内数字娱乐最大的基本盘。',
            related: true,
            note: '无论美术还是程序，移动端项目经验都直接影响国内求职面。'
        },
        {
            text: '《黑神话：悟空》等国产重磅作品，证明高品质内容也能带动全球讨论与岗位需求。',
            related: true,
            note: '叙事、美术、技术向都能被顶级项目验证——关键是可展示的作品质量。'
        },
        {
            text: '生成式 AI 正在改变资产生成与原型流程，但无法替代完整项目与协作能力。',
            related: true,
            note: '把 AI 写进作品集流程，比焦虑「被取代」更重要。'
        },
        {
            text: '游戏行业只适合编程天才，非理工科无法入行。',
            related: false,
            note: '五位学员案例覆盖美术、设计、策划、技术——路径多元。'
        }
    ];

    function stopRevealNav(e) {
        e.stopPropagation();
    }

    function EmploymentRelateQuiz(root) {
        this.root = root;
        this.promptEl = root.querySelector('[data-employ-quiz-prompt]');
        this.actionsEl = root.querySelector('[data-employ-quiz-actions]');
        this.statusEl = root.querySelector('[data-employ-quiz-status]');
        this.progressEl = root.querySelector('[data-employ-quiz-progress]');
        this.index = 0;
        this.score = 0;
        this.bindNavBlock();
        this.render();
    }

    EmploymentRelateQuiz.prototype.bindNavBlock = function () {
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

    EmploymentRelateQuiz.prototype.render = function () {
        if (this.index >= PROMPTS.length) {
            this.showSummary();
            return;
        }
        var item = PROMPTS[this.index];
        this.promptEl.textContent = item.text;
        if (this.progressEl) {
            this.progressEl.textContent = '第 ' + (this.index + 1) + ' / ' + PROMPTS.length + ' 题';
        }
        this.actionsEl.innerHTML = '';
        this.addChoice('与我有关', true);
        this.addChoice('暂时无关', false);
        this.updateStatus('判断这条趋势是否与你未来的作品集 / 就业路径相关。');
    };

    EmploymentRelateQuiz.prototype.addChoice = function (label, value) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'employ-quiz-btn';
        btn.textContent = label;
        btn.addEventListener('click', this.onChoice.bind(this, value));
        this.actionsEl.appendChild(btn);
    };

    EmploymentRelateQuiz.prototype.onChoice = function (value, e) {
        if (e && e.currentTarget && document.activeElement === e.currentTarget) {
            e.currentTarget.blur();
        }
        var item = PROMPTS[this.index];
        var correct = item.related === value;
        if (correct) this.score += 1;
        this.updateStatus((correct ? '✓ ' : '→ ') + item.note);
        this.index += 1;
        var self = this;
        setTimeout(function () {
            self.render();
        }, correct ? 900 : 1400);
    };

    EmploymentRelateQuiz.prototype.showSummary = function () {
        this.promptEl.textContent = '小结：行业在变，但「可证明的项目 + 清晰路径」始终有效。';
        this.actionsEl.innerHTML = '';
        if (this.progressEl) {
            this.progressEl.textContent = '完成 ' + this.score + ' / ' + PROMPTS.length;
        }
        this.updateStatus('按 → 继续查看中美薪资与岗位结构。');
    };

    EmploymentRelateQuiz.prototype.updateStatus = function (msg) {
        if (this.statusEl) this.statusEl.textContent = msg;
    };

    EmploymentRelateQuiz.prototype.reset = function () {
        this.index = 0;
        this.score = 0;
        this.render();
    };

    global.EmploymentRelateQuiz = EmploymentRelateQuiz;
})(window);
