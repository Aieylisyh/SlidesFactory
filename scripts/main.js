/**
 * Main deck boot — delegates to SFKDeck core modules.
 */
(function () {
    'use strict';

    var SFK = window.SFKDeck || {};

    function boot() {
        if (!document.querySelector('.reveal')) return;
        if (typeof PortraitDeckAdapt !== 'undefined') {
            PortraitDeckAdapt.init();
        }
        if (typeof ShareLock !== 'undefined') {
            ShareLock.init().then(function () {
                if (document.querySelector('.reveal')) {
                    SFK.initReveal();
                }
            });
            return;
        }
        SFK.initReveal();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
