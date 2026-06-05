/**
 * Horizontal scrolling streak broadcast ticker (shared by answer & screen).
 */
(function (global) {
    'use strict';

    var STREAK_MESSAGES = {
        3: '{name} 正在大杀特杀！',
        6: '{name} 已经暴走，停不下来了！',
        10: '{name} 已经无人能敌！',
        15: '{name} 超神了！谁与争锋？！'
    };

    function formatStreakMessage(name, streak) {
        var tpl = STREAK_MESSAGES[streak] || '{name} 连对 ' + streak + ' 题！';
        return tpl.split('{name}').join(name || '某位选手');
    }

    function QuizBroadcast(root) {
        this.root = root;
        this.track = root ? root.querySelector('[data-broadcast-track]') : null;
        this.queue = [];
        this.playing = false;
    }

    QuizBroadcast.prototype.enqueue = function (payload) {
        if (!this.root || !this.track) return;
        var text = payload.message || formatStreakMessage(payload.name, payload.streak);
        this.queue.push(text);
        if (!this.playing) this.playNext();
    };

    QuizBroadcast.prototype.showIdle = function () {
        if (!this.track) return;
        this.track.textContent = '等待连杀广播…';
        this.track.className = 'ql-broadcast-track ql-broadcast-idle';
        this.track.style.animationDuration = '';
    };

    QuizBroadcast.prototype.playNext = function () {
        var self = this;
        if (!this.queue.length) {
            this.playing = false;
            this.showIdle();
            return;
        }
        this.playing = true;
        var text = this.queue.shift();
        this.track.textContent = text;
        this.track.className = 'ql-broadcast-track is-animating';
        void this.track.offsetWidth;
        var durationSec = Math.max(6, text.length * 0.18);
        this.track.style.animationDuration = durationSec + 's';
        clearTimeout(this._timer);
        this._timer = setTimeout(function () {
            self.playNext();
        }, durationSec * 1000 + 200);
    };

    global.QuizBroadcast = QuizBroadcast;
    global.QuizStreakMessages = {
        format: formatStreakMessage,
        tiers: [3, 6, 10, 15]
    };
})(typeof window !== 'undefined' ? window : global);
