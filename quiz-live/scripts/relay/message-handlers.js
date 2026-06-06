'use strict';

var config = require('./config');
var roomStore = require('./room-store');
var broadcast = require('./broadcast');

function notifyParticipantCleared(room, clientId) {
    room.sockets.audience.forEach(function (ws) {
        if (!clientId || ws._clientId === clientId) {
            ws.send(JSON.stringify({ type: 'participant_cleared' }));
        }
    });
}

function handleSelfAnswer(room, client, msg) {
    var p = room.participants.get(msg.clientId);
    if (!p) {
        console.warn('[quiz-relay] self_answer ignored — unknown clientId in room', room.id, msg.clientId);
        return;
    }

    var now = Date.now();
    if (p.lastAnswerAt && now - p.lastAnswerAt < config.ANSWER_MIN_INTERVAL_MS) return;

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
            broadcast.broadcastRoomEvent(room, 'first_blood', fbName, broadcast.formatEventMessage('firstBlood', fbName));
        } else {
            var roundWins = p.roundCorrect;
            if (!p.roundMilestones) p.roundMilestones = {};
            if (!p.roundMilestones[roundWins] && broadcast.getWinTiers().indexOf(roundWins) !== -1) {
                p.roundMilestones[roundWins] = true;
                broadcast.broadcastWinMilestone(room, p, roundWins);
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
    broadcast.broadcastState(room);
}

function handleAdmin(room, msg, adminClient) {
    switch (msg.action) {
        case 'reset_room': {
            var adminWs = adminClient || room.sockets.admin;
            var screenWs = room.sockets.screen;
            var audience = room.sockets.audience;
            roomStore.rooms.set(room.id, roomStore.createRoom(room.id));
            room = roomStore.getRoom(room.id);
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
    broadcast.broadcast(room, roomStore.buildState(room));
    roomStore.scheduleSaveRooms();
}

function handleMessage(client, raw) {
    var msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || !msg.type) return;

    var roomId = (client._quizRoom || msg.room || '').toUpperCase();
    if (!roomId) return;
    var room = roomStore.getRoom(roomId);

    if (msg.type === 'hello') {
        client._quizRoom = roomId;
        client._quizRole = msg.role;
        client._clientId = msg.clientId || null;
        if (msg.role === 'admin') room.sockets.admin = client;
        else if (msg.role === 'screen') room.sockets.screen = client;
        else {
            room.sockets.audience.add(client);
            if (msg.clientId) roomStore.markParticipantOnline(room, msg.clientId, client);
        }
        client.send(JSON.stringify(roomStore.buildState(room)));
        return;
    }

    if (msg.type === 'request_state') {
        client.send(JSON.stringify(roomStore.buildState(room)));
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
                id: roomStore.padId(room.nextParticipantNum++),
                name: '',
                phone: '',
                profile: {},
                score: 0,
                streak: 0,
                bestStreak: 0,
                answeredQuestions: {},
                online: true
            };
            roomStore.resetRoundBroadcastState(existing, '');
            room.participants.set(cid, existing);
        }
        roomStore.applyRegisterPayload(existing, msg);
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
            broadcast.broadcastRoomEvent(room, 'join', joinName, broadcast.formatEventMessage('join', joinName));
        }
        broadcast.broadcastState(room);
        return;
    }

    if (msg.type === 'round_start') {
        var roundPlayer = room.participants.get(msg.clientId);
        if (roundPlayer) {
            roomStore.resetRoundBroadcastState(roundPlayer, msg.category || '');
            roomStore.scheduleSaveRooms();
        }
        return;
    }

    if (msg.type === 'self_answer') {
        handleSelfAnswer(room, client, msg);
        return;
    }

    if (msg.type === 'admin' && client._quizRole === 'admin') {
        handleAdmin(room, msg, client);
    }
}

function handleDisconnect(client) {
    var roomId = client._quizRoom;
    if (!roomId) return;
    var room = roomStore.rooms.get(roomId);
    if (!room) return;
    if (client._quizRole === 'admin' && room.sockets.admin === client) room.sockets.admin = null;
    else if (client._quizRole === 'screen' && room.sockets.screen === client) room.sockets.screen = null;
    else room.sockets.audience.delete(client);
    if (client._clientId) {
        var p = room.participants.get(client._clientId);
        if (p) {
            p.online = false;
            roomStore.scheduleSaveRooms();
        }
        broadcast.broadcastState(room);
    }
}

module.exports = {
    handleMessage: handleMessage,
    handleDisconnect: handleDisconnect
};
