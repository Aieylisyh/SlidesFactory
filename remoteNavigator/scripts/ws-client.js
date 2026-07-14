/**
 * Lightweight WebSocket client with reconnect for deck remote.
 */
(function (global) {
    'use strict';

    function DeckRemoteWs(options) {
        this.url = options.url;
        this.room = options.room;
        this.role = options.role;
        this.deckId = options.deckId || null;
        this.token = options.token || null;
        this.clientId = options.clientId || null;
        this.onMessage = options.onMessage || function () {};
        this.onStatus = options.onStatus || function () {};
        this.ws = null;
        this.pingTimer = null;
        this.closed = false;
        this.retryMs = 800;
        this.maxRetryMs = 8000;
        this._connect();
    }

    DeckRemoteWs.prototype._connect = function () {
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
            self.retryMs = 800;
            self.onStatus('connected');
            self.send(global.DeckRemoteProtocol.makeHello(
                self.role,
                self.room,
                self.deckId,
                self.token,
                self.clientId
            ));
            self._startHeartbeat();
        };

        self.ws.onmessage = function (evt) {
            var msg = global.DeckRemoteProtocol.parseMessage(evt.data);
            if (msg) self.onMessage(msg);
        };

        self.ws.onclose = function () {
            self._stopHeartbeat();
            if (self.closed) return;
            self.onStatus('disconnected');
            self._scheduleReconnect();
        };

        self.ws.onerror = function () {
            self.onStatus('error');
        };
    };

    DeckRemoteWs.prototype._startHeartbeat = function () {
        var self = this;
        self._stopHeartbeat();
        self.pingTimer = setInterval(function () {
            self.send({ type: 'ping' });
        }, 20000);
    };

    DeckRemoteWs.prototype._stopHeartbeat = function () {
        if (!this.pingTimer) return;
        clearInterval(this.pingTimer);
        this.pingTimer = null;
    };

    DeckRemoteWs.prototype._scheduleReconnect = function () {
        var self = this;
        if (self.closed) return;
        setTimeout(function () {
            self._connect();
        }, self.retryMs);
        self.retryMs = Math.min(self.retryMs * 1.6, self.maxRetryMs);
    };

    DeckRemoteWs.prototype.send = function (msg) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
        this.ws.send(global.DeckRemoteProtocol.stringifyMessage(msg));
        return true;
    };

    DeckRemoteWs.prototype.close = function () {
        this.closed = true;
        this._stopHeartbeat();
        if (this.ws) this.ws.close();
    };

    global.DeckRemoteWs = DeckRemoteWs;
})(window);
