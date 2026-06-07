'use strict';

var fs = require('fs');
var crypto = require('crypto');
var config = require('./config');
var playerData = require('./player-data');

var rooms = new Map();
var saveRoomsTimer = null;

function createRoom(roomId) {
    return {
        id: roomId,
        participants: new Map(),
        vipShares: new Map(),
        sockets: { admin: null, screen: null, audience: new Set() },
        nextParticipantNum: 1,
        recentBroadcasts: []
    };
}

function vipShareToJson(share) {
    return {
        token: share.token,
        categoryId: share.categoryId,
        createdAt: share.createdAt,
        redeemedAt: share.redeemedAt || null,
        redeemedByClientId: share.redeemedByClientId || null,
        redeemedByName: share.redeemedByName || null
    };
}

function randomVipToken() {
    return crypto.randomBytes(9).toString('base64url');
}

function isValidCategoryId(categoryId) {
    var id = String(categoryId || '').trim();
    if (!id) return false;
    return config.questionCategories.some(function (cat) { return cat.id === id; });
}

function getCategoryMeta(categoryId) {
    var id = String(categoryId || '').trim();
    return config.questionCategories.find(function (cat) { return cat.id === id; }) || null;
}

function createVipShare(room, categoryId) {
    if (!isValidCategoryId(categoryId)) return null;
    var token = randomVipToken();
    while (room.vipShares.has(token)) {
        token = randomVipToken();
    }
    var share = {
        token: token,
        categoryId: String(categoryId).trim(),
        createdAt: new Date().toISOString(),
        redeemedAt: null,
        redeemedByClientId: null,
        redeemedByName: null
    };
    room.vipShares.set(token, share);
    return vipShareToJson(share);
}

function redeemVipShare(room, clientId, categoryId, token) {
    var shareToken = String(token || '').trim();
    var catId = String(categoryId || '').trim();
    if (!shareToken || !catId || !clientId) {
        return { ok: false, message: 'VIP 链接参数无效' };
    }

    var share = room.vipShares.get(shareToken);
    if (!share) {
        return { ok: false, message: 'VIP 链接无效或已失效' };
    }
    if (share.categoryId !== catId) {
        return { ok: false, message: 'VIP 链接与题库不匹配' };
    }
    if (share.redeemedAt) {
        return { ok: false, message: '此 VIP 分享链接已被使用' };
    }

    var participant = room.participants.get(clientId);
    if (!participant) {
        return { ok: false, message: '请先完成昵称登记' };
    }
    if (!participant.player) {
        participant.player = playerData.createPlayer(participant.name, participant.phone);
    }

    playerData.grantCategoryUnlock(participant.player, catId);
    share.redeemedAt = new Date().toISOString();
    share.redeemedByClientId = clientId;
    share.redeemedByName = participant.name || '';

    var cat = getCategoryMeta(catId);
    return {
        ok: true,
        categoryId: catId,
        categoryName: cat ? (cat.displayName || cat.id) : catId,
        player: participant.player
    };
}

function listVipShares(room, limit) {
    var max = Math.max(1, Math.min(limit || 20, 50));
    var list = [];
    room.vipShares.forEach(function (share) {
        list.push(vipShareToJson(share));
    });
    list.sort(function (a, b) {
        return String(b.createdAt).localeCompare(String(a.createdAt));
    });
    return list.slice(0, max);
}

function clearVipShares(room) {
    room.vipShares.clear();
}

function participantHasCategoryAccess(participant, categoryId) {
    if (!participant) return false;
    var cat = getCategoryMeta(categoryId);
    if (!cat) return false;
    if (!participant.player) return (cat.required_level || 1) <= playerData.TEST_FIXED_LEVEL;
    return playerData.isCategoryUnlocked(participant.player, cat.id, cat.required_level);
}

