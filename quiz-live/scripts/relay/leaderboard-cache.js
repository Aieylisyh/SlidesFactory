'use strict';

var LEADERBOARD_CACHE_TTL_MS = 5 * 60 * 1000;

/** @type {Map<string, { cachedAt: number, payload: object }>} */
var cache = new Map();

function cacheKey(roomId, mode, categoryId) {
    return String(roomId).toUpperCase() + ':' + mode + ':' + (categoryId || '');
}

function getCached(roomId, mode, categoryId) {
    var key = cacheKey(roomId, mode, categoryId);
    var entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > LEADERBOARD_CACHE_TTL_MS) {
        cache.delete(key);
        return null;
    }
    return entry.payload;
}

function setCached(roomId, mode, categoryId, payload) {
    cache.set(cacheKey(roomId, mode, categoryId), {
        cachedAt: Date.now(),
        payload: payload
    });
}

function invalidateRoom(roomId) {
    var prefix = String(roomId).toUpperCase() + ':';
    cache.forEach(function (_entry, key) {
        if (key.indexOf(prefix) === 0) cache.delete(key);
    });
}

function getOrBuild(room, mode, categoryId, buildFn) {
    var cached = getCached(room.id, mode, categoryId);
    if (cached) {
        return Object.assign({}, cached, { fromCache: true });
    }
    var payload = buildFn(room, categoryId);
    setCached(room.id, mode, categoryId, payload);
    return Object.assign({}, payload, { fromCache: false });
}

module.exports = {
    LEADERBOARD_CACHE_TTL_MS: LEADERBOARD_CACHE_TTL_MS,
    getOrBuild: getOrBuild,
    invalidateRoom: invalidateRoom
};
