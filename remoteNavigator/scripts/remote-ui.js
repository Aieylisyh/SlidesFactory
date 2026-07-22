/**

 * Mobile remote UI for deck navigation.

 */

(function () {

    'use strict';



    var navData = null;

    var ws = null;

    var currentSlide = null;

    var currentFocus = null;

    var currentInteraction = null;

    var focusModeEnabled = false;

    var cmdCooldown = false;

    var booted = false;

    var accessToken = '';

    var clientId = '';



    function $(sel) { return document.querySelector(sel); }



    function parseRoomFromPath() {

        var path = window.location.pathname || '';

        var m = path.match(/(?:^|\/)r\/([A-Za-z0-9]{4,8})\/?$/i);

        return m ? m[1].toUpperCase() : '';

    }



    function getHashParams() {

        var hash = (window.location.hash || '').replace(/^#/, '').trim();

        try {

            return new URLSearchParams(hash);

        } catch (e) {

            return new URLSearchParams();

        }

    }



    function resolveNavUrl() {

        function fromRemoteDirectory(file) {

            var value = String(file || '').replace(/^\/remoteNavigator\//, '');

            return new URL(value, window.location.href).toString();

        }

        if (typeof window.__REMOTE_NAV === 'string' && window.__REMOTE_NAV) {

            return fromRemoteDirectory(window.__REMOTE_NAV);

        }

        var p = new URLSearchParams(window.location.search);

        var nav = p.get('nav');

        if (!nav) nav = getHashParams().get('nav');

        if (nav) return fromRemoteDirectory(nav);

        var path = window.location.pathname || '';

        if (/\/summerschool\/r\//i.test(path)) {

            return fromRemoteDirectory('deck-nav-summerschool.json');

        }

        return fromRemoteDirectory('deck-nav.json');

    }



    function parseRoomFromHash() {

        var hash = (window.location.hash || '').replace(/^#/, '').trim();

        if (!hash) return '';

        if (/^room=/i.test(hash)) {

            return hash.slice(5).split('&')[0].trim().toUpperCase();

        }

        if (/^[A-Z0-9]{4,8}$/i.test(hash)) {

            return hash.toUpperCase();

        }

        try {

            return (getHashParams().get('room') || '').toUpperCase();

        } catch (e) {

            return '';

        }

    }



    function readStoredRoom() {

        try {

            return (sessionStorage.getItem('deckRemoteRoom') || '').trim().toUpperCase();

        } catch (e) {

            return '';

        }

    }



    function storeRoom(code) {

        try {

            sessionStorage.setItem('deckRemoteRoom', code);

        } catch (e) { /* ignore */ }

        window.__REMOTE_ROOM = code;

    }



    function readStoredToken(code) {

        if (!code) return '';

        try {

            return sessionStorage.getItem('deckRemoteToken:' + code) || '';

        } catch (e) {

            return '';

        }

    }



    function storeAccess(code, token) {

        storeRoom(code);

        if (!token) return;

        try {

            sessionStorage.setItem('deckRemoteToken:' + code, token);

        } catch (e) { /* ignore */ }

    }



    function resolveToken(code) {

        var injected = (typeof window.__REMOTE_TOKEN === 'string' && window.__REMOTE_TOKEN) || '';

        var query = new URLSearchParams(window.location.search);

        var token = injected || query.get('token') || getHashParams().get('token') || readStoredToken(code);

        token = (token || '').trim();

        if (/^[A-Za-z0-9_-]{32,128}$/.test(token)) {

            storeAccess(code, token);

            return token;

        }

        return '';

    }



    function getClientId() {

        var value = '';

        try {

            value = sessionStorage.getItem('deckRemoteClientId') || '';

        } catch (e) { /* ignore */ }

        if (!/^[A-Za-z0-9_-]{12,128}$/.test(value)) {

            value = DeckRemoteProtocol.randomToken(12);

            try {

                sessionStorage.setItem('deckRemoteClientId', value);

            } catch (e) { /* ignore */ }

        }

        return value;

    }



    function resolveRoom() {

        var injected = (typeof window.__REMOTE_ROOM === 'string' && window.__REMOTE_ROOM) || '';

        var p = new URLSearchParams(window.location.search);

        var room = injected.trim().toUpperCase();

        if (!room) room = parseRoomFromPath();

        if (!room) room = (p.get('room') || '').trim().toUpperCase();

        if (!room) room = parseRoomFromHash();

        if (!room) room = readStoredRoom();

        if (room) storeRoom(room);

        return room;

    }



    function vibrate() {

        if (navigator.vibrate) navigator.vibrate(12);

    }



    function setConnectionStatus(text, kind) {

        var el = $('#connection-status');

        if (!el) return;

        el.textContent = text;

        el.dataset.kind = kind || '';

    }



    function showRoomPrompt(message) {

        var main = $('#remote-main');

        var prompt = $('#room-prompt');

        var hint = $('#room-hint');

        if (main) main.hidden = true;

        if (prompt) prompt.hidden = false;

        if (hint && message) hint.textContent = message;

    }



    function hideRoomPrompt() {

        var main = $('#remote-main');

        var prompt = $('#room-prompt');

        if (main) main.hidden = false;

        if (prompt) prompt.hidden = true;

    }



    function renderPosition(slide, msgFocus) {

        currentSlide = slide;

        var pos = $('#remote-position');

        var title = $('#remote-slide-title');

        var deckTitle = $('#remote-deck-title');

        if (deckTitle && navData) deckTitle.textContent = navData.deckTitle;

        if (pos && navData && slide) {

            pos.textContent = (slide.index + 1) + ' / ' + navData.totalSlides;

        }

        if (title && slide) {

            title.textContent = slide.title || slide.id;

        }

        highlightChapter(slide);

        updateNavButtons(slide);

        updateFocusUI(msgFocus !== undefined ? msgFocus : null, slide);

        updateDiceUI(currentInteraction, slide);

        updateTimerUI(currentInteraction, slide);

    }



    function updateNavButtons(slide) {

        var prevBtn = $('#btn-prev');

        var nextBtn = $('#btn-next');

        if (!navData || !slide) return;

        if (prevBtn) prevBtn.disabled = slide.index <= 0;

        if (nextBtn) nextBtn.disabled = slide.index >= navData.totalSlides - 1;

    }



    function highlightChapter(slide) {

        if (!navData || !slide) return;

        var items = document.querySelectorAll('[data-chapter-id]');

        items.forEach(function (el) {

            el.classList.toggle('is-current', el.getAttribute('data-chapter-id') === slide.chapterId);

        });

    }



    function sendCmd(action, slide, extra) {

        if (!ws || cmdCooldown) return;

        cmdCooldown = true;

        setTimeout(function () { cmdCooldown = false; }, 280);

        vibrate();

        ws.send(DeckRemoteProtocol.makeCmd(action, slide || null, extra || null));

    }



    function sendFocusCmd(action, extra) {

        sendCmd(action, null, extra);

    }



    function slideHasFocusProfile(slide) {

        if (!navData || !slide) return false;

        var full = navData.slides.find(function (s) { return s.index === slide.index; });

        return !!(full && full.focusProfile);

    }



    function updateDiceUI(interaction, slide) {

        var section = $('#dice-section');

        var visibilityBtn = $('#btn-dice-visibility');

        var rollBtn = $('#btn-dice-roll');

        var isIceBreak = !!(slide && slide.id === 'ice-break');

        if (section) section.hidden = !isIceBreak;

        if (!isIceBreak) return;

        var ready = !!(interaction && interaction.kind === 'ice-break' && interaction.ready);

        var visible = !!(ready && interaction.visible);

        var rolling = !!(ready && interaction.rolling);

        if (visibilityBtn) {

            visibilityBtn.textContent = visible ? '隐藏骰子' : '显示骰子';

            visibilityBtn.disabled = !ready;

        }

        if (rollBtn) {

            rollBtn.textContent = rolling ? '停止并结算' : '开始投掷';

            rollBtn.disabled = !ready || !visible;

        }

    }

    function formatTime(totalSec) {
        totalSec = Math.max(0, Math.floor(totalSec));
        var mins = Math.floor(totalSec / 60);
        var secs = totalSec % 60;
        return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }

    function updateTimerUI(interaction, slide) {

        var section = $('#timer-section');

        var display = $('#timer-display');

        var visibilityBtn = $('#btn-timer-visibility');

        var resetBtn = $('#btn-timer-reset');

        var cycleBtn = $('#btn-timer-cycle');

        var startBtn = $('#btn-timer-start');

        var isPlaytest = !!(slide && slide.id === 'playtest');

        if (section) section.hidden = !isPlaytest;

        if (!isPlaytest) return;

        var timer = interaction && interaction.kind === 'playtest' && interaction.timer ? interaction.timer : null;
        var ready = !!(timer && interaction.ready);
        var visible = !!(ready && timer.visible);
        var running = !!(ready && timer.running);
        var remaining = ready && timer.remainingSeconds >= 0 ? timer.remainingSeconds : (timer && timer.totalSeconds || 600);

        if (display) {
            display.textContent = formatTime(remaining);
            display.classList.toggle('is-running', running);
            display.classList.toggle('is-finished', !!(ready && timer.finished));
        }

        if (visibilityBtn) {
            visibilityBtn.textContent = visible ? '隐藏计时器' : '显示计时器';
            visibilityBtn.disabled = !ready;
        }

        if (resetBtn) {
            resetBtn.disabled = !ready || !visible;
        }

        if (cycleBtn) {
            cycleBtn.disabled = !ready || !visible || running;
            cycleBtn.textContent = ready && timer.durationMinutes ? '时长 ' + timer.durationMinutes + '分钟' : '切换时长';
        }

        if (startBtn) {
            startBtn.textContent = running ? '暂停' : '开始';
            startBtn.disabled = !ready || !visible || remaining <= 0;
        }

    }



    function updateFocusUI(focus, slide) {

        var section = $('#focus-section');

        var label = $('#remote-focus-label');

        var modeBtn = $('#btn-focus-mode');

        var pad = $('#focus-pad');

        var confirmBtn = $('#btn-focus-confirm');

        var hasProfile = slideHasFocusProfile(slide);

        if (slide && slide.id === 'ice-break') {

            if (section) section.hidden = true;

            focusModeEnabled = false;

            currentFocus = null;

            return;

        }

        var totalTargets = focus && typeof focus.totalTargets === 'number' ? focus.totalTargets : 0;

        var serverFocusMode = !!(focus && focus.mode === 'focus' && totalTargets > 0);



        if (section) section.hidden = false;



        if (!hasProfile) {

            focusModeEnabled = false;

            currentFocus = null;

            if (modeBtn) {

                modeBtn.setAttribute('aria-pressed', 'false');

                modeBtn.textContent = '互动模式 · 关';

                modeBtn.disabled = true;

            }

            if (section) section.classList.remove('is-active');

            if (label) label.textContent = '本页无互动焦点';

            if (pad) {

                pad.querySelectorAll('.focus-btn[data-focus-dir]').forEach(function (btn) {

                    btn.disabled = true;

                });

            }

            if (confirmBtn) confirmBtn.disabled = false;

            return;

        }



        if (modeBtn) modeBtn.disabled = false;



        currentFocus = focus || null;

        focusModeEnabled = serverFocusMode;



        if (modeBtn) {

            modeBtn.setAttribute('aria-pressed', focusModeEnabled ? 'true' : 'false');

            modeBtn.textContent = focusModeEnabled ? '互动模式 · 开' : '互动模式 · 关';

        }



        if (section) section.classList.toggle('is-active', focusModeEnabled);



        if (label) {

            if (focusModeEnabled && focus && focus.label) {

                var idx = focus.targetIndex >= 0 ? (focus.targetIndex + 1) : 0;

                label.textContent = (totalTargets ? idx + '/' + totalTargets + ' · ' : '') + focus.label;

            } else if (totalTargets > 0) {

                label.textContent = '共 ' + totalTargets + ' 个焦点 · 开启互动模式后方向键选择';

            } else {

                label.textContent = '本页无可用焦点';

            }

        }



        var disabledPad = !focusModeEnabled || totalTargets <= 0;

        if (pad) {

            pad.querySelectorAll('.focus-btn[data-focus-dir]').forEach(function (btn) {

                btn.disabled = disabledPad;

            });

        }

        if (confirmBtn) confirmBtn.disabled = focusModeEnabled && totalTargets <= 0;

    }



    function buildChapterList() {

        var list = $('#chapter-list');

        if (!list || !navData) return;

        list.innerHTML = '';

        navData.chapters.forEach(function (ch) {

            var btn = document.createElement('button');

            btn.type = 'button';

            btn.className = 'chapter-item';

            btn.setAttribute('data-chapter-id', ch.id);

            btn.innerHTML =

                '<span class="chapter-index">' + String(ch.agendaIndex).padStart(2, '0') + '</span>' +

                '<span class="chapter-title">' + ch.title + '</span>';

            btn.addEventListener('click', function () {

                var slide = navData.slides[ch.startIndex];

                if (slide) sendCmd('goto', slide);

            });

            list.appendChild(btn);

        });

    }



    function handleState(msg) {

        var slide = {

            index: msg.index,

            h: msg.h,

            v: msg.v,

            id: msg.id,

            title: msg.title,

            chapterId: null

        };

        if (navData) {

            var full = navData.slides.find(function (s) { return s.index === msg.index; });

            if (full) slide.chapterId = full.chapterId;

        }

        if (msg.focus) {

            currentFocus = msg.focus;

            focusModeEnabled = msg.focus.mode === 'focus' && (msg.focus.totalTargets || 0) > 0;

        } else {

            currentFocus = null;

            focusModeEnabled = false;

        }

        currentInteraction = msg.interaction || null;

        renderPosition(slide, msg.focus !== undefined ? msg.focus : null);

    }



    function initWs(room, deckId, token) {

        if (ws) {

            ws.close();

            ws = null;

        }

        ws = new DeckRemoteWs({

            url: DeckRemoteProtocol.getWsUrl(),

            room: room,

            role: 'remote',

            deckId: deckId,

            token: token,

            clientId: clientId,

            onStatus: function (status) {

                if (status === 'connected') {

                    setConnectionStatus('已连接', 'ok');

                    ws.send({ type: 'request_state' });

                } else if (status === 'connecting') {

                    setConnectionStatus('连接中…', 'pending');

                } else {

                    setConnectionStatus('已断开 · 重连中', 'warn');

                }

            },

            onMessage: function (msg) {

                if (msg.type === 'state' || msg.type === 'ack') handleState(msg);

                if (msg.type === 'error') {

                    var labels = {

                        unauthorized: '授权无效，请重新扫描二维码',

                        room_busy: '已有一台主持人手机连接',

                        presenter_offline: '主讲端尚未连接',

                        deck_mismatch: '手机与主讲端的演示文稿不一致'

                    };

                    setConnectionStatus(labels[msg.code] || msg.message || '连接被拒绝', 'error');

                    ws.close();

                }

            }

        });

    }



    function bindControls() {

        var prevBtn = $('#btn-prev');

        var nextBtn = $('#btn-next');

        if (prevBtn) {

            prevBtn.addEventListener('click', function () { sendCmd('prev'); });

        }

        if (nextBtn) {

            nextBtn.addEventListener('click', function () { sendCmd('next'); });

        }



        var diceVisibilityBtn = $('#btn-dice-visibility');

        var diceRollBtn = $('#btn-dice-roll');

        if (diceVisibilityBtn) {

            diceVisibilityBtn.addEventListener('click', function () {

                var visible = !!(currentInteraction && currentInteraction.visible);

                sendCmd(visible ? 'dice_hide' : 'dice_show');

            });

        }

        if (diceRollBtn) {

            diceRollBtn.addEventListener('click', function () {

                var rolling = !!(currentInteraction && currentInteraction.rolling);

                sendCmd(rolling ? 'dice_roll_stop' : 'dice_roll_start');

            });

        }

        var timerVisibilityBtn = $('#btn-timer-visibility');
        var timerResetBtn = $('#btn-timer-reset');
        var timerCycleBtn = $('#btn-timer-cycle');
        var timerStartBtn = $('#btn-timer-start');

        if (timerVisibilityBtn) {
            timerVisibilityBtn.addEventListener('click', function () {
                var timer = currentInteraction && currentInteraction.timer ? currentInteraction.timer : null;
                var visible = !!(timer && timer.visible);
                sendCmd(visible ? 'timer_hide' : 'timer_show');
            });
        }

        if (timerResetBtn) {
            timerResetBtn.addEventListener('click', function () {
                sendCmd('timer_reset');
            });
        }

        if (timerCycleBtn) {
            timerCycleBtn.addEventListener('click', function () {
                sendCmd('timer_cycle');
            });
        }

        if (timerStartBtn) {
            timerStartBtn.addEventListener('click', function () {
                var timer = currentInteraction && currentInteraction.timer ? currentInteraction.timer : null;
                var running = !!(timer && timer.running);
                sendCmd(running ? 'timer_pause' : 'timer_start');
            });
        }



        var modeBtn = $('#btn-focus-mode');

        if (modeBtn) {

            modeBtn.addEventListener('click', function () {

                focusModeEnabled = !focusModeEnabled;

                sendFocusCmd('focus_mode', { enabled: focusModeEnabled });

            });

        }



        var confirmBtn = $('#btn-focus-confirm');

        if (confirmBtn) {

            confirmBtn.addEventListener('click', function () {

                if (focusModeEnabled) {

                    sendFocusCmd('focus_confirm');

                } else {

                    sendCmd('next');

                }

            });

        }



        document.querySelectorAll('.focus-btn[data-focus-dir]').forEach(function (btn) {

            btn.addEventListener('click', function () {

                var dir = btn.getAttribute('data-focus-dir');

                if (!dir) return;

                if (!focusModeEnabled) {

                    focusModeEnabled = true;

                    sendFocusCmd('focus_mode', { enabled: true });

                }

                sendFocusCmd('focus_move', { dir: dir });

            });

        });



        document.addEventListener('keydown', function (e) {

            if (e.key === 'ArrowLeft') {

                if (focusModeEnabled) sendFocusCmd('focus_move', { dir: 'left' });

                else sendCmd('prev');

            }

            if (e.key === 'ArrowRight') {

                if (focusModeEnabled) sendFocusCmd('focus_move', { dir: 'right' });

                else sendCmd('next');

            }

            if (e.key === 'ArrowUp' && focusModeEnabled) sendFocusCmd('focus_move', { dir: 'up' });

            if (e.key === 'ArrowDown' && focusModeEnabled) sendFocusCmd('focus_move', { dir: 'down' });

            if ((e.key === 'Enter' || e.key === ' ') && focusModeEnabled) {

                e.preventDefault();

                sendFocusCmd('focus_confirm');

            }

        });

    }



    function bootRemote(room, token) {

        if (booted) return;

        booted = true;



        hideRoomPrompt();



        var roomLabel = $('#room-label');

        if (roomLabel) roomLabel.textContent = room;



        fetch(resolveNavUrl() + '?v=' + Date.now())

            .then(function (res) {

                if (!res.ok) throw new Error('nav missing');

                return res.json();

            })

            .then(function (data) {

                navData = data;

                document.title = '翻页笔 · ' + data.deckTitle;

                buildChapterList();

                initWs(room, data.deckId, token);

            })

            .catch(function () {

                booted = false;

                setConnectionStatus('导航文件加载失败', 'error');

                showRoomPrompt('无法加载导航文件，请确认已运行 start-remote-server.bat');

            });

    }



    function connectWithRoom(code) {

        code = (code || '').trim().toUpperCase();

        if (!/^[A-Z0-9]{4,8}$/.test(code)) return;

        var token = resolveToken(code);

        if (!token) {

            showRoomPrompt('安全令牌缺失，请重新扫描主讲端二维码');

            return;

        }

        storeAccess(code, token);

        bootRemote(code, token);

    }



    function bindRoomForm() {

        var form = $('#room-form');

        var input = $('#room-input');

        var btn = $('#room-connect');

        if (!input || !btn) return;



        function submitRoom() {

            var code = (input.value || '').trim().toUpperCase();

            if (!/^[A-Z0-9]{4,8}$/.test(code)) {

                input.focus();

                return;

            }

            connectWithRoom(code);

        }



        btn.addEventListener('click', submitRoom);

        if (form) {

            form.addEventListener('submit', function (e) {

                e.preventDefault();

                submitRoom();

            });

        }

    }



    function init() {

        bindControls();

        bindRoomForm();



        var room = resolveRoom();

        accessToken = resolveToken(room);

        clientId = getClientId();

        if (!room || !accessToken) {

            showRoomPrompt(room ? '安全令牌缺失，请重新扫描主讲端二维码' : '请扫描主讲端显示的二维码');

            return;

        }



        bootRemote(room, accessToken);

    }



    if (document.readyState === 'loading') {

        document.addEventListener('DOMContentLoaded', init);

    } else {

        init();

    }

})();


