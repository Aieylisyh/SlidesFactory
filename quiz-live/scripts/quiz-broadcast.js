/**
 * Horizontal scrolling room broadcast ticker (shared by answer & screen).
 * Messages are queued FIFO: each finishes before the next plays.
 */
(function (global) {
    'use strict';

    var CONFIG_URL = 'data/broadcast-config.json';
    var cachedConfig = null;
    var configPromise = null;

    var DEFAULT_CONFIG = {
        streakPrefix: '已经累计胜利{wins}次，',
        streaks: [
            { streak: 3, message: '{name} 正在大杀特杀！' },
            { streak: 6, message: '{name} 已经暴走，停不下来了！' },
            { streak: 10, message: '{name} 已经无人能敌！' },
            { streak: 15, message: '{name} 超神了！谁与争锋？！' }
        ]
    };

    function templateVars(name, wins) {
        var displayName = name || '某位选手';
        var n = wins || 0;
        return { name: displayName, wins: n, streak: n };
    }

    function applyTemplate(tpl, vars) {
        var out = String(tpl || '');
        Object.keys(vars || {}).forEach(function (key) {
            out = out.split('{' + key + '}').join(String(vars[key]));
        });
        return out;
    }

    function normalizeConfig(raw) {
        var base = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        if (!raw || typeof raw !== 'object') return base;
        if (raw.streakPrefix != null) base.streakPrefix = String(raw.streakPrefix);
        if (Array.isArray(raw.streaks) && raw.streaks.length) {
            base.streaks = raw.streaks.map(function (item) {
                return {
                    streak: Number(item.streak),
                    message: String(item.message || '{name} 累计胜利 {wins} 次！')
                };
            }).filter(function (item) { return item.streak > 0; });
        }
        return base;
    }

    function loadConfig() {
        if (cachedConfig) return Promise.resolve(cachedConfig);
        if (configPromise) return configPromise;
        configPromise = fetch(CONFIG_URL, { cache: 'no-store' })
            .then(function (res) {
                if (!res.ok) throw new Error('broadcast-config ' + res.status);
                return res.json();
            })
            .then(function (json) {
                cachedConfig = normalizeConfig(json);
                return cachedConfig;
            })
            .catch(function () {
                cachedConfig = normalizeConfig(null);
                return cachedConfig;
            });
        return configPromise;
    }

    function formatWinBroadcastMessage(name, wins, config) {
        config = config || cachedConfig || DEFAULT_CONFIG;
        var entry = (config.streaks || []).find(function (s) { return s.streak === wins; });
        var bodyTpl = entry ? entry.message : '{name} 累计胜利 {wins} 次！';
        var vars = templateVars(name, wins);
        var body = applyTemplate(bodyTpl, vars);
        var prefix = applyTemplate(config.streakPrefix || '已经累计胜利{wins}次，', vars);
        return prefix + body;
    }

    function resolveKind(payload) {
        if (payload.kind) return payload.kind;
        if (payload.type === 'streak_broadcast') return 'streak';
        return 'default';
    }

    function QuizBroadcast(root) {
        this.root = root;
        this.track = root ? root.querySelector('[data-broadcast-track]') : null;
        this.queue = [];
        this.playing = false;
        this._enqueueChain = Promise.resolve();
        this._timer = null;
        this._onAnimEnd = null;
        if (this.root) this.showIdle();
        loadConfig();
    }

    QuizBroadcast.prototype.resolveText = function (payload) {
        if (payload.message) return Promise.resolve(payload.message);
        var wins = payload.wins || payload.streak;
        if (wins) {
            return loadConfig().then(function (cfg) {
                return formatWinBroadcastMessage(payload.name, wins, cfg);
            });
        }
        return Promise.resolve('');
    };

    QuizBroadcast.prototype.enqueue = function (payload) {
        if (!this.root || !this.track) return;
        var self = this;
        this._enqueueChain = this._enqueueChain.then(function () {
            return self.resolveText(payload);
        }).then(function (text) {
            if (!text) return;
            self.queue.push({
                text: text,
                kind: resolveKind(payload)
            });
            if (!self.playing) self.playNext();
        }).catch(function () { /* keep chain alive */ });
    };

    QuizBroadcast.prototype.clearPlaybackTimer = function () {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
        if (this._onAnimEnd && this.track) {
            this.track.removeEventListener('animationend', this._onAnimEnd);
            this._onAnimEnd = null;
        }
    };

    QuizBroadcast.prototype.showIdle = function () {
        if (!this.root) return;
        this.clearPlaybackTimer();
        this.root.classList.remove('is-active');
        this.root.classList.add('is-idle');
        this.root.dataset.kind = '';
        if (this.track) {
            this.track.textContent = '';
            this.track.className = 'ql-broadcast-track ql-broadcast-idle';
            this.track.style.animationDuration = '';
        }
    };

    QuizBroadcast.prototype.advanceQueue = function () {
        var self = this;
        self.clearPlaybackTimer();
        self.playNext();
    };

    QuizBroadcast.prototype.playNext = function () {
        var self = this;
        if (!this.queue.length) {
            this.playing = false;
            this.showIdle();
            return;
        }
        this.playing = true;
        var item = this.queue.shift();
        var kind = item.kind || 'default';
        var durationSec = Math.max(3.5, item.text.length * 0.1);

        this.root.classList.remove('is-idle');
        this.root.classList.add('is-active');
        this.root.dataset.kind = kind;
        this.track.textContent = item.text;
        this.track.className = 'ql-broadcast-track is-animating is-kind-' + kind;
        void this.track.offsetWidth;
        this.track.style.animationDuration = durationSec + 's';

        var advanced = false;
        function advanceOnce() {
            if (advanced) return;
            advanced = true;
            self.advanceQueue();
        }

        this._onAnimEnd = function (e) {
            if (e.target !== self.track || e.animationName !== 'ql-marquee') return;
            advanceOnce();
        };
        this.track.addEventListener('animationend', this._onAnimEnd);
        this._timer = setTimeout(advanceOnce, durationSec * 1000 + 400);
    };

    global.QuizBroadcast = QuizBroadcast;
    global.QuizBroadcastConfig = {
        load: loadConfig,
        formatWin: formatWinBroadcastMessage
    };
})(typeof window !== 'undefined' ? window : global);
