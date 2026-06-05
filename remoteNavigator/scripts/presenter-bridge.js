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

    function broadcastState(force) {
        if (!ws || !navData) return;
        var slide = getCurrentSlideMeta();
        if (!slide) return;
        var focus = getFocusSnapshot();
        var focusKey = focus ? JSON.stringify(focus) : '';
        var key = slide.index + ':' + slide.h + ':' + slide.v;
        if (!force && key === lastStateKey && focusKey === lastFocusKey) return;
        lastStateKey = key;
        lastFocusKey = focusKey;
        ws.send(DeckRemoteProtocol.makeState(slide, focus));
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
                var focus = getFocusSnapshot();
                ws.send(DeckRemoteProtocol.makeAck(slide, focus));
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
            broadcastState(true);
        }, 40);
    }

    function executeCmd(msg) {
        var Reveal = getReveal();
        if (!Reveal || !Reveal.isReady() || !navData) return;

        if (msg.action === 'focus_mode' || msg.action === 'focus_move' || msg.action === 'focus_confirm') {
            executeFocusCmd(msg);
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
        script.src = '/shared/scripts/deck-focus-nav.js?v=2';
        script.onload = function () {
            if (!win.DeckFocusNav) return;
            win.DeckFocusNav.init({
                navDataUrl: '/remoteNavigator/' + (runtimeParams && runtimeParams.nav ? runtimeParams.nav : 'deck-nav.json'),
                onStateChange: function () {
                    lastStateKey = '';
                    lastFocusKey = '';
                    broadcastState(true);
                }
            }).then(function () {
                win.DeckFocusNav.bindReveal(Reveal);
                focusNavReady = true;
                lastStateKey = '';
                lastFocusKey = '';
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

    function resolveRemoteRoomPrefix(deck) {
        if (/summerschool/i.test(deck)) return '/summerschool/r/';
        return '/r/';
    }

    function normalizeDeckPath(deck) {
        if (!deck) return '/index.html';
        if (deck.charAt(0) === '/') return deck;
        if (deck.indexOf('summerschool') !== -1) return '/summerschool/index.html';
        if (deck.indexOf('index.html') !== -1) return '/index.html';
        return deck;
    }

    function getParams() {
        var p = new URLSearchParams(window.location.search);
        var deck = normalizeDeckPath(p.get('deck') || '/index.html');
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

    function buildRemoteUrl(code) {
        var host = window.location.hostname;
        var port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
        if (host === 'localhost' || host === '127.0.0.1') {
            var lanHost = new URLSearchParams(window.location.search).get('host');
            if (lanHost) host = lanHost;
        }
        var origin = window.location.protocol + '//' + host + (port ? ':' + port : '');
        var prefix = resolveRemoteRoomPrefix(runtimeParams ? runtimeParams.deck : '');
        return origin + prefix + encodeURIComponent(code);
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

    function initWs(code) {
        room = code;
        var roomLabel = $('#room-code');
        if (roomLabel) roomLabel.textContent = code;

        ws = new DeckRemoteWs({
            url: DeckRemoteProtocol.getWsUrl(),
            room: code,
            role: 'presenter',
            deckId: navData.deckId,
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
            }
        });

        renderQr(buildRemoteUrl(code));
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
            initWs(room);
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
