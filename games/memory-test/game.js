(function() {
    "use strict";

    /* =========================================================
       Memory Test Game JS
       Full updated version
       Matches updated index.html and game.css
       Features:
       - Landing screen
       - 5 lives
       - Level 01 format
       - 3x3 starting board
       - Pattern memory gameplay
       - Correct level green glow effect
       - Sound toggle
       - Hint
       - Settings modal
       - Local storage best score
       - Story mode compatibility
    ========================================================= */

    /* =========================================================
       1. Config
    ========================================================= */

    var MAX_LEVEL = 12;
    var START_LIVES = 5;

    var BEST_LEVEL_KEY = "bca_best_memoryTest_level";
    var PROGRESS_KEY = "bca_progress_memoryTest";
    var RUNS_KEY = "bca_runs_memoryTest";
    var BEST_LB_KEY = "bca_best_memoryTest";
    var LEVELCAP_KEY = "bca_levelcap_memoryTest";

    var STORY_COMPAT_PASS_KEY = "bca_story_pass_memoryTest_L1";
    var STORY_FORCE_LEVEL = 1;
    var STORY_AUTO_RETURN_MS = 900;

    var GAME_ID = "memory-test";
    var SOUND_SESSION_KEY = "mt_sound_enabled";

    /* =========================================================
       2. Helper Functions
    ========================================================= */

    function $(id) {
        return document.getElementById(id);
    }

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
        } catch (e) {
            /* Ignore localStorage errors */
        }
    }

    function safeRemove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            /* Ignore localStorage errors */
        }
    }

    function safeJsonParse(str, fallback) {
        try {
            return JSON.parse(str);
        } catch (e) {
            return fallback;
        }
    }

    function safeJsonStringify(obj, fallback) {
        try {
            return JSON.stringify(obj);
        } catch (e) {
            return fallback;
        }
    }

    function toNum(value, def) {
        var n = Number(value);
        return Number.isFinite(n) ? n : def;
    }

    function clampInt(n, min, max) {
        var value = Math.trunc(Number(n));

        if (!Number.isFinite(value)) {
            return min;
        }

        return Math.max(min, Math.min(max, value));
    }

    function todayISO() {
        var d = new Date();
        var yyyy = d.getFullYear();
        var mm = String(d.getMonth() + 1).padStart(2, "0");
        var dd = String(d.getDate()).padStart(2, "0");

        return yyyy + "-" + mm + "-" + dd;
    }

    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = arr[i];

            arr[i] = arr[j];
            arr[j] = temp;
        }

        return arr;
    }

    function sleep(ms) {
        return new Promise(function(resolve) {
            setTimeout(resolve, ms);
        });
    }

    function getQueryParam(name) {
        var qs = window.location.search || "";

        if (!qs) {
            return "";
        }

        qs = qs.replace(/^\?/, "");

        var parts = qs.split("&");

        for (var i = 0; i < parts.length; i++) {
            var kv = parts[i].split("=");
            var key = decodeURIComponent(kv[0] || "");

            if (key === name) {
                return decodeURIComponent(kv[1] || "");
            }
        }

        return "";
    }

    function isStoryMode() {
        return (
            getQueryParam("story") === "1" ||
            (getQueryParam("mode") || "").toLowerCase() === "story"
        );
    }

    function safeTestId(raw) {
        raw = String(raw || "").trim().toLowerCase();

        if (!raw) {
            return "";
        }

        raw = raw.replace(/\s+/g, "_");
        raw = raw.replace(/[^a-z0-9_-]/g, "");

        return raw;
    }

    function storyTestId() {
        return safeTestId(getQueryParam("test"));
    }

    function storyReturnUrl() {
        return getQueryParam("return") || "../../story.html";
    }

    function storyTestKey(testId) {
        return "bca_story_test_" + safeTestId(testId);
    }

    /* =========================================================
       3. DOM Elements
    ========================================================= */

    var landingScreen = $("landingScreen");
    var gameScreen = $("gameScreen");
    var btnLandingStart = $("btnLandingStart");

    var gridEl = $("grid");
    var levelEl = $("levelText");
    var livesEl = $("livesText");
    var statusEl = $("statusText");
    var bestEl = $("bestText");

    var btnStart = $("btnStart");
    var btnHint = $("btnHint");

    var boardWrap = document.querySelector(".sm-board-wrap");
    var lifeCards = document.querySelectorAll(".sm-life-card");

    var settingsModal = $("settingsModal");
    var btnSettingsOpen = $("btnSettingsOpen");
    var btnSettingsClose = $("btnSettingsClose");
    var btnSettingsRestart = $("btnSettingsRestart");
    var btnSettingsSound = $("btnSettingsSound");
    var settingsSoundText = $("settingsSoundText");
    var btnSettingsBackHome = $("btnSettingsBackHome");

    var btnSound =
        $("btnSound") ||
        $("btnSoundToggle") ||
        $("mtSoundToggle");

    var btnResetStats = $("btnResetStats");

    /* =========================================================
       4. Game State
    ========================================================= */

    var story = isStoryMode();

    var level = 1;
    var lives = START_LIVES;

    var gridSize = 3;
    var patternLen = 3;
    var pattern = [];
    var userIndex = 0;

    var showing = false;
    var locked = true;
    var gameStarted = false;

    var effectiveMaxLevel = MAX_LEVEL;

    var audioCtx = null;
    var soundEnabled = loadSoundPreference();

    /* =========================================================
       5. Sound System
    ========================================================= */

    function loadSoundPreference() {
        try {
            var raw = sessionStorage.getItem(SOUND_SESSION_KEY);

            if (raw === null) {
                return true;
            }

            return raw === "1";
        } catch (e) {
            return true;
        }
    }

    function saveSoundPreference() {
        try {
            sessionStorage.setItem(SOUND_SESSION_KEY, soundEnabled ? "1" : "0");
        } catch (e) {
            /* Ignore sessionStorage errors */
        }
    }

    function updateSoundButtonUI() {
        if (btnSound) {
            btnSound.textContent = soundEnabled ? "🔊 Sound ON" : "🔇 Sound OFF";
            btnSound.setAttribute("aria-pressed", String(soundEnabled));
            btnSound.dataset.sound = soundEnabled ? "on" : "off";
        }

        if (btnSettingsSound) {
            btnSettingsSound.setAttribute("aria-pressed", String(soundEnabled));
        }

        if (settingsSoundText) {
            settingsSoundText.textContent = soundEnabled ? "Sound ON" : "Sound OFF";
        }
    }

    function toggleSound() {
        soundEnabled = !soundEnabled;
        saveSoundPreference();
        updateSoundButtonUI();

        if (soundEnabled) {
            soundCorrectTap();
        }
    }

    function getAudio() {
        if (!audioCtx) {
            var AC = window.AudioContext || window.webkitAudioContext;

            if (AC) {
                audioCtx = new AC();
            }
        }

        return audioCtx;
    }

    function resumeAudioIfNeeded() {
        if (!soundEnabled) {
            return;
        }

        var ac = getAudio();

        if (ac && ac.state === "suspended") {
            ac.resume();
        }
    }

    function playTone(type, freq, duration, volume, slideTo) {
        if (!soundEnabled) {
            return;
        }

        var ac = getAudio();

        if (!ac) {
            return;
        }

        var now = ac.currentTime;
        var osc = ac.createOscillator();
        var gain = ac.createGain();

        osc.type = type || "sine";
        osc.frequency.setValueAtTime(freq, now);

        if (slideTo) {
            osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
        }

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(ac.destination);

        osc.start(now);
        osc.stop(now + duration + 0.03);
    }

    function soundFlash() {
        playTone("triangle", 520, 0.07, 0.025, 650);
    }

    function soundCorrectTap() {
        playTone("triangle", 650, 0.075, 0.03, 880);
    }

    function soundWrongTap() {
        playTone("sawtooth", 230, 0.12, 0.03, 155);
    }

    function soundLevelComplete() {
        playTone("triangle", 540, 0.09, 0.034, 720);

        setTimeout(function() {
            playTone("triangle", 740, 0.1, 0.034, 940);
        }, 80);
    }

    function soundGameOver() {
        playTone("sawtooth", 240, 0.16, 0.032, 120);
    }

    function soundWin() {
        playTone("triangle", 520, 0.1, 0.036, 700);

        setTimeout(function() {
            playTone("triangle", 700, 0.11, 0.036, 900);
        }, 90);

        setTimeout(function() {
            playTone("triangle", 900, 0.14, 0.04, 1180);
        }, 180);
    }

    /* =========================================================
       6. UI Functions
    ========================================================= */

    function setStatus(text) {
        if (!statusEl) {
            return;
        }

        statusEl.textContent = text;
        statusEl.classList.remove("sm-status-pop");

        void statusEl.offsetWidth;

        statusEl.classList.add("sm-status-pop");
    }

    function setGridDisabled(disabled) {
        if (!gridEl) {
            return;
        }

        if (disabled) {
            gridEl.classList.add("disabled");
        } else {
            gridEl.classList.remove("disabled");
        }
    }

    function clearHighlights() {
        if (!gridEl) {
            return;
        }

        var tiles = gridEl.querySelectorAll(".mt-tile");

        for (var i = 0; i < tiles.length; i++) {
            tiles[i].classList.remove("flash");
            tiles[i].classList.remove("hit");
            tiles[i].classList.remove("wrong");
            tiles[i].classList.remove("level-correct");
        }
    }

    function showCorrectLevelGreen() {
        if (!gridEl) {
            return;
        }

        var tiles = gridEl.querySelectorAll(".mt-tile");

        clearHighlights();
        setBoardGlow(true);

        for (var i = 0; i < pattern.length; i++) {
            var tile = tiles[pattern[i]];

            if (tile) {
                tile.classList.add("level-correct");
            }
        }
    }

    function hideCorrectLevelGreen() {
        if (!gridEl) {
            return;
        }

        var tiles = gridEl.querySelectorAll(".mt-tile");

        for (var i = 0; i < tiles.length; i++) {
            tiles[i].classList.remove("level-correct");
        }

        setBoardGlow(false);
    }

    function updateHud() {
        if (levelEl) {
            levelEl.textContent = "Level " + String(level).padStart(2, "0");
        }

        if (livesEl) {
            livesEl.textContent = String(lives).padStart(2, "0");
        }

        if (lifeCards && lifeCards.length) {
            for (var i = 0; i < lifeCards.length; i++) {
                if (i < lives) {
                    lifeCards[i].classList.remove("lost");
                } else {
                    lifeCards[i].classList.add("lost");
                }
            }
        }

        if (bestEl) {
            var best = toNum(safeGet(BEST_LEVEL_KEY, "0"), 0);
            bestEl.textContent = best > 0 ? "Best level: " + best : "";
        }
    }

    function showStartButton() {
        if (btnStart) {
            btnStart.classList.remove("hidden-start");
        }
    }

    function hideStartButton() {
        if (btnStart) {
            btnStart.classList.add("hidden-start");
        }
    }

    function setBoardGlow(enabled) {
        if (!boardWrap) {
            return;
        }

        if (enabled) {
            boardWrap.classList.add("is-showing");
        } else {
            boardWrap.classList.remove("is-showing");
        }
    }

    function ensureStoryReturnButton() {
        var existing = $("btnReturnStory");

        if (existing) {
            return;
        }

        var wrap = document.createElement("div");
        wrap.id = "storyReturnWrap";
        wrap.style.display = "flex";
        wrap.style.gap = "10px";
        wrap.style.flexWrap = "wrap";
        wrap.style.marginTop = "12px";
        wrap.style.justifyContent = "center";

        var link = document.createElement("a");
        link.id = "btnReturnStory";
        link.href = storyReturnUrl();
        link.textContent = "Return to Story";
        link.style.textDecoration = "none";
        link.style.padding = "10px 16px";
        link.style.borderRadius = "999px";
        link.style.fontWeight = "900";

        wrap.appendChild(link);

        if (statusEl && statusEl.parentNode) {
            statusEl.parentNode.appendChild(wrap);
        } else if (gridEl && gridEl.parentNode) {
            gridEl.parentNode.appendChild(wrap);
        } else {
            document.body.appendChild(wrap);
        }
    }

    /* =========================================================
       7. Difficulty
    ========================================================= */

    function computeDifficulty(lvl) {
        var size = 3;
        var len = 3;

        if (lvl <= 2) {
            size = 3;
            len = 3;
        } else if (lvl <= 4) {
            size = 3;
            len = 4;
        } else if (lvl <= 6) {
            size = 3;
            len = 5;
        } else if (lvl <= 8) {
            size = 4;
            len = 6;
        } else if (lvl <= 10) {
            size = 4;
            len = 7;
        } else {
            size = 5;
            len = 8;
        }

        return {
            size: size,
            len: Math.min(len, size * size)
        };
    }

    function readLevelCap() {
        var capRaw = safeGet(LEVELCAP_KEY, "");
        var cap = toNum(capRaw, NaN);

        if (!Number.isFinite(cap) || cap <= 1) {
            effectiveMaxLevel = MAX_LEVEL;
            return;
        }

        cap = clampInt(cap, 2, 9999);
        effectiveMaxLevel = Math.min(MAX_LEVEL, cap);
    }

    /* =========================================================
       8. Grid
    ========================================================= */

    function buildGrid(size) {
        if (!gridEl) {
            return;
        }

        gridEl.innerHTML = "";
        gridEl.style.gridTemplateColumns = "repeat(" + size + ", 1fr)";

        var total = size * size;

        for (var i = 0; i < total; i++) {
            (function(idx) {
                var tile = document.createElement("button");

                tile.type = "button";
                tile.className = "mt-tile";
                tile.setAttribute("aria-label", "Tile " + (idx + 1));
                tile.dataset.index = String(idx);

                tile.addEventListener("click", function() {
                    if (locked || showing) {
                        return;
                    }

                    resumeAudioIfNeeded();
                    onUserPick(idx, tile);
                });

                gridEl.appendChild(tile);
            })(i);
        }
    }

    /* =========================================================
       9. Pattern
    ========================================================= */

    function generatePattern(totalTiles, len) {
        var pool = [];

        for (var i = 0; i < totalTiles; i++) {
            pool.push(i);
        }

        shuffle(pool);

        return pool.slice(0, len);
    }

    function flashTile(indexToFlash, ms) {
        if (!gridEl) {
            return;
        }

        var tiles = gridEl.querySelectorAll(".mt-tile");
        var tile = tiles[indexToFlash];

        if (!tile) {
            return;
        }

        tile.classList.add("flash");
        soundFlash();

        setTimeout(function() {
            tile.classList.remove("flash");
        }, ms);
    }

    async function showPattern() {
        showing = true;
        locked = true;

        setGridDisabled(true);
        clearHighlights();
        setBoardGlow(true);

        setStatus(story ? "Story Test: Watch the pattern..." : "Watch the pattern...");

        var flashMs = Math.max(360, 760 - level * 18);
        var gapMs = Math.max(190, 370 - level * 8);

        await sleep(420);

        for (var i = 0; i < pattern.length; i++) {
            flashTile(pattern[i], flashMs);
            await sleep(flashMs + gapMs);
        }

        showing = false;
        locked = false;
        userIndex = 0;

        setBoardGlow(false);
        setGridDisabled(false);

        setStatus("Now repeat it!");
    }

    /* =========================================================
       10. Saving and Progress
    ========================================================= */

    function getUsername() {
        var name =
            safeGet("bca_username", "") ||
            safeGet("bca_player_name", "") ||
            safeGet("playerName", "") ||
            "Guest";

        name = String(name || "Guest").trim();

        return name ? name : "Guest";
    }

    function pushRunToLocal(lv, resultLabel) {
        var runs = safeJsonParse(safeGet(RUNS_KEY, "[]"), []);

        if (!Array.isArray(runs)) {
            runs = [];
        }

        runs.unshift({
            name: getUsername(),
            value: lv,
            level: lv,
            date: todayISO(),
            result: resultLabel || "run"
        });

        if (runs.length > 200) {
            runs = runs.slice(0, 200);
        }

        safeSet(RUNS_KEY, safeJsonStringify(runs, "[]"));
    }

    function updateBestKeys(lv) {
        var bestLegacy = toNum(safeGet(BEST_LEVEL_KEY, "0"), 0);

        if (lv > bestLegacy) {
            safeSet(BEST_LEVEL_KEY, String(lv));
        }

        var currentProgress = toNum(safeGet(PROGRESS_KEY, "0"), 0);

        if (lv > currentProgress) {
            safeSet(PROGRESS_KEY, String(lv));
        }

        var raw = safeGet(BEST_LB_KEY, "");
        var bestValue = NaN;

        try {
            var obj = raw ? JSON.parse(raw) : null;

            if (
                obj &&
                typeof obj === "object" &&
                Number.isFinite(Number(obj.value))
            ) {
                bestValue = Number(obj.value);
            }
        } catch (e) {
            /* Ignore parse errors */
        }

        if (!Number.isFinite(bestValue)) {
            bestValue = toNum(raw, NaN);
        }

        if (!Number.isFinite(bestValue) || lv > bestValue) {
            safeSet(
                BEST_LB_KEY,
                safeJsonStringify({
                        value: lv,
                        date: todayISO(),
                        level: lv
                    },
                    String(lv)
                )
            );
        }
    }

    function saveProgressAndLeaderboard(levelCompleted, resultLabel) {
        if (story) {
            return;
        }

        var lv = clampInt(levelCompleted, 1, 9999);

        updateBestKeys(lv);

        if (window.BCA && typeof window.BCA.recordRun === "function") {
            window.BCA.recordRun(GAME_ID, {
                value: lv,
                level: lv,
                name: getUsername(),
                date: todayISO()
            });
        } else {
            pushRunToLocal(lv, resultLabel);
        }

        updateHud();
    }

    function resetStats() {
        safeRemove(BEST_LEVEL_KEY);
        safeRemove(PROGRESS_KEY);
        safeRemove(RUNS_KEY);
        safeRemove(BEST_LB_KEY);

        updateHud();
        setStatus("Progress reset. Press Start for a fresh challenge.");
    }

    /* =========================================================
       11. Story Mode
    ========================================================= */

    function passStoryTestAndReturn() {
        safeSet(STORY_COMPAT_PASS_KEY, "1");

        var tid = storyTestId() || "unknown_test";

        safeSet(storyTestKey(tid), "1");
        safeSet("bca_story_last_test", tid);

        window.location.href = storyReturnUrl();
    }

    /* =========================================================
       12. Main Game Logic
    ========================================================= */

    function startGame() {
        resumeAudioIfNeeded();
        readLevelCap();

        gameStarted = true;
        hideStartButton();

        level = story ? STORY_FORCE_LEVEL : 1;
        lives = START_LIVES;
        userIndex = 0;

        var diff = computeDifficulty(level);

        gridSize = diff.size;
        patternLen = diff.len;

        buildGrid(gridSize);
        pattern = generatePattern(gridSize * gridSize, patternLen);

        updateHud();
        showPattern();
    }

    function onUserPick(idx, tileEl) {
        var expected = pattern[userIndex];

        if (idx === expected) {
            tileEl.classList.add("hit");
            soundCorrectTap();

            userIndex++;

            if (userIndex >= pattern.length) {
                locked = true;
                showing = false;
                setGridDisabled(true);

                showCorrectLevelGreen();

                if (!story) {
                    saveProgressAndLeaderboard(level, "level_complete");
                }

                if (story && level === STORY_FORCE_LEVEL) {
                    var tid = storyTestId() || "story_test";

                    soundWin();
                    setStatus("Correct! Test passed! 🎉 (" + tid + ")");
                    ensureStoryReturnButton();

                    if (STORY_AUTO_RETURN_MS > 0) {
                        setTimeout(function() {
                            passStoryTestAndReturn();
                        }, STORY_AUTO_RETURN_MS);
                    }

                    return;
                }

                soundLevelComplete();
                setStatus("Correct! Next level...");

                setTimeout(function() {
                    hideCorrectLevelGreen();
                    nextLevel();
                }, 900);
            }

            return;
        }

        lives--;
        soundWrongTap();
        updateHud();

        locked = true;
        setGridDisabled(true);

        tileEl.classList.add("wrong");

        if (lives <= 0) {
            setStatus("Game Over. Press Start to try again.");

            if (!story) {
                saveProgressAndLeaderboard(level, "game_over");
            }

            setTimeout(function() {
                gameOver();
            }, 500);
        } else {
            setStatus("Wrong! Watch again...");

            setTimeout(function() {
                showPattern();
            }, 700);
        }
    }

    function nextLevel() {
        if (level >= effectiveMaxLevel) {
            winGame();
            return;
        }

        level++;

        var diff = computeDifficulty(level);

        gridSize = diff.size;
        patternLen = diff.len;

        buildGrid(gridSize);
        pattern = generatePattern(gridSize * gridSize, patternLen);

        updateHud();
        showPattern();
    }

    function gameOver() {
        locked = true;
        showing = false;
        gameStarted = false;

        setGridDisabled(true);
        setBoardGlow(false);
        hideCorrectLevelGreen();
        showStartButton();

        soundGameOver();
        updateHud();
    }

    function winGame() {
        locked = true;
        showing = false;
        gameStarted = false;

        setGridDisabled(true);
        showCorrectLevelGreen();
        showStartButton();

        soundWin();
        setStatus("You beat Level " + effectiveMaxLevel + "! Amazing memory!");

        if (!story) {
            saveProgressAndLeaderboard(effectiveMaxLevel, "win");
        }

        setTimeout(function() {
            completeStoryTestIfNeeded();
        }, 800);
    }

    function completeStoryTestIfNeeded() {
        var params = new URLSearchParams(window.location.search);

        var isStoryMode = params.get("story") === "1";
        var testId = params.get("test") || "test2_traveler";
        var returnUrl = params.get("return");

        if (!isStoryMode || !returnUrl) return;

        var separator = returnUrl.indexOf("?") === -1 ? "?" : "&";
        var finalUrl = returnUrl + separator + "from=" + encodeURIComponent(testId);

        window.location.href = finalUrl;
    }

    /* =========================================================
       13. Extra Controls
    ========================================================= */

    function showHint() {
        if (!gameStarted || !pattern.length) {
            setStatus("Start the game first, then use Hint when you need help.");
            return;
        }

        if (showing) {
            setStatus("Hint: Watch carefully while the tiles flash.");
            return;
        }

        var firstTile = pattern[0] + 1;

        setStatus("Hint: The sequence starts at tile " + firstTile + ".");
    }

    /* =========================================================
       14. Settings Modal
    ========================================================= */

    function openSettingsModal() {
        if (!settingsModal) {
            return;
        }

        settingsModal.classList.remove("hidden");
        settingsModal.setAttribute("aria-hidden", "false");

        if (btnSettingsOpen) {
            btnSettingsOpen.setAttribute("aria-expanded", "true");
        }

        if (btnSettingsClose) {
            setTimeout(function() {
                btnSettingsClose.focus();
            }, 10);
        }
    }

    function closeSettingsModal() {
        if (!settingsModal) {
            return;
        }

        settingsModal.classList.add("hidden");
        settingsModal.setAttribute("aria-hidden", "true");

        if (btnSettingsOpen) {
            btnSettingsOpen.setAttribute("aria-expanded", "false");
        }
    }

    /* =========================================================
       15. Screen Navigation
    ========================================================= */

    function openGameScreen() {
        if (landingScreen) {
            landingScreen.classList.add("hidden");
        }

        if (gameScreen) {
            gameScreen.classList.remove("hidden");
        }

        updateHud();

        if (story) {
            var tid = storyTestId();

            if (tid) {
                setStatus("Story Test: " + tid + " — Press Start.");
            } else {
                setStatus("Story Test — Press Start.");
            }
        } else {
            setStatus("Press Start to begin your challenge.");
        }

        showStartButton();

        if (btnStart) {
            setTimeout(function() {
                btnStart.focus();
            }, 50);
        }
    }

    /* =========================================================
       16. Event Bindings
    ========================================================= */

    if (btnLandingStart) {
        btnLandingStart.addEventListener("click", function() {
            resumeAudioIfNeeded();
            openGameScreen();
        });
    }

    if (btnStart) {
        btnStart.addEventListener("click", function() {
            startGame();
        });
    }

    if (btnHint) {
        btnHint.addEventListener("click", function() {
            showHint();
        });
    }

    if (btnSound) {
        btnSound.addEventListener("click", function() {
            toggleSound();
        });
    }

    if (btnResetStats) {
        btnResetStats.addEventListener("click", function() {
            resetStats();
        });
    }

    if (btnSettingsOpen) {
        btnSettingsOpen.addEventListener("click", function() {
            openSettingsModal();
        });
    }

    if (btnSettingsClose) {
        btnSettingsClose.addEventListener("click", function() {
            closeSettingsModal();
        });
    }

    if (btnSettingsRestart) {
        btnSettingsRestart.addEventListener("click", function() {
            closeSettingsModal();
            startGame();
        });
    }

    if (btnSettingsSound) {
        btnSettingsSound.addEventListener("click", function() {
            toggleSound();
        });
    }

    if (btnSettingsBackHome) {
        btnSettingsBackHome.addEventListener("click", function() {
            closeSettingsModal();
        });
    }

    if (settingsModal) {
        settingsModal.addEventListener("click", function(e) {
            if (e.target === settingsModal) {
                closeSettingsModal();
            }
        });
    }

    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") {
            closeSettingsModal();
        }
    });

    window.addEventListener("storage", function(e) {
        if (!e || !e.key) {
            return;
        }

        if (e.key === LEVELCAP_KEY) {
            readLevelCap();
        }
    });

    /* =========================================================
       17. Initialization
    ========================================================= */

    function init() {
        readLevelCap();
        updateSoundButtonUI();

        level = story ? STORY_FORCE_LEVEL : 1;
        lives = START_LIVES;

        var diff = computeDifficulty(level);

        gridSize = diff.size;
        patternLen = diff.len;

        buildGrid(gridSize);
        setGridDisabled(true);
        updateHud();
        showStartButton();

        if (settingsModal) {
            settingsModal.classList.add("hidden");
            settingsModal.setAttribute("aria-hidden", "true");
        }

        if (gameScreen) {
            gameScreen.classList.add("hidden");
        }

        if (landingScreen) {
            landingScreen.classList.remove("hidden");
        }

        if (story) {
            openGameScreen();
        }
    }

    init();
})();

function completeStoryTestIfNeeded() {
    var params = new URLSearchParams(window.location.search);

    var isStoryMode = params.get("story") === "1";
    var testId = params.get("test") || "test2_traveler";
    var returnUrl = params.get("return");

    if (!isStoryMode || !returnUrl) return;

    var separator = returnUrl.indexOf("?") === -1 ? "?" : "&";
    var finalUrl = returnUrl + separator + "from=" + encodeURIComponent(testId);

    window.location.href = finalUrl;
}