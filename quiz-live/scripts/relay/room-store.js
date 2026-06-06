'use strict';

var fs = require('fs');
var config = require('./config');

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
        var raw = JSON.parse(fs.readFileSync(config.ROOM_STATE_PATH, 'utf8'));
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
        fs.writeFileSync(config.ROOM_STATE_PATH, JSON.stringify(payload, null, 2), 'utf8');
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
        title: config.questionBank.title || '趣味常识挑战',
        categories: (config.questionBank.quizzes || []).map(function (q) { return q.category; }),
        totalQuestions: config.totalQuestionCount(),
        participants: participants,
        onlineCount: participants.filter(function (p) { return p.online; }).length,
        recentBroadcasts: (room.recentBroadcasts || []).slice(0, 3)
    };
}

module.exports = {
    rooms: rooms,
    createRoom: createRoom,
    loadRoomsFromDisk: loadRoomsFromDisk,
    scheduleSaveRooms: scheduleSaveRooms,
    getRoom: getRoom,
    markParticipantOnline: markParticipantOnline,
    padId: padId,
    resetRoundBroadcastState: resetRoundBroadcastState,
    applyRegisterPayload: applyRegisterPayload,
    buildState: buildState
};
