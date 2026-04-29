/* =========================================================
   Brain Challenge Arcade - app.js
   Global application logic

   
   - Initialize defaults
   - Apply saved settings: theme, sound, motion
   - Sync header badges: story and achievements
   - Mobile menu improvements
   - Global website click sound
   - Expose global BCA helpers
   - Expose leaderboard save helper for all games

   Important:
   This file is safe to load on root pages and game pages.
========================================================= */

(function() {
    "use strict";

    /* ---------------------------------------------------------
       Safe localStorage helpers
    --------------------------------------------------------- */

    function safeGet(key, fallback) {
        try {
            var value = localStorage.getItem(key);
            return value === null ? fallback : value;
        } catch (e) {
            return fallback;
        }
    }

    function safeSet(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {}
    }

    function safeRemove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {}
    }

    function safeJsonGet(key, fallback) {
        try {
            var raw = localStorage.getItem(key);

            if (!raw) {
                return fallback;
            }

            return JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    }

    function safeJsonSet(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {}
    }

    function todayISO() {
        var d = new Date();
        var yyyy = d.getFullYear();
        var mm = String(d.getMonth() + 1).padStart(2, "0");
        var dd = String(d.getDate()).padStart(2, "0");

        return yyyy + "-" + mm + "-" + dd;
    }

    function clampInt(value, min, max) {
        var n = Math.trunc(Number(value));

        if (!Number.isFinite(n)) {
            return min;
        }

        return Math.max(min, Math.min(max, n));
    }

    /* ---------------------------------------------------------
       Global Keys
    --------------------------------------------------------- */

    var KEYS = {
        username: "bca_username",
        totalPlays: "bca_totalPlays",
        achievementsCount: "bca_achievementsCount",
        storyProgress: "bca_story_progress",
        theme: "bca_theme",
        sound: "bca_sound",
        reducedMotion: "bca_motion"
    };

    /* ---------------------------------------------------------
       Game / Leaderboard Config
    --------------------------------------------------------- */

    var GAME_KEYS = {
        "image-guess": {
            label: "Image Guess",
            bestKey: "bca_best_imageGuess",
            runsKey: "bca_runs_imageGuess",
            progressKey: "bca_progress_imageGuess",
            levelCapKey: "bca_levelcap_imageGuess",
            betterIs: "high",
            valueLabel: "Score"
        },

        "memory-test": {
            label: "Memory Test",
            bestKey: "bca_best_memoryTest",
            runsKey: "bca_runs_memoryTest",
            progressKey: "bca_progress_memoryTest",
            levelCapKey: "bca_levelcap_memoryTest",
            betterIs: "high",
            valueLabel: "Level"
        },

        "card-matching": {
            label: "Card Matching",
            bestKey: "bca_best_cardMatching",
            runsKey: "bca_runs_cardMatching",
            progressKey: "bca_progress_cardMatching",
            levelCapKey: "bca_levelcap_cardMatching",
            betterIs: "high",
            valueLabel: "Score"
        },

        "color-bubble-challenge": {
            label: "Color Bubble Challenge",
            bestKey: "bca_best_colorBubbleChallenge",
            runsKey: "bca_runs_colorBubbleChallenge",
            progressKey: "bca_progress_colorBubbleChallenge",
            levelCapKey: "bca_levelcap_colorBubbleChallenge",
            betterIs: "high",
            valueLabel: "Score"
        },

        "story-mode": {
            label: "Story Mode",
            bestKey: "bca_best_storyMode",
            runsKey: "bca_runs_storyMode",
            progressKey: "bca_story_progress",
            levelCapKey: "",
            betterIs: "high",
            valueLabel: "Progress"
        }
    };

    /* ---------------------------------------------------------
       Click Sound
    --------------------------------------------------------- */

    var audioCtx = null;

    function isSoundEnabled() {
        return safeGet(KEYS.sound, "on") !== "off";
    }

    function getAudioContext() {
        if (!window.AudioContext && !window.webkitAudioContext) {
            return null;
        }

        if (!audioCtx) {
            var Ctx = window.AudioContext || window.webkitAudioContext;
            audioCtx = new Ctx();
        }

        return audioCtx;
    }

    function unlockAudioContext() {
        var ctx = getAudioContext();

        if (!ctx) {
            return;
        }

        if (ctx.state === "suspended") {
            ctx.resume().catch(function() {});
        }
    }

    function playClickSound() {
        if (!isSoundEnabled()) {
            return;
        }

        var ctx = getAudioContext();

        if (!ctx) {
            return;
        }

        if (ctx.state === "suspended") {
            ctx.resume().catch(function() {});
        }

        try {
            var now = ctx.currentTime;

            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            var filter = ctx.createBiquadFilter();

            osc.type = "triangle";
            osc.frequency.setValueAtTime(950, now);
            osc.frequency.exponentialRampToValueAtTime(520, now + 0.045);

            filter.type = "lowpass";
            filter.frequency.setValueAtTime(1800, now);

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(0.09, now + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.06);
        } catch (e) {}
    }

    function shouldPlayClickSound(target) {
        if (!target || !target.closest) {
            return false;
        }

        var clickable = target.closest(
            "button, a, [role='button'], input[type='button'], input[type='submit'], input[type='reset'], .btn, .button, .btn-arcade, .play, .icon-btn, .nav-link"
        );

        if (!clickable) {
            return false;
        }

        if (clickable.disabled) {
            return false;
        }

        if (clickable.getAttribute("aria-disabled") === "true") {
            return false;
        }

        return true;
    }

    function initGlobalClickSound() {
        if (document.documentElement._bcaClickSoundWired) {
            return;
        }

        document.documentElement._bcaClickSoundWired = true;

        document.addEventListener("pointerdown", function(e) {
            unlockAudioContext();

            if (shouldPlayClickSound(e.target)) {
                playClickSound();
            }
        }, true);

        document.addEventListener("keydown", function(e) {
            if (e.key !== "Enter" && e.key !== " ") {
                return;
            }

            unlockAudioContext();

            if (shouldPlayClickSound(document.activeElement)) {
                playClickSound();
            }
        }, true);
    }

    /* ---------------------------------------------------------
       Initialize defaults
    --------------------------------------------------------- */

    function initDefaults() {
        if (safeGet(KEYS.username, null) === null) {
            safeSet(KEYS.username, "Guest");
        }

        if (safeGet(KEYS.totalPlays, null) === null) {
            safeSet(KEYS.totalPlays, "0");
        }

        if (safeGet(KEYS.achievementsCount, null) === null) {
            safeSet(KEYS.achievementsCount, "0");
        }

        if (safeGet(KEYS.storyProgress, null) === null) {
            safeSet(KEYS.storyProgress, "0");
        }

        if (safeGet(KEYS.theme, null) === null) {
            safeSet(KEYS.theme, "system");
        }

        if (safeGet(KEYS.sound, null) === null) {
            safeSet(KEYS.sound, "on");
        }

        if (safeGet(KEYS.reducedMotion, null) === null) {
            safeSet(KEYS.reducedMotion, "off");
        }
    }

    /* ---------------------------------------------------------
       Theme / Motion / Sound
    --------------------------------------------------------- */

    function applyTheme(theme) {
        var root = document.documentElement;

        root.removeAttribute("data-theme");
        root.classList.remove("theme-light", "theme-dark");

        if (theme === "light" || theme === "dark") {
            root.setAttribute("data-theme", theme);
            root.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
            return;
        }

        var prefersDark = false;

        if (window.matchMedia) {
            prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        }

        root.setAttribute("data-theme", prefersDark ? "dark" : "light");
        root.classList.add(prefersDark ? "theme-dark" : "theme-light");
    }

    function applyMotion(reduced) {
        document.documentElement.setAttribute("data-reduced-motion", reduced ? "true" : "false");
    }

    function applySound(on) {
        document.documentElement.setAttribute("data-sound", on ? "on" : "off");
    }

    function initSettings() {
        var theme = safeGet(KEYS.theme, "system");
        var sound = safeGet(KEYS.sound, "on");
        var motion = safeGet(KEYS.reducedMotion, "off");

        applyTheme(theme);
        applySound(sound !== "off");
        applyMotion(motion === "on");

        if (window.matchMedia) {
            var mq = window.matchMedia("(prefers-color-scheme: dark)");

            if (mq.addEventListener) {
                mq.addEventListener("change", function() {
                    if (safeGet(KEYS.theme, "system") === "system") {
                        applyTheme("system");
                    }
                });
            } else if (mq.addListener) {
                mq.addListener(function() {
                    if (safeGet(KEYS.theme, "system") === "system") {
                        applyTheme("system");
                    }
                });
            }
        }
    }

    /* ---------------------------------------------------------
       Header badge sync
    --------------------------------------------------------- */

    function updateHeaderBadges() {
        var story = Number(safeGet(KEYS.storyProgress, "0")) || 0;
        var ach = Number(safeGet(KEYS.achievementsCount, "0")) || 0;

        var storyBadge = document.getElementById("storyBadge");

        if (storyBadge) {
            storyBadge.textContent = story + "%";
        }

        var achBadge = document.getElementById("achBadge");

        if (achBadge) {
            achBadge.textContent = String(ach);
        }
    }

    /* ---------------------------------------------------------
       Auto highlight current nav link
    --------------------------------------------------------- */

    function highlightActiveNav() {
        var links = document.querySelectorAll(".nav-link");
        var path = location.pathname.split("/").pop() || "index.html";

        links.forEach(function(link) {
            var href = link.getAttribute("href");

            if (!href) {
                return;
            }

            var cleanHref = href.split("#")[0].split("?")[0];

            if (cleanHref === path) {
                link.classList.add("nav-active");

                if (!link.hasAttribute("aria-current")) {
                    link.setAttribute("aria-current", "page");
                }
            }
        });
    }

    /* ---------------------------------------------------------
       Mobile menu auto-close on link click
    --------------------------------------------------------- */

    function enhanceMobileMenu() {
        var menu = document.getElementById("mobileMenu");

        if (!menu) {
            return;
        }

        menu.querySelectorAll("a").forEach(function(a) {
            a.addEventListener("click", function() {
                menu.classList.add("hidden");

                var toggle = document.querySelector(".nav-toggle");

                if (toggle) {
                    toggle.setAttribute("aria-expanded", "false");
                }
            });
        });
    }

    /* ---------------------------------------------------------
       Toast helper
    --------------------------------------------------------- */

    function showToast(message, timeout) {
        if (timeout === undefined) {
            timeout = 1600;
        }

        var toast = document.getElementById("bcaToast");

        if (!toast) {
            toast = document.createElement("div");
            toast.id = "bcaToast";
            toast.className = "toast";
            toast.setAttribute("role", "status");
            toast.setAttribute("aria-live", "polite");
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add("toast-show");

        clearTimeout(toast._t);

        toast._t = setTimeout(function() {
            toast.classList.remove("toast-show");
        }, timeout);
    }

    /* ---------------------------------------------------------
       Total plays increment
    --------------------------------------------------------- */

    function incrementTotalPlays() {
        var current = Number(safeGet(KEYS.totalPlays, "0")) || 0;
        safeSet(KEYS.totalPlays, String(current + 1));
    }

    /* ---------------------------------------------------------
       Leaderboard Helpers
    --------------------------------------------------------- */

    function normalizeGameId(gameId) {
        gameId = String(gameId || "").trim();

        var aliases = {
            imageGuess: "image-guess",
            image_guess: "image-guess",
            image: "image-guess",

            memoryTest: "memory-test",
            memory_test: "memory-test",
            memory: "memory-test",

            cardMatching: "card-matching",
            card_matching: "card-matching",
            matching: "card-matching",
            memoryCards: "card-matching",
            memory_cards: "card-matching",

            colorBubbleChallenge: "color-bubble-challenge",
            color_bubble_challenge: "color-bubble-challenge",
            colorBubble: "color-bubble-challenge",
            color_bubble: "color-bubble-challenge",

            storyMode: "story-mode",
            story_mode: "story-mode",
            story: "story-mode"
        };

        return aliases[gameId] || gameId;
    }

    function getBestValue(bestKey) {
        var raw = safeGet(bestKey, "");

        if (!raw) {
            return null;
        }

        try {
            var obj = JSON.parse(raw);

            if (obj && typeof obj === "object" && Number.isFinite(Number(obj.value))) {
                return Number(obj.value);
            }
        } catch (e) {}

        var n = Number(raw);

        return Number.isFinite(n) ? n : null;
    }

    function isBetterScore(meta, candidateValue, currentBestValue) {
        if (!Number.isFinite(candidateValue)) {
            return false;
        }

        if (!Number.isFinite(currentBestValue)) {
            return true;
        }

        return meta.betterIs === "low" ?
            candidateValue < currentBestValue :
            candidateValue > currentBestValue;
    }

    function normalizeRun(meta, data) {
        data = data || {};

        var value = Number(data.value);

        if (!Number.isFinite(value)) {
            return null;
        }

        var level = Number(data.level);
        var stars = Number(data.stars);
        var combo = Number(data.combo);
        var moves = Number(data.moves);
        var mistakes = Number(data.mistakes);
        var accuracy = Number(data.accuracy);
        var durationSec = Number(data.durationSec);

        return {
            name: String(data.name || safeGet(KEYS.username, "Guest") || "Guest").trim() || "Guest",
            value: value,
            date: data.date ? String(data.date) : todayISO(),
            level: Number.isFinite(level) ? Math.max(1, Math.trunc(level)) : null,
            stars: Number.isFinite(stars) ? Math.max(0, Math.trunc(stars)) : null,
            combo: Number.isFinite(combo) ? Math.max(0, Math.trunc(combo)) : null,
            moves: Number.isFinite(moves) ? Math.max(0, Math.trunc(moves)) : null,
            mistakes: Number.isFinite(mistakes) ? Math.max(0, Math.trunc(mistakes)) : null,
            accuracy: Number.isFinite(accuracy) ? Math.max(0, Math.min(100, Math.round(accuracy))) : null,
            durationSec: Number.isFinite(durationSec) ? Math.max(0, Math.trunc(durationSec)) : null,
            result: data.result ? String(data.result) : undefined,
            label: meta.valueLabel || "Score"
        };
    }

    function recordRun(gameId, data) {
        gameId = normalizeGameId(gameId);

        var meta = GAME_KEYS[gameId];

        if (!meta || !data) {
            return;
        }

        var run = normalizeRun(meta, data);

        if (!run) {
            return;
        }

        var runs = safeJsonGet(meta.runsKey, []);

        if (!Array.isArray(runs)) {
            runs = [];
        }

        runs.unshift(run);
        safeJsonSet(meta.runsKey, runs.slice(0, 200));

        var oldBestValue = getBestValue(meta.bestKey);

        if (isBetterScore(meta, run.value, oldBestValue)) {
            safeSet(meta.bestKey, JSON.stringify({
                value: run.value,
                date: run.date,
                level: run.level,
                stars: run.stars,
                combo: run.combo,
                moves: run.moves,
                mistakes: run.mistakes,
                accuracy: run.accuracy,
                durationSec: run.durationSec
            }));
        }

        if (run.level !== null && meta.progressKey) {
            var currentLevel = Number(safeGet(meta.progressKey, "0")) || 0;

            if (run.level > currentLevel) {
                safeSet(meta.progressKey, String(run.level));
            }
        }

        try {
            window.dispatchEvent(new Event("bca:leaderboard-updated"));
        } catch (e) {}

        try {
            window.dispatchEvent(new StorageEvent("storage", {
                key: meta.runsKey,
                newValue: JSON.stringify(runs.slice(0, 200))
            }));
        } catch (e) {}
    }

    function getRuns(gameId) {
        gameId = normalizeGameId(gameId);

        var meta = GAME_KEYS[gameId];

        if (!meta) {
            return [];
        }

        var runs = safeJsonGet(meta.runsKey, []);

        return Array.isArray(runs) ? runs : [];
    }

    function getBest(gameId) {
        gameId = normalizeGameId(gameId);

        var meta = GAME_KEYS[gameId];

        if (!meta) {
            return null;
        }

        var raw = safeGet(meta.bestKey, "");

        if (!raw) {
            return null;
        }

        try {
            var obj = JSON.parse(raw);

            if (obj && typeof obj === "object") {
                return obj;
            }
        } catch (e) {}

        var n = Number(raw);

        if (Number.isFinite(n)) {
            return {
                value: n,
                date: todayISO(),
                level: null
            };
        }

        return null;
    }

    function clearGameData(gameId) {
        gameId = normalizeGameId(gameId);

        var meta = GAME_KEYS[gameId];

        if (!meta) {
            return;
        }

        safeRemove(meta.runsKey);
        safeRemove(meta.bestKey);

        if (meta.progressKey) {
            safeRemove(meta.progressKey);
        }

        if (meta.levelCapKey) {
            safeRemove(meta.levelCapKey);
        }

        try {
            window.dispatchEvent(new Event("bca:leaderboard-updated"));
        } catch (e) {}
    }

    function getProgress(gameId) {
        gameId = normalizeGameId(gameId);

        var meta = GAME_KEYS[gameId];

        if (!meta || !meta.progressKey) {
            return 0;
        }

        return Number(safeGet(meta.progressKey, "0")) || 0;
    }

    function setProgress(gameId, level) {
        gameId = normalizeGameId(gameId);

        var meta = GAME_KEYS[gameId];

        if (!meta || !meta.progressKey) {
            return;
        }

        var lv = clampInt(level, 0, 9999);
        var current = getProgress(gameId);

        if (lv > current) {
            safeSet(meta.progressKey, String(lv));
        }
    }

    function getLevelCap(gameId) {
        gameId = normalizeGameId(gameId);

        var meta = GAME_KEYS[gameId];

        if (!meta || !meta.levelCapKey) {
            return 10;
        }

        var cap = Number(safeGet(meta.levelCapKey, ""));

        return Number.isFinite(cap) ? clampInt(cap, 1, 9999) : 10;
    }

    function setLevelCap(gameId, cap) {
        gameId = normalizeGameId(gameId);

        var meta = GAME_KEYS[gameId];

        if (!meta || !meta.levelCapKey) {
            return;
        }

        safeSet(meta.levelCapKey, String(clampInt(cap, 1, 9999)));

        try {
            window.dispatchEvent(new Event("bca:leaderboard-updated"));
        } catch (e) {}
    }

    /* ---------------------------------------------------------
       Expose API
    --------------------------------------------------------- */

    function exposeGlobalAPI() {
        var previousBCA = window.BCA || {};

        window.BCA = previousBCA;

        window.BCA.incrementPlay = incrementTotalPlays;

        window.BCA.getUsername = function() {
            return safeGet(KEYS.username, "Guest");
        };

        window.BCA.setUsername = function(name) {
            name = String(name || "").trim();

            if (!name) {
                name = "Guest";
            }

            safeSet(KEYS.username, name);
            updateHeaderBadges();
        };

        window.BCA.getSoundEnabled = function() {
            return isSoundEnabled();
        };

        window.BCA.showToast = showToast;
        window.BCA.playClickSound = playClickSound;

        window.BCA.recordRun = recordRun;
        window.BCA.getRuns = getRuns;
        window.BCA.getBest = getBest;
        window.BCA.clearGameData = clearGameData;
        window.BCA.getProgress = getProgress;
        window.BCA.setProgress = setProgress;
        window.BCA.getLevelCap = getLevelCap;
        window.BCA.setLevelCap = setLevelCap;

        window.BCA.safeGet = safeGet;
        window.BCA.safeSet = safeSet;
        window.BCA.safeJsonGet = safeJsonGet;
        window.BCA.safeJsonSet = safeJsonSet;
        window.BCA.todayISO = todayISO;

        window.BCALeaderboard = window.BCALeaderboard || {};
        window.BCALeaderboard.recordRun = recordRun;
        window.BCALeaderboard.getRuns = getRuns;
        window.BCALeaderboard.getBest = getBest;
        window.BCALeaderboard.clearGameData = clearGameData;
        window.BCALeaderboard.getProgress = getProgress;
        window.BCALeaderboard.setProgress = setProgress;
        window.BCALeaderboard.getLevelCap = getLevelCap;
        window.BCALeaderboard.setLevelCap = setLevelCap;
        window.BCALeaderboard.games = GAME_KEYS;
    }

    /* ---------------------------------------------------------
       Init
    --------------------------------------------------------- */

    function init() {
        initDefaults();
        initSettings();
        updateHeaderBadges();
        highlightActiveNav();
        enhanceMobileMenu();
        initGlobalClickSound();
        exposeGlobalAPI();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();