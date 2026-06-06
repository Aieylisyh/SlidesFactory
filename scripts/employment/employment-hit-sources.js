/**
 * Employment hits slide — stat hover popover; hero hover cursor tip + click to open source.
 */
(function (global) {
    'use strict';

    var HERO_LINKS = {
        wukong: {
            label: 'Steam · 黑神话：悟空 商店页',
            url: 'https://store.steampowered.com/app/2358720/Black_Myth_Wukong/'
        },
        nezha: {
            label: '百度百科 · 哪吒之魔童闹海',
            url: 'https://baike.baidu.com/item/%E5%93%AA%E5%90%92%E4%B9%8B%E9%AD%94%E7%AB%A5%E9%97%B9%E6%B5%B7/61115689'
        }
    };

    var SOURCES = {
        'wukong-first-year': {
            title: '2024 首年销量',
            detail: '2024 国游销量榜（2025 年 1 月发布）：黑神话：悟空 2024 年首年销量约 2800 万套量级。',
            url: 'https://www.gamelook.com.cn/',
            linkLabel: '查看行业报道（GameLook）'
        },
        'wukong-revenue': {
            title: '首年销售额',
            detail: '同上榜单口径：首年销售额约 90 亿元人民币（行业综合统计，非公司单独财报）。',
            url: 'https://www.gamelook.com.cn/',
            linkLabel: '查看行业报道（GameLook）'
        },
        'wukong-cumulative': {
            title: '累计销量',
            detail: '2025 年后 Steam 等平台持续销售；公开报道累计销量突破 3000 万套。',
            url: 'https://store.steampowered.com/app/2358720/Black_Myth_Wukong/',
            linkLabel: 'Steam 商店页'
        },
        'wukong-rank-2024': {
            title: '2024 年度销量',
            detail: '2024 国游销量榜：全球年度销量第一（买断制国产 3A 语境下的行业统计）。',
            url: 'https://www.yystv.cn/',
            linkLabel: '游研社相关报道'
        },
        'nezha-domestic': {
            title: '内地收官票房',
            detail: '猫眼专业版 / 下映口径：内地票房 154.45 亿元（截至 2025-06-30 行业报道汇总）。',
            url: 'https://piao.maoyan.com/boxoffice',
            linkLabel: '猫眼票房（专业版）'
        },
        'nezha-audience': {
            title: '观影人次',
            detail: '猫眼及主流媒体报道：累计观影人次约 3.24 亿。',
            url: 'https://piao.maoyan.com/boxoffice',
            linkLabel: '猫眼票房（专业版）'
        },
        'nezha-global': {
            title: '全球票房',
            detail: '央视新闻等：全球票房 159 亿元+（含海外发行，动画电影语境）。',
            url: 'https://news.cctv.com/',
            linkLabel: '央视新闻'
        },
        'nezha-rank': {
            title: '影史总榜',
            detail: '全球动画票房冠军；全球影史票房前五（2025 年下映阶段公开数据汇总）。',
            url: 'https://piao.maoyan.com/boxoffice',
            linkLabel: '猫眼票房（专业版）'
        }
    };

    var popover = null;
    var heroTip = null;
    var activeId = null;
    var hideTimer = null;
    var activeHeroKey = null;

    function stopRevealNav(e) {
        e.stopPropagation();
    }

    function stopRevealNavKeys(e) {
        var keys = [' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'];
        if (keys.indexOf(e.key) !== -1) {
            e.stopPropagation();
            e.preventDefault();
        }
    }

    function ensurePopover() {
        if (popover) return;
        popover = document.createElement('div');
        popover.className = 'employment-hit-source-popover';
        popover.setAttribute('role', 'tooltip');
        popover.hidden = true;
        popover.innerHTML =
            '<p class="employment-hit-source-popover__kicker" data-popover-kicker></p>' +
            '<p class="employment-hit-source-popover__detail" data-popover-detail></p>';
        document.body.appendChild(popover);
    }

    function positionPopover(anchor) {
        if (!popover || !anchor) return;
        var rect = anchor.getBoundingClientRect();
        var pad = 8;
        var popRect = popover.getBoundingClientRect();
        var left = rect.left + rect.width / 2 - popRect.width / 2;
        var top = rect.top - popRect.height - pad;
        if (top < 12) {
            top = rect.bottom + pad;
            popover.classList.add('is-below');
        } else {
            popover.classList.remove('is-below');
        }
        left = Math.max(12, Math.min(left, window.innerWidth - popRect.width - 12));
        popover.style.left = left + 'px';
        popover.style.top = top + 'px';
    }

    function showPopover(id, anchor) {
        var meta = SOURCES[id];
        if (!meta || !anchor) return;
        ensurePopover();
        activeId = id;

        popover.querySelector('[data-popover-kicker]').textContent = '数据来源 · ' + meta.title;
        popover.querySelector('[data-popover-detail]').textContent = meta.detail;

        popover.hidden = false;
        popover.classList.add('is-visible');
        document.body.classList.add('is-employment-hit-popover-open');
        anchor.classList.add('is-source-active');
        anchor.setAttribute('aria-expanded', 'true');

        requestAnimationFrame(function () {
            positionPopover(anchor);
        });
    }

    function hidePopover() {
        if (!popover) return;
        popover.hidden = true;
        popover.classList.remove('is-visible');
        document.body.classList.remove('is-employment-hit-popover-open');
        document.querySelectorAll('.employment-hit-stat.is-source-active').forEach(function (el) {
            el.classList.remove('is-source-active');
            el.setAttribute('aria-expanded', 'false');
        });
        activeId = null;
    }

    function scheduleHide() {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(hidePopover, 120);
    }

    function cancelHide() {
        clearTimeout(hideTimer);
    }

    function enhanceStat(el) {
        var id = el.getAttribute('data-hit-source');
        if (!id || !SOURCES[id] || el._hitSourceBound) return;
        el._hitSourceBound = true;

        if (el.tagName !== 'BUTTON') {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = el.className;
            btn.setAttribute('data-hit-source', id);
            btn.setAttribute('aria-label', (el.querySelector('span') || {}).textContent + '，查看数据来源');
            btn.innerHTML = el.innerHTML;
            el.parentNode.replaceChild(btn, el);
            el = btn;
        }

        el.addEventListener('mouseenter', function () {
            cancelHide();
            showPopover(id, el);
        });
        el.addEventListener('mouseleave', scheduleHide);
        el.addEventListener('focus', function () {
            cancelHide();
            showPopover(id, el);
        });
        el.addEventListener('blur', scheduleHide);
        el.addEventListener('mousedown', stopRevealNav);
        el.addEventListener('click', stopRevealNav);
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                e.stopPropagation();
                hidePopover();
                el.blur();
            } else {
                stopRevealNavKeys(e);
            }
        });
    }

    function ensureHeroTip() {
        if (heroTip) return;
        heroTip = document.createElement('div');
        heroTip.className = 'employment-hit-hero-cursor-tip';
        heroTip.setAttribute('role', 'tooltip');
        heroTip.hidden = true;
        document.body.appendChild(heroTip);
    }

    function positionHeroTip(e) {
        if (!heroTip || heroTip.hidden) return;
        heroTip.style.left = e.clientX + 'px';
        heroTip.style.top = e.clientY + 'px';
    }

    function showHeroTip(key, e) {
        var meta = HERO_LINKS[key];
        if (!meta) return;
        ensureHeroTip();
        activeHeroKey = key;
        heroTip.textContent = meta.label + ' · 点击打开';
        heroTip.hidden = false;
        heroTip.classList.toggle('is-wukong', key === 'wukong');
        heroTip.classList.toggle('is-film', key === 'nezha');
        positionHeroTip(e);
    }

    function hideHeroTip() {
        if (!heroTip) return;
        heroTip.hidden = true;
        heroTip.classList.remove('is-wukong', 'is-film');
        activeHeroKey = null;
    }

    function enhanceHero(figure) {
        var key = figure.getAttribute('data-hit-hero');
        var meta = HERO_LINKS[key];
        if (!meta || figure._hitHeroBound) return;
        figure._hitHeroBound = true;
        figure.classList.add('employment-hit-hero--link');
        figure.setAttribute('tabindex', '0');
        figure.setAttribute('role', 'button');
        figure.setAttribute('aria-label', meta.label + '，点击在浏览器打开');

        figure.addEventListener('mouseenter', function (e) {
            showHeroTip(key, e);
        });
        figure.addEventListener('mousemove', function (e) {
            stopRevealNav(e);
            positionHeroTip(e);
        });
        figure.addEventListener('mouseleave', function () {
            hideHeroTip();
        });
        figure.addEventListener('mousedown', stopRevealNav);
        figure.addEventListener('mouseup', stopRevealNav);
        figure.addEventListener('click', function (e) {
            stopRevealNav(e);
            window.open(meta.url, '_blank', 'noopener,noreferrer');
        });
        figure.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                stopRevealNav(e);
                e.preventDefault();
                window.open(meta.url, '_blank', 'noopener,noreferrer');
            } else {
                stopRevealNavKeys(e);
            }
        });
    }

    function initSlide(slide) {
        if (!slide) return;
        slide.querySelectorAll('[data-hit-hero]').forEach(enhanceHero);
        slide.querySelectorAll('.employment-hit-stat[data-hit-source]').forEach(enhanceStat);
    }

    function resetSlide(slide) {
        hidePopover();
        hideHeroTip();
        if (slide) {
            slide.querySelectorAll('.employment-hit-stat[data-hit-source]').forEach(function (el) {
                el.classList.remove('is-source-active');
            });
        }
    }

    global.EmploymentHitSources = {
        initSlide: initSlide,
        reset: resetSlide
    };
})(window);
