/**
 * Shared WebSocket message helpers for deck remote control.
 */
(function (global) {
    'use strict';

    var WS_PORT = 8081;

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
        var proto = global.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return proto + '//' + global.location.hostname + ':' + WS_PORT;
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

    function makeHello(role, room, deckId) {
        return { type: 'hello', role: role, room: room, deckId: deckId || null };
    }

    function makeState(slide, focus) {
        var msg = {
            type: 'state',
            index: slide.index,
            h: slide.h,
            v: slide.v,
            id: slide.id,
            title: slide.title || slide.id
        };
        if (focus) msg.focus = focus;
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

    function makeAck(slide, focus) {
        var msg = {
            type: 'ack',
            index: slide.index,
            h: slide.h,
            v: slide.v,
            id: slide.id
        };
        if (focus) msg.focus = focus;
        return msg;
    }

    global.DeckRemoteProtocol = {
        WS_PORT: WS_PORT,
        randomRoomCode: randomRoomCode,
        getWsUrl: getWsUrl,
        parseMessage: parseMessage,
        stringifyMessage: stringifyMessage,
        makeHello: makeHello,
        makeState: makeState,
        makeCmd: makeCmd,
        makeAck: makeAck
    };
})(typeof window !== 'undefined' ? window : global);
