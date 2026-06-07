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

            if (!this.els.connIcon) return;

            var icon = this.els.connIcon;
            icon.classList.remove('is-online', 'is-offline', 'is-connecting');

            var labels = {
                connecting: '连接中',
                connected: '已连接',
                disconnected: '连接断开',
                error: '连接异常'
            };

            if (status === 'connected') {
                icon.classList.add('is-online');
            } else if (status === 'connecting') {
                icon.classList.add('is-connecting');
            } else {
                icon.classList.add('is-offline');
            }

            icon.setAttribute('aria-label', labels[status] || status);
        },

        ensureRegistered: function () {
            if (!this.ws || typeof global.QuizRegisterConfig === 'undefined') return;
            if (this.participantId) {
                this.tryRedeemVipShare();
                return;
            }
            var cached = global.QuizRegisterConfig.loadProfileCache();
            if (!cached || !cached.name) return;
            var cfg = this.registerConfig || global.QuizRegisterConfig.normalize(null);
            if (global.QuizRegisterConfig.validate(cached, cfg)) return;
            this.ws.send(global.QuizProtocol.makeRegister(this.clientId, cached));
        },

        tryRedeemVipShare: function () {
            if (!this.vipSharePending || !this.participantId || !this.ws) return;
            if (this.vipShareRedeemSent) return;
            this.vipShareRedeemSent = true;
            this.ws.send(global.QuizProtocol.makeRedeemVipShare(
                this.clientId,
                this.vipSharePending.categoryId,
                this.vipSharePending.token
            ));
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
                this.tryRedeemVipShare();
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
                if (this.activeView === 'register') {
                    this.showView('category');
                }
                this.updateContinueUi();
                this.tryRedeemVipShare();
                return;
            }

            if (msg.type === 'vip_share_redeemed') {
                if (msg.player) this.applyPlayer(msg.player);
                this.renderCategories();
                var vipName = msg.categoryName || msg.categoryId || '题库';
                this.showToast('已永久解锁「' + vipName + '」');
                this.vipSharePending = null;
                return;
            }

            if (msg.type === 'vip_share_error') {
                this.showToast(msg.message || 'VIP 链接无法使用');
                this.vipSharePending = null;
                return;
            }

            if (msg.type === 'category_locked') {
                this.showToast('当前无法进入该题库');
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

            if (msg.type === 'answer_ack') {
                this.onAnswerAck(msg);
                return;
            }

            if (msg.type === 'state') {
                if (msg.title) this.deckTitle = msg.title;
                if (Array.isArray(msg.questionCategories) && msg.questionCategories.length) {
                    this.questionCategories = msg.questionCategories;
                    if (typeof global.QuizAnswerQuestions !== 'undefined') {
                        global.QuizAnswerQuestions.prefetchBanks(msg.questionCategories);
                    }
                }
                this.participants = msg.participants || [];
                this.syncHeaderTitle();
                if (this.activeView === 'leaderboard') {
                    this.refreshLeaderboardView(this.participants, msg.onlineCount);
                }
                this.syncSelfFromParticipants(this.participants);
            }
        }
    };
})(window);
