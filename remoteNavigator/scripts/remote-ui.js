/**

 * Mobile remote UI for deck navigation.

 */

(function () {

    'use strict';



    var navData = null;

    var ws = null;

    var currentSlide = null;

    var currentFocus = null;

    var focusModeEnabled = false;

    var cmdCooldown = false;

    var booted = false;



    function $(sel) { return document.querySelector(sel); }



    function parseRoomFromPath() {

        var path = window.location.pathname || '';

        var m = path.match(/(?:^|\/)r\/([A-Za-z0-9]{4,8})\/?$/i);

        return m ? m[1].toUpperCase() : '';

    }



    function resolveNavUrl() {

        if (typeof window.__REMOTE_NAV === 'string' && window.__REMOTE_NAV) {

            return '/remoteNavigator/' + window.__REMOTE_NAV;

        }

        var p = new URLSearchParams(window.location.search);

        var nav = p.get('nav');

        if (nav) return '/remoteNavigator/' + nav;

        var path = window.location.pathname || '';

        if (/\/summerschool\/r\//i.test(path)) {

            return '/remoteNavigator/deck-nav-summerschool.json';

        }

        return '/remoteNavigator/deck-nav.json';

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

            return (new URLSearchParams(hash).get('room') || '').toUpperCase();

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



    function updateFocusUI(focus, slide) {

        var section = $('#focus-section');

        var label = $('#remote-focus-label');

        var modeBtn = $('#btn-focus-mode');

        var pad = $('#focus-pad');

        var confirmBtn = $('#btn-focus-confirm');

        var hasProfile = slideHasFocusProfile(slide);

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

        renderPosition(slide, msg.focus !== undefined ? msg.focus : null);

    }



    function initWs(room, deckId) {

        if (ws) {

            ws.close();

            ws = null;

        }

        ws = new DeckRemoteWs({

            url: DeckRemoteProtocol.getWsUrl(),

            room: room,

            role: 'remote',

            deckId: deckId,

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



    function bootRemote(room) {

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

                initWs(room, data.deckId);

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

        storeRoom(code);

        bootRemote(code);

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

        if (!room) {

            showRoomPrompt('扫码后若仍在此页，请直接输入主讲端显示的房间码');

            return;

        }



        bootRemote(room);

    }



    if (document.readyState === 'loading') {

        document.addEventListener('DOMContentLoaded', init);

    } else {

        init();

    }

})();


