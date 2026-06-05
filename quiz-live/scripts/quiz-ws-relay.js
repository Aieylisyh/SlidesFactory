#!/usr/bin/env node
/**
 * LAN WebSocket relay for quiz-live audience sync.
 * Self-paced category quiz + streak broadcasts.
 *
 * Usage: node quiz-live/scripts/quiz-ws-relay.js [--port 8082]
 */
'use strict';

var http = require('http');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var PORT = 8082;
var portArg = process.argv.indexOf('--port');
if (portArg !== -1) PORT = parseInt(process.argv[portArg + 1], 10) || 8082;

var QUESTIONS_PATH = path.join(__dirname, '..', 'data', 'questions.json');
var BROADCAST_CONFIG_PATH = path.join(__dirname, '..', 'data', 'broadcast-config.json');
var questionBank = { title: '趣味常识挑战', quizzes: [] };

var DEFAULT_BROADCAST_CONFIG = {
    streakPrefix: '已经累计胜利{wins}次，',
    streaks: [],
    firstBlood: { message: '{name} 拿下首杀！' },
    join: { message: '{name} 加入了战场！' }
};

var ANSWER_MIN_INTERVAL_MS = 300;

var broadcastConfigCache = { mtime: 0, config: null };

function applyTemplate(tpl, vars) {
    var out = String(tpl || '');
    Object.keys(vars || {}).forEach(function (key) {
        out = out.split('{' + key + '}').join(String(vars[key]));
    });
    return out;
}

function templateVars(name, wins) {
    var displayName = name || '某位选手';
    var n = wins || 0;
    return { name: displayName, wins: n, streak: n };
}

function normalizeBroadcastConfig(raw) {
    var base = JSON.parse(JSON.stringify(DEFAULT_BROADCAST_CONFIG));
    if (!raw || typeof raw !== 'object') return base;
    if (raw.streakPrefix != null) base.streakPrefix = String(raw.streakPrefix);
    if (Array.isArray(raw.streaks) && raw.streaks.length) {
        base.streaks = raw.streaks.map(function (item) {
            return {
                streak: Number(item.streak),
                message: String(item.message || '{name} 累计胜利 {wins} 次！')
            };
        }).filter(function (item) { return item.streak > 0; });
    }
    if (raw.firstBlood && raw.firstBlood.message) {
        base.firstBlood = { message: String(raw.firstBlood.message) };
    }
    if (raw.join && raw.join.message) {
        base.join = { message: String(raw.join.message) };
    }
    return base;
}

function loadBroadcastConfigFromDisk() {
    try {
        return normalizeBroadcastConfig(JSON.parse(fs.readFileSync(BROADCAST_CONFIG_PATH, 'utf8')));
    } catch (e) {
        console.warn('[quiz-relay] Could not load broadcast-config.json:', e.message);
        return normalizeBroadcastConfig(null);
    }
}

function getBroadcastConfig() {
    try {
        var stat = fs.statSync(BROADCAST_CONFIG_PATH);
        if (!broadcastConfigCache.config || stat.mtimeMs !== broadcastConfigCache.mtime) {
            broadcastConfigCache.config = loadBroadcastConfigFromDisk();
            broadcastConfigCache.mtime = stat.mtimeMs;
            console.log('[quiz-relay] broadcast-config reloaded, tiers:', getWinTiers(broadcastConfigCache.config).join(', '));
        }
        return broadcastConfigCache.config;
    } catch (e) {
        if (!broadcastConfigCache.config) broadcastConfigCache.config = loadBroadcastConfigFromDisk();
        return broadcastConfigCache.config;
    }
}

function getWinTiers(config) {
    return (config.streaks || []).map(function (s) { return s.streak; });
}

function formatWinBroadcastMessage(name, wins) {
    var config = getBroadcastConfig();
    var entry = (config.streaks || []).find(function (s) { return s.streak === wins; });
    var bodyTpl = entry ? entry.message : '{name} 累计胜利 {wins} 次！';
    var vars = templateVars(name, wins);
    var body = applyTemplate(bodyTpl, vars);
    var prefix = applyTemplate(config.streakPrefix || '已经累计胜利{wins}次，', vars);
    return prefix + body;
}

function formatEventMessage(blockKey, name) {
    var config = getBroadcastConfig();
    var block = config[blockKey] || DEFAULT_BROADCAST_CONFIG[blockKey];
    return applyTemplate(block.message, templateVars(name, 0));
}

try {
    questionBank = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf8'));
} catch (e) {
    console.warn('[quiz-relay] Could not load questions.json:', e.message);
}

