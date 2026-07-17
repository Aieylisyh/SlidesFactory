/**
 * Summerschool — interactive schedule table with hover + syllabus modal.
 */
(function (global) {
    'use strict';

    var DATA_URL = 'data/schedule.json?v=15';
    var cachedData = null;
    var overlay = null;
    var overlayTitle = null;
    var overlayBody = null;
    var open = false;
    var activeCell = null;
    var activeModalMeta = null;

    var WEEKDAY_MAP = {
        '\u5468\u4e00': 'mon',
        '\u5468\u4e8c': 'tue',
        '\u5468\u4e09': 'wed',
        '\u5468\u56db': 'thu',
        '\u5468\u4e94': 'fri',
        '\u5468\u516d': 'sat',
        '\u5468\u65e5': 'sun'
    };

    function i18n() {
        return global.SummerI18n;
    }

    function t(key, fallback) {
        var svc = i18n();
        return svc ? svc.t(key, fallback) : fallback;
    }

    function stopRevealNav(e) {
        e.stopPropagation();
    }

    function stopRevealNavKeys(e) {
        var keys = [' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'];
        if (keys.indexOf(e.key) !== -1) {
            e.stopPropagation();
            e.preventDefault();
        }
    }

    function fetchData() {
        if (cachedData) return Promise.resolve(cachedData);
        return fetch(DATA_URL, { cache: 'no-store' })
            .then(function (res) {
                if (!res.ok) throw new Error('schedule.json ' + res.status);
                return res.json();
            })
            .then(function (data) {
                cachedData = data;
                return data;
            });
    }

    function ensureOverlay() {
        if (overlay) return;
        overlay = document.createElement('div');
        overlay.className = 'ss-schedule-modal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('data-i18n-attrs', 'aria-label:schedule.ui.modal.aria');
        overlay.hidden = true;

        var panel = document.createElement('div');
        panel.className = 'ss-schedule-modal__panel';
        panel.addEventListener('click', stopRevealNav);
        panel.addEventListener('mousedown', stopRevealNav);

        overlayTitle = document.createElement('h3');
        overlayTitle.className = 'ss-schedule-modal__title';

        overlayBody = document.createElement('div');
        overlayBody.className = 'ss-schedule-modal__body';

        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'ss-schedule-modal__close';
        closeBtn.setAttribute('data-i18n-attrs', 'aria-label:schedule.ui.modal.close');
        closeBtn.textContent = '\u00d7';
        closeBtn.addEventListener('click', function (e) {
            stopRevealNav(e);
            closeModal();
        });

        panel.appendChild(closeBtn);
        panel.appendChild(overlayTitle);
        panel.appendChild(overlayBody);
        overlay.appendChild(panel);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                stopRevealNav(e);
                closeModal();
            }
        });
        overlay.addEventListener('mousedown', stopRevealNav);
        overlay.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                e.stopPropagation();
                closeModal();
            } else {
                stopRevealNavKeys(e);
            }
        });

        document.body.appendChild(overlay);
        if (i18n()) {
            i18n().apply(overlay);
        }
    }

    function formatBody(text) {
        if (!text) return '';
        return text.split('\n').map(function (line) {
            return line.trim();
        }).filter(Boolean).map(function (line) {
            return '<p>' + escapeHtml(line) + '</p>';
        }).join('');
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function openModal(title, body, cellEl, meta) {
        ensureOverlay();
        overlayTitle.textContent = title || '';
        overlayBody.innerHTML = formatBody(body);
        overlay.hidden = false;
        overlay.classList.add('is-open');
        open = true;
        activeModalMeta = meta || { title: title, bodyKey: null, body: body };
        document.body.classList.add('is-ss-schedule-modal-open');

        if (activeCell) activeCell.classList.remove('is-active');
        activeCell = cellEl;
        if (activeCell) activeCell.classList.add('is-active');

        requestAnimationFrame(function () {
            overlay.querySelector('.ss-schedule-modal__close').focus();
        });
    }

    function closeModal() {
        if (!overlay || !open) return;
        overlay.classList.remove('is-open');
        overlay.hidden = true;
        open = false;
        document.body.classList.remove('is-ss-schedule-modal-open');
        overlayBody.innerHTML = '';
        activeModalMeta = null;
        if (activeCell) {
            activeCell.classList.remove('is-active');
            activeCell = null;
        }
    }

    function refreshOpenModal() {
        if (!open || !activeModalMeta) return;
        var title = activeCell ? (activeCell.getAttribute('data-ss-title') || activeModalMeta.title) : activeModalMeta.title;
        var body = activeModalMeta.bodyKey && i18n()
            ? getSyllabusBody(cachedData, activeModalMeta.bodyKey)
            : activeModalMeta.body;
        activeModalMeta.title = title;
        overlayTitle.textContent = title || '';
        overlayBody.innerHTML = formatBody(body);
        if (activeCell) {
            activeCell.setAttribute('aria-label', title + t('schedule.ui.cellHint', ''));
        }
    }

    var LOGISTICS_KEYS = {
        arrival: true,
        'morning-prep': true,
        departure: true,
        'lunch-break': true,
        'dinner-rest': true,
        icebreaker: true
    };

    var COURSE_TEXT_HINTS = /上课|Session|教授|嘉宾|辅导|展览|博物馆|晚自习|自习|答疑/;

    function getCellCategory(cell) {
        if (cell.category === 'course' || cell.category === 'logistics') {
            return cell.category;
        }
        if (cell.syllabusKey && LOGISTICS_KEYS[cell.syllabusKey]) {
            return 'logistics';
        }
        if (cell.text && COURSE_TEXT_HINTS.test(cell.text)) {
            return 'course';
        }
        if (cell.syllabusKey === 'gamepress-visit') {
            return 'course';
        }
        return 'course';
    }

    function formatCellLabel(text) {
        return String(text || '').replace(/\s*\n+\s*/g, ' / ');
    }

    function formatCompactTime(time) {
        return String(time || '').replace(/:00/g, '');
    }

    function cellContentKey(cell) {
        if (cell.syllabusKey) return cell.syllabusKey;
        return formatCellLabel(cell.text).trim();
    }

    function buildOfflineTierMaps(offline) {
        var freqByCategory = { course: {}, logistics: {} };
        offline.rows.forEach(function (row) {
            if (!row.cells) return;
            row.cells.forEach(function (cell) {
                if (!cell || !cell.text) return;
                var category = getCellCategory(cell);
                var key = cellContentKey(cell);
                freqByCategory[category][key] = (freqByCategory[category][key] || 0) + 1;
            });
        });

        var tierMaps = { course: {}, logistics: {} };
        ['course', 'logistics'].forEach(function (cat) {
            var freqs = freqByCategory[cat];
            var uniqueCounts = [];
            Object.keys(freqs).forEach(function (k) {
                var c = freqs[k];
                if (uniqueCounts.indexOf(c) === -1) uniqueCounts.push(c);
            });
            uniqueCounts.sort(function (a, b) {
                return b - a;
            });
            var countToTier = {};
            uniqueCounts.forEach(function (c, i) {
                countToTier[c] = Math.min(i, 3);
            });
            Object.keys(freqs).forEach(function (k) {
                tierMaps[cat][k] = countToTier[freqs[k]];
            });
        });

        return { freqByCategory: freqByCategory, tierMaps: tierMaps };
    }

    function setCellContent(el, text) {
        if (!text) return;
        if (text.indexOf('\n') !== -1) {
            el.innerHTML = text.split('\n').map(function (line) {
                return escapeHtml(line.trim());
            }).filter(Boolean).join('<br>');
        } else {
            el.textContent = text;
        }
    }

    function setOfflineCellContent(el, text, cell) {
        var isModule2Professor = cell && /^module2-day[2-5]-(am|pm)$/.test(cell.syllabusKey || '');
        var lines = String(text || '').split('\n').map(function (line) {
            return line.trim();
        }).filter(Boolean);

        if (!isModule2Professor || lines.length < 2) {
            setCellContent(el, text);
            return;
        }

        var title = document.createElement('span');
        title.className = 'ss-schedule-cell__title';
        title.textContent = lines[0];

        var subtitle = document.createElement('span');
        subtitle.className = 'ss-schedule-cell__subtitle';
        subtitle.textContent = lines.slice(1).join(' ');

        el.appendChild(title);
        el.appendChild(subtitle);
    }

    function buildRowSpanCoverage(rows) {
        var covered = {};
        rows.forEach(function (row, rowIdx) {
            if (!row.cells) return;
            row.cells.forEach(function (cell, colIdx) {
                var span = cell && cell.rowSpan;
                if (!span || span < 2) return;
                for (var offset = 1; offset < span; offset += 1) {
                    covered[(rowIdx + offset) + ':' + colIdx] = true;
                }
            });
        });
        return covered;
    }

    function buildColSpanCoverage(rows) {
        var covered = {};
        rows.forEach(function (row, rowIdx) {
            if (!row.cells) return;
            row.cells.forEach(function (cell, colIdx) {
                var span = cell && cell.colSpan;
                if (!span || span < 2) return;
                for (var offset = 1; offset < span; offset += 1) {
                    covered[rowIdx + ':' + (colIdx + offset)] = true;
                }
            });
        });
        return covered;
    }

    function applyOfflineCellClasses(td, cell, tierMaps) {
        var category = getCellCategory(cell);
        td.classList.add('ss-schedule-cell--' + category);
        var tier = tierMaps[category][cellContentKey(cell)];
        if (tier !== undefined) {
            td.classList.add('ss-schedule-cell--' + category + '-tier-' + tier);
        }
        if (cell.rowSpan && cell.rowSpan > 1) {
            td.classList.add('ss-schedule-cell--merged');
            td.rowSpan = cell.rowSpan;
        }
        if (cell.colSpan && cell.colSpan > 1) {
            td.classList.add('ss-schedule-cell--merged');
            td.colSpan = cell.colSpan;
        }
    }

    function getSyllabusBody(data, key) {
        var svc = i18n();
        if (svc && key) {
            var translated = svc.syllabusBody(key);
            if (translated) return translated;
        }
        if (!key || !data.syllabus || !data.syllabus[key]) return '';
        return data.syllabus[key].body || '';
    }

    function getCellDisplayText(cell) {
        if (!cell) return '';
        var svc = i18n();
        if (svc && cell.syllabusKey) {
            var label = svc.cellLabel(cell.syllabusKey);
            if (label) return label;
        }
        return cell.text || '';
    }

    function getOnlineTitle(item) {
        var svc = i18n();
        if (svc && item.syllabusKey) {
            var title = svc.onlineTitle(item.syllabusKey);
            if (title) return title;
        }
        return item.title || '';
    }

    function getWeekdayLabel(weekdayZh) {
        var svc = i18n();
        var key = WEEKDAY_MAP[weekdayZh];
        if (svc && key) {
            var label = svc.weekdayLabel(key);
            if (label) return label;
        }
        return weekdayZh || '';
    }

    function bindInteractiveCell(el, title, body, bodyKey) {
        if (!title || el._ssScheduleBound) return;
        el._ssScheduleBound = true;
        el.classList.add('ss-schedule-cell--interactive');
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', title + t('schedule.ui.cellHint', ''));

        el.addEventListener('mousedown', stopRevealNav);
        el.addEventListener('touchstart', stopRevealNav, { passive: true });
        el.addEventListener('click', function (e) {
            stopRevealNav(e);
            var currentTitle = el.getAttribute('data-ss-title') || title;
            var currentBody = bodyKey ? getSyllabusBody(cachedData, bodyKey) : body;
            if (open && activeCell === el) {
                closeModal();
            } else {
                openModal(currentTitle, currentBody, el, {
                    title: currentTitle,
                    bodyKey: bodyKey,
                    body: currentBody
                });
            }
        });
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                stopRevealNav(e);
                e.preventDefault();
                var currentTitle = el.getAttribute('data-ss-title') || title;
                var currentBody = bodyKey ? getSyllabusBody(cachedData, bodyKey) : body;
                openModal(currentTitle, currentBody, el, {
                    title: currentTitle,
                    bodyKey: bodyKey,
                    body: currentBody
                });
            } else if (e.key === 'Escape' && open) {
                e.stopPropagation();
                closeModal();
            } else {
                stopRevealNavKeys(e);
            }
        });
    }

    function renderOnlineTable(root, data) {
        var wrap = document.createElement('div');
        wrap.className = 'ss-schedule-online';
        wrap.setAttribute('data-i18n-attrs', 'aria-label:schedule.ui.online.aria');

        var label = document.createElement('p');
        label.className = 'ss-schedule-section-label';
        label.setAttribute('data-i18n', 'schedule.ui.online.label');
        wrap.appendChild(label);

        var strip = document.createElement('div');
        strip.className = 'ss-schedule-online-strip';
        strip.setAttribute('role', 'list');

        data.online.forEach(function (item) {
            var card = document.createElement('button');
            card.type = 'button';
            card.className = 'ss-schedule-online-card ss-schedule-cell ss-schedule-cell--interactive';
            card.setAttribute('role', 'listitem');
            var title = getOnlineTitle(item);
            var body = getSyllabusBody(data, item.syllabusKey);
            card.setAttribute('data-ss-title', title);
            card.setAttribute('data-ss-body-key', item.syllabusKey || '');
            card.innerHTML =
                '<span class="ss-schedule-online-card__date">' + escapeHtml(item.date) + '</span>' +
                '<span class="ss-schedule-online-card__time">' + escapeHtml(item.time) + '</span>' +
                '<span class="ss-schedule-online-card__title">' + escapeHtml(title) + '</span>';
            bindInteractiveCell(card, title, body, item.syllabusKey);
            strip.appendChild(card);
        });

        wrap.appendChild(strip);
        root.appendChild(wrap);
    }

    function renderOfflineGrid(root, data) {
        var offline = data.offline;
        if (!offline) return;

        var wrap = document.createElement('div');
        wrap.className = 'ss-schedule-offline';
        wrap.setAttribute('data-i18n-attrs', 'aria-label:schedule.ui.offline.aria');

        var label = document.createElement('p');
        label.className = 'ss-schedule-section-label';
        label.setAttribute('data-i18n', 'schedule.ui.offline.label');
        wrap.appendChild(label);

        var desc = document.createElement('p');
        desc.className = 'ss-schedule-offline-desc';
        desc.setAttribute('data-i18n', 'schedule.ui.offline.desc');
        wrap.appendChild(desc);

        var scroll = document.createElement('div');
        scroll.className = 'ss-schedule-grid-scroll';

        var table = document.createElement('table');
        table.className = 'ss-schedule-table ss-schedule-table--offline';

        var thead = document.createElement('thead');
        var headRow = document.createElement('tr');
        var corner = document.createElement('th');
        corner.scope = 'col';
        corner.className = 'ss-schedule-time-col';
        corner.setAttribute('data-i18n', 'schedule.ui.timeCol');
        headRow.appendChild(corner);

        offline.dayHeaders.forEach(function (day) {
            var th = document.createElement('th');
            th.scope = 'col';
            th.innerHTML = '<span class="ss-schedule-day-date">' + escapeHtml(day.date) + '</span>' +
                '<span class="ss-schedule-day-week">' + escapeHtml(getWeekdayLabel(day.weekday)) + '</span>';
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        var rowSpanCoverage = buildRowSpanCoverage(offline.rows);
        var colSpanCoverage = buildColSpanCoverage(offline.rows);
        var tierData = buildOfflineTierMaps(offline);

        offline.rows.forEach(function (row, rowIdx) {
            var tr = document.createElement('tr');

            var timeTd = document.createElement('th');
            timeTd.scope = 'row';
            timeTd.className = 'ss-schedule-time-col';
            timeTd.textContent = formatCompactTime(row.time);
            tr.appendChild(timeTd);

            row.cells.forEach(function (cell, colIdx) {
                if (rowSpanCoverage[rowIdx + ':' + colIdx] || colSpanCoverage[rowIdx + ':' + colIdx]) {
                    return;
                }

                var td = document.createElement('td');
                td.className = 'ss-schedule-cell';
                if (cell && cell.text) {
                    var displayText = getCellDisplayText(cell);
                    setOfflineCellContent(td, displayText, cell);
                    applyOfflineCellClasses(td, cell, tierData.tierMaps);
                    var body = getSyllabusBody(data, cell.syllabusKey);
                    var cellTitle = formatCellLabel(displayText);
                    td.setAttribute('data-ss-title', cellTitle);
                    td.setAttribute('data-ss-body-key', cell.syllabusKey || '');
                    bindInteractiveCell(td, cellTitle, body, cell.syllabusKey);
                } else {
                    td.classList.add('ss-schedule-cell--empty');
                    td.setAttribute('aria-hidden', 'true');
                }
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        scroll.appendChild(table);
        wrap.appendChild(scroll);
        root.appendChild(wrap);
    }

    function renderSchedule(root, data, mode) {
        root.innerHTML = '';
        root.classList.add('is-rendered');
        if (mode === 'online' || mode === 'both') {
            renderOnlineTable(root, data);
        }
        if (mode === 'offline' || mode === 'both') {
            renderOfflineGrid(root, data);
        }
        if (i18n()) {
            i18n().apply(root);
        }
    }

    function rerenderAll() {
        if (!cachedData) return;
        document.querySelectorAll('[data-ss-schedule-root].is-rendered').forEach(function (root) {
            var slide = root.closest('[data-ss-schedule]');
            if (!slide) return;
            var wasActive = activeCell && root.contains(activeCell);
            var meta = activeModalMeta;
            renderSchedule(root, cachedData, getScheduleMode(slide));
            if (wasActive && meta && meta.bodyKey) {
                var selector = '[data-ss-body-key="' + meta.bodyKey + '"]';
                var nextCell = root.querySelector(selector);
                if (nextCell) {
                    activeCell = nextCell;
                    activeCell.classList.add('is-active');
                }
            }
        });
        refreshOpenModal();
        if (overlay && i18n()) {
            i18n().apply(overlay);
        }
    }

    function getScheduleMode(slide) {
        return slide.getAttribute('data-ss-schedule-mode') || 'online';
    }

    function bindNavBlock(root) {
        if (!root || root._ssNavBlock) return;
        root._ssNavBlock = true;
        ['mousedown', 'touchstart'].forEach(function (evt) {
            root.addEventListener(evt, stopRevealNav, evt === 'touchstart' ? { passive: true } : false);
        });
    }

    function initSlide(slide) {
        if (!slide) return;
        var root = slide.querySelector('[data-ss-schedule-root]');
        if (!root) return;

        bindNavBlock(root);
        ensureOverlay();

        if (root.classList.contains('is-rendered')) return;

        fetchData()
            .then(function (data) {
                if (!slide.isConnected) return;
                renderSchedule(root, data, getScheduleMode(slide));
            })
            .catch(function (err) {
                console.error('[SS Schedule]', err);
                root.innerHTML = '<p class="ss-schedule-error" data-i18n="schedule.ui.error"></p>';
                if (i18n()) i18n().apply(root);
            });
    }

    function resetSlide() {
        closeModal();
    }

    global.document.addEventListener('keydown', function (e) {
        if (open && e.key === 'Escape') {
            e.stopPropagation();
            closeModal();
        }
    }, true);

    global.document.addEventListener('ss-locale-change', function () {
        rerenderAll();
    });

    global.SummerSchedule = {
        initSlide: initSlide,
        reset: resetSlide,
        rerenderAll: rerenderAll
    };
})(window);
