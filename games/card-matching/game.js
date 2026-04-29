/* =========================================================
   Memory Cards Game
   50-Level Version + Story Mode + How To Play Modal + Background Music

   ✅ Works with game.html
   ✅ Works with levels.html map
   ✅ Supports 50 levels
   ✅ Saves level stars
   ✅ Unlocks next level
   ✅ Animal-only cards
   ✅ Correct image path:
      games/card-matching/game.js
      ../../assets/images/cards/
   ✅ Correct sound path:
      games/card-matching/game.js
      ../../assets/sounds/
   ✅ Pause popup
   ✅ Custom How To Play popup
   ✅ Background music:
      ../../assets/sounds/card-matching-bgmusic.mp3
   ✅ Correct match glow effect
   ✅ Matched cards disappear
   ✅ Story mode support:
      game.html?story=1&test=memory_test_1&level=1&return=../../story.html
   ✅ Saves story pass:
      bca_story_test_memory_test_1 = 1
   ✅ Returns to story page after win
   ✅ Saves leaderboard runs:
      bca_runs_cardMatching
      bca_best_cardMatching
      bca_progress_cardMatching
========================================================= */

(function() {
    "use strict";

    class MemoryCardsGame {
        constructor() {
            this.MAX_LEVEL = 50;

            this.UNLOCKED_KEY = "mc_unlocked_level";
            this.STARS_KEY = "mc_level_stars";
            this.SOUND_KEY = "mc_sound_muted";
            this.MUSIC_KEY = "mc_music_muted";
            this.TUTORIAL_KEY = "mc_tutorial_done";

            /* =====================================================
               Brain Challenge Arcade Leaderboard Keys
            ===================================================== */
            this.GAME_ID = "card-matching";
            this.BCA_RUNS_KEY = "bca_runs_cardMatching";
            this.BCA_BEST_KEY = "bca_best_cardMatching";
            this.BCA_PROGRESS_KEY = "bca_progress_cardMatching";
            this.BCA_LEVEL_CAP_KEY = "bca_levelcap_cardMatching";
            this.BCA_USERNAME_KEY = "bca_username";
            this.BCA_TOTAL_PLAYS_KEY = "bca_totalPlays";

            this.SOUNDS_BASE_PATH = "../../assets/sounds/";
            this.BG_MUSIC_SRC = this.SOUNDS_BASE_PATH + "card-matching-bgmusic.mp3";

            /* =====================================================
               Story Mode Keys
            ===================================================== */
            this.STORY_PASS_PREFIX = "bca_story_test_";
            this.STORY_LAST_TEST_KEY = "bca_story_last_test";
            this.STORY_LAST_GAME_KEY = "bca_story_last_game";
            this.STORY_LAST_LEVEL_KEY = "mc_story_last_level";

            this.isStoryMode = this.getStoryModeFromURL();
            this.storyTestId = this.getStoryTestIdFromURL();
            this.storyReturnUrl = this.getStoryReturnUrlFromURL();
            this.storyAutoReturn = this.getStoryAutoReturnFromURL();

            this.LEVELS = this.createLevels();

            this.level = this.getLevelFromURL();

            this.moves = 0;
            this.mistakes = 0;
            this.matchedPairs = 0;

            this.firstCard = null;
            this.secondCard = null;
            this.lockBoard = false;

            this.muted = false;
            this.musicMuted = false;
            this.audioCtx = null;
            this.bgmusic = null;
            this.matchPopTimer = null;
            this.storyReturnTimer = null;

            this.tutorialActive = false;
            this.tutorialDone = localStorage.getItem(this.TUTORIAL_KEY) === "1";

            this.cacheElements();
            this.bindEvents();
            this.init();
        }

        /* =====================================================
           Safe Storage Helpers
        ===================================================== */

        safeGet(key, fallback) {
            try {
                const value = localStorage.getItem(key);
                return value === null ? fallback : value;
            } catch (error) {
                return fallback;
            }
        }

        safeSet(key, value) {
            try {
                localStorage.setItem(key, value);
            } catch (error) {
                /* Ignore localStorage errors */
            }
        }

        safeJsonGet(key, fallback) {
            try {
                const raw = localStorage.getItem(key);

                if (!raw) {
                    return fallback;
                }

                return JSON.parse(raw);
            } catch (error) {
                return fallback;
            }
        }

        safeJsonSet(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                /* Ignore localStorage errors */
            }
        }

        todayISO() {
            const d = new Date();
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");

            return yyyy + "-" + mm + "-" + dd;
        }

        getUsername() {
            const name = String(this.safeGet(this.BCA_USERNAME_KEY, "Guest") || "Guest").trim();
            return name || "Guest";
        }

        dispatchLeaderboardUpdate() {
            try {
                window.dispatchEvent(new Event("bca:leaderboard-updated"));
            } catch (error) {
                /* Ignore event errors */
            }
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

        markStoryTestPassed() {
            if (!this.isStoryMode) return;

            const testId = this.storyTestId || "memory_cards_story_test";

            localStorage.setItem(this.STORY_PASS_PREFIX + testId, "1");
            localStorage.setItem(this.STORY_LAST_TEST_KEY, testId);
            localStorage.setItem(this.STORY_LAST_GAME_KEY, "card-matching");
            localStorage.setItem(this.STORY_LAST_LEVEL_KEY, String(this.level));
        }

        returnToStory() {
            this.pauseBackgroundMusic();

            const testId = this.storyTestId || "memory_cards_story_test";
            let target = this.storyReturnUrl || "../../story.html";

            try {
                const url = new URL(target, window.location.href);
                url.searchParams.set("from", testId);
                window.location.href = url.href;
            } catch (error) {
                const joiner = target.indexOf("?") === -1 ? "?" : "&";
                window.location.href = target + joiner + "from=" + encodeURIComponent(testId);
            }
        }

        applyStoryModeUI() {
            if (!this.isStoryMode) return;

            document.documentElement.classList.add("mc-story-mode");
            document.body.classList.add("mc-story-mode");

            if (this.btnNext) {
                this.btnNext.textContent = "Return to Story →";
            }

            if (this.btnWinLevels) {
                this.btnWinLevels.textContent = "Back to Story";
            }

            if (this.btnPauseBackLevels) {
                this.btnPauseBackLevels.textContent = "Back to Story";
            }

            if (this.btnBackLevels) {
                this.btnBackLevels.textContent = "Back to Story";
            }

            if (this.btnWinClose) {
                this.btnWinClose.title = "Return to Story";
                this.btnWinClose.setAttribute("aria-label", "Return to Story");
            }
        }

        goBackFromGame() {
            this.pauseBackgroundMusic();

            if (this.isStoryMode) {
                this.returnToStory();
            } else {
                window.location.href = "levels.html";
            }
        }

        /* =====================================================
           50 Level Setup
        ===================================================== */

        createLevels() {
            const levels = [];

            for (let i = 1; i <= 50; i++) {
                let pairs;
                let cols;
                let difficulty;

                if (i <= 5) {
                    pairs = 3 + Math.floor((i - 1) * 0.8);
                    cols = 3;
                    difficulty = "EASY";
                } else if (i <= 15) {
                    pairs = 6 + Math.floor((i - 6) * 0.6);
                    cols = 4;
                    difficulty = "MEDIUM";
                } else if (i <= 30) {
                    pairs = 12 + Math.floor((i - 16) * 0.45);
                    cols = 5;
                    difficulty = "HARD";
                } else if (i <= 45) {
                    pairs = 18 + Math.floor((i - 31) * 0.35);
                    cols = 6;
                    difficulty = "MASTER";
                } else {
                    pairs = 23 + Math.floor((i - 46) * 0.25);
                    cols = 6;
                    difficulty = "LEGEND";
                }

                pairs = Math.min(pairs, 24);

                if (pairs <= 3) cols = 3;
                else if (pairs <= 8) cols = 4;
                else if (pairs <= 14) cols = 5;
                else if (pairs <= 20) cols = 6;
                else cols = 8;

                levels.push({
                    pairs: pairs,
                    cols: cols,
                    difficulty: difficulty
                });
            }

            return levels;
        }

        /* =====================================================
           Elements
        ===================================================== */

        cacheElements() {
            this.boardEl = document.getElementById("board");

            this.levelText = document.getElementById("levelText");
            this.starsText = document.getElementById("starsText");

            this.btnPause = document.getElementById("btnPause");
            this.btnMute = document.getElementById("btnMute");

            this.pauseModal = document.getElementById("pauseModal");
            this.btnContinueGame = document.getElementById("btnContinueGame");
            this.btnPauseBackLevels = document.getElementById("btnPauseBackLevels");
            this.btnHowToPlay = document.getElementById("btnHowToPlay");
            this.pauseLevelText = document.getElementById("pauseLevelText");
            this.pauseSoundToggle = document.getElementById("pauseSoundToggle");
            this.pauseMusicToggle = document.getElementById("pauseMusicToggle");

            this.howToModal = document.getElementById("howToModal");
            this.btnHowToClose = document.getElementById("btnHowToClose");

            this.winModal = document.getElementById("winModal");
            this.btnWinClose = document.getElementById("btnWinClose");
            this.btnNext = document.getElementById("btnNext");
            this.btnWinLevels = document.getElementById("btnWinLevels");
            this.winLevel = document.getElementById("winLevel");
            this.winScore = document.getElementById("winScore");
            this.winStars = document.getElementById("winStars");

            this.matchPop = document.getElementById("matchPop");
            this.matchImgA = document.getElementById("matchImgA");
            this.matchImgB = document.getElementById("matchImgB");

            this.tutorialBox = document.getElementById("tutorialBox");
            this.tutorialMatchBox = document.getElementById("tutorialMatchBox");
            this.btnTutorialOk = document.getElementById("btnTutorialOk");

            this.levelStartModal = document.getElementById("levelStartModal");
            this.startLevelNumber = document.getElementById("startLevelNumber");
            this.difficultyText = document.getElementById("difficultyText");
            this.btnStartLevel = document.getElementById("btnStartLevel");
            this.btnBackLevels = document.getElementById("btnBackLevels");

            this.loadingScreen = document.getElementById("loadingScreen");
            this.loadingFill = document.getElementById("loadingFill");
        }

        bindEvents() {
            if (this.btnPause) {
                this.btnPause.addEventListener("click", () => {
                    this.openPauseModal();
                });
            }

            if (this.btnMute) {
                this.btnMute.addEventListener("click", () => {
                    this.toggleMute();
                });
            }

            if (this.btnContinueGame) {
                this.btnContinueGame.addEventListener("click", () => {
                    this.closePauseModal();
                });
            }

            if (this.btnPauseBackLevels) {
                this.btnPauseBackLevels.addEventListener("click", () => {
                    this.playButton();
                    this.goBackFromGame();
                });
            }

            if (this.btnHowToPlay) {
                this.btnHowToPlay.addEventListener("click", () => {
                    this.openHowToModal();
                });
            }

            if (this.btnHowToClose) {
                this.btnHowToClose.addEventListener("click", () => {
                    this.closeHowToModal();
                });
            }

            if (this.pauseSoundToggle) {
                this.pauseSoundToggle.addEventListener("click", () => {
                    this.toggleMute();
                });
            }

            if (this.pauseMusicToggle) {
                this.pauseMusicToggle.addEventListener("click", () => {
                    this.toggleMusic();
                });
            }

            if (this.btnTutorialOk) {
                this.btnTutorialOk.addEventListener("click", () => {
                    this.completeTutorial();
                });
            }

            if (this.btnNext) {
                this.btnNext.addEventListener("click", () => {
                    this.playButton();

                    if (this.isStoryMode) {
                        this.returnToStory();
                        return;
                    }

                    if (this.level >= this.MAX_LEVEL) {
                        this.pauseBackgroundMusic();
                        window.location.href = "levels.html";
                    } else {
                        this.showLevelStart(this.level + 1);
                    }
                });
            }

            if (this.btnWinLevels) {
                this.btnWinLevels.addEventListener("click", () => {
                    this.playButton();
                    this.goBackFromGame();
                });
            }

            if (this.btnStartLevel) {
                this.btnStartLevel.addEventListener("click", () => {
                    this.playButton();

                    const nextLevel = Number(this.startLevelNumber.textContent || "1");
                    this.loadLevel(nextLevel);
                    this.updateBackgroundMusic();
                });
            }

            if (this.btnBackLevels) {
                this.btnBackLevels.addEventListener("click", () => {
                    this.playButton();
                    this.goBackFromGame();
                });
            }

            if (this.btnWinClose) {
                this.btnWinClose.addEventListener("click", () => {
                    this.playButton();
                    this.goBackFromGame();
                });
            }

            document.addEventListener("keydown", (event) => {
                this.resumeAudio();
                this.updateBackgroundMusic();

                if (event.key === "Escape") {
                    if (this.howToModal && !this.howToModal.classList.contains("hidden")) {
                        this.closeHowToModal();
                        return;
                    }

                    if (this.pauseModal && !this.pauseModal.classList.contains("hidden")) {
                        this.closePauseModal();
                    } else {
                        this.openPauseModal();
                    }
                }
            });

            window.addEventListener(
                "pointerdown",
                () => {
                    this.resumeAudio();
                    this.updateBackgroundMusic();
                }, {
                    passive: true
                }
            );

            document.addEventListener(
                "visibilitychange",
                () => {
                    if (document.hidden) {
                        this.pauseBackgroundMusic();
                    } else {
                        this.updateBackgroundMusic();
                    }
                }
            );
        }

        /* =====================================================
           Init
        ===================================================== */

        init() {
            this.muted = localStorage.getItem(this.SOUND_KEY) === "1";
            this.musicMuted = localStorage.getItem(this.MUSIC_KEY) === "1";

            this.ensureInitialProgress();

            this.updateMuteButton();
            this.updatePauseSoundSwitch();
            this.updatePauseMusicSwitch();
            this.applyStoryModeUI();

            this.setupBackgroundMusic();

            this.startLoading();
        }

        ensureInitialProgress() {
            const unlocked = Number(localStorage.getItem(this.UNLOCKED_KEY)) || 0;

            if (unlocked < 1) {
                localStorage.setItem(this.UNLOCKED_KEY, "1");
            }
        }

        getLevelFromURL() {
            const params = this.getURLParams();
            const raw = Number(params.get("level")) || 1;

            return Math.max(1, Math.min(this.MAX_LEVEL, raw));
        }

        startLoading() {
            if (!this.loadingScreen || !this.loadingFill) {
                this.loadLevel(this.level);
                this.updateBackgroundMusic();
                return;
            }

            let progress = 0;

            const timer = setInterval(() => {
                progress += 4;
                this.loadingFill.style.width = progress + "%";

                if (progress >= 100) {
                    clearInterval(timer);

                    setTimeout(() => {
                        this.loadingScreen.classList.add("hidden");
                        this.loadLevel(this.level);
                        this.updateBackgroundMusic();
                    }, 250);
                }
            }, 35);
        }

        /* =====================================================
           Images
        ===================================================== */

        animalImages() {
            const base = "../../assets/images/cards/";

            const files = [
                "bee.png",
                "cat.png",
                "cow.png",
                "dog.png",
                "dolphin.png",
                "duck.png",
                "elephant.png",
                "fish.png",
                "fox.png",
                "frog.png",
                "giraffe.png",
                "horse.png",
                "koala.png",
                "lion.png",
                "monkey.png",
                "mouse.png",
                "owl.png",
                "panda.png",
                "parrot.png",
                "pig.png",
                "rabbit.png",
                "snail.png",
                "spider.png",
                "zebra.png"
            ];

            return files.map((file) => {
                return base + file;
            });
        }

        shuffle(array) {
            const arr = array.slice();

            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const temp = arr[i];

                arr[i] = arr[j];
                arr[j] = temp;
            }

            return arr;
        }

        buildDeck() {
            const cfg = this.LEVELS[this.level - 1];

            let pool = this.shuffle(this.animalImages());

            const maxPairs = pool.length;
            const pairCount = Math.min(cfg.pairs, maxPairs);

            const picks = pool.slice(0, pairCount);

            let deck = [];

            picks.forEach((img, index) => {
                deck.push({
                    id: "pair-" + index,
                    img: img
                });

                deck.push({
                    id: "pair-" + index,
                    img: img
                });
            });

            deck = this.shuffle(deck);

            if (this.level === 1 && !this.tutorialDone && deck.length >= 2) {
                const tutorialPairId = deck[0].id;
                const tutorialCards = deck.filter((card) => card.id === tutorialPairId);
                const otherCards = deck.filter((card) => card.id !== tutorialPairId);

                deck = [
                    tutorialCards[0],
                    tutorialCards[1],
                    ...this.shuffle(otherCards)
                ];
            }

            return deck;
        }

        renderBoard() {
            if (!this.boardEl) return;

            const cfg = this.LEVELS[this.level - 1];
            const deck = this.buildDeck();

            this.boardEl.innerHTML = "";
            this.boardEl.style.gridTemplateColumns = "repeat(" + cfg.cols + ", 1fr)";

            deck.forEach((cardData, index) => {
                const card = document.createElement("button");

                card.type = "button";
                card.className = "mc-card";
                card.setAttribute("aria-label", "Memory card");
                card.setAttribute("aria-pressed", "false");

                card.dataset.pair = cardData.id;
                card.dataset.img = cardData.img;
                card.dataset.index = String(index);

                const inner = document.createElement("div");
                inner.className = "mc-card-inner";

                const back = document.createElement("div");
                back.className = "mc-card-face mc-card-back";
                back.textContent = "?";

                const front = document.createElement("div");
                front.className = "mc-card-face mc-card-front";

                const img = document.createElement("img");
                img.src = cardData.img;
                img.alt = "Card image";
                img.loading = "lazy";
                img.decoding = "async";
                img.draggable = false;

                front.appendChild(img);
                inner.appendChild(back);
                inner.appendChild(front);
                card.appendChild(inner);

                card.addEventListener("click", () => {
                    this.flipCard(card);
                });

                this.boardEl.appendChild(card);
            });
        }

        /* =====================================================
           Level Loading
        ===================================================== */

        loadLevel(nextLevel) {
            this.level = Math.max(1, Math.min(this.MAX_LEVEL, Number(nextLevel) || 1));

            const url = new URL(window.location.href);
            url.searchParams.set("level", String(this.level));

            if (this.isStoryMode) {
                url.searchParams.set("story", "1");
                url.searchParams.set("test", this.storyTestId || "memory_cards_story_test");
                url.searchParams.set("return", this.storyReturnUrl || "../../story.html");
                url.searchParams.set("autoReturn", this.storyAutoReturn ? "1" : "0");
            }

            window.history.replaceState({}, "", url.toString());

            this.resetStats();

            if (this.levelText) {
                this.levelText.textContent = String(this.level);
            }

            if (this.pauseLevelText) {
                this.pauseLevelText.textContent = String(this.level);
            }

            this.hideAllModals();
            this.applyStoryModeUI();

            this.tutorialActive = this.level === 1 && !this.tutorialDone;

            if (this.tutorialBox) {
                this.tutorialBox.classList.toggle("hidden", !this.tutorialActive);
            }

            if (this.tutorialMatchBox) {
                this.tutorialMatchBox.classList.add("hidden");
            }

            this.renderBoard();
        }

        hideAllModals() {
            if (this.storyReturnTimer) {
                clearTimeout(this.storyReturnTimer);
                this.storyReturnTimer = null;
            }

            if (this.winModal) {
                this.winModal.classList.add("hidden");
                this.winModal.setAttribute("aria-hidden", "true");
            }

            if (this.levelStartModal) {
                this.levelStartModal.classList.add("hidden");
                this.levelStartModal.setAttribute("aria-hidden", "true");
            }

            if (this.pauseModal) {
                this.pauseModal.classList.add("hidden");
                this.pauseModal.setAttribute("aria-hidden", "true");
            }

            if (this.howToModal) {
                this.howToModal.classList.add("hidden");
                this.howToModal.setAttribute("aria-hidden", "true");
            }

            if (this.matchPop) {
                this.matchPop.classList.add("hidden");
                this.matchPop.setAttribute("aria-hidden", "true");
            }
        }

        resetStats() {
            this.moves = 0;
            this.mistakes = 0;
            this.matchedPairs = 0;

            this.firstCard = null;
            this.secondCard = null;
            this.lockBoard = false;

            this.updateStars();
        }

        /* =====================================================
           Card Logic
        ===================================================== */

        flipCard(card) {
            if (!card) return;
            if (this.lockBoard) return;
            if (card.classList.contains("flipped")) return;
            if (card.classList.contains("matched")) return;
            if (card.classList.contains("matched-removing")) return;
            if (card.classList.contains("matched-removed")) return;

            this.resumeAudio();
            this.updateBackgroundMusic();

            card.classList.add("flipped");
            card.setAttribute("aria-pressed", "true");

            this.playFlip();

            if (!this.firstCard) {
                this.firstCard = card;
                return;
            }

            this.secondCard = card;
            this.moves++;

            this.checkMatch();
        }

        checkMatch() {
            if (!this.firstCard || !this.secondCard) return;

            const isMatch = this.firstCard.dataset.pair === this.secondCard.dataset.pair;

            if (isMatch) {
                this.handleMatch();
            } else {
                this.handleMiss();
            }
        }

        handleMatch() {
            const cardA = this.firstCard;
            const cardB = this.secondCard;
            const img = cardA.dataset.img;

            cardA.classList.add("matched");
            cardB.classList.add("matched");

            this.playMatch();

            this.firstCard = null;
            this.secondCard = null;
            this.lockBoard = true;

            this.showMatchPop(img, cardA, cardB);

            setTimeout(() => {
                cardA.classList.add("matched-removing");
                cardB.classList.add("matched-removing");
            }, 520);

            setTimeout(() => {
                cardA.classList.add("matched-removed");
                cardB.classList.add("matched-removed");

                cardA.classList.remove("matched-removing");
                cardB.classList.remove("matched-removing");

                this.matchedPairs++;

                if (this.tutorialActive) {
                    if (this.tutorialBox) {
                        this.tutorialBox.classList.add("hidden");
                    }

                    if (this.tutorialMatchBox) {
                        this.tutorialMatchBox.classList.remove("hidden");
                    }

                    this.lockBoard = true;
                    return;
                }

                const totalPairs = Math.min(
                    this.LEVELS[this.level - 1].pairs,
                    this.animalImages().length
                );

                if (this.matchedPairs >= totalPairs) {
                    this.lockBoard = true;

                    setTimeout(() => {
                        this.showWin();
                    }, 350);
                } else {
                    this.lockBoard = false;
                }
            }, 900);
        }

        handleMiss() {
            const cardA = this.firstCard;
            const cardB = this.secondCard;

            this.mistakes++;
            this.updateStars();
            this.playWrong();

            this.lockBoard = true;

            setTimeout(() => {
                if (cardA) {
                    cardA.classList.remove("flipped");
                    cardA.setAttribute("aria-pressed", "false");
                }

                if (cardB) {
                    cardB.classList.remove("flipped");
                    cardB.setAttribute("aria-pressed", "false");
                }

                this.firstCard = null;
                this.secondCard = null;
                this.lockBoard = false;
            }, 700);
        }

        showMatchPop(img, cardA, cardB) {
            if (!this.matchPop || !this.matchImgA || !this.matchImgB) return;

            this.matchImgA.src = img;
            this.matchImgB.src = img;

            this.matchImgA.alt = "Matched card";
            this.matchImgB.alt = "Matched card";

            let x = window.innerWidth / 2;
            let y = window.innerHeight / 2;

            if (cardA && cardB) {
                const r1 = cardA.getBoundingClientRect();
                const r2 = cardB.getBoundingClientRect();

                const x1 = r1.left + r1.width / 2;
                const y1 = r1.top + r1.height / 2;

                const x2 = r2.left + r2.width / 2;
                const y2 = r2.top + r2.height / 2;

                x = (x1 + x2) / 2;
                y = (y1 + y2) / 2;
            }

            this.matchPop.style.setProperty("--match-x", x + "px");
            this.matchPop.style.setProperty("--match-y", y + "px");

            this.matchPop.classList.remove("hidden");
            this.matchPop.setAttribute("aria-hidden", "false");

            window.clearTimeout(this.matchPopTimer);

            this.matchPopTimer = window.setTimeout(() => {
                this.matchPop.classList.add("hidden");
                this.matchPop.setAttribute("aria-hidden", "true");
            }, 930);
        }

        completeTutorial() {
            this.tutorialDone = true;
            this.tutorialActive = false;

            localStorage.setItem(this.TUTORIAL_KEY, "1");

            if (this.tutorialMatchBox) {
                this.tutorialMatchBox.classList.add("hidden");
            }

            const totalPairs = Math.min(
                this.LEVELS[this.level - 1].pairs,
                this.animalImages().length
            );

            if (this.matchedPairs >= totalPairs) {
                this.lockBoard = true;

                setTimeout(() => {
                    this.showWin();
                }, 300);
            } else {
                this.lockBoard = false;
            }
        }

        /* =====================================================
           Stars, Score, Progress, Leaderboard
        ===================================================== */

        calculateStars() {
            if (this.mistakes >= 6) return 1;
            if (this.mistakes >= 3) return 2;
            return 3;
        }

        updateStars() {
            const stars = this.calculateStars();

            if (this.starsText) {
                this.starsText.textContent = "★".repeat(stars);
            }
        }

        calculateScore() {
            const base = 100;
            const movePenalty = this.moves * 3;
            const mistakePenalty = this.mistakes * 10;

            return Math.max(10, base - movePenalty - mistakePenalty);
        }

        saveLevelProgress() {
            const starsEarned = this.calculateStars();

            let unlockedLevel = Number(localStorage.getItem(this.UNLOCKED_KEY)) || 1;
            let starData = {};

            try {
                starData = JSON.parse(localStorage.getItem(this.STARS_KEY) || "{}");
            } catch (error) {
                starData = {};
            }

            if (this.level < this.MAX_LEVEL && this.level + 1 > unlockedLevel) {
                unlockedLevel = this.level + 1;
            }

            const oldStars = Number(starData[this.level]) || 0;

            if (starsEarned > oldStars) {
                starData[this.level] = starsEarned;
            }

            localStorage.setItem(this.UNLOCKED_KEY, String(unlockedLevel));
            localStorage.setItem(this.STARS_KEY, JSON.stringify(starData));

            const currentProgress = Number(this.safeGet(this.BCA_PROGRESS_KEY, "0")) || 0;

            if (this.level > currentProgress) {
                this.safeSet(this.BCA_PROGRESS_KEY, String(this.level));
            }
        }

        getBestLeaderboardValue() {
            const raw = this.safeGet(this.BCA_BEST_KEY, "");

            if (!raw) {
                return null;
            }

            try {
                const obj = JSON.parse(raw);

                if (obj && typeof obj === "object" && Number.isFinite(Number(obj.value))) {
                    return Number(obj.value);
                }
            } catch (error) {
                /* Continue to number fallback */
            }

            const n = Number(raw);

            return Number.isFinite(n) ? n : null;
        }

        saveBestLeaderboard(score, starsEarned) {
            const currentBest = this.getBestLeaderboardValue();

            if (currentBest === null || score > currentBest) {
                this.safeSet(this.BCA_BEST_KEY, JSON.stringify({
                    value: score,
                    date: this.todayISO(),
                    level: this.level,
                    stars: starsEarned,
                    moves: this.moves,
                    mistakes: this.mistakes
                }));
            }
        }

        saveLeaderboardRun(score, starsEarned) {
            if (this.isStoryMode) {
                return;
            }

            const run = {
                name: this.getUsername(),
                value: score,
                level: this.level,
                stars: starsEarned,
                moves: this.moves,
                mistakes: this.mistakes,
                date: this.todayISO()
            };

            let runs = this.safeJsonGet(this.BCA_RUNS_KEY, []);

            if (!Array.isArray(runs)) {
                runs = [];
            }

            runs.unshift(run);

            if (runs.length > 200) {
                runs = runs.slice(0, 200);
            }

            this.safeJsonSet(this.BCA_RUNS_KEY, runs);

            this.saveBestLeaderboard(score, starsEarned);

            const totalPlays = Number(this.safeGet(this.BCA_TOTAL_PLAYS_KEY, "0")) || 0;
            this.safeSet(this.BCA_TOTAL_PLAYS_KEY, String(totalPlays + 1));

            this.dispatchLeaderboardUpdate();
        }

        /* =====================================================
           Win + Level Start
        ===================================================== */

        showWin() {
            this.saveLevelProgress();
            this.markStoryTestPassed();
            this.playWin();

            const starsEarned = this.calculateStars();
            const finalScore = this.calculateScore();

            if (!this.isStoryMode) {
                this.saveLeaderboardRun(finalScore, starsEarned);
            }

            if (this.winLevel) {
                this.winLevel.textContent = String(this.level);
            }

            if (this.winScore) {
                this.winScore.textContent = String(finalScore);
            }

            if (this.winStars) {
                this.winStars.textContent = "★".repeat(starsEarned);
            }

            if (this.btnNext) {
                if (this.isStoryMode) {
                    this.btnNext.textContent = "Return to Story →";
                } else {
                    this.btnNext.textContent =
                        this.level >= this.MAX_LEVEL ? "Back to levels →" : "Next level →";
                }
            }

            if (this.btnWinLevels) {
                this.btnWinLevels.textContent = this.isStoryMode ? "Back to Story" : "Back to levels";
            }

            if (this.winModal) {
                this.winModal.classList.remove("hidden");
                this.winModal.setAttribute("aria-hidden", "false");
            }

            if (this.isStoryMode && this.storyAutoReturn) {
                this.storyReturnTimer = window.setTimeout(() => {
                    this.returnToStory();
                }, 1400);
            }
        }

        showLevelStart(nextLevel) {
            const levelNumber = Math.max(1, Math.min(this.MAX_LEVEL, Number(nextLevel) || 1));
            const cfg = this.LEVELS[levelNumber - 1];

            if (this.startLevelNumber) {
                this.startLevelNumber.textContent = String(levelNumber);
            }

            if (this.difficultyText) {
                this.difficultyText.textContent = cfg.difficulty;
            }

            if (this.winModal) {
                this.winModal.classList.add("hidden");
                this.winModal.setAttribute("aria-hidden", "true");
            }

            if (this.pauseModal) {
                this.pauseModal.classList.add("hidden");
                this.pauseModal.setAttribute("aria-hidden", "true");
            }

            if (this.howToModal) {
                this.howToModal.classList.add("hidden");
                this.howToModal.setAttribute("aria-hidden", "true");
            }

            if (this.levelStartModal) {
                this.levelStartModal.classList.remove("hidden");
                this.levelStartModal.setAttribute("aria-hidden", "false");
            }

            this.applyStoryModeUI();
        }

        /* =====================================================
           How To Play Modal
        ===================================================== */

        openHowToModal() {
            this.playButton();

            if (this.howToModal) {
                this.howToModal.classList.remove("hidden");
                this.howToModal.setAttribute("aria-hidden", "false");
            }

            this.lockBoard = true;
        }

        closeHowToModal() {
            this.playButton();

            if (this.howToModal) {
                this.howToModal.classList.add("hidden");
                this.howToModal.setAttribute("aria-hidden", "true");
            }

            const isPauseOpen =
                this.pauseModal &&
                !this.pauseModal.classList.contains("hidden");

            const isWinOpen =
                this.winModal &&
                !this.winModal.classList.contains("hidden");

            const isLevelStartOpen =
                this.levelStartModal &&
                !this.levelStartModal.classList.contains("hidden");

            const isTutorialWaiting =
                this.tutorialActive &&
                this.tutorialMatchBox &&
                !this.tutorialMatchBox.classList.contains("hidden");

            if (!isPauseOpen && !isWinOpen && !isLevelStartOpen && !isTutorialWaiting) {
                this.lockBoard = false;
            }
        }

        /* =====================================================
           Pause
        ===================================================== */

        openPauseModal() {
            this.playButton();

            if (this.pauseLevelText) {
                this.pauseLevelText.textContent = String(this.level);
            }

            this.updatePauseSoundSwitch();
            this.updatePauseMusicSwitch();
            this.applyStoryModeUI();

            if (this.pauseModal) {
                this.pauseModal.classList.remove("hidden");
                this.pauseModal.setAttribute("aria-hidden", "false");
            }

            this.lockBoard = true;
        }

        closePauseModal() {
            this.playButton();

            if (this.pauseModal) {
                this.pauseModal.classList.add("hidden");
                this.pauseModal.setAttribute("aria-hidden", "true");
            }

            const isHowToOpen =
                this.howToModal &&
                !this.howToModal.classList.contains("hidden");

            const isWinOpen =
                this.winModal &&
                !this.winModal.classList.contains("hidden");

            const isLevelStartOpen =
                this.levelStartModal &&
                !this.levelStartModal.classList.contains("hidden");

            const isTutorialWaiting =
                this.tutorialActive &&
                this.tutorialMatchBox &&
                !this.tutorialMatchBox.classList.contains("hidden");

            if (!isHowToOpen && !isWinOpen && !isLevelStartOpen && !isTutorialWaiting) {
                this.lockBoard = false;
            }
        }

        /* =====================================================
           Sound + Music
        ===================================================== */

        setupBackgroundMusic() {
            if (this.bgmusic) return;

            this.bgmusic = new Audio(this.BG_MUSIC_SRC);
            this.bgmusic.loop = true;
            this.bgmusic.volume = 0.03;
            this.bgmusic.preload = "auto";
        }

        playBackgroundMusic() {
            this.setupBackgroundMusic();

            if (!this.bgmusic) return;

            if (this.musicMuted) {
                this.bgmusic.pause();
                return;
            }

            const playPromise = this.bgmusic.play();

            if (playPromise && typeof playPromise.catch === "function") {
                playPromise.catch(() => {
                    /*
                       Browser blocks autoplay until the user clicks/taps.
                       The pointerdown/click handlers will try again.
                    */
                });
            }
        }

        pauseBackgroundMusic() {
            if (this.bgmusic) {
                this.bgmusic.pause();
            }
        }

        updateBackgroundMusic() {
            if (this.musicMuted) {
                this.pauseBackgroundMusic();
            } else {
                this.playBackgroundMusic();
            }
        }

        toggleMute() {
            this.muted = !this.muted;

            localStorage.setItem(this.SOUND_KEY, this.muted ? "1" : "0");
            this.updateMuteButton();

            if (!this.muted) {
                this.playButton();
            }
        }

        toggleMusic() {
            this.musicMuted = !this.musicMuted;

            localStorage.setItem(this.MUSIC_KEY, this.musicMuted ? "1" : "0");
            this.updatePauseMusicSwitch();
            this.updateBackgroundMusic();

            this.playButton();
        }

        updateMuteButton() {
            if (this.btnMute) {
                this.btnMute.textContent = this.muted ? "🔇" : "🔊";
                this.btnMute.setAttribute("aria-label", this.muted ? "Sound off" : "Sound on");
                this.btnMute.setAttribute("aria-pressed", this.muted ? "true" : "false");
            }

            this.updatePauseSoundSwitch();
        }

        updatePauseSoundSwitch() {
            if (!this.pauseSoundToggle) return;

            const soundOn = !this.muted;

            this.pauseSoundToggle.classList.toggle("is-on", soundOn);
            this.pauseSoundToggle.setAttribute("aria-pressed", String(soundOn));
        }

        updatePauseMusicSwitch() {
            if (!this.pauseMusicToggle) return;

            const musicOn = !this.musicMuted;

            this.pauseMusicToggle.classList.toggle("is-on", musicOn);
            this.pauseMusicToggle.setAttribute("aria-pressed", String(musicOn));
        }

        getAudio() {
            if (this.muted) return null;

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
                    /* Browser may block audio before user interaction. */
                }
            }
        }

        tone(freq, duration, type, volume, delay) {
            const ctx = this.getAudio();

            if (!ctx) return;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            const startTime = ctx.currentTime + (delay || 0);
            const endTime = startTime + duration;

            osc.type = type || "sine";
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0.0001, startTime);
            gain.gain.exponentialRampToValueAtTime(volume || 0.03, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(endTime + 0.03);
        }

        playFlip() {
            this.tone(520, 0.06, "triangle", 0.025, 0);
        }

        playMatch() {
            this.tone(660, 0.08, "triangle", 0.03, 0);
            this.tone(880, 0.12, "triangle", 0.03, 0.08);
            this.tone(1100, 0.1, "triangle", 0.025, 0.16);
        }

        playWrong() {
            this.tone(180, 0.16, "sawtooth", 0.02, 0);
        }

        playWin() {
            this.tone(523, 0.08, "triangle", 0.03, 0);
            this.tone(659, 0.08, "triangle", 0.03, 0.08);
            this.tone(784, 0.12, "triangle", 0.03, 0.16);
            this.tone(1046, 0.16, "triangle", 0.035, 0.26);
        }

        playButton() {
            this.tone(430, 0.05, "square", 0.02, 0);
        }
    }

    document.addEventListener("DOMContentLoaded", function() {
        new MemoryCardsGame();
    });
})();