(function() {
    "use strict";


    /* =========================================================
       Image Guess - Full Screen Game Show Version
       Works with:
       - fullscreen index.html
       - fullscreen game.css
       Features:
       ✅ Big start screen
       ✅ Slow image reveal
       ✅ 3 answer choices only
       ✅ A / B / C labels
       ✅ Huge green correct check
       ✅ Red wrong mark
       ✅ Timer, score, streak, hints
       ✅ Story mode support
       ✅ Settings restart and sound toggle
       ✅ Leaderboard saving fix
    ========================================================== */

    /* ----------------------- Helpers ----------------------- */

    function $(id) {
        return document.getElementById(id);
    }

    function safeGet(key, fallback) {
        try {
            var v = localStorage.getItem(key);
            return v === null ? fallback : v;
        } catch (e) {
            return fallback;
        }
    }

    function safeSet(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {}
    }

    function safeJsonGet(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            if (!raw) return fallback;
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

    function safeRemove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {}
    }

    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = arr[i];
            arr[i] = arr[j];
            arr[j] = t;
        }

        return arr;
    }

    function clamp(n, min, max) {
        return Math.max(min, Math.min(max, n));
    }

    function setText(id, txt) {
        var el = $(id);
        if (el) el.textContent = txt;
    }

    function toPositiveInt(value, fallback) {
        var n = Number(value);
        if (!isFinite(n) || n <= 0) return fallback;
        return Math.round(n);
    }

    function isEditableTarget(target) {
        if (!target) return false;

        var tag = (target.tagName || "").toLowerCase();

        return tag === "input" ||
            tag === "textarea" ||
            tag === "select" ||
            target.isContentEditable;
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function todayISO() {
        var d = new Date();
        var yyyy = d.getFullYear();
        var mm = String(d.getMonth() + 1).padStart(2, "0");
        var dd = String(d.getDate()).padStart(2, "0");
        return yyyy + "-" + mm + "-" + dd;
    }

    function hashString(str) {
        var h = 0;
        var s = String(str || "");

        for (var i = 0; i < s.length; i++) {
            h = ((h << 5) - h) + s.charCodeAt(i);
            h |= 0;
        }

        return Math.abs(h);
    }

    function insertBefore(newEl, refEl) {
        if (newEl && refEl && refEl.parentNode) {
            refEl.parentNode.insertBefore(newEl, refEl);
        }
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function dispatchLeaderboardUpdate() {
        try {
            window.dispatchEvent(new Event("bca:leaderboard-updated"));
        } catch (e) {}
    }

    /* ----------------------- Query Params ----------------------- */

    var params = (function() {
        try {
            return new URLSearchParams(window.location.search || "");
        } catch (e) {
            return null;
        }
    })();

    function getQueryParam(name) {
        if (params && params.get) return params.get(name) || "";

        var qs = window.location.search || "";
        if (!qs) return "";

        qs = qs.replace(/^\?/, "");

        var parts = qs.split("&");

        for (var i = 0; i < parts.length; i++) {
            var kv = parts[i].split("=");
            var k = decodeURIComponent(kv[0] || "");

            if (k === name) {
                return decodeURIComponent(kv[1] || "");
            }
        }

        return "";
    }

    function isStory() {
        return getQueryParam("story") === "1" ||
            (getQueryParam("mode") || "").toLowerCase() === "story";
    }

    function safeTestId(raw) {
        raw = String(raw || "").trim().toLowerCase();

        if (!raw) return "";

        raw = raw.replace(/\s+/g, "_");
        raw = raw.replace(/[^a-z0-9_-]/g, "");

        return raw;
    }

    function storyTestId() {
        return safeTestId(getQueryParam("test"));
    }

    function storyReturnUrl() {
        var raw = getQueryParam("return") || "../../story.html";

        if (/^(https?:)?\/\//i.test(raw)) return "../../story.html";
        if (/^javascript:/i.test(raw)) return "../../story.html";

        return raw;
    }

    function storyTestKey(testId) {
        return "bca_story_test_" + safeTestId(testId);
    }

    /* ----------------------- Mode / Constants ----------------------- */

    var isStoryMode = isStory();

    var NORMAL_MAX_QUESTIONS = 50;
    var DEFAULT_TIME_LIMIT = 15;
    var DEFAULT_HINTS = 3;
    var STORY_DEFAULT_HINTS = 1;

    var ANSWER_DELAY_MS = 1200;
    var STORY_AUTO_RETURN_MS = 1400;

    /* ----------------------- Storage Keys ----------------------- */

    var KEYS = {
        bestScore: "bca_best_imageGuess",
        runs: "bca_runs_imageGuess",
        progress: "bca_progress_imageGuess",
        levelCap: "bca_levelcap_imageGuess",
        username: "bca_username",
        totalPlays: "bca_totalPlays",
        achievements: "bca_imageGuess_achievements",
        stats: "bca_stats_imageGuess",
        storyStats: "bca_story_stats_imageGuess",
        storyPassCompat: "bca_story_pass_imageGuess_L1"
    };

    /* ----------------------- Sound ----------------------- */

    var SOUND_SESSION_KEY = "ig_sound_enabled";
    var btnSoundToggle = null;
    var audioCtx = null;
    var soundEnabled = loadSoundPreference();

    function loadSoundPreference() {
        try {
            var raw = sessionStorage.getItem(SOUND_SESSION_KEY);

            if (raw === null) return true;

            return raw === "1";
        } catch (e) {
            return true;
        }
    }

    function saveSoundPreference() {
        try {
            sessionStorage.setItem(SOUND_SESSION_KEY, soundEnabled ? "1" : "0");
        } catch (e) {}
    }

    function updateSoundToggleUI() {
        btnSoundToggle = $("igSoundToggle") || btnSoundToggle;

        if (!btnSoundToggle) return;

        var icon = btnSoundToggle.querySelector(".settings-item__icon");
        var label = btnSoundToggle.querySelector(".settings-item__label");

        if (icon) {
            icon.textContent = soundEnabled ? "🔊" : "🔇";
        }

        if (label) {
            label.textContent = soundEnabled ? "Sound ON" : "Sound OFF";
        }

        if (!icon && !label) {
            btnSoundToggle.textContent = soundEnabled ? "🔊 Sound ON" : "🔇 Sound OFF";
        }

        btnSoundToggle.setAttribute("aria-pressed", String(soundEnabled));
    }

    function toggleSound() {
        soundEnabled = !soundEnabled;
        saveSoundPreference();
        updateSoundToggleUI();
    }

    function getAudio() {
        if (!audioCtx) {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (AC) audioCtx = new AC();
        }

        return audioCtx;
    }

    function resumeAudioIfNeeded() {
        if (!soundEnabled) return;

        var ac = getAudio();

        if (ac && ac.state === "suspended") {
            ac.resume();
        }
    }

    function playTone(type, freq, duration, volume, slideTo) {
        if (!soundEnabled) return;

        var ac = getAudio();
        if (!ac) return;

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
        osc.stop(now + duration + 0.02);
    }

    function soundCorrect() {
        playTone("triangle", 620, 0.08, 0.03, 880);

        setTimeout(function() {
            playTone("triangle", 880, 0.10, 0.03, 1120);
        }, 60);
    }

    function soundWrong() {
        playTone("sawtooth", 260, 0.12, 0.03, 170);
    }

    function soundFinish() {
        playTone("triangle", 540, 0.10, 0.035, 760);

        setTimeout(function() {
            playTone("triangle", 760, 0.12, 0.035, 980);
        }, 90);
    }

    function soundStoryPass() {
        playTone("triangle", 520, 0.10, 0.035, 700);

        setTimeout(function() {
            playTone("triangle", 700, 0.11, 0.035, 920);
        }, 90);

        setTimeout(function() {
            playTone("triangle", 920, 0.14, 0.04, 1160);
        }, 180);
    }

    function soundAchievement() {
        playTone("triangle", 660, 0.08, 0.03, 840);

        setTimeout(function() {
            playTone("triangle", 840, 0.08, 0.03, 1040);
        }, 70);

        setTimeout(function() {
            playTone("triangle", 1040, 0.11, 0.035, 1320);
        }, 140);
    }

    /* -------------------- Data Source ---------------------- */

    function getExternalQuestions() {
        if (Array.isArray(window.BCA_IMAGE_GUESS_QUESTIONS)) {
            return window.BCA_IMAGE_GUESS_QUESTIONS;
        }

        if (
            window.BCA_GAME_DATA &&
            Array.isArray(window.BCA_GAME_DATA.imageGuessQuestions)
        ) {
            return window.BCA_GAME_DATA.imageGuessQuestions;
        }

        return null;
    }

    function getExternalStoryTests() {
        if (
            window.BCA_IMAGE_GUESS_STORY_TESTS &&
            typeof window.BCA_IMAGE_GUESS_STORY_TESTS === "object"
        ) {
            return window.BCA_IMAGE_GUESS_STORY_TESTS;
        }

        if (
            window.BCA_GAME_DATA &&
            window.BCA_GAME_DATA.imageGuessStoryTests &&
            typeof window.BCA_GAME_DATA.imageGuessStoryTests === "object"
        ) {
            return window.BCA_GAME_DATA.imageGuessStoryTests;
        }

        return null;
    }

    /* -------------------- Base Questions ------------------- */

    var BASE_QUESTIONS = [{
            id: "apple_q1",
            category: "food",
            difficulty: "easy",
            hint: "A common fruit that can be red or green.",
            fact: "This item belongs to the food category.",
            points: 10,
            preview: "../../assets/images/apple1.jpg",
            reveal: "../../assets/images/apple.jpg",
            correct: "Apple",
            choices: ["Apple", "Cat", "Car", "Book"]
        },
        {
            id: "cat_q1",
            category: "animal",
            difficulty: "easy",
            hint: "A popular pet that says meow.",
            fact: "This item belongs to the animal category.",
            points: 10,
            preview: "../../assets/images/cat1.jpg",
            reveal: "../../assets/images/cat.jpg",
            correct: "Cat",
            choices: ["Mountain", "Cat", "Pizza", "Car"]
        },
        {
            id: "car_q1",
            category: "vehicle",
            difficulty: "easy",
            hint: "A road vehicle with wheels and doors.",
            fact: "This item belongs to the vehicle category.",
            points: 10,
            preview: "../../assets/images/car1.jpg",
            reveal: "../../assets/images/car.jpg",
            correct: "Car",
            choices: ["Car", "Apple", "Pizza", "Mountain"]
        },
        {
            id: "book_q1",
            category: "object",
            difficulty: "easy",
            hint: "You usually read pages in this object.",
            fact: "This item belongs to the object category.",
            points: 10,
            preview: "../../assets/images/book1.jpg",
            reveal: "../../assets/images/book.jpg",
            correct: "Book",
            choices: ["Book", "Pizza", "Cat", "Apple"]
        },
        {
            id: "mountain_q1",
            category: "nature",
            difficulty: "easy",
            hint: "A very high natural landform.",
            fact: "This item belongs to the nature category.",
            points: 10,
            preview: "../../assets/images/mountain1.jpg",
            reveal: "../../assets/images/mountain.jpg",
            correct: "Mountain",
            choices: ["Mountain", "Car", "Apple", "Pizza"]
        },
        {
            id: "pizza_q1",
            category: "food",
            difficulty: "easy",
            hint: "A round food often topped with cheese.",
            fact: "This item belongs to the food category.",
            points: 10,
            preview: "../../assets/images/pizza1.jpg",
            reveal: "../../assets/images/pizza.jpg",
            correct: "Pizza",
            choices: ["Pizza", "Book", "Cat", "Mountain"]
        },
        {
            id: "strawberry_q1",
            category: "food",
            difficulty: "easy",
            hint: "A small red fruit with tiny seeds on the outside.",
            fact: "This item belongs to the food category.",
            points: 10,
            preview: "../../assets/images/strawberry1.jpg",
            reveal: "../../assets/images/strawberry.jpg",
            correct: "Strawberry",
            choices: ["Strawberry", "Tree", "Horse", "Apple"]
        },
        {
            id: "tree_q1",
            category: "nature",
            difficulty: "easy",
            hint: "A tall plant with a trunk, branches, and leaves.",
            fact: "This item belongs to the nature category.",
            points: 10,
            preview: "../../assets/images/tree1.jpg",
            reveal: "../../assets/images/tree.avif",
            correct: "Tree",
            choices: ["Tree", "Horse", "Mountain", "Book"]
        },
        {
            id: "horse_q1",
            category: "animal",
            difficulty: "easy",
            hint: "A strong farm animal that people can ride.",
            fact: "This item belongs to the animal category.",
            points: 10,
            preview: "../../assets/images/horse1.jpg",
            reveal: "../../assets/images/horse.webp",
            correct: "Horse",
            choices: ["Horse", "Cat", "Car", "Tree"]
        }
    ];

    var BASE_STORY_TESTS = {
        test1_open_letter: {
            questionIds: ["book_q1"],
            minCorrect: 1,
            timeLimit: 12,
            hints: 1,
            banner: "Open Letter Test: answer correctly to unlock the next story scene.",
            objective: "Find the correct object hidden in the clue.",
            successMessage: "You found the clue and unlocked the next story step.",
            failMessage: "The clue was missed. Study the image more carefully and try again."
        }
    };

    function getQuestionSource() {
        return getExternalQuestions() || BASE_QUESTIONS;
    }

    function getStoryTestMap() {
        var merged = {};
        var own;

        for (own in BASE_STORY_TESTS) {
            if (Object.prototype.hasOwnProperty.call(BASE_STORY_TESTS, own)) {
                merged[own] = BASE_STORY_TESTS[own];
            }
        }

        var external = getExternalStoryTests();

        if (external) {
            for (own in external) {
                if (Object.prototype.hasOwnProperty.call(external, own)) {
                    merged[own] = external[own];
                }
            }
        }

        return merged;
    }

    /* -------------------- State ---------------------------- */

    var questions = [];
    var index = 0;
    var score = 0;
    var locked = true;

    var correctCount = 0;
    var wrongCount = 0;
    var streak = 0;
    var bestStreak = 0;

    var hintsLeft = DEFAULT_HINTS;
    var startHints = DEFAULT_HINTS;
    var hintUsedThisQuestion = false;

    var currentTimeLimit = DEFAULT_TIME_LIMIT;
    var timeLeft = DEFAULT_TIME_LIMIT;

    var timerId = null;
    var autoReturnTimerId = null;
    var questionAdvanceTimerId = null;
    var toastTimerId = null;

    var runStartedAt = 0;
    var currentStoryConfig = null;
    var unlockedAchievementsThisRun = {};

    var gameHasStarted = false;

    /* -------------------- Runtime UI ----------------------- */

    function ensureRuntimeStyles() {
        if ($("igRuntimeStyles")) return;

        var style = document.createElement("style");
        style.id = "igRuntimeStyles";
        style.textContent = [
            ".ig-progress{margin-top:-4px;}",
            ".ig-progress__track{height:14px;width:100%;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);box-shadow:inset 0 2px 6px rgba(0,0,0,.18);}",
            ".ig-progress__bar{width:0%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#00f0ff 0%,#4ea1ff 32%,#9b7bff 68%,#ff4fd8 100%);box-shadow:0 0 16px rgba(64,246,255,.34),0 0 28px rgba(155,123,255,.18);transition:width var(--transition-med,220ms ease);}",
            ".ig-tool-row{display:flex;flex-wrap:wrap;gap:10px;}",
            ".ig-tool-row .btn-arcade{min-width:180px;}",
            ".ig-kbd-help{margin:0;color:var(--muted,rgba(0,0,0,.65));font-size:13.5px;font-weight:700;line-height:1.45;}",
            ".ig-timer-danger{border-color:rgba(217,48,37,.42)!important;box-shadow:0 0 0 4px var(--danger-ring,rgba(217,48,37,.18)),0 8px 18px rgba(0,0,0,.16)!important;}",
            ".is-removed-by-hint{opacity:.42;filter:grayscale(.25) saturate(.8);transform:none!important;}",
            ".btn-arcade:disabled{cursor:not-allowed;opacity:.6;filter:saturate(.8);transform:none;}",
            ".ig-toast{position:fixed;right:18px;bottom:18px;z-index:9999;max-width:320px;padding:14px 16px;border-radius:18px;background:linear-gradient(135deg,rgba(78,161,255,.22),rgba(255,79,216,.18)),rgba(12,18,36,.96);border:1px solid rgba(255,255,255,.14);box-shadow:0 16px 36px rgba(0,0,0,.22);font-weight:900;color:#fff;opacity:0;transform:translateY(10px);pointer-events:none;transition:opacity 180ms ease,transform 180ms ease;}",
            ".ig-toast.show{opacity:1;transform:translateY(0);}",
            ".ig-toast__sub{display:block;margin-top:4px;font-size:12.5px;font-weight:700;color:rgba(255,255,255,.72);}"
        ].join("");

        document.head.appendChild(style);
    }

    function ensureToastEl() {
        if ($("igToast")) return $("igToast");

        var el = document.createElement("div");
        el.id = "igToast";
        el.className = "ig-toast";
        el.setAttribute("role", "status");
        el.setAttribute("aria-live", "polite");

        document.body.appendChild(el);

        return el;
    }

    function showToast(title, subtitle) {
        var toast = ensureToastEl();
        if (!toast) return;

        if (toastTimerId) {
            clearTimeout(toastTimerId);
            toastTimerId = null;
        }

        toast.innerHTML =
            "<div>" + escapeHtml(title || "") + "</div>" +
            (subtitle ? '<span class="ig-toast__sub">' + escapeHtml(subtitle) + "</span>" : "");

        toast.classList.add("show");

        toastTimerId = setTimeout(function() {
            toast.classList.remove("show");
        }, 2400);
    }

    function createBadge(labelText, strongId, initialValue, suffix, badgeId) {
        var badge = document.createElement("span");
        badge.className = "badge";

        if (badgeId) badge.id = badgeId;

        badge.appendChild(document.createTextNode(labelText + " "));

        var strong = document.createElement("strong");
        strong.id = strongId;
        strong.textContent = initialValue;

        badge.appendChild(strong);

        if (suffix) {
            badge.appendChild(document.createTextNode(suffix));
        }

        return badge;
    }

    function ensureHudExtras() {
        var hud = document.querySelector(".hud");

        if (!hud) return;

        if (!$("streakText")) {
            hud.appendChild(createBadge("🔥 Streak:", "streakText", "0", "", "streakBadge"));
        }

        if (!$("timerText")) {
            hud.appendChild(createBadge("⏱ Time:", "timerText", String(DEFAULT_TIME_LIMIT), "s", "timerBadge"));
        } else if (!$("timerBadge") && $("timerText").parentNode) {
            $("timerText").parentNode.id = "timerBadge";
        }

        if (!$("accuracyText")) {
            hud.appendChild(createBadge("🎯 Accuracy:", "accuracyText", "0%", "", "accuracyBadge"));
        }

        if (!$("hintCountText")) {
            hud.appendChild(createBadge("💡 Hints:", "hintCountText", String(DEFAULT_HINTS), "", "hintBadge"));
        }
    }

    function ensureMiddlePanelEnhancements() {
        var middlePanel = document.querySelector(".middle-panel");
        var answersGrid = $("answersGrid");

        if (!middlePanel || !answersGrid) return;

        if (!$("igKeyboardHelp")) {
            var help = document.createElement("p");
            help.id = "igKeyboardHelp";
            help.className = "ig-kbd-help";
            help.textContent = "Shortcuts: press 1–3 to answer, or H to use a hint.";

            insertBefore(help, answersGrid);
        }

        if (!$("progressFill")) {
            var progressWrap = document.createElement("div");
            progressWrap.className = "ig-progress";
            progressWrap.innerHTML =
                '<div class="ig-progress__track" aria-hidden="true">' +
                '<div class="ig-progress__bar" id="progressFill"></div>' +
                "</div>";

            insertBefore(progressWrap, answersGrid);
        }

        if (!$("btnHint")) {
            var toolRow = document.createElement("div");
            toolRow.className = "ig-tool-row";

            var btnHint = document.createElement("button");
            btnHint.type = "button";
            btnHint.id = "btnHint";
            btnHint.className = "btn-arcade";
            btnHint.textContent = "💡 Use Hint (3)";

            toolRow.appendChild(btnHint);
            insertBefore(toolRow, answersGrid);
        }
    }

    function ensureGameShowStartScreen() {
        var wrap = document.querySelector(".image-guess-wrap");

        if (!wrap) return;

        wrap.classList.add("image-guess-show-mode");

        if ($("guessStartScreen")) return;

        var startScreen = document.createElement("section");
        startScreen.className = "guess-start-screen";
        startScreen.id = "guessStartScreen";
        startScreen.setAttribute("aria-label", "Image quiz start screen");

        startScreen.innerHTML =
            '<div class="guess-start-card">' +
            '<div class="guess-small-title">Image quiz</div>' +
            "<h2>Guess the picture.</h2>" +
            '<button class="guess-play-button" id="btnRevealStart" type="button">' +
            '<span class="guess-play-icon" aria-hidden="true">▶</span>' +
            "<span>START</span>" +
            "</button>" +
            "<p>An image is revealed slowly. Buzz in when you can answer the question.</p>" +
            "</div>";

        wrap.insertBefore(startScreen, wrap.firstChild);
    }

    function ensureGameShowRevealStage() {
        if ($("guessRevealStage")) return;

        var middlePanel = document.querySelector(".middle-panel");
        var answersGrid = $("answersGrid");

        if (!middlePanel || !answersGrid) return;

        var stage = document.createElement("div");
        stage.id = "guessRevealStage";
        stage.className = "guess-reveal-stage";
        stage.setAttribute("aria-label", "Slowly revealed mystery image");

        var img = document.createElement("img");
        img.id = "guessRevealImg";
        img.alt = "Slowly revealed mystery image";
        img.decoding = "async";

        stage.appendChild(img);

        middlePanel.insertBefore(stage, answersGrid);
    }

    function ensureFeedbackSemantics() {
        var feedback = $("feedbackText");

        if (!feedback) return;

        feedback.setAttribute("role", "status");
        feedback.setAttribute("aria-live", "polite");
    }

    function syncStoryChrome() {
        var storyBanner = $("storyBanner");

        if (isStoryMode) {
            if (storyBanner) storyBanner.classList.remove("hidden");
        } else {
            if (storyBanner) storyBanner.classList.add("hidden");
        }
    }

    function ensureDynamicUi() {
        ensureRuntimeStyles();
        ensureHudExtras();
        ensureMiddlePanelEnhancements();
        ensureGameShowStartScreen();
        ensureGameShowRevealStage();
        ensureFeedbackSemantics();
        ensureToastEl();
        syncStoryChrome();
    }

    function showStartScreen() {
        var startScreen = $("guessStartScreen");

        if (startScreen) {
            startScreen.classList.remove("hidden");
        }
    }

    function hideStartScreen() {
        var startScreen = $("guessStartScreen");

        if (startScreen) {
            startScreen.classList.add("hidden");
        }
    }

    /* -------------------- Question Helpers ----------------- */

    function cloneQuestion(q) {
        return {
            id: q.id || "",
            category: q.category || "general",
            difficulty: q.difficulty || "easy",
            hint: q.hint || "Look closely at the main object.",
            fact: q.fact || "",
            points: toPositiveInt(q.points, 10),
            preview: q.preview || q.reveal || "",
            reveal: q.reveal || q.preview || "",
            correct: q.correct || "",
            choices: (q.choices || []).slice(),
            timeLimit: toPositiveInt(q.timeLimit, 0) || 0
        };
    }

    function normalizeQuestion(q) {
        if (!q) return null;

        var n = cloneQuestion(q);
        var seen = {};
        var uniqueChoices = [];

        if (!n.id) {
            n.id = "q_" + hashString((n.correct || "unknown") + "|" + (n.preview || n.reveal || ""));
        }

        for (var i = 0; i < n.choices.length; i++) {
            var choice = String(n.choices[i] || "").trim();

            if (!choice || seen[choice]) continue;

            seen[choice] = true;
            uniqueChoices.push(choice);
        }

        if (n.correct && !seen[n.correct]) {
            uniqueChoices.unshift(n.correct);
        }

        n.choices = uniqueChoices;

        if (!n.correct) return null;

        return n;
    }

    function getQuestionPool() {
        var src = getQuestionSource();
        var out = [];

        for (var i = 0; i < src.length; i++) {
            var q = normalizeQuestion(src[i]);

            if (q) out.push(q);
        }

        return out;
    }

    function findQuestionById(id) {
        var pool = getQuestionPool();

        for (var i = 0; i < pool.length; i++) {
            if (pool[i].id === id) return pool[i];
        }

        return null;
    }

    function getQuestionsByIds(ids) {
        var out = [];

        if (!ids || !ids.length) return out;

        for (var i = 0; i < ids.length; i++) {
            var q = findQuestionById(ids[i]);

            if (q) out.push(q);
        }

        return out;
    }

    function buildNormalQuestionSet() {
        var all = getQuestionPool();

        shuffle(all);

        return all.slice(0, clamp(all.length, 1, NORMAL_MAX_QUESTIONS));
    }

    function buildFallbackStoryConfig() {
        var pool = getQuestionPool();
        var tid = storyTestId() || "story_test_default";
        var idx = pool.length ? (hashString(tid) % pool.length) : 0;
        var fallbackQuestion = pool[idx] || null;

        return {
            questionIds: fallbackQuestion ? [fallbackQuestion.id] : [],
            minCorrect: 1,
            timeLimit: DEFAULT_TIME_LIMIT,
            hints: STORY_DEFAULT_HINTS,
            banner: "Complete this story test to continue the story.",
            objective: "Pass the image challenge.",
            successMessage: "Story test completed.",
            failMessage: "Story test failed. Try again."
        };
    }

    function getStoryConfig() {
        var map = getStoryTestMap();
        var tid = storyTestId();

        return map[tid] || buildFallbackStoryConfig();
    }

    function buildStoryQuestionSet() {
        currentStoryConfig = getStoryConfig();

        var byIds = getQuestionsByIds(currentStoryConfig.questionIds || []);

        if (byIds.length) return byIds;

        var fallback = buildFallbackStoryConfig();

        return getQuestionsByIds(fallback.questionIds);
    }

    function getStoryRequiredCorrectCount() {
        var cfg = currentStoryConfig || getStoryConfig();
        var required = toPositiveInt(cfg && cfg.minCorrect, 1);

        return clamp(required, 1, Math.max(questions.length, 1));
    }

    function didPassStoryMode() {
        return correctCount >= getStoryRequiredCorrectCount();
    }

    function accuracyPercent() {
        var totalAnswered = correctCount + wrongCount;

        if (!totalAnswered) return 0;

        return Math.round((correctCount / totalAnswered) * 100);
    }

    function calculateEarnedPoints(q) {
        var base = toPositiveInt(q && q.points, 10);
        var timeBonus = Math.max(0, timeLeft);
        var hintPenalty = hintUsedThisQuestion ? 3 : 0;
        var streakBonus = Math.min(10, Math.max(0, streak - 1) * 2);

        return Math.max(1, base + timeBonus + streakBonus - hintPenalty);
    }

    function preloadImage(src) {
        if (!src) return;

        var img = new Image();
        img.src = src;
    }

    function preloadNextImages() {
        var next = questions[index + 1];

        if (!next) return;

        preloadImage(next.preview);
        preloadImage(next.reveal);
    }

    function runDurationSeconds() {
        if (!runStartedAt) return 0;

        return Math.max(0, Math.round((Date.now() - runStartedAt) / 1000));
    }

    function clearAdvanceTimer() {
        if (questionAdvanceTimerId) {
            clearTimeout(questionAdvanceTimerId);
            questionAdvanceTimerId = null;
        }
    }

    function getThreeAnswerOptions(q) {
        var opts = [];
        var seen = {};

        function addOption(value) {
            value = String(value || "").trim();

            if (!value || seen[value]) return;

            seen[value] = true;
            opts.push(value);
        }

        addOption(q.correct);

        var originalChoices = q.choices || [];
        var wrongChoices = [];

        for (var i = 0; i < originalChoices.length; i++) {
            var choice = String(originalChoices[i] || "").trim();

            if (choice && choice !== q.correct) {
                wrongChoices.push(choice);
            }
        }

        shuffle(wrongChoices);

        for (i = 0; i < wrongChoices.length && opts.length < 3; i++) {
            addOption(wrongChoices[i]);
        }

        if (opts.length < 3) {
            var pool = getQuestionPool();
            var poolNames = [];

            for (i = 0; i < pool.length; i++) {
                if (pool[i].correct && pool[i].correct !== q.correct) {
                    poolNames.push(pool[i].correct);
                }
            }

            shuffle(poolNames);

            for (i = 0; i < poolNames.length && opts.length < 3; i++) {
                addOption(poolNames[i]);
            }
        }

        shuffle(opts);

        return opts;
    }

    /* -------------------- Leaderboard Helpers ------------------- */

    function getLeaderboardLevel() {
        if (questions && questions.length > 0) {
            return questions.length;
        }

        return 1;
    }

    function getBestScoreObject() {
        var raw = safeGet(KEYS.bestScore, "");

        if (!raw) {
            return {
                value: 0,
                date: "",
                level: null
            };
        }

        try {
            var obj = JSON.parse(raw);

            if (obj && typeof obj === "object" && isFinite(Number(obj.value))) {
                return {
                    value: Number(obj.value),
                    date: typeof obj.date === "string" ? obj.date : "",
                    level: isFinite(Number(obj.level)) ? Math.max(1, Math.round(Number(obj.level))) : null
                };
            }
        } catch (e) {}

        var n = Number(raw);

        if (isFinite(n)) {
            return {
                value: n,
                date: "",
                level: null
            };
        }

        return {
            value: 0,
            date: "",
            level: null
        };
    }

    function getBestScoreValue() {
        return getBestScoreObject().value || 0;
    }

    function saveBestScoreIfNeeded(runLevel) {
        var best = getBestScoreObject();

        if (score > Number(best.value || 0)) {
            safeSet(KEYS.bestScore, JSON.stringify({
                value: score,
                date: todayISO(),
                level: runLevel
            }));
        }
    }

    function saveProgressIfNeeded(runLevel) {
        var currentProgress = Number(safeGet(KEYS.progress, "0")) || 0;

        if (runLevel > currentProgress) {
            safeSet(KEYS.progress, String(runLevel));
        }
    }

    function saveLeaderboardRunNormal() {
        var runLevel = getLeaderboardLevel();

        saveBestScoreIfNeeded(runLevel);
        saveProgressIfNeeded(runLevel);

        var runs = safeJsonGet(KEYS.runs, []);

        if (!Array.isArray(runs)) runs = [];

        runs.unshift({
            name: safeGet(KEYS.username, "Guest"),
            value: score,
            level: runLevel,
            correct: correctCount,
            wrong: wrongCount,
            accuracy: accuracyPercent(),
            bestStreak: bestStreak,
            hintsUsed: startHints - hintsLeft,
            durationSec: runDurationSeconds(),
            questionCount: questions.length,
            date: todayISO()
        });

        if (runs.length > 200) {
            runs = runs.slice(0, 200);
        }

        safeJsonSet(KEYS.runs, runs);

        dispatchLeaderboardUpdate();
    }

    /* -------------------- HUD / Feedback ------------------- */

    function setFeedback(msg) {
        setText("feedbackText", msg);
    }

    function updateTimerBadgeState() {
        var timerBadge = $("timerBadge");

        if (!timerBadge || !timerBadge.classList) return;

        if (timeLeft <= 5 && !locked) {
            timerBadge.classList.add("ig-timer-danger");
        } else {
            timerBadge.classList.remove("ig-timer-danger");
        }
    }

    function updateHintButtonState() {
        var btnHint = $("btnHint");

        if (!btnHint) return;

        var canUse = !locked && !hintUsedThisQuestion && hintsLeft > 0;

        btnHint.disabled = !canUse;
        btnHint.setAttribute("aria-disabled", String(!canUse));
        btnHint.textContent = "💡 Use Hint (" + hintsLeft + ")";
    }

    function updateProgressBar() {
        var fill = $("progressFill");

        if (!fill) return;

        var total = questions.length || 1;
        var completed = clamp(index + (locked ? 1 : 0), 0, total);

        fill.style.width = ((completed / total) * 100) + "%";
    }

    function updateHud() {
        setText("scoreText", String(score));
        setText("bestText", String(getBestScoreValue()));

        var total = questions.length || 1;
        var current = total ? Math.min(index + 1, total) : 0;

        if (index >= total && total > 0) {
            current = total;
        }

        setText("qText", current + "/" + total);
        setText("streakText", String(streak));
        setText("accuracyText", accuracyPercent() + "%");
        setText("hintCountText", String(hintsLeft));
        setText("timerText", String(timeLeft));

        updateTimerBadgeState();
        updateHintButtonState();
        updateProgressBar();
    }

    function updateStoryBannerText() {
        if (!isStoryMode) return;

        var el = $("storyBannerText");

        if (!el) return;

        var cfg = currentStoryConfig || getStoryConfig();
        var need = getStoryRequiredCorrectCount();
        var base = cfg && cfg.banner ? cfg.banner + " " : "";

        el.textContent = base + "Need " + need + " correct answer" + (need === 1 ? "" : "s") + " to continue.";
    }

    /* -------------------- Reveal Image ----------------------- */

    function revealPlaceholderHtml() {
        return "" +
            '<div class="reveal-placeholder">' +
            '<div class="reveal-placeholder__icon" aria-hidden="true">🖼️</div>' +
            '<div class="reveal-placeholder__title">Mystery Reveal</div>' +
            '<div class="reveal-placeholder__text">' +
            "The full answer image will appear here after you make your choice." +
            "</div>" +
            "</div>";
    }

    function setRevealPlaceholder() {
        var box = $("revealImageBox");

        if (!box) return;

        box.innerHTML = revealPlaceholderHtml();
    }

    function showRevealImage(src, altText) {
        var box = $("revealImageBox");

        if (!box) return;

        box.innerHTML = "";

        if (!src) {
            box.innerHTML = revealPlaceholderHtml();
            return;
        }

        var img = document.createElement("img");
        img.className = "reveal-img";
        img.alt = altText || "Revealed answer image";
        img.src = src;

        img.addEventListener("error", function() {
            box.innerHTML = revealPlaceholderHtml();
        });

        box.appendChild(img);
    }

    function resetSlowReveal(q) {
        var revealStage = $("guessRevealStage");
        var revealImg = $("guessRevealImg");

        if (!revealStage || !revealImg || !q) return;

        revealStage.classList.remove("is-revealing");

        revealImg.onerror = function() {
            if (q.preview && revealImg.src.indexOf(q.preview) === -1) {
                revealImg.src = q.preview;
            }
        };

        revealImg.src = q.reveal || q.preview || "";
        revealImg.alt = "Slowly revealed image for question " + (index + 1);

        setTimeout(function() {
            if (revealStage) {
                revealStage.classList.add("is-revealing");
            }
        }, 80);
    }

    /* -------------------- Finish UI ------------------------ */

    function cancelAutoReturn() {
        if (autoReturnTimerId) {
            clearTimeout(autoReturnTimerId);
            autoReturnTimerId = null;
        }
    }

    function clearAfterFinishBox() {
        var box = $("afterFinish");

        if (box) {
            box.classList.remove("hidden");
            box.innerHTML = "";
            return box;
        }

        var wrap = document.createElement("div");
        wrap.id = "afterFinish";
        wrap.className = "after-finish";

        var feedbackEl = $("feedbackText");

        if (feedbackEl && feedbackEl.parentNode) {
            feedbackEl.parentNode.appendChild(wrap);
        } else {
            document.body.appendChild(wrap);
        }

        return wrap;
    }

    function makeLinkBtn(text, href, primary) {
        var a = document.createElement("a");

        a.className = primary ? "btn btn-primary" : "btn btn-secondary";
        a.href = href;
        a.textContent = text;

        return a;
    }

    function makeBtn(text, primary) {
        var b = document.createElement("button");

        b.type = "button";
        b.className = primary ? "btn btn-primary" : "btn btn-secondary";
        b.textContent = text;

        return b;
    }

    function hideFinishUI() {
        var box = $("afterFinish");

        if (box && box.classList) {
            box.classList.add("hidden");
        }
    }

    function showNormalFinishUI() {
        var box = clearAfterFinishBox();

        var playAgain = makeBtn("Play Again", true);
        playAgain.id = "btnPlayAgain";

        playAgain.addEventListener("click", function() {
            resumeAudioIfNeeded();
            start();
        });

        box.appendChild(playAgain);
        box.appendChild(makeLinkBtn("Back Home", "../../index.html", false));
    }

    function showStoryFinishUI() {
        var box = clearAfterFinishBox();

        var returnBtn = makeBtn("Return to Story", true);
        returnBtn.id = "btnReturnStory";

        returnBtn.addEventListener("click", function() {
            window.location.href = storyReturnUrl();
        });

        box.appendChild(returnBtn);

        var practice = makeBtn("Play Again", false);
        practice.id = "btnPlayAgain";

        practice.addEventListener("click", function() {
            resumeAudioIfNeeded();
            start();
        });

        box.appendChild(practice);
    }

    function showStoryRetryUI() {
        var box = clearAfterFinishBox();

        var retry = makeBtn("Try Again", true);
        retry.id = "btnStoryRetry";

        retry.addEventListener("click", function() {
            resumeAudioIfNeeded();
            start();
        });

        box.appendChild(retry);
        box.appendChild(makeLinkBtn("Back to Story", storyReturnUrl(), false));
    }

    /* -------------------- Timer ---------------------------- */

    function stopQuestionTimer() {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
    }

    function startQuestionTimer() {
        stopQuestionTimer();

        timeLeft = currentTimeLimit;
        updateHud();

        timerId = setInterval(function() {
            if (locked) {
                stopQuestionTimer();
                return;
            }

            timeLeft--;
            updateHud();

            if (timeLeft <= 0) {
                stopQuestionTimer();
                handleTimeout();
            }
        }, 1000);
    }

    function handleTimeout() {
        if (locked) return;

        locked = true;
        wrongCount++;
        streak = 0;

        disableAllAnswerButtons();

        var q = questions[index];

        showRevealImage(q.reveal, "Revealed image after timeout");
        markCorrectTile(q.correct);
        dimWrongTiles(q.correct);

        setFeedback("Time is up ⏰ The correct answer was: " + q.correct + " | Accuracy: " + accuracyPercent() + "%");

        soundWrong();
        updateHud();

        clearAdvanceTimer();

        questionAdvanceTimerId = setTimeout(function() {
            index++;
            renderQuestion();
        }, ANSWER_DELAY_MS);
    }

    /* -------------------- Hint System ---------------------- */

    function useHint() {
        if (locked || hintUsedThisQuestion || hintsLeft <= 0) return;

        var q = questions[index];

        if (!q) return;

        var grid = $("answersGrid");

        if (!grid) return;

        var buttons = grid.querySelectorAll("button.answer-tile");
        var removable = [];

        for (var i = 0; i < buttons.length; i++) {
            var option = buttons[i].dataset && buttons[i].dataset.option ?
                buttons[i].dataset.option :
                "";

            if (option !== q.correct && !buttons[i].disabled) {
                removable.push(buttons[i]);
            }
        }

        shuffle(removable);

        var removeCount = Math.min(1, removable.length);

        for (i = 0; i < removeCount; i++) {
            removable[i].disabled = true;
            removable[i].tabIndex = -1;
            removable[i].classList.add("is-removed-by-hint");
        }

        hintUsedThisQuestion = true;
        hintsLeft--;

        setFeedback("Hint used 💡 " + (q.hint || "Look closely at the main object.") + " | -3 score bonus");

        updateHud();
    }

    /* -------------------- Render Question ------------------ */

    function setQuestionImage(q) {
        var img = $("questionImg");

        if (!img) return;

        var triedRevealFallback = false;

        img.onerror = function() {
            if (!triedRevealFallback && q.reveal && img.src.indexOf(q.reveal) === -1) {
                triedRevealFallback = true;
                img.src = q.reveal;
                return;
            }

            locked = true;
            stopQuestionTimer();
            disableAllAnswerButtons();

            setFeedback("This image could not be loaded. Moving to the next challenge...");

            clearAdvanceTimer();

            questionAdvanceTimerId = setTimeout(function() {
                index++;
                renderQuestion();
            }, 700);
        };

        img.alt = "Image guess question " + (index + 1) + " in category " + (q.category || "general");
        img.src = q.preview || q.reveal || "";
    }

    function renderQuestion() {
        locked = false;

        if (index >= questions.length) {
            endGame();
            return;
        }

        cancelAutoReturn();
        clearAdvanceTimer();
        hideFinishUI();

        var q = questions[index];

        hintUsedThisQuestion = false;

        currentTimeLimit = toPositiveInt(
            q.timeLimit || (currentStoryConfig && currentStoryConfig.timeLimit),
            DEFAULT_TIME_LIMIT
        );

        setQuestionImage(q);
        setRevealPlaceholder();
        resetSlowReveal(q);
        preloadNextImages();

        setFeedback(
            isStoryMode ?
            "Story Challenge started! Choose the correct answer before time runs out. Keys 1–3 work too." :
            "Guess the picture as it slowly appears. Press 1–3 to answer, or H for hint."
        );

        var grid = $("answersGrid");

        if (!grid) return;

        grid.innerHTML = "";

        var opts = getThreeAnswerOptions(q);

        for (var i = 0; i < opts.length; i++) {
            (function(choiceText, shortcutNumber) {
                var btn = document.createElement("button");

                btn.type = "button";
                btn.className = "answer-tile";

                btn.setAttribute("aria-label", "Answer " + shortcutNumber + ": " + choiceText);
                btn.setAttribute("aria-keyshortcuts", String(shortcutNumber));
                btn.title = "Shortcut: " + shortcutNumber;

                btn.dataset.option = choiceText;
                btn.dataset.letter = String.fromCharCode(64 + shortcutNumber);

                var icon = document.createElement("span");
                icon.className = "icon-bubble";
                icon.textContent = "";

                var label = document.createElement("span");
                label.textContent = choiceText;

                btn.appendChild(icon);
                btn.appendChild(label);

                btn.addEventListener("click", function() {
                    if (locked) return;

                    resumeAudioIfNeeded();
                    handleAnswer(btn, choiceText);
                });

                grid.appendChild(btn);
            })(opts[i], i + 1);
        }

        updateHud();
        startQuestionTimer();
    }

    /* -------------------- Answer Logic --------------------- */

    function disableAllAnswerButtons() {
        var grid = $("answersGrid");

        if (!grid) return;

        var buttons = grid.querySelectorAll("button.answer-tile");

        for (var i = 0; i < buttons.length; i++) {
            buttons[i].disabled = true;
        }
    }

    function markCorrectTile(correct) {
        var grid = $("answersGrid");

        if (!grid) return;

        var buttons = grid.querySelectorAll("button.answer-tile");

        for (var i = 0; i < buttons.length; i++) {
            var b = buttons[i];

            var option = b.dataset && b.dataset.option ?
                b.dataset.option :
                "";

            if (option === correct) {
                b.classList.add("correct");

                var ic = b.querySelector(".icon-bubble");

                if (ic) {
                    ic.textContent = "✓";
                }
            }
        }
    }

    function dimWrongTiles(correct) {
        var grid = $("answersGrid");

        if (!grid) return;

        var buttons = grid.querySelectorAll("button.answer-tile");

        for (var i = 0; i < buttons.length; i++) {
            var option = buttons[i].dataset && buttons[i].dataset.option ?
                buttons[i].dataset.option :
                "";

            if (option !== correct) {
                buttons[i].classList.add("is-dimmed");
            }
        }
    }

    function handleAnswer(clickedBtn, chosenText) {
        if (locked) return;

        locked = true;
        stopQuestionTimer();

        var q = questions[index];
        var correct = q.correct;

        disableAllAnswerButtons();
        markCorrectTile(correct);
        dimWrongTiles(correct);

        if (chosenText === correct) {
            correctCount++;
            streak++;
            bestStreak = Math.max(bestStreak, streak);

            var earned = calculateEarnedPoints(q);
            score += earned;

            clickedBtn.classList.add("correct");

            var ic = clickedBtn.querySelector(".icon-bubble");

            if (ic) {
                ic.textContent = "✓";
            }

            showRevealImage(q.reveal, "Revealed answer image");

            setFeedback(
                "Correct! ✅ +" + earned +
                " points | Streak: " + streak +
                " | Accuracy: " + accuracyPercent() + "%"
            );

            soundCorrect();
        } else {
            wrongCount++;
            streak = 0;

            clickedBtn.classList.add("wrong");
            clickedBtn.classList.remove("is-dimmed");

            var ic2 = clickedBtn.querySelector(".icon-bubble");

            if (ic2) {
                ic2.textContent = "✕";
            }

            showRevealImage(q.reveal, "Revealed answer image");

            setFeedback(
                "Wrong ❌ The correct answer was: " + correct +
                " | Accuracy: " + accuracyPercent() + "%"
            );

            soundWrong();
        }

        updateHud();

        clearAdvanceTimer();

        questionAdvanceTimerId = setTimeout(function() {
            index++;
            renderQuestion();
        }, ANSWER_DELAY_MS);
    }

    /* -------------------- Achievements / Stats --------------------- */

    function achievementName(key) {
        var map = {
            perfect_run: "Perfect Run",
            streak_master: "Streak Master",
            no_hint_master: "No Hint Master",
            high_accuracy: "High Accuracy",
            story_clear: "Story Clear"
        };

        return map[key] || key;
    }

    function unlockAchievement(key) {
        var a = safeJsonGet(KEYS.achievements, {});

        if (!a[key]) {
            a[key] = true;
            safeJsonSet(KEYS.achievements, a);

            if (!unlockedAchievementsThisRun[key]) {
                unlockedAchievementsThisRun[key] = true;
                showToast("🏆 Achievement unlocked", achievementName(key));
                soundAchievement();
            }

            return true;
        }

        return false;
    }

    function saveAchievements(storyPassed) {
        if (questions.length > 0 && correctCount === questions.length) {
            unlockAchievement("perfect_run");
        }

        if (bestStreak >= 3) {
            unlockAchievement("streak_master");
        }

        if (questions.length > 0 && correctCount === questions.length && hintsLeft === startHints) {
            unlockAchievement("no_hint_master");
        }

        if (accuracyPercent() >= 80) {
            unlockAchievement("high_accuracy");
        }

        if (storyPassed) {
            unlockAchievement("story_clear");
        }
    }

    function saveStatsNormal() {
        saveLeaderboardRunNormal();

        var totalPlays = Number(safeGet(KEYS.totalPlays, "0")) || 0;
        safeSet(KEYS.totalPlays, String(totalPlays + 1));

        var stats = safeJsonGet(KEYS.stats, {
            plays: 0,
            totalScore: 0,
            totalCorrect: 0,
            totalWrong: 0,
            bestStreak: 0,
            perfectRuns: 0,
            lastPlayed: ""
        });

        stats.plays += 1;
        stats.totalScore += score;
        stats.totalCorrect += correctCount;
        stats.totalWrong += wrongCount;
        stats.bestStreak = Math.max(stats.bestStreak || 0, bestStreak);

        if (questions.length > 0 && correctCount === questions.length) {
            stats.perfectRuns += 1;
        }

        stats.lastPlayed = nowIso();

        safeJsonSet(KEYS.stats, stats);
    }

    function saveStoryStats(passed) {
        var tid = storyTestId() || "unknown_test";

        var stats = safeJsonGet(KEYS.storyStats, {
            attempts: 0,
            passes: 0,
            lastTest: "",
            tests: {}
        });

        stats.attempts += 1;

        if (passed) {
            stats.passes += 1;
        }

        stats.lastTest = tid;

        if (!stats.tests[tid]) {
            stats.tests[tid] = {
                attempts: 0,
                passes: 0,
                lastPlayed: ""
            };
        }

        stats.tests[tid].attempts += 1;

        if (passed) {
            stats.tests[tid].passes += 1;
        }

        stats.tests[tid].lastPlayed = nowIso();

        safeJsonSet(KEYS.storyStats, stats);
    }

    /* -------------------- Story Completion ----------------- */

    function passStoryTest() {
        safeSet(KEYS.storyPassCompat, "1");

        var tid = storyTestId() || "unknown_test";

        safeSet(storyTestKey(tid), "1");
        safeSet("bca_story_last_test", tid);
    }

    /* -------------------- End Game ------------------------- */

    function endGame() {
        disableAllAnswerButtons();
        stopQuestionTimer();
        clearAdvanceTimer();

        index = questions.length;

        updateHud();

        if (isStoryMode) {
            var passed = didPassStoryMode();

            saveStoryStats(passed);

            if (passed) {
                passStoryTest();
                saveAchievements(true);
                soundStoryPass();

                var tid = storyTestId();

                var successMsg = currentStoryConfig && currentStoryConfig.successMessage ?
                    currentStoryConfig.successMessage :
                    "Test passed! Return to Story.";

                setFeedback("Test passed! 🎉 " + (tid ? "(" + tid + ") " : "") + successMsg);

                showStoryFinishUI();

                if (STORY_AUTO_RETURN_MS > 0) {
                    autoReturnTimerId = setTimeout(function() {
                        window.location.href = storyReturnUrl();
                    }, STORY_AUTO_RETURN_MS);
                }
            } else {
                saveAchievements(false);
                soundWrong();

                var failMsg = currentStoryConfig && currentStoryConfig.failMessage ?
                    currentStoryConfig.failMessage :
                    "Try again.";

                setFeedback(
                    "Test failed. You need " +
                    getStoryRequiredCorrectCount() +
                    " correct answer" +
                    (getStoryRequiredCorrectCount() === 1 ? "" : "s") +
                    " to continue. " +
                    failMsg
                );

                showStoryRetryUI();
            }

            return;
        }

        saveStatsNormal();
        saveAchievements(false);
        updateHud();
        soundFinish();

        setFeedback(
            "Finished! 🎉 Score: " + score +
            " | Accuracy: " + accuracyPercent() + "%" +
            " | Best streak: " + bestStreak +
            " | Hints used: " + (startHints - hintsLeft)
        );

        showNormalFinishUI();
    }

    /* -------------------- Start / Restart ------------------ */

    function start() {
        gameHasStarted = true;

        hideStartScreen();
        cancelAutoReturn();
        stopQuestionTimer();
        clearAdvanceTimer();
        ensureDynamicUi();

        if (isStoryMode) {
            currentStoryConfig = getStoryConfig();
            questions = buildStoryQuestionSet();
            hintsLeft = toPositiveInt(currentStoryConfig && currentStoryConfig.hints, STORY_DEFAULT_HINTS);
        } else {
            currentStoryConfig = null;
            questions = buildNormalQuestionSet();
            hintsLeft = DEFAULT_HINTS;
        }

        if (!questions.length) {
            setFeedback("No challenges are available right now.");
            return;
        }

        index = 0;
        score = 0;
        locked = false;

        correctCount = 0;
        wrongCount = 0;
        streak = 0;
        bestStreak = 0;

        startHints = hintsLeft;
        hintUsedThisQuestion = false;

        currentTimeLimit = DEFAULT_TIME_LIMIT;
        timeLeft = DEFAULT_TIME_LIMIT;

        runStartedAt = Date.now();
        unlockedAchievementsThisRun = {};

        updateStoryBannerText();
        updateHud();
        renderQuestion();
    }

    function resetToIntro() {
        gameHasStarted = false;

        cancelAutoReturn();
        stopQuestionTimer();
        clearAdvanceTimer();

        locked = true;

        index = 0;
        score = 0;
        correctCount = 0;
        wrongCount = 0;
        streak = 0;
        bestStreak = 0;
        hintsLeft = DEFAULT_HINTS;
        timeLeft = DEFAULT_TIME_LIMIT;

        setFeedback("Press START to begin the image quiz.");

        var grid = $("answersGrid");
        if (grid) grid.innerHTML = "";

        var revealStage = $("guessRevealStage");
        var revealImg = $("guessRevealImg");

        if (revealStage) revealStage.classList.remove("is-revealing");
        if (revealImg) revealImg.removeAttribute("src");

        hideFinishUI();
        updateHud();
        showStartScreen();
    }

    /* -------------------- Wiring --------------------------- */

    function wireKeyboard() {
        if (document.documentElement._igKeysWired) return;

        document.documentElement._igKeysWired = true;

        document.addEventListener("keydown", function(e) {
            if (isEditableTarget(e.target)) return;

            if (!gameHasStarted) {
                if (e.key === "Enter" || e.key === " ") {
                    var revealStart = $("btnRevealStart");

                    if (revealStart) {
                        e.preventDefault();
                        revealStart.click();
                    }
                }

                return;
            }

            if ((e.key === "h" || e.key === "H") && !locked) {
                var hintBtn = $("btnHint");

                if (hintBtn && !hintBtn.disabled) {
                    resumeAudioIfNeeded();
                    hintBtn.click();
                }

                return;
            }

            if (locked) return;

            if (e.key >= "1" && e.key <= "3") {
                var grid = $("answersGrid");

                if (!grid) return;

                var buttons = grid.querySelectorAll("button.answer-tile");
                var idx = Number(e.key) - 1;

                if (buttons[idx] && !buttons[idx].disabled) {
                    resumeAudioIfNeeded();
                    buttons[idx].click();
                }
            }
        });
    }

    function wire() {
        ensureDynamicUi();

        btnSoundToggle = $("igSoundToggle") || btnSoundToggle;

        var revealStart = $("btnRevealStart");

        if (revealStart && !revealStart._wired) {
            revealStart._wired = true;

            revealStart.addEventListener("click", function() {
                resumeAudioIfNeeded();
                start();
            });
        }

        var restart = $("btnRestart");

        if (restart && !restart._wired) {
            restart._wired = true;

            restart.addEventListener("click", function() {
                resumeAudioIfNeeded();
                start();
            });
        }

        var heroStart = $("btnHeroStart");

        if (heroStart && !heroStart._wired) {
            heroStart._wired = true;

            heroStart.addEventListener("click", function() {
                resumeAudioIfNeeded();
                start();
            });
        }

        var resetIntroBtn = $("btnResetIntro");

        if (resetIntroBtn && !resetIntroBtn._wired) {
            resetIntroBtn._wired = true;

            resetIntroBtn.addEventListener("click", function() {
                resetToIntro();
            });
        }

        if (btnSoundToggle && !btnSoundToggle._wired) {
            btnSoundToggle._wired = true;
            btnSoundToggle.addEventListener("click", toggleSound);
        }

        var btnHint = $("btnHint");

        if (btnHint && !btnHint._wired) {
            btnHint._wired = true;

            btnHint.addEventListener("click", function() {
                if (btnHint.disabled) return;

                resumeAudioIfNeeded();
                useHint();
            });
        }

        wireKeyboard();
        updateSoundToggleUI();
    }

    /* -------------------- Init --------------------------- */

    document.addEventListener("DOMContentLoaded", function() {
        ensureDynamicUi();
        updateSoundToggleUI();
        wire();

        gameHasStarted = false;
        locked = true;
        timeLeft = DEFAULT_TIME_LIMIT;

        setFeedback("Press START to begin the image quiz.");
        updateHud();
        showStartScreen();
    });
})();