function totalQuestionCount() {
    var n = 0;
    (questionBank.quizzes || []).forEach(function (q) {
        n += (q.questions || []).length;
    });
    return n;
}

/** @type {Map<string, RoomState>} */
var rooms = new Map();

function createRoom(roomId) {
    return {
        id: roomId,
        participants: new Map(),
        sockets: { admin: null, screen: null, audience: new Set() },
        nextParticipantNum: 1,
        recentBroadcasts: []
    };
}

function getRoom(roomId) {
    if (!rooms.has(roomId)) rooms.set(roomId, createRoom(roomId));
    return rooms.get(roomId);
}

function padId(n) {
    return n < 10 ? '0' + n : String(n);
}

function sanitizeProfile(raw) {
    var profile = {};
    if (!raw || typeof raw !== 'object') return profile;
    Object.keys(raw).forEach(function (key) {
        if (!/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(key)) return;
        profile[key] = String(raw[key] == null ? '' : raw[key]).trim().slice(0, 64);
    });
    return profile;
}

function applyRegisterPayload(existing, msg) {
    var profile = sanitizeProfile(msg.profile);
    if (!profile.name && msg.name) profile.name = String(msg.name).trim().slice(0, 64);
    if (!profile.phone && msg.phone) profile.phone = String(msg.phone).trim().slice(0, 64);
    existing.profile = profile;
    existing.name = (profile.name || '').slice(0, 20);
    existing.phone = (profile.phone || '').slice(0, 20);
}

function participantList(room) {
    var list = [];
    room.participants.forEach(function (p) {
        list.push({
            clientId: p.clientId,
            id: p.id,
            name: p.name,
            phone: p.phone,
            profile: p.profile || { name: p.name, phone: p.phone },
            score: p.score,
            streak: p.streak,
            bestStreak: p.bestStreak,
            online: p.online
        });
    });
    list.sort(function (a, b) {
        return parseInt(a.id, 10) - parseInt(b.id, 10);
    });
    return list;
}

function buildState(room) {
    var participants = participantList(room);
    return {
        type: 'state',
        room: room.id,
        title: questionBank.title || '趣味常识挑战',
        categories: (questionBank.quizzes || []).map(function (q) { return q.category; }),
        totalQuestions: totalQuestionCount(),
        participants: participants,
        onlineCount: participants.filter(function (p) { return p.online; }).length,
        recentBroadcasts: (room.recentBroadcasts || []).slice(0, 3)
    };
}

function broadcast(room, msg, exceptWs) {
    var raw = JSON.stringify(msg);
    function send(ws) {
        if (!ws || !ws.open || ws === exceptWs) return;
        ws.send(raw);
    }
    send(room.sockets.admin);
    send(room.sockets.screen);
    room.sockets.audience.forEach(send);
}

function broadcastState(room) {
    broadcast(room, buildState(room));
}

function broadcastWinMilestone(room, participant, wins) {
    broadcastRoomEvent(room, 'streak', participant.name, formatWinBroadcastMessage(participant.name, wins));
}

function pushRecentBroadcast(room, entry) {
    if (!room.recentBroadcasts) room.recentBroadcasts = [];
    room.recentBroadcasts.unshift(entry);
    if (room.recentBroadcasts.length > 3) {
        room.recentBroadcasts = room.recentBroadcasts.slice(0, 3);
    }
}

