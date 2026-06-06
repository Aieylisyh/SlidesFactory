/**
 * Lazy-load Bilibili official embed player on slide enter; unload on leave.
 * Full www.bilibili.com pages cannot be iframe-embedded (frame-ancestors).
 *
 * Quality: default requests 1080P (qn=80), fallback semantics per Bilibili embed.
 * Mount is deferred until the slide container has real layout size (Reveal scale).
 */
(function () {
    'use strict';

    var PLAYER_BASE = 'https://player.bilibili.com/player.html';
    /** Bilibili qn: 64 = 720P, 80 = 1080P (max non-premium for most UGC) */
    var DEFAULT_QUALITY = 80;
    var MIN_HOST_W = 320;
    var MIN_HOST_H = 180;
    var MOUNT_RETRY_MS = 180;
    var MOUNT_MAX_RETRIES = 12;

    function buildSrc(meta) {
        var params = [];
        if (meta.aid) params.push('aid=' + encodeURIComponent(String(meta.aid)));
        params.push('bvid=' + encodeURIComponent(meta.bvid));
        if (meta.cid) params.push('cid=' + encodeURIComponent(String(meta.cid)));
        params.push('p=' + encodeURIComponent(String(meta.page || 1)));
        params.push('danmaku=0', 'autoplay=0', 'as_wide=1', 'high_quality=1');
        params.push('quality=' + encodeURIComponent(String(meta.quality || DEFAULT_QUALITY)));
        params.push('try_look=1');
        return PLAYER_BASE + '?' + params.join('&');
    }

    function formatCount(n) {
        var num = Number(n);
        if (!isFinite(num) || num < 0) return '';
        if (num >= 10000) {
            return (num / 10000).toFixed(1).replace(/\.0$/, '') + ' 万';
        }
        return String(num);
    }

    function updateMeta(metaEl, stat) {
        if (!metaEl || !stat) return;
        var viewEl = metaEl.querySelector('[data-bilibili-view]');
        var likeEl = metaEl.querySelector('[data-bilibili-like]');
        if (viewEl && stat.view != null) {
            viewEl.textContent = '播放 ' + formatCount(stat.view);
        }
        if (likeEl && stat.like != null) {
            likeEl.textContent = '点赞 ' + formatCount(stat.like);
        }
    }

    function fetchVideoMeta(bvid) {
        return fetch('https://api.bilibili.com/x/web-interface/view?bvid=' + encodeURIComponent(bvid), {
            credentials: 'omit'
        })
            .then(function (res) { return res.json(); })
            .then(function (json) {
                if (!json || json.code !== 0 || !json.data) return null;
                var data = json.data;
                var pageInfo = data.pages && data.pages[0] ? data.pages[0] : null;
                return {
                    bvid: bvid,
                    aid: data.aid,
                    cid: pageInfo ? pageInfo.cid : data.cid,
                    page: 1,
                    quality: DEFAULT_QUALITY,
                    stat: data.stat || null
                };
            })
            .catch(function () { return null; });
    }

    function hostHasLayoutSize(host) {
        var rect = host.getBoundingClientRect();
        return rect.width >= MIN_HOST_W && rect.height >= MIN_HOST_H;
    }

    function whenLayoutReady(fn) {
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                if (typeof Reveal !== 'undefined' && Reveal.layout) {
                    Reveal.layout();
                }
                fn();
            });
        });
    }

    function ensureIframe(host) {
        var iframe = host.querySelector('iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.setAttribute('allowfullscreen', 'true');
            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
            iframe.setAttribute('scrolling', 'no');
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('title', 'Bilibili 视频播放器');
            host.appendChild(iframe);
        }
        return iframe;
    }

    function applySrc(slide, host, meta) {
        if (!slide.isConnected || !document.body.contains(host)) return;

        var iframe = ensureIframe(host);
        var nextSrc = buildSrc(meta);
        if (iframe.getAttribute('src') !== nextSrc) {
            iframe.src = nextSrc;
        }
        slide._bilibiliMountedSrc = nextSrc;
    }

    function scheduleMount(slide, host, meta, attempt) {
        if (slide._bilibiliMountToken !== meta.token) return;

        whenLayoutReady(function () {
            if (slide._bilibiliMountToken !== meta.token) return;

            if (!hostHasLayoutSize(host)) {
                if (attempt < MOUNT_MAX_RETRIES) {
                    slide._bilibiliMountTimer = window.setTimeout(function () {
                        scheduleMount(slide, host, meta, attempt + 1);
                    }, MOUNT_RETRY_MS);
                } else {
                    applySrc(slide, host, meta);
                }
                return;
            }

            applySrc(slide, host, meta);
        });
    }

    function clearMountTimer(slide) {
        if (slide._bilibiliMountTimer) {
            clearTimeout(slide._bilibiliMountTimer);
            slide._bilibiliMountTimer = null;
        }
        slide._bilibiliMountToken = null;
    }

    function mount(slide) {
        if (!slide || !slide.hasAttribute('data-bilibili-embed')) return;

        var bvid = slide.getAttribute('data-bilibili-embed');
        if (!bvid) return;

        var host = slide.querySelector('[data-bilibili-frame]');
        if (!host) return;

        clearMountTimer(slide);

        var metaEl = slide.querySelector('[data-bilibili-meta]');
        var token = Date.now() + ':' + Math.random();
        slide._bilibiliMountToken = token;

        fetchVideoMeta(bvid).then(function (meta) {
            if (slide._bilibiliMountToken !== token) return;

            if (meta && meta.stat && metaEl && !metaEl._bilibiliMetaLoaded) {
                metaEl._bilibiliMetaLoaded = true;
                updateMeta(metaEl, meta.stat);
            }

            var playMeta = meta || { bvid: bvid, page: 1, quality: DEFAULT_QUALITY };
            playMeta.token = token;
            scheduleMount(slide, host, playMeta, 0);
        });
    }

    function unmount(slide) {
        if (!slide) return;
        clearMountTimer(slide);
        slide._bilibiliMountedSrc = null;
        var iframe = slide.querySelector('[data-bilibili-frame] iframe');
        if (iframe) iframe.removeAttribute('src');
    }

    window.BilibiliEmbed = {
        initSlide: mount,
        teardownSlide: unmount,
        buildSrc: buildSrc,
        DEFAULT_QUALITY: DEFAULT_QUALITY
    };
})();
