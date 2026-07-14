/**
 * Shared WebSocket message helpers for deck remote control.
 */
(function (global) {
    'use strict';

    var WS_PORT = 8081;

    function getRuntimeParam(name) {
        var search = new URLSearchParams(global.location.search || '');
        var value = search.get(name);
        if (value) return value;

        var hash = (global.location.hash || '').replace(/^#/, '');
        if (!hash) return '';
        try {
            return new URLSearchParams(hash).get(name) || '';
        } catch (e) {
            return '';
        }
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

    function getWsUrl() {
        var runtimeUrl = getRuntimeParam('ws');
        var configuredUrl = global.location.protocol === 'https:' && global.DeckRemoteConfig && global.DeckRemoteConfig.wsUrl;
        var explicitUrl = runtimeUrl || configuredUrl;
        if (explicitUrl && /^wss?:\/\//i.test(explicitUrl)) {
            return explicitUrl;
        }

        var proto = global.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return proto + '//' + global.location.hostname + ':' + WS_PORT;
    }

    function randomToken(byteLength) {
        byteLength = byteLength || 24;
        if (!global.crypto || !global.crypto.getRandomValues) {
            throw new Error('Secure random generator is unavailable');
        }
        var bytes = new Uint8Array(byteLength);
        global.crypto.getRandomValues(bytes);
        var binary = '';
        for (var i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return global.btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/g, '');
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

    function makeHello(role, room, deckId, token, clientId) {
        return {
            type: 'hello',
            role: role,
            room: room,
            deckId: deckId || null,
            token: token || null,
            clientId: clientId || null
        };
    }

    function makeState(slide, focus, interaction) {
        var msg = {
            type: 'state',
            index: slide.index,
            h: slide.h,
            v: slide.v,
            id: slide.id,
            title: slide.title || slide.id
        };
        if (focus) msg.focus = focus;
        if (interaction) msg.interaction = interaction;
        return msg;
    }

    function makeCmd(action, slide, extra) {
        var msg = { type: 'cmd', action: action };
        if (slide) {
            msg.index = slide.index;
            msg.h = slide.h;
            msg.v = slide.v;
            msg.id = slide.id;
        }
        if (extra) {
            Object.keys(extra).forEach(function (key) {
                msg[key] = extra[key];
            });
        }
        return msg;
    }

    function makeAck(slide, focus, interaction) {
        var msg = {
            type: 'ack',
            index: slide.index,
            h: slide.h,
            v: slide.v,
            id: slide.id
        };
        if (focus) msg.focus = focus;
        if (interaction) msg.interaction = interaction;
        return msg;
    }

    global.DeckRemoteProtocol = {
        WS_PORT: WS_PORT,
        randomRoomCode: randomRoomCode,
        randomToken: randomToken,
        getRuntimeParam: getRuntimeParam,
        getWsUrl: getWsUrl,
        parseMessage: parseMessage,
        stringifyMessage: stringifyMessage,
        makeHello: makeHello,
        makeState: makeState,
        makeCmd: makeCmd,
        makeAck: makeAck
    };
})(typeof window !== 'undefined' ? window : global);
