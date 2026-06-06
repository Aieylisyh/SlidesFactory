/**
 * WebSocket client with reconnect for quiz-live.
 */
(function (global) {
    'use strict';

    function QuizWsClient(options) {
        this.url = options.url || '';
        this.room = options.room;
        this.role = options.role;
        this.clientId = options.clientId || null;
        this.onMessage = options.onMessage || function () {};
        this.onStatus = options.onStatus || function () {};
        this.onReconnect = options.onReconnect || function () {};
        this.ws = null;
        this.closed = false;
        this.wasConnected = false;
        this.retryMs = 800;
        this.maxRetryMs = 8000;

        var self = this;
        var urlReady = this.url
            ? Promise.resolve(this.url)
            : global.QuizProtocol.resolveWsUrl();
        urlReady.then(function (url) {
            if (self.closed) return;
            self.url = url;
            self._connect();
        }).catch(function () {
            self.onStatus('error');
        });
    }

    QuizWsClient.prototype._connect = function () {
        var self = this;
        if (self.closed) return;
        self.onStatus('connecting');

        try {
            self.ws = new WebSocket(self.url);
        } catch (err) {
            self._scheduleReconnect();
            return;
        }

        self.ws.onopen = function () {
            var isReconnect = self.wasConnected;
            self.retryMs = 800;
            self.wasConnected = true;
            self.onStatus('connected');
            self.send(global.QuizProtocol.makeHello(self.role, self.room, self.clientId));
            self.send(global.QuizProtocol.makeRequestState());
            if (isReconnect) self.onReconnect();
        };

        self.ws.onmessage = function (evt) {
            var msg = global.QuizProtocol.parseMessage(evt.data);
            if (msg) self.onMessage(msg);
        };

        self.ws.onclose = function () {
            self.onStatus('disconnected');
            self._scheduleReconnect();
        };

        self.ws.onerror = function () {
            self.onStatus('error');
        };
    };

    QuizWsClient.prototype._scheduleReconnect = function () {
        var self = this;
        if (self.closed) return;
        setTimeout(function () {
            self._connect();
        }, self.retryMs);
        self.retryMs = Math.min(self.retryMs * 1.6, self.maxRetryMs);
    };

    QuizWsClient.prototype.send = function (msg) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
        this.ws.send(global.QuizProtocol.stringifyMessage(msg));
        return true;
    };

    QuizWsClient.prototype.close = function () {
        this.closed = true;
        if (this.ws) this.ws.close();
    };

    global.QuizWsClient = QuizWsClient;
})(window);
