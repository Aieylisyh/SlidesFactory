/**
 * WebSocket message helpers for quiz-live sync.
 */
(function (global) {
    'use strict';

    var WS_PORT = 8082;
    var cachedWsRelayHost = '';

    function isIpv4Host(hostname) {
        return /^\d{1,3}(\.\d{1,3}){3}$/.test(String(hostname || '').trim());
    }

    function normalizeWsRelayHost(raw) {
        var h = String(raw || '').trim().split(/\s+/)[0];
        if (!h) return '';
        h = h.replace(/^wss?:\/\//i, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
        return h;
    }

    function fetchWsRelayHostFile() {
        return fetch('data/ws-relay-host.txt', { cache: 'no-store' })
            .then(function (res) {
                if (!res.ok) return '';
                return res.text();
            })
            .then(function (text) {
                return normalizeWsRelayHost(text);
            })
            .catch(function () { return ''; });
    }

    function initWsRelayConfig() {
        return fetchWsRelayHostFile().then(function (host) {
            if (host) {
                cachedWsRelayHost = host;
                try {
                    if (!getHostOverride()) {
                        sessionStorage.setItem('quiz-live-public-host', host);
                    }
                } catch (e) { /* ignore */ }
            }
            return host || cachedWsRelayHost;
        });
    }

    function resolveWsRelayHostSync() {
        var override = normalizeWsRelayHost(getHostOverride());
        if (override) return override;
        if (cachedWsRelayHost) return cachedWsRelayHost;
        return '';
    }

    function randomRoomCode(len) {
        len = len || 6;
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var out = '';
        for (var i = 0; i < len; i++) {
            out += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return out;
    }

    function randomClientId() {
        if (global.crypto && global.crypto.randomUUID) {
            return global.crypto.randomUUID();
        }
        return 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }

    function isLocalHost(hostname) {
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
    }

    function getHostOverride() {
        try {
            var params = new URLSearchParams(global.location.search);
            var h = (params.get('host') || '').trim();
            if (h) {
                sessionStorage.setItem('quiz-live-public-host', h);
                return h;
            }
            return sessionStorage.getItem('quiz-live-public-host') || '';
        } catch (e) {
            return '';
        }
    }

    function fetchLanHostFile() {
        return fetch('data/lan-host.txt', { cache: 'no-store' })
            .then(function (res) {
                if (!res.ok) return '';
                return res.text();
            })
            .then(function (text) {
                var ip = (text || '').trim().split(/\s+/)[0];
                if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
                    try { sessionStorage.setItem('quiz-live-public-host', ip); } catch (e) { /* ignore */ }
                    return ip;
                }
                return '';
            })
            .catch(function () { return ''; });
    }

    function resolvePublicHost() {
        var override = getHostOverride();
        if (override) return Promise.resolve(override);
        if (!isLocalHost(global.location.hostname)) {
            return Promise.resolve(global.location.hostname);
        }
        return fetchLanHostFile();
    }

    function buildOriginForHost(host) {
        var proto = global.location.protocol;
        var port = global.location.port;
        return proto + '//' + host + (port ? ':' + port : '');
    }

    function getWsUrl(host) {
        var h = normalizeWsRelayHost(host) || resolveWsRelayHostSync();
        if (!h) {
            h = global.location.hostname;
        }
        if (isLocalHost(h) || isIpv4Host(h)) {
            var directProto = global.location.protocol === 'https:' ? 'wss:' : 'ws:';
            return directProto + '//' + h + ':' + WS_PORT;
        }
        var wsProto = global.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return wsProto + '//' + h;
    }

    function resolveWsUrl() {
        return initWsRelayConfig().then(function () {
            return getWsUrl();
        });
    }

    function parseMessage(raw) {
        try {
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function stringifyMessage(msg) {
        return JSON.stringify(msg);
    }

    function makeHello(role, room, clientId) {
        return { type: 'hello', role: role, room: room, clientId: clientId || null };
    }

    function makeRegister(clientId, profile) {
        var payload = { type: 'register', clientId: clientId };
        if (profile && typeof profile === 'object') {
            payload.profile = profile;
            if (profile.name != null) payload.name = profile.name;
            if (profile.phone != null) payload.phone = profile.phone;
        }
        return payload;
    }

    function makeSubmit(questionIndex, choice, clientId) {
        return { type: 'submit', questionIndex: questionIndex, choice: choice, clientId: clientId };
    }

    function makeSelfAnswer(category, questionId, correct, clientId) {
        return {
            type: 'self_answer',
            category: category,
            questionId: questionId,
            correct: !!correct,
            clientId: clientId
        };
    }

    function makeRoundStart(category, clientId) {
        return {
            type: 'round_start',
            category: category,
            clientId: clientId
        };
    }

    function makeAdminAction(action, extra) {
        var msg = { type: 'admin', action: action };
        if (extra) {
            Object.keys(extra).forEach(function (key) {
                msg[key] = extra[key];
            });
        }
        return msg;
    }

    function makeRequestState() {
        return { type: 'request_state' };
    }

    function makeRequestAdminSummary() {
        return { type: 'request_admin_summary' };
    }

    function makeRequestParticipantsDetail(clientIds) {
        return {
            type: 'request_participants_detail',
            clientIds: Array.isArray(clientIds) ? clientIds.slice(0, 20) : []
        };
    }

    function getRoomFromUrl() {
        try {
            var params = new URLSearchParams(global.location.search);
            return (params.get('room') || '').trim().toUpperCase();
        } catch (e) {
            return '';
        }
    }

    function fetchDefaultRoom() {
        return fetch('data/default-room.txt', { cache: 'no-store' })
            .then(function (res) {
                if (!res.ok) return '';
                return res.text();
            })
            .then(function (text) {
                return (text || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            })
            .catch(function () { return ''; });
    }

    /** URL ?room= 优先；否则 data/default-room.txt；再否则随机 6 位 */
    function resolveRoomCode() {
        var fromUrl = getRoomFromUrl();
        if (fromUrl) return Promise.resolve(fromUrl);
        return fetchDefaultRoom().then(function (preset) {
            return preset || randomRoomCode();
        });
    }

    function pageHostnameFromOrigin(origin) {
        try {
            return new URL(origin).hostname;
        } catch (e) {
            return '';
        }
    }

    /** HTTP 答题页 URL：公网部署用当前站点域名；?host= 仅写入 WS 中继地址 */
    function buildAnswerUrl(room, lanPageHost) {
        var basePath = global.location.pathname.replace(/[^/]+$/, '');
        var origin;

        if (isLocalHost(global.location.hostname)) {
            if (!lanPageHost || isLocalHost(lanPageHost)) return '';
            origin = buildOriginForHost(lanPageHost);
        } else {
            origin = global.location.origin;
        }

        var url = origin + basePath + 'answer.html?room=' + encodeURIComponent(room);
        var wsHost = resolveWsRelayHostSync();
        if (wsHost && wsHost !== pageHostnameFromOrigin(origin)) {
            url += '&host=' + encodeURIComponent(wsHost);
        }
        return url;
    }

    function parseVipShareFromUrl() {
        try {
            var params = new URLSearchParams(global.location.search);
            var categoryId = (params.get('vip_cat') || '').trim();
            var token = (params.get('vip_token') || '').trim();
            if (!categoryId || !token) return null;
            return { categoryId: categoryId, token: token };
        } catch (e) {
            return null;
        }
    }

    function buildVipShareUrl(room, categoryId, token, lanPageHost) {
        var base = buildAnswerUrl(room, lanPageHost);
        if (!base) return '';
        return base +
            '&vip_cat=' + encodeURIComponent(categoryId) +
            '&vip_token=' + encodeURIComponent(token);
    }

    function makeRedeemVipShare(clientId, categoryId, token) {
        return {
            type: 'redeem_vip_share',
            clientId: clientId,
            categoryId: categoryId,
            token: token
        };
    }

    global.QuizProtocol = {
        WS_PORT: WS_PORT,
        randomRoomCode: randomRoomCode,
        randomClientId: randomClientId,
        isLocalHost: isLocalHost,
        resolvePublicHost: resolvePublicHost,
        buildOriginForHost: buildOriginForHost,
        getWsUrl: getWsUrl,
        resolveWsUrl: resolveWsUrl,
        initWsRelayConfig: initWsRelayConfig,
        parseMessage: parseMessage,
        stringifyMessage: stringifyMessage,
        makeHello: makeHello,
        makeRegister: makeRegister,
        makeSubmit: makeSubmit,
        makeSelfAnswer: makeSelfAnswer,
        makeRoundStart: makeRoundStart,
        makeAdminAction: makeAdminAction,
        makeRequestState: makeRequestState,
        makeRequestAdminSummary: makeRequestAdminSummary,
        makeRequestParticipantsDetail: makeRequestParticipantsDetail,
        getRoomFromUrl: getRoomFromUrl,
        resolveRoomCode: resolveRoomCode,
        buildAnswerUrl: buildAnswerUrl,
        parseVipShareFromUrl: parseVipShareFromUrl,
        buildVipShareUrl: buildVipShareUrl,
        makeRedeemVipShare: makeRedeemVipShare
    };
})(typeof window !== 'undefined' ? window : global);
