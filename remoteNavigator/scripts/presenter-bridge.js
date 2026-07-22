/**
 * Presenter bridge — loads deck in iframe, syncs Reveal state over WebSocket.
 * No changes required to the original deck HTML.
 */
(function () {
    'use strict';

    var navData = null;
    var ws = null;
    var room = null;
    var deckFrame = null;
    var pollTimer = null;
    var lastStateKey = '';
    var lastFocusKey = '';
    var lastInteractionKey = '';
    var focusNavReady = false;
    var runtimeParams = null;

    function getFocusNav() {
        if (!deckFrame || !deckFrame.contentWindow) return null;
        return deckFrame.contentWindow.DeckFocusNav || null;
    }

    function getFocusSnapshot() {
        var FocusNav = getFocusNav();
        if (!FocusNav || !FocusNav.getState) {
            return {
                mode: 'deck',
                enabled: false,
                targetIndex: -1,
                targetId: null,
                label: null,
                totalTargets: 0,
                profileId: null
            };
        }
        return FocusNav.getState();
    }

    function getInteractionSnapshot(slide) {
        if (!slide || !deckFrame || !deckFrame.contentWindow) return null;

        if (slide.id === 'ice-break') {
            var api = deckFrame.contentWindow.SummerIceBreakRemote;
            if (!api || !api.getState) {
                return { kind: 'ice-break', ready: false, visible: false, rolling: false };
            }
            return api.getState();
        }

        if (slide.id === 'playtest') {
            var api2 = deckFrame.contentWindow.PlaytestTimerRemote;
            if (!api2 || !api2.getState) {
                return { kind: 'playtest', ready: false, timer: { visible: false, running: false, finished: false, remainingSeconds: 0, totalSeconds: 0, durationMinutes: 10, durationIndex: 1 } };
            }
            return api2.getState();
        }

        return null;
    }

    function broadcastState(force) {
        if (!ws || !navData) return;
        var slide = getCurrentSlideMeta();
        if (!slide) return;
        var focus = getFocusSnapshot();
        var focusKey = focus ? JSON.stringify(focus) : '';
        var interaction = getInteractionSnapshot(slide);
        var interactionKey = interaction ? JSON.stringify(interaction) : '';
        var key = slide.index + ':' + slide.h + ':' + slide.v;
        if (!force && key === lastStateKey && focusKey === lastFocusKey && interactionKey === lastInteractionKey) return;
        lastStateKey = key;
        lastFocusKey = focusKey;
        lastInteractionKey = interactionKey;
        ws.send(DeckRemoteProtocol.makeState(slide, focus, interaction));
        updatePresenterUI(slide, focus);
    }

    function updatePresenterUI(slide, focus) {
        var pos = $('#presenter-position');
        var title = $('#presenter-slide-title');
        if (pos) {
            pos.textContent = (slide.index + 1) + ' / ' + navData.totalSlides;
        }
        if (title) {
            var text = slide.title || slide.id;
            if (focus && focus.mode === 'focus' && focus.label) {
                text += ' · ' + focus.label;
            }
            title.textContent = text;
        }
    }

    function afterDeckCmd() {
        setTimeout(function () {
            var slide = getCurrentSlideMeta();
            if (slide && ws) {
                lastStateKey = '';
                lastFocusKey = '';
                lastInteractionKey = '';
                var focus = getFocusSnapshot();
                var interaction = getInteractionSnapshot(slide);
                ws.send(DeckRemoteProtocol.makeAck(slide, focus, interaction));
                broadcastState(true);
            }
        }, 80);
    }

    function executeFocusCmd(msg) {
        var FocusNav = getFocusNav();
        if (!FocusNav) return;

        if (msg.action === 'focus_mode') {
            FocusNav.setMode(!!msg.enabled);
        } else if (msg.action === 'focus_move' && msg.dir) {
            FocusNav.move(msg.dir);
        } else if (msg.action === 'focus_confirm') {
            FocusNav.confirm();
        }

        setTimeout(function () {
            lastStateKey = '';
            lastFocusKey = '';
            lastInteractionKey = '';
            broadcastState(true);
        }, 40);
    }

    function executeIceBreakCmd(msg) {
        var slide = getCurrentSlideMeta();
        if (!slide || slide.id !== 'ice-break') return;
        var api = deckFrame && deckFrame.contentWindow && deckFrame.contentWindow.SummerIceBreakRemote;
        if (!api || !api.execute || !api.execute(msg.action)) return;
        afterDeckCmd();
    }

    function executePlaytestCmd(msg) {
        var slide = getCurrentSlideMeta();
        if (!slide || slide.id !== 'playtest') return;
        var api = deckFrame && deckFrame.contentWindow && deckFrame.contentWindow.PlaytestTimerRemote;
        if (!api || !api.execute || !api.execute(msg.action)) return;
        afterDeckCmd();
    }

    function executeCmd(msg) {
        var Reveal = getReveal();
        if (!Reveal || !Reveal.isReady() || !navData) return;

        if (msg.action === 'focus_mode' || msg.action === 'focus_move' || msg.action === 'focus_confirm') {
            executeFocusCmd(msg);
            return;
        }

        if (/^dice_(show|hide|roll_start|roll_stop)$/.test(msg.action || '')) {
            executeIceBreakCmd(msg);
            return;
        }

        if (/^timer_(show|hide|reset|cycle|start|pause)$/.test(msg.action || '')) {
            executePlaytestCmd(msg);
            return;
        }

        if (msg.action === 'next') {
            Reveal.next();
        } else if (msg.action === 'prev') {
            Reveal.prev();
        } else if (msg.action === 'goto') {
            if (typeof msg.h === 'number' && typeof msg.v === 'number') {
                Reveal.slide(msg.h, msg.v);
            } else if (msg.id) {
                var target = findSlideById(navData.slides, msg.id);
                if (target) Reveal.slide(target.h, target.v);
            } else if (typeof msg.index === 'number') {
                var byIndex = navData.slides[msg.index];
                if (byIndex) Reveal.slide(byIndex.h, byIndex.v);
            }
        }

        afterDeckCmd();
    }

    function injectFocusNav(Reveal) {
        if (!deckFrame || !deckFrame.contentDocument) return;
        var win = deckFrame.contentWindow;
        var doc = deckFrame.contentDocument;

        if (win.DeckFocusNav) {
            if (!focusNavReady) {
                win.DeckFocusNav.bindReveal(Reveal);
                focusNavReady = true;
                broadcastState(true);
            }
            return;
        }

        if (doc.querySelector('script[data-deck-focus-nav]')) return;

        var script = doc.createElement('script');
        script.setAttribute('data-deck-focus-nav', '1');
        script.src = new URL('../shared/scripts/deck-focus-nav.js?v=2', window.location.href).toString();
        script.onload = function () {
            if (!win.DeckFocusNav) return;
            win.DeckFocusNav.init({
                navDataUrl: new URL(runtimeParams && runtimeParams.nav ? runtimeParams.nav : 'deck-nav.json', window.location.href).toString(),
                onStateChange: function () {
                    lastStateKey = '';
                    lastFocusKey = '';
                    lastInteractionKey = '';
                    broadcastState(true);
                }
            }).then(function () {
                win.DeckFocusNav.bindReveal(Reveal);
                focusNavReady = true;
                lastStateKey = '';
                lastFocusKey = '';
                lastInteractionKey = '';
                broadcastState(true);
            });
        };
        script.onerror = function () {
            console.warn('[presenter-bridge] deck-focus-nav.js failed to load');
        };
        doc.body.appendChild(script);
    }

    function bindRevealHooks() {
        var Reveal = getReveal();
        if (!Reveal || !Reveal.isReady()) return false;

        injectFocusNav(Reveal);

        Reveal.on('slidechanged', function () {
            lastStateKey = '';
            lastFocusKey = '';
            lastInteractionKey = '';
            broadcastState(true);
        });

        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(function () { broadcastState(false); }, 600);
        broadcastState(true);
        setStatus('演示已就绪', 'ok');
        return true;
    }

    function $(sel) { return document.querySelector(sel); }

    function resolveNavFile(deck) {
        if (/summerschool/i.test(deck)) return 'deck-nav-summerschool.json';
        return 'deck-nav.json';
    }

    function getPresenterToken(code) {
        var key = 'deckRemotePresenterToken:' + code;
        var token = '';
        try {
            token = sessionStorage.getItem(key) || '';
        } catch (e) { /* ignore */ }
        if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
            token = DeckRemoteProtocol.randomToken(24);
            try {
                sessionStorage.setItem(key, token);
            } catch (e) { /* ignore */ }
        }
        return token;
    }

    function normalizeDeckPath(deck) {
        if (!deck) return '../index.html';
        if (deck.charAt(0) === '/') return deck;
        return deck;
    }

    function getParams() {
        var p = new URLSearchParams(window.location.search);
        var deck = normalizeDeckPath(p.get('deck') || '../index.html');
        var nav = p.get('nav') || resolveNavFile(deck);
        return {
            room: (p.get('room') || '').toUpperCase(),
            deck: deck,
            nav: nav
        };
    }

    function setStatus(text, kind) {
        var el = $('#presenter-status');
        if (!el) return;
        el.textContent = text;
        el.dataset.kind = kind || '';
    }

    function findSlideByIndices(slides, h, v) {
        return slides.find(function (s) { return s.h === h && s.v === v; });
    }

    function findSlideById(slides, id) {
        return slides.find(function (s) { return s.id === id; });
    }

    function getReveal() {
        if (!deckFrame || !deckFrame.contentWindow) return null;
        return deckFrame.contentWindow.Reveal;
    }

    function getCurrentSlideMeta() {
        var Reveal = getReveal();
        if (!Reveal || !Reveal.isReady() || !navData) return null;
        var indices = Reveal.getIndices();
        var slide = findSlideByIndices(navData.slides, indices.h, indices.v);
        if (!slide) {
            var current = Reveal.getCurrentSlide();
            var id = current && current.id ? current.id : null;
            if (id) slide = findSlideById(navData.slides, id);
        }
        return slide;
    }

    function waitForReveal(maxMs) {
        var start = Date.now();
        var timer = setInterval(function () {
            if (bindRevealHooks()) {
                clearInterval(timer);
                return;
            }
            if (Date.now() - start > maxMs) {
                clearInterval(timer);
                setStatus('无法连接演示文稿（Reveal 未就绪）', 'error');
            }
        }, 300);
    }

    function buildRemoteUrl(code, token) {
        var host = window.location.hostname;
        var port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
        if (host === 'localhost' || host === '127.0.0.1') {
            var lanHost = new URLSearchParams(window.location.search).get('host');
            if (lanHost) host = lanHost;
        }
        var origin = window.location.protocol + '//' + host + (port ? ':' + port : '');
        var config = window.DeckRemoteConfig || {};
        var runtimeRemoteUrl = DeckRemoteProtocol.getRuntimeParam('remote');
        var remoteBase;
        if (runtimeRemoteUrl) {
            remoteBase = new URL(runtimeRemoteUrl, origin);
        } else if (window.location.protocol === 'https:' && config.remoteUrl) {
            remoteBase = new URL(config.remoteUrl, origin);
        } else if (window.location.protocol === 'https:') {
            remoteBase = new URL('remote.html', window.location.href);
        } else {
            remoteBase = new URL('remote.html', window.location.href);
        }

        var hash = new URLSearchParams();
        hash.set('room', code);
        hash.set('token', token);
        hash.set('nav', runtimeParams && runtimeParams.nav ? runtimeParams.nav : 'deck-nav.json');
        var wsUrl = DeckRemoteProtocol.getRuntimeParam('ws') || config.wsUrl || '';
        if (wsUrl) hash.set('ws', wsUrl);
        remoteBase.hash = hash.toString();
        return remoteBase.toString();
    }

    function setRemoteLink(url) {
        var link = $('#remote-url');
        if (!link) return;
        link.textContent = url;
        link.href = url;
    }

    function showQrWarning(text) {
        var el = $('#qr-warning');
        if (!el) return;
        el.textContent = text;
        el.hidden = !text;
    }

    function renderQr(url) {
        setRemoteLink(url);
        showQrWarning('');

        var canvas = $('#qr-canvas');
        if (!canvas) return;

        if (typeof QRCode === 'undefined') {
            showQrWarning('二维码库未加载，请使用下方链接手动打开。');
            return;
        }

        if (/localhost|127\.0\.0\.1/.test(url)) {
            showQrWarning('当前为 localhost 链接，手机无法扫码。请用 bat 窗口里的局域网 IP 打开主讲页。');
        }

        var result = QRCode.toCanvas(canvas, url, {
            width: 180,
            margin: 1,
            color: { dark: '#111111', light: '#ffffff' }
        });

        if (result && typeof result.then === 'function') {
            result.catch(function (err) {
                console.error('[presenter-bridge] QR render failed:', err);
                showQrWarning('二维码生成失败，请复制下方链接到手机浏览器。');
            });
        }
    }

    function openQrPanel() {
        var panel = $('#qr-panel');
        if (panel) panel.classList.add('is-open');
    }

    function initWs(code, token) {
        room = code;
        var roomLabel = $('#room-code');
        if (roomLabel) roomLabel.textContent = code;

        ws = new DeckRemoteWs({
            url: DeckRemoteProtocol.getWsUrl(),
            room: code,
            role: 'presenter',
            deckId: navData.deckId,
            token: token,
            onStatus: function (status) {
                if (status === 'connected') setStatus('已连接中继 · 等待手机', 'ok');
                if (status === 'connecting') setStatus('正在连接中继…', 'pending');
                if (status === 'disconnected') setStatus('中继断开 · 重连中…', 'warn');
            },
            onMessage: function (msg) {
                if (msg.type === 'cmd') executeCmd(msg);
                if (msg.type === 'request_state') broadcastState(true);
                if (msg.type === 'remote_joined') {
                    broadcastState(true);
                }
                if (msg.type === 'error') {
                    setStatus('中继拒绝连接 · ' + (msg.message || msg.code), 'error');
                    ws.close();
                }
            }
        });

        renderQr(buildRemoteUrl(code, token));
        openQrPanel();
    }

    function loadNav(navFile) {
        return fetch(navFile + '?v=' + Date.now())
            .then(function (res) {
                if (!res.ok) throw new Error(navFile + ' missing');
                return res.json();
            });
    }

    function init() {
        runtimeParams = getParams();
        var params = runtimeParams;
        room = params.room || DeckRemoteProtocol.randomRoomCode(6);
        var token = getPresenterToken(room);

        if (!params.room) {
            var u = new URL(window.location.href);
            u.searchParams.set('room', room);
            if (!u.searchParams.get('deck')) u.searchParams.set('deck', params.deck);
            if (!u.searchParams.get('nav')) u.searchParams.set('nav', params.nav);
            window.history.replaceState(null, '', u.toString());
        }

        deckFrame = $('#deck-frame');
        if (deckFrame) {
            deckFrame.src = params.deck;
            deckFrame.addEventListener('load', function () {
                waitForReveal(120000);
            });
        }

        loadNav(params.nav).then(function (data) {
            navData = data;
            document.title = '翻页笔 · ' + data.deckTitle;
            var deckTitle = $('#deck-title');
            if (deckTitle) deckTitle.textContent = data.deckTitle;
            initWs(room, token);
        }).catch(function (err) {
            console.error(err);
            setStatus(params.nav + ' 加载失败，请先运行 generate-deck-nav.js --deck …', 'error');
        });

        var toggle = $('#qr-toggle');
        var panel = $('#qr-panel');
        if (toggle && panel) {
            toggle.addEventListener('click', function () {
                panel.classList.toggle('is-open');
            });
        }

        var fullscreenBtn = $('#btn-fullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', function () {
                var el = deckFrame;
                if (el.requestFullscreen) el.requestFullscreen();
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
