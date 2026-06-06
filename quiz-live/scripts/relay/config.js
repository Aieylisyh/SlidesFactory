'use strict';

var fs = require('fs');
var path = require('path');

var DATA_DIR = path.join(__dirname, '..', '..', 'data');
var QUESTIONS_PATH = path.join(DATA_DIR, 'questions.json');
var BROADCAST_CONFIG_PATH = path.join(DATA_DIR, 'broadcast-config.json');
var ROOM_STATE_PATH = path.join(DATA_DIR, 'room-state.json');
var ANSWER_MIN_INTERVAL_MS = 300;

var questionBank = { title: '趣味常识挑战', quizzes: [] };

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

module.exports = {
    DATA_DIR: DATA_DIR,
    QUESTIONS_PATH: QUESTIONS_PATH,
    BROADCAST_CONFIG_PATH: BROADCAST_CONFIG_PATH,
    ROOM_STATE_PATH: ROOM_STATE_PATH,
    ANSWER_MIN_INTERVAL_MS: ANSWER_MIN_INTERVAL_MS,
    questionBank: questionBank,
    totalQuestionCount: totalQuestionCount
};
