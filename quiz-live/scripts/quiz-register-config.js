/**
 * quiz-live — audience registration form config loader & renderer.
 * See guides/QUIZ_LIVE_GUIDE.md § 观众登记配置
 */
(function (global) {
    'use strict';

    var CONFIG_URL = 'data/register-config.json';
    var DEFAULT_CONFIG = {
        version: 1,
        title: '扫码参与 · 填写信息',
        submitLabel: '进入活动',
        fields: [
            {
                id: 'name',
                enabled: true,
                required: true,
                label: '姓名',
                type: 'text',
                placeholder: '请输入姓名',
                autocomplete: 'name',
                maxLength: 20
            },
            {
                id: 'phone',
                enabled: true,
                required: false,
                label: '手机号',
                type: 'tel',
                placeholder: '便于领奖核对（选填）',
                autocomplete: 'tel',
                maxLength: 20
            }
        ],
        messages: {
            required: '请填写{label}',
            pattern: '{label}格式不正确'
        }
    };

    var cachedConfig = null;

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatMessage(template, vars) {
        var out = template || '';
        Object.keys(vars || {}).forEach(function (key) {
            out = out.split('{' + key + '}').join(vars[key]);
        });
        return out;
    }

    function normalizeField(field) {
        if (!field || !field.id) return null;
        return {
            id: String(field.id).trim(),
            enabled: field.enabled !== false,
            required: !!field.required,
            label: field.label || field.id,
            type: field.type || 'text',
            placeholder: field.placeholder || '',
            autocomplete: field.autocomplete || 'off',
            maxLength: field.maxLength != null ? field.maxLength : 64,
            pattern: field.pattern || '',
            patternMessage: field.patternMessage || ''
        };
    }

    function normalizeConfig(raw) {
        var base = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        if (!raw || typeof raw !== 'object') return base;

        if (raw.title) base.title = String(raw.title);
        if (raw.submitLabel) base.submitLabel = String(raw.submitLabel);
        if (raw.messages && typeof raw.messages === 'object') {
            Object.keys(raw.messages).forEach(function (key) {
                base.messages[key] = String(raw.messages[key]);
            });
        }
        if (Array.isArray(raw.fields) && raw.fields.length) {
            base.fields = raw.fields.map(normalizeField).filter(Boolean);
        }
        return base;
    }

    function getEnabledFields(config) {
        return (config.fields || []).filter(function (f) { return f.enabled; });
    }

    function loadRegisterConfig(options) {
        if (cachedConfig && !(options && options.force)) {
            return Promise.resolve(cachedConfig);
        }
        var url = (options && options.url) || CONFIG_URL;
        return fetch(url, { cache: 'no-store' })
            .then(function (res) {
                if (!res.ok) throw new Error('register-config ' + res.status);
                return res.json();
            })
            .then(function (json) {
                cachedConfig = normalizeConfig(json);
                return cachedConfig;
            })
            .catch(function (err) {
                console.warn('[QuizRegisterConfig]', err);
                cachedConfig = normalizeConfig(null);
                return cachedConfig;
            });
    }

    function renderRegisterForm(root, config) {
        if (!root) return;
        var fieldsWrap = root.querySelector('[data-register-fields]');
        var titleEl = root.querySelector('[data-register-title]');
        var submitBtn = root.querySelector('[data-register-submit]');
        if (!fieldsWrap) return;

        if (titleEl) titleEl.textContent = config.title;
        if (submitBtn) submitBtn.textContent = config.submitLabel;

        var html = '';
        getEnabledFields(config).forEach(function (field) {
            var inputId = 'ql-reg-' + field.id;
            html += '<div class="ql-field" data-register-field="' + escapeHtml(field.id) + '">' +
                '<label for="' + escapeHtml(inputId) + '">' + escapeHtml(field.label) + '</label>' +
                '<input id="' + escapeHtml(inputId) + '"' +
                ' name="' + escapeHtml(field.id) + '"' +
                ' type="' + escapeHtml(field.type) + '"' +
                ' placeholder="' + escapeHtml(field.placeholder) + '"' +
                ' autocomplete="' + escapeHtml(field.autocomplete) + '"' +
                (field.maxLength ? ' maxlength="' + field.maxLength + '"' : '') +
                (field.required ? ' required' : '') +
                (field.pattern ? ' pattern="' + escapeHtml(field.pattern) + '"' : '') +
                ' data-field-id="' + escapeHtml(field.id) + '">' +
                '</div>';
        });
        fieldsWrap.innerHTML = html;
    }

    function collectProfile(form, config) {
        var profile = {};
        getEnabledFields(config).forEach(function (field) {
            var input = form.querySelector('[name="' + field.id + '"]');
            profile[field.id] = input ? input.value.trim() : '';
        });
        return profile;
    }

    function validateProfile(profile, config) {
        var messages = config.messages || DEFAULT_CONFIG.messages;
        var fields = getEnabledFields(config);

        for (var i = 0; i < fields.length; i += 1) {
            var field = fields[i];
            var value = profile[field.id] || '';

            if (field.required && !value) {
                return formatMessage(messages.required || '请填写{label}', { label: field.label });
            }
            if (value && field.pattern) {
                try {
                    var re = new RegExp(field.pattern);
                    if (!re.test(value)) {
                        return field.patternMessage ||
                            formatMessage(messages.pattern || '{label}格式不正确', { label: field.label });
                    }
                } catch (e) { /* ignore invalid pattern in config */ }
            }
        }
        return '';
    }

    function getDisplayName(profile, config) {
        var nameField = (config.fields || []).find(function (f) { return f.id === 'name' && f.enabled; });
        if (nameField && profile.name) return profile.name;
        var first = getEnabledFields(config)[0];
        if (first && profile[first.id]) return profile[first.id];
        return profile.name || '观众';
    }

    global.QuizRegisterConfig = {
        CONFIG_URL: CONFIG_URL,
        DEFAULT_CONFIG: DEFAULT_CONFIG,
        load: loadRegisterConfig,
        normalize: normalizeConfig,
        getEnabledFields: getEnabledFields,
        renderForm: renderRegisterForm,
        collectProfile: collectProfile,
        validate: validateProfile,
        getDisplayName: getDisplayName
    };
})(typeof window !== 'undefined' ? window : global);
