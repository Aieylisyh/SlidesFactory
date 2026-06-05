/**

 * Mobile audience: register → pick category → self-paced quiz with confirm submit.

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

    function pickRandomQuestions(questions, count) {
        var pool = shuffle(questions || []);
        var n = Math.min(count, pool.length);
        return pool.slice(0, n).map(normalizeQuestion);
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



    function QuizAnswerApp(root) {

        this.root = root;

        this.room = global.QuizProtocol.getRoomFromUrl();

        this.clientId = getClientId();

        this.participantId = null;

        this.nickname = '';

        this.registerConfig = null;

        this.quizzes = [];
        this.categoryMeta = {};

        this.currentCategory = null;

        this.questionQueue = [];

        this.currentIndex = 0;

        this.selectedChoice = null;

        this.submitted = false;

        this.deckTitle = '趣味常识挑战';
        this.wsWasConnected = false;



        this.views = {

            register: root.querySelector('[data-view="register"]'),

            category: root.querySelector('[data-view="category"]'),

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
            progressFill: root.querySelector('[data-progress-fill]'),
            questionText: root.querySelector('[data-question-text]'),
            options: root.querySelector('[data-options]'),

            confirmBtn: root.querySelector('[data-confirm-btn]'),

            feedback: root.querySelector('[data-feedback]'),

            nextBtn: root.querySelector('[data-next-btn]'),
            floatBack: root.querySelector('[data-float-back]')
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



    QuizAnswerApp.prototype.showFatal = function (msg) {

        this.root.innerHTML = '<div class="ql-main"><div class="ql-panel"><p>' + msg + '</p></div></div>';

    };



    QuizAnswerApp.prototype.bind = function () {

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
    };



    QuizAnswerApp.prototype.loadRegisterUi = function () {

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

    };

    QuizAnswerApp.prototype.updateContinueUi = function () {
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
    };

    QuizAnswerApp.prototype.onContinue = function () {
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
    };

    QuizAnswerApp.prototype.getCategoryMeta = function (category) {
        var quiz = this.quizzes.find(function (q) { return q.category === category; });
        var fromQuiz = quiz ? {
            short: quiz.short,
            icon: quiz.icon,
            theme: quiz.theme
        } : null;
        var fromMap = (this.categoryMeta || {})[category];
        var base = { short: category, icon: '📚', theme: 'default' };
        return Object.assign(base, fromMap || {}, fromQuiz || {});
    };



    QuizAnswerApp.prototype.loadQuestions = function () {

        var self = this;

        fetch('data/questions.json')

            .then(function (r) { return r.json(); })

            .then(function (data) {

                self.quizzes = data.quizzes || [];
                self.categoryMeta = data.categoryMeta || {};
                if (data.title) self.deckTitle = data.title;
                self.syncHeaderTitle();

                if (self.participantId) self.renderCategories();

            })

            .catch(function () {

                self.quizzes = [];

            });

    };



    QuizAnswerApp.prototype.connect = function () {

        var self = this;

        this.ws = new global.QuizWsClient({

            url: global.QuizProtocol.getWsUrl(),

            room: this.room,

            role: 'audience',

            clientId: this.clientId,

            onStatus: function (s) { self.onWsStatus(s); },

            onReconnect: function () { self.onWsReconnected(); },

            onMessage: function (m) { self.onMessage(m); }

        });

    };

    QuizAnswerApp.prototype.setReconnectBanner = function (visible) {
        if (!this.els.reconnectBanner) return;
        this.els.reconnectBanner.classList.toggle('ql-hidden', !visible);
    };

    QuizAnswerApp.prototype.onWsReconnected = function () {
        this.setReconnectBanner(false);
    };

    QuizAnswerApp.prototype.onWsStatus = function (status) {

        if (status === 'connected') {
            this.wsWasConnected = true;
            this.setReconnectBanner(false);
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

    };



    QuizAnswerApp.prototype.onBroadcast = function (msg) {

        this.broadcast.enqueue(msg);

    };



    QuizAnswerApp.prototype.onMessage = function (msg) {

        if (msg.type === 'registered') {

            this.participantId = msg.participantId;

            this.nickname = msg.name || '';

            if (this.els.participantBadge) {

                this.els.participantBadge.textContent = this.nickname || ('编号 ' + msg.participantId);

            }

            this.renderCategories();

            this.showView('category');
            this.updateContinueUi();

            return;

        }

        if (msg.type === 'room_broadcast' || msg.type === 'streak_broadcast') {

            this.onBroadcast(msg);

            return;

        }

        if (msg.type === 'state') {

            if (msg.title) this.deckTitle = msg.title;

            this.syncHeaderTitle();

            if (!this.participantId) {

                var me = (msg.participants || []).find(function (p) {

                    return p.clientId === this.clientId;

                }, this);

                if (me) {

                    this.participantId = me.id;

                    this.nickname = me.name || '';

                    if (this.els.participantBadge) {

                        this.els.participantBadge.textContent = this.nickname || ('编号 ' + me.id);

                    }

                    this.renderCategories();

                    this.showView('category');
                    this.updateContinueUi();

                }

            }

        }

    };



    QuizAnswerApp.prototype.onRegister = function () {

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

    };



    QuizAnswerApp.prototype.renderCategories = function () {

        if (!this.els.categoryGrid) return;

        var self = this;

        var html = '';

        this.quizzes.forEach(function (quiz) {

            var meta = self.getCategoryMeta(quiz.category);

            var drawCount = Math.min(QUIZ_DRAW_COUNT, (quiz.questions || []).length);
            var theme = meta.theme || 'default';
            html += '<button type="button" class="ql-category-btn ql-category-btn--' + theme + '" data-category="' + quiz.category + '">' +
                '<span class="ql-category-icon-wrap">' +
                '<span class="ql-category-icon" aria-hidden="true">' + meta.icon + '</span></span>' +
                '<span class="ql-category-body">' +
                '<span class="ql-category-name">' + meta.short + '</span>' +
                '<span class="ql-category-count">随机 ' + drawCount + ' 题</span>' +
                '</span></button>';

        });

        this.els.categoryGrid.innerHTML = html;

        this.els.categoryGrid.querySelectorAll('[data-category]').forEach(function (btn) {

            btn.addEventListener('click', function () {

                self.startCategory(btn.getAttribute('data-category'));

            });

        });

    };



    QuizAnswerApp.prototype.getCategoryTitle = function () {
        if (!this.currentCategory) return this.deckTitle;
        var meta = this.getCategoryMeta(this.currentCategory);
        return meta.short;
    };

    QuizAnswerApp.prototype.syncHeaderTitle = function () {
        if (!this.els.title) return;
        var inQuiz = this.views.quiz && !this.views.quiz.classList.contains('ql-hidden');
        this.els.title.textContent = inQuiz && this.currentCategory
            ? this.getCategoryTitle()
            : this.deckTitle;
    };

    QuizAnswerApp.prototype.startCategory = function (category) {

        var quiz = this.quizzes.find(function (q) { return q.category === category; });

        if (!quiz || !quiz.questions.length) return;



        this.currentCategory = category;
        this.questionQueue = pickRandomQuestions(quiz.questions, QUIZ_DRAW_COUNT);
        this.currentIndex = 0;
        this.showView('quiz');
        this.renderCurrentQuestion();
    };

    QuizAnswerApp.prototype.updateProgress = function (completed) {
        if (!this.els.progressFill) return;
        var total = this.questionQueue.length || 1;
        var done = Math.max(0, Math.min(completed, total));
        var pct = Math.round((done / total) * 100);
        this.els.progressFill.style.width = pct + '%';
    };



    QuizAnswerApp.prototype.renderCurrentQuestion = function () {

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

    };



    QuizAnswerApp.prototype.onSelect = function (choice) {

        this.selectedChoice = choice;

        this.els.options.querySelectorAll('[data-choice]').forEach(function (btn) {

            btn.classList.toggle('is-selected', btn.getAttribute('data-choice') === choice);

        });

        if (this.els.confirmBtn) {

            this.els.confirmBtn.disabled = false;

        }

    };



    QuizAnswerApp.prototype.onConfirm = function () {

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
            var isLast = this.currentIndex >= this.questionQueue.length - 1;
            this.els.nextBtn.textContent = isLast ? '返回' : '下一题';
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

    };



    QuizAnswerApp.prototype.onNext = function () {

        var isLast = this.currentIndex >= this.questionQueue.length - 1;

        if (isLast) {

            this.showView('category');

            return;

        }

        this.currentIndex += 1;

        this.renderCurrentQuestion();

    };



    QuizAnswerApp.prototype.onFloatBack = function () {
        if (!confirm('确定返回重选类别？当前答题进度将丢失。')) return;
        this.currentCategory = null;
        this.questionQueue = [];
        this.currentIndex = 0;
        this.showView('category');
    };

    QuizAnswerApp.prototype.showView = function (name) {
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
    };



    global.QuizAnswerApp = QuizAnswerApp;



    document.addEventListener('DOMContentLoaded', function () {

        var root = document.querySelector('[data-quiz-answer]');

        if (root) new QuizAnswerApp(root);

    });

})(window);

