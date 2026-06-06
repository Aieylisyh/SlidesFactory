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
var ROOM_STATE_PATH = path.join(__dirname, '..', 'data', 'room-state.json');
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
var saveRoomsTimer = null;

function createRoom(roomId) {
    return {
        id: roomId,
        participants: new Map(),
        sockets: { admin: null, screen: null, audience: new Set() },
        nextParticipantNum: 1,
        recentBroadcasts: []
    };
}

function participantToJson(p) {
    return {
        clientId: p.clientId,
        id: p.id,
        name: p.name,
        phone: p.phone,
        profile: p.profile || { name: p.name, phone: p.phone },
        score: p.score || 0,
        streak: p.streak || 0,
        bestStreak: p.bestStreak || 0,
        answeredQuestions: p.answeredQuestions || {},
        online: false,
        roundCorrect: p.roundCorrect || 0,
        roundStreak: p.roundStreak || 0,
        roundHasFirstBlood: !!p.roundHasFirstBlood,
        roundMilestones: p.roundMilestones || {},
        roundCategory: p.roundCategory || ''
    };
}

function participantFromJson(raw) {
    if (!raw || !raw.clientId) return null;
    return {
        clientId: raw.clientId,
        id: raw.id || '01',
        name: raw.name || '',
        phone: raw.phone || '',
        profile: raw.profile || { name: raw.name || '', phone: raw.phone || '' },
        score: raw.score || 0,
        streak: raw.streak || 0,
        bestStreak: raw.bestStreak || 0,
        answeredQuestions: raw.answeredQuestions || {},
        online: false,
        roundCorrect: raw.roundCorrect || 0,
        roundStreak: raw.roundStreak || 0,
        roundHasFirstBlood: !!raw.roundHasFirstBlood,
        roundMilestones: raw.roundMilestones || {},
        roundCategory: raw.roundCategory || ''
    };
}

function roomToJson(room) {
    var participants = [];
    room.participants.forEach(function (p) {
        participants.push(participantToJson(p));
    });
    return {
        id: room.id,
        nextParticipantNum: room.nextParticipantNum || 1,
        recentBroadcasts: room.recentBroadcasts || [],
        participants: participants
    };
}

function roomFromJson(raw) {
    if (!raw || !raw.id) return null;
    var room = createRoom(String(raw.id).toUpperCase());
    room.nextParticipantNum = raw.nextParticipantNum || 1;
    room.recentBroadcasts = Array.isArray(raw.recentBroadcasts) ? raw.recentBroadcasts.slice(0, 3) : [];
    (raw.participants || []).forEach(function (item) {
        var p = participantFromJson(item);
        if (p) room.participants.set(p.clientId, p);
    });
    return room;
}

function loadRoomsFromDisk() {
    try {
        var raw = JSON.parse(fs.readFileSync(ROOM_STATE_PATH, 'utf8'));
        var list = Array.isArray(raw.rooms) ? raw.rooms : [];
        list.forEach(function (item) {
            var room = roomFromJson(item);
            if (room) rooms.set(room.id, room);
        });
        console.log('[quiz-relay] room-state loaded:', rooms.size, 'room(s)');
    } catch (e) {
        if (e.code !== 'ENOENT') {
            console.warn('[quiz-relay] Could not load room-state.json:', e.message);
        }
    }
}

function saveRoomsToDisk() {
    try {
        var payload = { savedAt: Date.now(), rooms: [] };
        rooms.forEach(function (room) {
            payload.rooms.push(roomToJson(room));
        });
        fs.writeFileSync(ROOM_STATE_PATH, JSON.stringify(payload, null, 2), 'utf8');
    } catch (e) {
        console.warn('[quiz-relay] Could not save room-state.json:', e.message);
    }
}

function scheduleSaveRooms() {
    if (saveRoomsTimer) clearTimeout(saveRoomsTimer);
    saveRoomsTimer = setTimeout(function () {
        saveRoomsTimer = null;
        saveRoomsToDisk();
    }, 400);
}

