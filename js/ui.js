/* =========================================================
   Brain Challenge Arcade - ui.js
   Reusable UI helpers for ALL pages & games

   
   Includes:
   - Toast notifications
   - Modal helpers
   - Safe query helpers
   - Format utilities
   - Sound helper (respects Settings)
   - ✅ Story/Test helpers (for 7-test story campaign)

   Story/Test System (universal):
   - Games launched as:  ?story=1&test=test1_open_letter&return=../../story.html?from=test1_open_letter
   - On win, games call:
       BCAUI.passStoryTest()   // uses test from URL
     and then show:
       BCAUI.createReturnToStoryButton(...)
   ========================================================= */

(function() {
    "use strict";

    /* ---------------------------------------------------------
       DOM Helpers
    --------------------------------------------------------- */
    function $(sel, root) {
        if (!root) root = document;
        return root.querySelector(sel);
    }

    function $all(sel, root) {
        if (!root) root = document;
        return Array.prototype.slice.call(root.querySelectorAll(sel));
    }

    function clamp(n, min, max) {
        return Math.max(min, Math.min(max, n));
    }

    /* ---------------------------------------------------------
       Safe Storage
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
       Query Helpers
    --------------------------------------------------------- */
    function getQueryParam(name) {
        var qs = window.location.search || "";
        if (!qs) return "";
        qs = qs.replace(/^\?/, "");
        var parts = qs.split("&");
        for (var i = 0; i < parts.length; i++) {
            var kv = parts[i].split("=");
            var k = decodeURIComponent(kv[0] || "");
            if (k === name) return decodeURIComponent(kv[1] || "");
        }
        return "";
    }

    function isStoryMode() {
        var story = getQueryParam("story");
        var mode = (getQueryParam("mode") || "").toLowerCase();
        return story === "1" || mode === "story";
    }

    function safeTestId(raw) {
        raw = String(raw || "").trim().toLowerCase();
        if (!raw) return "";
        raw = raw.replace(/\s+/g, "_");
        raw = raw.replace(/[^a-z0-9_-]/g, "");
        return raw;
    }

    function getStoryTestId() {
        return safeTestId(getQueryParam("test"));
    }

    function getReturnUrl(fallbackUrl) {
        var r = getQueryParam("return");
        if (r) return r;
        return fallbackUrl || "../../story.html";
    }

    /* ---------------------------------------------------------
       Date/Format
    --------------------------------------------------------- */
    function formatDateISO(d) {
        if (!d) d = new Date();
        var yyyy = d.getFullYear();
        var mm = String(d.getMonth() + 1).padStart(2, "0");
        var dd = String(d.getDate()).padStart(2, "0");
        return yyyy + "-" + mm + "-" + dd;
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
       Toast
       Requires components.css .toast / .toast-show
    --------------------------------------------------------- */
    function toast(message, timeout) {
        if (timeout === undefined) timeout = 1600;

        var el = document.getElementById("bcaToast");
        if (!el) {
            el = document.createElement("div");
            el.id = "bcaToast";
            el.className = "toast";
            document.body.appendChild(el);
        }

        el.textContent = message;
        el.classList.add("toast-show");

        window.clearTimeout(el._t);
        el._t = window.setTimeout(function() {
            el.classList.remove("toast-show");
        }, timeout);
    }

    /* ---------------------------------------------------------
       Modal
       Requires components.css .modal-backdrop/.modal...
   --------------------------------------------------------- */
    function openModal(id) {
        var backdrop = document.getElementById(id);
        if (!backdrop) return;

        backdrop.classList.remove("hidden");

        // focus first focusable element
        var focusable = backdrop.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable) focusable.focus();

        // close on backdrop click
        var onClick = function(e) {
            if (e.target === backdrop) closeModal(id);
        };
        backdrop._onClick = onClick;
        backdrop.addEventListener("click", onClick);

        // close on Esc
        var onKey = function(e) {
            if (e.key === "Escape") closeModal(id);
        };
        backdrop._onKey = onKey;
        document.addEventListener("keydown", onKey);
    }

    function closeModal(id) {
        var backdrop = document.getElementById(id);
        if (!backdrop) return;

        backdrop.classList.add("hidden");

        if (backdrop._onClick) backdrop.removeEventListener("click", backdrop._onClick);
        if (backdrop._onKey) document.removeEventListener("keydown", backdrop._onKey);

        backdrop._onClick = null;
        backdrop._onKey = null;
    }

    function openModalFromHTML(html, opts) {
        opts = opts || {};
        var id = opts.id || "bcaDynamicModal";

        var existing = document.getElementById(id);
        if (existing) existing.remove();

        var wrap = document.createElement("div");
        wrap.id = id;
        wrap.className = "modal-backdrop";
        wrap.innerHTML = html;
        document.body.appendChild(wrap);

        openModal(id);
        return id;
    }

    /* ---------------------------------------------------------
       Sound (respects bca_sound setting)
   --------------------------------------------------------- */
    var SOUND_KEY = "bca_sound"; // "on" | "off"

    function soundEnabled() {
        return safeGet(SOUND_KEY, "on") !== "off";
    }

    function playSound(src, volume) {
        if (volume === undefined) volume = 0.5;
        if (!soundEnabled()) return;

        try {
            var a = new Audio(src);
            a.volume = clamp(volume, 0, 1);
            a.play().catch(function() {});
        } catch (e) {}
    }

    /* ---------------------------------------------------------
       Confirm modal helper
   --------------------------------------------------------- */
    function confirmDialog(opts) {
        opts = opts || {};
        var title = opts.title || "Confirm";
        var message = opts.message || "Are you sure?";
        var okText = opts.okText || "OK";
        var cancelText = opts.cancelText || "Cancel";

        return new Promise(function(resolve) {
            var modalId = openModalFromHTML(
                "" +
                '<div class="modal" role="dialog" aria-modal="true" aria-label="' + escapeHtml(title) + '">' +
                '  <div class="modal-head">' +
                '    <h2 class="modal-title">' + escapeHtml(title) + "</h2>" +
                '    <button class="icon-btn" id="bcaModalClose" type="button" aria-label="Close">✕</button>' +
                "  </div>" +
                '  <div class="modal-body">' + escapeHtml(message) + "</div>" +
                '  <div class="modal-foot">' +
                '    <button class="btn btn-secondary" id="bcaCancel" type="button">' + escapeHtml(cancelText) + "</button>" +
                '    <button class="btn btn-primary" id="bcaOk" type="button">' + escapeHtml(okText) + "</button>" +
                "  </div>" +
                "</div>", { id: "bcaDynamicModal" }
            );

            function close(val) {
                closeModal(modalId);
                var modalEl = document.getElementById(modalId);
                if (modalEl) modalEl.remove();
                resolve(val);
            }

            var closeBtn = $("#bcaModalClose");
            if (closeBtn) closeBtn.addEventListener("click", function() { close(false); });

            var cancelBtn = $("#bcaCancel");
            if (cancelBtn) cancelBtn.addEventListener("click", function() { close(false); });

            var okBtn = $("#bcaOk");
            if (okBtn) okBtn.addEventListener("click", function() { close(true); });
        });
    }

    /* =========================================================
       ✅ STORY / TEST HELPERS
       Matches your requirement:
       "We have 7 tests. All tests use brain game test, then story continues."
       These helpers let EVERY game behave the same way.
       ========================================================= */

    function storyTestKey(testId) {
        return "bca_story_test_" + safeTestId(testId);
    }

    function hasPassedStoryTest(testId) {
        var id = safeTestId(testId);
        if (!id) return false;
        return safeGet(storyTestKey(id), "0") === "1";
    }

    function passStoryTest(testId) {
        var id = safeTestId(testId || getStoryTestId());
        if (!id) return "";
        safeSet(storyTestKey(id), "1");
        safeSet("bca_story_last_test", id);
        return id;
    }

    function createReturnToStoryButton(opts) {
        // opts:
        //  - container: element or selector (default: document.body)
        //  - text: button label
        //  - url: return url (default: query return or ../../story.html?from=<test>)
        //  - className: extra classes
        opts = opts || {};

        var container = opts.container;
        if (typeof container === "string") container = $(container);
        if (!container) container = document.body;

        var label = opts.text || "Return to Story";
        var testId = safeTestId(opts.testId || getStoryTestId());

        var url = opts.url || getReturnUrl("../../story.html" + (testId ? ("?from=" + encodeURIComponent(testId)) : ""));
        var className = opts.className || "btn btn-primary";

        // avoid duplicates
        var existing = document.getElementById("bcaReturnStoryBtn");
        if (existing) {
            existing.href = url;
            existing.textContent = label;
            return existing;
        }

        var a = document.createElement("a");
        a.id = "bcaReturnStoryBtn";
        a.className = className;
        a.href = url;
        a.textContent = label;

        container.appendChild(a);
        return a;
    }

    function markWinAndReturn(opts) {
        // One-call helper for any brain game:
        // - mark test passed
        // - toast message
        // - show Return to Story button
        // - optional auto redirect
        opts = opts || {};

        var id = passStoryTest(opts.testId);

        if (opts.toast !== false) {
            toast(opts.message || "Test completed! 🎉");
        }

        // If user wants auto redirect:
        if (opts.autoRedirect) {
            var backUrl = opts.url || getReturnUrl("../../story.html" + (id ? ("?from=" + encodeURIComponent(id)) : ""));
            window.location.href = backUrl;
            return;
        }

        // Otherwise show button:
        createReturnToStoryButton({
            container: opts.container || opts.containerSelector || null,
            text: opts.buttonText || "Return to Story",
            url: opts.url || null,
            testId: id,
            className: opts.className || "btn btn-primary"
        });
    }

    /* ---------------------------------------------------------
       Export API (global)
   --------------------------------------------------------- */
    window.BCAUI = {
        // DOM
        $: $,
        $all: $all,

        // utils
        clamp: clamp,
        formatDateISO: formatDateISO,
        escapeHtml: escapeHtml,
        getQueryParam: getQueryParam,

        // toast/modal
        toast: toast,
        openModal: openModal,
        closeModal: closeModal,
        openModalFromHTML: openModalFromHTML,
        confirmDialog: confirmDialog,

        // sound
        playSound: playSound,
        soundEnabled: soundEnabled,

        // ✅ story/test helpers
        isStoryMode: isStoryMode,
        getStoryTestId: getStoryTestId,
        getReturnUrl: getReturnUrl,
        hasPassedStoryTest: hasPassedStoryTest,
        passStoryTest: passStoryTest,
        createReturnToStoryButton: createReturnToStoryButton,
        markWinAndReturn: markWinAndReturn
    };
})();