function broadcastRoomEvent(room, kind, name, message) {
    pushRecentBroadcast(room, {
        kind: kind,
        name: name || '',
        message: message,
        at: Date.now()
    });
    broadcast(room, {
        type: 'room_broadcast',
        kind: kind,
        name: name || '',
        message: message
    });
}

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
        for (var i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
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

function handleSelfAnswer(room, client, msg) {
    var p = room.participants.get(msg.clientId);
    if (!p) return;

    var now = Date.now();
    if (p.lastAnswerAt && now - p.lastAnswerAt < ANSWER_MIN_INTERVAL_MS) return;

    var qKey = String(msg.category || '') + ':' + String(msg.questionId || '');
    if (!p.answeredQuestions) p.answeredQuestions = {};
    if (p.answeredQuestions[qKey]) return;

    p.lastAnswerAt = now;
    p.answeredQuestions[qKey] = !!msg.correct;

    if (msg.correct) {
        p.score += 1;
        p.streak += 1;
        if (p.streak > p.bestStreak) p.bestStreak = p.streak;

        if (!p.hasFirstBlood) {
            p.hasFirstBlood = true;
            var fbName = p.name || '某位选手';
            broadcastRoomEvent(room, 'first_blood', fbName, formatEventMessage('firstBlood', fbName));
        } else if (getWinTiers(getBroadcastConfig()).indexOf(p.score) !== -1) {
            broadcastWinMilestone(room, p, p.score);
        }
    } else {
        p.streak = 0;
    }

    client.send(JSON.stringify({
        type: 'answer_ack',
        correct: !!msg.correct,
        streak: p.streak,
        score: p.score
    }));
    broadcastState(room);
}

function handleMessage(client, raw) {
    var msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || !msg.type) return;

    var roomId = (client._quizRoom || msg.room || '').toUpperCase();
    if (!roomId) return;
    var room = getRoom(roomId);

    if (msg.type === 'hello') {
        client._quizRoom = roomId;
        client._quizRole = msg.role;
        client._clientId = msg.clientId || null;
        if (msg.role === 'admin') room.sockets.admin = client;
        else if (msg.role === 'screen') room.sockets.screen = client;
        else room.sockets.audience.add(client);
        client.send(JSON.stringify(buildState(room)));
        return;
    }

    if (msg.type === 'request_state') {
        client.send(JSON.stringify(buildState(room)));
        return;
    }

    if (msg.type === 'register') {
        var cid = msg.clientId;
        if (!cid) return;
        var existing = room.participants.get(cid);
        var isNew = !existing;
        if (!existing) {
            existing = {
                clientId: cid,
                id: padId(room.nextParticipantNum++),
                name: '',
                phone: '',
                profile: {},
                score: 0,
                streak: 0,
                bestStreak: 0,
                hasFirstBlood: false,
                answeredQuestions: {},
                online: true
            };
            room.participants.set(cid, existing);
        }
        applyRegisterPayload(existing, msg);
        existing.online = true;
        client._clientId = cid;
        client.send(JSON.stringify({
            type: 'registered',
            participantId: existing.id,
            clientId: cid,
            name: existing.name
        }));
        if (isNew) {
            var joinName = existing.name || ('选手' + existing.id);
            broadcastRoomEvent(room, 'join', joinName, formatEventMessage('join', joinName));
        }
        broadcastState(room);
        return;
    }

    if (msg.type === 'self_answer') {
        handleSelfAnswer(room, client, msg);
        return;
    }

    if (msg.type === 'admin' && client._quizRole === 'admin') {
        handleAdmin(room, msg, client);
        return;
    }
}

function handleAdmin(room, msg, adminClient) {
    switch (msg.action) {
        case 'reset_room': {
            var adminWs = adminClient || room.sockets.admin;
            var screenWs = room.sockets.screen;
            rooms.set(room.id, createRoom(room.id));
            room = getRoom(room.id);
            room.sockets.admin = adminWs;
            room.sockets.screen = screenWs;
            break;
        }
        default:
            return;
    }
    broadcast(room, buildState(room));
}

function WsSocket(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.open = true;
    this._quizRoom = '';
    this._quizRole = '';
    this._clientId = null;
}

WsSocket.prototype.send = function (text) {
    if (!this.open) return;
    try {
        this.socket.write(encodeTextFrame(text));
    } catch (e) { /* ignore */ }
};

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
    var accept = acceptKey(key);
    var response = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Accept: ' + accept,
        '', ''
    ].join('\r\n');
    socket.write(response);

    var client = new WsSocket(socket);

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
                handleMessage(client, frame.payload.toString('utf8'));
            }
        }
    });

    socket.on('close', function () {
        var roomId = client._quizRoom;
        if (!roomId) return;
        var room = rooms.get(roomId);
        if (!room) return;
        if (client._quizRole === 'admin' && room.sockets.admin === client) room.sockets.admin = null;
        else if (client._quizRole === 'screen' && room.sockets.screen === client) room.sockets.screen = null;
        else room.sockets.audience.delete(client);
        if (client._clientId) {
            var p = room.participants.get(client._clientId);
            if (p) p.online = false;
            broadcastState(room);
        }
    });
});

server.listen(PORT, '0.0.0.0', function () {
    console.log('[quiz-relay] WebSocket listening on ws://0.0.0.0:' + PORT);
    console.log('[quiz-relay] Categories:', (questionBank.quizzes || []).map(function (q) { return q.category; }).join(', '));
    console.log('[quiz-relay] Questions loaded:', totalQuestionCount());
    console.log('[quiz-relay] Win milestones:', getWinTiers(getBroadcastConfig()).join(', '));
});
