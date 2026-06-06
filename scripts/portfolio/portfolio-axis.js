/**
 * Portfolio planning — pick one trait, school type, and trend; surface intersection advice.
 */
(function (global) {
    'use strict';

    var AXES = {
        trait: {
            label: '学生特点',
            accent: 'var(--sfk-magenta)',
            options: [
                { id: 'tech', label: '技术流', hint: '3D / 编程 / 引擎工具链' },
                { id: 'concept', label: '概念流', hint: '调研 / 叙事 / 批判性思考' }
            ]
        },
        school: {
            label: '院校偏好',
            accent: 'var(--sfk-magenta-light)',
            options: [
                { id: 'academic', label: '学术 / 实验向', hint: 'RCA · UAL · RISD …' },
                { id: 'industry', label: '就业 / 工程向', hint: 'CMU · SMU · ACCD …' }
            ]
        },
        trend: {
            label: '时下热点',
            accent: 'var(--sfk-cyan, #66CCFF)',
            options: [
                { id: 'tech-hot', label: '技术热点', hint: 'AIGC · MR · 数字孪生' },
                { id: 'social-hot', label: '社会热点', hint: '心理健康 · 可持续 · 非遗' }
            ]
        }
    };

    var INSIGHTS = {
        'tech|academic|tech-hot': '以技术实验回应 AIGC / 空间计算议题——research 记录 + 可运行原型，适合 RCA / UAL 类院校。',
        'tech|academic|social-hot': '用交互装置或数字孪生探讨社会议题，强调「技术如何服务议题」而非炫技。',
        'tech|industry|tech-hot': '引擎 Demo + 性能优化 + 用户测试闭环，对标 CMU ETC / 游戏工程向 brief。',
        'tech|industry|social-hot': '可落地的产品原型（如治愈系 App / 适老化交互），突出工程验证与可用性测试。',
        'concept|academic|tech-hot': '批判性研究 AIGC 与人机协作，材料实验 + 论文式 reflection，适合艺术院校研究生。',
        'concept|academic|social-hot': '从个人或社会观察出发的 research 链——黄同学式「真实体验 → 作品集主线」。',
        'concept|industry|tech-hot': 'UX / 服务设计 + 新兴硬件场景，强调 problem → prototype → iteration。',
        'concept|industry|social-hot': 'Social Impact 导向的完整设计流程，含用户调研与设计规范文档。'
    };

    function stopRevealNav(e) {
        e.stopPropagation();
    }

    function PortfolioAxisPicker(root) {
        this.root = root;
        this.columnsEl = root.querySelector('[data-axis-columns]');
        this.resultEl = root.querySelector('[data-axis-result]');
        this.selected = { trait: null, school: null, trend: null };
        this.bindNavBlock();
        this.renderColumns();
    }

    PortfolioAxisPicker.prototype.bindNavBlock = function () {
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

    PortfolioAxisPicker.prototype.renderColumns = function () {
        var self = this;
        this.columnsEl.innerHTML = '';
        Object.keys(AXES).forEach(function (key) {
            var axis = AXES[key];
            var col = document.createElement('div');
            col.className = 'portfolio-axis-col';
            col.innerHTML = '<p class="portfolio-axis-col-label">' + axis.label + '</p>';
            var pool = document.createElement('div');
            pool.className = 'portfolio-axis-pool';
            axis.options.forEach(function (opt) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'portfolio-axis-chip';
                btn.dataset.axis = key;
                btn.dataset.id = opt.id;
                btn.innerHTML = '<span class="portfolio-axis-chip-label">' + opt.label + '</span>';
                btn.addEventListener('click', function (e) {
                    self.onChipClick(key, opt.id, btn, e);
                });
                pool.appendChild(btn);
            });
            col.appendChild(pool);
            self.columnsEl.appendChild(col);
        });
        this.updateResult();
    };

    PortfolioAxisPicker.prototype.onChipClick = function (axisKey, id, btn, e) {
        var pool = btn.parentElement;
        pool.querySelectorAll('.portfolio-axis-chip').forEach(function (chip) {
            chip.classList.remove('is-selected');
        });
        btn.classList.add('is-selected');
        this.selected[axisKey] = id;
        if (typeof ClickFX !== 'undefined') {
            ClickFX.playPunch(btn, 'is-punching');
        }
        this.updateResult();
    };

    PortfolioAxisPicker.prototype.updateResult = function () {
        var s = this.selected;
        var complete = s.trait && s.school && s.trend;
        if (!complete) {
            var missing = [];
            if (!s.trait) missing.push('学生特点');
            if (!s.school) missing.push('院校偏好');
            if (!s.trend) missing.push('时下热点');
            this.resultEl.classList.remove('is-ready');
            this.resultEl.innerHTML = '<span class="portfolio-axis-placeholder">请各选一项：' +
                missing.join(' · ') + '</span>';
            return;
        }
        var key = s.trait + '|' + s.school + '|' + s.trend;
        var insight = INSIGHTS[key] || '三轴交汇：把个人标签、院校 brief 与时代议题编织成一条可证明的主线。';
        this.resultEl.classList.add('is-ready');
        this.resultEl.innerHTML = '<span class="portfolio-axis-formula">' +
            '<span class="portfolio-axis-color-trait">' + this.labelFor('trait', s.trait) + '</span> × ' +
            '<span class="portfolio-axis-color-school">' + this.labelFor('school', s.school) + '</span> × ' +
            '<span class="portfolio-axis-color-trend">' + this.labelFor('trend', s.trend) + '</span>' +
            '</span><p class="portfolio-axis-insight"><span class="portfolio-axis-insight-label">作品方向建议</span>' +
            insight + '</p>';
    };

    PortfolioAxisPicker.prototype.labelFor = function (axisKey, id) {
        var axis = AXES[axisKey];
        var opt = axis.options.find(function (o) { return o.id === id; });
        return opt ? opt.label : id;
    };

    PortfolioAxisPicker.prototype.reset = function () {
        this.selected = { trait: null, school: null, trend: null };
        this.renderColumns();
    };

    global.PortfolioAxisPicker = PortfolioAxisPicker;
})(window);
