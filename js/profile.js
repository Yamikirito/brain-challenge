/* =========================================================
   Brain Challenge Arcade - profile.js
   Handles Profile page:
   - Set username
   - Show player stats (plays, achievements, best scores, story progress)
   - Reset profile / reset all data (optional)

   Expected IDs in profile.html:
   - usernameInput
   - btnSave, btnGuest, btnResetProfile, btnResetAll, btnRefresh
   - statName, statPlays, statAch
   - bestImage, bestMemory, bestMatch, storyProgress
   - msg   (a <p> message area)

   Storage keys:
   - bca_username
   - bca_totalPlays
   - bca_achievementsCount
   - bca_best_imageGuess
   - bca_best_memoryTest
   - bca_best_cardMatching
   - bca_story_progress
   - bca_achievements_unlocked
   - bca_story_state
   - bca_runs_imageGuess / bca_runs_memoryTest / bca_runs_cardMatching
   - settings keys (theme/sound/motion) if you reset all

   No optional chaining for maximum compatibility.
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

    function safeRemove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {}
    }

    function numOrDash(raw) {
        if (raw === null || raw === undefined || raw === "" || raw === "—") return "—";
        var n = Number(raw);
        return isFinite(n) ? String(n) : String(raw);
    }

    function showMsg(text, isError) {
        var el = $("msg");
        if (!el) return;
        el.textContent = text;
        el.classList.remove("hidden");
        el.style.color = isError ? "var(--danger, #c0392b)" : "var(--text, #111)";
    }

    function hideMsg() {
        var el = $("msg");
        if (!el) return;
        el.classList.add("hidden");
    }

    /* ---------------------------------------------------------
       Keys (consistent across site)
    --------------------------------------------------------- */
    var KEYS = {
        username: "bca_username",
        totalPlays: "bca_totalPlays",
        achievementsCount: "bca_achievementsCount",
        bestImage: "bca_best_imageGuess",
        bestMemory: "bca_best_memoryTest",
        bestMatch: "bca_best_cardMatching",
        storyProgress: "bca_story_progress",
        unlockedAchievements: "bca_achievements_unlocked",
        storyState: "bca_story_state",
        runsImage: "bca_runs_imageGuess",
        runsMemory: "bca_runs_memoryTest",
        runsMatch: "bca_runs_cardMatching",
        theme: "bca_theme",
        sound: "bca_sound",
        motion: "bca_motion"
    };

    /* ---------------------------------------------------------
       Load & render
    --------------------------------------------------------- */
    function loadUsernameToUI() {
        var name = safeGet(KEYS.username, "Guest");
        var input = $("usernameInput");
        if (input) input.value = (name === "Guest") ? "" : name;

        if ($("statName")) $("statName").textContent = name;
    }

    function refreshStats() {
        var name = safeGet(KEYS.username, "Guest");
        var plays = Number(safeGet(KEYS.totalPlays, "0")) || 0;
        var ach = Number(safeGet(KEYS.achievementsCount, "0")) || 0;

        if ($("statName")) $("statName").textContent = name;
        if ($("statPlays")) $("statPlays").textContent = String(plays);
        if ($("statAch")) $("statAch").textContent = String(ach);

        if ($("bestImage")) $("bestImage").textContent = numOrDash(safeGet(KEYS.bestImage, "—"));
        if ($("bestMemory")) $("bestMemory").textContent = numOrDash(safeGet(KEYS.bestMemory, "—"));
        if ($("bestMatch")) $("bestMatch").textContent = numOrDash(safeGet(KEYS.bestMatch, "—"));

        var sp = Number(safeGet(KEYS.storyProgress, "0")) || 0;
        if ($("storyProgress")) $("storyProgress").textContent = sp + "%";
    }

    /* ---------------------------------------------------------
       Actions
    --------------------------------------------------------- */
    function saveUsername() {
        var input = $("usernameInput");
        if (!input) return;

        var value = input.value.trim();

        if (value.length === 0) {
            safeSet(KEYS.username, "Guest");
            loadUsernameToUI();
            refreshStats();
            showMsg("Username set to Guest.");
            return;
        }

        // Validation: 2-20 chars, letters/numbers/space/_-
        var ok = /^[a-zA-Z0-9 _-]{2,20}$/.test(value);
        if (!ok) {
            showMsg("Use 2–20 characters: letters, numbers, spaces, _ or -.", true);
            return;
        }

        safeSet(KEYS.username, value);
        loadUsernameToUI();
        refreshStats();
        showMsg("Username saved!");
    }

    function useGuest() {
        safeSet(KEYS.username, "Guest");
        var input = $("usernameInput");
        if (input) input.value = "";
        loadUsernameToUI();
        refreshStats();
        showMsg("Using Guest.");
    }

    function resetProfileOnly() {
        var ok = confirm("Reset profile? (This sets username back to Guest. Scores remain.)");
        if (!ok) return;

        safeSet(KEYS.username, "Guest");

        var input = $("usernameInput");
        if (input) input.value = "";

        loadUsernameToUI();
        refreshStats();
        showMsg("Profile reset to Guest.");
    }

    function resetAllData() {
        var ok = confirm(
            "Reset ALL site data? This removes username, scores, run history, achievements, story progress, and settings. This cannot be undone."
        );
        if (!ok) return;

        // Remove keys belonging to the app
        safeRemove(KEYS.username);
        safeRemove(KEYS.totalPlays);
        safeRemove(KEYS.achievementsCount);
        safeRemove(KEYS.bestImage);
        safeRemove(KEYS.bestMemory);
        safeRemove(KEYS.bestMatch);
        safeRemove(KEYS.storyProgress);
        safeRemove(KEYS.unlockedAchievements);
        safeRemove(KEYS.storyState);
        safeRemove(KEYS.runsImage);
        safeRemove(KEYS.runsMemory);
        safeRemove(KEYS.runsMatch);
        safeRemove(KEYS.theme);
        safeRemove(KEYS.sound);
        safeRemove(KEYS.motion);

        // Put safe defaults back
        safeSet(KEYS.username, "Guest");
        safeSet(KEYS.totalPlays, "0");
        safeSet(KEYS.achievementsCount, "0");
        safeSet(KEYS.storyProgress, "0");
        safeSet(KEYS.theme, "system");
        safeSet(KEYS.sound, "on");
        safeSet(KEYS.motion, "off");

        hideMsg();
        loadUsernameToUI();
        refreshStats();
        showMsg("All site data reset.");
    }

    /* ---------------------------------------------------------
       Wire events
    --------------------------------------------------------- */
    function wire() {
        var btnSave = $("btnSave");
        if (btnSave && !btnSave._wired) {
            btnSave._wired = true;
            btnSave.addEventListener("click", saveUsername);
        }

        var btnGuest = $("btnGuest");
        if (btnGuest && !btnGuest._wired) {
            btnGuest._wired = true;
            btnGuest.addEventListener("click", useGuest);
        }

        var btnResetProfile = $("btnResetProfile");
        if (btnResetProfile && !btnResetProfile._wired) {
            btnResetProfile._wired = true;
            btnResetProfile.addEventListener("click", resetProfileOnly);
        }

        var btnResetAll = $("btnResetAll");
        if (btnResetAll && !btnResetAll._wired) {
            btnResetAll._wired = true;
            btnResetAll.addEventListener("click", resetAllData);
        }

        var btnRefresh = $("btnRefresh");
        if (btnRefresh && !btnRefresh._wired) {
            btnRefresh._wired = true;
            btnRefresh.addEventListener("click", function() {
                refreshStats();
                showMsg("Stats refreshed.");
                setTimeout(hideMsg, 1200);
            });
        }

        var input = $("usernameInput");
        if (input && !input._wired) {
            input._wired = true;
            input.addEventListener("keydown", function(e) {
                if (e.key === "Enter") saveUsername();
            });
        }
    }

    /* ---------------------------------------------------------
       Init
    --------------------------------------------------------- */
    document.addEventListener("DOMContentLoaded", function() {
        loadUsernameToUI();
        refreshStats();
        wire();
    });
})();