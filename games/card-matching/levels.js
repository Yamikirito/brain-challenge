/* =========================================================
   Levels Map
   50-Level Version + Story Mode Support

   ✅ Shows 50 levels
   ✅ 15 levels per page
   ✅ Next page button cycles pages
   ✅ Reads saved stars from game.js
   ✅ Reads unlocked level from game.js
   ✅ Opens game.html?level=LEVEL_NUMBER
   ✅ Story mode support:
      levels.html?story=1&test=memory_test_1&level=1&return=../../story.html
   ✅ Preserves story params when opening game.html
   ✅ Home button returns to Story when in story mode
   ✅ Sound + music toggle saved in localStorage
========================================================= */

(function() {
    "use strict";

    class LevelsMap {
        constructor() {
            this.TOTAL_LEVELS = 50;
            this.LEVELS_PER_PAGE = 15;

            this.UNLOCKED_KEY = "mc_unlocked_level";
            this.STARS_KEY = "mc_level_stars";
            this.SOUND_KEY = "mc_sound_muted";
            this.MUSIC_KEY = "mc_music_muted";

            /* =====================================================
               Story Mode
            ===================================================== */
            this.isStoryMode = this.getStoryModeFromURL();
            this.storyTestId = this.getStoryTestIdFromURL();
            this.storyReturnUrl = this.getStoryReturnUrlFromURL();
            this.storyAutoReturn = this.getStoryAutoReturnFromURL();
            this.storyRequestedLevel = this.getRequestedStoryLevelFromURL();

            this.currentPage = this.getPageFromURL();

            this.unlockedLevel = 1;
            this.levelStars = {};
            this.soundMuted = false;
            this.musicMuted = false;

            this.audioCtx = null;

            this.cacheElements();
            this.loadState();
            this.ensureInitialProgress();
            this.bindEvents();
            this.applyStoryModeUI();
            this.renderLevels();
            this.updateTopBar();
        }

        /* =====================================================
           Elements
        ===================================================== */

        cacheElements() {
            this.levelsGrid = document.getElementById("levelsGrid");
            this.totalStarsEl = document.getElementById("totalStars");

            this.btnHome = document.getElementById("btnHome");
            this.btnSound = document.getElementById("btnSound");
            this.btnMusic = document.getElementById("btnMusic");
            this.btnNextPage = document.getElementById("btnNextPage");

            this.mapTitle = document.querySelector(".map-title");
            this.levelMapPage = document.querySelector(".level-map-page");
        }

        /* =====================================================
           Story Mode Helpers
        ===================================================== */

        getURLParams() {
            try {
                return new URLSearchParams(window.location.search || "");
            } catch (error) {
                return new URLSearchParams("");
            }
        }

        getStoryModeFromURL() {
            const params = this.getURLParams();

            return params.get("story") === "1" ||
                String(params.get("mode") || "").toLowerCase() === "story";
        }

        getStoryTestIdFromURL() {
            const params = this.getURLParams();
            const raw = String(params.get("test") || "memory_cards_story_test");

            return raw
                .trim()
                .toLowerCase()
                .replace(/\s+/g, "_")
                .replace(/[^a-z0-9_-]/g, "");
        }

        getStoryReturnUrlFromURL() {
            const params = this.getURLParams();

            let raw = params.get("return") || "../../story.html";

            if (/^(https?:)?\/\//i.test(raw)) {
                raw = "../../story.html";
            }

            if (/^javascript:/i.test(raw)) {
                raw = "../../story.html";
            }

            return raw;
        }

        getStoryAutoReturnFromURL() {
            const params = this.getURLParams();
            const raw = String(params.get("autoReturn") || "1").toLowerCase();

            return raw !== "0" && raw !== "false" && raw !== "no";
        }

        getRequestedStoryLevelFromURL() {
            const params = this.getURLParams();
            const raw = Number(params.get("level")) || 1;

            return Math.max(1, Math.min(this.TOTAL_LEVELS, raw));
        }

        getStoryGameUrl(level) {
            const safeLevel = Math.max(1, Math.min(this.TOTAL_LEVELS, Number(level) || 1));

            if (!this.isStoryMode) {
                return "game.html?level=" + encodeURIComponent(String(safeLevel));
            }

            return "game.html?story=1" +
                "&test=" + encodeURIComponent(this.storyTestId || "memory_cards_story_test") +
                "&level=" + encodeURIComponent(String(safeLevel)) +
                "&return=" + encodeURIComponent(this.storyReturnUrl || "../../story.html") +
                "&autoReturn=" + encodeURIComponent(this.storyAutoReturn ? "1" : "0");
        }

        getLevelsUrl(page) {
            const safePage = Math.max(1, Math.min(this.getMaxPage(), Number(page) || 1));

            if (!this.isStoryMode) {
                return "levels.html?page=" + encodeURIComponent(String(safePage));
            }

            return "levels.html?story=1" +
                "&test=" + encodeURIComponent(this.storyTestId || "memory_cards_story_test") +
                "&level=" + encodeURIComponent(String(this.storyRequestedLevel || 1)) +
                "&page=" + encodeURIComponent(String(safePage)) +
                "&return=" + encodeURIComponent(this.storyReturnUrl || "../../story.html") +
                "&autoReturn=" + encodeURIComponent(this.storyAutoReturn ? "1" : "0");
        }

        returnToStory() {
            window.location.href = this.storyReturnUrl || "../../story.html";
        }

        applyStoryModeUI() {
            if (!this.isStoryMode) return;

            document.documentElement.classList.add("mc-story-mode");
            document.body.classList.add("mc-story-mode");

            if (this.levelMapPage) {
                this.levelMapPage.classList.add("mc-story-mode");
            }

            if (this.mapTitle) {
                this.mapTitle.textContent = "Story Level";
            }

            if (this.btnHome) {
                this.btnHome.setAttribute("aria-label", "Back to Story");
                this.btnHome.setAttribute("title", "Back to Story");
                this.btnHome.textContent = "←";
            }

            this.ensureStoryBanner();
        }

        ensureStoryBanner() {
            if (!this.isStoryMode) return;
            if (document.getElementById("mcStoryBanner")) return;

            const banner = document.createElement("div");
            banner.id = "mcStoryBanner";
            banner.className = "mc-story-banner";
            banner.textContent = "Story Mode • Choose the memory level to continue.";

            document.body.appendChild(banner);

            if (!document.getElementById("mcStoryStyle")) {
                const style = document.createElement("style");
                style.id = "mcStoryStyle";
                style.textContent = `
                    .mc-story-banner {
                        position: fixed;
                        top: 18px;
                        left: 50%;
                        transform: translateX(-50%);
                        z-index: 999;
                        max-width: min(760px, calc(100vw - 28px));
                        padding: 12px 18px;
                        border-radius: 999px;
                        background: rgba(38, 27, 72, 0.76);
                        border: 2px solid rgba(255, 255, 255, 0.2);
                        color: #fff7df;
                        box-shadow: 0 14px 28px rgba(0, 0, 0, 0.22);
                        font-size: 16px;
                        font-weight: 900;
                        text-align: center;
                        backdrop-filter: blur(8px);
                        pointer-events: none;
                    }

                    body.mc-story-mode .map-title {
                        padding-top: 18px;
                    }

                    @media (max-width: 620px) {
                        .mc-story-banner {
                            top: 10px;
                            font-size: 13px;
                            padding: 9px 12px;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
        }

        /* =====================================================
           State
        ===================================================== */

        loadState() {
            const unlockedRaw = Number(localStorage.getItem(this.UNLOCKED_KEY));

            this.unlockedLevel =
                Number.isFinite(unlockedRaw) && unlockedRaw > 0 ?
                unlockedRaw :
                1;

            const starsRaw = localStorage.getItem(this.STARS_KEY);

            try {
                this.levelStars = starsRaw ? JSON.parse(starsRaw) : {};
            } catch (error) {
                this.levelStars = {};
            }

            if (!this.levelStars || typeof this.levelStars !== "object") {
                this.levelStars = {};
            }

            this.soundMuted = localStorage.getItem(this.SOUND_KEY) === "1";
            this.musicMuted = localStorage.getItem(this.MUSIC_KEY) === "1";
        }

        saveState() {
            localStorage.setItem(this.UNLOCKED_KEY, String(this.unlockedLevel));
            localStorage.setItem(this.STARS_KEY, JSON.stringify(this.levelStars));
            localStorage.setItem(this.SOUND_KEY, this.soundMuted ? "1" : "0");
            localStorage.setItem(this.MUSIC_KEY, this.musicMuted ? "1" : "0");
        }

        ensureInitialProgress() {
            if (!Number.isFinite(this.unlockedLevel) || this.unlockedLevel < 1) {
                this.unlockedLevel = 1;
            }

            if (this.unlockedLevel > this.TOTAL_LEVELS) {
                this.unlockedLevel = this.TOTAL_LEVELS;
            }

            /*
               Story mode should let the story open the requested level,
               even if normal arcade progress has not unlocked it yet.
            */
            if (this.isStoryMode && this.storyRequestedLevel > this.unlockedLevel) {
                this.unlockedLevel = this.storyRequestedLevel;
            }

            localStorage.setItem(this.UNLOCKED_KEY, String(this.unlockedLevel));
        }

        /* =====================================================
           Events
        ===================================================== */

        bindEvents() {
            if (this.btnHome) {
                this.btnHome.addEventListener("click", () => {
                    this.playClick();

                    if (this.isStoryMode) {
                        this.returnToStory();
                    } else {
                        window.location.href = "index.html";
                    }
                });
            }

            if (this.btnSound) {
                this.btnSound.addEventListener("click", () => {
                    this.soundMuted = !this.soundMuted;
                    this.saveState();
                    this.updateTopBar();

                    if (!this.soundMuted) {
                        this.playClick();
                    }
                });
            }

            if (this.btnMusic) {
                this.btnMusic.addEventListener("click", () => {
                    this.musicMuted = !this.musicMuted;
                    this.saveState();
                    this.updateTopBar();
                    this.playClick();
                });
            }

            if (this.btnNextPage) {
                this.btnNextPage.addEventListener("click", () => {
                    this.playClick();

                    const maxPage = this.getMaxPage();

                    if (this.currentPage >= maxPage) {
                        this.setPage(1);
                    } else {
                        this.setPage(this.currentPage + 1);
                    }
                });
            }

            window.addEventListener("storage", (event) => {
                if (
                    event.key === this.UNLOCKED_KEY ||
                    event.key === this.STARS_KEY ||
                    event.key === this.SOUND_KEY ||
                    event.key === this.MUSIC_KEY
                ) {
                    this.loadState();
                    this.ensureInitialProgress();
                    this.renderLevels();
                    this.updateTopBar();
                }
            });

            window.addEventListener(
                "pointerdown",
                () => {
                    this.resumeAudio();
                }, { passive: true }
            );
        }

        /* =====================================================
           Pagination
        ===================================================== */

        getMaxPage() {
            return Math.ceil(this.TOTAL_LEVELS / this.LEVELS_PER_PAGE);
        }

        getPageFromURL() {
            const params = this.getURLParams();
            const rawPage = Number(params.get("page"));

            if (Number.isFinite(rawPage) && rawPage > 0) {
                return Math.max(1, Math.min(this.getMaxPage(), rawPage));
            }

            /*
               In Story Mode, automatically open the page that contains
               the requested story level.
            */
            if (this.isStoryMode) {
                return Math.ceil(this.storyRequestedLevel / this.LEVELS_PER_PAGE);
            }

            return 1;
        }

        setPage(page) {
            const maxPage = this.getMaxPage();

            this.currentPage = Math.max(1, Math.min(maxPage, Number(page) || 1));

            const url = new URL(window.location.href);

            url.searchParams.set("page", String(this.currentPage));

            if (this.isStoryMode) {
                url.searchParams.set("story", "1");
                url.searchParams.set("test", this.storyTestId || "memory_cards_story_test");
                url.searchParams.set("level", String(this.storyRequestedLevel || 1));
                url.searchParams.set("return", this.storyReturnUrl || "../../story.html");
                url.searchParams.set("autoReturn", this.storyAutoReturn ? "1" : "0");
            }

            window.history.replaceState({}, "", url.toString());

            this.renderLevels();
            this.updateTopBar();
        }

        updateTopBar() {
            if (this.totalStarsEl) {
                this.totalStarsEl.textContent = String(this.getTotalStars());
            }

            if (this.btnSound) {
                this.btnSound.textContent = this.soundMuted ? "🔇" : "🔊";
                this.btnSound.setAttribute(
                    "aria-label",
                    this.soundMuted ? "Sound off" : "Sound on"
                );
            }

            if (this.btnMusic) {
                this.btnMusic.textContent = this.musicMuted ? "𝄽" : "♫";
                this.btnMusic.setAttribute(
                    "aria-label",
                    this.musicMuted ? "Music off" : "Music on"
                );
            }

            if (this.btnNextPage) {
                const maxPage = this.getMaxPage();

                if (this.currentPage >= maxPage) {
                    this.btnNextPage.textContent = "◀";
                    this.btnNextPage.setAttribute("aria-label", "Back to first page");
                    this.btnNextPage.setAttribute("title", "Back to first page");
                } else {
                    this.btnNextPage.textContent = "▶";
                    this.btnNextPage.setAttribute("aria-label", "Next levels page");
                    this.btnNextPage.setAttribute("title", "Next levels page");
                }
            }
        }

        /* =====================================================
           Level Data
        ===================================================== */

        getTotalStars() {
            let total = 0;

            for (const key in this.levelStars) {
                if (Object.prototype.hasOwnProperty.call(this.levelStars, key)) {
                    const value = Number(this.levelStars[key]);

                    if (Number.isFinite(value)) {
                        total += Math.max(0, Math.min(3, value));
                    }
                }
            }

            return total;
        }

        getLevelRangeForCurrentPage() {
            const start = (this.currentPage - 1) * this.LEVELS_PER_PAGE + 1;
            const end = Math.min(
                start + this.LEVELS_PER_PAGE - 1,
                this.TOTAL_LEVELS
            );

            return {
                start: start,
                end: end
            };
        }

        isLocked(level) {
            if (this.isStoryMode && level === this.storyRequestedLevel) {
                return false;
            }

            return level > this.unlockedLevel;
        }

        getStars(level) {
            let stars = this.levelStars[String(level)];

            if (stars === undefined || stars === null) {
                stars = this.levelStars[level];
            }

            stars = Number(stars) || 0;

            return Math.max(0, Math.min(3, stars));
        }

        getCardColor(level) {
            /*
               Matches your current style:
               level 1 orange, level 2 blue, alternating later.
            */
            if (level % 4 === 2 || level % 4 === 0) {
                return "blue";
            }

            return "orange";
        }

        createStarsHTML(stars) {
            let html = "";

            for (let i = 1; i <= 3; i++) {
                const cls = i <= stars ? "filled" : "empty";
                html += `<span class="${cls}">★</span>`;
            }

            return html;
        }

        createLevelCard(level) {
            const locked = this.isLocked(level);
            const stars = this.getStars(level);
            const color = locked ? "locked" : this.getCardColor(level);
            const isStoryTarget = this.isStoryMode && level === this.storyRequestedLevel;

            const button = document.createElement("button");

            button.className =
                "level-card" +
                (locked ? " locked" : "") +
                (isStoryTarget ? " story-target" : "");

            button.type = "button";

            button.setAttribute(
                "aria-label",
                locked ?
                `Level ${level} locked` :
                isStoryTarget ?
                `Open story level ${level}` :
                `Open level ${level}`
            );

            if (locked) {
                button.disabled = true;
                button.setAttribute("aria-disabled", "true");
            }

            const giftHTML =
                level === this.TOTAL_LEVELS ?
                `<div class="gift-badge" aria-hidden="true">🎁</div>` :
                "";

            const storyHTML =
                isStoryTarget ?
                `<div class="story-target-badge" aria-hidden="true">STORY</div>` :
                "";

            button.innerHTML = `
                <div class="level-card-inner">
                    <div class="level-book-top"></div>

                    <div class="level-book-body ${color}">
                        <div class="level-number">${level}</div>

                        <div class="level-stars" aria-label="${stars} stars">
                            ${this.createStarsHTML(stars)}
                        </div>
                    </div>
                </div>

                ${giftHTML}
                ${storyHTML}
            `;

            if (!locked) {
                button.addEventListener("click", () => {
                    this.playClick();
                    window.location.href = this.getStoryGameUrl(level);
                });
            }

            return button;
        }

        renderLevels() {
            if (!this.levelsGrid) return;

            this.levelsGrid.innerHTML = "";

            const range = this.getLevelRangeForCurrentPage();

            for (let level = range.start; level <= range.end; level++) {
                const card = this.createLevelCard(level);
                this.levelsGrid.appendChild(card);
            }

            this.ensureStoryLevelStyles();
        }

        ensureStoryLevelStyles() {
            if (!this.isStoryMode) return;
            if (document.getElementById("mcStoryLevelStyles")) return;

            const style = document.createElement("style");
            style.id = "mcStoryLevelStyles";
            style.textContent = `
                .level-card.story-target {
                    position: relative;
                    filter: drop-shadow(0 0 18px rgba(255, 235, 90, 0.8));
                    animation: mcStoryPulse 1.5s ease-in-out infinite;
                }

                .story-target-badge {
                    position: absolute;
                    top: -10px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 5;
                    padding: 5px 10px;
                    border-radius: 999px;
                    background: linear-gradient(#fff7aa, #ffba2d);
                    color: #7a4511;
                    font-size: 12px;
                    font-weight: 1000;
                    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.24);
                    pointer-events: none;
                }

                @keyframes mcStoryPulse {
                    0%, 100% {
                        transform: translateY(0) scale(1);
                    }

                    50% {
                        transform: translateY(-4px) scale(1.035);
                    }
                }
            `;

            document.head.appendChild(style);
        }

        /* =====================================================
           Audio
        ===================================================== */

        getAudio() {
            if (this.soundMuted) return null;

            const AudioContextClass = window.AudioContext || window.webkitAudioContext;

            if (!AudioContextClass) return null;

            if (!this.audioCtx) {
                try {
                    this.audioCtx = new AudioContextClass();
                } catch (error) {
                    this.audioCtx = null;
                }
            }

            return this.audioCtx;
        }

        resumeAudio() {
            const ctx = this.getAudio();

            if (!ctx) return;

            if (ctx.state === "suspended") {
                try {
                    ctx.resume();
                } catch (error) {
                    // Browser may block audio before user interaction.
                }
            }
        }

        playClick() {
            if (this.soundMuted) return;

            const ctx = this.getAudio();

            if (!ctx) return;

            try {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                const start = ctx.currentTime;
                const end = start + 0.07;

                osc.type = "triangle";
                osc.frequency.setValueAtTime(520, start);

                gain.gain.setValueAtTime(0.0001, start);
                gain.gain.exponentialRampToValueAtTime(0.025, start + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.0001, end);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(start);
                osc.stop(end + 0.03);
            } catch (error) {
                // Ignore audio errors.
            }
        }
    }

    document.addEventListener("DOMContentLoaded", function() {
        new LevelsMap();
    });
})();