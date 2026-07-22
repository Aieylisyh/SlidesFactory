(function () {
    'use strict';

    var btn = document.getElementById('playtestFullscreenBtn');
    var label = btn ? btn.querySelector('.ss-playtest-fullscreen-label') : null;

    function isFullscreen() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
    }

    function updateLabel() {
        if (!label) return;
        label.textContent = isFullscreen() ? '退出全屏' : '全屏';
    }

    function toggleFullscreen() {
        var slide = document.getElementById('playtest');
        if (!slide) return;

        if (isFullscreen()) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        } else {
            if (slide.requestFullscreen) {
                slide.requestFullscreen();
            } else if (slide.webkitRequestFullscreen) {
                slide.webkitRequestFullscreen();
            } else if (slide.msRequestFullscreen) {
                slide.msRequestFullscreen();
            }
        }
    }

    if (btn) {
        btn.addEventListener('click', toggleFullscreen);
        document.addEventListener('fullscreenchange', updateLabel);
        document.addEventListener('webkitfullscreenchange', updateLabel);
        document.addEventListener('msfullscreenchange', updateLabel);
    }
})();
