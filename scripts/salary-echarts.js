/**
 * Employment module — salary ECharts by country (tabs, legend, time slider, table).
 */
(function (global) {
    'use strict';

    var DATA_URLS = ['data/salary.json', 'contents/data/salary.json'];

    function fetchSalaryData() {
        function tryAt(index) {
            if (index >= DATA_URLS.length) {
                return Promise.reject(new Error('salary.json load failed'));
            }
            return fetch(DATA_URLS[index]).then(function (res) {
                if (!res.ok) return tryAt(index + 1);
                return res.json();
            }, function () {
                return tryAt(index + 1);
            });
        }
        return tryAt(0);
    }

    var COLORS = {
        magenta: '#E01058',
        magentaLight: '#FF3080',
        cyan: '#00A8FF',
        teal: '#00E0A8',
        blue: '#1088FF',
        gold: '#FF8800',
        purple: '#8A40FF',
        orange: '#FF5800',
        gray: '#707070'
    };

    var SFK = {
        grid: 'rgba(179, 179, 179, 0.25)',
        axis: '#B3B3B3',
        tooltipBg: '#1E1E1E',
        tooltipBorder: '#C82464'
    };

    function stopRevealNav(e) {
        e.stopPropagation();
    }

    function prefersReducedMotion() {
        return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function roleColor(role) {
        return COLORS[role.colorKey] || COLORS.magenta;
    }

    function formatSalaryValue(country, value) {
        var fmt = country.salaryFormat;
        if (fmt === 'wan') return value + '万/年';
        if (fmt === 'usd_k') return '$' + value + 'k';
        if (fmt === 'gbp_k') return '£' + value + 'k';
        if (fmt === 'jpy_man') return value + '万日元/年';
        return String(value);
    }

    function SalaryEcharts(root) {
        this.root = root;
        this.data = null;
        this.chart = null;
        this.currentCountry = 'cn';
        this.countryOrder = [];
        this.yearIndex = 5;
        this.hidden = {};
        this.playTimer = null;
        this.tabsEl = root.querySelector('[data-salary-echarts-tabs]');
        this.chartEl = root.querySelector('[data-salary-chart]');
        this.chartWrap = root.querySelector('[data-salary-chart-wrap]');
        this.legendEl = root.querySelector('[data-salary-legend]');
        this.sliderEl = root.querySelector('[data-salary-slider]');
        this.playBtn = root.querySelector('[data-salary-play]');
        this.demandHelpBtn = root.querySelector('[data-salary-demand-help]');
        this.demandPopover = root.querySelector('[data-salary-demand-popover]');
        this.demandCloseBtn = root.querySelector('[data-salary-demand-close]');
        this.tableBody = root.querySelector('[data-salary-table-body]');
        this.tableRangeCol = root.querySelector('[data-salary-table-range-col]');
        this.yearLabel = root.querySelector('[data-salary-year-current]');
        this.bindNavBlock();
        this.bindDemandHelp();
        this.init();
    }

    SalaryEcharts.prototype.bindNavBlock = function () {
        var self = this;
        ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'keydown'].forEach(function (evt) {
            self.root.addEventListener(evt, stopRevealNav, false);
        });
    };

    SalaryEcharts.prototype.init = function () {
        var self = this;
        fetchSalaryData()
            .then(function (data) {
                self.data = data;
                self.countryOrder = data.countryOrder || Object.keys(data.countries);
                self.applyDefaultHiddenRoles();
                self.renderTabs();
                self.renderLegend();
                self.bindSlider();
                self.bindPlay();
                self.initChart();
                self.updateYearLabel();
                self.setCountry(self.countryOrder[0] || 'cn', false);
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        if (self.chart) self.chart.resize();
                    });
                });
            })
            .catch(function (err) {
                console.error('[SalaryEcharts]', err);
                if (self.chartEl) {
                    self.chartEl.textContent = '薪资数据加载失败，请确认 data/salary.json 已部署且可访问。';
                }
            });
    };

    SalaryEcharts.prototype.getCountry = function (key) {
        return this.data && this.data.countries ? this.data.countries[key] : null;
    };

    SalaryEcharts.prototype.applyDefaultHiddenRoles = function () {
        var visible = (this.data && this.data.defaultVisibleRoles) || ['art', 'design', 'ta'];
        this.hidden = {};
        if (!this.data || !this.data.roles) return;
        this.data.roles.forEach(function (role) {
            if (visible.indexOf(role.id) === -1) {
                this.hidden[role.id] = true;
            }
        }, this);
    };

    SalaryEcharts.prototype.syncLegendVisibility = function () {
        if (!this.legendEl) return;
        var self = this;
        this.legendEl.querySelectorAll('.salary-echarts-legend-item').forEach(function (btn) {
            var roleId = btn.dataset.roleId;
            var visible = !self.hidden[roleId];
            btn.classList.toggle('is-hidden', !visible);
            btn.setAttribute('aria-pressed', visible ? 'true' : 'false');
        });
    };

    SalaryEcharts.prototype.renderTabs = function () {
        var self = this;
        if (!this.tabsEl || !this.data) return;
        this.tabsEl.innerHTML = '';
        this.countryOrder.forEach(function (key) {
            var country = self.getCountry(key);
            if (!country) return;
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'salary-toggle-btn';
            btn.dataset.country = key;
            btn.textContent = country.label;
            btn.setAttribute('role', 'tab');
            btn.setAttribute('aria-selected', key === self.currentCountry ? 'true' : 'false');
            btn.addEventListener('click', function (e) {
                self.setCountry(key, true, e);
                if (document.activeElement === btn) btn.blur();
            });
            self.tabsEl.appendChild(btn);
        });
    };

    SalaryEcharts.prototype.renderLegend = function () {
        var self = this;
        if (!this.legendEl || !this.data) return;
        this.legendEl.innerHTML = '';

        var title = document.createElement('p');
        title.className = 'salary-echarts-legend-title';
        title.textContent = '岗位曲线 · 点击隐藏/显示';
        this.legendEl.appendChild(title);

        this.data.roles.forEach(function (role) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'salary-echarts-legend-item';
            btn.dataset.roleId = role.id;
            var visible = !self.hidden[role.id];
            btn.classList.toggle('is-hidden', !visible);
            btn.setAttribute('aria-pressed', visible ? 'true' : 'false');

            var dot = document.createElement('span');
            dot.className = 'salary-echarts-legend-dot';
            dot.style.backgroundColor = roleColor(role);
            btn.appendChild(dot);

            var label = document.createElement('span');
            label.className = 'salary-echarts-legend-label';
            label.textContent = role.name;
            btn.appendChild(label);

            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                self.toggleRole(role.id, e);
            });
            self.legendEl.appendChild(btn);
        });
    };

    SalaryEcharts.prototype.toggleRole = function (roleId, e) {
        this.hidden[roleId] = !this.hidden[roleId];
        var btn = this.legendEl.querySelector('[data-role-id="' + roleId + '"]');
        if (btn) {
            var visible = !this.hidden[roleId];
            btn.classList.toggle('is-hidden', !visible);
            btn.setAttribute('aria-pressed', visible ? 'true' : 'false');
        }
        this.updateChart(true);
    };

    SalaryEcharts.prototype.bindSlider = function () {
        var self = this;
        if (!this.sliderEl || !this.data) return;
        var max = this.data.years.length - 1;
        this.sliderEl.min = '0';
        this.sliderEl.max = String(max);
        this.sliderEl.value = String(this.yearIndex);
        this.sliderEl.setAttribute('aria-valuemin', '0');
        this.sliderEl.setAttribute('aria-valuemax', String(max));
        this.sliderEl.setAttribute('aria-valuenow', String(this.yearIndex));

        this.sliderEl.addEventListener('input', function () {
            self.stopPlay();
            self.yearIndex = parseInt(self.sliderEl.value, 10);
            self.updateYearLabel();
            self.updateChart(true);
        });
    };

    SalaryEcharts.prototype.bindDemandHelp = function () {
        var self = this;
        if (!this.demandHelpBtn || !this.demandPopover) return;

        this.demandHelpBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (self.demandPopover.hidden) {
                self.openDemandPopover(e);
            } else {
                self.closeDemandPopover();
            }
        });

        if (this.demandCloseBtn) {
            this.demandCloseBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                self.closeDemandPopover();
            });
        }

        this.root.addEventListener('click', function (e) {
            if (self.demandPopover.hidden) return;
            if (self.demandPopover.contains(e.target) || self.demandHelpBtn.contains(e.target)) return;
            self.closeDemandPopover();
        });

        this.root.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !self.demandPopover.hidden) {
                e.preventDefault();
                self.closeDemandPopover();
            }
        });
    };

    SalaryEcharts.prototype.openDemandPopover = function (e) {
        this.demandPopover.hidden = false;
        this.demandHelpBtn.classList.add('is-open');
        this.demandHelpBtn.setAttribute('aria-expanded', 'true');
    };

    SalaryEcharts.prototype.closeDemandPopover = function () {
        if (!this.demandPopover) return;
        this.demandPopover.hidden = true;
        if (this.demandHelpBtn) {
            this.demandHelpBtn.classList.remove('is-open');
            this.demandHelpBtn.setAttribute('aria-expanded', 'false');
        }
    };

    SalaryEcharts.prototype.bindPlay = function () {
        var self = this;
        if (!this.playBtn) return;
        this.playBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (self.playTimer) {
                self.stopPlay();
            } else {
                self.startPlay();
            }
        });
    };

    SalaryEcharts.prototype.startPlay = function () {
        var self = this;
        if (prefersReducedMotion()) {
            this.yearIndex = this.data.years.length - 1;
            this.sliderEl.value = String(this.yearIndex);
            this.updateYearLabel();
            this.updateChart(false);
            return;
        }
        this.yearIndex = 0;
        this.sliderEl.value = '0';
        this.updateYearLabel();
        this.updateChart(false);
        this.playBtn.classList.add('is-playing');
        this.playBtn.setAttribute('aria-label', '暂停');

        this.playTimer = global.setInterval(function () {
            if (self.yearIndex >= self.data.years.length - 1) {
                self.stopPlay();
                return;
            }
            self.yearIndex += 1;
            self.sliderEl.value = String(self.yearIndex);
            self.sliderEl.setAttribute('aria-valuenow', String(self.yearIndex));
            self.updateYearLabel();
            self.updateChart(true);
        }, 800);
    };

    SalaryEcharts.prototype.stopPlay = function () {
        if (this.playTimer) {
            global.clearInterval(this.playTimer);
            this.playTimer = null;
        }
        if (this.playBtn) {
            this.playBtn.classList.remove('is-playing');
            this.playBtn.setAttribute('aria-label', '播放');
        }
    };

    SalaryEcharts.prototype.updateYearLabel = function () {
        if (!this.yearLabel || !this.data) return;
        this.yearLabel.textContent = this.data.years[this.yearIndex];
        if (this.sliderEl) {
            this.sliderEl.setAttribute('aria-valuenow', String(this.yearIndex));
        }
    };

    SalaryEcharts.prototype.initChart = function () {
        if (!this.chartEl || typeof echarts === 'undefined') {
            console.error('[SalaryEcharts] ECharts not loaded');
            return;
        }
        this.chart = echarts.init(this.chartEl, null, { renderer: 'canvas' });
        var self = this;
        global.addEventListener('resize', function () {
            if (self.chart) self.chart.resize();
        });
    };

    SalaryEcharts.prototype.buildOption = function () {
        var country = this.getCountry(this.currentCountry);
        if (!country) return {};
        var years = this.data.years.slice(0, this.yearIndex + 1);
        var anim = !prefersReducedMotion();
        var self = this;
        var countryLabel = country.label;

        var series = this.data.roles.map(function (role) {
            var pts = country.series[role.id];
            if (!pts) return null;
            var hidden = self.hidden[role.id];
            var color = roleColor(role);
            return {
                id: role.id,
                name: role.name,
                type: 'line',
                smooth: true,
                showSymbol: years.length <= 3,
                symbolSize: 6,
                data: pts.salary.slice(0, self.yearIndex + 1),
                lineStyle: {
                    width: hidden ? 1.5 : 2.5,
                    opacity: hidden ? 0.15 : 1,
                    color: color
                },
                itemStyle: { color: color, opacity: hidden ? 0.15 : 1 },
                areaStyle: {
                    color: color,
                    opacity: hidden ? 0.02 : 0.08
                },
                emphasis: { disabled: hidden }
            };
        }).filter(Boolean);

        return {
            animation: anim,
            animationDuration: anim ? 400 : 0,
            animationEasing: 'cubicOut',
            grid: { left: 52, right: 16, top: 28, bottom: 32 },
            tooltip: {
                trigger: 'axis',
                backgroundColor: SFK.tooltipBg,
                borderColor: SFK.tooltipBorder,
                borderWidth: 2,
                padding: [12, 16],
                textStyle: { color: '#fff', fontSize: 18, lineHeight: 27 },
                extraCssText: 'border-radius:4px;box-shadow:0 4px 16px rgba(0,0,0,0.45);',
                axisPointer: {
                    type: 'cross',
                    crossStyle: { color: 'rgba(179,179,179,0.4)' },
                    lineStyle: { color: 'rgba(179,179,179,0.4)', width: 1.5 }
                },
                formatter: function (params) {
                    if (!params || !params.length) return '';
                    var idx = params[0].dataIndex;
                    var year = years[idx];
                    var lines = [
                        '<strong style="font-size:20px">' + year + '</strong>',
                        '<span style="color:#B3B3B3;font-size:14px">' + countryLabel + '</span>'
                    ];
                    params.forEach(function (p) {
                        var sid = p.seriesId || (self.data.roles[p.seriesIndex] && self.data.roles[p.seriesIndex].id);
                        if (sid && self.hidden[sid]) return;
                        var meta = sid ? country.series[sid] : null;
                        if (!meta) return;
                        var salary = meta.salary[idx];
                        var demand = meta.demand[idx];
                        var prev = idx > 0 ? meta.demand[idx - 1] : demand;
                        var delta = demand - prev;
                        var deltaStr = delta >= 0 ? '+' + delta : String(delta);
                        lines.push(
                            '<span style="color:' + p.color + '">●</span> ' + p.seriesName +
                            ' · ' + formatSalaryValue(country, salary) +
                            ' · <span style="color:#00E0A8">需求 ' + deltaStr + '</span>'
                        );
                    });
                    return lines.join('<br/>');
                }
            },
            xAxis: {
                type: 'category',
                data: years,
                boundaryGap: false,
                axisLine: { lineStyle: { color: SFK.axis } },
                axisLabel: { color: SFK.axis, fontSize: 11 },
                axisTick: { show: false }
            },
            yAxis: {
                type: 'value',
                name: country.yAxis.name,
                nameTextStyle: { color: SFK.axis, fontSize: 11, padding: [0, 0, 0, 8] },
                axisLine: { show: false },
                axisLabel: { color: SFK.axis, fontSize: 11 },
                splitLine: { lineStyle: { color: SFK.grid } }
            },
            series: series
        };
    };

    SalaryEcharts.prototype.updateChart = function () {
        if (!this.chart || !this.data) return;
        this.chart.setOption(this.buildOption(), { notMerge: true, lazyUpdate: false });
    };

    SalaryEcharts.prototype.renderTable = function () {
        if (!this.tableBody || !this.data) return;
        var country = this.getCountry(this.currentCountry);
        if (!country) return;
        if (this.tableRangeCol && country.yAxis && country.yAxis.name) {
            this.tableRangeCol.textContent = country.yAxis.name.replace('薪资 ', '薪资参考 ');
        }
        var roleNames = {};
        var tableRoleIds = this.data.tableRoles || [];
        this.data.roles.forEach(function (role) {
            roleNames[role.id] = role.name;
        });
        var tableRows = tableRoleIds.map(function (id) {
            var name = roleNames[id];
            if (!name) return null;
            return country.table.find(function (row) { return row.role === name; });
        }).filter(Boolean);

        this.tableBody.innerHTML = '';
        tableRows.forEach(function (row) {
            var tr = document.createElement('tr');
            ['role', 'range', 'trend'].forEach(function (key) {
                var td = document.createElement('td');
                td.textContent = row[key];
                if (key === 'trend') {
                    td.className = row.trendType === 'up'
                        ? 'salary-echarts-trend-up'
                        : 'salary-echarts-trend-flat';
                }
                tr.appendChild(td);
            });
            this.tableBody.appendChild(tr);
        }, this);
    };

    SalaryEcharts.prototype.setCountry = function (key, animate, e) {
        if (!this.data || !this.getCountry(key)) return;
        this.currentCountry = key;
        var self = this;

        this.tabsEl.querySelectorAll('.salary-toggle-btn').forEach(function (btn) {
            var active = btn.dataset.country === key;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        if (animate && this.chartWrap) {
            this.chartWrap.classList.remove('is-swapping');
            void this.chartWrap.offsetWidth;
            this.chartWrap.classList.add('is-swapping');
        }

        this.renderTable();
        this.updateChart();

        requestAnimationFrame(function () {
            if (self.chart) self.chart.resize();
        });
    };

    SalaryEcharts.prototype.resize = function () {
        if (this.chart) this.chart.resize();
    };

    SalaryEcharts.prototype.reset = function () {
        this.stopPlay();
        this.closeDemandPopover();
        this.applyDefaultHiddenRoles();
        this.yearIndex = this.data ? this.data.years.length - 1 : 5;
        if (this.sliderEl && this.data) {
            this.sliderEl.value = String(this.yearIndex);
        }
        this.updateYearLabel();
        this.syncLegendVisibility();
        this.setCountry(this.countryOrder[0] || 'cn', false);
    };

    SalaryEcharts.prototype.destroy = function () {
        this.stopPlay();
        this.closeDemandPopover();
        if (this.chart) {
            this.chart.dispose();
            this.chart = null;
        }
    };

    global.SalaryEcharts = SalaryEcharts;
})(window);
