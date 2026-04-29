/* =========================================================
   Brain Challenge Arcade - storage.js
   Centralized storage layer for ALL pages & games

   
   PURPOSE:
   - Provide safe localStorage access
   - Standardize keys and data structure
   - Avoid duplicated storage logic in each page
   - Make your project look PROFESSIONAL (100% level)

   USAGE EXAMPLE (inside any game):
     BCAStorage.incrementTotalPlays();
     BCAStorage.saveBest("imageGuess", 8);
     BCAStorage.saveRun("imageGuess", 8);
     const best = BCAStorage.getBest("imageGuess");

   ========================================================= */

(function() {
    "use strict";

    /* ---------------------------------------------------------
       SAFE STORAGE HELPERS
    --------------------------------------------------------- */

    function safeGet(key, fallback) {
        try {
            const v = localStorage.getItem(key);
            return v === null ? fallback : v;
        } catch {
            return fallback;
        }
    }

    function safeSet(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch {}
    }

    function safeRemove(key) {
        try {
            localStorage.removeItem(key);
        } catch {}
    }

    function safeJsonGet(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            return JSON.parse(raw);
        } catch {
            return fallback;
        }
    }

    function safeJsonSet(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {}
    }

    /* ---------------------------------------------------------
       GLOBAL STORAGE KEYS (single source of truth)
    --------------------------------------------------------- */

    const KEYS = {
        username: "bca_username",
        totalPlays: "bca_totalPlays",
        achievementsCount: "bca_achievementsCount",
        storyProgress: "bca_story_progress",
        storyState: "bca_story_state",
        unlockedAchievements: "bca_achievements_unlocked",

        theme: "bca_theme",
        sound: "bca_sound",
        reducedMotion: "bca_motion",

        best: {
            imageGuess: "bca_best_imageGuess",
            memoryTest: "bca_best_memoryTest",
            cardMatching: "bca_best_cardMatching"
        },

        runs: {
            imageGuess: "bca_runs_imageGuess",
            memoryTest: "bca_runs_memoryTest",
            cardMatching: "bca_runs_cardMatching"
        }
    };

    /* ---------------------------------------------------------
       CORE PROFILE METHODS
    --------------------------------------------------------- */

    function getUsername() {
        return safeGet(KEYS.username, "Guest");
    }

    function setUsername(name) {
        safeSet(KEYS.username, name || "Guest");
    }

    function getTotalPlays() {
        return Number(safeGet(KEYS.totalPlays, "0")) || 0;
    }

    function incrementTotalPlays() {
        const current = getTotalPlays();
        safeSet(KEYS.totalPlays, String(current + 1));
    }

    /* ---------------------------------------------------------
       BEST SCORE METHODS
    --------------------------------------------------------- */

    function getBest(gameKey) {
        const key = KEYS.best[gameKey];
        if (!key) return null;

        const raw = safeGet(key, null);
        if (raw === null) return null;

        const num = Number(raw);
        return Number.isFinite(num) ? num : raw;
    }

    function saveBest(gameKey, value) {
        const key = KEYS.best[gameKey];
        if (!key) return;

        const current = getBest(gameKey);

        // If no best yet → save directly
        if (current === null) {
            safeSet(key, String(value));
            return;
        }

        // Higher score is better (default logic)
        if (Number(value) > Number(current)) {
            safeSet(key, String(value));
        }
    }

    function clearBest(gameKey) {
        const key = KEYS.best[gameKey];
        if (key) safeRemove(key);
    }

    /* ---------------------------------------------------------
       RUN HISTORY METHODS
       Structure:
         [
           { name: "Alex", value: 8, date: "2026-02-23" }
         ]
    --------------------------------------------------------- */

    function getRuns(gameKey) {
        const key = KEYS.runs[gameKey];
        if (!key) return [];
        const data = safeJsonGet(key, []);
        return Array.isArray(data) ? data : [];
    }

    function saveRun(gameKey, value) {
        const key = KEYS.runs[gameKey];
        if (!key) return;

        const runs = getRuns(gameKey);
        runs.push({
            name: getUsername(),
            value: Number(value),
            date: new Date().toISOString().slice(0, 10)
        });

        safeJsonSet(key, runs);
    }

    function clearRuns(gameKey) {
        const key = KEYS.runs[gameKey];
        if (key) safeRemove(key);
    }

    /* ---------------------------------------------------------
       STORY PROGRESS
    --------------------------------------------------------- */

    function getStoryProgress() {
        return Number(safeGet(KEYS.storyProgress, "0")) || 0;
    }

    function setStoryProgress(percent) {
        const value = Math.max(0, Math.min(100, Number(percent) || 0));
        safeSet(KEYS.storyProgress, String(value));
    }

    /* ---------------------------------------------------------
       ACHIEVEMENTS
    --------------------------------------------------------- */

    function getAchievementsCount() {
        return Number(safeGet(KEYS.achievementsCount, "0")) || 0;
    }

    function setAchievementsCount(count) {
        safeSet(KEYS.achievementsCount, String(Number(count) || 0));
    }

    function getUnlockedAchievements() {
        return safeJsonGet(KEYS.unlockedAchievements, {});
    }

    function setUnlockedAchievements(obj) {
        safeJsonSet(KEYS.unlockedAchievements, obj || {});
    }

    /* ---------------------------------------------------------
       SETTINGS
    --------------------------------------------------------- */

    function getSetting(name) {
        if (!KEYS[name]) return null;
        return safeGet(KEYS[name], null);
    }

    function setSetting(name, value) {
        if (!KEYS[name]) return;
        safeSet(KEYS[name], value);
    }

    /* ---------------------------------------------------------
       FULL RESET (only BCA keys)
    --------------------------------------------------------- */

    function resetAllData() {
        Object.values(KEYS).forEach((value) => {
            if (typeof value === "string") {
                safeRemove(value);
            }
        });

        Object.values(KEYS.best).forEach(safeRemove);
        Object.values(KEYS.runs).forEach(safeRemove);
    }

    /* ---------------------------------------------------------
       EXPOSE GLOBAL STORAGE API
    --------------------------------------------------------- */

    window.BCAStorage = {
        // Profile
        getUsername,
        setUsername,
        getTotalPlays,
        incrementTotalPlays,

        // Best scores
        getBest,
        saveBest,
        clearBest,

        // Runs
        getRuns,
        saveRun,
        clearRuns,

        // Story
        getStoryProgress,
        setStoryProgress,

        // Achievements
        getAchievementsCount,
        setAchievementsCount,
        getUnlockedAchievements,
        setUnlockedAchievements,

        // Settings
        getSetting,
        setSetting,

        // Reset
        resetAllData
    };
})();