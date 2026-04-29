/* =========================================================
   Brain Challenge Arcade - achievements.js
   Achievements system (unlock badges automatically)

   Works with:
   - achievements.html (renders badges + progress)
   - leaderboard / games (reads best scores saved in localStorage)

   Storage Keys used (same as site):
   - bca_username
   - bca_best_imageGuess
   - bca_best_memoryTest
   - bca_best_cardMatching
   - bca_story_progress
   - bca_achievements_unlocked   -> { [id]: "YYYY-MM-DD" }
   - bca_achievementsCount       -> number (string)

   NOTE:
   - Uses NO optional chaining for maximum compatibility.
   ========================================================= */

(function() {
    "use strict";

    /* ---------------------------------------------------------
       Helpers
    --------------------------------------------------------- */
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

    function isoToday() {
        var d = new Date();
        var yyyy = d.getFullYear();
        var mm = String(d.getMonth() + 1).padStart(2, "0");
        var dd = String(d.getDate()).padStart(2, "0");
        return yyyy + "-" + mm + "-" + dd;
    }

    function toNumberOrNull(x) {
        var n = Number(x);
        return isFinite(n) ? n : null;
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /* ---------------------------------------------------------
       Keys
    --------------------------------------------------------- */
    var KEYS = {
        username: "bca_username",
        bestImage: "bca_best_imageGuess",
        bestMemory: "bca_best_memoryTest",
        bestMatch: "bca_best_cardMatching",
        storyProgress: "bca_story_progress",
        unlocked: "bca_achievements_unlocked",
        count: "bca_achievementsCount"
    };

    /* ---------------------------------------------------------
       Read score state
    --------------------------------------------------------- */
    function getState() {
        return {
            username: safeGet(KEYS.username, "Guest"),
            imageGuess: toNumberOrNull(safeGet(KEYS.bestImage, "")),
            memoryTest: toNumberOrNull(safeGet(KEYS.bestMemory, "")),
            cardMatching: toNumberOrNull(safeGet(KEYS.bestMatch, "")),
            storyProgress: toNumberOrNull(safeGet(KEYS.storyProgress, "0")) || 0
        };
    }

    /* ---------------------------------------------------------
       Achievements definition
       (Simple + clear + achievable)
       - Default assumes "higher is better" for best values.
       - If your Card Matching uses "lower time is better", you can
         change the checks for those achievements easily.
    --------------------------------------------------------- */
    var ACHIEVEMENTS = [{
            id: "first_play",
            title: "First Steps",
            icon: "👣",
            desc: "Play any game at least once (a best score exists).",
            hint: "Finish any game one time.",
            check: function(s) {
                return s.imageGuess !== null || s.memoryTest !== null || s.cardMatching !== null;
            }
        },
        {
            id: "image_5",
            title: "Sharp Eyes",
            icon: "🖼️",
            desc: "Reach a best score of 5+ in Image Guess.",
            hint: "Get 5 or more in Image Guess.",
            check: function(s) {
                return s.imageGuess !== null && s.imageGuess >= 5;
            }
        },
        {
            id: "image_10",
            title: "Eagle Vision",
            icon: "🦅",
            desc: "Reach a best score of 10+ in Image Guess.",
            hint: "Get 10 or more in Image Guess.",
            check: function(s) {
                return s.imageGuess !== null && s.imageGuess >= 10;
            }
        },
        {
            id: "memory_3",
            title: "Pattern Starter",
            icon: "🧠",
            desc: "Reach best level/score 3+ in Memory Test.",
            hint: "Reach level 3 in Memory Test.",
            check: function(s) {
                return s.memoryTest !== null && s.memoryTest >= 3;
            }
        },
        {
            id: "memory_6",
            title: "Mind Builder",
            icon: "🏗️",
            desc: "Reach best level/score 6+ in Memory Test.",
            hint: "Reach level 6 in Memory Test.",
            check: function(s) {
                return s.memoryTest !== null && s.memoryTest >= 6;
            }
        },
        {
            id: "match_complete",
            title: "Match Maker",
            icon: "🃏",
            desc: "Complete Card Matching at least once (a best value exists).",
            hint: "Finish one Card Matching game.",
            check: function(s) {
                return s.cardMatching !== null;
            }
        },
        {
            id: "story_33",
            title: "Story Explorer",
            icon: "📖",
            desc: "Reach at least 33% Story progress.",
            hint: "Complete the first story section.",
            check: function(s) {
                return s.storyProgress >= 33;
            }
        },
        {
            id: "story_100",
            title: "Escape Artist",
            icon: "🚪",
            desc: "Finish Story Mode (100%).",
            hint: "Complete all story chapters.",
            check: function(s) {
                return s.storyProgress >= 100;
            }
        }
    ];

    /* ---------------------------------------------------------
       Unlock store
    --------------------------------------------------------- */
    function loadUnlocked() {
        var obj = safeJsonGet(KEYS.unlocked, {});
        if (!obj || typeof obj !== "object") return {};
        return obj;
    }

    function saveUnlocked(obj) {
        safeJsonSet(KEYS.unlocked, obj);
    }

    function setCount(n) {
        safeSet(KEYS.count, String(n));
    }

    /* ---------------------------------------------------------
       Evaluate new unlocks
    --------------------------------------------------------- */
    function evaluate() {
        var state = getState();
        var unlocked = loadUnlocked();
        var today = isoToday();
        var changed = false;

        for (var i = 0; i < ACHIEVEMENTS.length; i++) {
            var a = ACHIEVEMENTS[i];
            if (!unlocked[a.id] && a.check(state)) {
                unlocked[a.id] = today;
                changed = true;
            }
        }

        if (changed) saveUnlocked(unlocked);

        // update count
        var count = 0;
        for (var k in unlocked) {
            if (Object.prototype.hasOwnProperty.call(unlocked, k) && unlocked[k]) count++;
        }
        setCount(count);

        return { state: state, unlocked: unlocked, unlockedCount: count, total: ACHIEVEMENTS.length };
    }

    /* ---------------------------------------------------------
       Render (only if achievements.html elements exist)
    --------------------------------------------------------- */
    function badgeHTML(a, date) {
        var locked = !date;
        var cardClass = locked ? "achievement-card achievement-locked" : "achievement-card achievement-unlocked";
        var statusIcon = locked ? "🔒" : "✅";

        return (
            '<article class="card ' + cardClass + '" data-achievement="' + escapeHtml(a.id) + '">' +
            '<header class="achievement-head">' +
            '<div class="achievement-icon" aria-hidden="true">' + escapeHtml(a.icon) + "</div>" +
            "<div>" +
            '<h3 class="card-title" style="margin:0;">' + escapeHtml(a.title) + "</h3>" +
            '<div class="muted" style="font-size:0.95em;">' + (locked ? "Locked" : "Unlocked") + "</div>" +
            "</div>" +
            '<span class="badge" aria-label="' + (locked ? "Locked" : "Unlocked") + '">' + statusIcon + "</span>" +
            "</header>" +
            '<div class="card-body">' +
            "<p style='margin:0 0 10px 0;'>" + escapeHtml(a.desc) + "</p>" +
            "<p class='muted' style='margin:0;'>" +
            (locked ? "Hint: " + escapeHtml(a.hint) : "Unlocked on: " + escapeHtml(date)) +
            "</p>" +
            "</div>" +
            '<div class="card-footer">' +
            (locked ?
                '<a class="btn btn-small btn-secondary" href="index.html">Play games</a>' :
                '<a class="btn btn-small btn-secondary" href="leaderboard.html">View scores</a>') +
            "</div>" +
            "</article>"
        );
    }

    function updateProgressUI(info) {
        var pct = info.total === 0 ? 0 : Math.round((info.unlockedCount / info.total) * 100);

        if ($("playerName")) $("playerName").textContent = info.state.username;
        if ($("unlockedCount")) $("unlockedCount").textContent = String(info.unlockedCount);
        if ($("totalCount")) $("totalCount").textContent = String(info.total);

        var fill = $("progressFill");
        if (fill) fill.style.width = pct + "%";

        var pb = document.querySelector(".progressbar");
        if (pb) pb.setAttribute("aria-valuenow", String(pct));

        var msg = $("progressMsg");
        if (msg) {
            msg.textContent =
                info.unlockedCount === 0 ?
                "No badges unlocked yet. Play a game to get started!" :
                info.unlockedCount === info.total ?
                "Amazing! You unlocked all badges 🎉" :
                "Keep going — you’re making progress!";
        }
    }

    function renderAchievementsPage(info) {
        var grid = $("badgeGrid");
        if (!grid) return; // not on achievements page

        var html = "";
        for (var i = 0; i < ACHIEVEMENTS.length; i++) {
            var a = ACHIEVEMENTS[i];
            html += badgeHTML(a, info.unlocked[a.id]);
        }
        grid.innerHTML = html;

        updateProgressUI(info);

        // Buttons (if present)
        var recheck = $("btnRecheck");
        if (recheck && !recheck._wired) {
            recheck._wired = true;
            recheck.addEventListener("click", function() {
                var updated = evaluate();
                renderAchievementsPage(updated);
            });
        }

        var resetBtn = $("btnResetAchievements");
        if (resetBtn && !resetBtn._wired) {
            resetBtn._wired = true;
            resetBtn.addEventListener("click", function() {
                var ok = window.confirm("Reset achievements? (This will NOT delete your best scores.)");
                if (!ok) return;

                try {
                    localStorage.removeItem(KEYS.unlocked);
                    localStorage.setItem(KEYS.count, "0");
                } catch (e) {}

                var updated = evaluate();
                renderAchievementsPage(updated);
            });
        }
    }

    /* ---------------------------------------------------------
       Public API for games:
         Achievements.checkNow()
         Achievements.unlockCount()
    --------------------------------------------------------- */
    var AchievementsAPI = {
        checkNow: function() {
            return evaluate();
        },
        unlockCount: function() {
            return Number(safeGet(KEYS.count, "0")) || 0;
        }
    };

    window.BCAAchievements = AchievementsAPI;

    /* ---------------------------------------------------------
       Auto-run on DOM ready:
       - Always evaluate (keeps count updated)
       - Render if achievements page is open
    --------------------------------------------------------- */
    document.addEventListener("DOMContentLoaded", function() {
        var info = evaluate();
        renderAchievementsPage(info);
    });
})();