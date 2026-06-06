/**
 * Viewport sizing, slide dimensions, title auto-fit, brand logos.
 */
(function (global) {
    'use strict';

    var SFK = global.SFKDeck = global.SFKDeck || {};

    function getSlideDimensions() {
        var w = global.innerWidth;
        var h = global.innerHeight;
        var aspect = w / h;
        var isWide16x9 = aspect >= 1.72;
        var height = isWide16x9 ? 1080 : 1200;
        return {
            width: 1920,
            height: height,
            margin: 0.02
        };
    }

    function dimsKey(dims) {
        return dims.width + 'x' + dims.height + '@' + dims.margin;
    }

    function applyViewportVars(dims) {
        document.documentElement.style.setProperty('--slide-width', String(dims.width));
        document.documentElement.style.setProperty('--slide-height', String(dims.height));
    }

    function enforceSlideDimensions(dims) {
        var d = dims || getSlideDimensions();
        document.querySelectorAll('.reveal .slides section').forEach(function (sec) {
            sec.style.setProperty('width', d.width + 'px', 'important');
            sec.style.setProperty('height', d.height + 'px', 'important');
        });
    }

    function isLeafSlide(section) {
        return !section.querySelector(':scope > section');
    }

    function isUnifiedTitleH2(h2) {
        var slide = h2.closest('section');
        if (!slide || !slide.classList.contains('content-slide')) return false;
        if (slide.classList.contains('section-opener') ||
            slide.classList.contains('slide-closing') ||
            slide.classList.contains('title-slide') ||
            slide.classList.contains('slide-agenda')) {
            return false;
        }
        var layer = slide.querySelector(':scope > .slide-content-layer');
        if (!layer) return false;
        var header = layer.querySelector(':scope > .slide-page-header');
        if (header && header.querySelector(':scope > h2') === h2) return true;
        return layer.querySelector(':scope > h2:first-child') === h2;
    }

    function measureTitleFontBounds(h2, maxTextH) {
        h2.style.setProperty('--slide-title-fit-size', 'var(--slide-title-font-max)');
        var cssStyles = getComputedStyle(h2);
        var hiFromToken = parseFloat(cssStyles.fontSize) || 40;
        var lhPx = parseFloat(cssStyles.lineHeight);
        if (isNaN(lhPx)) {
            lhPx = hiFromToken * 1.08;
        }
        var lhRatio = Math.max(lhPx / hiFromToken, 1);
        h2.style.setProperty('--slide-title-fit-size', 'var(--slide-title-font-min)');
        var lo = parseFloat(getComputedStyle(h2).fontSize) || 24;
        h2.style.removeProperty('--slide-title-fit-size');
        var hiFromHeight = maxTextH > 0 ? maxTextH / lhRatio : hiFromToken;
        return { lo: lo, hi: Math.max(hiFromToken, hiFromHeight) };
    }

    function titleFitsConstraints(h2, fontPx, maxW, maxScrollH) {
        h2.style.setProperty('--slide-title-fit-size', fontPx + 'px');
        h2.style.display = 'block';
        h2.style.whiteSpace = 'nowrap';
        var widthOk = h2.scrollWidth <= maxW + 0.5;
        var heightOk = h2.scrollHeight <= maxScrollH + 0.5;
        h2.style.whiteSpace = '';
        if (widthOk && heightOk) {
            h2.style.display = '';
            return true;
        }

        h2.style.whiteSpace = 'normal';
        widthOk = h2.scrollWidth <= maxW + 0.5;
        heightOk = h2.scrollHeight <= maxScrollH + 0.5;
        h2.style.whiteSpace = '';
        h2.style.display = '';
        return widthOk && heightOk;
    }

    function fitSlidePageTitle(h2) {
        if (!isUnifiedTitleH2(h2)) return;

        var layer = h2.closest('.slide-content-layer');
        if (!layer || layer.clientWidth <= 0) return;
        var maxW = layer.clientWidth * 0.7;

        var styles = getComputedStyle(h2);
        var zoneH = parseFloat(styles.height) || 0;
        var gap = parseFloat(styles.paddingBottom) || 0;
        var border = parseFloat(styles.borderBottomWidth) || 0;
        var maxScrollH = Math.max(0, zoneH - border);
        var maxTextH = Math.max(0, zoneH - gap - border);
        var bounds = measureTitleFontBounds(h2, maxTextH);

        h2.style.removeProperty('--slide-title-fit-size');
        if (titleFitsConstraints(h2, bounds.hi, maxW, maxScrollH)) {
            if (bounds.hi > bounds.lo + 0.5) {
                h2.style.setProperty('--slide-title-fit-size', Math.round(bounds.hi) + 'px');
            }
            return;
        }

        var best = bounds.lo;
        var low = Math.floor(bounds.lo);
        var high = Math.ceil(bounds.hi);
        while (low <= high) {
            var mid = Math.floor((low + high) / 2);
            if (titleFitsConstraints(h2, mid, maxW, maxScrollH)) {
                best = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        if (best >= bounds.hi - 0.5) {
            h2.style.setProperty('--slide-title-fit-size', Math.round(best) + 'px');
        } else {
            h2.style.setProperty('--slide-title-fit-size', best + 'px');
        }
    }

    function fitSlidePageTitles() {
        document.querySelectorAll(
            '.reveal .content-slide .slide-content-layer > h2:first-child,' +
            '.reveal .content-slide .slide-page-header > h2'
        ).forEach(fitSlidePageTitle);
    }

    function scheduleFitSlidePageTitles() {
        requestAnimationFrame(function () {
            requestAnimationFrame(fitSlidePageTitles);
        });
    }

    function injectSlideBrandLogos() {
        document.querySelectorAll('.reveal .slides section').forEach(function (sec) {
            if (!isLeafSlide(sec)) return;
            if (sec.querySelector(':scope > .slide-brand-logo')) return;
            var wrap = document.createElement('div');
            wrap.className = 'slide-brand-logo';
            wrap.setAttribute('aria-hidden', 'true');
            var img = document.createElement('img');
            img.loading = 'lazy';
            img.decoding = 'async';
            img.src = 'assets/logos/DMA-logo-black.png';
            img.alt = '';
            wrap.appendChild(img);
            sec.insertBefore(wrap, sec.firstChild);
        });
    }

    SFK.getSlideDimensions = getSlideDimensions;
    SFK.dimsKey = dimsKey;
    SFK.applyViewportVars = applyViewportVars;
    SFK.enforceSlideDimensions = enforceSlideDimensions;
    SFK.fitSlidePageTitles = fitSlidePageTitles;
    SFK.scheduleFitSlidePageTitles = scheduleFitSlidePageTitles;
    SFK.injectSlideBrandLogos = injectSlideBrandLogos;
})(window);
