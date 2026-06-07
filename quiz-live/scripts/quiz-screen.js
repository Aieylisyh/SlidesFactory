/**
 * Big-screen: online count, leaderboard, streak broadcast ticker.
 */
(function (global) {
    'use strict';

    function QuizScreenApp(root) {
        this.root = root;
        this.room = global.QuizProtocol.getRoomFromUrl();
        this.els = {
            title: root.querySelector('[data-screen-title]'),
            sub: root.querySelector('[data-screen-sub]'),
            counter: root.querySelector('[data-online-counter]'),
            leaderboard: root.querySelector('[data-leaderboard-body]')
        };

        this.broadcast = new global.QuizBroadcast(document.querySelector('[data-broadcast]'));

        if (!this.room) {
            root.innerHTML = '<p class="ql-screen">请在 URL 添加 ?room=房间码</p>';
            return;
        }

        var self = this;
        this.ws = new global.QuizWsClient({
            room: this.room,
            role: 'screen',
            onMessage: function (m) { self.onMessage(m); }
        });
    }

    QuizScreenApp.prototype.onMessage = function (msg) {
        if (msg.type === 'room_broadcast' || msg.type === 'streak_broadcast') {
            this.broadcast.enqueue(msg);
            return;
        }
        if (msg.type === 'state') {
            this.renderState(msg);
        }
    };

    QuizScreenApp.prototype.renderState = function (state) {
        if (this.els.title && state.title) this.els.title.textContent = state.title;

        var participants = state.participants || [];
        var online = participants.filter(function (p) { return p.online; });
        if (this.els.counter) {
            this.els.counter.textContent = online.length + ' / ' + participants.length;
        }

        this.renderLeaderboard(participants);
    };

    QuizScreenApp.prototype.renderLeaderboard = function (participants) {
        if (!this.els.leaderboard) return;
        var sorted = participants.slice().sort(function (a, b) {
            if (b.score !== a.score) return b.score - a.score;
            return (b.bestStreak || 0) - (a.bestStreak || 0);
        });
        if (!sorted.length) {
            this.els.leaderboard.innerHTML = '<tr><td colspan="4">等待观众加入…</td></tr>';
            return;
        }
        var html = sorted.map(function (p, i) {
            return '<tr class="' + (p.online ? '' : 'is-offline') + '">' +
                '<td>' + (p.name || '—') + '</td>' +
                '<td>' + (p.score || 0) + '</td>' +
                '<td>' + (p.streak || 0) + '</td>' +
                '<td>' + (p.bestStreak || 0) + '</td>' +
                '</tr>';
        }).join('');
        this.els.leaderboard.innerHTML = html;
    };

    global.QuizScreenApp = QuizScreenApp;

    document.addEventListener('DOMContentLoaded', function () {
        var root = document.querySelector('[data-quiz-screen]');
        if (root) new QuizScreenApp(root);
    });
})(window);
