/**
 * Segment arrow — multi-block horizontal arrow timeline / agenda nav.
 * Blocks Reveal pointer nav inside the root; optional data-goto deep links.
 */
(function (global) {
    'use strict';

    var NAV_BLOCK_EVENTS = ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend'];

    function stopRevealNav(e) {
        e.stopPropagation();
    }

    function navigateToSlide(target) {
        if (typeof ShareLock !== 'undefined' && ShareLock.isActive()) return;
        if (!target || typeof Reveal === 'undefined' || !Reveal.isReady()) return;
        if (target.indexOf('#/') === 0) {
            var slideId = target.slice(2);
            var el = document.getElementById(slideId);
            if (el) {
                var indices = Reveal.getIndices(el);
                Reveal.slide(indices.h, indices.v || 0);
                return;
            }
        }
        Reveal.slide(target);
    }

    function SegmentArrow(root) {
        this.root = root;
        this.bindNavBlock();
        this.bindGotoSegments();
    }

    SegmentArrow.prototype.bindNavBlock = function () {
        var self = this;
        NAV_BLOCK_EVENTS.forEach(function (evt) {
            self.root.addEventListener(evt, stopRevealNav, false);
        });
    };

    SegmentArrow.prototype.bindGotoSegments = function () {
        this.root.querySelectorAll('[data-segment-arrow-segment][data-goto]').forEach(function (segment) {
            if (segment._segmentArrowBound) return;
            segment._segmentArrowBound = true;

            segment.addEventListener('click', function (e) {
                e.stopPropagation();
                if (typeof ClickFX !== 'undefined') ClickFX.applyClick(segment, e);
                navigateToSlide(segment.getAttribute('data-goto'));
            });

            segment.addEventListener('keydown', function (e) {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                e.stopPropagation();
                navigateToSlide(segment.getAttribute('data-goto'));
            });
        });
    };

    SegmentArrow.prototype.reset = function () {};

    global.SegmentArrow = SegmentArrow;
    /* @deprecated use SegmentArrow */
    global.GrowthTimeline = SegmentArrow;
})(window);
