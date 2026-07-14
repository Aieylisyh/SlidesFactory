#!/usr/bin/env node
/**
 * LAN WebSocket relay for deck remote control.
 * Forwards JSON messages between presenter and remote clients in the same room.
 *
 * Usage: node remoteNavigator/scripts/ws-relay.js [--host 0.0.0.0] [--port 8081]
 */
'use strict';

var http = require('http');
var crypto = require('crypto');

var PORT = 8081;
var HOST = '0.0.0.0';
var MAX_MESSAGE_BYTES = 16 * 1024;
var portArg = process.argv.indexOf('--port');
if (portArg !== -1) PORT = parseInt(process.argv[portArg + 1], 10) || 8081;
var hostArg = process.argv.indexOf('--host');
if (hostArg !== -1 && process.argv[hostArg + 1]) HOST = process.argv[hostArg + 1];

/** @type {Map<string, { presenter: WsSocket|null, remote: WsSocket|null, token: string|null, deckId: string|null }>} */
var rooms = new Map();

function sha1Base64(str) {
    return crypto.createHash('sha1').update(str).digest('base64');
}

function acceptKey(key) {
    return sha1Base64(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
}

function parseFrame(buffer) {
    if (buffer.length < 2) return null;
    var second = buffer[1];
    var masked = (second & 0x80) !== 0;
    var len = second & 0x7f;
    var offset = 2;
    if (len === 126) {
        if (buffer.length < 4) return null;
        len = buffer.readUInt16BE(2);
        offset = 4;
    } else if (len === 127) {
        if (buffer.length < 10) return null;
        len = Number(buffer.readBigUInt64BE(2));
        offset = 10;
    }
    var maskOffset = masked ? 4 : 0;
    if (buffer.length < offset + maskOffset + len) return null;
    var payload = buffer.slice(offset + maskOffset, offset + maskOffset + len);
    if (masked) {
        var mask = buffer.slice(offset, offset + 4);
        for (var i = 0; i < payload.length; i++) {
            payload[i] ^= mask[i % 4];
        }
    }
    return { payload: payload, totalLength: offset + maskOffset + len };
}

function encodeTextFrame(text) {
    var payload = Buffer.from(text, 'utf8');
    var len = payload.length;
    var header;
    if (len < 126) {
        header = Buffer.alloc(2);
        header[0] = 0x81;
        header[1] = len;
    } else if (len < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x81;
        header[1] = 126;
        header.writeUInt16BE(len, 2);
    } else {
        header = Buffer.alloc(10);
        header[0] = 0x81;
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(len), 2);
    }
    return Buffer.concat([header, payload]);
}

function WsSocket(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.open = false;
    this.role = null;
    this.room = null;
    this.deckId = null;
    this.clientId = null;
}

WsSocket.prototype.send = function (text) {
    if (!this.open) return;
    try {
        this.socket.write(encodeTextFrame(text));
    } catch (e) { /* ignore */ }
};

WsSocket.prototype.close = function () {
    this.open = false;
    try { this.socket.end(); } catch (e) { /* ignore */ }
};

function getRoom(room) {
    if (!rooms.has(room)) {
        rooms.set(room, { presenter: null, remote: null, token: null, deckId: null });
    }
    return rooms.get(room);
}

function sendToRemote(roomId, text) {
    var room = rooms.get(roomId);
    if (room && room.remote && room.remote.open) {
        room.remote.send(text);
    }
}

function sendToPresenter(roomId, text) {
    var room = rooms.get(roomId);
    if (room && room.presenter && room.presenter.open) {
        room.presenter.send(text);
    }
}

function removeClient(client) {
    if (!client.room) return;
    var room = rooms.get(client.room);
    if (!room) return;
    if (client.role === 'presenter' && room.presenter === client) {
        room.presenter = null;
    }
    if (client.role === 'remote' && room.remote === client) {
        room.remote = null;
    }
    if (!room.presenter && !room.remote) {
        rooms.delete(client.room);
    }
}

function sendError(client, code, message) {
    client.send(JSON.stringify({ type: 'error', code: code, message: message }));
}

function isValidRoom(room) {
    return /^[A-Z0-9]{4,8}$/.test(room);
}

function isValidToken(token) {
    return typeof token === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(token);
}

function isValidClientId(clientId) {
    return typeof clientId === 'string' && /^[A-Za-z0-9_-]{12,128}$/.test(clientId);
}

