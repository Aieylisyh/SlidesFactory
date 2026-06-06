/**
 * Unified fullscreen preview for WeChat / chat screenshots and case media.
 * Click a bound .tech-image-container to enlarge; click overlay again to close.
 */
(function (global) {
    'use strict';

    var ZOOMABLE_SELECTOR =
        '.tech-image-container.chat-shot, [data-image-lightbox] .tech-image-container';

    var overlay = null;
    var overlayImg = null;
    var bound = false;
    var open = false;

    function stopRevealNav(e) {
        e.stopPropagation();
    }

    function stopRevealNavHard(e) {
        e.stopPropagation();
        if (e.type === 'click' || e.type === 'keydown') {
            e.preventDefault();
        }
    }

    function ensureOverlay() {
        if (overlay) return;
        overlay = document.createElement('div');
        overlay.className = 'chat-lightbox-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', '截图全屏预览');
        overlay.hidden = true;

        overlayImg = document.createElement('img');
        overlayImg.className = 'chat-lightbox-img';
        overlayImg.alt = '';
        overlay.appendChild(overlayImg);

        overlay.addEventListener('click', function (e) {
            stopRevealNavHard(e);
            closeLightbox();
        });
        overlay.addEventListener('mousedown', stopRevealNav);
        overlay.addEventListener('mouseup', stopRevealNav);
        overlay.addEventListener('touchstart', stopRevealNav, { passive: false });
        overlay.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                e.stopPropagation();
                closeLightbox();
            }
        });

        document.body.appendChild(overlay);
    }

    function openLightbox(img) {
        if (!img || !img.src) return;
        ensureOverlay();
        overlayImg.src = img.currentSrc || img.src;
        overlayImg.alt = img.alt || '图片全屏预览';
        overlay.hidden = false;
        overlay.classList.add('is-open');
        open = true;
        document.body.classList.add('is-chat-lightbox-open');
    }

    function closeLightbox() {
        if (!overlay || !open) return;
        overlay.classList.remove('is-open');
        overlay.hidden = true;
        open = false;
        document.body.classList.remove('is-chat-lightbox-open');
        overlayImg.removeAttribute('src');
    }

    function onZoomableClick(e) {
        var container = e.currentTarget;
        var img = container.querySelector('img');
        if (!img || !img.getAttribute('src')) return;
        stopRevealNavHard(e);
        if (open && overlayImg && overlayImg.src === (img.currentSrc || img.src)) {
            closeLightbox();
            return;
        }
        openLightbox(img);
    }

    function blockRevealOnContainer(container) {
        ['mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(function (evt) {
            container.addEventListener(evt, stopRevealNav, false);
        });
    }

    function bindChatShots(root) {
        var scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll(ZOOMABLE_SELECTOR).forEach(function (container) {
            if (container._chatLightboxBound) return;
            if (!container.querySelector('img[src]')) return;
            container._chatLightboxBound = true;
            container.classList.add('chat-shot-zoomable');
            container.setAttribute('role', 'button');
            container.setAttribute('tabindex', '0');
            container.setAttribute('aria-label', '点击放大图片');
            blockRevealOnContainer(container);
            container.addEventListener('click', onZoomableClick);
            container.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    onZoomableClick(e);
                }
            });
        });
    }

    function init() {
        ensureOverlay();
        bindChatShots();
        if (bound) return;
        bound = true;
        global.addEventListener('keydown', function (e) {
            if (open && e.key === 'Escape') {
                e.stopPropagation();
                closeLightbox();
            }
        }, true);
    }

    global.ChatLightbox = {
        init: init,
        bindChatShots: bindChatShots,
        open: openLightbox,
        close: closeLightbox
    };
})(window);
