/**
 * Focus profile registry for deck remote control.
 * Used by generate-deck-nav.js (Node) and documented in docs/guides/REMOTE_FOCUS_MAP.md.
 */
'use strict';

var FOCUS_PROFILES = {
    'segment-arrow-4': {
        label: '议程 · 4 段箭头',
        selectors: ['[data-segment-arrow-segment]'],
        layout: { cols: 4, rows: 1 }
    },
    'segment-arrow-3': {
        label: '成长性 · 3 段箭头',
        selectors: ['[data-segment-arrow-segment]'],
        layout: { cols: 3, rows: 1 }
    },
    'case-card-grid': {
        label: '案例概览 · 5 卡',
        selectors: ['[data-case-card][data-goto]'],
        layout: { cols: 5, rows: 1 }
    },
    'case-match-page': {
        label: '案例页 · 卡片 + 对对碰',
        selectors: [
            '[data-case-card][data-goto]',
            '.match-chip:not(.is-placed)'
        ],
        layout: { cols: 5, rows: 2 },
        dynamic: true
    },
    'salary-echarts': {
        label: '薪资 ECharts',
        selectors: [
            '.salary-toggle-btn',
            '.salary-echarts-legend-item',
            '[data-salary-play]',
            '[data-salary-demand-help]'
        ],
        layout: { cols: 1, rows: 4 },
        dynamic: true
    },
    'major-picker': {
        label: '兴趣专业选择',
        selectors: ['.major-pick-chip'],
        layout: { cols: 3, rows: 0 },
        dynamic: true
    },
    'portfolio-axis': {
        label: '作品集三轴',
        selectors: ['.portfolio-axis-chip'],
        layout: { cols: 3, rows: 0 },
        dynamic: true
    }
};

/**
 * @param {{ id?: string, kind?: string, className?: string, attrs?: Record<string,string> }} slide
 * @returns {string|null}
 */
function detectFocusProfile(slide) {
    var id = slide.id || '';
    var kind = slide.kind || '';
    var cls = slide.className || '';
    var attrs = slide.attrs || {};

    if (kind === 'agenda' || id === 'agenda') return 'segment-arrow-4';
    if (id === 'major-growth' || cls.indexOf('slide-major-growth') !== -1) return 'segment-arrow-3';
    if (id === 'case-match') return 'case-match-page';
    if (id === 'salary-cn-us' || cls.indexOf('slide-employment-salary-echarts') !== -1) return 'salary-echarts';
    if (attrs['data-major-picker'] !== undefined || id === 'major-interest') return 'major-picker';
    if (attrs['data-portfolio-axis'] !== undefined || id === 'portfolio-trends') return 'portfolio-axis';
    if (attrs['data-segment-arrow'] !== undefined) {
        if (cls.indexOf('slide-agenda') !== -1) return 'segment-arrow-4';
        return 'segment-arrow-3';
    }

    return null;
}

/**
 * Static target templates for deck-nav.json (documentation / fallback order).
 * @param {string} profileId
 * @returns {object[]}
 */
function buildStaticTargets(profileId) {
    var profile = FOCUS_PROFILES[profileId];
    if (!profile) return [];

    if (profileId === 'segment-arrow-4') {
        return [
            { id: 'agenda-seg-1', selector: "[data-segment-arrow-segment][data-goto='#/portfolio-planning']", action: 'click', order: 1 },
            { id: 'agenda-seg-2', selector: "[data-segment-arrow-segment][data-goto='#/case-studies']", action: 'click', order: 2 },
            { id: 'agenda-seg-3', selector: "[data-segment-arrow-segment][data-goto='#/employment-global']", action: 'click', order: 3 },
            { id: 'agenda-seg-4', selector: "[data-segment-arrow-segment][data-goto='#/major-direction']", action: 'click', order: 4 }
        ];
    }

    if (profileId === 'segment-arrow-3') {
        return [1, 2, 3].map(function (n) {
            return {
                id: 'growth-seg-' + n,
                selector: '[data-segment-arrow-segment]:nth-child(' + n + ')',
                action: 'click',
                order: n
            };
        });
    }

    if (profileId === 'case-card-grid' || profileId === 'case-match-page') {
        var cases = ['cui', 'huang', 'li', 'lu', 'ma'];
        return cases.map(function (name, i) {
            return {
                id: 'case-card-' + name,
                selector: "[data-case-card][data-goto='#/case-" + name + "']",
                action: 'click',
                order: i + 1
            };
        }).concat([
            { id: 'match-pool', selector: '.match-pool .match-chip', action: 'click', order: 6, dynamic: true },
            { id: 'match-targets', selector: '.match-targets .match-chip', action: 'click', order: 7, dynamic: true }
        ]);
    }

    return profile.selectors.map(function (sel, i) {
        return {
            id: profileId + '-' + (i + 1),
            selector: sel,
            action: 'click',
            order: i + 1,
            dynamic: !!profile.dynamic
        };
    });
}

function attachFocusToSlides(slides) {
    slides.forEach(function (slide) {
        var profile = detectFocusProfile(slide);
        slide.focusProfile = profile;
        slide.focusTargets = profile ? buildStaticTargets(profile) : [];
    });
}

module.exports = {
    FOCUS_PROFILES: FOCUS_PROFILES,
    detectFocusProfile: detectFocusProfile,
    buildStaticTargets: buildStaticTargets,
    attachFocusToSlides: attachFocusToSlides
};
