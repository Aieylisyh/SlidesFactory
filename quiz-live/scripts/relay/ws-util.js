'use strict';

var crypto = require('crypto');

function sha1Base64(str) {
    return crypto.createHash('sha1').update(str).digest('base64');
}

function acceptKey(key) {
    return sha1Base64(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
}

function parseFrame(buffer) {
    if (buffer.length < 2) return null;
    var second = buffer[1];
    var masked = (second & 0x80) !== 0;
    var len = second & 0x7f;
    var offset = 2;
    if (len === 126) {
        if (buffer.length < 4) return null;
        len = buffer.readUInt16BE(2);
        offset = 4;
    } else if (len === 127) {
        if (buffer.length < 10) return null;
        len = Number(buffer.readBigUInt64BE(2));
        offset = 10;
    }
    var maskOffset = masked ? 4 : 0;
    if (buffer.length < offset + maskOffset + len) return null;
    var payload = buffer.slice(offset + maskOffset, offset + maskOffset + len);
    if (masked) {
        var mask = buffer.slice(offset, offset + 4);
        for (var i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
    }
    return { payload: payload, totalLength: offset + maskOffset + len };
}

function encodeTextFrame(text) {
    var payload = Buffer.from(text, 'utf8');
    var len = payload.length;
    var header;
    if (len < 126) {
        header = Buffer.alloc(2);
        header[0] = 0x81;
        header[1] = len;
    } else if (len < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x81;
        header[1] = 126;
        header.writeUInt16BE(len, 2);
    } else {
        header = Buffer.alloc(10);
        header[0] = 0x81;
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(len), 2);
    }
    return Buffer.concat([header, payload]);
}

function WsSocket(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.open = true;
    this._quizRoom = '';
    this._quizRole = '';
    this._clientId = null;
}

WsSocket.prototype.send = function (text) {
    if (!this.open) return;
    try {
        this.socket.write(encodeTextFrame(text));
    } catch (e) { /* ignore */ }
};

module.exports = {
    acceptKey: acceptKey,
    parseFrame: parseFrame,
    WsSocket: WsSocket
};
