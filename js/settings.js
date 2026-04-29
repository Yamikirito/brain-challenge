/* =========================================================
   Brain Challenge Arcade - settings.js
   Settings page logic (theme, sound, reduced motion)

   
   Expected IDs in settings.html:
   - themeSelect
   - soundToggle, motionToggle
   - soundLabel, motionLabel
   - btnApply, btnResetSettings
   - msg (optional message area)

   Storage keys:
   - bca_theme          "system" | "light" | "dark"
   - bca_sound          "on" | "off"
   - bca_motion         "on" | "off"

   Notes:
   - No optional chaining for maximum compatibility.
   - Supports older browsers: matchMedia addListener fallback.
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

    function showMsg(text) {
        var el = $("msg");
        if (!el) return;
        el.textContent = text;
        el.classList.remove("hidden");
    }

    function hideMsg() {
        var el = $("msg");
        if (!el) return;
        el.classList.add("hidden");
    }

    /* ---------------------------------------------------------
       Storage Keys
    --------------------------------------------------------- */
    var KEYS = {
        theme: "bca_theme",
        sound: "bca_sound",
        motion: "bca_motion"
    };

    /* ---------------------------------------------------------
       Apply settings to <html> attributes (works with style.css)
    --------------------------------------------------------- */
    function applyTheme(theme) {
        document.documentElement.removeAttribute("data-theme");
        document.documentElement.removeAttribute("data-theme-forced");

        if (theme === "light" || theme === "dark") {
            document.documentElement.setAttribute("data-theme", theme);
            document.documentElement.setAttribute("data-theme-forced", "true");
            return;
        }

        // system
        var prefersDark = false;
        if (window.matchMedia) {
            prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        }
        document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
        document.documentElement.setAttribute("data-theme-forced", "false");
    }

    function applySound(isOn) {
        document.documentElement.setAttribute("data-sound", isOn ? "on" : "off");
    }

    function applyMotion(reduced) {
        document.documentElement.setAttribute("data-reduced-motion", reduced ? "true" : "false");
    }

    /* ---------------------------------------------------------
       Load saved settings into UI + apply
    --------------------------------------------------------- */
    function updateToggleLabels() {
        var s = $("soundToggle");
        var m = $("motionToggle");
        if ($("soundLabel") && s) $("soundLabel").textContent = s.checked ? "On" : "Off";
        if ($("motionLabel") && m) $("motionLabel").textContent = m.checked ? "On" : "Off";
    }

    function loadSettings() {
        var theme = safeGet(KEYS.theme, "system");
        var sound = safeGet(KEYS.sound, "on");
        var motion = safeGet(KEYS.motion, "off");

        var themeSelect = $("themeSelect");
        var soundToggle = $("soundToggle");
        var motionToggle = $("motionToggle");

        if (themeSelect) {
            themeSelect.value = (theme === "light" || theme === "dark" || theme === "system") ? theme : "system";
        }
        if (soundToggle) soundToggle.checked = sound !== "off";
        if (motionToggle) motionToggle.checked = motion === "on";

        updateToggleLabels();

        // Apply immediately
        applyTheme(themeSelect ? themeSelect.value : "system");
        applySound(soundToggle ? soundToggle.checked : true);
        applyMotion(motionToggle ? motionToggle.checked : false);
    }

    /* ---------------------------------------------------------
       Save settings
    --------------------------------------------------------- */
    function saveSettings() {
        var themeSelect = $("themeSelect");
        var soundToggle = $("soundToggle");
        var motionToggle = $("motionToggle");

        var theme = themeSelect ? themeSelect.value : "system";
        var sound = soundToggle && soundToggle.checked ? "on" : "off";
        var motion = motionToggle && motionToggle.checked ? "on" : "off";

        safeSet(KEYS.theme, theme);
        safeSet(KEYS.sound, sound);
        safeSet(KEYS.motion, motion);

        applyTheme(theme);
        applySound(sound === "on");
        applyMotion(motion === "on");

        showMsg("Settings saved and applied.");
        setTimeout(hideMsg, 1500);
    }

    /* ---------------------------------------------------------
       Reset settings
    --------------------------------------------------------- */
    function resetSettings() {
        var ok = confirm("Reset settings back to defaults? (Theme: System, Sound: On, Reduced motion: Off)");
        if (!ok) return;

        safeRemove(KEYS.theme);
        safeRemove(KEYS.sound);
        safeRemove(KEYS.motion);

        loadSettings();
        showMsg("Settings reset.");
        setTimeout(hideMsg, 1500);
    }

    /* ---------------------------------------------------------
       React to system theme changes when using "system"
    --------------------------------------------------------- */
    function watchSystemTheme() {
        if (!window.matchMedia) return;

        var mq = window.matchMedia("(prefers-color-scheme: dark)");

        function handler() {
            var theme = safeGet(KEYS.theme, "system");
            if (theme === "system") applyTheme("system");
        }

        if (mq.addEventListener) {
            mq.addEventListener("change", handler);
        } else if (mq.addListener) {
            mq.addListener(handler); // older browsers
        }
    }

    /* ---------------------------------------------------------
       Wire UI events
    --------------------------------------------------------- */
    function wireEvents() {
        var btnApply = $("btnApply");
        if (btnApply && !btnApply._wired) {
            btnApply._wired = true;
            btnApply.addEventListener("click", saveSettings);
        }

        var btnReset = $("btnResetSettings");
        if (btnReset && !btnReset._wired) {
            btnReset._wired = true;
            btnReset.addEventListener("click", resetSettings);
        }

        var soundToggle = $("soundToggle");
        if (soundToggle && !soundToggle._wired) {
            soundToggle._wired = true;
            soundToggle.addEventListener("change", function() {
                updateToggleLabels();
                applySound(soundToggle.checked);
                safeSet(KEYS.sound, soundToggle.checked ? "on" : "off");
            });
        }

        var motionToggle = $("motionToggle");
        if (motionToggle && !motionToggle._wired) {
            motionToggle._wired = true;
            motionToggle.addEventListener("change", function() {
                updateToggleLabels();
                applyMotion(motionToggle.checked);
                safeSet(KEYS.motion, motionToggle.checked ? "on" : "off");
            });
        }

        var themeSelect = $("themeSelect");
        if (themeSelect && !themeSelect._wired) {
            themeSelect._wired = true;
            themeSelect.addEventListener("change", function() {
                applyTheme(themeSelect.value);
                safeSet(KEYS.theme, themeSelect.value);
            });
        }
    }

    /* ---------------------------------------------------------
       Init
    --------------------------------------------------------- */
    document.addEventListener("DOMContentLoaded", function() {
        loadSettings();
        wireEvents();
        watchSystemTheme();
    });
})();