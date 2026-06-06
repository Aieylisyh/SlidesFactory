#!/usr/bin/env node
/**
 * LAN WebSocket relay for quiz-live audience sync.
 * Self-paced category quiz + streak broadcasts.
 *
 * Usage: node quiz-live/scripts/quiz-ws-relay.js [--port 8082]
 */
'use strict';

var http = require('http');
var config = require('./relay/config');
var roomStore = require('./relay/room-store');
var broadcast = require('./relay/broadcast');
var handlers = require('./relay/message-handlers');
var wsUtil = require('./relay/ws-util');

var PORT = 8082;
var portArg = process.argv.indexOf('--port');
if (portArg !== -1) PORT = parseInt(process.argv[portArg + 1], 10) || 8082;

roomStore.loadRoomsFromDisk();

var server = http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('quiz-live relay OK\n');
});

server.on('upgrade', function (req, socket) {
    var key = (req.headers['sec-websocket-key'] || '').trim();
    if (!key) {
        socket.destroy();
        return;
    }
    var response = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Accept: ' + wsUtil.acceptKey(key),
        '', ''
    ].join('\r\n');
    socket.write(response);

    var client = new wsUtil.WsSocket(socket);

    socket.on('data', function (chunk) {
        client.buffer = Buffer.concat([client.buffer, chunk]);
        while (client.buffer.length >= 2) {
            var opcode = client.buffer[0] & 0x0f;
            if (opcode === 0x8) {
                client.buffer = Buffer.alloc(0);
                socket.end();
                break;
            }
            var frame = wsUtil.parseFrame(client.buffer);
            if (!frame) break;
            client.buffer = client.buffer.slice(frame.totalLength);
            if (opcode === 0x1) {
                handlers.handleMessage(client, frame.payload.toString('utf8'));
            }
        }
    });

    socket.on('close', function () {
        client.open = false;
        handlers.handleDisconnect(client);
    });
});

server.listen(PORT, '0.0.0.0', function () {
    console.log('[quiz-relay] WebSocket listening on ws://0.0.0.0:' + PORT);
    console.log('[quiz-relay] Categories:', (config.questionBank.quizzes || []).map(function (q) { return q.category; }).join(', '));
    console.log('[quiz-relay] Questions loaded:', config.totalQuestionCount());
    console.log('[quiz-relay] Win milestones:', broadcast.getWinTiers().join(', '));
});