function participantToJson(p) {
    return {
        clientId: p.clientId,
        id: p.id,
        name: p.name,
        phone: p.phone,
        profile: p.profile || { name: p.name, phone: p.phone },
        player: playerData.playerToClientJson(p.player),
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
    var player = raw.player;
    if (!player || !player.user_id) {
        player = playerData.createPlayer(raw.name || '', raw.phone || '');
    } else {
        playerData.normalizePlayer(player);
    }
    return {
        clientId: raw.clientId,
        id: raw.id || '01',
        name: raw.name || '',
        phone: raw.phone || '',
        profile: raw.profile || { name: raw.name || '', phone: raw.phone || '' },
        player: player,
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
    var vipShares = [];
    room.vipShares.forEach(function (share) {
        vipShares.push(vipShareToJson(share));
    });
    return {
        id: room.id,
        nextParticipantNum: room.nextParticipantNum || 1,
        recentBroadcasts: room.recentBroadcasts || [],
        vipShares: vipShares,
        participants: participants
    };
}

function roomFromJson(raw) {
    if (!raw || !raw.id) return null;
    var room = createRoom(String(raw.id).toUpperCase());
    room.nextParticipantNum = raw.nextParticipantNum || 1;
    room.recentBroadcasts = Array.isArray(raw.recentBroadcasts) ? raw.recentBroadcasts.slice(0, 3) : [];
    (raw.vipShares || []).forEach(function (item) {
        if (!item || !item.token) return;
        room.vipShares.set(item.token, {
            token: item.token,
            categoryId: item.categoryId || '',
            createdAt: item.createdAt || '',
            redeemedAt: item.redeemedAt || null,
            redeemedByClientId: item.redeemedByClientId || null,
            redeemedByName: item.redeemedByName || null
        });
    });
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
            player: playerData.playerToClientJson(p.player),
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
        title: config.deckTitle,
        categories: config.categoryDisplayNames(),
        questionCategories: config.questionCategories,
        totalQuestions: config.totalQuestionCount(),
        participants: participants,
        onlineCount: participants.filter(function (p) { return p.online; }).length,
        recentBroadcasts: (room.recentBroadcasts || []).slice(0, 3)
    };
}

function participantToAdminDetail(p) {
    var json = participantToJson(p);
    json.online = !!p.online;
    return json;
}

function buildAdminSummary(room) {
    var roster = [];
    var onlineCount = 0;
    room.participants.forEach(function (p) {
        if (p.online) onlineCount += 1;
        roster.push({
            clientId: p.clientId,
            id: p.id,
            name: p.name || ''
        });
    });
    roster.sort(function (a, b) {
        return parseInt(a.id, 10) - parseInt(b.id, 10);
    });
    return {
        type: 'admin_summary',
        room: room.id,
        totalCount: roster.length,
        onlineCount: onlineCount,
        roster: roster,
        questionCategories: config.questionCategories,
        vipShares: listVipShares(room, 12),
        recentBroadcasts: (room.recentBroadcasts || []).slice(0, 3)
    };
}

function getParticipantsDetail(room, clientIds) {
    if (!Array.isArray(clientIds)) return [];
    return clientIds.map(function (id) {
        var p = room.participants.get(id);
        return p ? participantToAdminDetail(p) : null;
    }).filter(Boolean);
}

function buildGlobalLeaderboardPayload(room) {
    var rows = [];
    room.participants.forEach(function (p) {
        rows.push({
            name: p.name || '',
            score: p.score || 0,
            streak: p.streak || 0,
            bestStreak: p.bestStreak || 0,
            online: !!p.online
        });
    });
    rows.sort(function (a, b) {
        return b.score - a.score || (b.bestStreak || 0) - (a.bestStreak || 0);
    });
    return {
        type: 'leaderboard',
        mode: 'global',
        room: room.id,
        rows: rows
    };
}

function buildCategoryLeaderboardPayload(room, categoryId) {
    var catId = String(categoryId || '').trim();
    var cat = getCategoryMeta(catId);
    var rows = [];
    room.participants.forEach(function (p) {
        var stats = p.player
            ? playerData.getCategoryStats(p.player, catId)
            : { answered: 0, correct: 0 };
        var answered = stats.answered || 0;
        var correct = stats.correct || 0;
        rows.push({
            name: p.name || '',
            correct: correct,
            answered: answered,
            accuracy: answered ? Math.round((correct / answered) * 100) : 0
        });
    });
    rows.sort(function (a, b) {
        return b.correct - a.correct || b.accuracy - a.accuracy;
    });
    return {
        type: 'leaderboard',
        mode: 'category',
        room: room.id,
        categoryId: catId,
        categoryName: cat ? (cat.displayName || cat.id) : catId,
        rows: rows
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
    sanitizeProfile: sanitizeProfile,
    buildState: buildState,
    participantToAdminDetail: participantToAdminDetail,
    buildAdminSummary: buildAdminSummary,
    getParticipantsDetail: getParticipantsDetail,
    createVipShare: createVipShare,
    redeemVipShare: redeemVipShare,
    listVipShares: listVipShares,
    clearVipShares: clearVipShares,
    participantHasCategoryAccess: participantHasCategoryAccess,
    getCategoryMeta: getCategoryMeta,
    isValidCategoryId: isValidCategoryId,
    buildGlobalLeaderboardPayload: buildGlobalLeaderboardPayload,
    buildCategoryLeaderboardPayload: buildCategoryLeaderboardPayload
};
