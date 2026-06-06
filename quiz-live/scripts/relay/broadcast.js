'use strict';

var fs = require('fs');
var config = require('./config');
var roomStore = require('./room-store');

var DEFAULT_BROADCAST_CONFIG = {
    streakPrefix: '已经累计胜利{wins}次，',
    streaks: [],
    firstBlood: { message: '{name} 拿下首杀！' },
    join: { message: '{name} 加入了战场！' }
};

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
        return normalizeBroadcastConfig(JSON.parse(fs.readFileSync(config.BROADCAST_CONFIG_PATH, 'utf8')));
    } catch (e) {
        console.warn('[quiz-relay] Could not load broadcast-config.json:', e.message);
        return normalizeBroadcastConfig(null);
    }
}

function getBroadcastConfig() {
    try {
        var stat = fs.statSync(config.BROADCAST_CONFIG_PATH);
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

function getWinTiers(cfg) {
    return ((cfg || getBroadcastConfig()).streaks || []).map(function (s) { return s.streak; });
}

function formatWinBroadcastMessage(name, wins) {
    var cfg = getBroadcastConfig();
    var entry = (cfg.streaks || []).find(function (s) { return s.streak === wins; });
    var bodyTpl = entry ? entry.message : '{name} 累计胜利 {wins} 次！';
    var vars = templateVars(name, wins);
    var body = applyTemplate(bodyTpl, vars);
    var prefix = applyTemplate(cfg.streakPrefix || '已经累计胜利{wins}次，', vars);
    return prefix + body;
}

function formatEventMessage(blockKey, name) {
    var cfg = getBroadcastConfig();
    var block = cfg[blockKey] || DEFAULT_BROADCAST_CONFIG[blockKey];
    return applyTemplate(block.message, templateVars(name, 0));
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

function broadcastWinMilestone(room, participant, wins) {
    broadcastRoomEvent(room, 'streak', participant.name, formatWinBroadcastMessage(participant.name, wins));
}

function broadcastState(room) {
    broadcast(room, roomStore.buildState(room));
    roomStore.scheduleSaveRooms();
}

module.exports = {
    getBroadcastConfig: getBroadcastConfig,
    getWinTiers: getWinTiers,
    formatEventMessage: formatEventMessage,
    broadcast: broadcast,
    broadcastState: broadcastState,
    broadcastWinMilestone: broadcastWinMilestone,
    broadcastRoomEvent: broadcastRoomEvent
};
