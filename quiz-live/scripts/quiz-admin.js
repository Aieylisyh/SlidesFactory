/**
 * Host control panel: QR code, score & streak table, reset room.
 */
(function (global) {
    'use strict';

    function QuizAdminApp(root) {
        this.root = root;
        this.room = global.QuizProtocol.getRoomFromUrl() || global.QuizProtocol.randomRoomCode();
        this.state = null;

        this.els = {
            roomCode: root.querySelector('[data-room-code]'),
            qr: root.querySelector('[data-qr-canvas]'),
            qrWarn: root.querySelector('[data-qr-warn]'),
            answerUrl: root.querySelector('[data-answer-url]'),
            scoreBody: root.querySelector('[data-score-body]'),
            onlineCount: root.querySelector('[data-online-count]'),
            recentBroadcasts: root.querySelector('[data-recent-broadcasts]')
        };

        this.syncUrl();
        this.bind();
        this.connect();
        this.renderQr();
    }

    QuizAdminApp.prototype.syncUrl = function () {
        var url = new URL(global.location.href);
        if (url.searchParams.get('room') !== this.room) {
            url.searchParams.set('room', this.room);
            global.history.replaceState(null, '', url.toString());
        }
        if (this.els.roomCode) this.els.roomCode.textContent = this.room;
        this.updateAnswerUrl();
    };

    QuizAdminApp.prototype.updateAnswerUrl = function () {
        var self = this;
        global.QuizProtocol.resolvePublicHost().then(function (host) {
            var answerUrl = global.QuizProtocol.buildAnswerUrl(self.room, host);
            if (self.els.answerUrl) self.els.answerUrl.textContent = answerUrl;
        });
    };

    QuizAdminApp.prototype.connect = function () {
        var self = this;
        this.ws = new global.QuizWsClient({
            url: global.QuizProtocol.getWsUrl(),
            room: this.room,
            role: 'admin',
            onMessage: function (m) { self.onMessage(m); }
        });
    };

    QuizAdminApp.prototype.bind = function () {
        var self = this;
        this.root.querySelectorAll('[data-admin-action]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                self.onAction(btn.getAttribute('data-admin-action'));
            });
        });
    };

    QuizAdminApp.prototype.onAction = function (action) {
        this.ws.send(global.QuizProtocol.makeAdminAction(action, {}));
    };

    QuizAdminApp.prototype.onMessage = function (msg) {
        if (msg.type === 'room_broadcast') {
            this.prependRecentBroadcast({
                kind: msg.kind,
                name: msg.name,
                message: msg.message,
                at: Date.now()
            });
            return;
        }
        if (msg.type !== 'state') return;
        this.state = msg;
        this.render(msg);
    };

    QuizAdminApp.prototype.prependRecentBroadcast = function (entry) {
        var list = (this.state && this.state.recentBroadcasts) ? this.state.recentBroadcasts.slice() : [];
        list.unshift(entry);
        if (list.length > 3) list = list.slice(0, 3);
        if (this.state) this.state.recentBroadcasts = list;
        this.renderRecentBroadcasts(list);
    };

    QuizAdminApp.prototype.render = function (state) {
        this.renderScoreTable(state.participants || []);
        this.renderOnlineCount(state.onlineCount);
        this.renderRecentBroadcasts(state.recentBroadcasts || []);
    };

    QuizAdminApp.prototype.renderOnlineCount = function (count) {
        if (this.els.onlineCount) {
            this.els.onlineCount.textContent = String(count == null ? 0 : count);
        }
    };

    QuizAdminApp.prototype.renderRecentBroadcasts = function (items) {
        if (!this.els.recentBroadcasts) return;
        if (!items.length) {
            this.els.recentBroadcasts.innerHTML = '<li class="ql-admin-broadcasts-empty">暂无广播</li>';
            return;
        }
        this.els.recentBroadcasts.innerHTML = items.map(function (item) {
            var time = item.at ? new Date(item.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
            return '<li class="ql-admin-broadcast-item">' +
                '<span class="ql-admin-broadcast-time">' + time + '</span>' +
                '<span class="ql-admin-broadcast-msg">' + (item.message || '') + '</span></li>';
        }).join('');
    };

    QuizAdminApp.prototype.renderScoreTable = function (participants) {
        if (!this.els.scoreBody) return;
        var rows = participants.slice().sort(function (a, b) {
            return b.score - a.score || (b.bestStreak || 0) - (a.bestStreak || 0);
        });
        this.els.scoreBody.innerHTML = rows.map(function (p) {
            return '<tr class="' + (p.online ? '' : 'is-offline') + '">' +
                '<td>' + p.id + '</td>' +
                '<td>' + (p.name || '—') + '</td>' +
                '<td>' + (p.score || 0) + '</td>' +
                '<td>' + (p.streak || 0) + '</td>' +
                '<td>' + (p.bestStreak || 0) + '</td>' +
                '<td>' + (p.online ? '在线' : '离线') + '</td></tr>';
        }).join('') || '<tr><td colspan="6">暂无参与者</td></tr>';
    };

    QuizAdminApp.prototype.showQrWarn = function (text) {
        if (!this.els.qrWarn) return;
        this.els.qrWarn.textContent = text || '';
        this.els.qrWarn.classList.toggle('ql-hidden', !text);
    };

    QuizAdminApp.prototype.renderQr = function () {
        var self = this;
        var canvas = this.els.qr;
        if (!canvas) return;

        self.showQrWarn('');

        if (typeof global.QRCode === 'undefined') {
            self.showQrWarn('二维码库未加载，请使用下方链接手动打开。');
            return;
        }

        global.QuizProtocol.resolvePublicHost().then(function (host) {
            var url = global.QuizProtocol.buildAnswerUrl(self.room, host);
            if (self.els.answerUrl) self.els.answerUrl.textContent = url;

            if (global.QuizProtocol.isLocalHost(host)) {
                self.showQrWarn('未能获取局域网 IP，请重新运行 start-quiz-server.bat 启动。');
                return;
            }

            var result = global.QRCode.toCanvas(canvas, url, {
                width: 180,
                margin: 1,
                color: { dark: '#111111', light: '#ffffff' }
            });

            if (result && typeof result.then === 'function') {
                result.catch(function () {
                    self.showQrWarn('二维码生成失败，请复制下方链接到手机浏览器。');
                });
            }
        });
    };

    global.QuizAdminApp = QuizAdminApp;

    document.addEventListener('DOMContentLoaded', function () {
        var root = document.querySelector('[data-quiz-admin]');
        if (root) new QuizAdminApp(root);
    });
})(window);
