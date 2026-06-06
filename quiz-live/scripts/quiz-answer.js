/**
 * Mobile audience: register → pick category → self-paced quiz with confirm submit.
 * Core constructor + shared helpers; WS/UI via quiz-answer-ws.js / quiz-answer-ui.js.
 */
(function (global) {
    'use strict';

    var STORAGE_KEY = 'quiz-live-client-id';
    var QUIZ_DRAW_COUNT = 10;

    function getClientId() {
        try {
            var id = localStorage.getItem(STORAGE_KEY);
            if (!id) {
                id = global.QuizProtocol.randomClientId();
                localStorage.setItem(STORAGE_KEY, id);
            }
            return id;
        } catch (e) {
            return global.QuizProtocol.randomClientId();
        }
    }

    function shuffle(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = a[i];
            a[i] = a[j];
            a[j] = tmp;
        }
        return a;
    }

    function parseOption(raw) {
        var m = String(raw).match(/^([A-D])\.\s*(.+)$/);
        if (m) return { key: m[1], text: m[2] };
        return { key: 'A', text: raw };
    }

    function normalizeQuestion(q) {
        var options = {};
        (q.options || []).forEach(function (opt) {
            var parsed = parseOption(opt);
            options[parsed.key] = parsed.text;
        });
        return {
            id: q.id,
            text: q.question,
            options: options,
            answer: q.answer
        };
    }

    function pickRandomQuestions(questions) {
        var pool = shuffle(questions || []);
        var n = Math.min(QUIZ_DRAW_COUNT, pool.length);
        return pool.slice(0, n).map(normalizeQuestion);
    }

    global.QuizAnswerCore = {
        QUIZ_DRAW_COUNT: QUIZ_DRAW_COUNT,
        pickRandomQuestions: pickRandomQuestions
    };

    function QuizAnswerApp(root) {
        this.root = root;
        this.room = global.QuizProtocol.getRoomFromUrl();
        this.clientId = getClientId();
        this.participantId = null;
        this.nickname = '';
        this.registerConfig = null;
        this.questionCategories = [];
        this.playerLevel = 3;
        this.player = null;
        this.currentCategory = null;
        this.questionQueue = [];
        this.currentIndex = 0;
        this.selectedChoice = null;
        this.submitted = false;
        this.deckTitle = '趣味常识挑战';
        this.wsWasConnected = false;
        this.activeView = 'register';
        this.participants = [];

        this.views = {
            register: root.querySelector('[data-view="register"]'),
            category: root.querySelector('[data-view="category"]'),
            leaderboard: root.querySelector('[data-view="leaderboard"]'),
            quiz: root.querySelector('[data-view="quiz"]')
        };

        this.els = {
            statusDot: root.querySelector('[data-status-dot]'),
            statusText: root.querySelector('[data-status-text]'),
            participantBadge: root.querySelector('[data-participant-id]'),
            title: root.querySelector('[data-quiz-title]'),
            form: root.querySelector('[data-register-form]'),
            continueBtn: root.querySelector('[data-continue-btn]'),
            reconnectBanner: root.querySelector('[data-reconnect-banner]'),
            categoryGrid: root.querySelector('[data-category-grid]'),
            leaderboardOpen: root.querySelector('[data-leaderboard-open]'),
            leaderboardBack: root.querySelector('[data-leaderboard-back]'),
            leaderboardBody: root.querySelector('[data-leaderboard-body]'),
            leaderboardOnline: root.querySelector('[data-leaderboard-online]'),
            progressFill: root.querySelector('[data-progress-fill]'),
            questionText: root.querySelector('[data-question-text]'),
            options: root.querySelector('[data-options]'),
            confirmBtn: root.querySelector('[data-confirm-btn]'),
            feedback: root.querySelector('[data-feedback]'),
            nextBtn: root.querySelector('[data-next-btn]'),
            floatBack: root.querySelector('[data-float-back]'),
            bankLoading: root.querySelector('[data-bank-loading]'),
            bankLoadingFill: root.querySelector('[data-bank-loading-fill]'),
            bankLoadingPct: root.querySelector('[data-bank-loading-pct]')
        };

        this.broadcast = new global.QuizBroadcast(root.querySelector('[data-broadcast]'));

        if (!this.room) {
            this.showFatal('缺少房间码，请扫描现场二维码或联系工作人员。');
            return;
        }

        this.bind();
        this.loadRegisterUi();
        this.loadQuestions();
        this.connect();
    }

    Object.assign(QuizAnswerApp.prototype, global.QuizAnswerWs);
    Object.assign(QuizAnswerApp.prototype, global.QuizAnswerUi);

    global.QuizAnswerApp = QuizAnswerApp;

    document.addEventListener('DOMContentLoaded', function () {
        var root = document.querySelector('[data-quiz-answer]');
        if (root) new QuizAnswerApp(root);
    });
})(window);
