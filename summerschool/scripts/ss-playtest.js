(function () {
    'use strict';

    var durations = [5, 10, 15, 20];
    var durationIndex = 1;
    var totalSeconds = durations[durationIndex] * 60;
    var remainingSeconds = totalSeconds;

    var visible = false;
    var running = false;
    var finished = false;
    var tickInterval = null;
    var endTime = null;

    var timerEl = null;
    var minTensEl = null;
    var minOnesEl = null;
    var secTensEl = null;
    var secOnesEl = null;
    var lightningEl = null;
    var fullscreenBtn = null;
    var fullscreenLabel = null;

    function $(sel) { return document.querySelector(sel); }

    function formatTime(totalSec) {
        totalSec = Math.max(0, Math.floor(totalSec));
        var mins = Math.floor(totalSec / 60);
        var secs = totalSec % 60;
        return {
            minTens: String(Math.floor(mins / 10)),
            minOnes: String(mins % 10),
            secTens: String(Math.floor(secs / 10)),
            secOnes: String(secs % 10)
        };
    }

    function render() {
        if (!timerEl) return;
        var t = formatTime(remainingSeconds);
        if (minTensEl) minTensEl.textContent = t.minTens;
        if (minOnesEl) minOnesEl.textContent = t.minOnes;
        if (secTensEl) secTensEl.textContent = t.secTens;
        if (secOnesEl) secOnesEl.textContent = t.secOnes;

        timerEl.classList.toggle('is-visible', visible);
        timerEl.classList.toggle('is-running', running);
        timerEl.classList.toggle('is-finished', finished);
    }

    function getState() {
        return {
            kind: 'playtest',
            ready: true,
            timer: {
                visible: visible,
                running: running,
                finished: finished,
                remainingSeconds: remainingSeconds,
                totalSeconds: totalSeconds,
                durationMinutes: durations[durationIndex],
                durationIndex: durationIndex
            }
        };
    }

    function broadcastState() {
        var evt = new CustomEvent('playtest-timer-state', { detail: getState() });
        document.dispatchEvent(evt);
    }

    function tick() {
        var now = Date.now();
        remainingSeconds = Math.max(0, Math.round((endTime - now) / 1000));
        render();

        if (remainingSeconds <= 0) {
            handleFinish();
        }
        broadcastState();
    }

    function handleFinish() {
        if (tickInterval) {
            clearInterval(tickInterval);
            tickInterval = null;
        }
        running = false;
        finished = true;
        triggerLightning();
        render();
        broadcastState();
    }

    function triggerLightning() {
        if (!lightningEl) return;
        lightningEl.classList.remove('is-active');
        void lightningEl.offsetWidth;
        lightningEl.classList.add('is-active');

        var boltCount = 10;
        for (var i = 0; i < boltCount; i++) {
            var bolt = document.createElement('span');
            bolt.className = 'ss-playtest-countdown__bolt';
            bolt.style.setProperty('--bolt-delay', (i * 0.12) + 's');
            bolt.style.setProperty('--bolt-angle', (Math.random() * 360) + 'deg');
            bolt.style.setProperty('--bolt-length', (60 + Math.random() * 100) + 'px');
            lightningEl.appendChild(bolt);
        }

        setTimeout(function () {
            if (lightningEl) {
                lightningEl.classList.remove('is-active');
                lightningEl.innerHTML = '';
            }
            finished = false;
            render();
            broadcastState();
        }, 3000);
    }

    function show() {
        visible = true;
        render();
        broadcastState();
    }

    function hide() {
        visible = false;
        if (tickInterval) {
            clearInterval(tickInterval);
            tickInterval = null;
        }
        running = false;
        render();
        broadcastState();
    }

    function reset() {
        if (tickInterval) {
            clearInterval(tickInterval);
            tickInterval = null;
        }
        running = false;
        finished = false;
        totalSeconds = durations[durationIndex] * 60;
        remainingSeconds = totalSeconds;
        endTime = null;
        render();
        broadcastState();
    }

    function cycleDuration() {
        durationIndex = (durationIndex + 1) % durations.length;
        totalSeconds = durations[durationIndex] * 60;
        if (!running) {
            remainingSeconds = totalSeconds;
        }
        render();
        broadcastState();
    }

    function resetAndCycle() {
        cycleDuration();
        reset();
    }

    function start() {
        if (running || remainingSeconds <= 0) return false;
        finished = false;
        endTime = Date.now() + remainingSeconds * 1000;
        running = true;
        tickInterval = setInterval(tick, 250);
        render();
        broadcastState();
        return true;
    }

    function pause() {
        if (!running) return false;
        if (tickInterval) {
            clearInterval(tickInterval);
            tickInterval = null;
        }
        running = false;
        render();
        broadcastState();
        return true;
    }

    function toggleFullscreen() {
        var slide = document.getElementById('playtest');
        if (!slide) return;

        var isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
        if (isFs) {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            else if (document.msExitFullscreen) document.msExitFullscreen();
        } else {
            if (slide.requestFullscreen) slide.requestFullscreen();
            else if (slide.webkitRequestFullscreen) slide.webkitRequestFullscreen();
            else if (slide.msRequestFullscreen) slide.msRequestFullscreen();
        }
    }

    function updateFsLabel() {
        if (!fullscreenLabel) return;
        var isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
        fullscreenLabel.textContent = isFs ? '退出全屏' : '全屏';
    }

    function execute(action) {
        if (action === 'timer_show') {
            show();
            return true;
        } else if (action === 'timer_hide') {
            hide();
            return true;
        } else if (action === 'timer_reset') {
            reset();
            return true;
        } else if (action === 'timer_cycle') {
            resetAndCycle();
            return true;
        } else if (action === 'timer_start') {
            return start();
        } else if (action === 'timer_pause') {
            return pause();
        }
        return false;
    }

    window.PlaytestTimerRemote = Object.freeze({
        getState: getState,
        execute: execute
    });

    function init() {
        timerEl = $('#playtestCountdown');
        if (timerEl) {
            minTensEl = timerEl.querySelector('.ss-playtest-countdown__min-tens');
            minOnesEl = timerEl.querySelector('.ss-playtest-countdown__min-ones');
            secTensEl = timerEl.querySelector('.ss-playtest-countdown__sec-tens');
            secOnesEl = timerEl.querySelector('.ss-playtest-countdown__sec-ones');
            lightningEl = timerEl.querySelector('.ss-playtest-countdown__lightning');
        }

        fullscreenBtn = $('#playtestFullscreenBtn');
        fullscreenLabel = fullscreenBtn ? fullscreenBtn.querySelector('.ss-playtest-fullscreen-label') : null;
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', toggleFullscreen);
            document.addEventListener('fullscreenchange', updateFsLabel);
            document.addEventListener('webkitfullscreenchange', updateFsLabel);
            document.addEventListener('msfullscreenchange', updateFsLabel);
        }

        render();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
