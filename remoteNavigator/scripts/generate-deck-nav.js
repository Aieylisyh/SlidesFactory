#!/usr/bin/env node
/**
 * Generate deck-nav.json from index.html + share-pages.json + outline.md agenda.
 * Usage: node remoteNavigator/scripts/generate-deck-nav.js [--deck ../index.html]
 */
'use strict';

var fs = require('fs');
var path = require('path');
var focusProfiles = require('./focus-profiles');

var ROOT = path.resolve(__dirname, '..', '..');
var OUT_DIR = path.resolve(__dirname, '..');

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseAgendaChapters(outlineText) {
    var chapters = [];
    var inTable = false;
    outlineText.split(/\r?\n/).forEach(function (line) {
        if (/^\|\s*议程序号/.test(line)) {
            inTable = true;
            return;
        }
        if (!inTable) return;
        if (!/^\|/.test(line)) {
            inTable = false;
            return;
        }
        if (/^\|\s*-/.test(line)) return;
        var cells = line.split('|').map(function (c) { return c.trim(); }).filter(Boolean);
        if (cells.length < 3) return;
        var agendaIndex = parseInt(cells[0], 10);
        if (isNaN(agendaIndex)) return;
        chapters.push({
            agendaIndex: agendaIndex,
            title: cells[1],
            id: cells[2].replace(/`/g, '')
        });
    });
    return chapters;
}

function parseSectionTag(tag) {
    var idMatch = tag.match(/\bid="([^"]+)"/);
    var classMatch = tag.match(/\bclass="([^"]+)"/);
    var attrs = {};
    var dataRe = /\b(data-[\w-]+)(?:="([^"]*)")?/g;
    var dm;
    while ((dm = dataRe.exec(tag)) !== null) {
        attrs[dm[1]] = dm[2] !== undefined ? dm[2] : '';
    }
    return {
        id: idMatch ? idMatch[1] : null,
        className: classMatch ? classMatch[1] : '',
        attrs: attrs
    };
}

function extractSlidesRegion(html) {
    var start = html.indexOf('<div class="slides">');
    if (start === -1) throw new Error('slides container not found');
    var scriptIdx = html.indexOf('<script', start);
    if (scriptIdx === -1) scriptIdx = html.length;
    return html.slice(start, scriptIdx);
}

function buildSectionTree(slidesHtml) {
    var root = { children: [] };
    var stack = [root];
    var re = /<\/?section(\s[^>]*)?\s*>/gi;
    var match;

    while ((match = re.exec(slidesHtml)) !== null) {
        var isClose = match[0].indexOf('</') === 0;
        if (isClose) {
            if (stack.length > 1) stack.pop();
            continue;
        }
        var attrs = parseSectionTag(match[0]);
        var node = { attrs: attrs, children: [] };
        stack[stack.length - 1].children.push(node);
        stack.push(node);
    }
    return root;
}

function classifyKind(className, id) {
    if (className.indexOf('title-slide') !== -1) return 'cover';
    if (className.indexOf('section-opener') !== -1) return 'opener';
    if (className.indexOf('slide-closing') !== -1) return 'closing';
    if (id === 'agenda') return 'agenda';
    return 'content';
}

function flattenRevealSlides(treeRoot) {
    var slides = [];
    var linearIndex = 0;

    treeRoot.children.forEach(function (group) {
        var nested = group.children.filter(function (c) {
            return c.children.length > 0 || c.attrs.id;
        });
        var isVerticalStack = group.children.length > 1 && !group.attrs.id;

        if (isVerticalStack) {
            var h = slides.length > 0 ? slides[slides.length - 1].h + 1 : 0;
            if (slides.length === 0) h = 0;
            var lastH = slides.length ? slides[slides.length - 1].h : -1;
            h = lastH + 1;

            group.children.forEach(function (child, v) {
                if (!child.attrs.id) return;
            slides.push({
                index: linearIndex++,
                h: h,
                v: v,
                id: child.attrs.id,
                className: child.attrs.className,
                attrs: child.attrs.attrs || {},
                kind: classifyKind(child.attrs.className, child.attrs.id)
            });
            });
        } else if (group.attrs.id) {
            var hIdx = slides.length ? slides[slides.length - 1].h + 1 : 0;
            slides.push({
                index: linearIndex++,
                h: hIdx,
                v: 0,
                id: group.attrs.id,
                className: group.attrs.className,
                attrs: group.attrs.attrs || {},
                kind: classifyKind(group.attrs.className, group.attrs.id)
            });
        }
    });

    return slides;
}

function assignChapterIds(slides, agendaChapters) {
    var openers = agendaChapters.map(function (ch) { return ch.id; });
    var currentChapter = null;

    slides.forEach(function (slide) {
        if (openers.indexOf(slide.id) !== -1) {
            currentChapter = slide.id;
        }
        slide.chapterId = currentChapter;
    });
}

function buildShareTitleMap(sharePages) {
    var map = {};
    Object.keys(sharePages.pages || {}).forEach(function (slug) {
        var page = sharePages.pages[slug];
        if (page.slideId) {
            map[page.slideId] = { title: page.title, shareSlug: slug };
        }
    });
    return map;
}

function buildChapters(slides, agendaChapters) {
    return agendaChapters.map(function (ch) {
        var startSlide = slides.find(function (s) { return s.id === ch.id; });
        return {
            id: ch.id,
            title: ch.title,
            agendaIndex: ch.agendaIndex,
            startIndex: startSlide ? startSlide.index : null
        };
    }).filter(function (ch) { return ch.startIndex !== null; });
}

function deriveDeckId(deckRel) {
    var normalized = deckRel.replace(/\\/g, '/');
    var dir = path.posix.dirname(normalized);
    if (dir === '.' || dir === '') {
        return path.basename(normalized, path.extname(normalized));
    }
    return dir.split('/').filter(Boolean).join('-');
}

function resolveDeckAssets(deckRel) {
    var deckPath = path.resolve(ROOT, deckRel);
    var deckDir = path.dirname(deckPath);
    var sharePath = path.join(deckDir, 'share-pages.json');
    if (!fs.existsSync(sharePath)) {
        sharePath = path.resolve(ROOT, 'share-pages.json');
    }
    var outlinePath = path.join(deckDir, 'outline.md');
    if (!fs.existsSync(outlinePath)) {
        outlinePath = path.resolve(ROOT, 'outline.md');
    }
    var deckId = deriveDeckId(deckRel);
    var navFile = deckId === 'index' ? 'deck-nav.json' : 'deck-nav-' + deckId + '.json';
    return {
        deckPath: deckPath,
        sharePath: sharePath,
        outlinePath: outlinePath,
        deckId: deckId,
        navFile: navFile
    };
}

function main() {
    var deckArg = process.argv.indexOf('--deck');
    var deckRel = deckArg !== -1 ? process.argv[deckArg + 1] : 'index.html';
    var assets = resolveDeckAssets(deckRel);
    var outArg = process.argv.indexOf('--out');
    var outFile = outArg !== -1 ? process.argv[outArg + 1] : assets.navFile;

    var html = fs.readFileSync(assets.deckPath, 'utf8');
    var sharePages = readJson(assets.sharePath);
    var outline = fs.readFileSync(assets.outlinePath, 'utf8');
    var agendaChapters = parseAgendaChapters(outline);

    var titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    var deckTitle = titleMatch ? titleMatch[1].trim() : 'Deck';

    var tree = buildSectionTree(extractSlidesRegion(html));
    var slides = flattenRevealSlides(tree);
    var titleMap = buildShareTitleMap(sharePages);

    assignChapterIds(slides, agendaChapters);
    focusProfiles.attachFocusToSlides(slides);

    slides.forEach(function (slide) {
        var meta = titleMap[slide.id];
        slide.title = meta ? meta.title : slide.id;
        if (meta) slide.shareSlug = meta.shareSlug;
    });

    var deckId = assets.deckId;

    var output = {
        version: 2,
        deckId: deckId,
        deckTitle: deckTitle,
        deckPath: deckRel.replace(/\\/g, '/'),
        navFile: outFile.replace(/\\/g, '/'),
        generatedAt: new Date().toISOString(),
        linear: true,
        totalSlides: slides.length,
        chapters: buildChapters(slides, agendaChapters),
        slides: slides
    };

    var outPath = path.join(OUT_DIR, path.basename(outFile));
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
    console.log('[generate-deck-nav] wrote ' + slides.length + ' slides → ' + outPath);
}

main();
