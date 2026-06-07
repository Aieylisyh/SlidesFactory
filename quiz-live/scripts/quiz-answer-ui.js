/**
 * quiz-answer UI layer — views, forms, quiz flow, leaderboard.
 */
(function (global) {
    'use strict';

    global.QuizAnswerUi = {
        showFatal: function (msg) {
            this.root.innerHTML = '<div class="ql-main"><div class="ql-panel"><p>' + msg + '</p></div></div>';
        },

        bind: function () {
            var self = this;
            if (this.els.form) {
                this.els.form.addEventListener('submit', function (e) {
                    e.preventDefault();
                    self.onRegister();
                });
            }
            if (this.els.continueBtn) {
                this.els.continueBtn.addEventListener('click', function () {
                    self.onContinue();
                });
            }
            if (this.els.confirmBtn) {
                this.els.confirmBtn.addEventListener('click', function () {
                    self.onConfirm();
                });
            }
            if (this.els.nextBtn) {
                this.els.nextBtn.addEventListener('click', function () {
                    self.onNext();
                });
            }
            if (this.els.floatBack) {
                this.els.floatBack.addEventListener('click', function () {
                    self.onFloatBack();
                });
            }
            if (this.els.leaderboardOpen) {
                this.els.leaderboardOpen.addEventListener('click', function () {
                    self.onOpenLeaderboard();
                });
            }
            if (this.els.leaderboardBack) {
                this.els.leaderboardBack.addEventListener('click', function () {
                    self.onLeaderboardBack();
                });
            }
            if (this.els.prepareStart) {
                this.els.prepareStart.addEventListener('click', function () {
                    self.onPrepareStart();
                });
            }
            if (this.els.prepareBack) {
                this.els.prepareBack.addEventListener('click', function () {
                    self.onPrepareBack();
                });
            }
            if (this.els.categoryLeaderboardOpen) {
                this.els.categoryLeaderboardOpen.addEventListener('click', function () {
                    self.onOpenCategoryLeaderboard();
                });
            }
            if (this.els.roundSummaryClose) {
                this.els.roundSummaryClose.addEventListener('click', function () {
                    self.closeRoundSummary();
                });
            }
        },

        loadRegisterUi: function () {
            var self = this;
            var panel = this.views.register;
            if (!panel || typeof global.QuizRegisterConfig === 'undefined') return;

            self.registerConfig = global.QuizRegisterConfig.normalize(null);
            global.QuizRegisterConfig.renderForm(panel, self.registerConfig);
            global.QuizRegisterConfig.applyCachedProfile(self.els.form, self.registerConfig);
            self.updateContinueUi();

            global.QuizRegisterConfig.load()
                .then(function (config) {
                    self.registerConfig = config;
                    global.QuizRegisterConfig.renderForm(panel, config);
                    global.QuizRegisterConfig.applyCachedProfile(self.els.form, config);
                    self.updateContinueUi();
                });
        },

        updateContinueUi: function () {
            var btn = this.els.continueBtn;
            if (!btn || typeof global.QuizRegisterConfig === 'undefined') return;
            var cached = global.QuizRegisterConfig.loadProfileCache();
            var name = cached && cached.name;
            if (name && !this.participantId) {
                btn.textContent = '以 ' + name + ' 继续';
                btn.classList.remove('ql-hidden');
            } else {
                btn.classList.add('ql-hidden');
            }
        },

        onContinue: function () {
            if (typeof global.QuizRegisterConfig === 'undefined') return;
            var cached = global.QuizRegisterConfig.loadProfileCache();
            if (!cached || !cached.name) return;
            var cfg = this.registerConfig || global.QuizRegisterConfig.normalize(null);
            var err = global.QuizRegisterConfig.validate(cached, cfg);
            if (err) {
                alert(err);
                return;
            }
            global.QuizRegisterConfig.saveProfileCache(cached);
            this.ws.send(global.QuizProtocol.makeRegister(this.clientId, cached));
        },

        loadQuestions: function () {
            var self = this;
            if (typeof global.QuizAnswerQuestions === 'undefined') return;
            global.QuizAnswerQuestions.fetchCfg()
                .then(function (list) {
                    if (list.length) self.questionCategories = list;
                    self.syncHeaderTitle();
                    if (self.participantId) self.renderCategories();
                });
        },

        waitForBankLoad: function (loadPromise) {
            var self = this;
            var overlay = this.els.bankLoading;
            var fill = this.els.bankLoadingFill;
            var pctEl = this.els.bankLoadingPct;

            if (!overlay) return loadPromise;

            overlay.classList.remove('ql-hidden');
            overlay.setAttribute('aria-hidden', 'false');

            var fakeMax = 90;
            var fakeDuration = 2000;
            var start = Date.now();
            var tickId = setInterval(function () {
                var elapsed = Date.now() - start;
                var p = Math.min(fakeMax, (elapsed / fakeDuration) * fakeMax);
                if (fill) fill.style.width = p + '%';
                if (pctEl) pctEl.textContent = Math.round(p) + '%';
            }, 40);

            return loadPromise.then(function (result) {
                clearInterval(tickId);
                if (fill) fill.style.width = '100%';
                if (pctEl) pctEl.textContent = '100%';
                return new Promise(function (resolve) {
                    setTimeout(function () {
                        overlay.classList.add('ql-hidden');
                        overlay.setAttribute('aria-hidden', 'true');
                        if (fill) fill.style.width = '0%';
                        if (pctEl) pctEl.textContent = '0%';
                        resolve(result);
                    }, 220);
                });
            }).catch(function (err) {
                clearInterval(tickId);
                overlay.classList.add('ql-hidden');
                overlay.setAttribute('aria-hidden', 'true');
                if (fill) fill.style.width = '0%';
                if (pctEl) pctEl.textContent = '0%';
                throw err;
            });
        },

        showCategoryPrepare: function (categoryId, questions) {
            if (!questions || !questions.length) return;
            this.pendingCategoryId = categoryId;
            this.pendingQuestions = questions;
            var cat = this.questionCategories.find(function (c) { return c.id === categoryId; });
            if (this.els.prepareCategory) {
                this.els.prepareCategory.textContent = cat ? (cat.displayName || cat.id) : categoryId;
            }
            if (this.els.categoryLeaderboardOpen) {
                this.els.categoryLeaderboardOpen.textContent = this.getCategoryLeaderboardTitle(categoryId);
            }
            this.showView('prepare');
        },

        onPrepareStart: function () {
            if (!this.pendingCategoryId || !this.pendingQuestions) return;
            var categoryId = this.pendingCategoryId;
            var questions = this.pendingQuestions;
            this.pendingCategoryId = null;
            this.pendingQuestions = null;
            this.beginCategoryQuiz(categoryId, questions);
        },

        onPrepareBack: function () {
            this.pendingCategoryId = null;
            this.pendingQuestions = null;
            this.showView('category');
        },

        beginCategoryQuiz: function (categoryId, questions) {
            if (!questions || !questions.length) return;
            this.currentCategory = categoryId;
            this.questionQueue = global.QuizAnswerCore.pickRandomQuestions(questions);
            this.currentIndex = 0;
            this.roundExpGained = 0;
            this.pendingRoundSummary = false;
            if (this.ws) {
                this.ws.send(global.QuizProtocol.makeRoundStart(categoryId, this.clientId));
            }
            this.showView('quiz');
            this.resetProgressMarkers();
            this.renderCurrentQuestion();
        },

        applyPlayer: function (player) {
            if (!player) return;
            this.player = player;
            this.playerLevel = Number(player.level) || 3;
            this.nickname = player.nickname || this.nickname;
            if (this.player.total_exp == null) this.player.total_exp = 0;
            if (this.player.total_correct == null) this.player.total_correct = 0;
            if (!this.player.category_stats) this.player.category_stats = {};
        },

        onAnswerAck: function (msg) {
            if (!this.player) this.player = {};
            if (msg.total_exp != null) this.player.total_exp = msg.total_exp;
            if (msg.total_correct != null) this.player.total_correct = msg.total_correct;
            if (msg.categoryId && msg.categoryStats) {
                if (!this.player.category_stats) this.player.category_stats = {};
                this.player.category_stats[msg.categoryId] = {
                    answered: msg.categoryStats.answered || 0,
                    correct: msg.categoryStats.correct || 0
                };
            }
            if (msg.expGained) this.roundExpGained = (this.roundExpGained || 0) + msg.expGained;

            if (msg.correct && this.lastCorrectOptionKey) {
                this.playCorrectOptionFxFromAck(msg.roundCorrect);
            }

            if (this.pendingRoundSummary) {
                this.pendingRoundSummary = false;
                this.showRoundSummary({
                    roundCorrect: msg.roundCorrect != null ? msg.roundCorrect : 0,
                    roundTotal: this.questionQueue.length,
                    totalCorrect: msg.total_correct || 0,
                    expGained: this.roundExpGained || 0,
                    totalExp: msg.total_exp || 0,
                    categoryId: msg.categoryId || this.currentCategory,
                    categoryAccuracy: msg.categoryStats ? msg.categoryStats.accuracy : 0
                });
            }
        },

        clearCorrectOptionFx: function () {
            if (!this.els.options) return;
            this.els.options.querySelectorAll('.ql-option-burst').forEach(function (el) {
                el.remove();
            });
            this.els.options.querySelectorAll('.ql-option.has-correct-fx').forEach(function (btn) {
                btn.classList.remove('has-correct-fx');
            });
        },

        playCorrectOptionFx: function (choiceKey, level) {
            if (!this.els.options || !choiceKey) return;
            var btn = this.els.options.querySelector('[data-choice="' + choiceKey + '"]');
            if (!btn) return;

            this.clearCorrectOptionFx();

            var isMilestone = level === 'milestone';
            var ringCount = isMilestone ? 3 : 2;
            var duration = isMilestone ? 1400 : 950;
            btn.classList.add('has-correct-fx');

            for (var i = 0; i < ringCount; i++) {
                var burst = document.createElement('span');
                burst.className = 'ql-option-burst' + (isMilestone ? ' ql-option-burst--milestone' : '');
                burst.style.animationDelay = (i * 0.14) + 's';
                btn.appendChild(burst);
                (function (node, parent) {
                    node.addEventListener('animationend', function () {
                        node.remove();
                        if (!parent.querySelector('.ql-option-burst')) {
                            parent.classList.remove('has-correct-fx');
                        }
                    });
                })(burst, btn);
            }

            clearTimeout(this._correctFxTimer);
            this._correctFxTimer = setTimeout(function () {
                btn.classList.remove('has-correct-fx');
            }, duration + ringCount * 140);
        },

        playCorrectOptionFxFromAck: function (roundCorrect) {
            var self = this;
            var key = this.lastCorrectOptionKey;
            if (!key) return;

            if (typeof global.QuizBroadcastConfig === 'undefined') {
                this.playCorrectOptionFx(key, 'normal');
                return;
            }

            global.QuizBroadcastConfig.load().then(function (cfg) {
                var isMilestone = global.QuizBroadcastConfig.isWinTier(roundCorrect, cfg);
                self.playCorrectOptionFx(key, isMilestone ? 'milestone' : 'normal');
            }).catch(function () {
                self.playCorrectOptionFx(key, 'normal');
            });
        },

        showRoundSummary: function (data) {
            var cat = this.questionCategories.find(function (c) {
                return c.id === data.categoryId;
            });
            var catName = cat ? (cat.displayName || cat.id) : (data.categoryId || '该');

            if (this.els.roundSummaryScore) {
                this.els.roundSummaryScore.textContent =
                    '回答正确 ' + data.roundCorrect + '/' + data.roundTotal;
            }
            if (this.els.roundTotalCorrect) {
                this.els.roundTotalCorrect.textContent = String(data.totalCorrect);
            }
            if (this.els.roundExpGained) {
                this.els.roundExpGained.textContent = '+' + data.expGained;
            }
            if (this.els.roundTotalExp) {
                this.els.roundTotalExp.textContent = String(data.totalExp);
            }
            if (this.els.roundCategoryAccuracy) {
                this.els.roundCategoryAccuracy.textContent =
                    '您在' + catName + '类别的回答正确率为 ' + (data.categoryAccuracy || 0) + '%';
            }
            if (this.els.roundSummary) {
                this.els.roundSummary.classList.remove('ql-hidden');
                this.els.roundSummary.setAttribute('aria-hidden', 'false');
            }
        },

        closeRoundSummary: function () {
            if (this.els.roundSummary) {
                this.els.roundSummary.classList.add('ql-hidden');
                this.els.roundSummary.setAttribute('aria-hidden', 'true');
            }
            this.currentCategory = null;
            this.questionQueue = [];
            this.currentIndex = 0;
            this.roundExpGained = 0;
            this.pendingRoundSummary = false;
            this.showView('category');
        },

        onRegister: function () {
            var form = this.els.form;
            if (!form) return;

            var cfg = this.registerConfig || global.QuizRegisterConfig.normalize(null);
            var profile = global.QuizRegisterConfig.collectProfile(form, cfg);
            var err = global.QuizRegisterConfig.validate(profile, cfg);
            if (err) {
                alert(err);
                return;
            }

            global.QuizRegisterConfig.saveProfileCache(profile);
            this.ws.send(global.QuizProtocol.makeRegister(this.clientId, profile));
        },

        renderLeaderboardHead: function (mode) {
            if (!this.els.leaderboardHead) return;
            if (mode === 'category') {
                this.els.leaderboardHead.innerHTML =
                    '<tr><th>编号</th><th>昵称</th><th>答对</th><th>正确率</th></tr>';
                return;
            }
            this.els.leaderboardHead.innerHTML =
                '<tr><th>编号</th><th>昵称</th><th>得分</th><th>当前连胜</th><th>最高连胜</th><th>状态</th></tr>';
        },

        getParticipantCategoryStats: function (participant, categoryId) {
            var stats = participant.player &&
                participant.player.category_stats &&
                participant.player.category_stats[categoryId];
            var answered = (stats && stats.answered) || 0;
            var correct = (stats && stats.correct) || 0;
            var accuracy = answered ? Math.round((correct / answered) * 100) : 0;
            return { answered: answered, correct: correct, accuracy: accuracy };
        },

        renderLeaderboard: function (participants, onlineCount) {
            this.renderLeaderboardHead('global');
            if (this.els.leaderboardTitle) {
                this.els.leaderboardTitle.textContent = '排行榜';
            }
            if (this.els.leaderboardOnline && this.els.leaderboardOnline.parentElement) {
                this.els.leaderboardOnline.parentElement.classList.remove('ql-hidden');
            }
            if (this.els.leaderboardOnline) {
                var online = onlineCount;
                if (online == null) {
                    online = (participants || []).filter(function (p) { return p.online; }).length;
                }
                this.els.leaderboardOnline.textContent = String(online);
            }
            if (!this.els.leaderboardBody) return;
            var rows = (participants || []).slice().sort(function (a, b) {
                return b.score - a.score || (b.bestStreak || 0) - (a.bestStreak || 0);
            });
            this.els.leaderboardBody.innerHTML = rows.map(function (p) {
                return '<tr class="' + (p.online ? '' : 'is-offline') + '">' +
                    '<td>' + p.id + '</td>' +
                    '<td>' + (p.name || '—') + '</td>' +
                    '<td>' + (p.score || 0) + '</td>' +
                    '<td>' + (p.streak || 0) + '</td>' +
                    '<td>' + (p.bestStreak || 0) + '</td>' +
                    '<td>' + (p.online ? '在线' : '离线') + '</td></tr>';
            }).join('') || '<tr><td colspan="6">暂无参与者</td></tr>';
        },

        renderCategoryLeaderboard: function (participants, categoryId) {
            var self = this;
            this.renderLeaderboardHead('category');
            if (this.els.leaderboardTitle) {
                this.els.leaderboardTitle.textContent = this.getCategoryLeaderboardTitle(categoryId);
            }
            if (this.els.leaderboardOnline && this.els.leaderboardOnline.parentElement) {
                this.els.leaderboardOnline.parentElement.classList.add('ql-hidden');
            }
            if (!this.els.leaderboardBody) return;
            var rows = (participants || []).slice().sort(function (a, b) {
                var sa = self.getParticipantCategoryStats(a, categoryId);
                var sb = self.getParticipantCategoryStats(b, categoryId);
                return sb.correct - sa.correct || sb.accuracy - sa.accuracy;
            });
            this.els.leaderboardBody.innerHTML = rows.map(function (p) {
                var s = self.getParticipantCategoryStats(p, categoryId);
                return '<tr>' +
                    '<td>' + p.id + '</td>' +
                    '<td>' + (p.name || '—') + '</td>' +
                    '<td>' + s.correct + '</td>' +
                    '<td>' + (s.answered ? s.accuracy + '%' : '—') + '</td></tr>';
            }).join('') || '<tr><td colspan="4">暂无参与者</td></tr>';
        },

        refreshLeaderboardView: function (participants, onlineCount) {
            if (this.leaderboardMode === 'category' && this.pendingCategoryId) {
                this.renderCategoryLeaderboard(participants, this.pendingCategoryId);
                return;
            }
            this.renderLeaderboard(participants, onlineCount);
        },

        onOpenLeaderboard: function () {
            this.leaderboardMode = 'global';
            this.leaderboardReturnView = 'category';
            this.showView('leaderboard');
            this.ensureRegistered();
            this.renderLeaderboard(this.participants);
            if (this.ws) {
                this.ws.send(global.QuizProtocol.makeRequestState());
            }
        },

        onOpenCategoryLeaderboard: function () {
            if (!this.pendingCategoryId) return;
            this.leaderboardMode = 'category';
            this.leaderboardReturnView = 'prepare';
            this.showView('leaderboard');
            this.renderCategoryLeaderboard(this.participants, this.pendingCategoryId);
            if (this.ws) {
                this.ws.send(global.QuizProtocol.makeRequestState());
            }
        },

        onLeaderboardBack: function () {
            this.showView(this.leaderboardReturnView || 'category');
        },

        getCategoryMeta: function (cat) {
            return {
                short: cat.displayName || cat.id,
                theme: cat.id || 'default'
            };
        },

        findNextLockedCategory: function (level) {
            var locked = (this.questionCategories || []).filter(function (cat) {
                return (cat.required_level || 1) > level;
            });
            if (!locked.length) return null;
            locked.sort(function (a, b) {
                return (a.required_level || 1) - (b.required_level || 1);
            });
            return locked[0];
        },

        buildLockedCategoryButton: function (cat) {
            var meta = this.getCategoryMeta(cat);
            var reqLevel = cat.required_level || 1;
            return '<button type="button" class="ql-category-btn ql-category-btn--locked ql-category-btn--' +
                (meta.theme || 'default') + '" data-category-locked="' + cat.id + '">' +
                '<span class="ql-category-name">' + meta.short + '</span>' +
                '<span class="ql-category-lock-hint">需要等级 ' + reqLevel + '</span></button>';
        },

        showToast: function (message) {
            var toast = this.els.toast;
            if (!toast) return;
            toast.textContent = message;
            toast.classList.remove('ql-hidden');
            toast.classList.add('is-visible');
            clearTimeout(this._toastTimer);
            var self = this;
            this._toastTimer = setTimeout(function () {
                toast.classList.remove('is-visible');
                toast.classList.add('ql-hidden');
            }, 2200);
        },

        renderCategories: function () {
            if (!this.els.categoryGrid) return;

            var self = this;
            var html = '';
            var level = this.playerLevel || 3;

            this.questionCategories
                .filter(function (cat) {
                    return (cat.required_level || 1) <= level;
                })
                .forEach(function (cat) {
                    var meta = self.getCategoryMeta(cat);
                    var theme = meta.theme || 'default';
                    html += '<button type="button" class="ql-category-btn ql-category-btn--' + theme + '" data-category="' + cat.id + '">' +
                        '<span class="ql-category-name">' + meta.short + '</span></button>';
                });

            var nextLocked = this.findNextLockedCategory(level);
            if (nextLocked) {
                html += this.buildLockedCategoryButton(nextLocked);
            }

            if (!html) {
                html = '<p class="ql-empty-hint">当前等级暂无可用题库，请稍后再试。</p>';
            }

            this.els.categoryGrid.innerHTML = html;

            this.els.categoryGrid.querySelectorAll('[data-category]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    self.startCategory(btn.getAttribute('data-category'));
                });
            });

            this.els.categoryGrid.querySelectorAll('[data-category-locked]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    self.showToast('当前等级不够，无法解锁');
                });
            });
        },

        getCategoryTitle: function (categoryId) {
            var id = categoryId || this.currentCategory || this.pendingCategoryId;
            if (!id) return this.deckTitle;
            var cat = this.questionCategories.find(function (c) { return c.id === id; }, this);
            return cat ? (cat.displayName || cat.id) : id;
        },

        getCategoryLeaderboardTitle: function (categoryId) {
            return this.getCategoryTitle(categoryId) + '·排行榜';
        },

        syncHeaderTitle: function () {
            if (!this.els.title) return;
            if (this.activeView === 'leaderboard') {
                this.els.title.textContent = this.leaderboardMode === 'category'
                    ? this.getCategoryLeaderboardTitle(this.pendingCategoryId)
                    : '排行榜';
                return;
            }
            if (this.activeView === 'prepare' && this.pendingCategoryId) {
                this.els.title.textContent = this.getCategoryTitle();
                return;
            }
            var inQuiz = this.activeView === 'quiz' && this.currentCategory;
            this.els.title.textContent = inQuiz ? this.getCategoryTitle() : this.deckTitle;
        },

        startCategory: function (categoryId) {
            var self = this;
            var cat = this.questionCategories.find(function (c) { return c.id === categoryId; });
            if (!cat) return;
            if ((cat.required_level || 1) > (this.playerLevel || 3)) {
                alert('等级不足，无法进入该题库');
                return;
            }

            if (typeof global.QuizAnswerQuestions === 'undefined') {
                alert('题库加载失败，请稍后重试');
                return;
            }

            var cached = global.QuizAnswerQuestions.getCachedBank(categoryId);
            if (cached && cached.length) {
                this.showCategoryPrepare(categoryId, cached);
                return;
            }

            var loadPromise = global.QuizAnswerQuestions.fetchBank(categoryId);
            this.waitForBankLoad(loadPromise)
                .then(function (questions) {
                    self.showCategoryPrepare(categoryId, questions);
                })
                .catch(function () {
                    alert('题库加载失败，请稍后重试');
                });
        },

        updateProgress: function (completed) {
            if (!this.els.progressFill) return;
            var total = this.questionQueue.length || 1;
            var done = Math.max(0, Math.min(completed, total));
            this.els.progressFill.style.width = Math.round((done / total) * 100) + '%';
        },

        resetProgressMarkers: function () {
            if (this.els.progressMarkers) {
                this.els.progressMarkers.innerHTML = '';
            }
        },

        addProgressMark: function (questionIndex, correct) {
            if (!this.els.progressMarkers) return;
            var total = this.questionQueue.length || 1;
            var left = ((questionIndex + 0.5) / total) * 100;
            var mark = document.createElement('span');
            mark.className = 'ql-progress-mark ' + (correct ? 'is-correct' : 'is-wrong');
            mark.style.left = left + '%';
            mark.textContent = correct ? '✓' : '✕';
            this.els.progressMarkers.appendChild(mark);
        },

        renderCurrentQuestion: function () {
            var q = this.questionQueue[this.currentIndex];
            if (!q) return;

            this.selectedChoice = null;
            this.submitted = false;
            this.lastCorrectOptionKey = null;
            this.clearCorrectOptionFx();
            var total = this.questionQueue.length;

            this.updateProgress(this.currentIndex);
            if (this.els.questionText) this.els.questionText.textContent = q.text;

            if (this.els.feedback) {
                this.els.feedback.classList.add('ql-hidden');
                this.els.feedback.textContent = '';
                this.els.feedback.className = 'ql-feedback ql-hidden';
            }

            if (this.els.confirmBtn) {
                this.els.confirmBtn.classList.remove('ql-hidden');
                this.els.confirmBtn.disabled = true;
            }

            if (this.els.nextBtn) {
                this.els.nextBtn.classList.add('ql-hidden');
                this.els.nextBtn.textContent = this.currentIndex >= total - 1 ? '返回' : '下一题';
            }

            var self = this;
            var html = '';
            ['A', 'B', 'C', 'D'].forEach(function (key) {
                if (!q.options[key]) return;
                html += '<button type="button" class="ql-option" data-choice="' + key + '">' +
                    '<span class="ql-option-key">' + key + '</span>' +
                    '<span>' + q.options[key] + '</span></button>';
            });

            this.els.options.innerHTML = html;
            this.els.options.querySelectorAll('[data-choice]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    if (self.submitted) return;
                    self.onSelect(btn.getAttribute('data-choice'));
                });
            });
        },

        onSelect: function (choice) {
            this.selectedChoice = choice;
            this.els.options.querySelectorAll('[data-choice]').forEach(function (btn) {
                btn.classList.toggle('is-selected', btn.getAttribute('data-choice') === choice);
            });
            if (this.els.confirmBtn) {
                this.els.confirmBtn.disabled = false;
            }
        },

        onConfirm: function () {
            if (this.submitted || !this.selectedChoice) return;

            if (this.els.confirmBtn) this.els.confirmBtn.disabled = true;
            this.submitted = true;

            var q = this.questionQueue[this.currentIndex];
            if (!q) return;

            var choice = this.selectedChoice;
            var correct = choice === q.answer;
            if (correct) {
                this.lastCorrectOptionKey = q.answer;
            } else {
                this.lastCorrectOptionKey = null;
            }

            this.els.options.querySelectorAll('[data-choice]').forEach(function (btn) {
                var key = btn.getAttribute('data-choice');
                btn.disabled = true;
                btn.classList.toggle('is-correct', key === q.answer);
                btn.classList.toggle('is-wrong', key === choice && !correct);
            });

            if (this.els.confirmBtn) {
                this.els.confirmBtn.disabled = true;
                this.els.confirmBtn.classList.add('ql-hidden');
            }

            if (this.els.feedback) {
                this.els.feedback.classList.remove('ql-hidden');
                this.els.feedback.classList.add(correct ? 'is-correct' : 'is-wrong');
                this.els.feedback.textContent = correct ? '✓ 回答正确！' : '✗ 答错了，正确答案是 ' + q.answer;
            }

            if (correct) {
                this.playCorrectOptionFx(q.answer, 'normal');
            } else {
                this.clearCorrectOptionFx();
            }

            if (this.els.nextBtn) {
                this.els.nextBtn.classList.remove('ql-hidden');
                var isLast = this.currentIndex >= this.questionQueue.length - 1;
                this.els.nextBtn.textContent = isLast ? '返回' : '下一题';
                if (isLast) this.els.nextBtn.classList.add('ql-hidden');
            }

            this.updateProgress(this.currentIndex + 1);

            this.addProgressMark(this.currentIndex, correct);

            var isLastQuestion = this.currentIndex >= this.questionQueue.length - 1;
            if (isLastQuestion) this.pendingRoundSummary = true;

            var sent = this.ws.send(global.QuizProtocol.makeSelfAnswer(
                this.currentCategory,
                q.id,
                correct,
                this.clientId
            ));
            if (!sent) {
                this.submitted = false;
                if (isLastQuestion) this.pendingRoundSummary = false;
                if (this.els.confirmBtn) {
                    this.els.confirmBtn.disabled = false;
                    this.els.confirmBtn.classList.remove('ql-hidden');
                }
                alert('网络未连接，请稍后重试');
            }
        },

        onNext: function () {
            if (this.currentIndex >= this.questionQueue.length - 1) {
                return;
            }
            this.currentIndex += 1;
            this.renderCurrentQuestion();
        },

        onFloatBack: function () {
            if (!confirm('确定返回重选类别？当前答题进度将丢失。')) return;
            this.currentCategory = null;
            this.pendingCategoryId = null;
            this.pendingQuestions = null;
            this.questionQueue = [];
            this.currentIndex = 0;
            this.showView('category');
        },

        showView: function (name) {
            this.activeView = name;
            Object.keys(this.views).forEach(function (key) {
                if (this.views[key]) {
                    this.views[key].classList.toggle('ql-hidden', key !== name);
                }
            }, this);
            if (this.els.floatBack) {
                this.els.floatBack.classList.toggle('ql-hidden', name !== 'quiz');
            }
            this.root.classList.toggle('is-quiz-active', name === 'quiz');
            this.syncHeaderTitle();
        }
    };
})(window);
