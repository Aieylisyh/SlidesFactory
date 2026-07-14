(function () {
    'use strict';

    var slide = document.querySelector('#ice-break');
    var diceState = { kind: 'ice-break', ready: true, visible: false, rolling: false };

    window.SummerIceBreakRemote = {
        getState: function () {
            return Object.assign({}, diceState);
        },
        execute: function (action) {
            if (action === 'dice_show') diceState.visible = true;
            else if (action === 'dice_hide') {
                diceState.visible = false;
                diceState.rolling = false;
            } else if (action === 'dice_roll_start' && diceState.visible) diceState.rolling = true;
            else if (action === 'dice_roll_stop' && diceState.rolling) diceState.rolling = false;
            else return false;
            return true;
        }
    };

    window.DeckFocusNav = {
        bindReveal: function () {},
        getState: function () {
            return { mode: 'deck', enabled: false, targetIndex: -1, totalTargets: 0 };
        }
    };

    window.Reveal = {
        isReady: function () { return true; },
        getIndices: function () { return { h: 11, v: 0 }; },
        getCurrentSlide: function () { return slide; },
        on: function () {},
        next: function () {},
        prev: function () {},
        slide: function () {}
    };
})();
