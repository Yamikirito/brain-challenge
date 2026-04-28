(function() {
    "use strict";

    var STORY_ASSET_VERSION = "2026-04-28-2";

    function withAssetVersion(path) {
        path = String(path || "").trim();
        if (!path) return path;

        if (path.indexOf("data:") === 0) return path;
        if (path.indexOf("blob:") === 0) return path;
        if (path.indexOf("v=") !== -1) return path;

        if (path.indexOf("?") !== -1) {
            return path + "&v=" + STORY_ASSET_VERSION;
        }

        return path + "?v=" + STORY_ASSET_VERSION;
    }

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

    function toNum(value, fallback) {
        var n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function clamp(n, min, max) {
        return Math.max(min, Math.min(max, n));
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function tpl(text, vars) {
        return String(text || "").replace(/\{([a-zA-Z0-9_]+)\}/g, function(_, key) {
            return vars && vars[key] !== undefined ? String(vars[key]) : "";
        });
    }

    function safeId(raw) {
        raw = String(raw || "").trim().toLowerCase();
        if (!raw) return "";
        raw = raw.replace(/\s+/g, "_").replace(/[^a-z0-9/_-]/g, "");
        return raw;
    }

    function getQueryParam(name) {
        var qs = window.location.search || "";
        if (!qs) return "";
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

    function hasImageExtension(url) {
        url = String(url || "").toLowerCase();
        return /\.(png|jpg|jpeg|webp|gif|avif)(\?|#|$)/.test(url);
    }

    function uniqueList(arr) {
        var out = [];
        var seen = {};
        for (var i = 0; i < arr.length; i++) {
            var value = String(arr[i] || "");
            if (!value || seen[value]) continue;
            seen[value] = true;
            out.push(value);
        }
        return out;
    }

    function splitDialogueLines(text) {
        var raw = String(text || "").trim();
        if (!raw) return [];
        var lines = raw.split("\n");
        var out = [];
        for (var i = 0; i < lines.length; i++) {
            var line = String(lines[i] || "").trim();
            if (line) out.push(line);
        }
        return out;
    }

    function renderDialogueForOverlay(text) {
        var lines = splitDialogueLines(text);
        if (!lines.length) return "";

        var html = "";
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var colon = line.indexOf(":");
            if (colon > -1) {
                var speaker = line.slice(0, colon).trim();
                var words = line.slice(colon + 1).trim();
                html += "<p><strong>" + escapeHtml(speaker) + ":</strong> " + escapeHtml(words) + "</p>";
            } else {
                html += "<p>" + escapeHtml(line) + "</p>";
            }
        }
        return html;
    }

    var KEYS = {
        started: "bca_story_started",
        step: "bca_story_step",
        history: "bca_story_history",
        progress: "bca_story_progress",
        character: "bca_story_character",
        mount: "bca_story_mount",
        invCharm: "bca_story_inv_charm",
        invMap: "bca_story_inv_map",
        invSword: "bca_story_inv_sword",
        pendingTest: "bca_story_pending_test",
        pendingNext: "bca_story_pending_next",
        sceneIndex: "bca_story_scene_index",
        ending: "bca_story_ending",
        achievements: "bca_story_achievements",
        musicVolume: "bca_story_music_volume",
        sfxVolume: "bca_story_sfx_volume",
        language: "bca_story_language"
    };

    function testKey(testId) {
        return "bca_story_test_" + testId;
    }

    function hasTest(testId) {
        return safeGet(testKey(testId), "0") === "1";
    }

    function getCurrentLanguage() {
        if (window.BCA_I18N && typeof window.BCA_I18N.getLanguage === "function") {
            return window.BCA_I18N.getLanguage() || "en";
        }
        return safeGet(KEYS.language, "en") || "en";
    }

    function pickLang(map) {
        var lang = getCurrentLanguage();
        if (!map || typeof map !== "object") return "";
        return map[lang] || map.en || "";
    }

    function getLangValue(value) {
        if (typeof value === "function") return value();
        if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            (value.en || value.zh || value.ja || value.ko)
        ) {
            return pickLang(value);
        }
        return value;
    }

    function getSceneContent(value, sceneIndex) {
        var resolved = getLangValue(value);
        if (typeof resolved === "function") return resolved();
        if (Array.isArray(resolved)) {
            var idx = clamp(sceneIndex, 0, Math.max(0, resolved.length - 1));
            return resolved[idx] || "";
        }
        return resolved || "";
    }

    function getChoiceLabel(choice) {
        if (!choice) return "";
        var raw = typeof choice.text === "function" ? choice.text() : choice.text;
        return String(getLangValue(raw) || "");
    }

    function tWord(key) {
        var map = {
            chapter: { en: "Chapter", zh: "第", ja: "第", ko: "챕터" },
            notChosen: { en: "Not Chosen", zh: "未选择", ja: "未選択", ko: "선택 안 함" },
            horse: { en: "Horse", zh: "马", ja: "馬", ko: "말" },
            dragon: { en: "Dragon", zh: "龙", ja: "ドラゴン", ko: "드래곤" },
            yes: { en: "Yes", zh: "是", ja: "はい", ko: "예" },
            no: { en: "No", zh: "否", ja: "いいえ", ko: "아니오" },
            luckyCharm: { en: "Lucky Charm", zh: "幸运护符", ja: "幸運のお守り", ko: "행운의 부적" },
            magicMap: { en: "Magic Map", zh: "魔法地图", ja: "魔法の地図", ko: "마법 지도" },
            swordOfLight: { en: "Sword of Light", zh: "光明之剑", ja: "光の剣", ko: "빛의 검" },
            lockMessage: {
                en: "Complete this brain-game test to unlock the next chapter.",
                zh: "请先完成这个脑力小游戏测试，才能解锁下一章。",
                ja: "次の章を解放するには、この脳力ゲームテストをクリアしてください。",
                ko: "다음 챕터를 열려면 이 두뇌 게임 테스트를 먼저 완료하세요."
            }
        };
        return pickLang(map[key] || { en: "" });
    }

    var audioContext = null;
    var currentAudioState = {
        music: clamp(toNum(safeGet(KEYS.musicVolume, "80"), 80), 0, 100),
        sfx: clamp(toNum(safeGet(KEYS.sfxVolume, "80"), 80), 0, 100)
    };

    function syncAudioStateFromStorage() {
        currentAudioState.music = clamp(toNum(safeGet(KEYS.musicVolume, "80"), 80), 0, 100);
        currentAudioState.sfx = clamp(toNum(safeGet(KEYS.sfxVolume, "80"), 80), 0, 100);
    }

    function isSoundEnabled() {
        syncAudioStateFromStorage();
        return currentAudioState.sfx > 0;
    }

    function getSfxGainValue(multiplier) {
        syncAudioStateFromStorage();
        return (currentAudioState.sfx / 100) * (multiplier || 1);
    }

    function getAudioContext() {
        if (typeof window.AudioContext !== "function" && typeof window.webkitAudioContext !== "function") {
            return null;
        }

        if (!audioContext) {
            var Ctx = window.AudioContext || window.webkitAudioContext;
            try {
                audioContext = new Ctx();
            } catch (e) {
                audioContext = null;
            }
        }

        return audioContext;
    }

    function resumeAudioContextIfNeeded() {
        var ctx = getAudioContext();
        if (!ctx) return;
        try {
            if (ctx.state === "suspended") ctx.resume();
        } catch (e) {}
    }

    function playUiTone(type) {
        if (!isSoundEnabled()) return;

        var ctx = getAudioContext();
        if (!ctx) return;

        resumeAudioContextIfNeeded();

        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            var baseGain = getSfxGainValue(0.12);

            if (type === "back") {
                osc.type = "triangle";
                osc.frequency.setValueAtTime(420, now);
                osc.frequency.exponentialRampToValueAtTime(260, now + 0.10);
                gain.gain.setValueAtTime(baseGain, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.12);
                return;
            }

            if (type === "choice") {
                osc.type = "triangle";
                osc.frequency.setValueAtTime(520, now);
                osc.frequency.exponentialRampToValueAtTime(760, now + 0.08);
                gain.gain.setValueAtTime(baseGain, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);
                osc.start(now);
                osc.stop(now + 0.10);
                return;
            }

            if (type === "open_settings" || type === "close_settings") {
                osc.type = "sine";
                osc.frequency.setValueAtTime(type === "open_settings" ? 480 : 360, now);
                osc.frequency.exponentialRampToValueAtTime(type === "open_settings" ? 720 : 300, now + 0.07);
                gain.gain.setValueAtTime(baseGain * 0.8, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
                osc.start(now);
                osc.stop(now + 0.09);
                return;
            }

            osc.type = "triangle";
            osc.frequency.setValueAtTime(360, now);
            osc.frequency.exponentialRampToValueAtTime(620, now + 0.08);
            gain.gain.setValueAtTime(baseGain, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);
            osc.start(now);
            osc.stop(now + 0.10);
        } catch (e) {}
    }

    window.addEventListener("bca:story-audio-change", function(e) {
        if (e && e.detail) {
            if (typeof e.detail.music !== "undefined") {
                safeSet(KEYS.musicVolume, String(clamp(toNum(e.detail.music, 80), 0, 100)));
            }
            if (typeof e.detail.sfx !== "undefined") {
                safeSet(KEYS.sfxVolume, String(clamp(toNum(e.detail.sfx, 80), 0, 100)));
            }
        }
        syncAudioStateFromStorage();
    });

    document.addEventListener("pointerdown", function() {
        resumeAudioContextIfNeeded();
    }, { passive: true });

    function initIfMissing() {
        if (safeGet(KEYS.started, "") !== "1") safeSet(KEYS.started, "1");
        if (safeGet(KEYS.step, "") === "") safeSet(KEYS.step, "0");
        if (safeGet(KEYS.progress, "") === "") safeSet(KEYS.progress, "0");
        if (safeGet(KEYS.mount, "") === "") safeSet(KEYS.mount, "");
        if (safeGet(KEYS.invCharm, "") === "") safeSet(KEYS.invCharm, "0");
        if (safeGet(KEYS.invMap, "") === "") safeSet(KEYS.invMap, "0");
        if (safeGet(KEYS.invSword, "") === "") safeSet(KEYS.invSword, "0");
        if (safeGet(KEYS.pendingTest, "") === "") safeSet(KEYS.pendingTest, "");
        if (safeGet(KEYS.pendingNext, "") === "") safeSet(KEYS.pendingNext, "");
        if (safeGet(KEYS.sceneIndex, "") === "") safeSet(KEYS.sceneIndex, "0");
        if (safeGet(KEYS.ending, "") === "") safeSet(KEYS.ending, "");
        if (safeGet(KEYS.musicVolume, "") === "") safeSet(KEYS.musicVolume, "80");
        if (safeGet(KEYS.sfxVolume, "") === "") safeSet(KEYS.sfxVolume, "80");
        if (safeGet(KEYS.language, "") === "") safeSet(KEYS.language, "en");

        var history = safeJsonGet(KEYS.history, null);
        if (!Array.isArray(history)) safeJsonSet(KEYS.history, []);

        var achievements = safeJsonGet(KEYS.achievements, null);
        if (!achievements || typeof achievements !== "object") safeJsonSet(KEYS.achievements, {});

        syncAudioStateFromStorage();
    }

    function getStep() {
        return clamp(toNum(safeGet(KEYS.step, "0"), 0), 0, 999);
    }

    function setStep(step) {
        safeSet(KEYS.step, String(clamp(toNum(step, 0), 0, 999)));
        resetSceneIndex();
    }

    function getSceneIndex() {
        return clamp(toNum(safeGet(KEYS.sceneIndex, "0"), 0), 0, 999);
    }

    function setSceneIndex(index) {
        safeSet(KEYS.sceneIndex, String(clamp(toNum(index, 0), 0, 999)));
    }

    function resetSceneIndex() {
        setSceneIndex(0);
    }

    function getHistoryState() {
        return {
            step: getStep(),
            sceneIndex: getSceneIndex()
        };
    }

    function pushHistory(state) {
        var history = safeJsonGet(KEYS.history, []);
        if (!Array.isArray(history)) history = [];
        history.push(state);
        safeJsonSet(KEYS.history, history);
    }

    function popHistory() {
        var history = safeJsonGet(KEYS.history, []);
        if (!Array.isArray(history) || !history.length) return null;
        var previous = history.pop();
        safeJsonSet(KEYS.history, history);
        return previous;
    }

    function getProgress() {
        return clamp(toNum(safeGet(KEYS.progress, "0"), 0), 0, 100);
    }

    function setProgress(value) {
        safeSet(KEYS.progress, String(clamp(toNum(value, 0), 0, 100)));
    }

    function renderProgress() {
        var progress = getProgress();
        var text = $("storyProgressText");
        var fill = $("storyProgressFill");

        if (text) text.textContent = progress + "%";
        if (fill) fill.style.width = progress + "%";
    }

    function hasCharm() {
        return safeGet(KEYS.invCharm, "0") === "1";
    }

    function hasMap() {
        return safeGet(KEYS.invMap, "0") === "1";
    }

    function hasSword() {
        return safeGet(KEYS.invSword, "0") === "1";
    }

    function setCharm(value) {
        safeSet(KEYS.invCharm, value ? "1" : "0");
    }

    function setMap(value) {
        safeSet(KEYS.invMap, value ? "1" : "0");
    }

    function setSword(value) {
        safeSet(KEYS.invSword, value ? "1" : "0");
    }

    function getInventoryCount() {
        var count = 0;
        if (hasCharm()) count++;
        if (hasMap()) count++;
        if (hasSword()) count++;
        return count;
    }

    function inventoryLine() {
        return [
            tWord("luckyCharm") + ": " + (hasCharm() ? tWord("yes") : tWord("no")),
            tWord("magicMap") + ": " + (hasMap() ? tWord("yes") : tWord("no")),
            tWord("swordOfLight") + ": " + (hasSword() ? tWord("yes") : tWord("no"))
        ].join(" • ");
    }

    function getCurrentMount() {
        return safeGet(KEYS.mount, "");
    }

    function buildJourneyFlavor() {
        var mount = getCurrentMount();

        if (mount === "Horse") {
            return pickLang({
                en: "Prince Adrian rides a strong horse across broken roads, dark forests, and silent villages.",
                zh: "阿德里安王子骑着一匹强壮的战马，穿过破碎的道路、黑暗的森林和寂静的村庄。",
                ja: "エイドリアン王子は力強い馬に乗り、壊れた道や暗い森、静かな村々を進んでいく。",
                ko: "아드리안 왕자는 강한 말을 타고 부서진 길과 어두운 숲, 조용한 마을을 지나간다."
            });
        }

        if (mount === "Dragon") {
            return pickLang({
                en: "Prince Adrian rides a great dragon above mountains, ruined towers, and lands touched by shadow.",
                zh: "阿德里安王子骑着巨龙飞越群山、废墟高塔和被阴影侵蚀的大地。",
                ja: "エイドリアン王子は偉大なドラゴンに乗り、山々や崩れた塔、影に覆われた大地の上を飛ぶ。",
                ko: "아드리안 왕자는 거대한 드래곤을 타고 산과 무너진 탑, 그림자에 물든 땅 위를 날아간다."
            });
        }

        return pickLang({
            en: "Prince Adrian begins the long journey into a darker world.",
            zh: "阿德里安王子踏上了通往黑暗世界的漫长旅程。",
            ja: "エイドリアン王子は、より暗い世界への長い旅を始める。",
            ko: "아드리안 왕자는 더 어두운 세계로 향하는 긴 여정을 시작한다."
        });
    }

    function buildTravelerFlavor() {
        var mount = getCurrentMount();

        if (mount === "Horse") {
            return pickLang({
                en: "His horse is tired, and the road feels long and dry.",
                zh: "他的马已经疲惫，前方的道路显得漫长而干燥。",
                ja: "馬は疲れ、道は長く乾いて感じられる。",
                ko: "그의 말은 지쳤고, 길은 멀고 메마르게 느껴진다."
            });
        }

        if (mount === "Dragon") {
            return pickLang({
                en: "Even from the sky, the land below feels cold and empty.",
                zh: "即使从高空俯视，下面的大地仍显得寒冷而荒凉。",
                ja: "空の上から見ても、下の大地は冷たく空虚に見える。",
                ko: "하늘 위에서 내려다봐도 아래 땅은 차갑고 황량하게 느껴진다."
            });
        }

        return pickLang({
            en: "The journey has made him tired and thirsty.",
            zh: "这段旅程让他疲惫又口渴。",
            ja: "旅は彼を疲れさせ、喉を渇かせた。",
            ko: "그 여정은 그를 지치고 목마르게 만들었다."
        });
    }

    function vars() {
        return {
            princeName: safeGet(KEYS.character, "") || pickLang({
                en: "Prince Adrian",
                zh: "阿德里安王子",
                ja: "エイドリアン王子",
                ko: "아드리안 왕자"
            }),
            mount: getCurrentMount() || tWord("notChosen"),
            inventory: inventoryLine(),
            journeyFlavor: buildJourneyFlavor(),
            travelerFlavor: buildTravelerFlavor(),
            endingType: safeGet(KEYS.ending, "") || "normal"
        };
    }

    function getAchievements() {
        var data = safeJsonGet(KEYS.achievements, {});
        return data && typeof data === "object" ? data : {};
    }

    function unlockAchievement(id) {
        id = safeId(id);
        if (!id) return;

        var data = getAchievements();
        if (data[id]) return;

        data[id] = true;
        safeJsonSet(KEYS.achievements, data);
    }

    function evaluateEnding() {
        var completedTests =
            (hasTest("test1_first_puzzle") ? 1 : 0) +
            (hasTest("test2_traveler") ? 1 : 0) +
            (hasTest("test3_wise_old_man") ? 1 : 0) +
            (hasTest("test4_magic_map") ? 1 : 0) +
            (hasTest("test5_sword_light") ? 1 : 0) +
            (hasTest("test7_castle_gate") ? 1 : 0) +
            (hasTest("test6_final_battle") ? 1 : 0);

        var allItems = hasCharm() && hasMap() && hasSword();
        var mount = getCurrentMount();

        if (allItems && completedTests === 7 && mount === "Dragon") {
            return "true";
        }

        if (allItems) {
            return "heroic";
        }

        return "normal";
    }

    function storeEnding() {
        var endingType = evaluateEnding();
        safeSet(KEYS.ending, endingType);

        if (endingType === "true") unlockAchievement("ending_true");
        else if (endingType === "heroic") unlockAchievement("ending_heroic");
        else unlockAchievement("ending_normal");
    }

    function updateStoryStatusUI(stepObj) {
        var statusChapter = $("statusChapter");
        var statusProgress = $("statusProgress");
        var statusRoute = $("statusRoute");
        var statusInventory = $("statusInventory");
        var lang = getCurrentLanguage();

        var chapterText = "?";
        if (stepObj && typeof stepObj.chapter === "number") {
            if (lang === "zh") chapterText = "第 " + stepObj.chapter + " 章";
            else if (lang === "ja") chapterText = "第" + stepObj.chapter + "章";
            else if (lang === "ko") chapterText = "챕터 " + stepObj.chapter;
            else chapterText = "Chapter " + stepObj.chapter;
        }

        var routeText = tWord("notChosen");
        if (getCurrentMount() === "Horse") routeText = tWord("horse");
        else if (getCurrentMount() === "Dragon") routeText = tWord("dragon");

        if (statusChapter) statusChapter.textContent = chapterText;
        if (statusProgress) statusProgress.textContent = getProgress() + "%";
        if (statusRoute) statusRoute.textContent = routeText;
        if (statusInventory) statusInventory.textContent = getInventoryCount() + " / 3";
    }

    function setStageStoryText(text) {
        if (window.BCA_STAGE && typeof window.BCA_STAGE.setStoryText === "function") {
            window.BCA_STAGE.setStoryText(text);
        } else {
            var el = $("storyText");
            if (el) el.innerHTML = escapeHtml(String(text || "")).replace(/\n\n/g, "<br><br>").replace(/\n/g, "<br>");
        }
    }

    function setStageDialogue(html) {
        if (window.BCA_STAGE && typeof window.BCA_STAGE.setDialogue === "function") {
            window.BCA_STAGE.setDialogue(html);
        } else {
            var el = $("storyDialogue");
            if (el) el.innerHTML = html;
        }
    }

    function setStageFigureCaption(text) {
        if (window.BCA_STAGE && typeof window.BCA_STAGE.setFigureCaption === "function") {
            window.BCA_STAGE.setFigureCaption(text);
        }
    }

    function renderStoryAndDialogue(storyText, dialogueText) {
        var valueMap = vars();
        var story = tpl(storyText || "", valueMap);
        var dialogue = tpl(dialogueText || "", valueMap);

        var mainText = String(dialogue || "").trim() ? dialogue : story;
        var speaker = "Narrator";

        /*
           If dialogue is like:
           Prince Adrian: I must keep going.
           show:
           nameplate = PRINCE ADRIAN
           text = I must keep going.
        */
        var trimmed = String(mainText || "").trim();
        var colonIndex = trimmed.indexOf(":");

        if (colonIndex > 0 && colonIndex < 40) {
            speaker = trimmed.slice(0, colonIndex).trim();
            mainText = trimmed.slice(colonIndex + 1).trim();
        }

        /*
           If there are multiple dialogue lines, remove repeated speaker names:
           Prince Adrian: Hello
           Princess Elira: Hi
        */
        mainText = String(mainText || "")
            .split("\n")
            .map(function(line) {
                line = String(line || "").trim();
                var idx = line.indexOf(":");
                if (idx > 0 && idx < 40) {
                    return line.slice(idx + 1).trim();
                }
                return line;
            })
            .join("\n");

        if (window.BCA_STAGE && typeof window.BCA_STAGE.setSpeaker === "function") {
            window.BCA_STAGE.setSpeaker(speaker);
        }

        setStageStoryText(mainText);
        setStageDialogue("");
    }

    function isCinematicRequested() {
        return String(getQueryParam("cinematic") || "") === "1";
    }

    function setCinematic(enabled) {
        try {
            document.body.classList.toggle("story-cinematic", !!enabled);
        } catch (e) {}
    }

    var fadeTimer = null;

    function getSceneRoot() {
        return document.querySelector(".stage-panel") || document.body;
    }

    function fadeScene() {
        var sceneRoot = getSceneRoot();
        if (!sceneRoot) return;

        window.clearTimeout(fadeTimer);
        sceneRoot.style.transition = "opacity .16s ease";
        sceneRoot.style.opacity = "0.92";

        fadeTimer = window.setTimeout(function() {
            sceneRoot.style.opacity = "1";
        }, 40);
    }

    var currentRenderedChoices = [];

    function renderChoicesButtons(buttons) {
        var container = $("choices");
        currentRenderedChoices = Array.isArray(buttons) ? buttons.slice() : [];

        if (!container) return;

        if (!currentRenderedChoices.length) {
            container.innerHTML = "";
            return;
        }

        var html = "";
        for (var i = 0; i < currentRenderedChoices.length; i++) {
            var button = currentRenderedChoices[i];
            var disabledAttr = button.disabled ? " disabled aria-disabled='true'" : "";
            html += "<button type='button' data-choice='" + i + "'" + disabledAttr + ">" +
                escapeHtml(getChoiceLabel(button)) +
                "</button>";
        }

        container.innerHTML = html;

        var nodes = container.querySelectorAll("button[data-choice]");
        for (var j = 0; j < nodes.length; j++) {
            nodes[j].addEventListener("click", function(e) {
                var idx = Number(e.currentTarget.getAttribute("data-choice"));
                if (!Number.isFinite(idx)) return;

                var choice = currentRenderedChoices[idx];
                if (!choice || choice.disabled) return;

                playUiTone("choice");
                if (typeof choice.onClick === "function") choice.onClick();
            });
        }
    }

    function showLock(message) {
        var box = $("storyLockedBox");
        var text = $("storyLockedMsg");
        if (box) box.classList.remove("hidden");
        if (text) text.textContent = message || tWord("lockMessage");
    }

    function hideLock() {
        var box = $("storyLockedBox");
        if (box) box.classList.add("hidden");
    }

    var STEP_INDEX = {
        CH1: 0,
        CH2: 1,
        CH3: 2,
        CH4: 3,
        CH5: 4,
        CH6: 5,
        TEST1_FIRST_PUZZLE: 6,
        CH8: 7,
        CH9: 8,
        CH10_CHOOSE_MOUNT: 9,
        CH11: 10,
        CH12_TRAVELER_INTRO: 11,
        TEST2_TRAVELER: 12,
        CH12_TRAVELER_REWARD: 13,
        CH13_LUCKY_CHARM: 14,
        CH14_WISE_OLD_MAN_INTRO: 15,
        TEST3_WISE_OLD_MAN: 16,
        CH15_MAGIC_MAP_INTRO: 17,
        TEST4_MAGIC_MAP: 18,
        CH15_MAGIC_MAP_REWARD: 19,
        CH16_WARRIOR_INTRO: 20,
        TEST5_SWORD_LIGHT: 21,
        CH16_SWORD_REWARD: 22,
        CH17_LAND_OF_SHADOW: 23,
        CH18_WHISPERING_FOREST: 24,
        CH19_LAKE_OF_MEMORIES: 25,
        CH20_CASTLE_GATE: 26,
        CH21_DARK_HALL: 27,
        CH21_CRYSTAL_STAIRS: 28,
        CH21_MAGIC_PRISON: 29,
        CH22_WITCH_APPEARS: 30,
        CH22_FIRST_CLASH: 31,
        TEST6_FINAL_BATTLE: 32,
        CH22_MORVANNA_FALLS: 33,
        CH23_ELIRA_FREE: 34,
        CH23_ESCAPE: 35,
        CH23_LIGHT_RETURNS: 36,
        CH23_HOME_AGAIN: 37,
        CH23_NEW_DAWN: 38
    };

    function goTo(step) {
        step = toNum(step, NaN);
        if (!Number.isFinite(step)) return;
        step = clamp(step, 0, STEPS.length - 1);

        var currentState = getHistoryState();
        var currentStep = getStep();

        if (currentStep !== step) {
            pushHistory(currentState);
        }

        setStep(step);
        renderStep();
    }

    function next() {
        goTo(getStep() + 1);
    }

    function back() {
        if (getSceneIndex() > 0) {
            setSceneIndex(getSceneIndex() - 1);
            renderStep();
            return;
        }

        var previous = popHistory();
        if (!previous) return;

        safeSet(KEYS.step, String(clamp(toNum(previous.step, 0), 0, STEPS.length - 1)));
        safeSet(KEYS.sceneIndex, String(clamp(toNum(previous.sceneIndex, 0), 0, 999)));
        renderStep();
    }

    function restartStory(askConfirm) {
        if (askConfirm && !window.confirm("Restart Story Mode? You will start from the beginning.")) {
            return;
        }

        safeSet(KEYS.character, pickLang({
            en: "Prince Adrian",
            zh: "阿德里安王子",
            ja: "エイドリアン王子",
            ko: "아드리안 왕자"
        }));
        safeSet(KEYS.mount, "");
        setCharm(false);
        setMap(false);
        setSword(false);
        safeJsonSet(KEYS.history, []);
        safeJsonSet(KEYS.achievements, {});
        setProgress(0);
        setStep(0);
        resetSceneIndex();
        safeSet(KEYS.started, "1");
        safeSet(KEYS.ending, "");

        for (var i = 0; i < TESTS.length; i++) {
            safeSet(testKey(TESTS[i].id), "0");
        }

        safeSet(KEYS.pendingTest, "");
        safeSet(KEYS.pendingNext, "");

        var keepCinematic = isCinematicRequested() ? "?cinematic=1" : "";
        try {
            window.history.replaceState({}, document.title, "story.html" + keepCinematic);
        } catch (e) {}

        renderStep();
    }

    function storyReturnUrlFromGame() {
        return "../../story.html";
    }

    function launchGame(gamePath, testId, nextStep, difficulty) {
        testId = safeId(testId);
        safeSet(KEYS.pendingTest, testId);
        safeSet(KEYS.pendingNext, String(nextStep));

        var returnUrl = storyReturnUrlFromGame() + "?from=" + encodeURIComponent(testId);
        var url =
            gamePath +
            "?story=1" +
            "&test=" + encodeURIComponent(testId) +
            "&difficulty=" + encodeURIComponent(String(difficulty || "normal")) +
            "&return=" + encodeURIComponent(returnUrl);

        window.location.href = url;
    }

    function mapLegacyFromToTestId(from) {
        from = safeId(from);

        for (var i = 0; i < TESTS.length; i++) {
            if (TESTS[i].id === from) return from;
        }

        if (from === "letter") return "test1_first_puzzle";
        if (from === "traveler") return "test2_traveler";
        if (from === "wise_old_man") return "test3_wise_old_man";
        if (from === "map") return "test4_magic_map";
        if (from === "warrior") return "test5_sword_light";
        if (from === "gate") return "test7_castle_gate";
        if (from === "witch") return "test6_final_battle";

        return "";
    }

    function applyTestReward(testId) {
        testId = safeId(testId);

        if (testId === "test2_traveler") {
            setCharm(true);
            unlockAchievement("earned_lucky_charm");
        } else if (testId === "test4_magic_map") {
            setMap(true);
            unlockAchievement("earned_magic_map");
        } else if (testId === "test5_sword_light") {
            setSword(true);
            unlockAchievement("earned_sword_of_light");
        } else if (testId === "test1_first_puzzle") {
            unlockAchievement("solved_first_puzzle");
        } else if (testId === "test3_wise_old_man") {
            unlockAchievement("passed_wise_old_man_trial");
        } else if (testId === "test7_castle_gate") {
            unlockAchievement("opened_castle_gate");
        } else if (testId === "test6_final_battle") {
            unlockAchievement("won_final_battle");
        }
    }

    function handleReturnFromGameIfAny() {
        var rawFrom = getQueryParam("from") || getQueryParam("test") || "";
        if (!rawFrom) return;

        var from = mapLegacyFromToTestId(rawFrom);
        var pending = safeId(safeGet(KEYS.pendingTest, ""));
        if (!from && pending) from = pending;
        if (!from) return;

        safeSet(testKey(from), "1");
        applyTestReward(from);

        if (from === "test2_traveler" && typeof window.queueStoryGuideBubble === "function") {
            window.queueStoryGuideBubble(
                pickLang({
                    en: "Well done! You passed the traveler's test. The next chapter is now open.",
                    zh: "做得好！你通过了旅人的测试。下一章现在已经开启。",
                    ja: "よくできました！旅人の試練をクリアしました。次の章が開かれました。",
                    ko: "잘했어요! 여행자의 시험을 통과했습니다. 이제 다음 챕터가 열렸습니다."
                }),
                "assets/images/story/characters/Traveler.png",
                "Traveler guide"
            );
        }

        if (from === "test3_wise_old_man" && typeof window.queueStoryGuideBubble === "function") {
            window.queueStoryGuideBubble(
                pickLang({
                    en: "Well done! You passed the wise old man's test. The path to the Magic Map is now open.",
                    zh: "做得好！你通过了睿智老人的考验。通往魔法地图的道路已经开启。",
                    ja: "よくできました！賢い老人の試練をクリアしました。魔法の地図への道が開かれました。",
                    ko: "잘했어요! 현명한 노인의 시험을 통과했습니다. 이제 마법 지도로 가는 길이 열렸습니다."
                }),
                "assets/images/story/characters/OldMan.png",
                "Wise old man guide"
            );
        }

        if (from === "test4_magic_map" && typeof window.queueStoryGuideBubble === "function") {
            window.queueStoryGuideBubble(
                pickLang({
                    en: "Well done! You awakened the Magic Map. The safe road ahead is now revealed.",
                    zh: "做得好！你唤醒了魔法地图。前方安全的道路已经显现。",
                    ja: "よくできました！魔法の地図が目覚めました。安全な道が示されました。",
                    ko: "잘했어요! 마법 지도를 깨웠습니다. 이제 앞으로의 안전한 길이 드러났습니다."
                }),
                "assets/images/story/characters/OldMan.png",
                "Wise old man guide"
            );
        }

        if (from === "test5_sword_light" && typeof window.queueStoryGuideBubble === "function") {
            window.queueStoryGuideBubble(
                pickLang({
                    en: "Well done! You passed the warrior's challenge. The Sword of Light is now yours.",
                    zh: "做得好！你通过了战士的挑战。光明之剑现在属于你了。",
                    ja: "よくできました！戦士の試練をクリアしました。光の剣はあなたのものです。",
                    ko: "잘했어요! 전사의 도전을 통과했습니다. 이제 빛의 검은 당신의 것입니다."
                }),
                "assets/images/story/characters/Warrior.png",
                "Warrior guide"
            );
        }

        var pendingNext = toNum(safeGet(KEYS.pendingNext, ""), NaN);

        if (Number.isFinite(pendingNext)) {
            pushHistory({
                step: getStep(),
                sceneIndex: getSceneIndex()
            });

            setStep(clamp(pendingNext, 0, STEPS.length - 1));

            /*
               After passing the Castle Gate test,
               return to Chapter 20 scene 3 so the gate opens.
            */
            if (from === "test7_castle_gate") {
                safeSet(KEYS.step, String(STEP_INDEX.CH20_CASTLE_GATE));
                safeSet(KEYS.sceneIndex, "3");
            }
        }

        safeSet(KEYS.pendingTest, "");
        safeSet(KEYS.pendingNext, "");

        var keepCinematic = isCinematicRequested() ? "?cinematic=1" : "";
        try {
            window.history.replaceState({}, document.title, "story.html" + keepCinematic);
        } catch (e) {}
    }

    var TESTS = [{
            id: "test1_first_puzzle",
            gamePath: "games/image-guess/index.html",
            progressMin: 28,
            title: {
                en: "Chapter 7 — The First Puzzle",
                zh: "第 7 章——第一个谜题",
                ja: "第7章 — 最初の謎",
                ko: "챕터 7 — 첫 번째 퍼즐"
            },
            art: "🧠✨",
            text: {
                en: "A glowing puzzle appears in the study room.\n\nSolve it to open the king's letter.",
                zh: "发光的谜题出现在书房里。\n\n解开它，才能打开国王的信。",
                ja: "書斎に光る謎が現れる。\n\nそれを解いて王の手紙を開けよう。",
                ko: "빛나는 퍼즐이 서재에 나타난다.\n\n왕의 편지를 열기 위해 그것을 풀어야 한다."
            },
            difficulty: "easy"
        },
        {
            id: "test2_traveler",
            gamePath: "games/memory-test/index.html",
            progressMin: 50,
            title: {
                en: "Chapter 12 — The Traveler",
                zh: "第 12 章——旅人",
                ja: "第12章 — 旅人",
                ko: "챕터 12 — 여행자"
            },
            art: "🧠🍞",
            text: {
                en: "Complete the traveler's brain test to unlock the next chapter.",
                zh: "完成旅人的脑力测试，解锁下一章。",
                ja: "旅人の脳力テストをクリアして次の章を解放しよう。",
                ko: "여행자의 두뇌 테스트를 완료해 다음 챕터를 여세요."
            },
            difficulty: "medium"
        },
        {
            id: "test3_wise_old_man",
            gamePath: "games/card-matching/index.html",
            progressMin: 62,
            title: {
                en: "Chapter 14 — The Wise Old Man",
                zh: "第 14 章——睿智老人",
                ja: "第14章 — 賢い老人",
                ko: "챕터 14 — 현명한 노인"
            },
            art: "🧠🪄",
            text: {
                en: "Solve the wise old man's test to continue your journey.",
                zh: "解开睿智老人的考验，继续你的旅程。",
                ja: "賢い老人の試練を解いて旅を続けよう。",
                ko: "현명한 노인의 시험을 풀어 여정을 계속하세요."
            },
            difficulty: "medium"
        },
        {
            id: "test4_magic_map",
            gamePath: "games/card-matching/index.html",
            progressMin: 64,
            title: {
                en: "Chapter 15 — The Magic Map",
                zh: "第 15 章——魔法地图",
                ja: "第15章 — 魔法の地図",
                ko: "챕터 15 — 마법 지도"
            },
            art: "🧠🗺️",
            text: {
                en: "Solve the puzzle to awaken the Magic Map.",
                zh: "解开谜题，唤醒魔法地图。",
                ja: "謎を解いて魔法の地図を目覚めさせよう。",
                ko: "퍼즐을 풀어 마법 지도를 깨우세요."
            },
            difficulty: "medium"
        },
        {
            id: "test5_sword_light",
            gamePath: "games/color-bubble-challenge/index.html",
            progressMin: 68,
            title: {
                en: "Chapter 16 — The Warrior's Challenge",
                zh: "第 16 章——战士的挑战",
                ja: "第16章 — 戦士の試練",
                ko: "챕터 16 — 전사의 도전"
            },
            art: "🧠⚔️",
            text: {
                en: "Pass the warrior's challenge to earn the Sword of Light.",
                zh: "通过战士的挑战，获得光明之剑。",
                ja: "戦士の試練を乗り越えて光の剣を手に入れよう。",
                ko: "전사의 도전을 통과해 빛의 검을 얻으세요."
            },
            difficulty: "medium-hard"
        },
        {
            id: "test7_castle_gate",
            gamePath: "games/image-guess/index.html",
            progressMin: 86,
            title: {
                en: "Chapter 20 — The Castle Gate",
                zh: "第 20 章——城堡之门",
                ja: "第20章 — 城門",
                ko: "챕터 20 — 성문"
            },
            art: "🧠🏰",
            text: {
                en: "A final puzzle blocks the gate.\n\nSolve it to enter the castle.",
                zh: "最后一个谜题挡住了城门。\n\n解开它，才能进入城堡。",
                ja: "最後の謎が門を塞いでいる。\n\nそれを解いて城へ入ろう。",
                ko: "마지막 퍼즐이 성문을 막고 있다.\n\n그것을 풀어야 성 안으로 들어갈 수 있다."
            },
            difficulty: "hard"
        },
        {
            id: "test6_final_battle",
            gamePath: "games/color-bubble-challenge/index.html",
            progressMin: 94,
            title: {
                en: "Chapter 22 — The Final Battle",
                zh: "第 22 章——最终决战",
                ja: "第22章 — 最終決戦",
                ko: "챕터 22 — 최후의 전투"
            },
            art: "🧠🔥",
            text: {
                en: "Defeat the witch's dark power in the final challenge.",
                zh: "在最终挑战中击败女巫的黑暗力量。",
                ja: "最後の試練で魔女の闇の力を打ち破ろう。",
                ko: "최종 도전에서 마녀의 어둠의 힘을 물리치세요."
            },
            difficulty: "very-hard"
        }
    ];

    function findTest(id) {
        for (var i = 0; i < TESTS.length; i++) {
            if (TESTS[i].id === id) return TESTS[i];
        }
        return null;
    }

    var IMAGE_KEYS = {
        fallback: "ch-1.1",
        ch1: ["ch-1.1", "ch-1.2", "ch-1.3", "ch-1.4"],
        ch2: ["ch-2.1", "ch-2.2", "ch-2.3"],
        ch3: ["ch-3.1", "ch-3.2", "ch-3.3", "ch-3.4"],
        ch4: ["ch-4.1", "ch-4.2", "ch-4.3", "ch-4.4", "ch-4.5", "ch-4.6"],
        ch5: ["ch-5.1", "ch-5.2", "ch-5.3", "ch-5.4"],
        ch6: ["ch-6.1", "ch-6.2", "ch-6.3", "ch-6.4"],
        ch7: ["ch-7.1", "ch-7.2", "ch-7.3", "ch-7.4", "ch-7.5"],
        ch8: ["ch-8.1", "ch-8.2", "ch-8.3", "ch-8.4"],
        ch9: ["ch-9.1", "ch-9.2", "ch-9.3", "ch-9.4"],
        ch10: ["ch-10.1", "ch-10.2", "ch-10.3", "ch-10.4"],
        ch11Horse: ["horse/ch-11.1"],
        ch11Dragon: ["dragon/ch-11.1"],
        ch12Horse: ["horse/ch-12.1", "horse/ch-12.2"],
        ch12Dragon: ["dragon/ch-12.1", "dragon/ch-12.2"],
        ch13Horse: ["horse/ch-13.1", "horse/ch-13.2", "horse/ch-13.3"],
        ch13Dragon: ["dragon/ch-13.1", "dragon/ch-13.2", "dragon/ch-13.3"],
        ch14Horse: ["horse/ch-14.1", "horse/ch-14.2", "horse/ch-14.3"],
        ch14Dragon: ["dragon/ch-14.1", "dragon/ch-14.2", "dragon/ch-14.3"],
        ch15Horse: ["horse/ch-15.1", "horse/ch-15.2", "horse/ch-15.3"],
        ch15Dragon: ["dragon/ch-15.1", "dragon/ch-15.2", "dragon/ch-15.3"],
        ch16Horse: ["horse/ch-16.1", "horse/ch-16.2", "horse/ch-16.3", "horse/ch-16.4"],
        ch16Dragon: ["dragon/ch-16.1", "dragon/ch-16.2", "dragon/ch-16.3", "dragon/ch-16.4"],
        ch17Horse: ["horse/ch-17.1", "horse/ch-17.2", "horse/ch-17.3", "horse/ch-17.4"],
        ch17Dragon: ["dragon/ch-17.1", "dragon/ch-17.2", "dragon/ch-17.3", "dragon/ch-17.4"],
        ch18Horse: ["horse/ch-18.1", "horse/ch-18.2", "horse/ch-18.3", "horse/ch-18.4"],
        ch18Dragon: ["dragon/ch-18.1", "dragon/ch-18.2", "dragon/ch-18.3", "dragon/ch-18.4"],
        ch19Horse: ["horse/ch-19.1", "horse/ch-19.2", "horse/ch-19.3", "horse/ch-19.4"],
        ch19Dragon: ["dragon/ch-19.1", "dragon/ch-19.2", "dragon/ch-19.3", "dragon/ch-19.4"],
        ch20Horse: ["horse/ch-20.1", "horse/ch-20.2", "horse/ch-20.3", "horse/ch-20.4"],
        ch20Dragon: ["dragon/ch-20.1", "dragon/ch-20.2", "dragon/ch-20.3", "dragon/ch-20.4"],
        ch21Horse: ["horse/ch-21.1", "horse/ch-21.2", "horse/ch-21.3"],
        ch21Dragon: ["dragon/ch-21.1", "dragon/ch-21.2", "dragon/ch-21.3"],
        ch22Horse: ["horse/ch-22.1", "horse/ch-22.2", "horse/ch-22.3", "horse/ch-22.4"],
        ch22Dragon: ["dragon/ch-22.1", "dragon/ch-22.2", "dragon/ch-22.3", "dragon/ch-22.4"],
        ch23Horse: ["horse/ch-23.1", "horse/ch-23.2", "horse/ch-23.3", "horse/ch-23.4", "horse/ch-23.5", "horse/ch-23.6"],
        ch23Dragon: ["dragon/ch-23.1", "dragon/ch-23.2", "dragon/ch-23.3", "dragon/ch-23.4", "dragon/ch-23.5", "dragon/ch-23.6"]
    };

    function getChapterPathImages(chapterNo) {
        var mount = getCurrentMount() === "Dragon" ? "Dragon" : "Horse";
        var key = "ch" + chapterNo + mount;
        return IMAGE_KEYS[key] || IMAGE_KEYS["ch" + chapterNo] || [IMAGE_KEYS.fallback];
    }

    function getImageListForStep(stepObj, stepIndex) {
        if (!stepObj) return [IMAGE_KEYS.fallback];

        if (typeof stepObj.getBg === "function") {
            var dynamicA = stepObj.getBg();
            return Array.isArray(dynamicA) ? dynamicA : [dynamicA];
        }

        if (typeof stepObj.bg === "function") {
            var dynamicB = stepObj.bg();
            return Array.isArray(dynamicB) ? dynamicB : [dynamicB];
        }

        if (Array.isArray(stepObj.bg)) return stepObj.bg;
        if (stepObj.bg) return [stepObj.bg];

        var chapterNo = typeof stepObj.chapter === "number" ? stepObj.chapter : (stepIndex + 1);
        return getChapterPathImages(chapterNo);
    }

    var lastImageResolvedSrc = "";
    var currentImageToken = 0;

    function ensureImageStage() {
        var img = $("chapterImage");
        if (img) return img;

        var stage = document.querySelector(".media-wrap") ||
            document.querySelector(".stage-panel") ||
            document.body;

        img = document.createElement("img");
        img.id = "chapterImage";
        img.alt = "Current chapter artwork";
        img.draggable = false;
        img.style.position = "absolute";
        img.style.inset = "0";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.style.objectPosition = "center";
        img.style.display = "block";
        img.style.background = "#000";
        img.style.opacity = "1";
        img.style.transition = "opacity .25s ease";
        stage.appendChild(img);

        return img;
    }

    function buildImageCandidates(key) {
        key = String(key || "").trim();
        if (!key) return [];

        /*
          IMPORTANT:
          Your story images are now in:
          assets/images/story/
    
          So we should NOT check many folders.
          Checking many wrong folders causes slow image loading on GitHub Pages.
        */

        if (key.indexOf("assets/") === 0) {
            return uniqueList([key]);
        }

        if (hasImageExtension(key)) {
            return uniqueList([
                "assets/images/story/" + key
            ]);
        }

        return uniqueList([
            "assets/images/story/" + key + ".png"
        ]);
    }



    function setStageImageByKey(imageKey) {
        imageKey = String(imageKey || "").trim();
        if (!imageKey) imageKey = IMAGE_KEYS.fallback;

        var img = ensureImageStage();
        var candidates = buildImageCandidates(imageKey);
        var fallbackCandidates = buildImageCandidates(IMAGE_KEYS.fallback);

        var src = candidates[0] || fallbackCandidates[0] || "";
        if (!src) return;

        src = withAssetVersion(src);

        if (img.getAttribute("src") === src) {
            img.style.opacity = "1";
            return;
        }

        img.onerror = function() {
            var fallbackSrc = fallbackCandidates[0] ? withAssetVersion(fallbackCandidates[0]) : "";

            if (fallbackSrc && img.getAttribute("src") !== fallbackSrc) {
                img.src = fallbackSrc;
            }
        };

        img.style.opacity = "1";
        img.src = src;
    }

    function setChapterImageFromStep(stepObj, stepIndex) {
        var imageList = getImageListForStep(stepObj, stepIndex);
        var scene = clamp(getSceneIndex(), 0, Math.max(0, imageList.length - 1));
        setSceneIndex(scene);
        setStageImageByKey(imageList[scene] || IMAGE_KEYS.fallback);
    }

    function hasMoreImagesInStep(stepObj, stepIndex) {
        var imageList = getImageListForStep(stepObj, stepIndex);
        return getSceneIndex() < imageList.length - 1;
    }

    function nextImageOrNextStep(stepObj, stepIndex) {
        if (hasMoreImagesInStep(stepObj, stepIndex)) {
            setSceneIndex(getSceneIndex() + 1);
            renderStep();
        } else {
            next();
        }
    }

    function setChapterBanner(stepObj) {
        var banner = document.querySelector(".chapter-banner");
        if (!banner) return;
        banner.textContent = String(tpl(getLangValue(stepObj.title || "Story"), vars())).toUpperCase();
    }

    function setFigureCaptionFromStep(stepObj) {
        var story = getSceneContent(stepObj.text, getSceneIndex());
        var title = tpl(getLangValue(stepObj.title || "Story"), vars());
        var firstSentence = String(tpl(story || "", vars())).split(".")[0].trim();
        var caption = title + ". " + (firstSentence ? firstSentence + "." : "");
        setStageFigureCaption(caption);
    }

    function setStageNavVisibility(showBack, showForward) {
        var backBtn = $("storyBackBtn");
        var forwardBtn = $("storyForwardBtn");

        if (backBtn) backBtn.style.display = showBack ? "" : "none";
        if (forwardBtn) forwardBtn.style.display = showForward ? "" : "none";
    }

    function isSettingsModalOpen() {
        var modal = $("storySettingsModal");
        return !!(modal && !modal.classList.contains("hidden"));
    }

    function makeStoryStep(config) {
        return {
            type: "story",
            chapter: config.chapter,
            progressMin: config.progressMin || 0,
            title: config.title || "Story",
            bg: config.bg || IMAGE_KEYS.fallback,
            getBg: config.getBg,
            text: config.text || "",
            dialogue: config.dialogue || ""
        };
    }

    function makeChoiceStep(config) {
        return {
            type: "choice",
            chapter: config.chapter,
            progressMin: config.progressMin || 0,
            title: config.title || "Choice",
            bg: config.bg || IMAGE_KEYS.fallback,
            getBg: config.getBg,
            text: config.text || "",
            dialogue: config.dialogue || "",
            render: config.render
        };
    }

    function makeGameStep(testId, nextStep, chapterNo, bgValue, onComplete, completedText) {
        var testObj = findTest(testId);

        return {
            type: "game",
            chapter: chapterNo || null,
            progressMin: testObj ? testObj.progressMin : 0,
            title: testObj ? testObj.title : "Story",
            art: testObj ? testObj.art : "",
            text: testObj ? testObj.text : "",
            dialogue: "",
            testId: testObj ? testObj.id : "",
            gamePath: testObj ? testObj.gamePath : "",
            difficulty: testObj ? testObj.difficulty : "normal",
            nextStep: nextStep,
            bg: bgValue || IMAGE_KEYS.fallback,
            onComplete: onComplete || null,
            completedText: completedText || ""
        };
    }

    /* ---------------------- Story -------------------------- */
    var STEPS = [
        makeStoryStep({
            chapter: 1,
            progressMin: 4,
            title: {
                en: "Chapter 1 — The Spring Festival",
                zh: "第 1 章——春日庆典",
                ja: "第1章 — 春の祭り",
                ko: "챕터 1 — 봄 축제"
            },
            bg: IMAGE_KEYS.ch1,
            text: {
                en: [
                    "It is spring time in the kingdom. The palace garden is full of flowers, light, and peace.",
                    "Prince Adrian walks through the royal garden on a calm and beautiful day.",
                    "Prince Adrian meets Princess Elira in the garden, and they enjoy the peaceful spring day together.",
                    "The prince and princess share a quiet and happy moment in the beautiful garden."
                ],
                zh: [
                    "王国迎来了春天。宫殿花园里充满了鲜花、光明与宁静。",
                    "阿德里安王子在平静而美丽的一天里走过皇家花园。",
                    "阿德里安王子在花园里遇见了艾莉拉公主，他们一起享受这宁静的春日时光。",
                    "王子和公主在美丽的花园里共享安静而快乐的时刻。"
                ],
                ja: [
                    "王国には春が訪れた。宮殿の庭は花と光、そして平和に満ちていた。",
                    "エイドリアン王子は、穏やかで美しい日に王家の庭を歩いていた。",
                    "王子は庭でエリラ姫に会い、二人は静かな春の日を共に楽しんだ。",
                    "王子と姫は、美しい庭で静かで幸せなひとときを分かち合った。"
                ],
                ko: [
                    "왕국에 봄이 찾아왔다. 궁전 정원은 꽃과 빛, 그리고 평화로 가득했다.",
                    "아드리안 왕자는 평화롭고 아름다운 날에 왕실 정원을 걷고 있었다.",
                    "아드리안 왕자는 정원에서 엘리라 공주를 만나 함께 평화로운 봄날을 보냈다.",
                    "왕자와 공주는 아름다운 정원에서 조용하고 행복한 순간을 함께 나누었다."
                ]
            },
            dialogue: {
                en: ["", "", "", ""],
                zh: ["", "", "", ""],
                ja: ["", "", "", ""],
                ko: ["", "", "", ""]
            }
        }),

        makeStoryStep({
            chapter: 2,
            progressMin: 8,
            title: {
                en: "Chapter 2 — In the Garden",
                zh: "第 2 章——花园里",
                ja: "第2章 — 庭で",
                ko: "챕터 2 — 정원에서"
            },
            bg: IMAGE_KEYS.ch2,
            text: {
                en: [
                    "Prince Adrian and Princess Elira walk together in the garden on a quiet spring day.",
                    "They stop under a tree full of white flowers and enjoy a peaceful moment together.",
                    "As they talk, Princess Elira feels that something dark may be coming, and Prince Adrian promises to protect her."
                ],
                zh: [
                    "在安静的春日里，阿德里安王子和艾莉拉公主一起走在花园中。",
                    "他们停在一棵开满白花的树下，一起享受宁静的时刻。",
                    "交谈时，艾莉拉公主感觉黑暗可能正在靠近，而阿德里安王子答应会保护她。"
                ],
                ja: [
                    "静かな春の日、エイドリアン王子とエリラ姫は庭を一緒に歩いていた。",
                    "二人は白い花で満ちた木の下で立ち止まり、穏やかな時間を過ごした。",
                    "話しているうちに、エリラ姫は何か悪いことが近づいていると感じ、エイドリアン王子は彼女を守ると約束した。"
                ],
                ko: [
                    "조용한 봄날, 아드리안 왕자와 엘리라 공주는 함께 정원을 걸었다.",
                    "두 사람은 흰 꽃이 가득한 나무 아래에서 멈추어 평화로운 순간을 함께했다.",
                    "이야기를 나누는 동안 엘리라 공주는 어두운 일이 다가오고 있음을 느꼈고, 아드리안 왕자는 그녀를 지키겠다고 약속했다."
                ]
            },
            dialogue: {
                en: [
                    "",
                    "",
                    "Princess Elira: Do you ever feel that something bad is coming?\nPrince Adrian: Sometimes.\n\nPrincess Elira: I do not know why, but my heart feels heavy.\nPrince Adrian: Then I will stand with you."
                ],
                zh: [
                    "",
                    "",
                    "艾莉拉公主: 你有没有觉得，好像有什么坏事要来了？\n阿德里安王子: 有时候会。\n\n艾莉拉公主: 我不知道为什么，但我的心很沉重。\n阿德里安王子: 那么我会站在你身边。"
                ],
                ja: [
                    "",
                    "",
                    "エリラ姫: 何か悪いことが来るように感じたことはある？\nエイドリアン王子: 時々ね。\n\nエリラ姫: なぜかわからないけれど、胸が重いの。\nエイドリアン王子: なら、僕が君のそばにいる。"
                ],
                ko: [
                    "",
                    "",
                    "엘리라 공주: 나쁜 일이 다가오는 것처럼 느껴진 적 있어?\n아드리안 왕자: 가끔 그래.\n\n엘리라 공주: 왜 그런지 모르겠지만 마음이 무거워.\n아드리안 왕자: 그렇다면 내가 네 곁에 있을게."
                ]
            }
        }),

        makeStoryStep({
            chapter: 3,
            progressMin: 12,
            title: {
                en: "Chapter 3 — The Witch Sees Her",
                zh: "第 3 章——女巫看见了她",
                ja: "第3章 — 魔女が彼女を見る",
                ko: "챕터 3 — 마녀가 그녀를 보다"
            },
            bg: IMAGE_KEYS.ch3,
            text: {
                en: [
                    "Far away, a dark castle stands under the stormy night sky, where the witch Morvanna watches from the land of shadow.",
                    "Inside her dark hall, the witch looks into a magic mirror and sees Princess Elira in the peaceful garden.",
                    "The witch becomes angry and calls on her dark power as she decides to take the princess for herself.",
                    "Shadow spirits gather around the witch as she prepares her dark magic and plans to bring darkness to the world."
                ],
                zh: [
                    "在遥远的地方，一座黑暗城堡立于暴风雨般的夜空下，女巫莫瓦娜在阴影之地注视着一切。",
                    "在她黑暗的大厅里，女巫看向魔镜，看到艾莉拉公主正身处宁静的花园。",
                    "女巫愤怒起来，召唤黑暗力量，决定将公主据为己有。",
                    "影灵聚集在女巫身边，她准备施展黑暗魔法，计划让世界陷入黑暗。"
                ],
                ja: [
                    "遠く離れた場所で、嵐の夜空の下に暗い城が立っていた。影の地から魔女モルヴァンナが見つめている。",
                    "暗い広間の中で、魔女は魔法の鏡をのぞき込み、静かな庭にいるエリラ姫を見つけた。",
                    "魔女は怒り、闇の力を呼び起こし、姫を自分のものにしようと決めた。",
                    "影の精霊たちが魔女の周りに集まり、彼女は闇の魔法を準備し、世界を闇に包もうとした。"
                ],
                ko: [
                    "멀리서 폭풍의 밤하늘 아래 어두운 성이 서 있고, 마녀 모르반나는 그림자의 땅에서 그것을 지켜보고 있었다.",
                    "어두운 홀 안에서 마녀는 마법 거울을 들여다보며 평화로운 정원에 있는 엘리라 공주를 보았다.",
                    "마녀는 분노하며 어둠의 힘을 불러내고 공주를 자신의 것으로 만들기로 결심했다.",
                    "그림자 정령들이 마녀 주위에 모여들고, 그녀는 세상에 어둠을 가져올 마법을 준비했다."
                ]
            },
            dialogue: {
                en: [
                    "",
                    "",
                    "Witch Morvanna: So, the girl of light is here.",
                    "Witch Morvanna: I will take her light.\nWitch Morvanna: Then the world will belong to shadow."
                ],
                zh: [
                    "",
                    "",
                    "女巫莫瓦娜: 原来，光之少女就在这里。",
                    "女巫莫瓦娜: 我要夺走她的光。\n女巫莫瓦娜: 然后整个世界都将属于黑影。"
                ],
                ja: [
                    "",
                    "",
                    "魔女モルヴァンナ: なるほど、光の少女はここにいるのね。",
                    "魔女モルヴァンナ: その光を奪ってやる。\n魔女モルヴァンナ: そして世界は闇のものになる。"
                ],
                ko: [
                    "",
                    "",
                    "마녀 모르반나: 그렇군, 빛의 소녀가 여기 있었구나.",
                    "마녀 모르반나: 나는 그녀의 빛을 빼앗을 것이다.\n마녀 모르반나: 그러면 세상은 그림자의 것이 될 것이다."
                ]
            }
        }),

        makeStoryStep({
            chapter: 4,
            progressMin: 16,
            title: {
                en: "Chapter 4 — The Dark Night",
                zh: "第 4 章——黑夜",
                ja: "第4章 — 闇の夜",
                ko: "챕터 4 — 어두운 밤"
            },
            bg: IMAGE_KEYS.ch4,
            text: {
                en: [
                    "That night, dark clouds cover the sky, and the palace garden becomes cold and silent.",
                    "Princess Elira wakes in her room and feels that something is wrong in the night.",
                    "Suddenly, the witch Morvanna appears in a storm of black smoke and dark magic.",
                    "Princess Elira stands bravely before the witch, even as the room fills with shadow.",
                    "Elira calls on her light and tries to fight back against the witch's dark power.",
                    "But the witch is too strong, and she takes Princess Elira away into the darkness."
                ],
                zh: [
                    "那天夜里，乌云遮住天空，宫殿花园变得寒冷而寂静。",
                    "艾莉拉公主在房中醒来，感觉夜里有什么不对劲。",
                    "突然，女巫莫瓦娜在黑烟与黑暗魔法的风暴中出现。",
                    "即使房间被阴影填满，艾莉拉公主依然勇敢地站在女巫面前。",
                    "艾莉拉唤起自己的光明，试图对抗女巫的黑暗力量。",
                    "但女巫太过强大，她把艾莉拉公主带进了黑暗之中。"
                ],
                ja: [
                    "その夜、黒い雲が空を覆い、宮殿の庭は冷たく静かになった。",
                    "エリラ姫は部屋で目を覚まし、夜に何かがおかしいと感じた。",
                    "突然、魔女モルヴァンナが黒煙と闇の魔法の嵐の中に現れた。",
                    "部屋が影で満たされても、エリラ姫は勇敢に魔女の前に立った。",
                    "エリラは自らの光を呼び起こし、魔女の闇の力に立ち向かおうとした。",
                    "だが魔女はあまりにも強く、エリラ姫を闇の中へ連れ去った。"
                ],
                ko: [
                    "그날 밤 검은 구름이 하늘을 덮고 궁전 정원은 차갑고 조용해졌다.",
                    "엘리라 공주는 방에서 깨어나 밤에 무언가 잘못되었음을 느꼈다.",
                    "갑자기 마녀 모르반나는 검은 연기와 어둠의 마법 폭풍 속에 나타났다.",
                    "방이 그림자로 가득 차도 엘리라 공주는 용감하게 마녀 앞에 섰다.",
                    "엘리라는 자신의 빛을 불러내어 마녀의 어둠의 힘에 맞서 싸우려 했다.",
                    "하지만 마녀는 너무 강했고, 엘리라 공주를 어둠 속으로 데려갔다."
                ]
            },
            dialogue: {
                en: [
                    "",
                    "",
                    "",
                    "Witch Morvanna: Your peace ends tonight.",
                    "Princess Elira: You will not win.",
                    "Witch Morvanna: We will see."
                ],
                zh: [
                    "",
                    "",
                    "",
                    "女巫莫瓦娜: 你的平静今夜结束了。",
                    "艾莉拉公主: 你不会赢的。",
                    "女巫莫瓦娜: 我们走着瞧。"
                ],
                ja: [
                    "",
                    "",
                    "",
                    "魔女モルヴァンナ: お前の平穏は今夜で終わりだ。",
                    "エリラ姫: あなたは勝てないわ。",
                    "魔女モルヴァンナ: それはどうかしら。"
                ],
                ko: [
                    "",
                    "",
                    "",
                    "마녀 모르반나: 너의 평화는 오늘 밤 끝난다.",
                    "엘리라 공주: 너는 이기지 못할 거야.",
                    "마녀 모르반나: 두고 보자."
                ]
            }
        }),

        makeStoryStep({
            chapter: 5,
            progressMin: 20,
            title: {
                en: "Chapter 5 — The Letter",
                zh: "第 5 章——那封信",
                ja: "第5章 — 手紙",
                ko: "챕터 5 — 편지"
            },
            bg: IMAGE_KEYS.ch5,
            text: {
                en: [
                    "The next night, Prince Adrian walks alone in the garden under the cold moon, thinking of Princess Elira.",
                    "Suddenly, a tired messenger runs through the gate toward the prince with urgent news.",
                    "The messenger reaches Prince Adrian and gives him a sealed letter from King Alden.",
                    "Prince Adrian takes the letter and looks at it with deep worry as the quiet night grows heavy."
                ],
                zh: [
                    "第二天夜里，阿德里安王子独自走在寒冷月光下的花园里，思念着艾莉拉公主。",
                    "突然，一名疲惫的信使带着紧急消息穿过大门奔向王子。",
                    "信使来到阿德里安王子面前，把国王奥尔登的密封信交给了他。",
                    "阿德里安王子接过信，忧心地看着它，安静的夜晚显得越发沉重。"
                ],
                ja: [
                    "翌日の夜、エイドリアン王子は冷たい月の下、庭を一人で歩きながらエリラ姫のことを思っていた。",
                    "突然、疲れた使者が急ぎの知らせを持って門を駆け抜け、王子のもとへ向かってきた。",
                    "使者はエイドリアン王子にたどり着き、オールデン王からの封印された手紙を渡した。",
                    "王子は手紙を受け取り、不安そうに見つめた。静かな夜は重く感じられた。"
                ],
                ko: [
                    "다음 날 밤, 아드리안 왕자는 차가운 달빛 아래 정원을 혼자 걸으며 엘리라 공주를 생각했다.",
                    "갑자기 지친 전령이 급한 소식을 가지고 문을 지나 왕자에게 달려왔다.",
                    "전령은 아드리안 왕자에게 도착해 알덴 왕의 봉인된 편지를 건넸다.",
                    "아드리안 왕자는 편지를 받아 들고 깊은 걱정 속에 바라보았다. 조용한 밤은 점점 더 무거워졌다."
                ]
            },
            dialogue: {
                en: [
                    "",
                    "Messenger: Your Highness! I came as fast as I could.",
                    "Messenger: This letter is from King Alden.",
                    "Prince Adrian: Give it to me now."
                ],
                zh: [
                    "",
                    "信使: 殿下！我已经尽快赶来了。",
                    "信使: 这封信来自奥尔登国王。",
                    "阿德里安王子: 现在就给我。"
                ],
                ja: [
                    "",
                    "使者: 殿下！できるだけ急いで参りました。",
                    "使者: この手紙はオールデン王からのものです。",
                    "エイドリアン王子: 今すぐ渡してくれ。"
                ],
                ko: [
                    "",
                    "전령: 전하! 가능한 한 빨리 왔습니다.",
                    "전령: 이 편지는 알덴 왕께서 보내신 것입니다.",
                    "아드리안 왕자: 지금 당장 내게 줘."
                ]
            }
        }),

        makeStoryStep({
            chapter: 6,
            progressMin: 24,
            title: {
                en: "Chapter 6 — The Magic Seal",
                zh: "第 6 章——魔法封印",
                ja: "第6章 — 魔法の封印",
                ko: "챕터 6 — 마법의 봉인"
            },
            bg: IMAGE_KEYS.ch6,
            text: {
                en: [
                    "Prince Adrian looks at the sealed letter in the quiet moonlit garden, but he cannot open it.",
                    "Suddenly, the seal begins to glow with golden light, and strange magic rises from the letter.",
                    "A great circle of shining magic appears before the prince and reveals an ancient trial.",
                    "Prince Adrian stands ready before the glowing seal, knowing he must use wisdom to learn the truth."
                ],
                zh: [
                    "阿德里安王子在宁静的月光花园中看着那封密封的信，却无法将它打开。",
                    "突然，封印开始发出金色光芒，奇异的魔法从信中升起。",
                    "一道巨大的闪耀魔法圆环出现在王子面前，显现出古老的试炼。",
                    "阿德里安王子站在发光的封印前，知道自己必须用智慧揭开真相。"
                ],
                ja: [
                    "エイドリアン王子は月明かりの静かな庭で封印された手紙を見つめていたが、開くことができなかった。",
                    "突然、封印が黄金の光を放ち始め、不思議な魔法が手紙から立ち上った。",
                    "大きく輝く魔法陣が王子の前に現れ、古代の試練を示した。",
                    "エイドリアン王子は光る封印の前に立ち、真実を知るためには知恵が必要だと悟った。"
                ],
                ko: [
                    "아드리안 왕자는 조용한 달빛 정원에서 봉인된 편지를 바라보았지만 그것을 열 수 없었다.",
                    "갑자기 봉인이 황금빛으로 빛나기 시작했고, 이상한 마법이 편지에서 솟아올랐다.",
                    "빛나는 거대한 마법 원이 왕자 앞에 나타나 오래된 시련을 드러냈다.",
                    "아드리안 왕자는 빛나는 봉인 앞에 서서 진실을 알기 위해 지혜를 써야 한다는 것을 깨달았다."
                ]
            },
            dialogue: {
                en: [
                    "",
                    "Prince Adrian: This letter is protected by magic.",
                    "Magic Voice: Only wisdom can break this seal.",
                    "Prince Adrian: Then I am ready."
                ],
                zh: [
                    "",
                    "阿德里安王子: 这封信受魔法保护。",
                    "魔法之声: 只有智慧才能打破这个封印。",
                    "阿德里安王子: 那我已经准备好了。"
                ],
                ja: [
                    "",
                    "エイドリアン王子: この手紙は魔法で守られている。",
                    "魔法の声: この封印を破れるのは知恵だけだ。",
                    "エイドリアン王子: ならば、準備はできている。"
                ],
                ko: [
                    "",
                    "아드리안 왕자: 이 편지는 마법으로 보호받고 있어.",
                    "마법의 목소리: 이 봉인을 깰 수 있는 것은 오직 지혜뿐이다.",
                    "아드리안 왕자: 그렇다면 나는 준비되었다."
                ]
            }
        }),

        makeGameStep(
            "test1_first_puzzle",
            STEP_INDEX.CH8,
            7,
            IMAGE_KEYS.ch7,
            function() {
                unlockAchievement("solved_first_puzzle");
            }, {
                en: [
                    "A glowing magic seal rises in the study room and begins the prince's first trial.",
                    "Prince Adrian stands before the ancient puzzle as golden light fills the room.",
                    "He studies the shining symbols carefully and begins to solve the magical test.",
                    "The final pattern comes together, and the seal starts to shine with greater power.",
                    "At last, the prince solves the puzzle, the seal breaks, and the letter opens."
                ],
                zh: [
                    "发光的魔法封印在书房中升起，开始了王子的第一场试炼。",
                    "金色光芒充满房间，阿德里安王子站在古老谜题前。",
                    "他仔细研究发亮的符号，开始解开这场魔法考验。",
                    "最后的图案终于成形，封印开始发出更强的光。",
                    "终于，王子解开了谜题，封印破碎，信也打开了。"
                ],
                ja: [
                    "光る魔法の封印が書斎に現れ、王子の最初の試練が始まった。",
                    "黄金の光が部屋を満たす中、エイドリアン王子は古代の謎の前に立つ。",
                    "彼は輝く記号を注意深く見つめ、魔法の試験を解き始めた。",
                    "最後の模様が揃い、封印はさらに強く輝き始める。",
                    "ついに王子は謎を解き、封印は砕け、手紙が開いた。"
                ],
                ko: [
                    "빛나는 마법의 봉인이 서재에 떠오르며 왕자의 첫 번째 시련이 시작된다.",
                    "황금빛이 방을 가득 채우는 가운데 아드리안 왕자는 오래된 퍼즐 앞에 선다.",
                    "그는 빛나는 문양을 주의 깊게 살피며 마법의 시험을 풀기 시작한다.",
                    "마지막 무늬가 완성되고 봉인은 더욱 강하게 빛나기 시작한다.",
                    "마침내 왕자는 퍼즐을 풀고 봉인은 깨지며 편지가 열린다."
                ]
            }
        ),

        makeStoryStep({
            chapter: 8,
            progressMin: 32,
            title: {
                en: "Chapter 8 — The Truth",
                zh: "第 8 章——真相",
                ja: "第8章 — 真実",
                ko: "챕터 8 — 진실"
            },
            bg: IMAGE_KEYS.ch8,
            text: {
                en: [
                    "After breaking the magic seal, Prince Adrian opens the letter and begins to read its secret message.",
                    "As he reads, a vision of darkness and light appears before him, showing Princess Elira and the danger around her.",
                    "The letter reveals the truth that the witch Morvanna has taken Princess Elira to a cursed land.",
                    "Prince Adrian stands in silence after reading the letter, knowing he must begin the journey to save her."
                ],
                zh: [
                    "打破魔法封印后，阿德里安王子打开信，开始阅读其中的秘密信息。",
                    "当他阅读时，一道光与暗交织的幻象出现在他面前，显示出艾莉拉公主以及她周围的危险。",
                    "信中揭示了真相：女巫莫瓦娜已将艾莉拉公主带去了被诅咒的土地。",
                    "读完信后，阿德里安王子沉默地站着，知道自己必须踏上旅程去救她。"
                ],
                ja: [
                    "魔法の封印を破った後、エイドリアン王子は手紙を開き、その秘密の言葉を読み始めた。",
                    "読み進めると、光と闇の幻が彼の前に現れ、エリラ姫と彼女を取り巻く危険を映し出した。",
                    "手紙は、魔女モルヴァンナがエリラ姫を呪われた地へ連れ去ったという真実を明かした。",
                    "手紙を読み終えた王子は静かに立ち尽くし、彼女を救う旅を始めねばならないと悟った。"
                ],
                ko: [
                    "마법 봉인을 깨뜨린 뒤 아드리안 왕자는 편지를 열어 그 비밀 메시지를 읽기 시작했다.",
                    "그가 읽는 동안 빛과 어둠의 환영이 그의 앞에 나타나 엘리라 공주와 그녀를 둘러싼 위험을 보여주었다.",
                    "편지는 마녀 모르반나가 엘리라 공주를 저주받은 땅으로 데려갔다는 진실을 밝혔다.",
                    "편지를 다 읽은 후 아드리안 왕자는 조용히 서서 그녀를 구하기 위한 여정을 시작해야 함을 알았다."
                ]
            },
            dialogue: {
                en: [
                    "",
                    "",
                    "King's Letter: The witch has taken Princess Elira.",
                    "Prince Adrian: Then I must go now."
                ],
                zh: [
                    "",
                    "",
                    "国王的信: 女巫带走了艾莉拉公主。",
                    "阿德里安王子: 那我现在必须出发。"
                ],
                ja: [
                    "",
                    "",
                    "王の手紙: 魔女がエリラ姫を連れ去った。",
                    "エイドリアン王子: ならば、今すぐ行かねばならない。"
                ],
                ko: [
                    "",
                    "",
                    "왕의 편지: 마녀가 엘리라 공주를 데려갔다.",
                    "아드리안 왕자: 그렇다면 나는 지금 가야 한다."
                ]
            }
        }),

        makeStoryStep({
            chapter: 9,
            progressMin: 38,
            title: {
                en: "Chapter 9 — The Promise",
                zh: "第 9 章——誓言",
                ja: "第9章 — 約束",
                ko: "챕터 9 — 약속"
            },
            bg: IMAGE_KEYS.ch9,
            text: {
                en: [
                    "Prince Adrian stands alone in the moonlit garden and thinks deeply about Princess Elira.",
                    "A shining vision of Elira appears before him, and her memory fills his heart with sorrow and hope.",
                    "The vision fades, but Prince Adrian's courage grows stronger as he makes his choice.",
                    "Under the bright moon, Prince Adrian promises that he will save Princess Elira, no matter how hard the journey will be."
                ],
                zh: [
                    "阿德里安王子独自站在月光下的花园里，深深思念着艾莉拉公主。",
                    "艾莉拉的明亮幻影出现在他面前，她的记忆让他的心中充满悲伤与希望。",
                    "幻影渐渐消失，但阿德里安王子在做出决定时，勇气变得更强。",
                    "在明亮月光下，阿德里安王子发誓，无论旅程多么艰难，他都要救出艾莉拉公主。"
                ],
                ja: [
                    "エイドリアン王子は月明かりの庭に一人で立ち、エリラ姫のことを深く思っていた。",
                    "彼の前にエリラの輝く幻が現れ、その記憶が悲しみと希望で彼の心を満たした。",
                    "幻は消えていったが、エイドリアン王子の勇気は決意とともに強くなった。",
                    "明るい月の下で、エイドリアン王子は、どれほど旅が厳しくてもエリラ姫を救うと誓った。"
                ],
                ko: [
                    "아드리안 왕자는 달빛 비치는 정원에 홀로 서서 엘리라 공주를 깊이 생각했다.",
                    "엘리라의 빛나는 환영이 그의 앞에 나타났고, 그녀의 기억은 그의 마음을 슬픔과 희망으로 채웠다.",
                    "환영은 사라졌지만 아드리안 왕자의 용기는 결심과 함께 더욱 강해졌다.",
                    "밝은 달 아래에서 아드리안 왕자는 여정이 아무리 힘들어도 엘리라 공주를 구하겠다고 맹세했다."
                ]
            },
            dialogue: {
                en: ["", "", "", "Prince Adrian: I promise I will save her."],
                zh: ["", "", "", "阿德里安王子: 我发誓，我一定会救她。"],
                ja: ["", "", "", "エイドリアン王子: 必ず彼女を救うと約束する。"],
                ko: ["", "", "", "아드리안 왕자: 나는 반드시 그녀를 구하겠다고 약속한다."]
            }
        }),

        makeChoiceStep({
            chapter: 10,
            progressMin: 44,
            title: {
                en: "Chapter 10 — Horse or Dragon",
                zh: "第 10 章——战马还是巨龙",
                ja: "第10章 — 馬かドラゴンか",
                ko: "챕터 10 — 말인가 드래곤인가"
            },
            bg: IMAGE_KEYS.ch10,
            text: {
                en: [
                    "Prince Adrian goes to the royal stable as the sun rises, ready to begin his journey.",
                    "There he sees a strong war horse, noble and loyal, waiting for his command.",
                    "He also sees a great dragon, fierce and powerful, ready to carry him through the sky.",
                    "Prince Adrian stands before both paths, knowing he must choose the ride that will carry him into danger."
                ],
                zh: [
                    "太阳升起时，阿德里安王子来到皇家马厩，准备开始他的旅程。",
                    "在那里，他看到一匹强壮的战马，高贵而忠诚，正等待他的命令。",
                    "他也看到一头伟大的巨龙，凶猛而强大，准备载着他飞向天空。",
                    "阿德里安王子站在两条道路前，知道自己必须选择将带他进入危险的坐骑。"
                ],
                ja: [
                    "朝日が昇るころ、エイドリアン王子は旅立つ準備をして王家の厩舎へ向かった。",
                    "そこには高貴で忠実な力強い軍馬が、彼の命令を待っていた。",
                    "さらに、空を駆けるための獰猛で強大なドラゴンも見えた。",
                    "エイドリアン王子は二つの道の前に立ち、危険へ向かう相棒を選ばねばならないと知っていた。"
                ],
                ko: [
                    "해가 떠오르자 아드리안 왕자는 여행을 시작할 준비를 하고 왕실 마구간으로 갔다.",
                    "그곳에서 그는 고귀하고 충성스러운 강한 전쟁마가 자신의 명령을 기다리고 있는 것을 보았다.",
                    "그는 또한 하늘을 가르며 그를 실어 나를 거대한 드래곤도 보았다.",
                    "아드리안 왕자는 두 길 앞에 서서 자신을 위험 속으로 데려갈 탈것을 선택해야 함을 알았다."
                ]
            },
            dialogue: {
                en: ["", "", "", ""],
                zh: ["", "", "", ""],
                ja: ["", "", "", ""],
                ko: ["", "", "", ""]
            },
            render: function() {
                var currentScene = getSceneIndex();

                renderStoryAndDialogue(
                    getSceneContent(this.text, currentScene),
                    getSceneContent(this.dialogue, currentScene)
                );

                if (hasMoreImagesInStep(this, getStep())) {
                    renderChoicesButtons([]);
                    setStageNavVisibility(true, true);
                    return;
                }

                renderChoicesButtons([{
                        text: {
                            en: "Choose the Horse",
                            zh: "选择战马",
                            ja: "馬を選ぶ",
                            ko: "말 선택하기"
                        },
                        onClick: function() {
                            safeSet(KEYS.mount, "Horse");
                            unlockAchievement("chose_horse");
                            next();
                        }
                    },
                    {
                        text: {
                            en: "Choose the Dragon",
                            zh: "选择巨龙",
                            ja: "ドラゴンを選ぶ",
                            ko: "드래곤 선택하기"
                        },
                        onClick: function() {
                            safeSet(KEYS.mount, "Dragon");
                            unlockAchievement("chose_dragon");
                            next();
                        }
                    }
                ]);

                setStageNavVisibility(true, false);
            }
        }),

        makeStoryStep({
            chapter: 11,
            progressMin: 48,
            title: {
                en: "Chapter 11 — The Long Road",
                zh: "第 11 章——漫长的道路",
                ja: "第11章 — 長い道",
                ko: "챕터 11 — 긴 길"
            },
            getBg: function() {
                return getChapterPathImages(11);
            },
            text: {
                en: "{journeyFlavor}\n\nAfter a long journey, Adrian feels tired and hungry. Still, he rides on as the witch's castle waits far ahead.",
                zh: "{journeyFlavor}\n\n经过漫长的旅程后，阿德里安感到疲惫又饥饿。即便如此，他仍继续前行，因为女巫的城堡还在远方等着他。",
                ja: "{journeyFlavor}\n\n長い旅の末、エイドリアンは疲れと空腹を感じていた。それでも、遠く先にある魔女の城へ向かって進み続けた。",
                ko: "{journeyFlavor}\n\n긴 여정 끝에 아드리안은 지치고 배가 고팠다. 그래도 그는 멀리 앞에 있는 마녀의 성을 향해 계속 나아갔다."
            },
            dialogue: {
                en: "Prince Adrian: I must keep going. Elira is waiting for me.",
                zh: "阿德里安王子: 我必须继续前进。艾莉拉在等我。",
                ja: "エイドリアン王子: 進み続けなければ。エリラが待っている。",
                ko: "아드리안 왕자: 계속 가야 한다. 엘리라가 나를 기다리고 있다."
            }
        }),

        makeStoryStep({
            chapter: 12,
            progressMin: 52,
            title: {
                en: "Chapter 12 — The Traveler",
                zh: "第 12 章——旅人",
                ja: "第12章 — 旅人",
                ko: "챕터 12 — 여행자"
            },
            getBg: function() {
                return getChapterPathImages(12).slice(0, 1);
            },
            text: {
                en: ["Adrian meets a stranger on the dark road."],
                zh: ["阿德里安在黑暗的道路上遇见了一位陌生人。"],
                ja: ["エイドリアンは暗い道で見知らぬ旅人に出会った。"],
                ko: ["아드리안은 어두운 길에서 한 낯선 이를 만났다."]
            },
            dialogue: {
                en: [
                    "Prince Adrian: Who are you?\n\nTraveler: A traveler with a small task.\nTraveler: Will you help me?\nPrince Adrian: Yes, I will."
                ],
                zh: [
                    "阿德里安王子: 你是谁？\n\n旅人: 一个有小请求的旅人。\n旅人: 你愿意帮助我吗？\n阿德里安王子: 是的，我愿意。"
                ],
                ja: [
                    "エイドリアン王子: 君は誰だ？\n\n旅人: ちょっとした頼みごとのある旅人です。\n旅人: 手伝ってくれますか？\nエイドリアン王子: ああ、手伝おう。"
                ],
                ko: [
                    "아드리안 왕자: 당신은 누구요?\n\n여행자: 작은 부탁이 있는 여행자입니다.\n여행자: 저를 도와주시겠습니까?\n아드리안 왕자: 그래, 돕겠다."
                ]
            }
        }),

        makeGameStep(
            "test2_traveler",
            STEP_INDEX.CH12_TRAVELER_REWARD,
            12,
            function() {
                return getChapterPathImages(12).slice(0, 1);
            },
            function() {
                setCharm(true);
                unlockAchievement("earned_lucky_charm");
            }, {
                en: "Adrian finishes the traveler's brain test. The path to the next chapter is now open.",
                zh: "阿德里安完成了旅人的脑力测试。前往下一章的道路已经开启。",
                ja: "エイドリアンは旅人の脳力テストを終えた。次の章への道が開かれた。",
                ko: "아드리안은 여행자의 두뇌 테스트를 마쳤다. 이제 다음 챕터로 가는 길이 열렸다."
            }
        ),

        makeStoryStep({
            chapter: 12,
            progressMin: 54,
            title: {
                en: "Chapter 12 — The Traveler",
                zh: "第 12 章——旅人",
                ja: "第12章 — 旅人",
                ko: "챕터 12 — 여행자"
            },
            getBg: function() {
                return getChapterPathImages(12).slice(1, 2);
            },
            text: {
                en: ["The stranger asks Adrian to do a small mission. Adrian agrees, and the stranger gives him food for the journey."],
                zh: ["陌生人请阿德里安帮忙完成一个小任务。阿德里安答应了，陌生人便给了他旅途中需要的食物。"],
                ja: ["見知らぬ旅人はエイドリアンに小さな頼みをした。エイドリアンはそれを受け入れ、旅人は彼に旅の食料を渡した。"],
                ko: ["낯선 이는 아드리안에게 작은 부탁을 했다. 아드리안은 그것을 받아들였고, 낯선 이는 그에게 여정에 필요한 음식을 주었다."]
            },
            dialogue: {
                en: [
                    "Traveler: Then take this food. You will need strength for the road ahead.\nPrince Adrian: Thank you."
                ],
                zh: [
                    "旅人: 那就收下这些食物吧。前方的路上你会需要力量。\n阿德里安王子: 谢谢你。"
                ],
                ja: [
                    "旅人: ではこの食べ物を持っていきなさい。先の道には力が必要です。\nエイドリアン王子: ありがとう。"
                ],
                ko: [
                    "여행자: 그렇다면 이 음식을 가져가세요. 앞으로의 길에는 힘이 필요할 것입니다.\n아드리안 왕자: 고맙소."
                ]
            }
        }),

        makeStoryStep({
            chapter: 13,
            progressMin: 56,
            title: {
                en: "Chapter 13 — The Lucky Charm",
                zh: "第 13 章——幸运护符",
                ja: "第13章 — 幸運のお守り",
                ko: "챕터 13 — 행운의 부적"
            },
            getBg: function() {
                return getChapterPathImages(13);
            },
            text: {
                en: [
                    "A warm golden light shines in front of Adrian and the traveler.",
                    "The traveler gives Adrian a Lucky Charm from the shining light.",
                    "Adrian holds the charm as it glows on the dark road."
                ],
                zh: [
                    "温暖的金色光芒在阿德里安和旅人面前闪耀。",
                    "旅人从闪耀的光中将幸运护符交给阿德里安。",
                    "阿德里安握着护符，它在黑暗的道路上发出微光。"
                ],
                ja: [
                    "温かな黄金の光がエイドリアンと旅人の前に輝いた。",
                    "旅人はその光の中から幸運のお守りをエイドリアンに渡した。",
                    "エイドリアンは暗い道の上で輝くお守りを手にした。"
                ],
                ko: [
                    "따뜻한 황금빛이 아드리안과 여행자 앞에서 빛났다.",
                    "여행자는 그 빛 속에서 행운의 부적을 꺼내 아드리안에게 건넸다.",
                    "아드리안은 어두운 길 위에서 빛나는 부적을 손에 쥐었다."
                ]
            },
            dialogue: {
                en: [
                    "Prince Adrian: What is this?\n\nTraveler: A light to help you.",
                    "Traveler: Take this Lucky Charm.\nPrince Adrian: Thank you. I will keep it with me.",
                    ""
                ],
                zh: [
                    "阿德里安王子: 这是什么？\n\n旅人: 这是帮助你的光。",
                    "旅人: 收下这个幸运护符吧。\n阿德里安王子: 谢谢你。我会把它一直带在身边。",
                    ""
                ],
                ja: [
                    "エイドリアン王子: これは何だ？\n\n旅人: あなたを助ける光です。",
                    "旅人: この幸運のお守りを持っていきなさい。\nエイドリアン王子: ありがとう。大切に持っていく。",
                    ""
                ],
                ko: [
                    "아드리안 왕자: 이것은 무엇이오?\n\n여행자: 당신을 도울 빛입니다.",
                    "여행자: 이 행운의 부적을 가지세요.\n아드리안 왕자: 고맙소. 잘 간직하겠소.",
                    ""
                ]
            }
        }),

        makeStoryStep({
            chapter: 14,
            progressMin: 60,
            title: {
                en: "Chapter 14 — The Wise Old Man",
                zh: "第 14 章——睿智老人",
                ja: "第14章 — 賢い老人",
                ko: "챕터 14 — 현명한 노인"
            },
            getBg: function() {
                return getChapterPathImages(14).slice(0, 3);
            },
            text: {
                en: [
                    "Adrian meets a wise old man near a broken tower.",
                    "The old man warns him about the witch's dangerous roads.",
                    "A magic light appears as the old man prepares a test."
                ],
                zh: [
                    "阿德里安在一座破旧高塔旁遇见了一位睿智老人。",
                    "老人警告他，女巫的道路十分危险。",
                    "当老人准备试炼时，一道魔法之光显现出来。"
                ],
                ja: [
                    "エイドリアンは壊れた塔のそばで賢い老人に出会った。",
                    "老人は魔女の道が危険で満ちていると警告した。",
                    "老人が試練を準備すると、魔法の光が現れた。"
                ],
                ko: [
                    "아드리안은 부서진 탑 근처에서 현명한 노인을 만났다.",
                    "노인은 마녀의 길이 위험으로 가득하다고 경고했다.",
                    "노인이 시험을 준비하자 마법의 빛이 나타났다."
                ]
            },
            dialogue: {
                en: [
                    "Old Man: You have come far, prince.\nPrince Adrian: I must reach the witch's castle.",
                    "Old Man: The road ahead is full of tricks.\nPrince Adrian: Then help me find the true way.",
                    "Old Man: Solve my test, and I will help you.\nPrince Adrian: I will try."
                ],
                zh: [
                    "老人: 王子啊，你已经走了很远。\n阿德里安王子: 我必须到达女巫的城堡。",
                    "老人: 前方的道路充满陷阱。\n阿德里安王子: 那就请帮我找到真正的道路。",
                    "老人: 解开我的考验，我就会帮助你。\n阿德里安王子: 我会试试。"
                ],
                ja: [
                    "老人: よくここまで来たな、王子よ。\nエイドリアン王子: 魔女の城へ行かねばなりません。",
                    "老人: この先の道は罠で満ちておる。\nエイドリアン王子: ならば、本当の道を見つける手助けをしてください。",
                    "老人: わしの試練を解けば、助けてやろう。\nエイドリアン王子: 挑戦します。"
                ],
                ko: [
                    "노인: 왕자여, 멀리까지 왔구나.\n아드리안 왕자: 저는 마녀의 성에 도달해야 합니다.",
                    "노인: 앞길은 속임수로 가득하다.\n아드리안 왕자: 그렇다면 진짜 길을 찾도록 도와주십시오.",
                    "노인: 내 시험을 풀면 너를 도와주마.\n아드리안 왕자: 해보겠습니다."
                ]
            }
        }),

        makeGameStep(
            "test3_wise_old_man",
            STEP_INDEX.CH15_MAGIC_MAP_INTRO,
            14,
            function() {
                return getChapterPathImages(14).slice(2, 3);
            },
            function() {
                unlockAchievement("passed_wise_old_man_trial");
            }, {
                en: "Adrian solves the wise old man's test. The path to the Magic Map is now open.",
                zh: "阿德里安解开了睿智老人的考验。通往魔法地图的道路已经开启。",
                ja: "エイドリアンは賢い老人の試練を解いた。魔法の地図への道が開かれた。",
                ko: "아드리안은 현명한 노인의 시험을 풀었다. 이제 마법 지도로 가는 길이 열렸다."
            }
        ),

        makeStoryStep({
            chapter: 15,
            progressMin: 64,
            title: {
                en: "Chapter 15 — The Magic Map",
                zh: "第 15 章——魔法地图",
                ja: "第15章 — 魔法の地図",
                ko: "챕터 15 — 마법 지도"
            },
            getBg: function() {
                return getChapterPathImages(15).slice(0, 1);
            },
            text: {
                en: ["The old man opens an ancient scroll before Adrian."],
                zh: ["老人打开一张古老卷轴，展现在阿德里安面前。"],
                ja: ["老人はエイドリアンの前で古い巻物を広げた。"],
                ko: ["노인은 아드리안 앞에서 오래된 두루마리를 펼쳤다."]
            },
            dialogue: {
                en: [
                    "Old Man: You have done well, prince.\nPrince Adrian: What is this gift?"
                ],
                zh: [
                    "老人: 王子，你做得很好。\n阿德里安王子: 这份礼物是什么？"
                ],
                ja: [
                    "老人: よくやった、王子よ。\nエイドリアン王子: この贈り物は何ですか？"
                ],
                ko: [
                    "노인: 잘 해냈구나, 왕자여.\n아드리안 왕자: 이 선물은 무엇입니까?"
                ]
            }
        }),

        makeGameStep(
            "test4_magic_map",
            STEP_INDEX.CH15_MAGIC_MAP_REWARD,
            15,
            function() {
                return getChapterPathImages(15).slice(1, 2);
            },
            function() {
                setMap(true);
                unlockAchievement("earned_magic_map");
            }, {
                en: "The prince solves the puzzle. The Magic Map awakens and reveals the safe road ahead.",
                zh: "王子解开了谜题。魔法地图苏醒，并显现出前方安全的道路。",
                ja: "王子は謎を解いた。魔法の地図が目覚め、安全な道を示した。",
                ko: "왕자는 퍼즐을 풀었다. 마법 지도가 깨어나 앞으로의 안전한 길을 보여주었다."
            }
        ),

        makeStoryStep({
            chapter: 15,
            progressMin: 66,
            title: {
                en: "Chapter 15 — The Magic Map",
                zh: "第 15 章——魔法地图",
                ja: "第15章 — 魔法の地図",
                ko: "챕터 15 — 마법 지도"
            },
            getBg: function() {
                return getChapterPathImages(15).slice(2, 3);
            },
            text: {
                en: ["The Magic Map glows and shows the safe road ahead."],
                zh: ["魔法地图发出光芒，显示出前方安全的道路。"],
                ja: ["魔法の地図が輝き、安全な道を示した。"],
                ko: ["마법 지도는 빛나며 앞으로의 안전한 길을 보여주었다."]
            },
            dialogue: {
                en: [
                    "Old Man: Take the Magic Map.\nPrince Adrian: Now I can find the true road."
                ],
                zh: [
                    "老人: 带上这张魔法地图吧。\n阿德里安王子: 现在我能找到真正的道路了。"
                ],
                ja: [
                    "老人: この魔法の地図を持っていきなさい。\nエイドリアン王子: これで本当の道が見つけられる。"
                ],
                ko: [
                    "노인: 이 마법 지도를 가져가라.\n아드리안 왕자: 이제 진짜 길을 찾을 수 있습니다."
                ]
            }
        }),

        makeStoryStep({
            chapter: 16,
            progressMin: 68,
            title: {
                en: "Chapter 16 — The Warrior's Challenge",
                zh: "第 16 章——战士的挑战",
                ja: "第16章 — 戦士の試練",
                ko: "챕터 16 — 전사의 도전"
            },
            getBg: function() {
                return getChapterPathImages(16).slice(0, 2);
            },
            text: {
                en: [
                    "On a broken bridge, Adrian meets a warrior blocking the way.",
                    "The warrior stops him and calls for a trial of courage."
                ],
                zh: [
                    "在一座断裂的桥上，阿德里安遇见了一位拦路的战士。",
                    "战士拦住了他，并要求进行一场勇气试炼。"
                ],
                ja: [
                    "壊れた橋の上で、エイドリアンは道を塞ぐ戦士に出会った。",
                    "戦士は彼を止め、勇気の試練を求めた。"
                ],
                ko: [
                    "부서진 다리 위에서 아드리안은 길을 막고 선 전사를 만났다.",
                    "전사는 그를 막아 세우고 용기의 시험을 요구했다."
                ]
            },
            dialogue: {
                en: [
                    "Warrior: No one crosses this bridge without a trial.\nPrince Adrian: Then test me.",
                    "Warrior: Show me your courage.\nPrince Adrian: I will not turn back."
                ],
                zh: [
                    "战士: 没有人能不经过试炼就穿过这座桥。\n阿德里安王子: 那就考验我吧。",
                    "战士: 让我看看你的勇气。\n阿德里安王子: 我绝不会后退。"
                ],
                ja: [
                    "戦士: 試練なしでこの橋を渡れる者はいない。\nエイドリアン王子: ならば試してくれ。",
                    "戦士: お前の勇気を見せてみろ。\nエイドリアン王子: 私は決して引き返さない。"
                ],
                ko: [
                    "전사: 시험 없이 이 다리를 건널 수 있는 자는 없다.\n아드리안 왕자: 그렇다면 나를 시험하라.",
                    "전사: 너의 용기를 보여라.\n아드리안 왕자: 나는 절대 물러서지 않겠다."
                ]
            }
        }),

        makeGameStep(
            "test5_sword_light",
            STEP_INDEX.CH16_SWORD_REWARD,
            16,
            function() {
                return getChapterPathImages(16).slice(2, 3);
            },
            function() {
                setSword(true);
                unlockAchievement("earned_sword_of_light");
            }, {
                en: "Adrian passes the warrior's challenge and earns the Sword of Light.",
                zh: "阿德里安通过了战士的挑战，获得了光明之剑。",
                ja: "エイドリアンは戦士の試練を乗り越え、光の剣を手に入れた。",
                ko: "아드리안은 전사의 도전을 통과해 빛의 검을 얻었다."
            }
        ),

        makeStoryStep({
            chapter: 16,
            progressMin: 70,
            title: {
                en: "Chapter 16 — The Warrior's Challenge",
                zh: "第 16 章——战士的挑战",
                ja: "第16章 — 戦士の試練",
                ko: "챕터 16 — 전사의 도전"
            },
            getBg: function() {
                return getChapterPathImages(16).slice(3, 4);
            },
            text: {
                en: ["A bright Sword of Light appears between them, and the warrior gives it to Adrian."],
                zh: ["一把明亮的光明之剑出现在他们之间，战士将它交给了阿德里安。"],
                ja: ["二人の間にまばゆい光の剣が現れ、戦士はそれをエイドリアンに授けた。"],
                ko: ["그들 사이에 밝은 빛의 검이 나타났고, 전사는 그것을 아드리안에게 건넸다."]
            },
            dialogue: {
                en: [
                    "Warrior: You have passed.\nWarrior: Take the Sword of Light.\nPrince Adrian: I will use it against the darkness."
                ],
                zh: [
                    "战士: 你通过了。\n战士: 带上这把光明之剑。\n阿德里安王子: 我会用它对抗黑暗。"
                ],
                ja: [
                    "戦士: お前は合格だ。\n戦士: この光の剣を持っていけ。\nエイドリアン王子: この剣で闇に立ち向かう。"
                ],
                ko: [
                    "전사: 너는 통과했다.\n전사: 이 빛의 검을 가져가라.\n아드리안 왕자: 나는 이것으로 어둠에 맞설 것이다."
                ]
            }
        }),

        makeStoryStep({
            chapter: 17,
            progressMin: 72,
            title: {
                en: "Chapter 17 — The Land of Shadow",
                zh: "第 17 章——阴影之地",
                ja: "第17章 — 影の地",
                ko: "챕터 17 — 그림자의 땅"
            },
            getBg: function() {
                return getChapterPathImages(17);
            },
            text: {
                en: [
                    "Prince Adrian entered the Land of Shadow. The road was broken, and the dark castle stood far away.",
                    "He rode deeper into the silent land. Burned trees, ruined towers, and cold stone filled the empty road.",
                    "Then he saw the witch's castle rising high above the dark hills, like a black mountain under the storm.",
                    "Adrian rode on without fear. The cold wind touched his face, but his courage did not break. He still carried the Lucky Charm, the Magic Map, and the Sword of Light."
                ],
                zh: [
                    "阿德里安王子进入了阴影之地。道路破碎不堪，黑暗城堡矗立在远方。",
                    "他骑行进入更深的死寂之地。烧焦的树木、残破的高塔和冰冷的石路填满了空旷道路。",
                    "随后，他看见女巫的城堡高高耸立在黑暗山丘之上，如同暴风雨下的黑色山峰。",
                    "阿德里安毫无畏惧地继续前行。寒风掠过他的脸庞，但他的勇气没有被击碎。他仍带着幸运护符、魔法地图和光明之剑。"
                ],
                ja: [
                    "エイドリアン王子は影の地へ足を踏み入れた。道は壊れ、暗い城は遠くにそびえていた。",
                    "彼は静まり返った土地の奥へ進んだ。焼けた木々、崩れた塔、冷たい石が道を満たしていた。",
                    "やがて、嵐の下の黒い山のように、魔女の城が暗い丘の上に高くそびえているのが見えた。",
                    "エイドリアンは恐れずに進み続けた。冷たい風が顔に触れたが、その勇気は揺るがなかった。彼はなお、幸運のお守り、魔法の地図、そして光の剣を携えていた。"
                ],
                ko: [
                    "아드리안 왕자는 그림자의 땅으로 들어갔다. 길은 부서져 있었고, 어두운 성은 멀리 서 있었다.",
                    "그는 침묵의 땅 깊숙이 말을 몰았다. 불탄 나무와 무너진 탑, 차가운 돌이 텅 빈 길을 채우고 있었다.",
                    "그리고 그는 폭풍 아래 검은 산처럼 어두운 언덕 위로 솟아오른 마녀의 성을 보았다.",
                    "아드리안은 두려움 없이 계속 나아갔다. 차가운 바람이 그의 얼굴을 스쳤지만 용기는 꺾이지 않았다. 그는 여전히 행운의 부적과 마법 지도, 그리고 빛의 검을 지니고 있었다."
                ]
            },
            dialogue: {
                en: [
                    "Prince Adrian: So this is the witch's land.\nPrince Adrian: Even the wind feels cold and dead.",
                    "Prince Adrian: No life remains here.\nPrince Adrian: I must keep going.",
                    "Prince Adrian: Her castle is near now.\nPrince Adrian: Elira, wait for me.",
                    "Prince Adrian: I have come too far to stop.\nPrince Adrian: I will face whatever waits ahead."
                ],
                zh: [
                    "阿德里安王子: 原来这里就是女巫的土地。\n阿德里安王子: 连风都显得冰冷而死寂。",
                    "阿德里安王子: 这里已经没有生命了。\n阿德里安王子: 我必须继续前进。",
                    "阿德里安王子: 她的城堡现在已经很近了。\n阿德里安王子: 艾莉拉，等我。",
                    "阿德里安王子: 我已经走得太远，不能停下。\n阿德里安王子: 无论前方等待着什么，我都会面对。"
                ],
                ja: [
                    "エイドリアン王子: ここが魔女の地か。\nエイドリアン王子: 風さえ冷たく死んでいるようだ。",
                    "エイドリアン王子: ここにはもう命が残っていない。\nエイドリアン王子: それでも進まねばならない。",
                    "エイドリアン王子: あの城はもう近い。\nエイドリアン王子: エリラ、待っていてくれ。",
                    "エイドリアン王子: ここまで来て止まることはできない。\nエイドリアン王子: この先に何が待っていても立ち向かう。"
                ],
                ko: [
                    "아드리안 왕자: 여기가 바로 마녀의 땅이구나.\n아드리안 왕자: 바람조차 차갑고 죽어 있는 것 같아.",
                    "아드리안 왕자: 여기에는 생명이 남아 있지 않아.\n아드리안 왕자: 그래도 계속 가야 한다.",
                    "아드리안 왕자: 그녀의 성이 이제 가까워졌어.\n아드리안 왕자: 엘리라, 기다려.",
                    "아드리안 왕자: 여기까지 와서 멈출 수는 없다.\n아드리안 왕자: 앞에 무엇이 있든 맞서겠다."
                ]
            }
        }),

        makeChoiceStep({
            chapter: 18,
            progressMin: 76,
            title: {
                en: "Chapter 18 — The Whispering Forest",
                zh: "第 18 章——低语森林",
                ja: "第18章 — ささやく森",
                ko: "챕터 18 — 속삭이는 숲"
            },
            getBg: function() {
                return getChapterPathImages(18);
            },
            text: {
                en: [
                    "Prince Adrian rides into a dark forest. Cold mist covers the narrow path.",
                    "Strange spirits appear in the shadows. They whisper from both sides and try to confuse him.",
                    "Two false paths glow before him. Adrian stops and studies the forest in silence.",
                    "He rides on with care, trusting his heart more than the whispers."
                ],
                zh: [
                    "阿德里安王子骑入一片黑暗森林。冰冷的雾气笼罩着狭窄小路。",
                    "奇异的灵体出现在阴影中。它们从两边低语，试图让他迷失方向。",
                    "两条虚假的道路在他面前发光。阿德里安停下来，默默观察着森林。",
                    "他谨慎地继续前行，比起低语，更相信自己的内心。"
                ],
                ja: [
                    "エイドリアン王子は暗い森へと進んだ。冷たい霧が狭い道を覆っている。",
                    "奇妙な精霊たちが影の中に現れ、両側からささやいて彼を惑わせようとした。",
                    "二つの偽りの道が彼の前で光った。エイドリアンは立ち止まり、静かに森を見つめた。",
                    "彼はささやきよりも自分の心を信じ、慎重に進み続けた。"
                ],
                ko: [
                    "아드리안 왕자는 어두운 숲으로 들어갔다. 차가운 안개가 좁은 길을 덮고 있었다.",
                    "이상한 정령들이 그림자 속에 나타났다. 그들은 양쪽에서 속삭이며 그를 혼란스럽게 하려 했다.",
                    "두 개의 거짓 길이 그의 앞에서 빛났다. 아드리안은 멈춰 서서 조용히 숲을 살폈다.",
                    "그는 속삭임보다 자신의 마음을 더 믿으며 조심스럽게 앞으로 나아갔다."
                ]
            },
            dialogue: {
                en: [
                    "Prince Adrian: This forest feels alive.\nPrince Adrian: I must stay alert.",
                    "Forest Voice: Come this way, prince.\nAnother Voice: No, follow me.\n\nPrince Adrian: These voices speak with lies.",
                    "Prince Adrian: Left or right, both may be traps.\nPrince Adrian: I must choose wisely.",
                    "Prince Adrian: I will not fear your voices.\nPrince Adrian: I will find the true path."
                ],
                zh: [
                    "阿德里安王子: 这片森林仿佛活着一样。\n阿德里安王子: 我必须保持警惕。",
                    "森林之声: 走这边，王子。\n另一个声音: 不，跟我来。\n\n阿德里安王子: 这些声音都在说谎。",
                    "阿德里安王子: 左边还是右边，两边都可能是陷阱。\n阿德里安王子: 我必须明智地选择。",
                    "阿德里安王子: 我不会害怕你们的声音。\n阿德里安王子: 我会找到真正的道路。"
                ],
                ja: [
                    "エイドリアン王子: この森は生きているようだ。\nエイドリアン王子: 気を抜いてはならない。",
                    "森の声: こちらへ来い、王子よ。\nもう一つの声: いや、私について来い。\n\nエイドリアン王子: この声たちは嘘を語っている。",
                    "エイドリアン王子: 左でも右でも、どちらも罠かもしれない。\nエイドリアン王子: 賢く選ばねば。",
                    "エイドリアン王子: お前たちの声には負けない。\nエイドリアン王子: 真の道を見つける。"
                ],
                ko: [
                    "아드리안 왕자: 이 숲은 살아 있는 것 같아.\n아드리안 왕자: 정신을 바짝 차려야 해.",
                    "숲의 목소리: 이쪽으로 와라, 왕자여.\n다른 목소리: 아니, 나를 따라와.\n\n아드리안 왕자: 이 목소리들은 거짓말을 하고 있어.",
                    "아드리안 왕자: 왼쪽도 오른쪽도 모두 함정일 수 있어.\n아드리안 왕자: 현명하게 선택해야 한다.",
                    "아드리안 왕자: 나는 너희의 목소리를 두려워하지 않겠다.\n아드리안 왕자: 진짜 길을 찾아내겠다."
                ]
            },
            render: function() {
                var currentScene = getSceneIndex();

                renderStoryAndDialogue(
                    getSceneContent(this.text, currentScene),
                    getSceneContent(this.dialogue, currentScene)
                );

                if (currentScene === 2) {
                    renderChoicesButtons([{
                            text: {
                                en: "Trust your own mind",
                                zh: "相信自己的判断",
                                ja: "自分の心を信じる",
                                ko: "자신의 판단을 믿기"
                            },
                            onClick: function() {
                                unlockAchievement("whispering_forest_choice");
                                next();
                            }
                        },
                        {
                            text: {
                                en: "Use the Magic Map",
                                zh: "使用魔法地图",
                                ja: "魔法の地図を使う",
                                ko: "마법 지도 사용하기"
                            },
                            disabled: !hasMap(),
                            onClick: function() {
                                unlockAchievement("used_magic_map_in_forest");
                                next();
                            }
                        },
                        {
                            text: {
                                en: "Ignore the voices and go on",
                                zh: "无视那些声音，继续前进",
                                ja: "声を無視して進む",
                                ko: "목소리를 무시하고 나아가기"
                            },
                            onClick: function() {
                                unlockAchievement("braved_whispering_forest");
                                next();
                            }
                        }
                    ]);
                    setStageNavVisibility(true, false);
                    return;
                }

                renderChoicesButtons([]);
                setStageNavVisibility(true, true);
            }
        }),

        makeStoryStep({
            chapter: 19,
            progressMin: 80,
            title: {
                en: "Chapter 19 — The Lake of Memories",
                zh: "第 19 章——记忆之湖",
                ja: "第19章 — 記憶の湖",
                ko: "챕터 19 — 기억의 호수"
            },
            getBg: function() {
                return getChapterPathImages(19);
            },
            text: {
                en: [
                    "Prince Adrian came to a quiet lake under falling water. Soft lights danced above the shining surface.",
                    "As he looked into the lake, warm memories rose from the water. He saw love, peace, and the happiness he had lost.",
                    "The beautiful visions called him to stay. For a moment, the lake felt kinder than the dark road ahead.",
                    "But Adrian turned away from the glowing water and rode on. The memories were sweet, yet Princess Elira still needed him."
                ],
                zh: [
                    "阿德里安王子来到一片安静的湖边，瀑水垂落，柔和的光在闪亮的湖面上跳动。",
                    "当他望向湖中时，温暖的回忆从水中升起。他看见了爱情、平静，以及自己失去的幸福。",
                    "那些美丽的幻景呼唤他留下来。有那么一瞬间，湖水似乎比前方黑暗的道路更加温柔。",
                    "但阿德里安还是转身离开了发光的湖面，继续骑行。那些回忆虽美好，可艾莉拉公主仍需要他。"
                ],
                ja: [
                    "エイドリアン王子は静かな湖へたどり着いた。流れ落ちる水の下で、柔らかな光が輝く水面の上で踊っていた。",
                    "湖をのぞき込むと、温かな記憶が水の中から浮かび上がった。愛、平和、そして失った幸福がそこにあった。",
                    "美しい幻は彼にここへ留まるよう誘った。一瞬だけ、この湖は前方の暗い道よりも優しく思えた。",
                    "しかしエイドリアンは光る水面から目をそらし、再び進んだ。思い出は甘くても、エリラ姫はまだ彼を必要としていた。"
                ],
                ko: [
                    "아드리안 왕자는 떨어지는 물 아래의 조용한 호수에 도착했다. 부드러운 빛이 반짝이는 수면 위에서 춤추고 있었다.",
                    "그가 호수를 들여다보자 따뜻한 기억들이 물속에서 떠올랐다. 그는 사랑과 평화, 그리고 자신이 잃어버린 행복을 보았다.",
                    "아름다운 환영은 그를 머물게 하려 했다. 잠시 동안 호수는 앞의 어두운 길보다 더 다정하게 느껴졌다.",
                    "하지만 아드리안은 빛나는 물에서 시선을 돌리고 다시 나아갔다. 기억은 달콤했지만 엘리라 공주는 여전히 그를 필요로 했다."
                ]
            },
            dialogue: {
                en: [
                    "Prince Adrian: This place feels calm.\nPrince Adrian: But strange magic lives here.",
                    "Lake Voice: Stay here, prince.\nLake Voice: Rest, and forget your pain.\n\nPrince Adrian: These memories are beautiful.",
                    "Lake Voice: Remain with us.\nLake Voice: Leave the pain behind.\n\nPrince Adrian: My heart wants peace, but I cannot stop now.",
                    "Prince Adrian: I will treasure these memories, but I must move on.\nPrince Adrian: Elira is waiting for me."
                ],
                zh: [
                    "阿德里安王子: 这里感觉很平静。\n阿德里安王子: 但这里存在着奇异的魔法。",
                    "湖之声: 留在这里吧，王子。\n湖之声: 休息吧，忘掉你的痛苦。\n\n阿德里安王子: 这些回忆真美。",
                    "湖之声: 与我们一同留下吧。\n湖之声: 把痛苦留在身后。\n\n阿德里安王子: 我的心渴望平静，但我现在不能停下。",
                    "阿德里安王子: 我会珍惜这些回忆，但我必须继续前进。\n阿德里安王子: 艾莉拉在等我。"
                ],
                ja: [
                    "エイドリアン王子: ここは穏やかに感じる。\nエイドリアン王子: だが、不思議な魔法が息づいている。",
                    "湖の声: ここに留まりなさい、王子よ。\n湖の声: 休み、痛みを忘れなさい。\n\nエイドリアン王子: この記憶は美しい。",
                    "湖の声: 私たちと共にここにいなさい。\n湖の声: 苦しみを捨てなさい。\n\nエイドリアン王子: 心は安らぎを望んでいる。だが今は止まれない。",
                    "エイドリアン王子: この記憶は胸にしまっておく。だが進まねばならない。\nエイドリアン王子: エリラが待っている。"
                ],
                ko: [
                    "아드리안 왕자: 이곳은 평온하게 느껴진다.\n아드리안 왕자: 하지만 이상한 마법이 살아 있어.",
                    "호수의 목소리: 여기 머물러라, 왕자여.\n호수의 목소리: 쉬고 너의 고통을 잊어라.\n\n아드리안 왕자: 이 기억들은 아름답구나.",
                    "호수의 목소리: 우리와 함께 남아라.\n호수의 목소리: 고통을 뒤에 두어라.\n\n아드리안 왕자: 내 마음은 평화를 원하지만 지금 멈출 수는 없다.",
                    "아드리안 왕자: 이 기억들을 소중히 간직하겠지만 나는 계속 가야 한다.\n아드리안 왕자: 엘리라가 나를 기다리고 있다."
                ]
            }
        }),

        makeChoiceStep({
            chapter: 20,
            progressMin: 84,
            title: {
                en: "Chapter 20 — The Castle Gate",
                zh: "第 20 章——城堡之门",
                ja: "第20章 — 城門",
                ko: "챕터 20 — 성문"
            },
            getBg: function() {
                return getChapterPathImages(20);
            },
            text: {
                en: [
                    "Prince Adrian reached the witch's castle gate. Fire burned around the walls, and dark magic sealed the entrance.",
                    "He stepped closer and saw glowing signs move across the great door. The gate was locked by a powerful spell.",
                    "Adrian raised his hand and studied the magic. Only wisdom and courage could break the final seal.",
                    "At last, the final seal broke. The great gate slowly opened, and the path into the castle stood before him."
                ],
                zh: [
                    "阿德里安王子来到女巫城堡的大门前。火焰在墙边燃烧，黑暗魔法封住了入口。",
                    "他走近后看见巨门上有发光符号移动。大门被强大的咒语锁住了。",
                    "阿德里安抬起手，仔细研究魔法。只有智慧与勇气才能打破最后的封印。",
                    "终于，最后的封印破碎了。巨大的城门缓缓开启，通往城堡内部的道路出现在他面前。"
                ],
                ja: [
                    "エイドリアン王子は魔女の城門にたどり着いた。炎が壁の周りで燃え、闇の魔法が入口を封じていた。",
                    "近づくと、大きな扉の上を光る印が動いているのが見えた。門は強力な呪文で閉ざされていた。",
                    "エイドリアンは手を上げ、その魔法を見極めた。最後の封印を破れるのは知恵と勇気だけだった。",
                    "ついに最後の封印が砕けた。大きな門はゆっくり開き、城への道が彼の前に現れた。"
                ],
                ko: [
                    "아드리안 왕자는 마녀의 성문에 도착했다. 불길이 벽 주위를 타오르고 있었고, 어둠의 마법이 입구를 봉인하고 있었다.",
                    "그가 가까이 다가가자 거대한 문 위로 빛나는 문양들이 움직이는 것이 보였다. 성문은 강력한 주문으로 잠겨 있었다.",
                    "아드리안은 손을 들어 그 마법을 살폈다. 마지막 봉인을 깨뜨릴 수 있는 것은 지혜와 용기뿐이었다.",
                    "마침내 마지막 봉인이 깨졌다. 거대한 문이 천천히 열리며 성 안으로 이어지는 길이 그의 앞에 펼쳐졌다."
                ]
            },
            dialogue: {
                en: [
                    "Prince Adrian: I have reached the castle at last.\nPrince Adrian: But the gate is sealed by dark power.",
                    "Prince Adrian: These signs are part of the witch's spell.\nPrince Adrian: I must understand them.",
                    "Prince Adrian: This is the final test before I see Elira.\nPrince Adrian: I will not fail now.",
                    "Prince Adrian: The gate is opening.\nPrince Adrian: Elira, I am coming."
                ],
                zh: [
                    "阿德里安王子: 我终于到达城堡了。\n阿德里安王子: 但大门被黑暗力量封住了。",
                    "阿德里安王子: 这些符号是女巫咒语的一部分。\n阿德里安王子: 我必须理解它们。",
                    "阿德里安王子: 这是见到艾莉拉前的最后考验。\n阿德里安王子: 我现在绝不能失败。",
                    "阿德里安王子: 大门正在打开。\n阿德里安王子: 艾莉拉，我来了。"
                ],
                ja: [
                    "エイドリアン王子: ついに城へたどり着いた。\nエイドリアン王子: だが門は闇の力で封じられている。",
                    "エイドリアン王子: この印は魔女の呪文の一部だ。\nエイドリアン王子: 解き明かさねばならない。",
                    "エイドリアン王子: エリラに会う前の最後の試練だ。\nエイドリアン王子: 今度こそ失敗しない。",
                    "エイドリアン王子: 門が開く。\nエイドリアン王子: エリラ、今行く。"
                ],
                ko: [
                    "아드리안 왕자: 마침내 성에 도착했다.\n아드리안 왕자: 하지만 문은 어둠의 힘으로 봉인되어 있어.",
                    "아드리안 왕자: 이 문양들은 마녀의 주문의 일부야.\n아드리안 왕자: 그것들을 이해해야 해.",
                    "아드리안 왕자: 이것이 엘리라를 만나기 전 마지막 시험이야.\n아드리안 왕자: 이제는 실패하지 않겠다.",
                    "아드리안 왕자: 문이 열리고 있어.\n아드리안 왕자: 엘리라, 지금 간다."
                ]
            },
            render: function() {
                var currentScene = getSceneIndex();
                var passedTest = hasTest("test7_castle_gate");

                /*
                   Chapter 20 lock rule:
                   Scene 0 = arrive at gate
                   Scene 1 = signs/spell
                   Scene 2 = final test
                   Scene 3 = gate opens ONLY after test is passed
                */

                if (!passedTest && currentScene > 2) {
                    setSceneIndex(2);
                    renderStep();
                    return;
                }

                renderStoryAndDialogue(
                    getSceneContent(this.text, currentScene),
                    getSceneContent(this.dialogue, currentScene)
                );

                if (currentScene === 2 && !passedTest) {
                    showLock({
                        en: "Complete the Castle Gate Brain Test before entering the castle.",
                        zh: "请先完成城门脑力测试，才能进入城堡。",
                        ja: "城に入る前に城門の脳力テストをクリアしてください。",
                        ko: "성에 들어가기 전에 성문 두뇌 테스트를 완료하세요."
                    }[getCurrentLanguage()] || "Complete the Castle Gate Brain Test before entering the castle.");

                    renderChoicesButtons([{
                        text: {
                            en: "Play the Castle Gate Brain Test",
                            zh: "开始城门脑力测试",
                            ja: "城門の脳力テストを始める",
                            ko: "성문 두뇌 테스트 시작하기"
                        },
                        onClick: function() {
                            unlockAchievement("reached_castle_gate");

                            /*
                               IMPORTANT:
                               Return to Chapter 20 after the test,
                               so the player can see the gate-opening scene.
                            */
                            launchGame(
                                "games/image-guess/index.html",
                                "test7_castle_gate",
                                STEP_INDEX.CH20_CASTLE_GATE,
                                "hard"
                            );
                        }
                    }]);

                    setStageNavVisibility(true, false);
                    return;
                }

                hideLock();
                renderChoicesButtons([]);
                setStageNavVisibility(true, true);
            }
        }),

        makeStoryStep({
            chapter: 21,
            progressMin: 88,
            title: {
                en: "Chapter 21 — The Dark Hall",
                zh: "第 21 章——黑暗大厅",
                ja: "第21章 — 闇の広間",
                ko: "챕터 21 — 어두운 홀"
            },
            getBg: function() {
                return getChapterPathImages(21).slice(0, 1);
            },
            text: {
                en: ["Adrian walks into a dark hall filled with fire and shadow."],
                zh: ["阿德里安走进了一座充满火焰与阴影的黑暗大厅。"],
                ja: ["エイドリアンは炎と影に満ちた暗い広間へ足を踏み入れた。"],
                ko: ["아드리안은 불길과 그림자로 가득한 어두운 홀로 들어갔다."]
            },
            dialogue: {
                en: ["Prince Adrian: The witch's castle is close now."],
                zh: ["阿德里安王子: 女巫的城堡近在眼前了。"],
                ja: ["エイドリアン王子: 魔女の城はもうすぐだ。"],
                ko: ["아드리안 왕자: 마녀의 성은 이제 가까워졌다."]
            }
        }),

        makeStoryStep({
            chapter: 21,
            progressMin: 90,
            title: {
                en: "Chapter 21 — The Crystal Stairs",
                zh: "第 21 章——水晶阶梯",
                ja: "第21章 — 水晶の階段",
                ko: "챕터 21 — 수정 계단"
            },
            getBg: function() {
                return getChapterPathImages(21).slice(1, 2);
            },
            text: {
                en: ["He climbs the crystal stairs toward a cold white light."],
                zh: ["他踏上水晶阶梯，朝着冰冷的白光攀登。"],
                ja: ["彼は冷たい白い光へ向かって水晶の階段を上っていった。"],
                ko: ["그는 차가운 흰빛을 향해 수정 계단을 올라갔다."]
            },
            dialogue: {
                en: ["Prince Adrian: Elira, wait for me. I am coming."],
                zh: ["阿德里安王子: 艾莉拉，等我。我来了。"],
                ja: ["エイドリアン王子: エリラ、待っていてくれ。今行く。"],
                ko: ["아드리안 왕자: 엘리라, 기다려. 내가 간다."]
            }
        }),

        makeStoryStep({
            chapter: 21,
            progressMin: 92,
            title: {
                en: "Chapter 21 — The Magic Prison",
                zh: "第 21 章——魔法牢笼",
                ja: "第21章 — 魔法の牢",
                ko: "챕터 21 — 마법 감옥"
            },
            getBg: function() {
                return getChapterPathImages(21).slice(2, 3);
            },
            text: {
                en: ["At the top, Adrian finds Elira trapped inside a shining magic prison."],
                zh: ["在顶端，阿德里安发现艾莉拉被困在闪亮的魔法牢笼中。"],
                ja: ["頂上で、エイドリアンは輝く魔法の牢に閉じ込められたエリラを見つけた。"],
                ko: ["정상에서 아드리안은 빛나는 마법 감옥 안에 갇힌 엘리라를 발견했다."]
            },
            dialogue: {
                en: ["Princess Elira: Adrian...\nPrince Adrian: Do not fear. I will free you."],
                zh: ["艾莉拉公主: 阿德里安……\n阿德里安王子: 不要害怕。我会救你出来。"],
                ja: ["エリラ姫: エイドリアン……\nエイドリアン王子: 恐れないで。必ず助ける。"],
                ko: ["엘리라 공주: 아드리안...\n아드리안 왕자: 두려워하지 마. 내가 너를 풀어줄게."]
            }
        }),

        makeStoryStep({
            chapter: 22,
            progressMin: 93,
            title: {
                en: "Chapter 22 — The Witch Appears",
                zh: "第 22 章——女巫现身",
                ja: "第22章 — 魔女が現れる",
                ko: "챕터 22 — 마녀가 나타나다"
            },
            getBg: function() {
                return getChapterPathImages(22).slice(0, 1);
            },
            text: {
                en: ["Witch Morvanna appears in a storm of dark magic and blocks Adrian's path."],
                zh: ["女巫莫瓦娜在黑暗魔法的风暴中出现，挡住了阿德里安的去路。"],
                ja: ["魔女モルヴァンナが闇の魔法の嵐の中に現れ、エイドリアンの道を塞いだ。"],
                ko: ["마녀 모르반나가 어둠의 마법 폭풍 속에 나타나 아드리안의 길을 막았다."]
            },
            dialogue: {
                en: ["Witch Morvanna: You are too late, foolish prince.\nPrince Adrian: I will stop you and save Elira."],
                zh: ["女巫莫瓦娜: 你来得太晚了，愚蠢的王子。\n阿德里安王子: 我会阻止你，救出艾莉拉。"],
                ja: ["魔女モルヴァンナ: 遅すぎたわ、愚かな王子。\nエイドリアン王子: お前を止めてエリラを救う。"],
                ko: ["마녀 모르반나: 너무 늦었다, 어리석은 왕자야.\n아드리안 왕자: 나는 너를 막고 엘리라를 구하겠다."]
            }
        }),

        makeStoryStep({
            chapter: 22,
            progressMin: 94,
            title: {
                en: "Chapter 22 — The First Clash",
                zh: "第 22 章——第一次交锋",
                ja: "第22章 — 最初の衝突",
                ko: "챕터 22 — 첫 번째 충돌"
            },
            getBg: function() {
                return getChapterPathImages(22).slice(1, 2);
            },
            text: {
                en: ["Adrian rushes forward as light and dark power crash together."],
                zh: ["阿德里安冲上前去，光与暗的力量猛烈碰撞。"],
                ja: ["光と闇の力が激突する中、エイドリアンは前へと突き進んだ。"],
                ko: ["빛과 어둠의 힘이 충돌하는 가운데 아드리안은 앞으로 돌진했다."]
            },
            dialogue: {
                en: ["Witch Morvanna: Your sword is nothing against me.\nPrince Adrian: Its light is stronger than your shadow."],
                zh: ["女巫莫瓦娜: 你的剑在我面前什么也不是。\n阿德里安王子: 它的光比你的阴影更强。"],
                ja: ["魔女モルヴァンナ: その剣では私には敵わない。\nエイドリアン王子: その光はお前の闇より強い。"],
                ko: ["마녀 모르반나: 네 검 따위는 내게 아무것도 아니다.\n아드리안 왕자: 그 빛은 너의 그림자보다 강하다."]
            }
        }),

        makeGameStep(
            "test6_final_battle",
            STEP_INDEX.CH22_MORVANNA_FALLS,
            22,
            function() {
                return getChapterPathImages(22).slice(2, 3);
            },
            function() {
                unlockAchievement("won_final_battle");
            }, {
                en: "Adrian defeats the witch's dark power and the light begins to win.",
                zh: "阿德里安击败了女巫的黑暗力量，光明开始取得胜利。",
                ja: "エイドリアンは魔女の闇の力を打ち破り、光が勝ち始めた。",
                ko: "아드리안은 마녀의 어둠의 힘을 물리쳤고 빛이 승리하기 시작했다."
            }
        ),

        makeStoryStep({
            chapter: 22,
            progressMin: 95,
            title: {
                en: "Chapter 22 — Morvanna Falls",
                zh: "第 22 章——莫瓦娜倒下",
                ja: "第22章 — モルヴァンナの敗北",
                ko: "챕터 22 — 모르반나의 몰락"
            },
            getBg: function() {
                return getChapterPathImages(22).slice(3, 4);
            },
            text: {
                en: ["The witch falls to the ground as her shadow power fades away."],
                zh: ["随着影之力量消散，女巫倒在了地上。"],
                ja: ["影の力が消え去る中、魔女は地に倒れた。"],
                ko: ["그림자의 힘이 사라지며 마녀는 땅에 쓰러졌다."]
            },
            dialogue: {
                en: ["Witch Morvanna: My power... is gone...\nPrince Adrian: Elira is free now."],
                zh: ["女巫莫瓦娜: 我的力量……消失了……\n阿德里安王子: 艾莉拉现在自由了。"],
                ja: ["魔女モルヴァンナ: 私の力が……消えていく……\nエイドリアン王子: これでエリラは自由だ。"],
                ko: ["마녀 모르반나: 내 힘이... 사라진다...\n아드리안 왕자: 이제 엘리라는 자유다."]
            }
        }),

        makeStoryStep({
            chapter: 23,
            progressMin: 96,
            title: {
                en: "Chapter 23 — Elira is Free",
                zh: "第 23 章——艾莉拉自由了",
                ja: "第23章 — エリラは解放された",
                ko: "챕터 23 — 엘리라는 자유로워졌다"
            },
            getBg: function() {
                return getChapterPathImages(23).slice(0, 1);
            },
            text: {
                en: ["The crystal prison breaks, and Adrian holds Elira at last."],
                zh: ["水晶牢笼破碎了，阿德里安终于拥抱住艾莉拉。"],
                ja: ["水晶の牢が砕け、ついにエイドリアンはエリラを抱きしめた。"],
                ko: ["수정 감옥이 깨지고, 마침내 아드리안은 엘리라를 품에 안았다."]
            },
            dialogue: {
                en: ["Princess Elira: Adrian, you saved me.\nPrince Adrian: I promised I would come."],
                zh: ["艾莉拉公主: 阿德里安，你救了我。\n阿德里安王子: 我答应过我会来的。"],
                ja: ["エリラ姫: エイドリアン、助けてくれたのね。\nエイドリアン王子: 必ず来ると約束したから。"],
                ko: ["엘리라 공주: 아드리안, 당신이 나를 구했어요.\n아드리안 왕자: 내가 오겠다고 약속했잖아."]
            }
        }),

        makeStoryStep({
            chapter: 23,
            progressMin: 97,
            title: {
                en: "Chapter 23 — Escape from the Castle",
                zh: "第 23 章——逃离城堡",
                ja: "第23章 — 城からの脱出",
                ko: "챕터 23 — 성에서 탈출"
            },
            getBg: function() {
                return getChapterPathImages(23).slice(1, 2);
            },
            text: {
                en: ["The castle begins to fall, and they run together through the ruins."],
                zh: ["城堡开始崩塌，他们一起穿过废墟奔跑。"],
                ja: ["城が崩れ始め、二人は廃墟の中を共に駆け抜けた。"],
                ko: ["성은 무너지기 시작했고, 그들은 함께 폐허를 가로질러 달렸다."]
            },
            dialogue: {
                en: ["Prince Adrian: Stay close to me.\nPrincess Elira: I will not leave your side."],
                zh: ["阿德里安王子: 紧跟着我。\n艾莉拉公主: 我不会离开你身边。"],
                ja: ["エイドリアン王子: そばを離れないで。\nエリラ姫: あなたのそばを離れないわ。"],
                ko: ["아드리안 왕자: 내 곁에 바짝 붙어 있어.\n엘리라 공주: 당신 곁을 떠나지 않을게요."]
            }
        }),

        makeStoryStep({
            chapter: 23,
            progressMin: 98,
            title: {
                en: "Chapter 23 — The Light Returns",
                zh: "第 23 章——光明归来",
                ja: "第23章 — 光の帰還",
                ko: "챕터 23 — 빛이 돌아오다"
            },
            getBg: function() {
                return getChapterPathImages(23).slice(2, 3);
            },
            text: {
                en: ["Outside, they see the light return across the land."],
                zh: ["来到外面后，他们看见光明重新洒满大地。"],
                ja: ["外へ出ると、二人は大地に光が戻っていくのを見た。"],
                ko: ["밖으로 나오자 그들은 대지 위로 빛이 다시 퍼지는 것을 보았다."]
            },
            dialogue: {
                en: ["Princess Elira: The darkness is gone.\nPrince Adrian: Peace has come back."],
                zh: ["艾莉拉公主: 黑暗消失了。\n阿德里安王子: 和平回来了。"],
                ja: ["エリラ姫: 闇は消えたわ。\nエイドリアン王子: 平和が戻った。"],
                ko: ["엘리라 공주: 어둠이 사라졌어요.\n아드리안 왕자: 평화가 돌아왔어."]
            }
        }),

        makeStoryStep({
            chapter: 23,
            progressMin: 99,
            title: {
                en: "Chapter 23 — Home Again",
                zh: "第 23 章——重返家园",
                ja: "第23章 — 再び故郷へ",
                ko: "챕터 23 — 다시 집으로"
            },
            getBg: function() {
                return getChapterPathImages(23).slice(3, 4);
            },
            text: {
                en: ["They return home, and the kingdom welcomes them with joy."],
                zh: ["他们回到了家园，整个王国都以喜悦迎接他们。"],
                ja: ["二人は故郷へ戻り、王国は喜びと共に彼らを迎えた。"],
                ko: ["그들은 집으로 돌아왔고, 왕국은 기쁨으로 그들을 맞이했다."]
            },
            dialogue: {
                en: ["King Alden: Welcome home, my children.\nPrince Adrian: The witch is gone.\nPrincess Elira: The kingdom is safe again."],
                zh: ["奥尔登国王: 欢迎回家，我的孩子们。\n阿德里安王子: 女巫已经不在了。\n艾莉拉公主: 王国再次安全了。"],
                ja: ["オールデン王: よく戻った、我が子たちよ。\nエイドリアン王子: 魔女はもういません。\nエリラ姫: 王国は再び安全です。"],
                ko: ["알덴 왕: 돌아왔구나, 나의 아이들아.\n아드리안 왕자: 마녀는 사라졌습니다.\n엘리라 공주: 왕국은 다시 안전해졌습니다."]
            }
        }),

        makeChoiceStep({
            chapter: 23,
            progressMin: 100,
            title: {
                en: "Chapter 23 — A New Dawn",
                zh: "第 23 章——新的黎明",
                ja: "第23章 — 新たな夜明け",
                ko: "챕터 23 — 새로운 새벽"
            },
            getBg: function() {
                return getChapterPathImages(23).slice(4, 5);
            },
            text: function() {
                var ending = evaluateEnding();

                if (ending === "true") {
                    return pickLang({
                        en: "Adrian and Elira look over the bright kingdom as a new dawn begins. Because Adrian completed every trial, kept every sacred item, and followed the hardest path with courage, the kingdom enters an age of peace remembered for generations.",
                        zh: "新的黎明开始时，阿德里安与艾莉拉俯瞰着明亮的王国。因为阿德里安完成了所有试炼，保留了每一件神圣之物，并以勇气走过最艰难的道路，王国迎来了将被世代铭记的和平时代。",
                        ja: "新たな夜明けの中、エイドリアンとエリラは明るい王国を見渡していた。エイドリアンがすべての試練を乗り越え、すべての聖なる品を守り、最も困難な道を勇気を持って進んだからこそ、王国は何世代にも語り継がれる平和の時代へ入った。",
                        ko: "새로운 새벽이 시작되자 아드리안과 엘리라는 밝아진 왕국을 바라보았다. 아드리안이 모든 시련을 완수하고 모든 신성한 아이템을 지키며 가장 어려운 길을 용기 있게 걸었기 때문에, 왕국은 여러 세대에 기억될 평화의 시대에 들어섰다."
                    });
                }

                if (ending === "heroic") {
                    return pickLang({
                        en: "Adrian and Elira look over the bright kingdom as a new dawn begins. The journey was hard, but Adrian's courage, wisdom, and devotion brought light back to the land.",
                        zh: "新的黎明开始时，阿德里安与艾莉拉俯瞰着明亮的王国。旅程虽然艰难，但阿德里安的勇气、智慧与奉献让光明重新回到了大地。",
                        ja: "新たな夜明けの中、エイドリアンとエリラは明るい王国を見渡していた。旅は困難だったが、エイドリアンの勇気、知恵、そして献身が大地に光を取り戻した。",
                        ko: "새로운 새벽이 시작되자 아드리안과 엘리라는 밝아진 왕국을 바라보았다. 여정은 험했지만, 아드리안의 용기와 지혜, 헌신이 이 땅에 다시 빛을 가져왔다."
                    });
                }

                return pickLang({
                    en: "Adrian and Elira look over the bright kingdom as a new dawn begins. Though the journey left its scars, peace has returned and hope rises again.",
                    zh: "新的黎明开始时，阿德里安与艾莉拉俯瞰着明亮的王国。虽然旅程留下了伤痕，但和平已经归来，希望再次升起。",
                    ja: "新たな夜明けの中、エイドリアンとエリラは明るい王国を見渡していた。旅は傷跡を残したが、平和は戻り、希望が再び昇った。",
                    ko: "새로운 새벽이 시작되자 아드리안과 엘리라는 밝아진 왕국을 바라보았다. 여정은 상처를 남겼지만 평화는 돌아왔고 희망은 다시 떠올랐다."
                });
            },
            dialogue: function() {
                var ending = evaluateEnding();

                if (ending === "true") {
                    return pickLang({
                        en: "Prince Adrian: The darkness is over.\nPrincess Elira: You brought back more than light. You brought back hope for the whole kingdom.",
                        zh: "阿德里安王子: 黑暗结束了。\n艾莉拉公主: 你带回来的不只是光明，而是整个王国的希望。",
                        ja: "エイドリアン王子: 闇は終わった。\nエリラ姫: あなたが取り戻したのは光だけじゃない。王国全体の希望もよ。",
                        ko: "아드리안 왕자: 어둠은 끝났다.\n엘리라 공주: 당신은 빛만 되찾아 온 것이 아니에요. 왕국 전체의 희망을 되찾아 왔어요."
                    });
                }

                if (ending === "heroic") {
                    return pickLang({
                        en: "Prince Adrian: A new day starts now.\nPrincess Elira: And we face it together, with peace restored.",
                        zh: "阿德里安王子: 新的一天现在开始了。\n艾莉拉公主: 而我们将一起迎接它，和平已经恢复。",
                        ja: "エイドリアン王子: 新しい日が今始まる。\nエリラ姫: そして、平和を取り戻した今、私たちは共にそれを迎えるのよ。",
                        ko: "아드리안 왕자: 이제 새로운 날이 시작된다.\n엘리라 공주: 그리고 평화가 회복된 지금, 우리는 함께 그것을 맞이할 거예요."
                    });
                }

                return pickLang({
                    en: "Prince Adrian: A new day starts now.\nPrincess Elira: Together, we can rebuild what was lost.",
                    zh: "阿德里安王子: 新的一天现在开始了。\n艾莉拉公主: 只要在一起，我们就能重建失去的一切。",
                    ja: "エイドリアン王子: 新しい日が今始まる。\nエリラ姫: 一緒なら、失ったものを取り戻せるわ。",
                    ko: "아드리안 왕자: 이제 새로운 날이 시작된다.\n엘리라 공주: 함께라면 잃어버린 것을 다시 세울 수 있어요."
                });
            },
            render: function() {
                storeEnding();
                unlockAchievement("finished_story");

                renderStoryAndDialogue(
                    getSceneContent(this.text, getSceneIndex()),
                    getSceneContent(this.dialogue, getSceneIndex())
                );

                renderChoicesButtons([{
                        text: {
                            en: "Restart Story from Chapter 1",
                            zh: "从第 1 章重新开始故事",
                            ja: "第1章から物語をやり直す",
                            ko: "챕터 1부터 스토리 다시 시작"
                        },
                        onClick: function() {
                            restartStory(false);
                        }
                    },
                    {
                        text: {
                            en: "Go to Home Page",
                            zh: "前往成就页面",
                            ja: "実績ページへ進む",
                            ko: "업적 페이지로 이동"
                        },
                        onClick: function() {
                            window.location.href = "index.html";
                        }
                    },

                ]);

                setStageNavVisibility(true, false);
            }
        })
    ];

    function validateStep(stepObj) {
        return !!(
            stepObj &&
            typeof stepObj === "object" &&
            typeof stepObj.type === "string" &&
            typeof stepObj.title !== "undefined" &&
            typeof stepObj.text !== "undefined"
        );
    }

    function getCurrentStepObject() {
        var step = clamp(getStep(), 0, STEPS.length - 1);
        return STEPS[step] || STEPS[0];
    }

    function canGoBackNow() {
        return getSceneIndex() > 0 || !!safeJsonGet(KEYS.history, []).length;
    }

    function updateStageButtonState() {
        var backBtn = $("storyBackBtn");
        if (backBtn) {
            backBtn.disabled = !canGoBackNow();
            backBtn.setAttribute("aria-disabled", backBtn.disabled ? "true" : "false");
        }
    }

    function forwardAction() {
        var stepIndex = clamp(getStep(), 0, STEPS.length - 1);
        var stepObj = STEPS[stepIndex];
        if (!stepObj) return;

        /*
           HARD LOCK:
           Chapter 20 Castle Gate test must be completed before
           the player can move from scene 2 to scene 3.
        */
        if (
            stepIndex === STEP_INDEX.CH20_CASTLE_GATE &&
            getSceneIndex() >= 2 &&
            !hasTest("test7_castle_gate")
        ) {
            showLock({
                en: "Complete the Castle Gate Brain Test before entering the castle.",
                zh: "请先完成城门脑力测试，才能进入城堡。",
                ja: "城に入る前に城門の脳力テストをクリアしてください。",
                ko: "성에 들어가기 전에 성문 두뇌 테스트를 완료하세요."
            }[getCurrentLanguage()] || "Complete the Castle Gate Brain Test before entering the castle.");

            renderChoicesButtons([{
                text: {
                    en: "Play the Castle Gate Brain Test",
                    zh: "开始城门脑力测试",
                    ja: "城門の脳力テストを始める",
                    ko: "성문 두뇌 테스트 시작하기"
                },
                onClick: function() {
                    unlockAchievement("reached_castle_gate");
                    launchGame(
                        "games/image-guess/index.html",
                        "test7_castle_gate",
                        STEP_INDEX.CH20_CASTLE_GATE,
                        "hard"
                    );
                }
            }]);

            setStageNavVisibility(true, false);
            return;
        }

        /*
           For custom choice steps, do not allow normal forward movement
           while choice buttons are visible.
        */
        if (typeof stepObj.render === "function" && (stepObj.type === "choice" || stepObj.type === "hub")) {
            var hasVisibleChoices = Array.isArray(currentRenderedChoices) && currentRenderedChoices.length > 0;

            if (hasVisibleChoices) {
                return;
            }

            if (hasMoreImagesInStep(stepObj, stepIndex)) {
                nextImageOrNextStep(stepObj, stepIndex);
                return;
            }

            next();
            return;
        }

        if (hasMoreImagesInStep(stepObj, stepIndex)) {
            nextImageOrNextStep(stepObj, stepIndex);
            return;
        }

        if (stepObj.type === "game") {
            var testId = safeId(stepObj.testId || "");
            var completed = testId ? hasTest(testId) : false;
            var target = clamp(toNum(stepObj.nextStep, stepIndex + 1), 0, STEPS.length - 1);

            if (completed) {
                if (typeof stepObj.onComplete === "function") stepObj.onComplete();
                goTo(target);
                return;
            }

            if (!testId || !stepObj.gamePath) {
                next();
                return;
            }

            launchGame(stepObj.gamePath, testId, target, stepObj.difficulty || "normal");
            return;
        }

        if (Array.isArray(stepObj.choices) && stepObj.choices.length) return;

        next();
    }

    function bindStageNavButtons() {
        var backBtn = $("storyBackBtn");
        var forwardBtn = $("storyForwardBtn");

        if (backBtn) {
            backBtn.addEventListener("click", function(e) {
                e.preventDefault();
                playUiTone("back");
                back();
            });
        }

        if (forwardBtn) {
            forwardBtn.addEventListener("click", function(e) {
                e.preventDefault();
                playUiTone("forward");
                forwardAction();
            });
        }

        updateStageButtonState();
    }

    function renderBaseStepState(stepObj, stepIndex) {
        if (isCinematicRequested()) setCinematic(true);

        setChapterImageFromStep(stepObj, stepIndex);
        setChapterBanner(stepObj);
        setFigureCaptionFromStep(stepObj);
        fadeScene();

        if (typeof stepObj.progressMin === "number") {
            setProgress(Math.max(getProgress(), clamp(stepObj.progressMin, 0, 100)));
        }

        var titleEl = $("storyTitle");
        if (titleEl) titleEl.textContent = tpl(getLangValue(stepObj.title || "Story"), vars());

        hideLock();
        renderProgress();
        updateStoryStatusUI(stepObj);
    }

    function renderGameStep(stepObj, stepIndex) {
        var testId = safeId(stepObj.testId || "");
        var completed = testId ? hasTest(testId) : false;
        var target = clamp(toNum(stepObj.nextStep, stepIndex + 1), 0, STEPS.length - 1);

        if (completed) {
            if (typeof stepObj.onComplete === "function") stepObj.onComplete();

            var completeText = getSceneContent(stepObj.completedText ? stepObj.completedText : stepObj.text, getSceneIndex());
            var completeDialogue = getSceneContent(stepObj.dialogue, getSceneIndex());

            renderStoryAndDialogue(completeText, completeDialogue);
            renderChoicesButtons([{
                text: { en: "Replay Test (optional)", zh: "重新游玩测试（可选）", ja: "テストをもう一度遊ぶ（任意）", ko: "테스트 다시 하기 (선택)" },
                onClick: function() {
                    launchGame(stepObj.gamePath, testId, target, stepObj.difficulty || "normal");
                }
            }]);

            setStageNavVisibility(true, true);
            updateStageButtonState();
            return;
        }

        showLock(tWord("lockMessage"));
        renderStoryAndDialogue(
            getSceneContent(stepObj.text, getSceneIndex()),
            getSceneContent(stepObj.dialogue, getSceneIndex())
        );

        renderChoicesButtons([{
            text: { en: "Play the Brain Test", zh: "开始脑力测试", ja: "脳力テストを始める", ko: "두뇌 테스트 시작하기" },
            onClick: function() {
                launchGame(stepObj.gamePath, testId, target, stepObj.difficulty || "normal");
            }
        }]);

        setStageNavVisibility(true, false);
        updateStageButtonState();
    }

    function renderChoiceOrCustomStep(stepObj) {
        stepObj.render();
        updateStageButtonState();
        updateStoryStatusUI(stepObj);
    }

    function renderStoryStep(stepObj) {
        renderStoryAndDialogue(
            getSceneContent(stepObj.text, getSceneIndex()),
            getSceneContent(stepObj.dialogue, getSceneIndex())
        );

        if (Array.isArray(stepObj.choices) && stepObj.choices.length) {
            renderChoicesButtons(stepObj.choices);
        } else {
            renderChoicesButtons([]);
        }

        setStageNavVisibility(true, true);
        updateStageButtonState();
    }

    function renderStep() {
        initIfMissing();

        var stepIndex = clamp(getStep(), 0, STEPS.length - 1);
        var stepObj = STEPS[stepIndex];

        if (!validateStep(stepObj)) {
            setStep(0);
            stepIndex = 0;
            stepObj = STEPS[0];
        }

        renderBaseStepState(stepObj, stepIndex);

        if (typeof stepObj.render === "function" && (stepObj.type === "choice" || stepObj.type === "hub")) {
            renderChoiceOrCustomStep(stepObj);
            return;
        }

        if (stepObj.type === "game") {
            renderGameStep(stepObj, stepIndex);
            return;
        }

        renderStoryStep(stepObj);
    }

    function bindKeyboardNav() {
        document.addEventListener("keydown", function(e) {
            if (e.repeat) return;

            var active = document.activeElement;
            var tag = (active && active.tagName) || "";

            if (
                tag === "INPUT" ||
                tag === "TEXTAREA" ||
                tag === "SELECT" ||
                tag === "BUTTON" ||
                tag === "A" ||
                (active && active.isContentEditable)
            ) {
                return;
            }

            var introModal = $("storyIntroModal");
            var introOpen = introModal && !introModal.classList.contains("hidden");
            if (introOpen) return;
            if (isSettingsModalOpen()) return;

            if (e.code === "ArrowLeft") {
                e.preventDefault();
                playUiTone("back");
                back();
                return;
            }

            if (e.code === "ArrowRight" || e.code === "Enter" || e.code === "Space") {
                e.preventDefault();
                playUiTone("forward");

                var stepObj = getCurrentStepObject();
                if (typeof stepObj.render === "function" && (stepObj.type === "choice" || stepObj.type === "hub")) {
                    if (hasMoreImagesInStep(stepObj, getStep())) {
                        forwardAction();
                    } else {
                        var hasVisibleChoices = Array.isArray(currentRenderedChoices) && currentRenderedChoices.length > 0;
                        if (!hasVisibleChoices) forwardAction();
                    }
                    return;
                }

                forwardAction();
            }
        });
    }

    function bindSettingsAudioHooks() {
        var settingsOpen = $("storySettingsOpen");
        var settingsClose = $("storySettingsClose");
        var restartBtn = $("storyRestartBtn");
        var exitBtn = $("storyExitBtn");
        var musicSlider = $("storyMusicSlider");
        var sfxSlider = $("storySfxSlider");

        if (settingsOpen) {
            settingsOpen.addEventListener("click", function() {
                playUiTone("open_settings");
            });
        }

        if (settingsClose) {
            settingsClose.addEventListener("click", function() {
                playUiTone("close_settings");
            });
        }

        if (restartBtn) {
            restartBtn.addEventListener("click", function() {
                playUiTone("choice");
            });
        }

        if (exitBtn) {
            exitBtn.addEventListener("click", function() {
                playUiTone("choice");
            });
        }

        if (musicSlider) {
            musicSlider.addEventListener("input", function() {
                syncAudioStateFromStorage();
            });
        }

        if (sfxSlider) {
            sfxSlider.addEventListener("input", function() {
                syncAudioStateFromStorage();
                playUiTone("choice");
            });
        }
    }

    window.addEventListener("bca:story-language-change", function(e) {
        if (e && e.detail && e.detail.language) {
            safeSet(KEYS.language, e.detail.language);
        }
        renderStep();
    });

    window.BCA_STORY = {
        forward: function() { forwardAction(); },
        back: function() { back(); },
        restart: function(askConfirm) { restartStory(askConfirm !== false); },
        goTo: function(step) { goTo(step); },
        render: function() { renderStep(); },
        getEnding: function() { return evaluateEnding(); },
        getAchievements: function() { return getAchievements(); }
    };

    document.addEventListener("DOMContentLoaded", function() {
        if (!$("storyTitle") || !$("storyText")) return;

        initIfMissing();

        if (!safeGet(KEYS.character, "")) {
            safeSet(KEYS.character, pickLang({
                en: "Prince Adrian",
                zh: "阿德里安王子",
                ja: "エイドリアン王子",
                ko: "아드리안 왕자"
            }));
        }

        unlockAchievement("started_story");

        if (isCinematicRequested()) {
            setCinematic(true);
        }

        ensureImageStage();
        bindStageNavButtons();
        bindKeyboardNav();
        bindSettingsAudioHooks();

        handleReturnFromGameIfAny();
        renderStep();

        if (typeof window.flushStoryGuideBubble === "function") {
            window.flushStoryGuideBubble();
        }
    });
})();