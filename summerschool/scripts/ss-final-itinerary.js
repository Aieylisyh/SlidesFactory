/**
 * Summerschool deck — Final Itinerary table renderer (i18n-aware).
 */
(function (global) {
    'use strict';

    var container = null;

    function loc(obj) {
        if (!obj) return '';
        var locale = SummerI18n.getLocale();
        if (obj[locale] != null) return obj[locale];
        return obj.en != null ? obj.en : (obj.ja || obj.zh || '');
    }

    function renderCell(cellData) {
        if (!cellData) return '';
        var type = cellData.type || 'work';
        var html = '<td class="ss-fi-cell ss-fi-cell--' + type + '"';
        if (cellData.colspan > 1) {
            html += ' colspan="' + cellData.colspan + '"';
        }
        html += '>';
        if (cellData.title) {
            var strongClass = cellData.strongTitle ? 'ss-fi-cell-strong' : '';
            html += '<p class="' + strongClass + '">' + loc(cellData.title) + '</p>';
        }
        if (cellData.sub) {
            html += '<p class="ss-fi-cell-sub">' + loc(cellData.sub) + '</p>';
        }
        if (cellData.items && cellData.items.length) {
            for (var i = 0; i < cellData.items.length; i += 1) {
                html += '<p class="ss-fi-cell-sub">' + loc(cellData.items[i]) + '</p>';
            }
        }
        if (cellData.note) {
            html += '<p class="ss-fi-cell-sub ss-fi-note">' + loc(cellData.note) + '</p>';
        }
        html += '</td>';
        return html;
    }

    function render() {
        if (!container) return;
        var days = SummerI18n.finalItineraryDays ? SummerI18n.finalItineraryDays() : [];
        if (!days || !days.length) return;
        var rows = '';

        for (var i = 0; i < days.length; i += 1) {
            var day = days[i];
            rows += '<tr>';
            rows += '<td class="ss-fi-date-cell"><span class="ss-fi-day">' + day.date + '</span><span class="ss-fi-day-tag">' + loc(day.weekday) + '</span></td>';

            if (day.morningAfternoon) {
                var merged = {
                    type: day.morningAfternoon.type,
                    title: day.morningAfternoon.title,
                    items: day.morningAfternoon.items,
                    strongTitle: true,
                    colspan: 2
                };
                rows += renderCell(merged);
            } else {
                rows += renderCell(day.morning);
                rows += renderCell(day.afternoon);
            }
            rows += renderCell(day.evening);
            rows += '</tr>';
        }

        container.querySelector('tbody').innerHTML = rows;

        var h2 = document.querySelector('.slide-ss-final-itinerary h2');
        if (h2 && SummerI18n.t) {
            h2.textContent = SummerI18n.t('finalItinerary.title', h2.textContent);
        }
        var disclaimer = document.querySelector('.slide-ss-final-itinerary .disclaimer-note');
        if (disclaimer && SummerI18n.t) {
            disclaimer.innerHTML = SummerI18n.t('finalItinerary.disclaimer', disclaimer.innerHTML);
        }

        var ths = container.querySelectorAll('thead th');
        if (ths.length === 4 && SummerI18n.t) {
            ths[0].textContent = SummerI18n.t('finalItinerary.header.date', ths[0].textContent);
            ths[1].textContent = SummerI18n.t('finalItinerary.header.morning', ths[1].textContent);
            ths[2].textContent = SummerI18n.t('finalItinerary.header.afternoon', ths[2].textContent);
            ths[3].textContent = SummerI18n.t('finalItinerary.header.evening', ths[3].textContent);
        }
    }

    function init() {
        container = document.querySelector('.ss-final-itinerary-wrapper');
        if (!container) return;

        if (typeof SummerI18n !== 'undefined' && SummerI18n.whenReady) {
            SummerI18n.whenReady(render);
            document.addEventListener('ss-locale-change', render);
        } else {
            render();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    global.SummerFinalItinerary = {
        render: render
    };
})(window);
