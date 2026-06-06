/**
 * quiz-answer — question_cfg + question bank prefetch & cache.
 * Starts loading on register screen; banks served from memory when ready.
 */
(function (global) {
    'use strict';

    var CFG_URL = 'data/quiz/question_cfg.json';
    var BANK_URL_PREFIX = 'data/quiz/questions_';

    var state = {
        cfg: null,
        cfgPromise: null,
        banks: {},
        bankPromises: {}
    };

    function fetchBank(categoryId) {
        if (state.banks[categoryId]) {
            return Promise.resolve(state.banks[categoryId]);
        }
        if (!state.bankPromises[categoryId]) {
            state.bankPromises[categoryId] = fetch(BANK_URL_PREFIX + categoryId + '.json')
                .then(function (r) {
                    if (!r.ok) throw new Error('bank failed');
                    return r.json();
                })
                .then(function (data) {
                    var questions = (data && data.questions) || [];
                    state.banks[categoryId] = questions;
                    return questions;
                })
                .catch(function (err) {
                    delete state.bankPromises[categoryId];
                    throw err;
                });
        }
        return state.bankPromises[categoryId];
    }

    function prefetchBanks(categories) {
        (categories || []).forEach(function (cat) {
            if (cat && cat.id) fetchBank(cat.id);
        });
    }

    function fetchCfg() {
        if (!state.cfgPromise) {
            state.cfgPromise = fetch(CFG_URL)
                .then(function (r) {
                    if (!r.ok) throw new Error('cfg failed');
                    return r.json();
                })
                .then(function (list) {
                    state.cfg = Array.isArray(list) ? list : [];
                    prefetchBanks(state.cfg);
                    return state.cfg;
                })
                .catch(function () {
                    state.cfg = [];
                    return state.cfg;
                });
        }
        return state.cfgPromise;
    }

    global.QuizAnswerQuestions = {
        fetchCfg: fetchCfg,
        fetchBank: fetchBank,
        prefetchBanks: prefetchBanks,
        isCategoryReady: function (categoryId) {
            return !!state.banks[categoryId];
        },
        getCachedBank: function (categoryId) {
            return state.banks[categoryId] || null;
        },
        getCategories: function () {
            return state.cfg || [];
        }
    };
})(window);
