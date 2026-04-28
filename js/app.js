/* =========================================================
   Brain Challenge Arcade - app.js
   Global application logic (loaded on root pages only)

   - Initialize defaults
   - Apply saved settings (theme/sound/motion)
   - Sync header badges (story/achievements)
   - Mobile menu improvements
   - Global website click sound (Web Audio API)
   - Expose small global helpers
========================================================= */

(function() {
    "use strict";

    /* ---------------------------------------------------------
       Safe localStorage helpers
    --------------------------------------------------------- */
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
       Click Sound (Web Audio API)
    --------------------------------------------------------- */
    var audioCtx = null;

    function isSoundEnabled() {
        return safeGet(KEYS.sound, "on") !== "off";
    }

    function getAudioContext() {
        if (!window.AudioContext && !window.webkitAudioContext) return null;

        if (!audioCtx) {
            var Ctx = window.AudioContext || window.webkitAudioContext;
            audioCtx = new Ctx();
        }

        return audioCtx;
    }

    function unlockAudioContext() {
        var ctx = getAudioContext();
        if (!ctx) return;

        if (ctx.state === "suspended") {
            ctx.resume().catch(function() {});
        }
    }

    function playClickSound() {
        if (!isSoundEnabled()) return;

        var ctx = getAudioContext();
        if (!ctx) return;

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
        if (!target) return false;

        var clickable = target.closest(
            "button, a, [role='button'], input[type='button'], input[type='submit'], input[type='reset'], .btn, .button, .btn-arcade, .play, .icon-btn, .nav-link"
        );

        if (!clickable) return false;
        if (clickable.disabled) return false;
        if (clickable.getAttribute("aria-disabled") === "true") return false;

        return true;
    }

    function initGlobalClickSound() {
        document.addEventListener("pointerdown", function(e) {
            unlockAudioContext();

            if (shouldPlayClickSound(e.target)) {
                playClickSound();
            }
        }, true);

        document.addEventListener("keydown", function(e) {
            if (e.key !== "Enter" && e.key !== " ") return;

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
        if (safeGet(KEYS.username, null) === null) safeSet(KEYS.username, "Guest");
        if (safeGet(KEYS.totalPlays, null) === null) safeSet(KEYS.totalPlays, "0");
        if (safeGet(KEYS.achievementsCount, null) === null) safeSet(KEYS.achievementsCount, "0");
        if (safeGet(KEYS.storyProgress, null) === null) safeSet(KEYS.storyProgress, "0");
        if (safeGet(KEYS.theme, null) === null) safeSet(KEYS.theme, "system");
        if (safeGet(KEYS.sound, null) === null) safeSet(KEYS.sound, "on");
        if (safeGet(KEYS.reducedMotion, null) === null) safeSet(KEYS.reducedMotion, "off");
    }

    /* ---------------------------------------------------------
       Theme / Motion / Sound
    --------------------------------------------------------- */
    function applyTheme(theme) {
        document.documentElement.removeAttribute("data-theme");

        if (theme === "light" || theme === "dark") {
            document.documentElement.setAttribute("data-theme", theme);
            return;
        }

        var prefersDark = false;
        if (window.matchMedia) {
            prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        }
        document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
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
        if (storyBadge) storyBadge.textContent = story + "%";

        var achBadge = document.getElementById("achBadge");
        if (achBadge) achBadge.textContent = String(ach);
    }

    /* ---------------------------------------------------------
       Auto highlight current nav link
    --------------------------------------------------------- */
    function highlightActiveNav() {
        var links = document.querySelectorAll(".nav-link");
        var path = location.pathname.split("/").pop() || "index.html";

        links.forEach(function(link) {
            var href = link.getAttribute("href");
            if (href && href === path) {
                link.classList.add("nav-active");
            }
        });
    }

    /* ---------------------------------------------------------
       Mobile menu auto-close on link click
    --------------------------------------------------------- */
    function enhanceMobileMenu() {
        var menu = document.getElementById("mobileMenu");
        if (!menu) return;

        menu.querySelectorAll("a").forEach(function(a) {
            a.addEventListener("click", function() {
                menu.classList.add("hidden");
            });
        });
    }

    /* ---------------------------------------------------------
       Toast helper
    --------------------------------------------------------- */
    function showToast(message, timeout) {
        if (timeout === undefined) timeout = 1600;

        var toast = document.getElementById("bcaToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "bcaToast";
            toast.className = "toast";
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
       Expose API
    --------------------------------------------------------- */
    function exposeGlobalAPI() {
        window.BCA = {
            incrementPlay: incrementTotalPlays,
            getUsername: function() {
                return safeGet(KEYS.username, "Guest");
            },
            getSoundEnabled: function() {
                return isSoundEnabled();
            },
            showToast: showToast,
            playClickSound: playClickSound
        };
    }

    /* ---------------------------------------------------------
       Init
    --------------------------------------------------------- */
    document.addEventListener("DOMContentLoaded", function() {
        initDefaults();
        initSettings();
        updateHeaderBadges();
        highlightActiveNav();
        enhanceMobileMenu();
        initGlobalClickSound();
        exposeGlobalAPI();
    });
})();