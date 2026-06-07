/**
 * Host control panel: QR code, paginated user manager, reset room.
 */
(function (global) {
    'use strict';

    var PAGE_SIZE = 5;

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function QuizAdminApp(root) {
        this.root = root;
        this.room = '';
        this.state = null;
        this.roster = [];
        this.searchQuery = '';
        this.currentPage = 0;
        this.detailByClientId = Object.create(null);
        this.searchTimer = null;
        this.pendingDetailIds = null;

        this.els = {
            roomCode: root.querySelector('[data-room-code]'),
            qr: root.querySelector('[data-qr-canvas]'),
            qrWarn: root.querySelector('[data-qr-warn]'),
            answerUrl: root.querySelector('[data-answer-url]'),
            onlineCount: root.querySelector('[data-online-count]'),
            recentBroadcasts: root.querySelector('[data-recent-broadcasts]'),
            userStats: root.querySelector('[data-user-stats]'),
            userSearch: root.querySelector('[data-user-search]'),
            fetchUsers: root.querySelector('[data-fetch-users]'),
            userList: root.querySelector('[data-user-list]'),
            pagePrev: root.querySelector('[data-page-prev]'),
            pageNext: root.querySelector('[data-page-next]'),
            pageInfo: root.querySelector('[data-page-info]')
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
        var answerUrl = global.QuizProtocol.buildAnswerUrl(this.room);
        if (this.els.answerUrl) this.els.answerUrl.textContent = answerUrl;
    };

    QuizAdminApp.prototype.connect = function () {
        var self = this;
        this.ws = new global.QuizWsClient({
            room: this.room,
            role: 'admin',
            onStatus: function (status) {
                if (status === 'connected') self.fetchSummary(true);
            },
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

        if (this.els.fetchUsers) {
            this.els.fetchUsers.addEventListener('click', function () {
                self.fetchSummary(true);
            });
        }

        if (this.els.userSearch) {
            this.els.userSearch.addEventListener('input', function () {
                clearTimeout(self.searchTimer);
                self.searchTimer = setTimeout(function () {
                    self.searchQuery = self.els.userSearch.value;
                    self.currentPage = 0;
                    self.renderUserPage();
                }, 200);
            });
        }

        if (this.els.pagePrev) {
            this.els.pagePrev.addEventListener('click', function () {
                if (self.currentPage > 0) {
                    self.currentPage -= 1;
                    self.renderUserPage();
                }
            });
        }

        if (this.els.pageNext) {
            this.els.pageNext.addEventListener('click', function () {
                var totalPages = self.getTotalPages();
                if (self.currentPage < totalPages - 1) {
                    self.currentPage += 1;
                    self.renderUserPage();
                }
            });
        }

        if (this.els.userList) {
            this.els.userList.addEventListener('click', function (e) {
                var delBtn = e.target.closest('[data-delete-participant]');
                if (delBtn) {
                    self.onDeleteParticipant(delBtn.getAttribute('data-delete-participant'));
                    return;
                }
                var saveBtn = e.target.closest('[data-save-exp]');
                if (saveBtn) {
                    self.onSaveExp(saveBtn.getAttribute('data-save-exp'));
                }
            });
        }
    };

    QuizAdminApp.prototype.onAction = function (action, extra) {
        this.ws.send(global.QuizProtocol.makeAdminAction(action, extra || {}));
    };

    QuizAdminApp.prototype.fetchSummary = function (refreshDetail) {
        this.ws.send(global.QuizProtocol.makeRequestAdminSummary());
        if (refreshDetail) this.pendingDetailIds = 'page';
    };

    QuizAdminApp.prototype.fetchPageDetail = function (clientIds) {
        if (!clientIds.length) return;
        this.ws.send(global.QuizProtocol.makeRequestParticipantsDetail(clientIds));
    };

    QuizAdminApp.prototype.getFilteredRoster = function () {
        var q = this.searchQuery.trim();
        if (!q) return this.roster.slice();
        var re;
        try {
            re = new RegExp(q, 'i');
        } catch (e) {
            re = null;
        }
        return this.roster.filter(function (r) {
            var name = r.name || '';
            if (re) return re.test(name);
            return name.indexOf(q) !== -1;
        });
    };

    QuizAdminApp.prototype.getTotalPages = function () {
        var count = this.getFilteredRoster().length;
        return Math.max(1, Math.ceil(count / PAGE_SIZE));
    };

    QuizAdminApp.prototype.getPageClientIds = function () {
        var filtered = this.getFilteredRoster();
        var start = this.currentPage * PAGE_SIZE;
        return filtered.slice(start, start + PAGE_SIZE).map(function (r) { return r.clientId; });
    };

    QuizAdminApp.prototype.onDeleteParticipant = function (clientId) {
        if (!clientId) return;
        var detail = this.detailByClientId[clientId];
        var rosterItem = this.roster.find(function (r) { return r.clientId === clientId; });
        var label = (detail && detail.name) || (rosterItem && rosterItem.name) || clientId;
        if (!confirm('确定删除「' + label + '」的全部数据？')) return;
        delete this.detailByClientId[clientId];
        this.onAction('delete_participant', { clientId: clientId });
        this.roster = this.roster.filter(function (r) { return r.clientId !== clientId; });
        var totalPages = this.getTotalPages();
        if (this.currentPage >= totalPages) this.currentPage = Math.max(0, totalPages - 1);
        this.updateUserStats(this.roster.length, null);
        this.renderUserPage();
    };

    QuizAdminApp.prototype.onSaveExp = function (clientId) {
        if (!clientId || !this.els.userList) return;
        var input = this.els.userList.querySelector('[data-exp-input="' + clientId + '"]');
        if (!input) return;
        var totalExp = Math.max(0, Math.floor(Number(input.value) || 0));
        this.onAction('update_participant_exp', { clientId: clientId, total_exp: totalExp });
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

        if (msg.type === 'admin_summary') {
            this.roster = msg.roster || [];
            this.updateUserStats(msg.totalCount, msg.onlineCount);
            this.renderOnlineCount(msg.onlineCount);
            if (msg.recentBroadcasts) this.renderRecentBroadcasts(msg.recentBroadcasts);
            this.renderPagination();
            if (this.pendingDetailIds) {
                this.pendingDetailIds = null;
                this.renderUserPage();
            }
            return;
        }

        if (msg.type === 'participants_detail') {
            (msg.participants || []).forEach(function (p) {
                if (p && p.clientId) this.detailByClientId[p.clientId] = p;
            }, this);
            this.renderUserCards();
            return;
        }

        if (msg.type !== 'state') return;

        this.state = msg;
        this.renderOnlineCount(msg.onlineCount);
        this.renderRecentBroadcasts(msg.recentBroadcasts || []);
        if (!msg.participants || !msg.participants.length) {
            if (this.roster.length) {
                this.roster = [];
                this.detailByClientId = Object.create(null);
                this.currentPage = 0;
                this.updateUserStats(0, msg.onlineCount);
                this.renderUserPage();
                return;
            }
        }
        this.mergeLiveFromState(msg.participants || []);
    };

    QuizAdminApp.prototype.mergeLiveFromState = function (participants) {
        var visibleIds = this.getPageClientIds();
        if (!visibleIds.length) return;

        var liveMap = Object.create(null);
        participants.forEach(function (p) {
            if (p && p.clientId) liveMap[p.clientId] = p;
        });

        var changed = false;
        visibleIds.forEach(function (id) {
            var live = liveMap[id];
            var detail = this.detailByClientId[id];
            if (!live || !detail) return;
            if (detail.online !== live.online ||
                detail.score !== live.score ||
                detail.streak !== live.streak ||
                detail.bestStreak !== live.bestStreak) {
                detail.online = live.online;
                detail.score = live.score;
                detail.streak = live.streak;
                detail.bestStreak = live.bestStreak;
                if (live.player) detail.player = live.player;
                changed = true;
            }
        }, this);

        if (changed) this.renderUserCards();
    };

    QuizAdminApp.prototype.updateUserStats = function (total, online) {
        if (!this.els.userStats) return;
        var totalText = total == null ? '—' : String(total);
        var onlineText = online == null ? '—' : String(online);
        this.els.userStats.textContent = '共 ' + totalText + ' 人 · 在线 ' + onlineText + ' 人';
    };

    QuizAdminApp.prototype.renderUserPage = function () {
        var ids = this.getPageClientIds();
        this.renderPagination();
        if (!ids.length) {
            this.renderEmptyUsers();
            return;
        }
        this.renderUserCards();
        this.fetchPageDetail(ids);
    };

    QuizAdminApp.prototype.renderPagination = function () {
        var filtered = this.getFilteredRoster();
        var totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        if (this.currentPage >= totalPages) this.currentPage = Math.max(0, totalPages - 1);

        if (this.els.pageInfo) {
            if (!filtered.length) {
                this.els.pageInfo.textContent = '无匹配用户';
            } else {
                this.els.pageInfo.textContent = (this.currentPage + 1) + ' / ' + totalPages +
                    '（' + filtered.length + ' 人）';
            }
        }
        if (this.els.pagePrev) this.els.pagePrev.disabled = this.currentPage <= 0;
        if (this.els.pageNext) this.els.pageNext.disabled = this.currentPage >= totalPages - 1;
    };

    QuizAdminApp.prototype.renderEmptyUsers = function () {
        if (!this.els.userList) return;
        var msg = this.roster.length
            ? '没有匹配的用户'
            : '暂无用户，观众扫码注册后将出现在此';
        this.els.userList.innerHTML = '<p class="ql-admin-users-empty">' + escapeHtml(msg) + '</p>';
    };

    QuizAdminApp.prototype.renderUserCards = function () {
        if (!this.els.userList) return;
        var ids = this.getPageClientIds();
        if (!ids.length) {
            this.renderEmptyUsers();
            return;
        }
        var html = ids.map(function (id) {
            var p = this.detailByClientId[id];
            if (!p) {
                return '<article class="ql-admin-user-card is-loading">' +
                    '<p class="ql-admin-user-loading">加载中…</p></article>';
            }
            return this.buildUserCardHtml(p);
        }, this).join('');
        this.els.userList.innerHTML = html;
    };

    QuizAdminApp.prototype.buildUserCardHtml = function (p) {
        var player = p.player || {};
        var totalExp = player.total_exp != null ? player.total_exp : 0;
        var answeredCount = p.answeredQuestions ? Object.keys(p.answeredQuestions).length : 0;

        var fields = [
            { label: 'clientId', value: p.clientId },
            { label: '编号', value: p.id },
            { label: '昵称', value: p.name },
            { label: '手机', value: p.phone },
            { label: '得分', value: p.score || 0 },
            { label: '当前连胜', value: p.streak || 0 },
            { label: '最高连胜', value: p.bestStreak || 0 },
            { label: '本轮正确', value: p.roundCorrect || 0 },
            { label: '本轮连胜', value: p.roundStreak || 0 },
            { label: '本轮分类', value: p.roundCategory || '—' },
            { label: '首杀', value: p.roundHasFirstBlood ? '是' : '否' },
            { label: '已答题数', value: answeredCount },
            { label: 'user_id', value: player.user_id },
            { label: 'player.nickname', value: player.nickname },
            { label: 'player.phone', value: player.phone },
            { label: 'total_exp', value: player.total_exp },
            { label: 'total_correct', value: player.total_correct },
            { label: 'level', value: player.level },
            { label: 'created_at', value: player.created_at },
            { label: 'last_active', value: player.last_active }
        ];

        var fieldsHtml = fields.map(function (f) {
            return '<div class="ql-admin-user-field">' +
                '<span class="ql-admin-user-field-label">' + escapeHtml(f.label) + '</span>' +
                '<span class="ql-admin-user-field-value">' + escapeHtml(f.value == null ? '' : f.value) + '</span>' +
                '</div>';
        }).join('');

        var profileJson = JSON.stringify(p.profile || {}, null, 2);
        var categoryStatsJson = JSON.stringify(player.category_stats || {}, null, 2);
        var milestonesJson = JSON.stringify(p.roundMilestones || {}, null, 2);
        var answeredJson = JSON.stringify(p.answeredQuestions || {}, null, 2);

        return '<article class="ql-admin-user-card" data-client-id="' + escapeHtml(p.clientId) + '">' +
            '<header class="ql-admin-user-card-head">' +
            '<span class="ql-admin-user-id">#' + escapeHtml(p.id) + '</span>' +
            '<span class="ql-admin-user-name">' + escapeHtml(p.name || '—') + '</span>' +
            '<span class="ql-participant-status' + (p.online ? ' is-online' : '') + '">' +
            (p.online ? '在线' : '离线') + '</span>' +
            '</header>' +
            '<div class="ql-admin-user-fields">' + fieldsHtml + '</div>' +
            '<details class="ql-admin-user-json"><summary>profile</summary><pre>' + escapeHtml(profileJson) + '</pre></details>' +
            '<details class="ql-admin-user-json"><summary>category_stats</summary><pre>' + escapeHtml(categoryStatsJson) + '</pre></details>' +
            '<details class="ql-admin-user-json"><summary>roundMilestones</summary><pre>' + escapeHtml(milestonesJson) + '</pre></details>' +
            '<details class="ql-admin-user-json"><summary>answeredQuestions</summary><pre>' + escapeHtml(answeredJson) + '</pre></details>' +
            '<footer class="ql-admin-user-actions">' +
            '<label class="ql-admin-exp-edit">' +
            '<span>经验值</span>' +
            '<input type="number" min="0" step="1" class="ql-input ql-input--sm" data-exp-input="' +
            escapeHtml(p.clientId) + '" value="' + escapeHtml(totalExp) + '">' +
            '</label>' +
            '<button type="button" class="ql-btn ql-btn--xs" data-save-exp="' + escapeHtml(p.clientId) + '">保存经验</button>' +
            '<button type="button" class="ql-btn ql-btn--xs ql-btn--danger" data-delete-participant="' +
            escapeHtml(p.clientId) + '">删除</button>' +
            '</footer></article>';
    };

    QuizAdminApp.prototype.prependRecentBroadcast = function (entry) {
        var list = (this.state && this.state.recentBroadcasts) ? this.state.recentBroadcasts.slice() : [];
        list.unshift(entry);
        if (list.length > 3) list = list.slice(0, 3);
        if (this.state) this.state.recentBroadcasts = list;
        this.renderRecentBroadcasts(list);
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
                '<span class="ql-admin-broadcast-msg">' + escapeHtml(item.message || '') + '</span></li>';
        }).join('');
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
