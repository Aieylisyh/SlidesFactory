/**
 * Bottom-right nav cluster (arrows + page number).
 */
(function (global) {
    'use strict';

    var SFK = global.SFKDeck = global.SFKDeck || {};

    function bindDeckNavCluster() {
        var reveal = document.querySelector('.reveal');
        if (!reveal || reveal.querySelector('.deck-nav-cluster')) return;

        var controls = reveal.querySelector('.controls');
        var slideNumber = reveal.querySelector('.slide-number');
        if (!controls || !slideNumber) return;

        var left = controls.querySelector('.navigate-left');
        var right = controls.querySelector('.navigate-right');
        if (!left || !right) return;

        var cluster = document.createElement('div');
        cluster.className = 'deck-nav-cluster';
        cluster.appendChild(left);
        cluster.appendChild(slideNumber);
        cluster.appendChild(right);
        controls.appendChild(cluster);
    }

    SFK.bindDeckNavCluster = bindDeckNavCluster;
})(window);
