/**
 * Mobile audience: register → pick category → self-paced quiz with instant feedback.
 */
(function (global) {
    'use strict';

    var STORAGE_KEY = 'quiz-live-client-id';

    var CATEGORY_LABELS = {
        '游戏常识': { short: '游戏', icon: '🎮' },
        '动画常识': { short: '动画', icon: '🎬' },
        '留学知识': { short: '留学常识', icon: '✈️' }
    };

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
        this.currentCategory = null;
        this.questionQueue = [];
        this.currentIndex = 0;
        this.answered = false;

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
            categoryGrid: root.querySelector('[data-category-grid]'),
            categoryLabel: root.querySelector('[data-category-label]'),
            questionIndex: root.querySelector('[data-question-index]'),
            questionText: root.querySelector('[data-question-text]'),
            options: root.querySelector('[data-options]'),
            feedback: root.querySelector('[data-feedback]'),
            nextBtn: root.querySelector('[data-next-btn]')
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
        if (this.els.nextBtn) {
            this.els.nextBtn.addEventListener('click', function () {
                self.onNext();
            });
        }
    };

    QuizAnswerApp.prototype.loadRegisterUi = function () {
        var self = this;
        var panel = this.views.register;
        if (!panel || typeof global.QuizRegisterConfig === 'undefined') return;

        self.registerConfig = global.QuizRegisterConfig.normalize(null);
        global.QuizRegisterConfig.renderForm(panel, self.registerConfig);

        global.QuizRegisterConfig.load()
            .then(function (config) {
                self.registerConfig = config;
                global.QuizRegisterConfig.renderForm(panel, config);
            });
    };

    QuizAnswerApp.prototype.loadQuestions = function () {
        var self = this;
        fetch('data/questions.json')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                self.quizzes = data.quizzes || [];
                if (self.els.title && data.title) {
                    self.els.title.textContent = data.title;
                }
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
            onMessage: function (m) { self.onMessage(m); }
        });
    };

    QuizAnswerApp.prototype.onWsStatus = function (status) {
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

    QuizAnswerApp.prototype.onMessage = function (msg) {
        if (msg.type === 'registered') {
            this.participantId = msg.participantId;
            this.nickname = msg.name || '';
            if (this.els.participantBadge) {
                this.els.participantBadge.textContent = this.nickname || ('编号 ' + msg.participantId);
            }
            this.renderCategories();
            this.showView('category');
            return;
        }
        if (msg.type === 'streak_broadcast') {
            this.broadcast.enqueue(msg);
            return;
        }
        if (msg.type === 'state') {
            if (this.els.title && msg.title) this.els.title.textContent = msg.title;
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

        this.ws.send(global.QuizProtocol.makeRegister(this.clientId, profile));
    };

    QuizAnswerApp.prototype.renderCategories = function () {
        if (!this.els.categoryGrid) return;
        var self = this;
        var html = '';
        this.quizzes.forEach(function (quiz) {
            var meta = CATEGORY_LABELS[quiz.category] || { short: quiz.category, icon: '📚' };
            var count = (quiz.questions || []).length;
            html += '<button type="button" class="ql-category-btn" data-category="' + quiz.category + '">' +
                '<span class="ql-category-icon">' + meta.icon + '</span>' +
                '<span class="ql-category-name">' + meta.short + '</span>' +
                '<span class="ql-category-count">' + count + ' 题</span>' +
                '</button>';
        });
        this.els.categoryGrid.innerHTML = html;
        this.els.categoryGrid.querySelectorAll('[data-category]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                self.startCategory(btn.getAttribute('data-category'));
            });
        });
    };

    QuizAnswerApp.prototype.startCategory = function (category) {
        var quiz = this.quizzes.find(function (q) { return q.category === category; });
        if (!quiz || !quiz.questions.length) return;

        this.currentCategory = category;
        this.questionQueue = shuffle(quiz.questions.map(normalizeQuestion));
        this.currentIndex = 0;
        this.answered = false;
        this.showView('quiz');
        this.renderCurrentQuestion();
    };

    QuizAnswerApp.prototype.renderCurrentQuestion = function () {
        var q = this.questionQueue[this.currentIndex];
        if (!q) return;

        this.answered = false;
        var total = this.questionQueue.length;
        var meta = CATEGORY_LABELS[this.currentCategory] || { short: this.currentCategory };

        if (this.els.questionIndex) {
            this.els.questionIndex.textContent = '第 ' + (this.currentIndex + 1) + ' / ' + total + ' 题';
        }
        if (this.els.categoryLabel) {
            this.els.categoryLabel.textContent = meta.short;
        }
        if (this.els.questionText) this.els.questionText.textContent = q.text;

        if (this.els.feedback) {
            this.els.feedback.classList.add('ql-hidden');
            this.els.feedback.textContent = '';
            this.els.feedback.className = 'ql-feedback ql-hidden';
        }
        if (this.els.nextBtn) {
            this.els.nextBtn.classList.add('ql-hidden');
            this.els.nextBtn.disabled = false;
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
                if (self.answered) return;
                self.onChoose(btn.getAttribute('data-choice'));
            });
        });
    };

    QuizAnswerApp.prototype.onChoose = function (choice) {
        if (this.answered) return;
        var q = this.questionQueue[this.currentIndex];
        if (!q) return;

        this.answered = true;
        var correct = choice === q.answer;

        this.els.options.querySelectorAll('[data-choice]').forEach(function (btn) {
            var key = btn.getAttribute('data-choice');
            btn.disabled = true;
            btn.classList.toggle('is-selected', key === choice);
            btn.classList.toggle('is-correct', key === q.answer);
            btn.classList.toggle('is-wrong', key === choice && !correct);
        });

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

        this.ws.send(global.QuizProtocol.makeSelfAnswer(
            this.currentCategory,
            q.id,
            correct,
            this.clientId
        ));
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

    QuizAnswerApp.prototype.showView = function (name) {
        Object.keys(this.views).forEach(function (key) {
            if (this.views[key]) {
                this.views[key].classList.toggle('ql-hidden', key !== name);
            }
        }, this);
    };

    global.QuizAnswerApp = QuizAnswerApp;

    document.addEventListener('DOMContentLoaded', function () {
        var root = document.querySelector('[data-quiz-answer]');
        if (root) new QuizAnswerApp(root);
    });
})(window);
