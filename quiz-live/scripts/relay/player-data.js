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
        total_correct: 0,
        category_stats: {},
        unlocked_categories: [],
        created_at: now,
        last_active: now,
        level: TEST_FIXED_LEVEL
    };
}

function normalizePlayer(player) {
    if (!player) return null;
    if (player.total_exp == null) player.total_exp = 0;
    if (player.total_correct == null) player.total_correct = 0;
    if (!player.category_stats || typeof player.category_stats !== 'object') {
        player.category_stats = {};
    }
    if (!Array.isArray(player.unlocked_categories)) {
        player.unlocked_categories = [];
    }
    if (player.level == null) player.level = TEST_FIXED_LEVEL;
    return player;
}

function getCategoryStats(player, categoryId) {
    normalizePlayer(player);
    var id = String(categoryId || '').trim();
    if (!id) return { answered: 0, correct: 0 };
    if (!player.category_stats[id]) {
        player.category_stats[id] = { answered: 0, correct: 0 };
    }
    return player.category_stats[id];
}

function categoryAccuracyPercent(stats) {
    var answered = (stats && stats.answered) || 0;
    if (!answered) return 0;
    return Math.round(((stats.correct || 0) / answered) * 100);
}

function recordAnswer(player, categoryId, correct) {
    normalizePlayer(player);
    var stats = getCategoryStats(player, categoryId);
    stats.answered += 1;
    var expGained = 0;
    if (correct) {
        stats.correct += 1;
        player.total_correct += 1;
        player.total_exp += 1;
        expGained = 1;
    }
    touchPlayer(player);
    return {
        expGained: expGained,
        total_exp: player.total_exp,
        total_correct: player.total_correct,
        categoryStats: {
            answered: stats.answered,
            correct: stats.correct,
            accuracy: categoryAccuracyPercent(stats)
        }
    };
}

function touchPlayer(player) {
    if (!player) return;
    player.last_active = new Date().toISOString();
}

function playerToClientJson(player) {
    if (!player) return null;
    normalizePlayer(player);
    return {
        user_id: player.user_id,
        nickname: player.nickname,
        phone: player.phone || '',
        total_exp: player.total_exp || 0,
        total_correct: player.total_correct || 0,
        category_stats: player.category_stats || {},
        unlocked_categories: player.unlocked_categories.slice(),
        created_at: player.created_at,
        last_active: player.last_active,
        level: player.level || TEST_FIXED_LEVEL,
        levelInfo: getLevelInfo(player.level)
    };
}

function grantCategoryUnlock(player, categoryId) {
    normalizePlayer(player);
    var id = String(categoryId || '').trim();
    if (!id) return false;
    if (player.unlocked_categories.indexOf(id) === -1) {
        player.unlocked_categories.push(id);
    }
    touchPlayer(player);
    return true;
}

function isCategoryUnlocked(player, categoryId, requiredLevel) {
    normalizePlayer(player);
    var id = String(categoryId || '').trim();
    if (!id) return false;
    if (player.unlocked_categories.indexOf(id) !== -1) return true;
    var req = Number(requiredLevel) || 1;
    var level = Number(player.level) || TEST_FIXED_LEVEL;
    return req <= level;
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
    normalizePlayer: normalizePlayer,
    recordAnswer: recordAnswer,
    getCategoryStats: getCategoryStats,
    categoryAccuracyPercent: categoryAccuracyPercent,
    touchPlayer: touchPlayer,
    playerToClientJson: playerToClientJson,
    grantCategoryUnlock: grantCategoryUnlock,
    isCategoryUnlocked: isCategoryUnlocked,
    findNicknameConflict: findNicknameConflict
};
