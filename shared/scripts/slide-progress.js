/**
 * Deck progress bar — Reveal.js bottom track with hover peek + drag-to-seek.
 *
 * Drag: thumb follows pointer smoothly (no slide jumps).
 * Release: snap to nearest slide progress, then navigate.
 *
 * Styles:  style_guide.css → styles/style-guide/01-tokens-base.css
 * Tokens:  docs/guides/style_guide.md §4.5
 * Asset:   assets/logos/S.png  (mask + brand gradient tint)
 *
 * Reveal must be initialized with `progress: true`. Call SlideProgress.init(Reveal)
 * after Reveal.initialize() resolves (see main.js).
 */
(function (global) {
    'use strict';

    var THUMB_CLASS = 'deck-progress-thumb';
    var THUMB_ROTATION_MAX = 1080;
    var PEEK_ZONE_PX = 52;
    var HIDE_DELAY_MS = 520;
    var SNAP_DURATION_MS = 220;

    var bound = false;
    var dragging = false;
    var snapping = false;
    var snapFrame = null;
    var hideTimer = null;
    var revealEl = null;
    var progressEl = null;
    var activeDragPointerId = null;

    function clearHideTimer() {
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
    }

    function setPeek(active) {
        if (!revealEl) return;
        revealEl.classList.toggle('is-deck-progress-active', active);
    }

    function scheduleHide() {
        clearHideTimer();
        hideTimer = setTimeout(function () {
            if (!dragging && !snapping && progressEl && !progressEl.matches(':hover')) {
                setPeek(false);
            }
        }, HIDE_DELAY_MS);
    }

    function getFillSpan() {
        return progressEl ? progressEl.querySelector('span') : null;
    }

    function resolveProgressAssetUrl(relativePath) {
        var script = document.querySelector('script[src*="slide-progress.js"]');
        if (script && script.src) {
            try {
                return new URL(relativePath, script.src).href;
            } catch (err) { /* fall through */ }
        }
        try {
            return new URL(relativePath, window.location.href).href;
        } catch (err2) {
            return relativePath;
        }
    }

    function resolveMaskAssetUrl() {
        var path = window.location.pathname || '';

        if (path.indexOf('/summerschool') !== -1) {
            try {
                return new URL('../assets/logos/S.png', window.location.href).href;
            } catch (err) { /* fall through */ }
        }

        try {
            return new URL('assets/logos/S.png', window.location.href).href;
        } catch (err) { /* fall through */ }

        return resolveProgressAssetUrl('../../assets/logos/S.png');
    }

    function ensureProgressMaskUrl() {
        var maskAbs = resolveMaskAssetUrl();

        var cssValue = 'url("' + maskAbs + '")';
        document.documentElement.style.setProperty('--deck-progress-s-mask', cssValue);
        if (revealEl) {
            revealEl.style.setProperty('--deck-progress-s-mask', cssValue);
        }
    }

    function createThumbEl() {
        var thumb = document.createElement('span');
        thumb.className = THUMB_CLASS;
        thumb.setAttribute('aria-hidden', 'true');
        thumb.style.setProperty('--deck-progress-thumb-spin', '0deg');
        return thumb;
    }

    function clampFraction(fraction) {
        return Math.max(0, Math.min(1, fraction));
    }

    function setThumbFraction(fraction) {
        var thumb = progressEl ? progressEl.querySelector('.' + THUMB_CLASS) : null;
        if (!thumb || !progressEl) return;

        var f = clampFraction(fraction);
        var pct = (f * 100) + '%';
        thumb.style.left = pct;
        progressEl.style.setProperty('--deck-progress-thumb-pct', pct);
        thumb.style.setProperty('--deck-progress-thumb-spin', (f * THUMB_ROTATION_MAX) + 'deg');
    }

    function syncThumbPosition() {
        if (dragging || snapping) return;
        if (!progressEl || typeof Reveal === 'undefined' || !Reveal.isReady()) return;

        var fraction = typeof Reveal.getProgress === 'function' ? Reveal.getProgress() : 0;
        setThumbFraction(fraction);
    }

    function ensureThumb() {
        if (!progressEl) return;

        var thumb = progressEl.querySelector('.' + THUMB_CLASS);
        if (thumb && thumb.tagName !== 'SPAN') {
            thumb.replaceWith(createThumbEl());
            thumb = progressEl.querySelector('.' + THUMB_CLASS);
        }

        if (!thumb) {
            progressEl.appendChild(createThumbEl());
        }

        syncThumbPosition();
    }

    function fractionFromClientX(clientX) {
        if (!progressEl) return 0;

        var rect = progressEl.getBoundingClientRect();
        if (!rect.width) return 0;

        return clampFraction((clientX - rect.left) / rect.width);
    }

    function slideFractionForIndex(index, total) {
        if (total <= 1) return 0;
        return index / (total - 1);
    }

    function nearestSlideIndex(fraction, total) {
        if (total <= 1) return 0;

        var best = 0;
        var bestDist = Infinity;
        for (var i = 0; i < total; i++) {
            var pos = slideFractionForIndex(i, total);
            var dist = Math.abs(fraction - pos);
            if (dist < bestDist) {
                bestDist = dist;
                best = i;
            }
        }
        return best;
    }

    function cancelSnap() {
        if (snapFrame) {
            cancelAnimationFrame(snapFrame);
            snapFrame = null;
        }
        snapping = false;
        if (progressEl) progressEl.classList.remove('is-snapping');
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function snapToNearestSlide(fromFraction, onDone) {
        if (!progressEl || typeof Reveal === 'undefined' || !Reveal.isReady()) {
            if (onDone) onDone();
            return;
        }

        var slides = Reveal.getSlides();
        if (!slides.length) {
            if (onDone) onDone();
            return;
        }

        var index = nearestSlideIndex(fromFraction, slides.length);
        var targetFraction = slideFractionForIndex(index, slides.length);
        var startFraction = clampFraction(fromFraction);
        var startTime = performance.now();

        cancelSnap();
        snapping = true;
        progressEl.classList.add('is-snapping');

        function frame(now) {
            var elapsed = now - startTime;
            var t = Math.min(1, elapsed / SNAP_DURATION_MS);
            var eased = easeOutCubic(t);
            var current = startFraction + (targetFraction - startFraction) * eased;
            setThumbFraction(current);

            if (t < 1) {
                snapFrame = requestAnimationFrame(frame);
                return;
            }

            snapFrame = null;
            snapping = false;
            progressEl.classList.remove('is-snapping');
            setThumbFraction(targetFraction);

            var indices = Reveal.getIndices(slides[index]);
            Reveal.slide(indices.h, indices.v);
            syncThumbPosition();
            if (onDone) onDone();
        }

        snapFrame = requestAnimationFrame(frame);
    }

    function onPointerDown(e) {
        if (!progressEl || e.button !== 0) return;
        if (activeDragPointerId !== null) return;
        if (e.type === 'mousedown' && typeof e.pointerType === 'string' && e.pointerType !== 'mouse') return;

        e.preventDefault();
        e.stopPropagation();
        if (typeof Reveal !== 'undefined' && Reveal.onUserInput) {
            Reveal.onUserInput(e);
        }

        cancelSnap();
        dragging = true;
        activeDragPointerId = typeof e.pointerId === 'number' ? e.pointerId : -1;
        progressEl.classList.add('is-dragging');
        setPeek(true);
        setThumbFraction(fractionFromClientX(e.clientX));

        if (progressEl.setPointerCapture && activeDragPointerId >= 0) {
            progressEl.setPointerCapture(activeDragPointerId);
        }

        function onMove(moveEvent) {
            if (!dragging) return;
            moveEvent.preventDefault();
            moveEvent.stopPropagation();
            setThumbFraction(fractionFromClientX(moveEvent.clientX));
        }

        function onUp(upEvent) {
            if (!dragging) return;

            upEvent.preventDefault();
            upEvent.stopPropagation();

            var releaseFraction = fractionFromClientX(upEvent.clientX);
            dragging = false;
            activeDragPointerId = null;
            progressEl.classList.remove('is-dragging');

            if (progressEl.releasePointerCapture && typeof upEvent.pointerId === 'number') {
                try {
                    progressEl.releasePointerCapture(upEvent.pointerId);
                } catch (err) { /* already released */ }
            }

            progressEl.removeEventListener('pointermove', onMove);
            progressEl.removeEventListener('pointerup', onUp);
            progressEl.removeEventListener('pointercancel', onUp);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);

            snapToNearestSlide(releaseFraction, scheduleHide);
        }

        progressEl.addEventListener('pointermove', onMove);
        progressEl.addEventListener('pointerup', onUp);
        progressEl.addEventListener('pointercancel', onUp);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    function onDocumentMove(e) {
        if (dragging || snapping) return;

        var nearBottom = (window.innerHeight - e.clientY) <= PEEK_ZONE_PX;
        if (nearBottom) {
            clearHideTimer();
            setPeek(true);
            return;
        }

        if (progressEl && progressEl.matches(':hover')) {
            clearHideTimer();
            setPeek(true);
            return;
        }

        scheduleHide();
    }

    function onProgressEnter() {
        clearHideTimer();
        setPeek(true);
    }

    function onProgressLeave() {
        if (!dragging && !snapping) scheduleHide();
    }

    function bind() {
        if (bound || typeof Reveal === 'undefined') return;

        revealEl = document.querySelector('.reveal');
        progressEl = revealEl ? revealEl.querySelector('.progress') : null;
        if (!revealEl || !progressEl) return;

        bound = true;
        ensureProgressMaskUrl();
        ensureThumb();
        progressEl.addEventListener('pointerdown', onPointerDown);
        progressEl.addEventListener('mousedown', onPointerDown);
        progressEl.addEventListener('mouseenter', onProgressEnter);
        progressEl.addEventListener('mouseleave', onProgressLeave);
        document.addEventListener('mousemove', onDocumentMove);
    }

    function init(reveal) {
        if (!reveal) return;
        revealEl = document.querySelector('.reveal');
        ensureProgressMaskUrl();
        reveal.on('ready', bind);
        reveal.on('slidechanged', ensureThumb);
        reveal.on('progress', syncThumbPosition);
        if (reveal.isReady()) bind();
    }

    global.SlideProgress = { init: init };
})(window);