function getRoom(roomId) {
    if (!rooms.has(roomId)) rooms.set(roomId, createRoom(roomId));
    return rooms.get(roomId);
}

function markParticipantOnline(room, clientId, client) {
    if (!clientId) return null;
    var p = room.participants.get(clientId);
    if (!p) return null;
    p.online = true;
    if (client) client._clientId = clientId;
    return p;
}

function padId(n) {
    return n < 10 ? '0' + n : String(n);
}

function resetRoundBroadcastState(p, category) {
    p.roundCorrect = 0;
    p.roundStreak = 0;
    p.roundHasFirstBlood = false;
    p.roundMilestones = {};
    p.roundCategory = category || '';
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
    scheduleSaveRooms();
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
    if (!p) {
        console.warn('[quiz-relay] self_answer ignored — unknown clientId in room', room.id, msg.clientId);
        return;
    }

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

        p.roundCorrect = (p.roundCorrect || 0) + 1;
        p.roundStreak = (p.roundStreak || 0) + 1;

        if (!p.roundHasFirstBlood) {
            p.roundHasFirstBlood = true;
            var fbName = p.name || '某位选手';
            broadcastRoomEvent(room, 'first_blood', fbName, formatEventMessage('firstBlood', fbName));
        } else {
            var roundWins = p.roundCorrect;
            if (!p.roundMilestones) p.roundMilestones = {};
            if (!p.roundMilestones[roundWins] && getWinTiers(getBroadcastConfig()).indexOf(roundWins) !== -1) {
                p.roundMilestones[roundWins] = true;
                broadcastWinMilestone(room, p, roundWins);
            }
        }
    } else {
        p.streak = 0;
        p.roundStreak = 0;
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
        else {
            room.sockets.audience.add(client);
            if (msg.clientId) markParticipantOnline(room, msg.clientId, client);
        }
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
                answeredQuestions: {},
                online: true
            };
            resetRoundBroadcastState(existing, '');
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

    if (msg.type === 'round_start') {
        var roundPlayer = room.participants.get(msg.clientId);
        if (roundPlayer) {
            resetRoundBroadcastState(roundPlayer, msg.category || '');
            scheduleSaveRooms();
        }
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

function notifyParticipantCleared(room, clientId) {
    room.sockets.audience.forEach(function (ws) {
        if (!clientId || ws._clientId === clientId) {
            ws.send(JSON.stringify({ type: 'participant_cleared' }));
        }
    });
}

function handleAdmin(room, msg, adminClient) {
    switch (msg.action) {
        case 'reset_room': {
            var adminWs = adminClient || room.sockets.admin;
            var screenWs = room.sockets.screen;
            var audience = room.sockets.audience;
            rooms.set(room.id, createRoom(room.id));
            room = getRoom(room.id);
            room.sockets.admin = adminWs;
            room.sockets.screen = screenWs;
            audience.forEach(function (ws) {
                ws.send(JSON.stringify({ type: 'participant_cleared' }));
            });
            break;
        }
        case 'delete_participant': {
            var targetId = msg.clientId;
            if (!targetId || !room.participants.has(targetId)) return;
            room.participants.delete(targetId);
            notifyParticipantCleared(room, targetId);
            break;
        }
        case 'clear_all_data': {
            room.participants.clear();
            room.nextParticipantNum = 1;
            room.recentBroadcasts = [];
            notifyParticipantCleared(room, null);
            break;
        }
        default:
            return;
    }
    broadcast(room, buildState(room));
    scheduleSaveRooms();
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
            if (p) {
                p.online = false;
                scheduleSaveRooms();
            }
            broadcastState(room);
        }
    });
});

loadRoomsFromDisk();

server.listen(PORT, '0.0.0.0', function () {
    console.log('[quiz-relay] WebSocket listening on ws://0.0.0.0:' + PORT);
    console.log('[quiz-relay] Categories:', (questionBank.quizzes || []).map(function (q) { return q.category; }).join(', '));
    console.log('[quiz-relay] Questions loaded:', totalQuestionCount());
    console.log('[quiz-relay] Win milestones:', getWinTiers(getBroadcastConfig()).join(', '));
});
