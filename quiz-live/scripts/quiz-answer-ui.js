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

        beginCategoryQuiz: function (categoryId, questions) {
            if (!questions || !questions.length) return;
            this.currentCategory = categoryId;
            this.questionQueue = global.QuizAnswerCore.pickRandomQuestions(questions);
            this.currentIndex = 0;
            if (this.ws) {
                this.ws.send(global.QuizProtocol.makeRoundStart(categoryId, this.clientId));
            }
            this.showView('quiz');
            this.renderCurrentQuestion();
        },

        applyPlayer: function (player) {
            if (!player) return;
            this.player = player;
            this.playerLevel = Number(player.level) || 3;
            this.nickname = player.nickname || this.nickname;
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

        renderLeaderboard: function (participants, onlineCount) {
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

        onOpenLeaderboard: function () {
            this.showView('leaderboard');
            this.ensureRegistered();
            this.renderLeaderboard(this.participants);
            if (this.ws) {
                this.ws.send(global.QuizProtocol.makeRequestState());
            }
        },

        onLeaderboardBack: function () {
            this.showView('category');
        },

        getCategoryMeta: function (cat) {
            return {
                short: cat.displayName || cat.id,
                icon: '📚',
                theme: cat.id || 'default'
            };
        },

        renderCategories: function () {
            if (!this.els.categoryGrid) return;

            var self = this;
            var html = '';
            var drawCount = global.QuizAnswerCore.QUIZ_DRAW_COUNT;
            var level = this.playerLevel || 3;

            this.questionCategories
                .filter(function (cat) {
                    return (cat.required_level || 1) <= level;
                })
                .forEach(function (cat) {
                    var meta = self.getCategoryMeta(cat);
                    var theme = meta.theme || 'default';
                    html += '<button type="button" class="ql-category-btn ql-category-btn--' + theme + '" data-category="' + cat.id + '">' +
                        '<span class="ql-category-icon-wrap">' +
                        '<span class="ql-category-icon" aria-hidden="true">' + meta.icon + '</span></span>' +
                        '<span class="ql-category-body">' +
                        '<span class="ql-category-name">' + meta.short + '</span>' +
                        '<span class="ql-category-count">随机 ' + drawCount + ' 题 · Lv.' + (cat.required_level || 1) + '+</span>' +
                        '</span></button>';
                });

            if (!html) {
                html = '<p class="ql-empty-hint">当前等级暂无可用题库，请稍后再试。</p>';
            }

            this.els.categoryGrid.innerHTML = html;

            this.els.categoryGrid.querySelectorAll('[data-category]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    self.startCategory(btn.getAttribute('data-category'));
                });
            });
        },

        getCategoryTitle: function () {
            if (!this.currentCategory) return this.deckTitle;
            var cat = this.questionCategories.find(function (c) { return c.id === this.currentCategory; }, this);
            return cat ? (cat.displayName || cat.id) : this.currentCategory;
        },

        syncHeaderTitle: function () {
            if (!this.els.title) return;
            if (this.activeView === 'leaderboard') {
                this.els.title.textContent = '排行榜';
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
                this.beginCategoryQuiz(categoryId, cached);
                return;
            }

            var loadPromise = global.QuizAnswerQuestions.fetchBank(categoryId);
            this.waitForBankLoad(loadPromise)
                .then(function (questions) {
                    self.beginCategoryQuiz(categoryId, questions);
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

        renderCurrentQuestion: function () {
            var q = this.questionQueue[this.currentIndex];
            if (!q) return;

            this.selectedChoice = null;
            this.submitted = false;
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

            if (this.els.nextBtn) {
                this.els.nextBtn.classList.remove('ql-hidden');
                this.els.nextBtn.textContent = this.currentIndex >= this.questionQueue.length - 1 ? '返回' : '下一题';
            }

            this.updateProgress(this.currentIndex + 1);

            var sent = this.ws.send(global.QuizProtocol.makeSelfAnswer(
                this.currentCategory,
                q.id,
                correct,
                this.clientId
            ));
            if (!sent) {
                this.submitted = false;
                if (this.els.confirmBtn) {
                    this.els.confirmBtn.disabled = false;
                    this.els.confirmBtn.classList.remove('ql-hidden');
                }
                alert('网络未连接，请稍后重试');
            }
        },

        onNext: function () {
            if (this.currentIndex >= this.questionQueue.length - 1) {
                this.showView('category');
                return;
            }
            this.currentIndex += 1;
            this.renderCurrentQuestion();
        },

        onFloatBack: function () {
            if (!confirm('确定返回重选类别？当前答题进度将丢失。')) return;
            this.currentCategory = null;
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