function handleHello(client, msg) {
    if (client.role) {
        sendError(client, 'already_joined', 'Client already joined a room');
        return;
    }

    var role = msg.role;
    var roomId = (msg.room || '').toUpperCase();
    var token = msg.token || '';

    if ((role !== 'presenter' && role !== 'remote') || !isValidRoom(roomId) || !isValidToken(token)) {
        sendError(client, 'invalid_hello', 'Invalid role, room, or token');
        return;
    }

    var room = rooms.get(roomId);

    if (role === 'remote' && !room) {
        sendError(client, 'presenter_offline', 'Presenter is not connected');
        return;
    }

    if (!room) room = getRoom(roomId);

    if (role === 'presenter') {
        if (room.token && room.token !== token) {
            sendError(client, 'unauthorized', 'Room token mismatch');
            return;
        }
        if (room.presenter && room.presenter !== client) {
            room.presenter.close();
        }
        room.token = token;
        room.deckId = msg.deckId || null;
        room.presenter = client;
    } else {
        if (!room.presenter || !room.presenter.open) {
            sendError(client, 'presenter_offline', 'Presenter is not connected');
            return;
        }
        if (room.token !== token) {
            sendError(client, 'unauthorized', 'Room token mismatch');
            return;
        }
        if (room.deckId && msg.deckId && room.deckId !== msg.deckId) {
            sendError(client, 'deck_mismatch', 'Remote deck does not match presenter deck');
            return;
        }
        if (!isValidClientId(msg.clientId)) {
            sendError(client, 'invalid_client', 'Remote client ID is missing');
            return;
        }
        if (room.remote && room.remote !== client) {
            if (room.remote.clientId === msg.clientId) {
                room.remote.close();
            } else {
                sendError(client, 'room_busy', 'A remote controller is already connected');
                return;
            }
        }
        room.remote = client;
    }

    client.role = role;
    client.room = roomId;
    client.deckId = msg.deckId || null;
    client.clientId = msg.clientId || null;
    client.send(JSON.stringify({ type: 'joined', role: role, room: roomId }));

    if (role === 'remote') {
        sendToPresenter(roomId, JSON.stringify({ type: 'remote_joined' }));
    }
}

function handleMessage(client, raw) {
    var msg;
    try {
        msg = JSON.parse(raw);
    } catch (e) {
        return;
    }

    if (msg.type === 'hello') {
        handleHello(client, msg);
        return;
    }

    if (!client.room) return;

    if ((msg.type === 'state' || msg.type === 'ack') && client.role === 'presenter') {
        sendToRemote(client.room, raw);
        return;
    }

    if (msg.type === 'cmd' && client.role === 'remote') {
        sendToPresenter(client.room, raw);
        return;
    }

    if (msg.type === 'request_state' && client.role === 'remote') {
        sendToPresenter(client.room, raw);
        return;
    }

    if (msg.type === 'ping') {
        client.send(JSON.stringify({ type: 'pong' }));
    }
}

var server = http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Deck remote WebSocket relay. Connect via ws://host:' + PORT + '\n');
});

server.on('upgrade', function (req, socket) {
    var key = req.headers['sec-websocket-key'];
    if (!key) {
        socket.destroy();
        return;
    }

    var accept = acceptKey(key);
    socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n'
    );

    var client = new WsSocket(socket);
    client.open = true;

    socket.on('data', function (chunk) {
        client.buffer = Buffer.concat([client.buffer, chunk]);
        if (client.buffer.length > MAX_MESSAGE_BYTES) {
            sendError(client, 'message_too_large', 'Message exceeds size limit');
            client.close();
            return;
        }
        while (client.buffer.length >= 2) {
            var opcode = client.buffer[0] & 0x0f;
            if (opcode === 0x8) {
                client.buffer = Buffer.alloc(0);
                socket.end();
                break;
            }
            var frame = parseFrame(client.buffer);
            if (!frame) break;
            client.buffer = client.buffer.slice(frame.totalLength);
            if (opcode === 0x1) {
                var payloadStr = frame.payload.toString('utf8');
                if (payloadStr) handleMessage(client, payloadStr);
            }
        }
    });

    socket.on('close', function () {
        removeClient(client);
    });

    socket.on('error', function () {
        removeClient(client);
    });
});

server.listen(PORT, HOST, function () {
    console.log('[ws-relay] listening on ws://' + HOST + ':' + PORT);
});
