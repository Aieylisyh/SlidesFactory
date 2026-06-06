/**
 * Host control panel: QR code, score & streak table, reset room.
 */
(function (global) {
    'use strict';

    function QuizAdminApp(root) {
        this.root = root;
        this.room = '';
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

        this.bind();

        var self = this;
        global.QuizProtocol.resolveRoomCode().then(function (room) {
            self.room = room;
            self.syncUrl();
            self.connect();
            self.renderQr();
        });
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
        if (global.QuizProtocol.isLocalHost(global.location.hostname)) {
            global.QuizProtocol.resolvePublicHost().then(function (host) {
                var answerUrl = global.QuizProtocol.buildAnswerUrl(self.room, host);
                if (self.els.answerUrl) self.els.answerUrl.textContent = answerUrl;
            });
            return;
        }
        var answerUrl = global.QuizProtocol.buildAnswerUrl(self.room);
        if (this.els.answerUrl) this.els.answerUrl.textContent = answerUrl;
    };

    QuizAdminApp.prototype.connect = function () {
        var self = this;
        this.ws = new global.QuizWsClient({
            room: this.room,
            role: 'admin',
            onMessage: function (m) { self.onMessage(m); }
        });
    };

    QuizAdminApp.prototype.bind = function () {
        var self = this;
        this.root.querySelectorAll('[data-admin-action]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var action = btn.getAttribute('data-admin-action');
                if (action === 'clear_all_data') {
                    if (!confirm('确定清除本房间全部选手数据？此操作不可撤销。')) return;
                }
                self.onAction(action);
            });
        });
        if (this.els.scoreBody) {
            this.els.scoreBody.addEventListener('click', function (e) {
                var btn = e.target.closest('[data-delete-participant]');
                if (!btn) return;
                self.onDeleteParticipant(btn.getAttribute('data-delete-participant'));
            });
        }
    };

    QuizAdminApp.prototype.onAction = function (action, extra) {
        this.ws.send(global.QuizProtocol.makeAdminAction(action, extra || {}));
    };

    QuizAdminApp.prototype.onDeleteParticipant = function (clientId) {
        if (!clientId || !this.state) return;
        var target = (this.state.participants || []).find(function (p) {
            return p.clientId === clientId;
        });
        if (!target) return;
        var label = target.name || ('编号 ' + target.id);
        if (!confirm('确定删除「' + label + '」的全部数据？')) return;
        this.onAction('delete_participant', { clientId: clientId });
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
                '<td>' + (p.online ? '在线' : '离线') + '</td>' +
                '<td><button type="button" class="ql-btn ql-btn--xs ql-btn--danger" data-delete-participant="' +
                (p.clientId || '') + '">删除</button></td></tr>';
        }).join('') || '<tr><td colspan="7">暂无参与者</td></tr>';
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

        function paintQr(url) {
            if (self.els.answerUrl) self.els.answerUrl.textContent = url;
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
        }

        if (global.QuizProtocol.isLocalHost(global.location.hostname)) {
            global.QuizProtocol.resolvePublicHost().then(function (host) {
                if (global.QuizProtocol.isLocalHost(host)) {
                    self.showQrWarn('未能获取局域网 IP，请重新运行 start-quiz-server.bat 启动。');
                    return;
                }
                paintQr(global.QuizProtocol.buildAnswerUrl(self.room, host));
            });
            return;
        }

        global.QuizProtocol.initWsRelayConfig().then(function () {
            paintQr(global.QuizProtocol.buildAnswerUrl(self.room));
        });
    };

    global.QuizAdminApp = QuizAdminApp;

    document.addEventListener('DOMContentLoaded', function () {
        var root = document.querySelector('[data-quiz-admin]');
        if (root) new QuizAdminApp(root);
    });
})(window);
