/*
============================================================
 Color Bubble Challenge / Bubble Blast Style Game
 game.js
 Full Correct Updated Version

 Includes:
 - Custom No Lives modal instead of browser alert
 - Buy 1 Life for 50 coins button
 - Map / Exit Game confirmation before leaving unfinished game
 - Exit confirmation loses 1 life only when user confirms
 - Back to map works correctly
 - Level complete 50 coin reward popup effect like achievement image
 - All previous gameplay, map, progress, sounds, and HUD logic preserved
============================================================
*/

(function() {
    "use strict";

    const LEVELS = Array.isArray(window.COLOR_BUBBLE_LEVELS) ? window.COLOR_BUBBLE_LEVELS : [];
    const TOTAL_LEVELS = LEVELS.length || 100;

    const STORAGE_KEYS = {
        progress: "cbc_progress_v3",
        selectedLevel: "cbc_selected_level_v3",
        settings: "cbc_settings_v3",
        achievements: "cbc_achievements_v3"
    };

    const LIFE_RECHARGE_MS = 5 * 60 * 1000;
    const LEVEL_UP_COIN_REWARD = 50;
    const ONE_LIFE_PRICE = 50;

    const CONFIG = {
        logicalWidth: 400,
        logicalHeight: 560,
        bubbleRadius: 18,
        cols: 8,
        rowStep: 32,
        colStep: 40,
        topMargin: 35,
        leftMargin: 34,
        launcherY: 500,
        dangerLineY: 438,
        aimMin: -Math.PI * 0.86,
        aimMax: -Math.PI * 0.14,
        pointerSmoothing: 0.25,
        guideDots: window.innerWidth <= 700 ? 14 : 28,
        bounceLimit: 8,
        bubbleHitDistance: 35,
        snapDistanceLimit: 58,
        launcherZoneRadius: 95,
        swipeThreshold: 22,
        maxDpr: window.innerWidth <= 700 ? 1 : 1.5,
        canvasAspectRatio: 400 / 560,
        defaultColors: ["#098cff", "#e74316", "#ffbc21", "#19b943", "#b219cf", "#f28b13"]
    };

    const DEFAULT_OBJECTIVE = {
        type: "clear_all",
        value: 0,
        label: "Clear All",
        description: "Remove every bubble from the board."
    };

    const ACHIEVEMENT_DEFS = [
        { id: "first_clear", title: "First Clear", check: s => s.completedLevels >= 1 },
        { id: "first_3_star", title: "First 3-Star", check: s => s.threeStarLevels >= 1 },
        { id: "ten_clears", title: "10 Levels Cleared", check: s => s.completedLevels >= 10 },
        { id: "fifty_stars", title: "50 Stars", check: s => s.totalStars >= 50 },
        { id: "champion", title: "Bubble Champion", check: s => s.completedLevels >= TOTAL_LEVELS }
    ];

    function getQueryParam(name) {
        return new URLSearchParams(window.location.search || "").get(name) || "";
    }

    function isStoryMode() {
        return getQueryParam("story") === "1" ||
            String(getQueryParam("mode") || "").toLowerCase() === "story";
    }

    function safeTestId(raw) {
        return String(raw || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_-]/g, "");
    }

    function storyReturnUrl() {
        return getQueryParam("return") || "/story.html";
    }

    function passStoryTest() {
        const tid = safeTestId(getQueryParam("test")) || "unknown_test";

        try {
            localStorage.setItem("bca_story_test_" + tid, "1");
            localStorage.setItem("bca_story_last_test", tid);
        } catch (err) {
            /* ignore */
        }
    }

    const STORY_MODE = isStoryMode();

    const screenEls = {
        start: document.getElementById("cbcStartScreen"),
        map: document.getElementById("cbcMapScreen"),
        play: document.getElementById("cbcPlayScreen")
    };

    const loadingEls = {
        wrap: document.getElementById("cbcLoadingScreen"),
        fill: document.getElementById("cbcLoadingFill"),
        text: document.getElementById("cbcLoadingText")
    };

    const startEls = {
        playBtn: document.getElementById("cbcStartPlayBtn"),
        continueBtn: document.getElementById("cbcStartContinueBtn"),
        resetBtn: document.getElementById("cbcResetProgressBtn"),
        totalLevels: document.getElementById("cbcStartTotalLevels")
    };

    const mapEls = {
        lives: document.getElementById("cbcMapLives"),
        totalStars: document.getElementById("cbcMapTotalStars"),
        bestScore: document.getElementById("cbcMapBestScore"),
        piggyStarCount: document.getElementById("cbcPiggyStarCount"),
        coinCount: document.getElementById("cbcCoinCount"),
        nodes: document.getElementById("cbcMapNodes"),
        selectedLevelText: document.getElementById("cbcSelectedLevelText"),
        selectedLevelName: document.getElementById("cbcSelectedLevelName"),
        selectedStars: document.getElementById("cbcSelectedStars"),
        playPanel: document.getElementById("cbcMapPlayPanel"),
        playSelectedBtn: document.getElementById("cbcPlaySelectedBtn"),
        backToStartBtn: document.getElementById("cbcMapBackToStartBtn"),
        settingsBtn: document.getElementById("cbcMapSettingsBtn"),
        notifyBadge: document.getElementById("cbcMapNotifyBadge"),
        dotPath: document.getElementById("cbcBbMapDotPath")
    };

    const playEls = {
        levelName: document.getElementById("cbcLevelName"),
        hudLevel: document.getElementById("cbcHudLevel"),
        hudScore: document.getElementById("cbcHudScore"),
        hudShots: document.getElementById("cbcHudShots"),
        hudTarget: document.getElementById("cbcHudTarget"),
        hudStars: document.getElementById("cbcHudStars"),
        missionText: document.getElementById("cbcMissionText"),

        backToMapBtn: document.getElementById("cbcBackToMapBtn"),
        pauseBtn: document.getElementById("cbcPauseBtn"),
        restartBtn: document.getElementById("cbcRestartBtn"),
        soundBtn: document.getElementById("cbcSoundBtn"),
        exitGameBtn: document.getElementById("cbcExitGameBtn"),

        topMenuBtn: document.getElementById("cbcTopMenuBtn"),
        gameMenuPanel: document.getElementById("cbcGameMenuPanel"),
        closeSettingsBtn: document.getElementById("cbcCloseSettingsBtn"),

        topScoreText: document.getElementById("cbcTopScoreText"),
        topStarFill: document.getElementById("cbcTopStarFill"),
        topBubbleCount: document.getElementById("cbcTopBubbleCount"),
        topStars: Array.from(document.querySelectorAll(".cbc-top-star")),

        exitConfirmModal: document.getElementById("cbcExitConfirmModal"),
        exitConfirmYes: document.getElementById("cbcExitConfirmYes"),
        exitConfirmNo: document.getElementById("cbcExitConfirmNo"),

        restartConfirmModal: document.getElementById("cbcRestartConfirmModal"),
        restartConfirmYes: document.getElementById("cbcRestartConfirmYes"),
        restartConfirmNo: document.getElementById("cbcRestartConfirmNo")
    };

    const overlayEls = {
        wrap: document.getElementById("cbcOverlay"),
        title: document.getElementById("cbcOverlayTitle"),
        message: document.getElementById("cbcOverlayMessage"),
        stars: document.getElementById("cbcOverlayStars"),
        nextBtn: document.getElementById("cbcNextBtn"),
        mapBtn: document.getElementById("cbcOverlayMapBtn")
    };

    const liveRegion = document.getElementById("cbcLiveRegion");
    const canvas = document.getElementById("cbcCanvas");
    const ctx = canvas ? canvas.getContext("2d", { alpha: true }) : null;

    if (!canvas || !ctx || !screenEls.start || !screenEls.map || !screenEls.play || !LEVELS.length) {
        console.error("Color Bubble Challenge: missing required DOM elements or levels.");
        return;
    }

    const renderCache = {
        background: document.createElement("canvas")
    };

    const audioState = {
        ctx: null,
        master: null
    };

    let noLivesEls = null;
    let coinRewardEls = null;
    let coinRewardTimer = 0;

    const state = {
        activeScreen: "start",
        progress: null,
        settings: null,
        achievements: null,

        selectedLevel: 1,
        mapPanelVisible: false,

        paused: false,
        soundOn: true,
        ended: false,
        won: false,

        levelIndex: 0,
        score: 0,
        shots: 0,
        stars: 0,
        combo: 0,
        shotsSinceDrop: 0,
        shotsLimitForDrop: 8,
        objectiveProgress: 0,
        objectiveCompleted: false,

        angle: -Math.PI / 2,
        targetAngle: -Math.PI / 2,

        currentBubble: null,
        nextBubble: null,
        activeShot: null,

        canSwap: true,
        pointerStart: null,
        swapHintTime: 0,
        tutorialSwapSeen: false,
        tutorialSwapTimer: 0,
        tutorialMousePhase: 0,

        levelIntroTimer: 0,

        grid: [],
        particles: [],
        floatingTexts: [],

        hudDirty: true,
        rafId: 0,
        lastTime: 0,
        dpr: Math.min(window.devicePixelRatio || 1, CONFIG.maxDpr),

        shakeTime: 0,
        shakePower: 0,

        previousFocusedEl: null,

        statSession: {
            shotsFired: 0,
            bubblesPopped: 0,
            largestCombo: 0
        },

        menuOpen: false,
        leavingPageHandled: false,
        pendingExitAction: null,
        pendingLevelStart: null
    };

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function clampInt(value, min, max, fallback) {
        const n = Math.trunc(Number(value));
        if (!Number.isFinite(n)) return fallback;
        return Math.max(min, Math.min(max, n));
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function rand(min, max) {
        return Math.random() * (max - min) + min;
    }

    function chance(p) {
        return Math.random() < p;
    }

    function isMobilePerformanceMode() {
        return window.innerWidth <= 700 || state.dpr <= 1;
    }

    function isVerySmallPhone() {
        return window.innerWidth <= 430;
    }

    function announce(message) {
        if (!liveRegion || !message) return;

        liveRegion.textContent = "";

        window.setTimeout(function() {
            liveRegion.textContent = message;
        }, 40);
    }

    function readJsonStorage(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;

            const parsed = JSON.parse(raw);
            return parsed == null ? fallback : parsed;
        } catch (err) {
            return fallback;
        }
    }

    function writeJsonStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (err) {
            return false;
        }
    }

    function syncBodyScreenClass(screenName) {
        document.body.classList.remove("cbc-screen-start", "cbc-screen-map", "cbc-screen-play");
        document.body.classList.add("cbc-screen-" + screenName);
    }

    function getCurrentLevel() {
        return LEVELS[state.levelIndex] || LEVELS[0];
    }

    function getCurrentObjective() {
        const level = getCurrentLevel();
        return level && level.objective ? level.objective : DEFAULT_OBJECTIVE;
    }

    function createEmptyStats() {
        return {
            totalShots: 0,
            totalPopped: 0,
            completedLevels: 0,
            totalStars: 0,
            threeStarLevels: 0,
            totalWins: 0,
            totalLosses: 0,
            bestComboOverall: 0
        };
    }

    function getDefaultProgress() {
        return {
            version: 3,
            unlockedLevel: 1,
            selectedLevel: 1,
            currentLevel: 1,
            totalStars: 0,
            bestScore: 0,
            lives: 5,
            maxLives: 5,
            nextLifeAt: 0,
            coins: 0,
            stats: createEmptyStats(),
            levels: Array.from({ length: TOTAL_LEVELS }, function(_, i) {
                return {
                    level: i + 1,
                    unlocked: i === 0,
                    stars: 0,
                    bestScore: 0,
                    completed: false,
                    bestCombo: 0,
                    attempts: 0,
                    wins: 0,
                    losses: 0
                };
            })
        };
    }

    function defaultAchievements() {
        return {
            version: 3,
            unlocked: [],
            newlyUnlocked: []
        };
    }

    function getDefaultSettings() {
        return {
            version: 3,
            soundOn: true,
            reducedMotion: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
            tutorialHints: true,
            colorblindSymbols: false
        };
    }

    function normalizeLevelEntry(item, index) {
        item = item || {};

        return {
            level: index + 1,
            unlocked: !!item.unlocked || index === 0,
            stars: clampInt(item.stars, 0, 3, 0),
            bestScore: Number(item.bestScore) || 0,
            completed: !!item.completed,
            bestCombo: Number(item.bestCombo) || 0,
            attempts: Number(item.attempts) || 0,
            wins: Number(item.wins) || 0,
            losses: Number(item.losses) || 0
        };
    }

    function syncProgressFlags(progress) {
        if (!progress.stats) progress.stats = createEmptyStats();

        if (!Array.isArray(progress.levels) || progress.levels.length !== TOTAL_LEVELS) {
            progress.levels = getDefaultProgress().levels;
        }

        progress.levels = progress.levels.map(normalizeLevelEntry);

        progress.unlockedLevel = clampInt(progress.unlockedLevel, 1, TOTAL_LEVELS, 1);

        progress.levels.forEach(function(item, index) {
            item.level = index + 1;
            item.unlocked = index + 1 <= progress.unlockedLevel || index === 0;
            item.completed = !!item.completed || item.stars > 0 || item.wins > 0;
        });

        progress.version = 3;
        progress.selectedLevel = clampInt(progress.selectedLevel, 1, TOTAL_LEVELS, 1);
        progress.currentLevel = clampInt(progress.currentLevel, 1, TOTAL_LEVELS, 1);
        progress.lives = clampInt(progress.lives, 0, progress.maxLives, progress.maxLives);
        progress.nextLifeAt = Number(progress.nextLifeAt) || 0;
        progress.coins = Number.isFinite(Number(progress.coins)) ? Number(progress.coins) : 0;
        progress.bestScore = Number(progress.bestScore) || 0;

        progress.stats.totalShots = Number(progress.stats.totalShots) || 0;
        progress.stats.totalPopped = Number(progress.stats.totalPopped) || 0;
        progress.stats.completedLevels = Number(progress.stats.completedLevels) || 0;
        progress.stats.totalStars = Number(progress.stats.totalStars) || 0;
        progress.stats.threeStarLevels = Number(progress.stats.threeStarLevels) || 0;
        progress.stats.totalWins = Number(progress.stats.totalWins) || 0;
        progress.stats.totalLosses = Number(progress.stats.totalLosses) || 0;
        progress.stats.bestComboOverall = Number(progress.stats.bestComboOverall) || 0;
    }

    function refreshProgressStats(progress) {
        progress.totalStars = progress.levels.reduce(function(sum, item) {
            return sum + (item.stars || 0);
        }, 0);

        progress.stats.completedLevels = progress.levels.filter(function(level) {
            return level.completed;
        }).length;

        progress.stats.totalStars = progress.totalStars;

        progress.stats.threeStarLevels = progress.levels.filter(function(level) {
            return (level.stars || 0) === 3;
        }).length;

        progress.stats.totalWins = progress.levels.reduce(function(sum, level) {
            return sum + (level.wins || 0);
        }, 0);

        progress.stats.totalLosses = progress.levels.reduce(function(sum, level) {
            return sum + (level.losses || 0);
        }, 0);

        progress.stats.bestComboOverall = progress.levels.reduce(function(best, level) {
            return Math.max(best, level.bestCombo || 0);
        }, 0);
    }

    function syncLifeRecharge(progressArg) {
        const progress = progressArg || state.progress;
        if (!progress) return;

        const now = Date.now();

        progress.maxLives = clampInt(progress.maxLives, 1, 5, 5);
        progress.lives = clampInt(progress.lives, 0, progress.maxLives, progress.maxLives);
        progress.nextLifeAt = Number(progress.nextLifeAt) || 0;

        if (progress.lives >= progress.maxLives) {
            progress.lives = progress.maxLives;
            progress.nextLifeAt = 0;
            return;
        }

        if (!progress.nextLifeAt) {
            progress.nextLifeAt = now + LIFE_RECHARGE_MS;
            return;
        }

        if (now < progress.nextLifeAt) return;

        const livesToAdd = Math.floor((now - progress.nextLifeAt) / LIFE_RECHARGE_MS) + 1;

        progress.lives = Math.min(progress.maxLives, progress.lives + livesToAdd);

        if (progress.lives >= progress.maxLives) {
            progress.nextLifeAt = 0;
        } else {
            progress.nextLifeAt = progress.nextLifeAt + livesToAdd * LIFE_RECHARGE_MS;
        }
    }

    function readProgress() {
        const progress = Object.assign({}, getDefaultProgress(), readJsonStorage(STORAGE_KEYS.progress, getDefaultProgress()));
        syncProgressFlags(progress);
        syncLifeRecharge(progress);
        refreshProgressStats(progress);
        return progress;
    }

    function writeProgress(progress) {
        syncProgressFlags(progress);
        syncLifeRecharge(progress);
        refreshProgressStats(progress);
        writeJsonStorage(STORAGE_KEYS.progress, progress);

        try {
            localStorage.setItem(STORAGE_KEYS.selectedLevel, String(progress.selectedLevel));
        } catch (err) {
            /* ignore */
        }
    }

    function loseOneLife(reason) {
        if (!state.progress) return false;

        syncLifeRecharge();

        if (state.progress.lives <= 0) {
            state.progress.lives = 0;

            if (!state.progress.nextLifeAt) {
                state.progress.nextLifeAt = Date.now() + LIFE_RECHARGE_MS;
            }

            writeProgress(state.progress);
            updateLifeDisplay();
            return false;
        }

        state.progress.lives = Math.max(0, state.progress.lives - 1);

        if (state.progress.lives < state.progress.maxLives && !state.progress.nextLifeAt) {
            state.progress.nextLifeAt = Date.now() + LIFE_RECHARGE_MS;
        }

        writeProgress(state.progress);
        updateLifeDisplay();

        if (reason) announce(reason);

        return true;
    }

    function getLifeTimerText() {
        if (!state.progress) return "Max";

        syncLifeRecharge();

        if (state.progress.lives >= state.progress.maxLives) {
            return "Max";
        }

        const remaining = Math.max(0, Number(state.progress.nextLifeAt || 0) - Date.now());
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.ceil((remaining % 60000) / 1000);

        return String(minutes) + ":" + String(seconds).padStart(2, "0");
    }

    function updateLifeDisplay() {
        if (!state.progress) return;

        syncLifeRecharge();

        const heartEl = document.querySelector(".cbc-bb-heart");
        const maxEl = document.querySelector(".cbc-bb-max");

        if (heartEl) heartEl.textContent = String(state.progress.lives);
        if (maxEl) maxEl.textContent = getLifeTimerText();
        if (mapEls.lives) mapEls.lives.textContent = String(state.progress.lives);
    }

    function updateCoinDisplay() {
        if (!state.progress) return;

        state.progress.coins = Number.isFinite(Number(state.progress.coins)) ?
            Number(state.progress.coins) :
            0;

        if (mapEls.coinCount) {
            mapEls.coinCount.textContent = String(state.progress.coins);
        }
    }

    function ensureNoLivesModal() {
        if (noLivesEls) return;

        if (!document.getElementById("cbcNoLivesModalStyles")) {
            const style = document.createElement("style");
            style.id = "cbcNoLivesModalStyles";
            style.textContent = `
                .cbc-no-lives-modal {
                    position: fixed;
                    inset: 0;
                    z-index: 100000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 18px;
                    background: rgba(23, 28, 48, 0.66);
                    backdrop-filter: blur(3px);
                }

                .cbc-no-lives-modal.hidden {
                    display: none !important;
                }

                .cbc-no-lives-card {
                    width: min(92vw, 430px);
                    border-radius: 28px;
                    padding: 12px;
                    background: linear-gradient(180deg, #2ea3e3 0%, #1382ca 100%);
                    border: 5px solid #0f75bd;
                    box-shadow: 0 18px 38px rgba(0, 0, 0, 0.38), inset 0 4px 0 rgba(255, 255, 255, 0.25);
                }

                .cbc-no-lives-inner {
                    min-height: 430px;
                    border-radius: 20px;
                    padding: 28px 22px 26px;
                    text-align: center;
                    background: linear-gradient(180deg, #eaf7ff 0%, #d9ecfb 100%);
                    border: 5px solid rgba(255, 255, 255, 0.72);
                    box-shadow: inset 0 0 0 3px rgba(41, 113, 170, 0.18), inset 0 0 22px rgba(20, 107, 180, 0.16);
                }

                .cbc-no-lives-title {
                    margin: 0;
                    color: #2167ad;
                    font-size: 38px;
                    line-height: 1;
                    font-weight: 900;
                    letter-spacing: 0.5px;
                    text-shadow: 0 3px 0 rgba(255, 255, 255, 0.75), 0 5px 0 rgba(0, 0, 0, 0.08);
                }

                .cbc-no-lives-heart {
                    width: 98px;
                    height: 98px;
                    margin: 22px auto 14px;
                    display: grid;
                    place-items: center;
                    font-size: 76px;
                    line-height: 1;
                    color: #df1713;
                    filter: drop-shadow(0 5px 0 rgba(95, 20, 18, 0.28));
                    text-shadow: 0 -3px 0 rgba(255, 255, 255, 0.28), 0 3px 0 rgba(80, 0, 0, 0.24);
                }

                .cbc-no-lives-label {
                    margin-top: 8px;
                    color: #2670bd;
                    font-size: 22px;
                    font-weight: 900;
                    text-shadow: 0 2px 0 rgba(255, 255, 255, 0.75);
                }

                .cbc-no-lives-time {
                    margin: 8px 0 28px;
                    color: #1e68c2;
                    font-size: 42px;
                    line-height: 1;
                    font-weight: 900;
                    text-shadow: 0 3px 0 rgba(255, 255, 255, 0.68);
                }

                .cbc-no-lives-btn {
                    width: 100%;
                    min-height: 78px;
                    margin-top: 16px;
                    padding: 12px 18px;
                    border: 0;
                    border-radius: 18px;
                    display: grid;
                    grid-template-columns: 84px 1fr;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    cursor: pointer;
                    color: #ffffff;
                    background: linear-gradient(180deg, #08da38 0%, #00be2c 66%, #00a725 100%);
                    box-shadow: inset 0 4px 0 rgba(255, 255, 255, 0.24), inset 0 -6px 0 rgba(0, 0, 0, 0.16), 0 5px 0 #078923, 0 9px 16px rgba(0, 0, 0, 0.16);
                    font-weight: 900;
                    -webkit-tap-highlight-color: transparent;
                }

                .cbc-no-lives-btn:hover:not(:disabled) {
                    filter: brightness(1.04);
                    transform: translateY(-1px);
                }

                .cbc-no-lives-btn:active:not(:disabled) {
                    transform: translateY(2px);
                    box-shadow: inset 0 4px 0 rgba(255, 255, 255, 0.20), inset 0 -4px 0 rgba(0, 0, 0, 0.16), 0 3px 0 #078923, 0 7px 13px rgba(0, 0, 0, 0.14);
                }

                .cbc-no-lives-btn:disabled,
                .cbc-no-lives-btn.is-disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                    transform: none;
                }

                .cbc-no-lives-btn-text {
                    display: block;
                    color: #ffffff;
                    font-size: 22px;
                    line-height: 1.02;
                    font-weight: 900;
                    text-align: center;
                    text-shadow: -2px -2px 0 rgba(15, 93, 35, 0.55), 2px -2px 0 rgba(15, 93, 35, 0.55), -2px 2px 0 rgba(15, 93, 35, 0.55), 2px 2px 0 rgba(15, 93, 35, 0.55), 0 3px 0 rgba(0, 0, 0, 0.20);
                }

                .cbc-no-lives-coin-row {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    color: #ffffff;
                    font-size: 28px;
                    font-weight: 900;
                    text-shadow: -2px -2px 0 rgba(15, 93, 35, 0.55), 2px -2px 0 rgba(15, 93, 35, 0.55), -2px 2px 0 rgba(15, 93, 35, 0.55), 2px 2px 0 rgba(15, 93, 35, 0.55), 0 3px 0 rgba(0, 0, 0, 0.20);
                }

                .cbc-no-lives-coin {
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    display: grid;
                    place-items: center;
                    color: #e2a000;
                    font-size: 19px;
                    font-weight: 900;
                    background: radial-gradient(circle at 35% 28%, #fff6b2 0 20%, #ffd84a 21% 58%, #e5a90d 59% 100%);
                    box-shadow: inset 0 3px 0 rgba(255, 255, 255, 0.45), 0 3px 0 rgba(121, 84, 0, 0.24);
                }

                @media (max-width: 480px) {
                    .cbc-no-lives-card {
                        width: min(94vw, 390px);
                    }

                    .cbc-no-lives-inner {
                        min-height: 390px;
                        padding: 24px 18px;
                    }

                    .cbc-no-lives-title {
                        font-size: 34px;
                    }

                    .cbc-no-lives-heart {
                        width: 86px;
                        height: 86px;
                        font-size: 66px;
                    }

                    .cbc-no-lives-time {
                        font-size: 36px;
                    }

                    .cbc-no-lives-btn {
                        min-height: 72px;
                        grid-template-columns: 72px 1fr;
                    }

                    .cbc-no-lives-btn-text {
                        font-size: 20px;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        const wrap = document.createElement("div");
        wrap.id = "cbcNoLivesModal";
        wrap.className = "cbc-no-lives-modal hidden";
        wrap.hidden = true;
        wrap.setAttribute("aria-hidden", "true");

        wrap.innerHTML = `
            <div class="cbc-no-lives-card" role="dialog" aria-modal="true" aria-labelledby="cbcNoLivesTitle">
                <div class="cbc-no-lives-inner">
                    <h2 id="cbcNoLivesTitle" class="cbc-no-lives-title">No Lives</h2>
                    <div class="cbc-no-lives-heart" aria-hidden="true">❤</div>
                    <div class="cbc-no-lives-label">Next Life:</div>
                    <div id="cbcNoLivesTime" class="cbc-no-lives-time">5:00</div>
                    <button type="button" id="cbcNoLivesBuyBtn" class="cbc-no-lives-btn">
                        <span class="cbc-no-lives-coin-row" aria-hidden="true">
                            <span class="cbc-no-lives-coin">●</span>
                            <span id="cbcNoLivesCost">50</span>
                        </span>
                        <span class="cbc-no-lives-btn-text">Buy 1 Life</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(wrap);

        noLivesEls = {
            wrap: wrap,
            time: document.getElementById("cbcNoLivesTime"),
            cost: document.getElementById("cbcNoLivesCost"),
            buyBtn: document.getElementById("cbcNoLivesBuyBtn")
        };

        noLivesEls.wrap.addEventListener("click", function(event) {
            if (event.target === noLivesEls.wrap) {
                closeNoLivesModal();
            }
        });

        noLivesEls.buyBtn.addEventListener("click", function() {
            grantOneLifeFromNoLivesModal();
        });
    }

    function ensureCoinRewardEffect() {
        if (coinRewardEls) return;

        if (!document.getElementById("cbcCoinRewardStyles")) {
            const style = document.createElement("style");
            style.id = "cbcCoinRewardStyles";
            style.textContent = `
                .cbc-coin-reward-effect {
                    position: fixed;
                    inset: 0;
                    z-index: 100001;
                    display: grid;
                    place-items: center;
                    padding: 18px;
                    background:
                        radial-gradient(circle at 12% 12%, rgba(132, 102, 215, 0.22) 0 72px, transparent 74px),
                        radial-gradient(circle at 88% 24%, rgba(132, 102, 215, 0.20) 0 78px, transparent 80px),
                        radial-gradient(circle at 8% 80%, rgba(132, 102, 215, 0.18) 0 92px, transparent 94px),
                        radial-gradient(circle at 86% 78%, rgba(132, 102, 215, 0.19) 0 74px, transparent 76px),
                        rgba(85, 88, 126, 0.78);
                    backdrop-filter: blur(2px);
                    opacity: 0;
                    transform: scale(1.02);
                    transition: opacity 180ms ease, transform 180ms ease;
                }

                .cbc-coin-reward-effect.is-open {
                    opacity: 1;
                    transform: scale(1);
                }

                .cbc-coin-reward-effect.hidden {
                    display: none !important;
                }

                .cbc-coin-reward-card {
                    width: min(92vw, 360px);
                    text-align: center;
                    color: #ffffff;
                    transform: translateY(16px) scale(0.94);
                    animation: cbcRewardCardIn 460ms cubic-bezier(.2,1.35,.35,1) forwards;
                }

                .cbc-coin-reward-title {
                    margin: 0 0 18px;
                    font-size: 28px;
                    line-height: 1.05;
                    font-weight: 950;
                    letter-spacing: 0.2px;
                    color: #f4f6ff;
                    text-shadow: 0 3px 0 rgba(0, 0, 0, 0.22), 0 0 14px rgba(255, 255, 255, 0.22);
                }

                .cbc-coin-reward-face {
                    width: 124px;
                    height: 124px;
                    margin: 0 auto 28px;
                    position: relative;
                    border-radius: 50%;
                    background: radial-gradient(circle at 35% 28%, #ffe66f 0 18%, #ffd52b 19% 66%, #ffbd17 67% 100%);
                    box-shadow: inset 0 8px 0 rgba(255,255,255,0.32), inset 0 -8px 0 rgba(175,110,0,0.18), 0 12px 22px rgba(0,0,0,0.22);
                    animation: cbcRewardFacePop 740ms cubic-bezier(.16,1.28,.33,1) both;
                }

                .cbc-coin-reward-eye {
                    position: absolute;
                    top: 39px;
                    width: 26px;
                    height: 19px;
                    border-top: 7px solid #573d13;
                    border-radius: 50% 50% 0 0;
                }

                .cbc-coin-reward-eye.left {
                    left: 33px;
                    transform: rotate(34deg);
                }

                .cbc-coin-reward-eye.right {
                    right: 33px;
                    transform: rotate(-34deg);
                }

                .cbc-coin-reward-cheek {
                    position: absolute;
                    top: 62px;
                    width: 23px;
                    height: 18px;
                    border-radius: 50%;
                    background: rgba(255, 122, 105, 0.64);
                    filter: blur(0.2px);
                }

                .cbc-coin-reward-cheek.left {
                    left: 17px;
                }

                .cbc-coin-reward-cheek.right {
                    right: 17px;
                }

                .cbc-coin-reward-mouth {
                    position: absolute;
                    left: 40px;
                    top: 62px;
                    width: 50px;
                    height: 36px;
                    border-radius: 8px 8px 45px 45px;
                    background: #51310e;
                    transform: rotate(13deg);
                    overflow: hidden;
                }

                .cbc-coin-reward-mouth::after {
                    content: "";
                    position: absolute;
                    left: 17px;
                    bottom: -6px;
                    width: 30px;
                    height: 20px;
                    border-radius: 50%;
                    background: #ff5c70;
                }

                .cbc-coin-reward-name {
                    margin: 0 0 22px;
                    font-size: 30px;
                    line-height: 1;
                    font-weight: 950;
                    color: #ffc51f;
                    text-shadow:
                        -2px -2px 0 rgba(130, 85, 0, 0.45),
                        2px -2px 0 rgba(130, 85, 0, 0.45),
                        -2px 2px 0 rgba(130, 85, 0, 0.45),
                        2px 2px 0 rgba(130, 85, 0, 0.45),
                        0 4px 0 rgba(0, 0, 0, 0.18);
                }

                .cbc-coin-reward-amount {
                    display: inline-flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    margin-bottom: 24px;
                    animation: cbcRewardCoinBounce 900ms ease-in-out infinite;
                }

                .cbc-coin-reward-coin {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: grid;
                    place-items: center;
                    color: #e2a000;
                    font-size: 18px;
                    font-weight: 950;
                    background: radial-gradient(circle at 35% 28%, #fff6b2 0 20%, #ffd84a 21% 58%, #e5a90d 59% 100%);
                    box-shadow: inset 0 3px 0 rgba(255, 255, 255, 0.45), 0 4px 0 rgba(121, 84, 0, 0.24), 0 8px 14px rgba(0,0,0,0.16);
                }

                .cbc-coin-reward-count {
                    display: block;
                    color: #ffd84a;
                    font-size: 20px;
                    font-weight: 950;
                    text-shadow: 0 3px 0 rgba(0, 0, 0, 0.25);
                }

                .cbc-coin-reward-btn-wrap {
                    width: 176px;
                    margin: 0 auto;
                    padding: 10px 14px 14px;
                    border-radius: 20px;
                    background: #236a94;
                    box-shadow: inset 0 4px 0 rgba(255,255,255,0.08), 0 8px 0 rgba(0,0,0,0.18);
                }

                .cbc-coin-reward-btn {
                    width: 100%;
                    min-height: 48px;
                    border: 0;
                    border-radius: 13px;
                    cursor: pointer;
                    color: #ffffff;
                    font-size: 15px;
                    font-weight: 950;
                    background: linear-gradient(180deg, #11db42 0%, #00c531 70%, #00a829 100%);
                    box-shadow: inset 0 4px 0 rgba(255,255,255,0.24), inset 0 -5px 0 rgba(0,0,0,0.14), 0 4px 0 #078923;
                    text-shadow: 0 2px 0 rgba(0,0,0,0.22);
                    -webkit-tap-highlight-color: transparent;
                }

                .cbc-coin-reward-btn:active {
                    transform: translateY(2px);
                    box-shadow: inset 0 3px 0 rgba(255,255,255,0.20), inset 0 -4px 0 rgba(0,0,0,0.14), 0 2px 0 #078923;
                }

                .cbc-coin-burst {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    pointer-events: none;
                    display: grid;
                    place-items: center;
                    color: #d99a00;
                    font-size: 9px;
                    font-weight: 950;
                    background: radial-gradient(circle at 35% 28%, #fff6b2 0 20%, #ffd84a 21% 58%, #e5a90d 59% 100%);
                    box-shadow: 0 2px 0 rgba(121, 84, 0, 0.24), 0 5px 10px rgba(0,0,0,0.14);
                    animation: cbcCoinBurst 900ms ease-out forwards;
                }

                @keyframes cbcRewardCardIn {
                    0% {
                        opacity: 0;
                        transform: translateY(20px) scale(0.9);
                    }

                    100% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                @keyframes cbcRewardFacePop {
                    0% {
                        transform: scale(0.55) rotate(-8deg);
                        opacity: 0;
                    }

                    58% {
                        transform: scale(1.12) rotate(3deg);
                        opacity: 1;
                    }

                    100% {
                        transform: scale(1) rotate(0deg);
                        opacity: 1;
                    }
                }

                @keyframes cbcRewardCoinBounce {
                    0%, 100% {
                        transform: translateY(0);
                    }

                    50% {
                        transform: translateY(-6px);
                    }
                }

                @keyframes cbcCoinBurst {
                    0% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
                    }

                    100% {
                        opacity: 0;
                        transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.15) rotate(220deg);
                    }
                }

                @media (max-width: 480px) {
                    .cbc-coin-reward-title {
                        font-size: 25px;
                    }

                    .cbc-coin-reward-face {
                        width: 116px;
                        height: 116px;
                    }

                    .cbc-coin-reward-name {
                        font-size: 28px;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        const wrap = document.createElement("div");
        wrap.id = "cbcCoinRewardEffect";
        wrap.className = "cbc-coin-reward-effect hidden";
        wrap.hidden = true;
        wrap.setAttribute("aria-hidden", "true");

        wrap.innerHTML = `
            <div class="cbc-coin-reward-card" role="dialog" aria-modal="true" aria-labelledby="cbcCoinRewardTitle">
                <h2 id="cbcCoinRewardTitle" class="cbc-coin-reward-title">New Achievement!</h2>

                <div class="cbc-coin-reward-face" aria-hidden="true">
                    <span class="cbc-coin-reward-eye left"></span>
                    <span class="cbc-coin-reward-eye right"></span>
                    <span class="cbc-coin-reward-cheek left"></span>
                    <span class="cbc-coin-reward-cheek right"></span>
                    <span class="cbc-coin-reward-mouth"></span>
                </div>

                <div id="cbcCoinRewardName" class="cbc-coin-reward-name">Curious</div>

                <div class="cbc-coin-reward-amount" aria-label="50 coins">
                    <span class="cbc-coin-reward-coin">●</span>
                    <span id="cbcCoinRewardAmount" class="cbc-coin-reward-count">x50</span>
                </div>

                <div class="cbc-coin-reward-btn-wrap">
                    <button type="button" id="cbcCoinRewardTakeBtn" class="cbc-coin-reward-btn">Take</button>
                </div>
            </div>
        `;

        document.body.appendChild(wrap);

        coinRewardEls = {
            wrap: wrap,
            title: document.getElementById("cbcCoinRewardTitle"),
            name: document.getElementById("cbcCoinRewardName"),
            amount: document.getElementById("cbcCoinRewardAmount"),
            takeBtn: document.getElementById("cbcCoinRewardTakeBtn")
        };

        coinRewardEls.takeBtn.addEventListener("click", function() {
            closeCoinRewardEffect();
        });

        coinRewardEls.wrap.addEventListener("click", function(event) {
            if (event.target === coinRewardEls.wrap) {
                closeCoinRewardEffect();
            }
        });
    }

    function playCoinRewardSound() {
        playTone(760, 0.07, "triangle", 0.026);

        window.setTimeout(function() {
            playTone(980, 0.08, "triangle", 0.024);
        }, 80);

        window.setTimeout(function() {
            playTone(1240, 0.1, "triangle", 0.022);
        }, 165);
    }

    function spawnCoinBurst() {
        if (!coinRewardEls || !coinRewardEls.wrap || state.settings.reducedMotion) return;

        const count = 18;

        for (let i = 0; i < count; i++) {
            const coin = document.createElement("span");
            const angle = (Math.PI * 2 * i) / count + rand(-0.18, 0.18);
            const distance = rand(70, 150);
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;

            coin.className = "cbc-coin-burst";
            coin.textContent = "●";
            coin.style.setProperty("--dx", dx.toFixed(1) + "px");
            coin.style.setProperty("--dy", dy.toFixed(1) + "px");
            coin.style.animationDelay = rand(0, 0.12).toFixed(2) + "s";

            coinRewardEls.wrap.appendChild(coin);

            window.setTimeout(function() {
                if (coin && coin.parentNode) {
                    coin.parentNode.removeChild(coin);
                }
            }, 1200);
        }
    }

    function openCoinRewardEffect(amount, label) {
        ensureCoinRewardEffect();

        window.clearTimeout(coinRewardTimer);

        const rewardAmount = Number(amount) || LEVEL_UP_COIN_REWARD;

        if (coinRewardEls.amount) {
            coinRewardEls.amount.textContent = "x" + String(rewardAmount);
        }

        if (coinRewardEls.name) {
            coinRewardEls.name.textContent = label || "Curious";
        }

        coinRewardEls.wrap.hidden = false;
        coinRewardEls.wrap.classList.remove("hidden");
        coinRewardEls.wrap.setAttribute("aria-hidden", "false");

        requestAnimationFrame(function() {
            coinRewardEls.wrap.classList.add("is-open");
            spawnCoinBurst();

            if (coinRewardEls.takeBtn) {
                coinRewardEls.takeBtn.focus();
            }
        });

        playCoinRewardSound();
        announce("New achievement. " + rewardAmount + " coins earned.");

        coinRewardTimer = window.setTimeout(function() {
            closeCoinRewardEffect();
        }, 5200);
    }

    function closeCoinRewardEffect() {
        if (!coinRewardEls || !coinRewardEls.wrap) return;

        window.clearTimeout(coinRewardTimer);

        coinRewardEls.wrap.classList.remove("is-open");

        window.setTimeout(function() {
            if (!coinRewardEls || !coinRewardEls.wrap) return;

            coinRewardEls.wrap.classList.add("hidden");
            coinRewardEls.wrap.hidden = true;
            coinRewardEls.wrap.setAttribute("aria-hidden", "true");
        }, 180);
    }

    function isNoLivesModalOpen() {
        return !!(
            noLivesEls &&
            noLivesEls.wrap &&
            !noLivesEls.wrap.classList.contains("hidden")
        );
    }

    function openNoLivesModal(levelToStart) {
        ensureNoLivesModal();

        if (levelToStart != null) {
            state.pendingLevelStart = clampInt(levelToStart, 1, TOTAL_LEVELS, state.selectedLevel || 1);
        }

        refreshNoLivesModal();

        noLivesEls.wrap.classList.remove("hidden");
        noLivesEls.wrap.hidden = false;
        noLivesEls.wrap.setAttribute("aria-hidden", "false");

        document.body.classList.add("cbc-settings-open");

        requestAnimationFrame(function() {
            if (noLivesEls.buyBtn) noLivesEls.buyBtn.focus();
        });

        announce("No lives left. Next life in " + getLifeTimerText() + ".");
    }

    function closeNoLivesModal(clearPending) {
        if (!noLivesEls) return;

        noLivesEls.wrap.classList.add("hidden");
        noLivesEls.wrap.hidden = true;
        noLivesEls.wrap.setAttribute("aria-hidden", "true");

        if (!state.menuOpen &&
            (!playEls.exitConfirmModal || playEls.exitConfirmModal.classList.contains("hidden"))
        ) {
            document.body.classList.remove("cbc-settings-open");
        }

        if (clearPending !== false) {
            state.pendingLevelStart = null;
        }
    }

    function refreshNoLivesModal() {
        if (!noLivesEls || !state.progress) return;

        syncLifeRecharge();
        updateLifeDisplay();
        updateCoinDisplay();

        if (noLivesEls.time) {
            noLivesEls.time.textContent = getLifeTimerText();
        }

        if (noLivesEls.cost) {
            noLivesEls.cost.textContent = String(ONE_LIFE_PRICE);
        }

        const canBuy = Number(state.progress.coins || 0) >= ONE_LIFE_PRICE;

        if (noLivesEls.buyBtn) {
            noLivesEls.buyBtn.disabled = !canBuy;
            noLivesEls.buyBtn.classList.toggle("is-disabled", !canBuy);
            noLivesEls.buyBtn.setAttribute("aria-disabled", canBuy ? "false" : "true");
        }

        if (state.progress.lives > 0 && isNoLivesModalOpen()) {
            const pending = state.pendingLevelStart;

            closeNoLivesModal(false);

            if (pending) {
                state.pendingLevelStart = null;
                clearAchievementNotifications();
                goToPlayPage(pending);
            } else {
                state.pendingLevelStart = null;
            }
        }
    }

    function addOneLife() {
        if (!state.progress) return;

        syncLifeRecharge();

        state.progress.lives = Math.min(state.progress.maxLives, state.progress.lives + 1);

        if (state.progress.lives >= state.progress.maxLives) {
            state.progress.nextLifeAt = 0;
        } else if (!state.progress.nextLifeAt) {
            state.progress.nextLifeAt = Date.now() + LIFE_RECHARGE_MS;
        }

        writeProgress(state.progress);
        updateLifeDisplay();
        updateCoinDisplay();
        refreshNoLivesModal();
    }

    function grantOneLifeFromNoLivesModal() {
        if (!state.progress) return;

        if (Number(state.progress.coins || 0) < ONE_LIFE_PRICE) {
            announce("Not enough coins.");
            refreshNoLivesModal();
            return;
        }

        state.progress.coins = Number(state.progress.coins || 0) - ONE_LIFE_PRICE;
        addOneLife();

        const pending = state.pendingLevelStart;

        closeNoLivesModal(false);
        state.pendingLevelStart = null;

        announce("1 life purchased.");

        if (pending) {
            clearAchievementNotifications();
            goToPlayPage(pending);
        }
    }

    function tryStartLevel(levelNumber) {
        syncLifeRecharge();
        updateLifeDisplay();

        if (state.progress.lives <= 0) {
            openNoLivesModal(levelNumber);
            return;
        }

        state.pendingLevelStart = null;
        clearAchievementNotifications();
        goToPlayPage(levelNumber);
    }

    function readAchievements() {
        const parsed = readJsonStorage(STORAGE_KEYS.achievements, defaultAchievements());

        if (!parsed || !Array.isArray(parsed.unlocked)) {
            return defaultAchievements();
        }

        return {
            version: 3,
            unlocked: parsed.unlocked.slice(),
            newlyUnlocked: Array.isArray(parsed.newlyUnlocked) ? parsed.newlyUnlocked.slice() : []
        };
    }

    function writeAchievements(data) {
        writeJsonStorage(STORAGE_KEYS.achievements, data);
    }

    function readSettings() {
        const parsed = readJsonStorage(STORAGE_KEYS.settings, getDefaultSettings());

        return {
            version: 3,
            soundOn: parsed.soundOn !== false,
            reducedMotion: !!parsed.reducedMotion,
            tutorialHints: parsed.tutorialHints !== false,
            colorblindSymbols: !!parsed.colorblindSymbols
        };
    }

    function writeSettings(settings) {
        writeJsonStorage(STORAGE_KEYS.settings, settings);
    }

    function evaluateAchievements() {
        if (!state.progress || !state.achievements) return;

        const summary = {
            completedLevels: state.progress.stats.completedLevels,
            totalStars: state.progress.stats.totalStars,
            threeStarLevels: state.progress.stats.threeStarLevels
        };

        const unlockedSet = new Set(state.achievements.unlocked);
        const newly = [];

        ACHIEVEMENT_DEFS.forEach(function(def) {
            if (!unlockedSet.has(def.id) && def.check(summary)) {
                unlockedSet.add(def.id);
                newly.push(def.title);
            }
        });

        if (newly.length) {
            state.achievements.unlocked = Array.from(unlockedSet);
            state.achievements.newlyUnlocked = newly.slice();
            writeAchievements(state.achievements);
        }
    }

    function clearAchievementNotifications() {
        if (!state.achievements) return;

        state.achievements.newlyUnlocked = [];
        writeAchievements(state.achievements);
        updateNotifyBadge();
    }

    function updateNotifyBadge() {
        if (!mapEls.notifyBadge) return;

        const count = state.achievements && Array.isArray(state.achievements.newlyUnlocked) ?
            state.achievements.newlyUnlocked.length :
            0;

        mapEls.notifyBadge.textContent = String(count);
    }

    function syncColorBubbleLeaderboardData() {
        const bestKey = "bca_best_colorBubbleChallenge";
        const runsKey = "bca_runs_colorBubbleChallenge";
        const progressKey = "bca_progress_colorBubbleChallenge";
        const usernameKey = "bca_username";

        const username = localStorage.getItem(usernameKey) || "Guest";
        const levelNumber = state.levelIndex + 1;
        const today = new Date().toISOString().slice(0, 10);

        let runs = readJsonStorage(runsKey, []);
        if (!Array.isArray(runs)) runs = [];

        const runEntry = {
            name: username,
            value: Number(state.score) || 0,
            date: today,
            level: levelNumber,
            stars: Number(state.stars) || 0,
            won: !!state.won
        };

        runs.unshift(runEntry);
        runs = runs.slice(0, 200);
        writeJsonStorage(runsKey, runs);

        const currentBest = readJsonStorage(bestKey, null);
        const currentBestValue =
            currentBest && Number.isFinite(Number(currentBest.value)) ?
            Number(currentBest.value) :
            null;

        if (currentBestValue === null || runEntry.value > currentBestValue) {
            writeJsonStorage(bestKey, {
                value: runEntry.value,
                date: runEntry.date,
                level: runEntry.level,
                stars: runEntry.stars
            });
        }

        const storedProgress = Number(localStorage.getItem(progressKey) || 0);
        const highestLevel = Number.isFinite(storedProgress) ?
            Math.max(storedProgress, levelNumber) :
            levelNumber;

        localStorage.setItem(progressKey, String(highestLevel));
    }

    function runLoadingScreen() {
        if (!loadingEls.wrap) return;

        let progress = 0;
        const messages = ["Loading bubbles...", "Preparing map...", "Almost there..."];

        const timer = window.setInterval(function() {
            progress += Math.random() * 18 + 8;
            progress = Math.min(progress, 100);

            if (loadingEls.fill) loadingEls.fill.style.width = progress + "%";

            if (loadingEls.text) {
                if (progress < 40) loadingEls.text.textContent = messages[0];
                else if (progress < 78) loadingEls.text.textContent = messages[1];
                else loadingEls.text.textContent = messages[2];
            }

            if (progress >= 100) {
                window.clearInterval(timer);

                window.setTimeout(function() {
                    loadingEls.wrap.classList.add("is-hidden");

                    window.setTimeout(function() {
                        loadingEls.wrap.style.display = "none";
                    }, 400);
                }, 250);
            }
        }, 110);
    }

    function buildMapNodePositions() {
        const positions = [];
        const mapWidth = 820;
        const startY = 650;
        const gapY = 72;

        const xPattern = [
            545, 445, 328, 270, 350, 460, 555,
            500, 405, 300, 295, 430, 550, 655
        ];

        for (let i = 0; i < TOTAL_LEVELS; i++) {
            const patternIndex = i % xPattern.length;
            const wave = Math.floor(i / xPattern.length);

            let x = xPattern[patternIndex];
            let y = startY - i * gapY;

            if (wave % 2 === 1) {
                x = mapWidth - x;
            }

            positions.push({
                x: x,
                y: y + 6500
            });
        }

        return positions;
    }

    const MAP_NODE_POSITIONS = buildMapNodePositions();

    function buildMapPath() {
        const path = mapEls.dotPath;
        if (!path) return;

        const points = MAP_NODE_POSITIONS.slice(0, TOTAL_LEVELS);
        let d = "";

        for (let i = 0; i < points.length; i++) {
            const p = points[i];

            if (i === 0) {
                d += "M " + p.x + " " + p.y + " ";
            } else {
                const prev = points[i - 1];
                const midX = (prev.x + p.x) / 2;
                const midY = (prev.y + p.y) / 2;

                d += "Q " + midX + " " + midY + " " + p.x + " " + p.y + " ";
            }
        }

        path.setAttribute("d", d.trim());
    }

    function updateMapWorldHeight() {
        const mapArea = document.querySelector(".cbc-bb-map-area");
        const mapNodes = document.querySelector(".cbc-bb-map-nodes");
        const mapDots = document.querySelector(".cbc-bb-map-dots");
        const height = Math.max(7200, 900 + TOTAL_LEVELS * 72);

        if (mapArea) {
            mapArea.style.height = height + "px";
            mapArea.style.minHeight = height + "px";
        }

        if (mapNodes) {
            mapNodes.style.height = height + "px";
            mapNodes.style.minHeight = height + "px";
        }

        if (mapDots) {
            mapDots.style.height = height + "px";
            mapDots.setAttribute("viewBox", "0 0 820 " + height);
        }

        buildMapPath();
    }

    function renderSelectedStars(count) {
        if (!mapEls.selectedStars) return;

        mapEls.selectedStars.innerHTML = "";

        for (let i = 0; i < 3; i++) {
            const star = document.createElement("span");
            star.textContent = "★";
            if (i < count) star.classList.add("on");
            mapEls.selectedStars.appendChild(star);
        }
    }

    function renderMap() {
        syncProgressFlags(state.progress);
        syncLifeRecharge();
        refreshProgressStats(state.progress);
        updateLifeDisplay();
        updateCoinDisplay();

        if (mapEls.lives) mapEls.lives.textContent = String(state.progress.lives);
        if (mapEls.totalStars) mapEls.totalStars.textContent = String(state.progress.totalStars || 0);
        if (mapEls.bestScore) mapEls.bestScore.textContent = String(state.progress.bestScore || 0);
        if (!mapEls.nodes) return;

        mapEls.nodes.innerHTML = "";

        const selected = clampInt(
            localStorage.getItem(STORAGE_KEYS.selectedLevel) || state.progress.selectedLevel,
            1,
            TOTAL_LEVELS,
            1
        );

        state.selectedLevel = selected;
        state.progress.selectedLevel = selected;

        state.progress.levels.forEach(function(levelInfo, index) {
            const node = createMapNode(levelInfo, index + 1 === selected);
            mapEls.nodes.appendChild(node);
        });

        const selectedLevelInfo = state.progress.levels[selected - 1];
        const selectedLevel = LEVELS[selected - 1];
        const locked = !selectedLevelInfo.unlocked;

        if (mapEls.piggyStarCount) {
            mapEls.piggyStarCount.textContent = String(state.progress.totalStars || 0);
        }

        if (mapEls.selectedLevelText) {
            mapEls.selectedLevelText.textContent = "Level " + selected;
        }

        if (mapEls.selectedLevelName) {
            mapEls.selectedLevelName.textContent = selectedLevel && selectedLevel.name ? selectedLevel.name : "";
        }

        renderSelectedStars(selectedLevelInfo.stars || 0);

        if (mapEls.playSelectedBtn) {
            mapEls.playSelectedBtn.disabled = locked;
            mapEls.playSelectedBtn.style.opacity = locked ? "0.72" : "1";
        }

        writeProgress(state.progress);
    }

    function createMapNode(levelInfo, isCurrent) {
        const levelData = LEVELS[levelInfo.level - 1];
        const pos = MAP_NODE_POSITIONS[levelInfo.level - 1] || { x: 400, y: 400 };

        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.level = String(levelInfo.level);

        const visualCompleted = levelInfo.completed || levelInfo.stars > 0;
        const visualStars = levelInfo.stars || 0;
        const unlocked = !!levelInfo.unlocked || levelInfo.level <= state.progress.unlockedLevel || levelInfo.level === 1;

        btn.className =
            "cbc-level-node" +
            (unlocked ? "" : " locked") +
            (visualCompleted ? " completed" : "") +
            (isCurrent || state.selectedLevel === levelInfo.level ? " current" : "");

        btn.style.left = pos.x + "px";
        btn.style.top = pos.y + "px";

        btn.setAttribute(
            "aria-label",
            unlocked ?
            "Level " + levelInfo.level + ", " + (levelData ? levelData.name : "") + ", " + visualStars + " stars" :
            "Level " + levelInfo.level + ", locked"
        );

        const stars = document.createElement("div");
        stars.className = "cbc-level-stars";

        for (let i = 0; i < 3; i++) {
            const star = document.createElement("span");
            star.textContent = "★";
            if (i < visualStars) star.classList.add("on");
            stars.appendChild(star);
        }

        const marker = document.createElement("div");
        marker.className = "cbc-current-marker";

        const core = document.createElement("div");
        core.className = "cbc-level-core";

        const number = document.createElement("span");
        number.className = "cbc-level-number";
        number.textContent = String(levelInfo.level);

        const lock = document.createElement("span");
        lock.className = "cbc-lock-icon";

        core.appendChild(number);
        core.appendChild(lock);
        btn.appendChild(stars);
        btn.appendChild(marker);
        btn.appendChild(core);

        btn.addEventListener("click", function() {
            state.selectedLevel = levelInfo.level;
            state.progress.selectedLevel = levelInfo.level;
            writeProgress(state.progress);

            if (!unlocked) {
                announce("Level locked.");
                return;
            }

            state.mapPanelVisible = true;
            tryStartLevel(levelInfo.level);
        });

        return btn;
    }

    function scrollMapToSelectedLevelInstant() {
        const frame = document.querySelector(".cbc-map-frame");
        if (!frame || !mapEls.nodes) return;

        const selectedNode = mapEls.nodes.querySelector(".cbc-level-node.current");
        if (!selectedNode) return;

        const targetTop = selectedNode.offsetTop - frame.clientHeight * 0.55;
        frame.scrollTop = Math.max(0, targetTop);
    }

    function setupMapScrollHiding() {
        const frame = document.querySelector(".cbc-map-frame");
        if (!frame) return;

        let hideTimer = 0;

        function hideFloatingMapItems() {
            frame.classList.add("cbc-map-frame--scrolling");
            window.clearTimeout(hideTimer);

            hideTimer = window.setTimeout(function() {
                frame.classList.remove("cbc-map-frame--scrolling");
            }, 450);
        }

        frame.addEventListener("scroll", hideFloatingMapItems, { passive: true });
        frame.addEventListener("touchmove", hideFloatingMapItems, { passive: true });

        frame.addEventListener("pointermove", function(event) {
            if (event.buttons === 1) hideFloatingMapItems();
        });
    }

    function clearPlayQueryFromUrl() {
        const url = new URL(window.location.href);
        url.searchParams.delete("screen");
        url.searchParams.delete("level");
        window.history.replaceState({}, "", url.pathname + url.search);
    }

    function showScreen(name) {
        state.activeScreen = name;
        syncBodyScreenClass(name);

        Object.keys(screenEls).forEach(function(key) {
            const el = screenEls[key];
            const active = key === name;

            el.hidden = !active;
            el.classList.toggle("cbc-screen--active", active);
        });

        if (name !== "play") {
            closeMenu(false);
            closeExitConfirm(false);
            closeRestartConfirm(false);
        }

        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        window.scrollTo(0, 0);

        requestAnimationFrame(syncCanvasDisplaySize);

        if (name === "play" && !state.rafId) {
            state.lastTime = performance.now();
            state.rafId = requestAnimationFrame(gameLoop);
        }
    }

    function goToPlayPage(levelNumber) {
        const level = clampInt(levelNumber, 1, TOTAL_LEVELS, 1);

        state.progress.selectedLevel = level;
        state.selectedLevel = level;
        writeProgress(state.progress);

        const url = new URL(window.location.href);
        url.searchParams.set("screen", "play");
        url.searchParams.set("level", String(level));

        window.location.href = url.pathname + "?" + url.searchParams.toString();
    }

    function openStartScreen() {
        clearPlayQueryFromUrl();
        updateStartButtons();
        updateNotifyBadge();
        showScreen("start");
    }

    function openMapScreen() {
        clearPlayQueryFromUrl();
        state.mapPanelVisible = false;
        updateMapWorldHeight();
        renderMap();
        updateNotifyBadge();
        showScreen("map");

        requestAnimationFrame(function() {
            scrollMapToSelectedLevelInstant();
        });
    }

    function openPlayScreen(levelNumber) {
        state.selectedLevel = clampInt(levelNumber, 1, TOTAL_LEVELS, 1);
        state.progress.selectedLevel = state.selectedLevel;
        writeProgress(state.progress);

        setupLevel(state.selectedLevel);
        showScreen("play");

        requestAnimationFrame(function() {
            syncCanvasDisplaySize();
            canvas.focus();
            window.scrollTo(0, 0);
        });
    }

    function updateStartButtons() {
        if (startEls.continueBtn) {
            startEls.continueBtn.disabled = false;
            startEls.continueBtn.style.opacity = "1";
            startEls.continueBtn.setAttribute("aria-disabled", "false");
        }

        if (startEls.totalLevels) {
            startEls.totalLevels.textContent = String(TOTAL_LEVELS);
        }
    }

    function resizeCanvas() {
        state.dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDpr);

        canvas.width = Math.round(CONFIG.logicalWidth * state.dpr);
        canvas.height = Math.round(CONFIG.logicalHeight * state.dpr);

        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

        renderCache.background.width = canvas.width;
        renderCache.background.height = canvas.height;

        syncCanvasDisplaySize();
        buildBackgroundCache();
    }

    function syncCanvasDisplaySize() {
        if (state.activeScreen !== "play") {
            canvas.style.width = CONFIG.logicalWidth + "px";
            canvas.style.height = CONFIG.logicalHeight + "px";
            return;
        }

        const screen = screenEls.play;
        if (!screen) return;

        const topbar = screen.querySelector(".cbc-mobile-topbar");
        const bottomDock = screen.querySelector(".cbc-bottom-dock");

        const topbarHeight = topbar ? topbar.offsetHeight : 0;
        const bottomDockHeight = bottomDock ? bottomDock.offsetHeight : 0;

        const availableWidth = window.innerWidth;
        const availableHeight = Math.max(0, window.innerHeight - topbarHeight - bottomDockHeight);

        let displayWidth = availableWidth;

        if (isVerySmallPhone()) {
            displayWidth = Math.min(displayWidth, 360);
        }

        let displayHeight = displayWidth / CONFIG.canvasAspectRatio;

        if (displayHeight > availableHeight) {
            displayHeight = availableHeight;
            displayWidth = displayHeight * CONFIG.canvasAspectRatio;
        }

        canvas.style.width = Math.max(0, Math.floor(displayWidth)) + "px";
        canvas.style.height = Math.max(0, Math.floor(displayHeight)) + "px";
    }

    function buildBackgroundCache() {
        const bctx = renderCache.background.getContext("2d");

        bctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
        bctx.clearRect(0, 0, CONFIG.logicalWidth, CONFIG.logicalHeight);

        bctx.fillStyle = "#9298bd";
        bctx.fillRect(0, 0, CONFIG.logicalWidth, CONFIG.logicalHeight);

        bctx.fillStyle = "rgba(85, 94, 150, 0.33)";
        bctx.fillRect(0, 0, 52, CONFIG.logicalHeight);
        bctx.fillRect(CONFIG.logicalWidth - 52, 0, 52, CONFIG.logicalHeight);

        bctx.fillStyle = "rgba(255,255,255,0.09)";
        bctx.fillRect(52, 0, CONFIG.logicalWidth - 104, 2);

        bctx.strokeStyle = "rgba(95, 104, 158, 0.45)";
        bctx.lineWidth = 3;
        bctx.beginPath();

        for (let x = 70; x < CONFIG.logicalWidth - 70; x += 26) {
            const y = CONFIG.topMargin - 18 + Math.sin(x * 0.16) * 2;
            if (x === 70) bctx.moveTo(x, y);
            else bctx.lineTo(x, y);
        }

        bctx.stroke();
    }

    function ensureAudioReady() {
        if (!state.soundOn) return null;

        try {
            if (!audioState.ctx) {
                audioState.ctx = new(window.AudioContext || window.webkitAudioContext)();
                audioState.master = audioState.ctx.createGain();
                audioState.master.gain.value = 0.38;
                audioState.master.connect(audioState.ctx.destination);
            }

            if (audioState.ctx.state === "suspended") {
                audioState.ctx.resume();
            }

            return audioState.ctx;
        } catch (err) {
            return null;
        }
    }

    function playTone(freq, duration, type, volume) {
        if (!state.soundOn) return;

        const ac = ensureAudioReady();
        if (!ac || !audioState.master) return;

        try {
            const osc = ac.createOscillator();
            const gain = ac.createGain();

            osc.type = type || "sine";
            osc.frequency.value = freq;

            const boostedVolume = Math.min((volume || 0.02) * 1.6, 0.12);

            gain.gain.value = boostedVolume;
            osc.connect(gain);
            gain.connect(audioState.master);

            const now = ac.currentTime;

            gain.gain.setValueAtTime(boostedVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            osc.start(now);
            osc.stop(now + duration);
        } catch (err) {
            /* ignore */
        }
    }

    function getCellX(row, col) {
        const offset = row % 2 ? CONFIG.colStep / 2 : 0;
        return CONFIG.leftMargin + offset + col * CONFIG.colStep;
    }

    function getCellY(row) {
        return CONFIG.topMargin + row * CONFIG.rowStep;
    }

    function getLauncherCenter() {
        return {
            x: CONFIG.logicalWidth / 2,
            y: CONFIG.launcherY
        };
    }

    function getCurrentBubbleCenter() {
        const launcher = getLauncherCenter();

        return {
            x: launcher.x,
            y: launcher.y - 2,
            radius: CONFIG.bubbleRadius
        };
    }

    function getNextBubbleCenter() {
        const launcher = getLauncherCenter();

        return {
            x: launcher.x + 42,
            y: launcher.y + 24,
            radius: CONFIG.bubbleRadius * 0.9
        };
    }

    function getColorPalette(level) {
        return CONFIG.defaultColors.slice(0, clampInt(level.colors, 3, 6, 4));
    }

    function createEmptyGrid(rows) {
        return Array.from({ length: rows }, function() {
            return new Array(CONFIG.cols).fill(null);
        });
    }

    function isInsideGrid(row, col) {
        return row >= 0 && row < state.grid.length && col >= 0 && col < CONFIG.cols;
    }

    function ensureGridRows(count) {
        while (state.grid.length < count) {
            state.grid.push(new Array(CONFIG.cols).fill(null));
        }
    }

    function makeBubble(row, col, spec) {
        return {
            row: row,
            col: col,
            x: getCellX(row, col),
            y: getCellY(row),
            type: spec.type || "normal",
            color: spec.color || null,
            scale: 1,
            pulse: 0
        };
    }

    function cloneBubbleSpec(spec) {
        return {
            type: spec.type,
            color: spec.color || null
        };
    }

    function forEachBubble(callback) {
        for (let row = 0; row < state.grid.length; row++) {
            for (let col = 0; col < CONFIG.cols; col++) {
                const bubble = state.grid[row][col];
                if (bubble) callback(bubble, row, col);
            }
        }
    }

    function createBubbleSpecForLevel(level, opts) {
        const palette = getColorPalette(level);
        const options = opts || {};
        const forBoard = !!options.forBoard;
        const allowSpecials = options.allowSpecials !== false;
        const forceNormal = !!options.forceNormal;

        if (forceNormal || !allowSpecials) {
            return {
                type: "normal",
                color: palette[Math.floor(Math.random() * palette.length)]
            };
        }

        if (forBoard) {
            if (level.allowStoneBubble && chance(level.stoneBubbleChance || 0)) return { type: "stone", color: null };
            if (level.allowBombBubble && chance(level.bombBubbleChance || 0)) return { type: "bomb", color: null };
            if (level.allowRainbowBubble && chance(level.rainbowBubbleChance || 0)) return { type: "rainbow", color: null };
        } else {
            if (level.allowBombBubble && chance((level.bombBubbleChance || 0) * 0.6)) return { type: "bomb", color: null };
            if (level.allowRainbowBubble && chance((level.rainbowBubbleChance || 0) * 0.55)) return { type: "rainbow", color: null };
        }

        return {
            type: "normal",
            color: palette[Math.floor(Math.random() * palette.length)]
        };
    }

    function shouldFillCell(level, row, col) {
        const rows = level.rows || 5;
        const center = (CONFIG.cols - 1) / 2;
        const dist = Math.abs(col - center);

        let fillChance = 0.72;

        if (row < 2) fillChance = 0.92;
        if (row > rows - 3) fillChance -= 0.12;
        if (dist > 3) fillChance -= 0.22;
        if ((row + col) % 5 === 0) fillChance -= 0.10;

        if (level.id <= 3) {
            fillChance = 0.85;
            if (row >= 3 && dist > 1.7) fillChance -= 0.35;
        }

        return chance(clamp(fillChance, 0.18, 0.95));
    }

    function buildGridForLevel(level) {
        const totalRows = Math.max((level.rows || 5) + 6, 16);
        const palette = getColorPalette(level);

        state.grid = createEmptyGrid(totalRows);

        if (level.id <= 3) {
            const pattern = [
                [2, 3, 4, 5],
                [2, 3, 4, 5],
                [3, 4],
                [3, 4],
                [4]
            ];

            for (let row = 0; row < pattern.length; row++) {
                for (let i = 0; i < pattern[row].length; i++) {
                    const col = pattern[row][i];

                    state.grid[row][col] = makeBubble(row, col, {
                        type: "normal",
                        color: palette[(row + i) % palette.length]
                    });
                }
            }

            return;
        }

        for (let row = 0; row < level.rows; row++) {
            for (let col = 0; col < CONFIG.cols; col++) {
                if (!shouldFillCell(level, row, col)) continue;

                let spec = createBubbleSpecForLevel(level, {
                    forBoard: true,
                    allowSpecials: row > 0
                });

                if (row < 1 && spec.type === "stone") {
                    spec = {
                        type: "normal",
                        color: palette[col % palette.length]
                    };
                }

                state.grid[row][col] = makeBubble(row, col, spec);
            }
        }

        let hasAny = false;

        forEachBubble(function() {
            hasAny = true;
        });

        if (!hasAny) {
            for (let row = 0; row < 4; row++) {
                for (let col = 1; col < 7; col++) {
                    if ((row + col) % 2 === 0) {
                        state.grid[row][col] = makeBubble(row, col, {
                            type: "normal",
                            color: palette[(row + col) % palette.length]
                        });
                    }
                }
            }
        }
    }

    function updateBubbleCoordinates() {
        forEachBubble(function(bubble, row, col) {
            bubble.row = row;
            bubble.col = col;
            bubble.x = getCellX(row, col);
            bubble.y = getCellY(row);
        });
    }

    function setupLevel(levelNumber) {
        const index = clampInt(levelNumber, 1, TOTAL_LEVELS, 1) - 1;
        const level = LEVELS[index];

        state.levelIndex = index;
        state.score = 0;
        state.shots = 0;
        state.stars = 0;
        state.combo = 0;
        state.shotsSinceDrop = 0;
        state.shotsLimitForDrop = clampInt(level.dropShots, 5, 15, 8);
        state.objectiveProgress = 0;
        state.objectiveCompleted = false;
        state.paused = false;
        state.ended = false;
        state.won = false;
        state.angle = -Math.PI / 2;
        state.targetAngle = -Math.PI / 2;
        state.currentBubble = createBubbleSpecForLevel(level, { forBoard: false });
        state.nextBubble = createBubbleSpecForLevel(level, { forBoard: false });
        state.activeShot = null;
        state.canSwap = true;
        state.pointerStart = null;
        state.swapHintTime = state.settings.tutorialHints ? 1.2 : 0;
        state.menuOpen = false;
        state.leavingPageHandled = false;
        state.pendingExitAction = null;

        state.tutorialSwapSeen = false;
        state.tutorialSwapTimer = state.settings.tutorialHints && level.tutorial && level.tutorial.showSwapHint ? 6 : 0;
        state.tutorialMousePhase = 0;

        state.particles = [];
        state.floatingTexts = [];
        state.hudDirty = true;
        state.shakeTime = 0;
        state.shakePower = 0;

        state.statSession = {
            shotsFired: 0,
            bubblesPopped: 0,
            largestCombo: 0
        };

        state.levelIntroTimer = state.settings.reducedMotion ? 0.8 : 1.4;

        setPauseButtonLabel(false);
        setSoundButtonLabel(state.soundOn);

        closeMenu(false);
        closeExitConfirm(false);
        closeRestartConfirm(false);
        closeNoLivesModal(false);
        closeCoinRewardEffect();
        closeOverlay(false);

        buildGridForLevel(level);
        updateBubbleCoordinates();
        buildBackgroundCache();
        updateStars();
        updateTopHud();
        updatePlayHUD();

        announce("Level " + level.id + ". " + level.name + ".");
    }

    function updatePlayHUD() {
        if (!state.hudDirty) return;

        const level = LEVELS[state.levelIndex];
        const objective = getCurrentObjective();

        if (playEls.levelName) playEls.levelName.textContent = level.name;
        if (playEls.hudLevel) playEls.hudLevel.textContent = String(level.id);
        if (playEls.hudScore) playEls.hudScore.textContent = String(state.score);
        if (playEls.hudShots) playEls.hudShots.textContent = String(state.shots);

        if (playEls.hudTarget) {
            playEls.hudTarget.textContent = objective.type === "score_target" ?
                String(objective.value) :
                String(level.targetScore);
        }

        if (playEls.hudStars) playEls.hudStars.textContent = state.stars + "/3";
        if (playEls.missionText) playEls.missionText.textContent = level.mission || "";

        updateTopHud();
        state.hudDirty = false;
    }

    function updateTopHud() {
        const level = getCurrentLevel();
        if (!level) return;

        if (playEls.topScoreText) playEls.topScoreText.textContent = String(state.score);

        if (playEls.topBubbleCount) {
            playEls.topBubbleCount.textContent = String(countRemainingBubbles().bubbleCount);
        }

        const starTargets = level.starTargets || {
            one: Math.floor(level.targetScore * 0.55),
            two: level.targetScore,
            three: Math.floor(level.targetScore * 1.35)
        };

        const star1 = starTargets.one;
        const star2 = starTargets.two;
        const star3 = starTargets.three;

        let fillPercent = 0;

        if (state.score <= 0) fillPercent = 0;
        else if (state.score < star1) fillPercent = (state.score / Math.max(1, star1)) * 33.33;
        else if (state.score < star2) fillPercent = 33.33 + ((state.score - star1) / Math.max(1, star2 - star1)) * 33.33;
        else if (state.score < star3) fillPercent = 66.66 + ((state.score - star2) / Math.max(1, star3 - star2)) * 33.34;
        else fillPercent = 100;

        fillPercent = clamp(fillPercent, 0, 100);

        if (playEls.topStarFill) playEls.topStarFill.style.width = fillPercent + "%";

        if (playEls.topStars && playEls.topStars.length) {
            playEls.topStars.forEach(function(starEl, index) {
                starEl.classList.toggle("is-on", index < state.stars);
            });
        }
    }

    function setPauseButtonLabel(isPaused) {
        if (!playEls.pauseBtn) return;

        playEls.pauseBtn.innerHTML = isPaused ?
            '<span class="cbc-settings-action-icon" aria-hidden="true">▶</span><span>Resume</span>' :
            '<span class="cbc-settings-action-icon" aria-hidden="true">⏸</span><span>Pause</span>';
    }

    function setSoundButtonLabel(isOn) {
        if (!playEls.soundBtn) return;

        playEls.soundBtn.innerHTML = isOn ?
            '<span class="cbc-settings-action-icon" aria-hidden="true">🔊</span><span>Sound On</span>' :
            '<span class="cbc-settings-action-icon" aria-hidden="true">🔇</span><span>Sound Off</span>';
    }

    function openMenu() {
        state.menuOpen = true;

        if (playEls.gameMenuPanel) {
            playEls.gameMenuPanel.classList.remove("hidden");
            playEls.gameMenuPanel.hidden = false;
            playEls.gameMenuPanel.setAttribute("aria-hidden", "false");
        }

        if (playEls.topMenuBtn) playEls.topMenuBtn.setAttribute("aria-expanded", "true");

        document.body.classList.add("cbc-settings-open");
    }

    function closeMenu(updateButton) {
        state.menuOpen = false;

        if (playEls.gameMenuPanel) {
            playEls.gameMenuPanel.classList.add("hidden");
            playEls.gameMenuPanel.hidden = true;
            playEls.gameMenuPanel.setAttribute("aria-hidden", "true");
        }

        if (updateButton !== false && playEls.topMenuBtn) {
            playEls.topMenuBtn.setAttribute("aria-expanded", "false");
        }

        if (!isNoLivesModalOpen() &&
            (!playEls.exitConfirmModal || playEls.exitConfirmModal.classList.contains("hidden")) &&
            (!playEls.restartConfirmModal || playEls.restartConfirmModal.classList.contains("hidden"))
        ) {
            document.body.classList.remove("cbc-settings-open");
        }
    }

    function toggleMenu() {
        if (state.menuOpen) closeMenu();
        else openMenu();
    }

    function isActiveUnfinishedPlayLevel() {
        return state.activeScreen === "play" && !state.ended && !state.won;
    }

    function openExitConfirm(action) {
        state.pendingExitAction = action || "map";

        closeMenu(false);

        if (!isActiveUnfinishedPlayLevel()) {
            runConfirmedExitAction();
            return;
        }

        state.paused = true;
        setPauseButtonLabel(true);

        if (playEls.exitConfirmModal) {
            playEls.exitConfirmModal.classList.remove("hidden");
            playEls.exitConfirmModal.hidden = false;
            playEls.exitConfirmModal.setAttribute("aria-hidden", "false");
        }

        document.body.classList.add("cbc-settings-open");

        requestAnimationFrame(function() {
            if (playEls.exitConfirmNo) {
                playEls.exitConfirmNo.focus();
            }
        });

        announce("Exit confirmation opened.");
    }

    function closeExitConfirm(resumeGame) {
        if (playEls.exitConfirmModal) {
            playEls.exitConfirmModal.classList.add("hidden");
            playEls.exitConfirmModal.hidden = true;
            playEls.exitConfirmModal.setAttribute("aria-hidden", "true");
        }

        if (!state.menuOpen && !isNoLivesModalOpen()) {
            document.body.classList.remove("cbc-settings-open");
        }

        if (resumeGame !== false && isActiveUnfinishedPlayLevel()) {
            state.paused = false;
            setPauseButtonLabel(false);
        }

        state.pendingExitAction = null;
    }

    function runConfirmedExitAction() {
        closeExitConfirm(false);

        if (STORY_MODE) {
            window.location.href = storyReturnUrl();
            return;
        }

        openMapScreen();
    }

    function confirmExitAndLoseLife() {
        if (isActiveUnfinishedPlayLevel()) {
            loseOneLife("You left the level. One life was lost.");
            state.ended = true;
            state.won = false;
            state.paused = false;
            state.activeShot = null;
            state.pointerStart = null;
            state.shakeTime = 0;
            state.shakePower = 0;
        }

        runConfirmedExitAction();
    }

    function isRestartConfirmOpen() {
        return !!(
            playEls.restartConfirmModal &&
            !playEls.restartConfirmModal.classList.contains("hidden")
        );
    }

    function openRestartConfirm() {
        closeMenu(false);

        if (!isActiveUnfinishedPlayLevel()) {
            resetCurrentLevel();
            return;
        }

        state.paused = true;
        setPauseButtonLabel(true);

        if (playEls.restartConfirmModal) {
            playEls.restartConfirmModal.classList.remove("hidden");
            playEls.restartConfirmModal.hidden = false;
            playEls.restartConfirmModal.setAttribute("aria-hidden", "false");
        }

        document.body.classList.add("cbc-settings-open");

        requestAnimationFrame(function() {
            if (playEls.restartConfirmNo) {
                playEls.restartConfirmNo.focus();
            }
        });

        announce("Restart confirmation opened.");
    }

    function closeRestartConfirm(resumeGame) {
        if (playEls.restartConfirmModal) {
            playEls.restartConfirmModal.classList.add("hidden");
            playEls.restartConfirmModal.hidden = true;
            playEls.restartConfirmModal.setAttribute("aria-hidden", "true");
        }

        if (!state.menuOpen &&
            !isNoLivesModalOpen() &&
            (!playEls.exitConfirmModal || playEls.exitConfirmModal.classList.contains("hidden"))
        ) {
            document.body.classList.remove("cbc-settings-open");
        }

        if (resumeGame !== false && isActiveUnfinishedPlayLevel()) {
            state.paused = false;
            setPauseButtonLabel(false);
        }
    }

    function confirmRestartAndLoseLife() {
        if (isActiveUnfinishedPlayLevel()) {
            loseOneLife("You restarted the level. One life was lost.");
        }

        closeRestartConfirm(false);
        resetCurrentLevel();
    }

    function pointerToCanvas(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();

        return {
            x: ((clientX - rect.left) / Math.max(1, rect.width)) * CONFIG.logicalWidth,
            y: ((clientY - rect.top) / Math.max(1, rect.height)) * CONFIG.logicalHeight
        };
    }

    function isPointInsideCircle(px, py, cx, cy, r) {
        const dx = px - cx;
        const dy = py - cy;
        return dx * dx + dy * dy <= r * r;
    }

    function isPointerInLauncherZone(clientX, clientY) {
        const point = pointerToCanvas(clientX, clientY);
        const launcher = getLauncherCenter();
        return isPointInsideCircle(point.x, point.y, launcher.x, launcher.y, CONFIG.launcherZoneRadius);
    }

    function isPointerOnNextBubble(clientX, clientY) {
        const point = pointerToCanvas(clientX, clientY);
        const next = getNextBubbleCenter();
        return isPointInsideCircle(point.x, point.y, next.x, next.y, next.radius + 14);
    }

    function isPointerOnCurrentBubble(clientX, clientY) {
        const point = pointerToCanvas(clientX, clientY);
        const current = getCurrentBubbleCenter();
        return isPointInsideCircle(point.x, point.y, current.x, current.y, current.radius + 10);
    }

    function setAimFromPointer(clientX, clientY) {
        const point = pointerToCanvas(clientX, clientY);
        const dx = point.x - CONFIG.logicalWidth / 2;
        const dy = point.y - CONFIG.launcherY;

        let angle = Math.atan2(dy, dx);
        if (angle > 0) angle -= Math.PI * 2;

        state.targetAngle = clamp(angle, CONFIG.aimMin, CONFIG.aimMax);
    }

    function swapCurrentAndNextBubble() {
        if (state.paused || state.ended || state.activeShot) return;
        if (!state.currentBubble || !state.nextBubble || !state.canSwap) return;

        const temp = cloneBubbleSpec(state.currentBubble);

        state.currentBubble = cloneBubbleSpec(state.nextBubble);
        state.nextBubble = temp;

        state.canSwap = false;
        state.swapHintTime = 0.35;
        state.tutorialSwapSeen = true;
        state.tutorialSwapTimer = 0;

        createFloatingText(CONFIG.logicalWidth / 2, CONFIG.launcherY - 42, "SWAP!", "#ffffff");
        playTone(680, 0.05, "triangle", 0.018);
        announce("Bubbles swapped.");

        window.setTimeout(function() {
            state.canSwap = true;
        }, 120);
    }

    function shootBubble() {
        if (state.paused || state.ended || state.activeShot || !state.currentBubble) return;

        const level = getCurrentLevel();
        const speed = Math.max(340, (level.speed || 8) * 60);

        state.activeShot = {
            x: CONFIG.logicalWidth / 2,
            y: CONFIG.launcherY,
            type: state.currentBubble.type,
            color: state.currentBubble.color,
            vx: Math.cos(state.angle) * speed,
            vy: Math.sin(state.angle) * speed,
            bounces: 0
        };

        state.currentBubble = cloneBubbleSpec(state.nextBubble);
        state.nextBubble = createBubbleSpecForLevel(level, { forBoard: false });

        state.shots += 1;
        state.shotsSinceDrop += 1;
        state.hudDirty = true;

        state.progress.stats.totalShots += 1;
        state.statSession.shotsFired += 1;

        playTone(560, 0.05, "triangle", 0.02);

        if (state.shotsSinceDrop >= state.shotsLimitForDrop) {
            state.shotsSinceDrop = 0;
            dropCeilingRow(level);
        }
    }

    function dropCeilingRow(level) {
        ensureGridRows(state.grid.length + 1);

        for (let row = state.grid.length - 1; row > 0; row--) {
            for (let col = 0; col < CONFIG.cols; col++) {
                const above = state.grid[row - 1][col];
                state.grid[row][col] = above;

                if (above) {
                    above.row = row;
                    above.col = col;
                    above.x = getCellX(row, col);
                    above.y = getCellY(row);
                    above.pulse = state.settings.reducedMotion ? 0.06 : 0.16;
                }
            }
        }

        state.grid[0] = new Array(CONFIG.cols).fill(null);

        const palette = getColorPalette(level);

        for (let col = 0; col < CONFIG.cols; col++) {
            if (Math.random() > 0.55) continue;

            state.grid[0][col] = makeBubble(0, col, {
                type: "normal",
                color: palette[col % palette.length]
            });
        }

        createFloatingText(CONFIG.logicalWidth / 2, CONFIG.topMargin + 22, "Row Dropped!", "#ffcf7a");

        state.shakeTime = state.settings.reducedMotion ? 0.06 : 0.14;
        state.shakePower = state.settings.reducedMotion ? 1.2 : 3;

        playTone(180, 0.07, "sawtooth", 0.02);
        announce("A new row dropped.");
    }

    function handleCanvasPointerDown(event) {
        if (state.activeScreen !== "play") return;
        if (isNoLivesModalOpen()) return;

        ensureAudioReady();
        closeMenu();

        const inLauncherZone = isPointerInLauncherZone(event.clientX, event.clientY);
        const onNextBubble = isPointerOnNextBubble(event.clientX, event.clientY);
        const onCurrentBubble = isPointerOnCurrentBubble(event.clientX, event.clientY);

        state.pointerStart = {
            x: event.clientX,
            y: event.clientY,
            inLauncherZone: inLauncherZone,
            onNextBubble: onNextBubble,
            onCurrentBubble: onCurrentBubble,
            moved: false
        };

        if (!inLauncherZone && !onNextBubble && !onCurrentBubble) {
            setAimFromPointer(event.clientX, event.clientY);
        }

        if (canvas.setPointerCapture && event.pointerId !== undefined) {
            try {
                canvas.setPointerCapture(event.pointerId);
            } catch (err) {
                /* ignore */
            }
        }
    }

    function handleCanvasPointerMove(event) {
        if (state.activeScreen !== "play") return;
        if (isNoLivesModalOpen()) return;

        if (!state.pointerStart) {
            setAimFromPointer(event.clientX, event.clientY);
            return;
        }

        const dx = event.clientX - state.pointerStart.x;
        const dy = event.clientY - state.pointerStart.y;

        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) state.pointerStart.moved = true;

        if (!state.pointerStart.inLauncherZone &&
            !state.pointerStart.onNextBubble &&
            !state.pointerStart.onCurrentBubble
        ) {
            setAimFromPointer(event.clientX, event.clientY);
        }
    }

    function handleCanvasPointerUp(event) {
        if (state.activeScreen !== "play" || !state.pointerStart) return;
        if (isNoLivesModalOpen()) return;

        const start = state.pointerStart;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        const tappedNextBubble = start.onNextBubble && absX < 12 && absY < 12;
        const swipedLauncher = (start.inLauncherZone || start.onNextBubble) &&
            absX > CONFIG.swipeThreshold &&
            absX > absY;

        const tappedCenterBall = start.onCurrentBubble && absX < 12 && absY < 12;

        if (tappedNextBubble || swipedLauncher) {
            swapCurrentAndNextBubble();
        } else if (tappedCenterBall) {
            shootBubble();
        } else {
            setAimFromPointer(event.clientX, event.clientY);
            shootBubble();
        }

        state.pointerStart = null;

        if (canvas.releasePointerCapture && event.pointerId !== undefined) {
            try {
                canvas.releasePointerCapture(event.pointerId);
            } catch (err) {
                /* ignore */
            }
        }
    }

    function handleCanvasPointerCancel(event) {
        state.pointerStart = null;

        if (canvas.releasePointerCapture && event && event.pointerId !== undefined) {
            try {
                canvas.releasePointerCapture(event.pointerId);
            } catch (err) {
                /* ignore */
            }
        }
    }

    function getNeighbors(row, col) {
        const odd = row % 2 === 1;

        if (odd) {
            return [
                [row, col - 1],
                [row, col + 1],
                [row - 1, col],
                [row - 1, col + 1],
                [row + 1, col],
                [row + 1, col + 1]
            ];
        }

        return [
            [row, col - 1],
            [row, col + 1],
            [row - 1, col - 1],
            [row - 1, col],
            [row + 1, col - 1],
            [row + 1, col]
        ];
    }

    function getNearOccupiedCells(x, y) {
        const rowGuess = Math.round((y - CONFIG.topMargin) / CONFIG.rowStep);
        const cells = [];

        for (let row = rowGuess - 2; row <= rowGuess + 2; row++) {
            if (row < 0 || row >= state.grid.length) continue;

            for (let col = 0; col < CONFIG.cols; col++) {
                const bubble = state.grid[row][col];
                if (!bubble) continue;

                const dx = bubble.x - x;
                const dy = bubble.y - y;
                const distSq = dx * dx + dy * dy;

                if (distSq <= 3200) cells.push(bubble);
            }
        }

        return cells;
    }

    function hasAdjacentBubble(row, col) {
        if (row === 0) return true;

        const neighbors = getNeighbors(row, col);

        for (let i = 0; i < neighbors.length; i++) {
            const nr = neighbors[i][0];
            const nc = neighbors[i][1];

            if (!isInsideGrid(nr, nc)) continue;
            if (state.grid[nr][nc]) return true;
        }

        return false;
    }

    function getSnapCellForShot(shot) {
        const approxRow = clampInt(
            Math.round((shot.y - CONFIG.topMargin) / CONFIG.rowStep),
            0,
            state.grid.length - 1,
            0
        );

        let best = null;
        let bestDistSq = Infinity;

        for (let row = approxRow - 2; row <= approxRow + 2; row++) {
            if (row < 0 || row >= state.grid.length) continue;

            for (let col = 0; col < CONFIG.cols; col++) {
                if (state.grid[row][col]) continue;
                if (!hasAdjacentBubble(row, col)) continue;

                const x = getCellX(row, col);
                const y = getCellY(row);
                const dx = x - shot.x;
                const dy = y - shot.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < bestDistSq) {
                    bestDistSq = distSq;
                    best = {
                        row: row,
                        col: col,
                        x: x,
                        y: y
                    };
                }
            }
        }

        if (best && bestDistSq <= CONFIG.snapDistanceLimit * CONFIG.snapDistanceLimit) {
            return best;
        }

        /*
           If the shot is touching the side wall, do not allow the fallback
           to stick it to a random side cell. Let the shot continue bouncing.
        */
        if (
            shot.x <= CONFIG.bubbleRadius + 2 ||
            shot.x >= CONFIG.logicalWidth - CONFIG.bubbleRadius - 2
        ) {
            return null;
        }

        let fallback = null;
        bestDistSq = Infinity;

        for (let row = approxRow - 2; row <= approxRow + 2; row++) {
            if (row < 0 || row >= state.grid.length) continue;

            for (let col = 0; col < CONFIG.cols; col++) {
                if (state.grid[row][col]) continue;

                const x = getCellX(row, col);
                const y = getCellY(row);
                const dx = x - shot.x;
                const dy = y - shot.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < bestDistSq) {
                    bestDistSq = distSq;
                    fallback = {
                        row: row,
                        col: col,
                        x: x,
                        y: y
                    };
                }
            }
        }

        return fallback;
    }

    function snapShotToTopWall() {
        if (!state.activeShot) return;

        const shot = state.activeShot;

        let bestCol = 0;
        let bestDist = Infinity;

        for (let col = 0; col < CONFIG.cols; col++) {
            if (state.grid[0][col]) continue;

            const x = getCellX(0, col);
            const dist = Math.abs(x - shot.x);

            if (dist < bestDist) {
                bestDist = dist;
                bestCol = col;
            }
        }

        if (state.grid[0][bestCol]) {
            for (let col = 0; col < CONFIG.cols; col++) {
                if (!state.grid[0][col]) {
                    bestCol = col;
                    break;
                }
            }
        }

        const bubble = makeBubble(0, bestCol, {
            type: shot.type,
            color: shot.color
        });

        bubble.scale = state.settings.reducedMotion ? 1.05 : 1.15;
        bubble.pulse = state.settings.reducedMotion ? 0.06 : 0.16;

        state.grid[0][bestCol] = bubble;
        state.activeShot = null;
        state.canSwap = true;

        playTone(430, 0.035, "triangle", 0.012);

        resolvePlacedBubble(bubble);
        updateObjectiveProgress();
        updateStars();
        checkEndConditions();

        state.hudDirty = true;
    }

    function updateShot(dt) {
        if (!state.activeShot || state.paused || state.ended) return;

        const shot = state.activeShot;

        shot.x += shot.vx * dt;
        shot.y += shot.vy * dt;

        /*
           Side walls should ONLY bounce the ball.
           Do not snap the ball to the grid here.
        */
        if (shot.x <= CONFIG.bubbleRadius) {
            shot.x = CONFIG.bubbleRadius + 0.5;
            shot.vx = Math.abs(shot.vx);
            shot.bounces += 1;
            playTone(320, 0.025, "square", 0.008);
        }

        if (shot.x >= CONFIG.logicalWidth - CONFIG.bubbleRadius) {
            shot.x = CONFIG.logicalWidth - CONFIG.bubbleRadius - 0.5;
            shot.vx = -Math.abs(shot.vx);
            shot.bounces += 1;
            playTone(320, 0.025, "square", 0.008);
        }

        /*
           Top wall should stick the ball to the top row.
        */
        if (shot.y <= CONFIG.topMargin) {
            shot.y = CONFIG.topMargin;
            snapShotToTopWall();
            return;
        }

        /*
           Safety: if the ball bounces too many times, push it upward.
           Do not snap it to the side wall.
        */
        if (shot.bounces > CONFIG.bounceLimit) {
            shot.vy = -Math.abs(shot.vy);

            if (Math.abs(shot.vx) > 120) {
                shot.vx *= 0.65;
            }
        }

        const nearby = getNearOccupiedCells(shot.x, shot.y);

        for (let i = 0; i < nearby.length; i++) {
            const bubble = nearby[i];
            const dx = bubble.x - shot.x;
            const dy = bubble.y - shot.y;
            const distSq = dx * dx + dy * dy;

            if (distSq <= CONFIG.bubbleHitDistance * CONFIG.bubbleHitDistance) {
                snapShotToGrid();
                return;
            }
        }
    }

    function snapShotToGrid() {
        if (!state.activeShot) return;

        const shot = state.activeShot;
        const snap = getSnapCellForShot(shot);

        if (!snap) {
            state.activeShot = null;
            state.canSwap = true;
            return;
        }

        const bubble = makeBubble(snap.row, snap.col, {
            type: shot.type,
            color: shot.color
        });

        bubble.scale = state.settings.reducedMotion ? 1.05 : 1.15;
        bubble.pulse = state.settings.reducedMotion ? 0.06 : 0.16;

        state.grid[snap.row][snap.col] = bubble;
        state.activeShot = null;
        state.canSwap = true;

        playTone(430, 0.035, "triangle", 0.012);

        resolvePlacedBubble(bubble);
        updateObjectiveProgress();
        updateStars();
        checkEndConditions();

        state.hudDirty = true;
    }

    function collectCluster(startRow, startCol, targetColor) {
        const stack = [
            [startRow, startCol]
        ];
        const result = [];
        const seen = new Set();

        while (stack.length) {
            const item = stack.pop();
            const row = item[0];
            const col = item[1];
            const key = row + ":" + col;

            if (seen.has(key)) continue;
            seen.add(key);

            if (!isInsideGrid(row, col)) continue;

            const bubble = state.grid[row][col];

            if (!bubble) continue;
            if (bubble.type === "stone" || bubble.type === "bomb") continue;
            if (bubble.type === "normal" && bubble.color !== targetColor) continue;

            result.push([row, col]);

            const neighbors = getNeighbors(row, col);

            for (let i = 0; i < neighbors.length; i++) {
                stack.push(neighbors[i]);
            }
        }

        return result;
    }

    function weightedNeighborScore(row, col, color) {
        let score = 0;
        const neighbors = getNeighbors(row, col);

        for (let i = 0; i < neighbors.length; i++) {
            const nr = neighbors[i][0];
            const nc = neighbors[i][1];

            if (!isInsideGrid(nr, nc)) continue;

            const bubble = state.grid[nr][nc];

            if (!bubble || bubble.type === "stone") continue;

            if (bubble.type === "bomb") score += 0.5;
            else if (bubble.type === "rainbow") score += 1;
            else if (bubble.color === color) score += 2;
        }

        return score;
    }

    function findBestRainbowColor(row, col) {
        const palette = getColorPalette(getCurrentLevel());

        let bestColor = palette[0];
        let bestScore = -1;

        for (let i = 0; i < palette.length; i++) {
            const color = palette[i];
            const score = weightedNeighborScore(row, col, color);

            if (score > bestScore) {
                bestScore = score;
                bestColor = color;
            }
        }

        return bestColor;
    }

    function resolvePlacedBubble(bubble) {
        if (!bubble) return;

        if (bubble.type === "bomb") {
            resolveBombAt(bubble.row, bubble.col);
            return;
        }

        if (bubble.type === "rainbow") {
            bubble.color = findBestRainbowColor(bubble.row, bubble.col);
        }

        if (!bubble.color) return;

        const cluster = collectCluster(bubble.row, bubble.col, bubble.color);

        if (cluster.length >= 3) {
            removeClusterAndScore(cluster, bubble.row, bubble.col);
        } else {
            state.combo = 0;
        }
    }

    function getBlastCells(row, col, depth) {
        const result = [];
        const queue = [{ row: row, col: col, d: 0 }];
        const seen = new Set();

        while (queue.length) {
            const item = queue.shift();
            const key = item.row + ":" + item.col;

            if (seen.has(key)) continue;
            seen.add(key);

            if (!isInsideGrid(item.row, item.col)) continue;

            result.push([item.row, item.col]);

            if (item.d >= depth) continue;

            const neighbors = getNeighbors(item.row, item.col);

            for (let i = 0; i < neighbors.length; i++) {
                queue.push({ row: neighbors[i][0], col: neighbors[i][1], d: item.d + 1 });
            }
        }

        return result;
    }

    function incrementPopStats(count) {
        state.progress.stats.totalPopped += count;
        state.statSession.bubblesPopped += count;
    }

    function resolveBombAt(row, col) {
        const level = getCurrentLevel();
        const cells = getBlastCells(row, col, 1);
        let removed = 0;

        for (let i = 0; i < cells.length; i++) {
            const r = cells[i][0];
            const c = cells[i][1];
            const bubble = state.grid[r][c];

            if (!bubble) continue;

            burstBubble(bubble, false);
            state.grid[r][c] = null;
            removed += 1;
        }

        incrementPopStats(removed);

        const rules = level.scoringRules || {};
        const base = removed * (rules.popPerBubble || 60);
        const bonus = Math.max(0, removed - 1) * (rules.comboStep || 25);
        const dropped = removeFloatingGroups();
        const dropScore = dropped * (rules.dropBonusPerBubble || 35);

        state.score += base + bonus + dropScore;
        state.combo += 1;
        state.statSession.largestCombo = Math.max(state.statSession.largestCombo, state.combo);

        createFloatingText(getCellX(row, col), getCellY(row), "BOOM +" + (base + bonus + dropScore), "#ffb86b");

        state.shakeTime = state.settings.reducedMotion ? 0.08 : 0.16;
        state.shakePower = state.settings.reducedMotion ? 1.8 : 3.8;

        playTone(220, 0.1, "sawtooth", 0.025);
        announce("Bomb exploded.");
    }

    function removeClusterAndScore(cluster, sourceRow, sourceCol) {
        const level = getCurrentLevel();
        const rules = level.scoringRules || {};
        let removed = 0;

        for (let i = 0; i < cluster.length; i++) {
            const r = cluster[i][0];
            const c = cluster[i][1];
            const bubble = state.grid[r][c];

            if (!bubble) continue;

            burstBubble(bubble, false);
            state.grid[r][c] = null;
            removed += 1;
        }

        incrementPopStats(removed);

        const dropped = removeFloatingGroups();
        const baseScore = removed * (rules.popPerBubble || 60);

        state.combo += 1;
        state.statSession.largestCombo = Math.max(state.statSession.largestCombo, state.combo);

        const comboBonus = Math.max(0, state.combo - 1) * (rules.comboStep || 25);
        const dropBonus = dropped * (rules.dropBonusPerBubble || 35);
        const total = baseScore + comboBonus + dropBonus;

        state.score += total;

        createFloatingText(getCellX(sourceRow, sourceCol), getCellY(sourceRow), "+" + total, "#ffe36f");

        state.shakeTime = state.settings.reducedMotion ? 0.06 : 0.12;
        state.shakePower = state.settings.reducedMotion ? 1.5 : 2.6;

        playTone(760, 0.06, "triangle", 0.02);

        if (state.combo > 1) {
            createFloatingText(CONFIG.logicalWidth / 2, CONFIG.topMargin + 34, "Combo x" + state.combo, "#9fefff");
            announce("Combo " + state.combo + ".");
        }
    }

    function removeFloatingGroups() {
        const connected = new Set();
        const stack = [];

        for (let col = 0; col < CONFIG.cols; col++) {
            if (state.grid[0][col]) stack.push([0, col]);
        }

        while (stack.length) {
            const item = stack.pop();
            const row = item[0];
            const col = item[1];
            const key = row + ":" + col;

            if (connected.has(key)) continue;

            connected.add(key);

            const neighbors = getNeighbors(row, col);

            for (let i = 0; i < neighbors.length; i++) {
                const nr = neighbors[i][0];
                const nc = neighbors[i][1];

                if (!isInsideGrid(nr, nc)) continue;
                if (!state.grid[nr][nc]) continue;

                stack.push([nr, nc]);
            }
        }

        let dropped = 0;

        for (let row = 0; row < state.grid.length; row++) {
            for (let col = 0; col < CONFIG.cols; col++) {
                const bubble = state.grid[row][col];

                if (!bubble) continue;

                const key = row + ":" + col;

                if (!connected.has(key)) {
                    burstBubble(bubble, true);
                    state.grid[row][col] = null;
                    dropped += 1;
                }
            }
        }

        if (dropped > 0) {
            incrementPopStats(dropped);
            createFloatingText(CONFIG.logicalWidth / 2, CONFIG.topMargin + 52, "Drop +" + dropped, "#9fefff");
            playTone(920, 0.08, "sine", 0.018);
        }

        return dropped;
    }

    function burstBubble(bubble, falling) {
        const isMobile = window.innerWidth <= 700;

        const count = state.settings.reducedMotion || isMobile ?
            (falling ? 4 : 3) :
            (falling ? 12 : 8);
        const tint =
            bubble.type === "stone" ?
            "#c7c7c7" :
            bubble.type === "bomb" ?
            "#ff9a3c" :
            bubble.type === "rainbow" ?
            "#ffffff" :
            bubble.color;

        for (let i = 0; i < count; i++) {
            const particle = {
                x: bubble.x,
                y: bubble.y,
                vx: rand(-110, 110),
                vy: rand(-110, 110) + (falling ? 60 : 0),
                life: rand(0.22, 0.42),
                maxLife: 0,
                size: rand(2.2, 4.6),
                color: tint
            };

            particle.maxLife = particle.life;
            state.particles.push(particle);
        }
    }

    function createFloatingText(x, y, text, color) {
        state.floatingTexts.push({
            x: x,
            y: y,
            text: text,
            color: color,
            life: state.settings.reducedMotion ? 0.45 : 0.7,
            maxLife: state.settings.reducedMotion ? 0.45 : 0.7
        });
    }

    function updateTutorial(dt) {
        if (state.paused || state.ended || state.tutorialSwapSeen || state.activeShot || !state.settings.tutorialHints) return;

        if (state.tutorialSwapTimer > 0) {
            state.tutorialSwapTimer = Math.max(0, state.tutorialSwapTimer - dt);
            state.tutorialMousePhase += dt * 2.2;
        }
    }

    function updateParticles(dt) {
        for (let i = state.particles.length - 1; i >= 0; i--) {
            const p = state.particles[i];

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 190 * dt;
            p.life -= dt;

            if (p.life <= 0) state.particles.splice(i, 1);
        }

        for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
            const t = state.floatingTexts[i];

            t.y -= 30 * dt;
            t.life -= dt;

            if (t.life <= 0) state.floatingTexts.splice(i, 1);
        }

        forEachBubble(function(bubble) {
            if (bubble.pulse > 0) {
                bubble.pulse = Math.max(0, bubble.pulse - dt);
                bubble.scale = 1 + bubble.pulse;
            } else {
                bubble.scale = lerp(bubble.scale, 1, 0.16);
            }
        });

        if (state.shakeTime > 0) state.shakeTime = Math.max(0, state.shakeTime - dt);
        if (state.swapHintTime > 0) state.swapHintTime = Math.max(0, state.swapHintTime - dt);
        if (state.levelIntroTimer > 0) state.levelIntroTimer = Math.max(0, state.levelIntroTimer - dt);
    }

    function updateObjectiveProgress() {
        const objective = getCurrentObjective();

        if (objective.type === "pop_count") {
            state.objectiveProgress = Math.min(objective.value || 0, state.statSession.bubblesPopped);
            state.objectiveCompleted = state.objectiveProgress >= (objective.value || 0);
        } else if (objective.type === "score_target") {
            state.objectiveProgress = state.score;
            state.objectiveCompleted = state.score >= (objective.value || getCurrentLevel().targetScore || 0);
        } else {
            state.objectiveProgress = 0;
            state.objectiveCompleted = false;
        }
    }

    function updateStars() {
        const level = getCurrentLevel();
        const starTargets = level.starTargets || {
            one: Math.floor(level.targetScore * 0.55),
            two: level.targetScore,
            three: Math.floor(level.targetScore * 1.35)
        };

        let stars = 0;

        if (state.score >= starTargets.one) stars = 1;
        if (state.score >= starTargets.two) stars = 2;
        if (state.score >= starTargets.three) stars = 3;

        state.stars = stars;
        updateTopHud();
    }

    function countRemainingBubbles() {
        let bubbleCount = 0;
        let reachedDanger = false;

        forEachBubble(function(bubble) {
            bubbleCount += 1;

            if (bubble.y >= CONFIG.dangerLineY) {
                reachedDanger = true;
            }
        });

        return {
            bubbleCount: bubbleCount,
            reachedDanger: reachedDanger
        };
    }

    function isObjectiveWinConditionMet(result) {
        const objective = getCurrentObjective();

        if (objective.type === "score_target") {
            return state.score >= (objective.value || getCurrentLevel().targetScore || 0);
        }

        if (objective.type === "pop_count") {
            return state.statSession.bubblesPopped >= (objective.value || 0);
        }

        return result.bubbleCount === 0;
    }

    function checkEndConditions() {
        const result = countRemainingBubbles();

        updateTopHud();

        if (result.reachedDanger) {
            finishLevel(false);
            return;
        }

        if (getCurrentObjective().type === "clear_all") {
            if (result.bubbleCount === 0) finishLevel(true);
            return;
        }

        if (isObjectiveWinConditionMet(result)) finishLevel(true);
    }

    function renderOverlayStars(count) {
        if (!overlayEls.stars) return;

        overlayEls.stars.innerHTML = "";

        for (let i = 0; i < 3; i++) {
            const star = document.createElement("span");
            star.textContent = "★";

            if (i < count) star.classList.add("on");

            overlayEls.stars.appendChild(star);
        }
    }

    function trapOverlayFocus(event) {
        if (!overlayEls.wrap || overlayEls.wrap.classList.contains("hidden")) return;
        if (event.key !== "Tab") return;

        const focusable = [overlayEls.nextBtn, overlayEls.mapBtn].filter(Boolean);
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function openOverlay() {
        if (!overlayEls.wrap) return;

        state.previousFocusedEl = document.activeElement;

        overlayEls.wrap.classList.remove("hidden");
        overlayEls.wrap.hidden = false;
        overlayEls.wrap.setAttribute("aria-hidden", "false");

        overlayEls.wrap.style.display = "grid";
        overlayEls.wrap.style.zIndex = "99999";

        document.addEventListener("keydown", trapOverlayFocus);

        requestAnimationFrame(function() {
            if (overlayEls.nextBtn) {
                overlayEls.nextBtn.focus();
            }
        });
    }

    function closeOverlay(restoreFocus) {
        if (!overlayEls.wrap) return;

        overlayEls.wrap.classList.add("hidden");
        overlayEls.wrap.hidden = true;
        overlayEls.wrap.setAttribute("aria-hidden", "true");
        overlayEls.wrap.style.display = "none";

        document.removeEventListener("keydown", trapOverlayFocus);

        if (
            restoreFocus !== false &&
            state.previousFocusedEl &&
            typeof state.previousFocusedEl.focus === "function"
        ) {
            state.previousFocusedEl.focus();
        }
    }

    function finishLevel(won) {
        if (state.ended) return;

        state.ended = true;
        state.won = won;
        state.pointerStart = null;
        state.activeShot = null;
        state.paused = false;

        state.shakeTime = 0;
        state.shakePower = 0;

        state.levelIntroTimer = 0;
        state.swapHintTime = 0;
        state.tutorialSwapTimer = 0;

        closeMenu(false);
        closeExitConfirm(false);
        closeNoLivesModal(false);

        const level = getCurrentLevel();
        const levelProgress = state.progress.levels[state.levelIndex];
        const wasAlreadyCompleted = !!levelProgress.completed;

        levelProgress.attempts += 1;

        if (won) {
            const clearBonus = (level.scoringRules || {}).fullClearBonus || 0;
            const speedBonus = state.shots <= Math.max(10, level.dropShots * 2) ?
                ((level.scoringRules || {}).speedClearBonus || 0) :
                0;

            state.score += clearBonus + speedBonus;
            state.hudDirty = true;

            updateStars();

            const finalStars = Math.max(1, state.stars);
            const earnedCoins = wasAlreadyCompleted ? 0 : LEVEL_UP_COIN_REWARD;

            levelProgress.wins += 1;
            saveCompletedLevel(finalStars, wasAlreadyCompleted);

            if (STORY_MODE) passStoryTest();

            if (overlayEls.title) overlayEls.title.textContent = String(level.id);

            if (overlayEls.message) {
                const highScoreText = state.score >= levelProgress.bestScore ? "New High Score" : "Score";

                overlayEls.message.innerHTML =
                    highScoreText +
                    '<br><span class="cbc-result-score">' + String(state.score) + "</span>" +
                    (earnedCoins > 0 ? '<br><small>+50 Coins</small>' : "");
            }

            renderOverlayStars(state.stars);

            if (overlayEls.nextBtn) {
                overlayEls.nextBtn.textContent = STORY_MODE ?
                    "Return" :
                    state.levelIndex + 1 < TOTAL_LEVELS ?
                    "Next" :
                    "Map";
            }

            if (overlayEls.mapBtn) {
                overlayEls.mapBtn.textContent = STORY_MODE ? "Play Again" : "Back to Map";
            }

            playTone(980, 0.12, "triangle", 0.03);

            window.setTimeout(function() {
                playTone(1240, 0.12, "triangle", 0.025);
            }, 80);

            announce("Level complete. " + state.stars + " stars earned.");
        } else {
            levelProgress.losses += 1;
            loseOneLife("Level failed. One life was lost.");

            if (overlayEls.title) overlayEls.title.textContent = String(level.id);

            if (overlayEls.message) {
                overlayEls.message.innerHTML =
                    'Try Again<br><span class="cbc-result-score">' + String(state.score) + "</span>";
            }

            renderOverlayStars(0);

            if (overlayEls.nextBtn) overlayEls.nextBtn.textContent = "Retry";
            if (overlayEls.mapBtn) overlayEls.mapBtn.textContent = STORY_MODE ? "Return" : "Back to Map";

            playTone(180, 0.16, "sawtooth", 0.03);
            announce("Game over.");
        }

        updateTopHud();
        updatePlayHUD();
        renderPlayCanvas();
        syncColorBubbleLeaderboardData();

        requestAnimationFrame(function() {
            openOverlay();

            if (won && !wasAlreadyCompleted) {
                window.setTimeout(function() {
                    openCoinRewardEffect(LEVEL_UP_COIN_REWARD, "Curious");
                }, 520);
            }
        });
    }

    function saveCompletedLevel(finalStars, wasAlreadyCompleted) {
        const levelNumber = state.levelIndex + 1;
        const level = getCurrentLevel();
        const levelProgress = state.progress.levels[state.levelIndex];

        levelProgress.completed = true;
        levelProgress.stars = Math.max(levelProgress.stars || 0, finalStars);
        levelProgress.bestScore = Math.max(levelProgress.bestScore || 0, state.score);
        levelProgress.bestCombo = Math.max(
            levelProgress.bestCombo || 0,
            state.statSession.largestCombo || state.combo
        );

        if (!wasAlreadyCompleted) {
            state.progress.coins = Number(state.progress.coins || 0) + LEVEL_UP_COIN_REWARD;
        }

        state.progress.bestScore = Math.max(state.progress.bestScore || 0, state.score);
        state.progress.stats.bestComboOverall = Math.max(
            state.progress.stats.bestComboOverall || 0,
            levelProgress.bestCombo || 0
        );

        if (level.rewards && level.rewards.bonusLifeOnClear) {
            state.progress.lives = Math.min(state.progress.maxLives, state.progress.lives + 1);
        }

        if (levelNumber < TOTAL_LEVELS) {
            state.progress.unlockedLevel = Math.max(state.progress.unlockedLevel, levelNumber + 1);
            state.progress.levels[levelNumber].unlocked = true;
            state.progress.selectedLevel = levelNumber + 1;
            state.selectedLevel = levelNumber + 1;
        } else {
            state.progress.selectedLevel = levelNumber;
            state.selectedLevel = levelNumber;
        }

        writeProgress(state.progress);
        updateCoinDisplay();
        evaluateAchievements();
        updateNotifyBadge();
    }

    function resetCurrentLevel() {
        closeOverlay(true);
        closeExitConfirm(false);
        closeRestartConfirm(false);
        closeNoLivesModal(false);
        closeCoinRewardEffect();
        closeMenu(false);
        setupLevel(state.levelIndex + 1);
        canvas.focus();
    }

    function goToNextAfterWin() {
        closeCoinRewardEffect();
        closeOverlay(true);

        if (!state.won) {
            resetCurrentLevel();
            return;
        }

        if (STORY_MODE) {
            window.location.href = storyReturnUrl();
            return;
        }

        if (state.levelIndex + 1 < TOTAL_LEVELS) {
            tryStartLevel(state.levelIndex + 2);
        } else {
            openMapScreen();
        }
    }

    function drawSolidBubbleBase(x, y, color, scale) {
        const radius = CONFIG.bubbleRadius * (scale || 1);

        ctx.save();

        /*
           Fast phone drawing:
           - no radialGradient
           - no extra shadow bubble
           - fewer arcs
           This removes most of the mobile delay.
        */
        if (isMobilePerformanceMode()) {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(
                x - radius * 0.32,
                y - radius * 0.36,
                radius * 0.22,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = "rgba(255,255,255,0.65)";
            ctx.fill();

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(0,0,0,0.16)";
            ctx.stroke();

            ctx.restore();
            return;
        }

        /*
           Desktop drawing:
           Keep the nicer glossy bubble style.
        */
        const shadow = ctx.createRadialGradient(
            x - radius * 0.35,
            y - radius * 0.35,
            radius * 0.2,
            x,
            y,
            radius * 1.2
        );

        shadow.addColorStop(0, "rgba(255,255,255,0.55)");
        shadow.addColorStop(0.44, color);
        shadow.addColorStop(1, "rgba(0,0,0,0.23)");

        ctx.beginPath();
        ctx.arc(x, y + radius * 0.12, radius * 0.96, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.16)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = shadow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x - radius * 0.34, y - radius * 0.42, radius * 0.24, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.86)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x - radius * 0.08, y - radius * 0.20, radius * 0.11, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.36)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.lineWidth = Math.max(1.5, radius * 0.10);
        ctx.strokeStyle = "rgba(255,255,255,0.32)";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, radius * 0.95, Math.PI * 0.20, Math.PI * 1.05);
        ctx.lineWidth = Math.max(1.2, radius * 0.08);
        ctx.strokeStyle = "rgba(0,0,0,0.12)";
        ctx.stroke();

        ctx.restore();
    }

    function getColorSymbol(color) {
        if (color === "#098cff" || color === "#2F80ED") return "●";
        if (color === "#e74316" || color === "#E53935") return "■";
        if (color === "#ffbc21" || color === "#F2C94C") return "▲";
        if (color === "#19b943" || color === "#27AE60") return "◆";
        if (color === "#b219cf" || color === "#9B51E0") return "★";
        if (color === "#f28b13" || color === "#F2994A") return "✦";
        return "•";
    }

    function drawBubbleIcon(x, y, type, scale, color) {
        const radius = CONFIG.bubbleRadius * (scale || 1);

        ctx.save();
        ctx.translate(x, y);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (type === "bomb") {
            ctx.fillStyle = "rgba(70,25,0,0.9)";
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.42, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = "#fff7d1";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(radius * 0.08, -radius * 0.34);
            ctx.lineTo(radius * 0.28, -radius * 0.60);
            ctx.stroke();

            ctx.fillStyle = "#fff7d1";
            ctx.font = "bold " + Math.round(radius * 0.7) + "px Arial";
            ctx.fillText("✦", 0, 0);
        } else if (type === "rainbow") {
            ctx.lineWidth = 3;

            const ring = radius * 0.62;
            const colors = ["#ff5a5a", "#ffd84a", "#51ef52", "#49a6ff", "#b56dff"];

            for (let i = 0; i < colors.length; i++) {
                ctx.strokeStyle = colors[i];
                ctx.beginPath();
                ctx.arc(0, 0, ring - i * 2.5, Math.PI * 0.1, Math.PI * 1.4);
                ctx.stroke();
            }

            ctx.fillStyle = "rgba(255,255,255,0.92)";
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
            ctx.fill();
        } else if (type === "stone") {
            ctx.strokeStyle = "rgba(0,0,0,0.25)";
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(-radius * 0.45, -radius * 0.12);
            ctx.lineTo(-radius * 0.10, -radius * 0.34);
            ctx.lineTo(radius * 0.16, -radius * 0.10);
            ctx.lineTo(radius * 0.44, -radius * 0.26);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(-radius * 0.32, radius * 0.28);
            ctx.lineTo(radius * 0.08, radius * 0.02);
            ctx.lineTo(radius * 0.34, radius * 0.24);
            ctx.stroke();
        } else if (state.settings.colorblindSymbols) {
            ctx.fillStyle = "rgba(255,255,255,0.95)";
            ctx.font = "bold " + Math.round(radius * 0.72) + "px Arial";
            ctx.fillText(getColorSymbol(color), 0, 0);
        }

        ctx.restore();
    }

    function drawBubble(x, y, bubbleOrColor, scale) {
        if (!bubbleOrColor) return;

        let type = "normal";
        let color = bubbleOrColor;

        if (typeof bubbleOrColor === "object") {
            type = bubbleOrColor.type || "normal";
            color = bubbleOrColor.color;
        }

        let baseColor = color;

        if (type === "bomb") baseColor = "#f2994a";
        if (type === "rainbow") baseColor = "#dbe9ff";
        if (type === "stone") baseColor = "#9da3ad";
        if (!baseColor) baseColor = "#dbe9ff";

        drawSolidBubbleBase(x, y, baseColor, scale);

        if (type !== "normal" || state.settings.colorblindSymbols) {
            drawBubbleIcon(x, y, type, scale, color);
        }
    }

    function drawAimGuide() {
        if (state.paused || state.ended || state.activeShot) return;

        let gx = CONFIG.logicalWidth / 2;
        let gy = CONFIG.launcherY;
        let vx = Math.cos(state.angle) * 460;
        let vy = Math.sin(state.angle) * 460;
        let bounces = 0;

        const mobile = isMobilePerformanceMode();
        const dotCount = mobile ? 10 : CONFIG.guideDots;
        const step = mobile ? 0.04 : 0.03;

        for (let i = 0; i < dotCount; i++) {
            gx += vx * step;
            gy += vy * step;

            if (gx <= CONFIG.bubbleRadius || gx >= CONFIG.logicalWidth - CONFIG.bubbleRadius) {
                vx *= -1;
                gx = clamp(gx, CONFIG.bubbleRadius, CONFIG.logicalWidth - CONFIG.bubbleRadius);
                bounces += 1;

                if (bounces > 2) break;
            }

            if (gy < CONFIG.topMargin - 20) break;

            ctx.beginPath();
            ctx.arc(gx, gy, mobile ? 2.2 : 2.35, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.62)";
            ctx.fill();

            if (!mobile) {
                ctx.beginPath();
                ctx.arc(gx, gy, 3.7, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(5,100,190,0.72)";
                ctx.lineWidth = 1.4;
                ctx.stroke();
            }
        }
    }

    function drawAimGuide() {
        if (state.paused || state.ended || state.activeShot) return;

        let gx = CONFIG.logicalWidth / 2;
        let gy = CONFIG.launcherY;
        let vx = Math.cos(state.angle) * 460;
        let vy = Math.sin(state.angle) * 460;
        let bounces = 0;

        const mobile = isMobilePerformanceMode();
        const dotCount = mobile ? 10 : CONFIG.guideDots;
        const step = mobile ? 0.04 : 0.03;

        for (let i = 0; i < dotCount; i++) {
            gx += vx * step;
            gy += vy * step;

            if (gx <= CONFIG.bubbleRadius || gx >= CONFIG.logicalWidth - CONFIG.bubbleRadius) {
                vx *= -1;
                gx = clamp(gx, CONFIG.bubbleRadius, CONFIG.logicalWidth - CONFIG.bubbleRadius);
                bounces += 1;

                if (bounces > 2) break;
            }

            if (gy < CONFIG.topMargin - 20) break;

            ctx.beginPath();
            ctx.arc(gx, gy, mobile ? 2.2 : 2.35, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.62)";
            ctx.fill();

            if (!mobile) {
                ctx.beginPath();
                ctx.arc(gx, gy, 3.7, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(5,100,190,0.72)";
                ctx.lineWidth = 1.4;
                ctx.stroke();
            }
        }
    }

    function drawLauncher() {
        const launcherX = CONFIG.logicalWidth / 2;
        const launcherY = CONFIG.launcherY;

        ctx.save();

        ctx.beginPath();
        ctx.arc(launcherX, launcherY + 2, 34, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.54)";
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(launcherX, launcherY + 2, 34, Math.PI * 0.30, Math.PI * 1.75);
        ctx.strokeStyle = state.canSwap ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.28)";
        ctx.lineWidth = 4;
        ctx.stroke();

        if (state.currentBubble) {
            drawBubble(launcherX, launcherY - 2, state.currentBubble, 1);
        }

        if (state.nextBubble) {
            const next = getNextBubbleCenter();

            ctx.save();
            ctx.beginPath();
            ctx.arc(next.x, next.y, CONFIG.bubbleRadius * 1.12, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255,255,255,0.28)";
            ctx.lineWidth = 6;
            ctx.stroke();
            ctx.restore();

            drawBubble(next.x, next.y, state.nextBubble, 0.76);
        }

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 19px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const shotsLeft = Math.max(0, state.shotsLimitForDrop - state.shotsSinceDrop);

        ctx.fillStyle = "rgba(40,45,65,0.75)";
        roundRect(ctx, launcherX - 78, launcherY - 18, 46, 28, 8);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.fillText(String(shotsLeft), launcherX - 55, launcherY - 4);

        if (state.swapHintTime > 0 && state.settings.tutorialHints) {
            ctx.globalAlpha = Math.min(1, state.swapHintTime / 0.45);
            ctx.font = "bold 12px Arial";
            ctx.fillText("Tap small bubble to swap", launcherX, launcherY + 70);
        }

        ctx.restore();
    }

    function drawGrid() {
        forEachBubble(function(bubble) {
            drawBubble(bubble.x, bubble.y, bubble, bubble.scale);
        });
    }

    function drawShot() {
        if (!state.activeShot) return;
        drawBubble(state.activeShot.x, state.activeShot.y, state.activeShot, 1);
    }

    function drawParticles() {
        for (let i = 0; i < state.particles.length; i++) {
            const p = state.particles[i];

            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    }

    function drawFloatingTexts() {
        ctx.textAlign = "center";
        ctx.font = "bold 20px Arial";

        for (let i = 0; i < state.floatingTexts.length; i++) {
            const t = state.floatingTexts[i];

            ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
            ctx.fillStyle = t.color;
            ctx.fillText(t.text, t.x, t.y);
        }

        ctx.globalAlpha = 1;
        ctx.textAlign = "start";
    }

    function drawSwapTutorial() {
        if (state.tutorialSwapSeen || state.tutorialSwapTimer <= 0 || state.activeShot || !state.settings.tutorialHints) return;

        const next = getNextBubbleCenter();
        const t = state.tutorialMousePhase;

        ctx.save();

        const alpha = Math.min(1, state.tutorialSwapTimer / 0.5);
        ctx.globalAlpha = Math.min(0.95, alpha);

        ctx.beginPath();
        ctx.arc(next.x, next.y, next.radius + 10 + Math.sin(t * 2) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.font = "bold 13px Arial";
        ctx.fillStyle = "rgba(255,255,255,0.98)";
        ctx.fillText("TAP SMALL BALL TO SWAP", CONFIG.logicalWidth / 2, CONFIG.launcherY + 82);

        ctx.restore();
    }

    function drawLevelIntro() {
        if (state.levelIntroTimer <= 0) return;

        const max = state.settings.reducedMotion ? 0.8 : 1.4;
        const alpha = clamp(state.levelIntroTimer / max, 0, 1);
        const level = getCurrentLevel();

        ctx.save();

        ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(0,0,0,0.30)";
        roundRect(ctx, 34, 183, 332, 92, 20);
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.32)";
        ctx.lineWidth = 2;
        roundRect(ctx, 34, 183, 332, 92, 20);
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.font = "bold 28px Arial";
        ctx.fillText("Level " + level.id, CONFIG.logicalWidth / 2, 218);

        ctx.font = "bold 16px Arial";
        ctx.fillText(level.name, CONFIG.logicalWidth / 2, 246);

        ctx.restore();
    }

    function renderPlayCanvas() {
        const shakeX = state.shakeTime > 0 ? rand(-state.shakePower, state.shakePower) : 0;
        const shakeY = state.shakeTime > 0 ? rand(-state.shakePower, state.shakePower) : 0;

        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
        ctx.clearRect(0, 0, CONFIG.logicalWidth, CONFIG.logicalHeight);

        ctx.save();
        ctx.translate(shakeX, shakeY);

        ctx.drawImage(
            renderCache.background,
            0,
            0,
            renderCache.background.width,
            renderCache.background.height,
            0,
            0,
            CONFIG.logicalWidth,
            CONFIG.logicalHeight
        );

        drawAimGuide();
        drawGrid();
        drawShot();
        drawParticles();
        drawFloatingTexts();
        drawLauncher();
        drawSwapTutorial();
        drawLevelIntro();

        if (state.paused && !state.ended && !isNoLivesModalOpen()) {
            ctx.fillStyle = "rgba(0,0,0,0.42)";
            ctx.fillRect(0, 0, CONFIG.logicalWidth, CONFIG.logicalHeight);

            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.font = "bold 38px Arial";
            ctx.fillText("Paused", CONFIG.logicalWidth / 2, CONFIG.logicalHeight / 2 - 10);

            ctx.font = "bold 20px Arial";
            ctx.fillText("Press Pause to continue", CONFIG.logicalWidth / 2, CONFIG.logicalHeight / 2 + 28);

            ctx.textAlign = "start";
        }

        ctx.restore();
    }

    function roundRect(context, x, y, width, height, radius) {
        const r = Math.min(radius, width / 2, height / 2);

        context.beginPath();
        context.moveTo(x + r, y);
        context.arcTo(x + width, y, x + width, y + height, r);
        context.arcTo(x + width, y + height, x, y + height, r);
        context.arcTo(x, y + height, x, y, r);
        context.arcTo(x, y, x + width, y, r);
        context.closePath();
    }

    function gameLoop(time) {
        const now = time || performance.now();
        let dt = (now - (state.lastTime || now)) / 1000;

        state.lastTime = now;
        dt = Math.min(dt, 0.025);

        if (state.activeScreen === "play") {
            state.angle = lerp(state.angle, state.targetAngle, CONFIG.pointerSmoothing);

            if (!state.paused && !state.ended) {
                updateShot(dt);
                updateTutorial(dt);

                if (state.hudDirty) {
                    updatePlayHUD();
                }
            }

            if (!state.paused) {
                updateParticles(dt);
            }

            renderPlayCanvas();

            state.rafId = requestAnimationFrame(gameLoop);
            return;
        }

        state.rafId = 0;
    }

    function wireEvents() {
        if (startEls.playBtn) {
            startEls.playBtn.addEventListener("click", function() {
                openMapScreen();
            });
        }

        if (playEls.restartConfirmYes) {
            playEls.restartConfirmYes.addEventListener("click", function() {
                confirmRestartAndLoseLife();
            });
        }

        if (playEls.restartConfirmNo) {
            playEls.restartConfirmNo.addEventListener("click", function() {
                closeRestartConfirm(true);
            });
        }

        if (startEls.continueBtn) {
            startEls.continueBtn.addEventListener("click", function() {
                openMapScreen();
            });
        }

        if (startEls.resetBtn) {
            startEls.resetBtn.addEventListener("click", function() {
                const ok = window.confirm("Reset all Color Bubble Challenge progress?");
                if (!ok) return;

                state.progress = getDefaultProgress();
                state.selectedLevel = 1;
                state.mapPanelVisible = false;
                state.achievements = defaultAchievements();

                writeProgress(state.progress);
                writeAchievements(state.achievements);

                try {
                    localStorage.removeItem("bca_best_colorBubbleChallenge");
                    localStorage.removeItem("bca_runs_colorBubbleChallenge");
                    localStorage.removeItem("bca_progress_colorBubbleChallenge");
                } catch (err) {
                    /* ignore */
                }

                openStartScreen();
                announce("Progress reset.");
            });
        }

        if (mapEls.playSelectedBtn) {
            mapEls.playSelectedBtn.addEventListener("click", function() {
                const selectedInfo = state.progress.levels[state.selectedLevel - 1];

                if (!selectedInfo.unlocked) return;

                tryStartLevel(state.selectedLevel);
            });
        }

        if (mapEls.backToStartBtn) {
            mapEls.backToStartBtn.addEventListener("click", function() {
                openStartScreen();
            });
        }

        if (mapEls.settingsBtn) {
            mapEls.settingsBtn.addEventListener("click", function() {
                window.location.href = "../../settings.html";
            });
        }

        if (playEls.backToMapBtn) {
            playEls.backToMapBtn.addEventListener("click", function() {
                if (isActiveUnfinishedPlayLevel()) {
                    openExitConfirm("map");
                    return;
                }

                if (STORY_MODE) {
                    window.location.href = storyReturnUrl();
                    return;
                }

                openMapScreen();
            });
        }

        if (playEls.pauseBtn) {
            playEls.pauseBtn.addEventListener("click", function() {
                if (state.ended) return;

                state.paused = !state.paused;
                setPauseButtonLabel(state.paused);
                closeMenu();
                announce(state.paused ? "Game paused." : "Game resumed.");
            });
        }

        if (playEls.restartBtn) {
            playEls.restartBtn.addEventListener("click", function() {
                openRestartConfirm();
            });
        }

        if (playEls.soundBtn) {
            playEls.soundBtn.addEventListener("click", function() {
                state.soundOn = !state.soundOn;
                state.settings.soundOn = state.soundOn;

                writeSettings(state.settings);
                setSoundButtonLabel(state.soundOn);
                closeMenu();

                announce(state.soundOn ? "Sound on." : "Sound off.");
            });
        }

        if (playEls.exitGameBtn) {
            playEls.exitGameBtn.addEventListener("click", function() {
                if (isActiveUnfinishedPlayLevel()) {
                    openExitConfirm("map");
                    return;
                }

                if (STORY_MODE) {
                    window.location.href = storyReturnUrl();
                    return;
                }

                openMapScreen();
            });
        }

        if (playEls.exitConfirmYes) {
            playEls.exitConfirmYes.addEventListener("click", function() {
                confirmExitAndLoseLife();
            });
        }

        if (playEls.exitConfirmNo) {
            playEls.exitConfirmNo.addEventListener("click", function() {
                closeExitConfirm(true);
            });
        }

        if (playEls.topMenuBtn) {
            playEls.topMenuBtn.addEventListener("click", function() {
                toggleMenu();
            });
        }

        if (playEls.closeSettingsBtn) {
            playEls.closeSettingsBtn.addEventListener("click", function() {
                closeMenu();
            });
        }

        if (overlayEls.nextBtn) {
            overlayEls.nextBtn.addEventListener("click", function() {
                goToNextAfterWin();
            });
        }

        if (overlayEls.mapBtn) {
            overlayEls.mapBtn.addEventListener("click", function() {
                closeCoinRewardEffect();
                closeOverlay(true);

                if (STORY_MODE) {
                    if (state.won) resetCurrentLevel();
                    else window.location.href = storyReturnUrl();
                    return;
                }

                openMapScreen();
            });
        }

        canvas.addEventListener("pointerdown", handleCanvasPointerDown);
        canvas.addEventListener("pointermove", handleCanvasPointerMove, { passive: true });
        canvas.addEventListener("pointerup", handleCanvasPointerUp);
        canvas.addEventListener("pointercancel", handleCanvasPointerCancel);
        canvas.addEventListener("pointerleave", handleCanvasPointerCancel);

        document.addEventListener("click", function(event) {
            if (state.activeScreen !== "play" || !state.menuOpen) return;

            const panel = playEls.gameMenuPanel;
            const menuBtn = playEls.topMenuBtn;

            if (!panel || !menuBtn) return;

            if (event.target && event.target.hasAttribute("data-close-settings")) {
                closeMenu();
                return;
            }

            if (panel.contains(event.target) || menuBtn.contains(event.target)) return;

            closeMenu();
        });

        window.addEventListener("beforeunload", function() {
            if (
                state.activeScreen === "play" &&
                !state.ended &&
                !state.won &&
                !state.leavingPageHandled
            ) {
                state.leavingPageHandled = true;
                loseOneLife("");
            }
        });

        window.setInterval(function() {
            if (!state.progress) return;

            syncLifeRecharge();
            updateLifeDisplay();
            updateCoinDisplay();

            if (isNoLivesModalOpen()) {
                refreshNoLivesModal();
            }

            if (state.activeScreen === "map") {
                writeProgress(state.progress);
            }
        }, 1000);

        window.addEventListener("keydown", function(event) {
            const key = String(event.key).toLowerCase();

            if (
                coinRewardEls &&
                coinRewardEls.wrap &&
                !coinRewardEls.wrap.classList.contains("hidden") &&
                key === "escape"
            ) {
                event.preventDefault();
                closeCoinRewardEffect();
                return;
            }

            if (isNoLivesModalOpen() && key === "escape") {
                event.preventDefault();
                closeNoLivesModal();
                return;
            }

            if (
                playEls.restartConfirmModal &&
                !playEls.restartConfirmModal.classList.contains("hidden") &&
                key === "escape"
            ) {
                event.preventDefault();
                closeRestartConfirm(true);
                return;
            }

            if (overlayEls.wrap && !overlayEls.wrap.classList.contains("hidden") && key === "escape") {
                event.preventDefault();
                closeOverlay(true);
                return;
            }

            if (state.activeScreen === "play" && state.menuOpen && key === "escape") {
                event.preventDefault();
                closeMenu();
                return;
            }

            if (state.activeScreen !== "play") return;

            if (key === "arrowleft" || key === "a") {
                event.preventDefault();
                state.targetAngle = clamp(state.targetAngle - 0.08, CONFIG.aimMin, CONFIG.aimMax);
            } else if (key === "arrowright" || key === "d") {
                event.preventDefault();
                state.targetAngle = clamp(state.targetAngle + 0.08, CONFIG.aimMin, CONFIG.aimMax);
            } else if (key === " " || key === "enter") {
                event.preventDefault();

                if (state.ended) goToNextAfterWin();
                else shootBubble();
            } else if (key === "s") {
                event.preventDefault();
                swapCurrentAndNextBubble();
            } else if (key === "p") {
                event.preventDefault();

                if (!state.ended) {
                    state.paused = !state.paused;
                    setPauseButtonLabel(state.paused);
                }
            } else if (key === "r") {
                event.preventDefault();

                if (isActiveUnfinishedPlayLevel()) {
                    openRestartConfirm();
                } else {
                    resetCurrentLevel();
                }
            } else if (key === "m") {
                event.preventDefault();
                toggleMenu();
            } else if (key === "escape") {
                event.preventDefault();

                if (isActiveUnfinishedPlayLevel()) {
                    openExitConfirm("map");
                    return;
                }

                if (STORY_MODE) {
                    window.location.href = storyReturnUrl();
                } else {
                    openMapScreen();
                }
            }
        });

        window.addEventListener("resize", function() {
            resizeCanvas();
            syncCanvasDisplaySize();

            if (state.activeScreen === "map") {
                updateMapWorldHeight();
            }
        });

        window.addEventListener("orientationchange", function() {
            window.setTimeout(function() {
                resizeCanvas();
                syncCanvasDisplaySize();

                if (state.activeScreen === "map") {
                    updateMapWorldHeight();
                }
            }, 80);
        });
    }

    function initProgress() {
        state.progress = readProgress();
        state.achievements = readAchievements();
        state.settings = readSettings();
        state.soundOn = state.settings.soundOn;

        const savedSelected = clampInt(
            localStorage.getItem(STORAGE_KEYS.selectedLevel) || state.progress.selectedLevel,
            1,
            TOTAL_LEVELS,
            1
        );

        state.selectedLevel = savedSelected;
        state.progress.selectedLevel = savedSelected;

        syncLifeRecharge();
        writeProgress(state.progress);
        evaluateAchievements();
    }

    function init() {
        runLoadingScreen();

        resizeCanvas();
        initProgress();
        ensureNoLivesModal();
        ensureCoinRewardEffect();
        wireEvents();
        setupMapScrollHiding();
        updateMapWorldHeight();
        updateNotifyBadge();
        updateLifeDisplay();
        updateCoinDisplay();

        const params = new URLSearchParams(window.location.search);
        const screenParam = params.get("screen");
        const levelParam = clampInt(params.get("level"), 1, TOTAL_LEVELS, state.selectedLevel);

        if (screenParam === "play") {
            openPlayScreen(levelParam);
        } else {
            openStartScreen();
        }

        if (state.activeScreen === "play") {
            state.rafId = requestAnimationFrame(gameLoop);
        }
    }

    init();
})();