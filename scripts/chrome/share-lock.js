/**
 * Share lock — open a single slide via ?share=slug with deck navigation disabled.
 * Registry: config/share-pages.json (slug → slideId).
 */
(function (global) {
    'use strict';

    var REGISTRY_URL = (global.ShareLockConfig && global.ShareLockConfig.registryUrl) || 'config/share-pages.json';

    function getTitleSuffix() {
        if (global.ShareLockConfig && global.ShareLockConfig.titleSuffix != null) {
            return global.ShareLockConfig.titleSuffix;
        }
        return ' · 斯芬克游戏动画科系';
    }
    var NAV_KEY_CODES = {
        32: true,
        33: true,
        34: true,
        35: true,
        36: true,
        37: true,
        39: true,
        27: true
    };

    var state = {
        active: false,
        slug: null,
        slideId: null,
        slideEl: null,
        indices: null,
        meta: null
    };

    function parseShareSlug() {
        var params = new URLSearchParams(global.location.search);
        var slug = params.get('share') || params.get('page') || '';
        return slug.trim();
    }

    function onNavKeyBlock(e) {
        if (!state.active) return;
        if (NAV_KEY_CODES[e.keyCode] || NAV_KEY_CODES[e.which]) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }
    }

    function snapToShareSlide(Reveal) {
        if (!state.active || !state.slideEl || !Reveal) return;
        var current = Reveal.getCurrentSlide();
        if (current !== state.slideEl) {
            Reveal.slide(state.indices.h, state.indices.v);
        }
    }

    function init() {
        var slug = parseShareSlug();
        if (!slug) {
            return Promise.resolve(false);
        }

        return fetch(REGISTRY_URL)
            .then(function (res) {
                if (!res.ok) throw new Error('config/share-pages.json load failed');
                return res.json();
            })
            .then(function (registry) {
                var page = registry.pages && registry.pages[slug];
                if (!page || !page.slideId) {
                    throw new Error('Unknown share slug: ' + slug);
                }
                var el = document.getElementById(page.slideId);
                if (!el) {
                    throw new Error('Share slide not found: #' + page.slideId);
                }
                state.active = true;
                state.slug = slug;
                state.slideId = page.slideId;
                state.slideEl = el;
                state.meta = page;
                document.documentElement.classList.add('share-locked');
                if (document.body) {
                    document.body.classList.add('share-locked');
                }
                if (page.title) {
                    document.title = page.title + getTitleSuffix();
                }
                return true;
            })
            .catch(function (err) {
                console.error('[ShareLock]', err);
                document.documentElement.classList.add('share-locked');
                if (document.body) {
                    document.body.classList.add('share-locked', 'share-locked-error');
                    document.body.innerHTML =
                        '<div class="share-lock-error">' +
                        '<h1>页面不可用</h1>' +
                        '<p>分享链接无效或目标页未找到（' + slug + '）。</p>' +
                        '</div>';
                }
                return false;
            });
    }

    function isActive() {
        return state.active;
    }

    function getRevealConfigOverrides() {
        if (!state.active) {
            return {};
        }
        return {
            hash: false,
            controls: false,
            progress: false,
            slideNumber: false,
            keyboard: false,
            touch: false,
            overview: false,
            help: false,
            plugins: []
        };
    }

    function applyAfterReady(Reveal) {
        if (!state.active || !state.slideEl || !Reveal) return;

        state.indices = Reveal.getIndices(state.slideEl);
        Reveal.slide(state.indices.h, state.indices.v);

        Reveal.on('slidechanged', function () {
            snapToShareSlide(Reveal);
        });

        global.addEventListener('hashchange', function () {
            snapToShareSlide(Reveal);
        });

        document.addEventListener('keydown', onNavKeyBlock, true);

        document.querySelectorAll('[data-goto]').forEach(function (node) {
            node.setAttribute('tabindex', '-1');
            node.setAttribute('aria-disabled', 'true');
        });
    }

    global.ShareLock = {
        init: init,
        isActive: isActive,
        getRevealConfigOverrides: getRevealConfigOverrides,
        applyAfterReady: applyAfterReady
    };
})(window);
