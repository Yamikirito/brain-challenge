/* =========================================================
   Brain Challenge Arcade - leaderboard.js
   Local leaderboard (best + recent runs) using localStorage

   Works with:
   - leaderboard.html (renders tables)
   - Games save runs via localStorage keys:
       bca_runs_imageGuess
       bca_runs_memoryTest
       bca_runs_cardMatching

   Also reads:
   - bca_username
   - bca_best_imageGuess
   - bca_best_memoryTest
   - bca_best_cardMatching
   - bca_story_progress
   - bca_totalPlays
   - bca_achievementsCount

   
   This file uses NO optional chaining for maximum compatibility.
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

    function parseISODate(s) {
        // "YYYY-MM-DD" or ISO string -> Date
        var d = new Date(s);
        if (isNaN(d.getTime())) return null;
        return d;
    }

    function dateLabel(s) {
        var d = parseISODate(s);
        if (!d) return escapeHtml(String(s));
        return d.toISOString().slice(0, 10);
    }

    /* ---------------------------------------------------------
       Keys
    --------------------------------------------------------- */
    var KEYS = {
        username: "bca_username",
        totalPlays: "bca_totalPlays",
        achievementsCount: "bca_achievementsCount",
        storyProgress: "bca_story_progress",

        bestImage: "bca_best_imageGuess",
        bestMemory: "bca_best_memoryTest",
        bestMatch: "bca_best_cardMatching",

        runsImage: "bca_runs_imageGuess",
        runsMemory: "bca_runs_memoryTest",
        runsMatch: "bca_runs_cardMatching"
    };

    /* ---------------------------------------------------------
       Config
       - If your Card Matching best is "time" (lower is better),
         set MATCH_LOWER_IS_BETTER = true.
       - If your Card Matching best is "score" (higher is better),
         set it to false.
    --------------------------------------------------------- */
    var MATCH_LOWER_IS_BETTER = false;

    /* ---------------------------------------------------------
       Read runs
    --------------------------------------------------------- */
    function normalizeRuns(arr) {
        if (!Array.isArray(arr)) return [];
        var out = [];
        for (var i = 0; i < arr.length; i++) {
            var r = arr[i];
            if (!r) continue;
            out.push({
                name: typeof r.name === "string" ? r.name : safeGet(KEYS.username, "Guest"),
                value: toNumberOrNull(r.value),
                date: typeof r.date === "string" ? r.date : ""
            });
        }
        return out.filter(function(r2) {
            return r2.value !== null;
        });
    }

    function getRuns(gameKey) {
        var raw;
        if (gameKey === "imageGuess") raw = safeJsonGet(KEYS.runsImage, []);
        else if (gameKey === "memoryTest") raw = safeJsonGet(KEYS.runsMemory, []);
        else if (gameKey === "cardMatching") raw = safeJsonGet(KEYS.runsMatch, []);
        else raw = [];
        return normalizeRuns(raw);
    }

    /* ---------------------------------------------------------
       Compute best table data (top N)
    --------------------------------------------------------- */
    function bestOfRuns(runs, topN, lowerIsBetter) {
        var sorted = runs.slice().sort(function(a, b) {
            if (lowerIsBetter) return a.value - b.value;
            return b.value - a.value;
        });

        // Keep top N
        if (typeof topN === "number" && topN > 0) {
            sorted = sorted.slice(0, topN);
        }
        return sorted;
    }

    /* ---------------------------------------------------------
       Compute recent table data (latest N)
    --------------------------------------------------------- */
    function recentRuns(runs, topN) {
        var sorted = runs.slice().sort(function(a, b) {
            var da = parseISODate(a.date) || new Date(0);
            var db = parseISODate(b.date) || new Date(0);
            return db.getTime() - da.getTime();
        });

        if (typeof topN === "number" && topN > 0) {
            sorted = sorted.slice(0, topN);
        }
        return sorted;
    }

    /* ---------------------------------------------------------
       Render a table body
       Expects these IDs in leaderboard.html:
         - imageBestBody, imageRecentBody
         - memoryBestBody, memoryRecentBody
         - matchBestBody, matchRecentBody
    --------------------------------------------------------- */
    function renderRows(tbodyId, rows, lowerIsBetter) {
        var tbody = $(tbodyId);
        if (!tbody) return;

        if (!rows || rows.length === 0) {
            tbody.innerHTML =
                '<tr class="leaderboard-row">' +
                '<td class="rank">—</td>' +
                '<td class="muted">No scores yet</td>' +
                '<td class="muted">—</td>' +
                '<td class="muted">Play a game!</td>' +
                "</tr>";
            return;
        }

        var html = "";
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            var rank = i + 1;
            var valText = (r.value === null) ? "—" : String(r.value);
            html +=
                '<tr class="leaderboard-row">' +
                '<td class="rank">' + rank + "</td>" +
                "<td>" + escapeHtml(r.name) + "</td>" +
                "<td>" + escapeHtml(valText) + "</td>" +
                "<td class='muted'>" + escapeHtml(dateLabel(r.date || "")) + "</td>" +
                "</tr>";
        }
        tbody.innerHTML = html;
    }

    /* ---------------------------------------------------------
       Render page header stats (optional)
       If these IDs exist:
         - lbPlayer, lbPlays, lbAch, lbStory
         - lbBestImage, lbBestMemory, lbBestMatch
    --------------------------------------------------------- */
    function renderHeaderStats() {
        var name = safeGet(KEYS.username, "Guest");
        var plays = Number(safeGet(KEYS.totalPlays, "0")) || 0;
        var ach = Number(safeGet(KEYS.achievementsCount, "0")) || 0;
        var story = Number(safeGet(KEYS.storyProgress, "0")) || 0;

        var bestImage = safeGet(KEYS.bestImage, "—");
        var bestMemory = safeGet(KEYS.bestMemory, "—");
        var bestMatch = safeGet(KEYS.bestMatch, "—");

        if ($("lbPlayer")) $("lbPlayer").textContent = name;
        if ($("lbPlays")) $("lbPlays").textContent = String(plays);
        if ($("lbAch")) $("lbAch").textContent = String(ach);
        if ($("lbStory")) $("lbStory").textContent = story + "%";

        if ($("lbBestImage")) $("lbBestImage").textContent = bestImage === "" ? "—" : String(bestImage);
        if ($("lbBestMemory")) $("lbBestMemory").textContent = bestMemory === "" ? "—" : String(bestMemory);
        if ($("lbBestMatch")) $("lbBestMatch").textContent = bestMatch === "" ? "—" : String(bestMatch);
    }

    /* ---------------------------------------------------------
       Clear leaderboard data buttons (optional)
       If these IDs exist:
         - btnClearImage, btnClearMemory, btnClearMatch, btnClearAllRuns
    --------------------------------------------------------- */
    function wireClearButtons() {
        var btn1 = $("btnClearImage");
        if (btn1 && !btn1._wired) {
            btn1._wired = true;
            btn1.addEventListener("click", function() {
                if (!confirm("Clear Image Guess run history?")) return;
                localStorage.removeItem(KEYS.runsImage);
                renderAll();
            });
        }

        var btn2 = $("btnClearMemory");
        if (btn2 && !btn2._wired) {
            btn2._wired = true;
            btn2.addEventListener("click", function() {
                if (!confirm("Clear Memory Test run history?")) return;
                localStorage.removeItem(KEYS.runsMemory);
                renderAll();
            });
        }

        var btn3 = $("btnClearMatch");
        if (btn3 && !btn3._wired) {
            btn3._wired = true;
            btn3.addEventListener("click", function() {
                if (!confirm("Clear Card Matching run history?")) return;
                localStorage.removeItem(KEYS.runsMatch);
                renderAll();
            });
        }

        var btnAll = $("btnClearAllRuns");
        if (btnAll && !btnAll._wired) {
            btnAll._wired = true;
            btnAll.addEventListener("click", function() {
                if (!confirm("Clear ALL run history for all games?")) return;
                localStorage.removeItem(KEYS.runsImage);
                localStorage.removeItem(KEYS.runsMemory);
                localStorage.removeItem(KEYS.runsMatch);
                renderAll();
            });
        }
    }

    /* ---------------------------------------------------------
       Render everything
    --------------------------------------------------------- */
    function renderAll() {
        renderHeaderStats();

        // Image Guess
        var imgRuns = getRuns("imageGuess");
        renderRows("imageBestBody", bestOfRuns(imgRuns, 10, false), false);
        renderRows("imageRecentBody", recentRuns(imgRuns, 10), false);

        // Memory Test
        var memRuns = getRuns("memoryTest");
        renderRows("memoryBestBody", bestOfRuns(memRuns, 10, false), false);
        renderRows("memoryRecentBody", recentRuns(memRuns, 10), false);

        // Card Matching
        var matchRuns = getRuns("cardMatching");
        renderRows("matchBestBody", bestOfRuns(matchRuns, 10, MATCH_LOWER_IS_BETTER), MATCH_LOWER_IS_BETTER);
        renderRows("matchRecentBody", recentRuns(matchRuns, 10), MATCH_LOWER_IS_BETTER);
    }

    /* ---------------------------------------------------------
       Expose small API (optional)
       Useful if games want to push run entries consistently.
    --------------------------------------------------------- */
    function addRun(gameKey, value) {
        var key =
            gameKey === "imageGuess" ? KEYS.runsImage :
            gameKey === "memoryTest" ? KEYS.runsMemory :
            gameKey === "cardMatching" ? KEYS.runsMatch :
            null;
        if (!key) return;

        var runs = safeJsonGet(key, []);
        if (!Array.isArray(runs)) runs = [];

        runs.push({
            name: safeGet(KEYS.username, "Guest"),
            value: Number(value),
            date: new Date().toISOString().slice(0, 10)
        });

        safeJsonSet(key, runs);
    }

    window.BCALeaderboard = {
        addRun: addRun,
        render: renderAll
    };

    /* ---------------------------------------------------------
       Auto-run on DOM ready
    --------------------------------------------------------- */
    document.addEventListener("DOMContentLoaded", function() {
        renderAll();
        wireClearButtons();

        // Optional refresh button if present
        var btnRefresh = $("btnRefreshLeaderboard");
        if (btnRefresh && !btnRefresh._wired) {
            btnRefresh._wired = true;
            btnRefresh.addEventListener("click", function() {
                renderAll();
            });
        }
    });
})();