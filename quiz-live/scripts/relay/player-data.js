'use strict';

/**
 * 玩家与等级数据结构（阶段性实现）。
 *
 * Player:
 *   user_id, nickname, phone, password_hash, total_exp, created_at, last_active, level
 *
 * Level (见 data/levels.json):
 *   level, title, icon_url, min_exp_required
 */

var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var LEVELS_PATH = path.join(__dirname, '..', '..', 'data', 'levels.json');

/** 测试阶段：所有新玩家固定等级 */
var TEST_FIXED_LEVEL = 3;

var levelTable = [];

function loadLevels() {
    try {
        levelTable = JSON.parse(fs.readFileSync(LEVELS_PATH, 'utf8'));
    } catch (e) {
        console.warn('[quiz-relay] Could not load levels.json:', e.message);
        levelTable = [];
    }
    return levelTable;
}

function getLevelInfo(levelNum) {
    var n = Number(levelNum) || TEST_FIXED_LEVEL;
    var found = levelTable.find(function (row) { return row.level === n; });
    if (found) return found;
    return {
        level: n,
        title: 'Lv.' + n,
        icon_url: '',
        min_exp_required: 0
    };
}

function createPlayer(nickname, phone) {
    var now = new Date().toISOString();
    return {
        user_id: crypto.randomUUID(),
        nickname: String(nickname || '').trim().slice(0, 64),
        phone: String(phone || '').trim().slice(0, 32),
        password_hash: '',
        total_exp: 0,
        created_at: now,
        last_active: now,
        level: TEST_FIXED_LEVEL
    };
}

function touchPlayer(player) {
    if (!player) return;
    player.last_active = new Date().toISOString();
}

function playerToClientJson(player) {
    if (!player) return null;
    return {
        user_id: player.user_id,
        nickname: player.nickname,
        phone: player.phone || '',
        total_exp: player.total_exp || 0,
        created_at: player.created_at,
        last_active: player.last_active,
        level: player.level || TEST_FIXED_LEVEL,
        levelInfo: getLevelInfo(player.level)
    };
}

function findNicknameConflict(room, nickname, clientId) {
    var name = String(nickname || '').trim();
    if (!name) return null;
    var conflict = null;
    room.participants.forEach(function (p) {
        if (p.clientId === clientId) return;
        var n = (p.player && p.player.nickname) || p.name || '';
        if (n === name) conflict = p;
    });
    return conflict;
}

loadLevels();

module.exports = {
    TEST_FIXED_LEVEL: TEST_FIXED_LEVEL,
    loadLevels: loadLevels,
    getLevelInfo: getLevelInfo,
    createPlayer: createPlayer,
    touchPlayer: touchPlayer,
    playerToClientJson: playerToClientJson,
    findNicknameConflict: findNicknameConflict
};
