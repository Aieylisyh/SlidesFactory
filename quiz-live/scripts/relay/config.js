'use strict';

var fs = require('fs');
var path = require('path');

var DATA_DIR = path.join(__dirname, '..', '..', 'data');
var QUIZ_DIR = path.join(DATA_DIR, 'quiz');
var QUESTION_CFG_PATH = path.join(QUIZ_DIR, 'question_cfg.json');
var BROADCAST_CONFIG_PATH = path.join(DATA_DIR, 'broadcast-config.json');
var ROOM_STATE_PATH = path.join(DATA_DIR, 'room-state.json');
var ANSWER_MIN_INTERVAL_MS = 300;

var questionCategories = [];
var deckTitle = '趣味常识挑战';

try {
    questionCategories = JSON.parse(fs.readFileSync(QUESTION_CFG_PATH, 'utf8'));
} catch (e) {
    console.warn('[quiz-relay] Could not load question_cfg.json:', e.message);
}

function totalQuestionCount() {
    var n = 0;
    questionCategories.forEach(function (cat) {
        var filePath = path.join(QUIZ_DIR, 'questions_' + cat.id + '.json');
        try {
            var bank = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            n += (bank.questions || []).length;
        } catch (err) {
            /* skip missing bank */
        }
    });
    return n;
}

function categoryDisplayNames() {
    return questionCategories.map(function (cat) {
        return cat.displayName || cat.id;
    });
}

module.exports = {
    DATA_DIR: DATA_DIR,
    QUIZ_DIR: QUIZ_DIR,
    QUESTION_CFG_PATH: QUESTION_CFG_PATH,
    BROADCAST_CONFIG_PATH: BROADCAST_CONFIG_PATH,
    ROOM_STATE_PATH: ROOM_STATE_PATH,
    ANSWER_MIN_INTERVAL_MS: ANSWER_MIN_INTERVAL_MS,
    questionCategories: questionCategories,
    deckTitle: deckTitle,
    totalQuestionCount: totalQuestionCount,
    categoryDisplayNames: categoryDisplayNames
};
