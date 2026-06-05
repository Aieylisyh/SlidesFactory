#!/usr/bin/env node
/**
 * LAN WebSocket relay for deck remote control.
 * Forwards JSON messages between presenter and remote clients in the same room.
 *
 * Usage: node remoteNavigator/scripts/ws-relay.js [--port 8081]
 */
'use strict';

var http = require('http');
var crypto = require('crypto');

var PORT = 8081;
var portArg = process.argv.indexOf('--port');
if (portArg !== -1) PORT = parseInt(process.argv[portArg + 1], 10) || 8081;

/** @type {Map<string, { presenter: WebSocket|null, remotes: Set<WebSocket> }>} */
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
        rooms.set(room, { presenter: null, remotes: new Set() });
    }
    return rooms.get(room);
}

function broadcastToRemotes(roomId, text, except) {
    var room = rooms.get(roomId);
    if (!room) return;
    room.remotes.forEach(function (client) {
        if (client !== except && client.open) client.send(text);
    });
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
    if (client.role === 'remote') {
        room.remotes.delete(client);
    }
    if (!room.presenter && room.remotes.size === 0) {
        rooms.delete(client.room);
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
        client.role = msg.role;
        client.room = (msg.room || '').toUpperCase();
        client.deckId = msg.deckId || null;

        if (!client.room) return;

        var room = getRoom(client.room);

        if (client.role === 'presenter') {
            if (room.presenter && room.presenter !== client) {
                room.presenter.close();
            }
            room.presenter = client;
            client.send(JSON.stringify({ type: 'joined', role: 'presenter', room: client.room }));
        } else if (client.role === 'remote') {
            room.remotes.add(client);
            client.send(JSON.stringify({ type: 'joined', role: 'remote', room: client.room }));
            sendToPresenter(client.room, JSON.stringify({ type: 'remote_joined' }));
        }
        return;
    }

    if (!client.room) return;

    if (msg.type === 'state' || msg.type === 'ack') {
        broadcastToRemotes(client.room, raw);
        return;
    }

    if (msg.type === 'cmd') {
        sendToPresenter(client.room, raw);
        return;
    }

    if (msg.type === 'request_state') {
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

server.listen(PORT, '0.0.0.0', function () {
    console.log('[ws-relay] listening on ws://0.0.0.0:' + PORT);
});
