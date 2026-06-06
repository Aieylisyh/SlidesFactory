/**
 * quiz-answer WebSocket layer — connection, registration sync, inbound messages.
 */
(function (global) {
    'use strict';

    global.QuizAnswerWs = {
        connect: function () {
            var self = this;
            this.ws = new global.QuizWsClient({
                room: this.room,
                role: 'audience',
                clientId: this.clientId,
                onStatus: function (s) { self.onWsStatus(s); },
                onReconnect: function () { self.onWsReconnected(); },
                onMessage: function (m) { self.onMessage(m); }
            });
        },

        setReconnectBanner: function (visible) {
            if (!this.els.reconnectBanner) return;
            this.els.reconnectBanner.classList.toggle('ql-hidden', !visible);
        },

        onWsReconnected: function () {
            this.setReconnectBanner(false);
        },

        onWsStatus: function (status) {
            if (status === 'connected') {
                this.wsWasConnected = true;
                this.setReconnectBanner(false);
                this.ensureRegistered();
            } else if (this.wsWasConnected && (status === 'connecting' || status === 'disconnected' || status === 'error')) {
                this.setReconnectBanner(true);
            }

            if (!this.els.statusDot) return;

            this.els.statusDot.classList.toggle('is-online', status === 'connected');

            var labels = {
                connecting: '连接中…',
                connected: '已连接',
                disconnected: '连接断开，重试中…',
                error: '连接异常'
            };

            if (this.els.statusText) {
                this.els.statusText.textContent = labels[status] || status;
            }
        },

        ensureRegistered: function () {
            if (!this.ws || typeof global.QuizRegisterConfig === 'undefined') return;
            var cached = global.QuizRegisterConfig.loadProfileCache();
            if (!cached || !cached.name) return;
            var cfg = this.registerConfig || global.QuizRegisterConfig.normalize(null);
            if (global.QuizRegisterConfig.validate(cached, cfg)) return;
            this.ws.send(global.QuizProtocol.makeRegister(this.clientId, cached));
        },

        syncSelfFromParticipants: function (participants) {
            var me = (participants || []).find(function (p) {
                return p.clientId === this.clientId;
            }, this);
            if (me) {
                this.participantId = me.id;
                this.nickname = me.name || '';
                if (me.player) this.applyPlayer(me.player);
                if (this.els.participantBadge) {
                    var levelLabel = this.playerLevel ? (' · Lv.' + this.playerLevel) : '';
                    this.els.participantBadge.textContent = (this.nickname || ('编号 ' + me.id)) + levelLabel;
                }
                if (this.activeView === 'register') {
                    this.renderCategories();
                    this.showView('category');
                }
                this.updateContinueUi();
                return true;
            }
            if (this.participantId) {
                this.participantId = null;
                this.nickname = '';
                if (this.els.participantBadge) {
                    this.els.participantBadge.textContent = '未登记';
                }
                this.ensureRegistered();
            }
            return false;
        },

        resetParticipantSession: function () {
            this.participantId = null;
            this.nickname = '';
            this.player = null;
            this.playerLevel = 3;
            this.currentCategory = null;
            this.questionQueue = [];
            this.currentIndex = 0;
            if (this.els.participantBadge) {
                this.els.participantBadge.textContent = '未登记';
            }
            this.showView('register');
            this.updateContinueUi();
        },

        onBroadcast: function (msg) {
            this.broadcast.enqueue(msg);
        },

        onMessage: function (msg) {
            if (msg.type === 'registered') {
                this.participantId = msg.participantId;
                this.nickname = msg.name || '';
                if (msg.player) this.applyPlayer(msg.player);
                if (this.els.participantBadge) {
                    var levelLabel = this.playerLevel ? (' · Lv.' + this.playerLevel) : '';
                    this.els.participantBadge.textContent = (this.nickname || ('编号 ' + msg.participantId)) + levelLabel;
                }
                this.renderCategories();
                this.showView('category');
                this.updateContinueUi();
                return;
            }

            if (msg.type === 'register_error') {
                alert(msg.message || '登记失败');
                return;
            }

            if (msg.type === 'participant_cleared') {
                this.resetParticipantSession();
                return;
            }

            if (msg.type === 'room_broadcast' || msg.type === 'streak_broadcast') {
                this.onBroadcast(msg);
                return;
            }

            if (msg.type === 'state') {
                if (msg.title) this.deckTitle = msg.title;
                if (Array.isArray(msg.questionCategories) && msg.questionCategories.length) {
                    this.questionCategories = msg.questionCategories;
                }
                this.participants = msg.participants || [];
                this.syncHeaderTitle();
                if (this.activeView === 'leaderboard') {
                    this.renderLeaderboard(this.participants, msg.onlineCount);
                }
                this.syncSelfFromParticipants(this.participants);
            }
        }
    };
})(window);
