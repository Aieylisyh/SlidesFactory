/**
 * Summerschool deck — Message board page (飞书表单 + 公开视图)
 */
(function (global) {
    'use strict';

    var CONFIG = {
        formUrl: '',
        viewUrl: ''
    };

    function init() {
        var postBtn = document.querySelector('.ss-mb-post-btn');
        var iframe = document.getElementById('ssMbIframe');
        var placeholder = document.querySelector('.ss-mb-placeholder');

        if (CONFIG.formUrl && postBtn) {
            postBtn.href = CONFIG.formUrl;
        }

        if (CONFIG.viewUrl && iframe) {
            iframe.src = CONFIG.viewUrl;
            iframe.addEventListener('load', function () {
                iframe.classList.add('ss-mb-loaded');
                if (placeholder) {
                    placeholder.style.display = 'none';
                }
            });
        }
    }

    function refresh() {
        var iframe = document.getElementById('ssMbIframe');
        if (iframe && iframe.src) {
            iframe.src = iframe.src;
        }
    }

    function configure(opts) {
        if (opts.formUrl) CONFIG.formUrl = opts.formUrl;
        if (opts.viewUrl) CONFIG.viewUrl = opts.viewUrl;
        var postBtn = document.querySelector('.ss-mb-post-btn');
        var iframe = document.getElementById('ssMbIframe');
        if (postBtn && CONFIG.formUrl) postBtn.href = CONFIG.formUrl;
        if (iframe && CONFIG.viewUrl && !iframe.src) {
            iframe.src = CONFIG.viewUrl;
            var placeholder = document.querySelector('.ss-mb-placeholder');
            iframe.addEventListener('load', function () {
                iframe.classList.add('ss-mb-loaded');
                if (placeholder) placeholder.style.display = 'none';
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    global.SummerMessageBoard = {
        refresh: refresh,
        configure: configure
    };
})(window);
