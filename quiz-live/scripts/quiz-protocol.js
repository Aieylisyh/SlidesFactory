/**
 * WebSocket message helpers for quiz-live sync.
 */
(function (global) {
    'use strict';

    var WS_PORT = 8082;

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
        var proto = global.location.protocol === 'https:' ? 'wss:' : 'ws:';
        var h = host || global.location.hostname;
        return proto + '//' + h + ':' + WS_PORT;
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

    function getRoomFromUrl() {
        try {
            var params = new URLSearchParams(global.location.search);
            return (params.get('room') || '').trim().toUpperCase();
        } catch (e) {
            return '';
        }
    }

    function buildAnswerUrl(room, host) {
        var h = host || global.location.hostname;
        var base = buildOriginForHost(h) + global.location.pathname.replace(/[^/]+$/, '');
        return base + 'answer.html?room=' + encodeURIComponent(room);
    }

    global.QuizProtocol = {
        WS_PORT: WS_PORT,
        randomRoomCode: randomRoomCode,
        randomClientId: randomClientId,
        isLocalHost: isLocalHost,
        resolvePublicHost: resolvePublicHost,
        buildOriginForHost: buildOriginForHost,
        getWsUrl: getWsUrl,
        parseMessage: parseMessage,
        stringifyMessage: stringifyMessage,
        makeHello: makeHello,
        makeRegister: makeRegister,
        makeSubmit: makeSubmit,
        makeSelfAnswer: makeSelfAnswer,
        makeAdminAction: makeAdminAction,
        makeRequestState: makeRequestState,
        getRoomFromUrl: getRoomFromUrl,
        buildAnswerUrl: buildAnswerUrl
    };
})(typeof window !== 'undefined' ? window : global);
