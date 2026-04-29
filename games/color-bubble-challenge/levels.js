/*
============================================================
 Color Bubble Challenge / Bubble Blast - levels.js
 Easier Updated Version
============================================================

This file creates all level data for the game.

It sends the final level list to:

    window.COLOR_BUBBLE_LEVELS

Required by:
    game.js

Easier changes:
 - Fewer rows per level
 - Fewer colors for most levels
 - Slower bubble speed
 - More shots before board drops
 - Lower target scores
 - Lower board density
 - More open gaps
 - Fewer bomb / rainbow / stone bubbles
 - Later and softer difficulty curve
============================================================
*/

(function() {
    "use strict";

    /* =========================================================
       Main settings
    ========================================================= */

    const TOTAL_LEVELS = 100;

    const LEVEL_NAMES = [
        "Warm Up", "Soft Start", "Easy Pop", "Little Bounce", "Sunny Match",
        "Quick Clear", "Blue Path", "Bubble Smile", "Tiny Combo", "Light Shot",
        "Happy Lane", "Gentle Arc", "Candy Pop", "Fresh Breeze", "Short Burst",
        "Golden Dot", "Simple Path", "Mini Match", "Fast Fun", "Bright Bubble",
        "Easy Bloom", "Cozy Pop", "Sweet Lane", "Calm Shot", "Bomb Breaker",
        "Lucky Pop", "Tiny Burst", "Simple Bounce", "Soft Glow", "Easy Garden",
        "Star Dot", "Bubble Walk", "Sunny Arc", "Clear Path", "Happy Burst",
        "Little Star", "Gentle Pop", "Quick Match", "Blue Sky", "Pop Parade",
        "Easy Trail", "Bubble Hop", "Shiny Path", "Sweet Arc", "Calm Bloom",
        "Fast Pop", "Mini Garden", "Lucky Trail", "Sunny Burst", "Clear Bloom",
        "Soft Spark", "Easy Climb", "Bubble Beam", "Short Trail", "Rainbow Road",
        "Warm Spark", "Cozy Trail", "Bright Road", "Mini Glow", "Simple Star",
        "Bubble Dream", "Gentle Road", "Quick Bloom", "Happy Arc", "Star Bloom",
        "Easy Shine", "Tiny Road", "Bubble Light", "Sunny Dream", "Pop River",
        "Soft Road", "Lucky Glow", "Clear Spark", "Mini Shine", "Stone Wall",
        "Light Trail", "Easy River", "Bubble Flash", "Happy Shine", "Short Road",
        "Bright Arc", "Gentle Shine", "Cozy Glow", "Simple River", "Quick Spark",
        "Bubble Crown", "Sunny River", "Tiny Shine", "Pop Crown", "Lucky River",
        "Easy Crown", "Soft Crown", "Bright Crown", "Happy Crown", "Star Crown",
        "Golden Crown", "Bubble King", "Bubble Queen", "Bubble Hero", "Panda Champion"
    ];

    const WORLD_DEFS = [{
            id: 1,
            key: "tutorial",
            worldName: "Tutorial Meadow",
            start: 1,
            end: 10,
            label: "Tutorial Meadow",
            difficultyLabel: "Easy",
            themeColors: {
                skyTop: "#7ed8ff",
                skyBottom: "#b6ecff",
                ground: "#8edb62",
                accent: "#078BEC",
                mapAccent: "#5ecb5e"
            }
        },
        {
            id: 2,
            key: "starter",
            worldName: "Starter Hills",
            start: 11,
            end: 20,
            label: "Starter Hills",
            difficultyLabel: "Easy",
            themeColors: {
                skyTop: "#79caff",
                skyBottom: "#c4efff",
                ground: "#7fd35c",
                accent: "#18B93F",
                mapAccent: "#74c84d"
            }
        },
        {
            id: 3,
            key: "arc",
            worldName: "Arc Valley",
            start: 21,
            end: 35,
            label: "Arc Valley",
            difficultyLabel: "Normal",
            themeColors: {
                skyTop: "#6fb7ff",
                skyBottom: "#b0dcff",
                ground: "#75c851",
                accent: "#8F18CC",
                mapAccent: "#66b84a"
            }
        },
        {
            id: 4,
            key: "garden",
            worldName: "Garden Path",
            start: 36,
            end: 50,
            label: "Garden Path",
            difficultyLabel: "Normal",
            themeColors: {
                skyTop: "#70a9ff",
                skyBottom: "#c7e0ff",
                ground: "#70c34b",
                accent: "#FFA400",
                mapAccent: "#5faa43"
            }
        },
        {
            id: 5,
            key: "trail",
            worldName: "Forest Trail",
            start: 51,
            end: 65,
            label: "Forest Trail",
            difficultyLabel: "Hard",
            themeColors: {
                skyTop: "#5e93f0",
                skyBottom: "#b8d1ff",
                ground: "#68b744",
                accent: "#078BEC",
                mapAccent: "#559d3d"
            }
        },
        {
            id: 6,
            key: "river",
            worldName: "River Route",
            start: 66,
            end: 80,
            label: "River Route",
            difficultyLabel: "Hard",
            themeColors: {
                skyTop: "#527ddb",
                skyBottom: "#a8c5ff",
                ground: "#61ae40",
                accent: "#00c8ff",
                mapAccent: "#4a9338"
            }
        },
        {
            id: 7,
            key: "crown",
            worldName: "Crown Heights",
            start: 81,
            end: 90,
            label: "Crown Heights",
            difficultyLabel: "Expert",
            themeColors: {
                skyTop: "#4d6fd0",
                skyBottom: "#9eb9f6",
                ground: "#58a438",
                accent: "#FFA400",
                mapAccent: "#438734"
            }
        },
        {
            id: 8,
            key: "finale",
            worldName: "Champion Summit",
            start: 91,
            end: 100,
            label: "Champion Summit",
            difficultyLabel: "Champion",
            themeColors: {
                skyTop: "#425cb7",
                skyBottom: "#90abea",
                ground: "#4f9731",
                accent: "#D93A05",
                mapAccent: "#3c7b2f"
            }
        }
    ];

    const MISSIONS = {
        tutorialAim: "Aim and shoot bubbles.",
        tutorialSwap: "Swap the current bubble with the next bubble.",
        tutorialClear: "Clear all bubbles to finish the stage.",
        easyClear: "Clear the board with careful shots.",
        scorePush: "Reach the score target before danger reaches you.",
        comboFocus: "Create bigger matches and earn combo bonuses.",
        carefulShot: "Use smart aiming and wall bounces to win.",
        colorRush: "Handle more colors and keep the board controlled.",
        longBoard: "Clear a taller board before it drops too low.",
        fastBoard: "Play quickly and stop the board from becoming dangerous.",
        bombIntro: "Bomb bubbles appear. Use them to blast nearby bubbles.",
        rainbowIntro: "Rainbow bubbles appear. They can match any color.",
        stoneIntro: "Stone bubbles appear. They cannot be matched normally.",
        popTarget: "Pop the required number of bubbles to win.",
        expertClear: "Use strong timing and smart decisions to win.",
        finalTest: "Beat the final challenge and prove your bubble skill."
    };

    const PATTERN_LIBRARY = {
        open: {
            label: "Open Field",
            description: "Balanced and open layout.",
            density: 0.44,
            gapChance: 0.34
        },
        center: {
            label: "Center Stack",
            description: "Bubbles are concentrated near the center.",
            density: 0.47,
            gapChance: 0.31
        },
        zigzag: {
            label: "Zigzag Road",
            description: "Alternating rows create a zigzag path.",
            density: 0.48,
            gapChance: 0.29
        },
        left_heavy: {
            label: "Left Pressure",
            description: "The left side is denser.",
            density: 0.49,
            gapChance: 0.28
        },
        right_heavy: {
            label: "Right Pressure",
            description: "The right side is denser.",
            density: 0.49,
            gapChance: 0.28
        },
        bands: {
            label: "Color Bands",
            description: "Horizontal rows encourage bigger clears.",
            density: 0.51,
            gapChance: 0.25
        },
        diamond: {
            label: "Diamond Core",
            description: "Dense middle shape with lighter edges.",
            density: 0.52,
            gapChance: 0.23
        },
        tunnel: {
            label: "Tunnel Path",
            description: "A narrow path creates tactical aiming.",
            density: 0.54,
            gapChance: 0.21
        },
        fortress: {
            label: "Fortress Wall",
            description: "Dense layout with tighter gaps.",
            density: 0.56,
            gapChance: 0.18
        }
    };

    const MILESTONE_LEVELS = new Set([
        1, 2, 3, 10, 20, 25, 35, 50, 55, 65, 75, 80, 90, 100
    ]);

    /* =========================================================
       Helpers
    ========================================================= */

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function roundInt(value) {
        return Math.round(value);
    }

    function getWorld(levelId) {
        for (let i = 0; i < WORLD_DEFS.length; i++) {
            const world = WORLD_DEFS[i];

            if (levelId >= world.start && levelId <= world.end) {
                return world;
            }
        }

        return WORLD_DEFS[0];
    }

    function getBand(levelId) {
        if (levelId <= 10) return 1;
        if (levelId <= 20) return 2;
        if (levelId <= 35) return 3;
        if (levelId <= 50) return 4;
        if (levelId <= 65) return 5;
        if (levelId <= 80) return 6;
        if (levelId <= 90) return 7;
        return 8;
    }

    function getDifficultyLabel(band) {
        if (band <= 2) return "Easy";
        if (band <= 4) return "Normal";
        if (band <= 6) return "Hard";
        if (band === 7) return "Expert";
        return "Champion";
    }

    function getMission(levelId, band, objectiveType) {
        if (levelId === 1) return MISSIONS.tutorialAim;
        if (levelId === 2) return MISSIONS.tutorialSwap;
        if (levelId === 3) return MISSIONS.tutorialClear;
        if (levelId === 25) return MISSIONS.bombIntro;
        if (levelId === 55) return MISSIONS.rainbowIntro;
        if (levelId === 75) return MISSIONS.stoneIntro;

        if (objectiveType === "pop_count") return MISSIONS.popTarget;
        if (objectiveType === "score_target") return MISSIONS.scorePush;

        if (band === 1) return MISSIONS.easyClear;
        if (band === 2) return levelId % 2 === 0 ? MISSIONS.carefulShot : MISSIONS.easyClear;
        if (band === 3) return levelId % 3 === 0 ? MISSIONS.comboFocus : MISSIONS.colorRush;
        if (band === 4) return levelId % 2 === 0 ? MISSIONS.longBoard : MISSIONS.scorePush;
        if (band === 5) return levelId % 2 === 0 ? MISSIONS.fastBoard : MISSIONS.comboFocus;
        if (band === 6) return levelId % 3 === 0 ? MISSIONS.longBoard : MISSIONS.expertClear;
        if (band === 7) return levelId % 2 === 0 ? MISSIONS.fastBoard : MISSIONS.expertClear;

        if (levelId >= 96) return MISSIONS.finalTest;

        return MISSIONS.expertClear;
    }

    function getRows(levelId, band) {
        if (band === 1) return 3 + Math.floor((levelId - 1) / 5);
        if (band === 2) return 4 + Math.floor((levelId - 11) / 6);
        if (band === 3) return 5 + Math.floor((levelId - 21) / 7);
        if (band === 4) return 6 + Math.floor((levelId - 36) / 7);
        if (band === 5) return 7 + Math.floor((levelId - 51) / 7);
        if (band === 6) return 8 + Math.floor((levelId - 66) / 8);
        if (band === 7) return 9 + Math.floor((levelId - 81) / 8);
        return 9 + Math.floor((levelId - 91) / 8);
    }

    function getColors(levelId, band) {
        if (band === 1) return levelId <= 8 ? 3 : 4;
        if (band === 2) return 4;
        if (band === 3) return 4;
        if (band === 4) return 4;
        if (band === 5) return levelId <= 58 ? 4 : 5;
        if (band === 6) return 5;
        if (band === 7) return 5;
        return 5;
    }

    function getSpeed(levelId, band) {
        let base;

        if (band === 1) base = 5.8;
        else if (band === 2) base = 6.05;
        else if (band === 3) base = 6.25;
        else if (band === 4) base = 6.45;
        else if (band === 5) base = 6.65;
        else if (band === 6) base = 6.85;
        else if (band === 7) base = 7.05;
        else base = 7.25;

        const bonus = (levelId - 1) * 0.006;

        return Number((base + bonus).toFixed(2));
    }

    function getPattern(levelId, band) {
        const groups = {
            1: ["open", "open", "center", "zigzag"],
            2: ["open", "zigzag", "center", "left_heavy"],
            3: ["center", "zigzag", "open", "bands"],
            4: ["bands", "center", "left_heavy", "right_heavy"],
            5: ["bands", "zigzag", "diamond", "center"],
            6: ["diamond", "bands", "zigzag", "center"],
            7: ["diamond", "bands", "tunnel", "center"],
            8: ["diamond", "tunnel", "bands", "fortress"]
        };

        const options = groups[band] || groups[3];

        return options[(levelId - 1) % options.length];
    }

    function getObjectiveType(levelId, band) {
        if (levelId <= 3) return "clear_all";

        if (
            levelId === 15 ||
            levelId === 30 ||
            levelId === 45 ||
            levelId === 60 ||
            levelId === 70 ||
            levelId === 85
        ) {
            return "pop_count";
        }

        if (band >= 6 && levelId % 9 === 0 && levelId < 96) {
            return "score_target";
        }

        return "clear_all";
    }

    function getDropShots(levelId, band, objectiveType) {
        if (levelId <= 3) return 14;

        if (objectiveType === "pop_count") {
            if (band <= 3) return 12;
            if (band <= 5) return 11;
            return 10;
        }

        if (band === 1) return 13;
        if (band === 2) return 12;
        if (band === 3) return 12;
        if (band === 4) return 11;
        if (band === 5) return 11;
        if (band === 6) return 10;
        if (band === 7) return 10;

        return 9;
    }

    function getBombChance(levelId) {
        if (levelId < 25) return 0;
        if (levelId < 40) return 0.02;
        if (levelId < 60) return 0.035;
        if (levelId < 80) return 0.045;
        return 0.055;
    }

    function getRainbowChance(levelId) {
        if (levelId < 55) return 0;
        if (levelId < 75) return 0.025;
        if (levelId < 90) return 0.04;
        return 0.055;
    }

    function getStoneChance(levelId) {
        if (levelId < 75) return 0;
        if (levelId < 90) return 0.025;
        return 0.04;
    }

    function getSpecialBubbleChance(levelId) {
        if (levelId < 25) return 0;
        if (levelId < 40) return 0.025;
        if (levelId < 55) return 0.035;
        if (levelId < 75) return 0.045;
        if (levelId < 90) return 0.055;
        return 0.07;
    }

    function getLayoutHints(levelId, patternKey, band, objectiveType) {
        const base = PATTERN_LIBRARY[patternKey] || PATTERN_LIBRARY.open;

        const hints = {
            preferredPattern: patternKey,
            density: base.density,
            gapChance: base.gapChance,

            startOpenRows: levelId <= 5 ? 1 : 0,
            protectedTopRows: levelId <= 15 ? 2 : 1,

            useBands: patternKey === "bands",
            useCenterWeight: patternKey === "center" || patternKey === "diamond",
            useZigzag: patternKey === "zigzag",
            useTunnel: patternKey === "tunnel",
            useFortress: patternKey === "fortress",

            leftBias: patternKey === "left_heavy" ? 0.14 : 0,
            rightBias: patternKey === "right_heavy" ? 0.14 : 0
        };

        if (band >= 6) {
            hints.gapChance = Math.max(0.16, hints.gapChance - 0.01);
            hints.density = Math.min(0.58, hints.density + 0.01);
        }

        if (band === 8) {
            hints.density = Math.min(0.6, hints.density + 0.02);
        }

        if (MILESTONE_LEVELS.has(levelId)) {
            hints.density = Math.min(0.62, hints.density + 0.01);
        }

        if (objectiveType === "pop_count") {
            hints.density = Math.min(0.6, hints.density + 0.01);
            hints.gapChance = Math.max(0.15, hints.gapChance - 0.005);
        }

        return hints;
    }

    function estimateSpecialPressure(flags, chances) {
        let score = 0;

        if (flags.allowBombBubble) {
            score += 3 + Math.round((chances.bombBubbleChance || 0) * 50);
        }

        if (flags.allowRainbowBubble) {
            score += 3 + Math.round((chances.rainbowBubbleChance || 0) * 50);
        }

        if (flags.allowStoneBubble) {
            score += 4 + Math.round((chances.stoneBubbleChance || 0) * 50);
        }

        return score;
    }

    function getTargetScore(
        levelId,
        rows,
        colors,
        band,
        patternKey,
        specialFlags,
        objectiveType,
        objectiveValue,
        chances
    ) {
        const pattern = PATTERN_LIBRARY[patternKey] || PATTERN_LIBRARY.open;

        let score = 120;

        score += rows * 70;
        score += (colors - 3) * 90;
        score += levelId * 18;
        score += Math.round(pattern.density * 80);
        score += estimateSpecialPressure(specialFlags, chances);

        if (band >= 4) score += 70;
        if (band >= 6) score += 90;
        if (band === 8) score += 130;

        if (patternKey === "tunnel") score += 35;
        if (patternKey === "fortress") score += 55;
        if (MILESTONE_LEVELS.has(levelId)) score += 30;

        if (objectiveType === "pop_count") {
            score = Math.max(score, 320 + objectiveValue * 30 + band * 35);
        }

        if (objectiveType === "score_target") {
            score += 40 + band * 15;
        }

        return roundInt(score);
    }

    function getStarTargets(targetScore) {
        return {
            one: Math.floor(targetScore * 0.45),
            two: Math.floor(targetScore * 0.85),
            three: Math.floor(targetScore * 1.15)
        };
    }

    function getObjective(levelId, band, targetScore, rows, objectiveType) {
        if (objectiveType === "pop_count") {
            const value = clamp(12 + band * 3 + Math.floor(rows * 1.1), 15, 45);

            return {
                type: "pop_count",
                value: value,
                label: "Pop Target",
                description: "Pop at least " + value + " bubbles to win."
            };
        }

        if (objectiveType === "score_target") {
            return {
                type: "score_target",
                value: targetScore,
                label: "Score Target",
                description: "Reach at least " + targetScore + " points to win."
            };
        }

        return {
            type: "clear_all",
            value: 0,
            label: "Clear All",
            description: "Remove every bubble from the board."
        };
    }

    function getScoringRules(levelId, band, targetScore, objectiveType) {
        const popPerBubble = band <= 2 ? 65 : 70;
        const dropBonusPerBubble = band <= 3 ? 45 : 50;
        const comboStep = band <= 2 ? 30 : 35;

        return {
            popPerBubble: popPerBubble,
            dropBonusPerBubble: dropBonusPerBubble,
            comboStep: comboStep,
            fullClearBonus: objectiveType === "clear_all" ? 260 + levelId * 10 : 0,
            speedClearBonus: band >= 5 ? 130 + levelId * 5 : 0,
            targetReference: targetScore
        };
    }

    function getLevelTags(levelId, band, flags, objectiveType) {
        const tags = [];

        if (levelId <= 3) tags.push("tutorial");
        if (band <= 2) tags.push("easy");
        if (band >= 3 && band <= 5) tags.push("normal");
        if (band >= 6) tags.push("hard");
        if (levelId >= 96) tags.push("finale");
        if (MILESTONE_LEVELS.has(levelId)) tags.push("milestone");

        tags.push("objective-" + objectiveType.replace("_", "-"));

        if (flags.allowBombBubble) tags.push("bomb");
        if (flags.allowRainbowBubble) tags.push("rainbow");
        if (flags.allowStoneBubble) tags.push("stone");

        return tags;
    }

    function getSpecialIntroText(levelId, worldName, objectiveType) {
        if (levelId === 1) return "Welcome to Color Bubble Challenge. Learn to aim and shoot.";
        if (levelId === 2) return "New mechanic unlocked: swap the current bubble.";
        if (levelId === 3) return "Your first true clear challenge begins.";
        if (levelId === 10) return "World complete: Tutorial Meadow.";
        if (levelId === 20) return "World complete: Starter Hills.";
        if (levelId === 25) return "Bomb bubbles unlocked. Use them to destroy nearby bubbles.";
        if (levelId === 35) return "World complete: Arc Valley.";
        if (levelId === 50) return "World complete: Garden Path.";
        if (levelId === 55) return "Rainbow bubbles unlocked. They can match any color.";
        if (levelId === 65) return "World complete: Forest Trail.";
        if (levelId === 75) return "Stone bubbles unlocked. They cannot be matched normally.";
        if (levelId === 80) return "World complete: River Route.";
        if (levelId === 90) return "World complete: Crown Heights.";
        if (levelId === 91) return "Champion Summit begins.";
        if (levelId === 100) return "Final challenge: become the Bubble Champion.";

        if (objectiveType === "pop_count") {
            return "Special objective: pop enough bubbles before danger reaches you.";
        }

        if (objectiveType === "score_target") {
            return "Special objective: hit the score goal to finish the level.";
        }

        if (
            levelId === 11 ||
            levelId === 21 ||
            levelId === 36 ||
            levelId === 51 ||
            levelId === 66 ||
            levelId === 81
        ) {
            return "Welcome to " + worldName + ".";
        }

        return "";
    }

    function getWorldCheckpointReward(levelId) {
        return (
            levelId === 10 ||
            levelId === 20 ||
            levelId === 35 ||
            levelId === 50 ||
            levelId === 65 ||
            levelId === 80 ||
            levelId === 90 ||
            levelId === 100
        );
    }

    function getRewardData(levelId, band, isMilestoneLevel) {
        return {
            coins: 25 + levelId * 4,
            exp: 10 + band * 5 + Math.floor(levelId / 4),
            unlockThemePreview: getWorldCheckpointReward(levelId),
            bonusLifeOnClear: levelId > 0 && levelId % 10 === 0,
            milestoneBadge: isMilestoneLevel,
            titleReward: levelId === 100 ? "Bubble Champion" : ""
        };
    }

    function getAnalytics(rows, colors, band, flags, isMilestoneLevel, layoutHints, objectiveType, objectiveValue) {
        return {
            estimatedBoardDensity: layoutHints.density,
            estimatedComplexity: rows * 2 +
                colors * 4 +
                band * 5 +
                (flags.allowBombBubble ? 4 : 0) +
                (flags.allowRainbowBubble ? 4 : 0) +
                (flags.allowStoneBubble ? 5 : 0) +
                (isMilestoneLevel ? 3 : 0) +
                (objectiveType === "pop_count" ? 4 : 0) +
                (objectiveType === "score_target" ? 3 : 0),
            recommendedPlayerSkill: band <= 2 ?
                "Beginner" : band <= 4 ?
                "Developing" : band <= 6 ?
                "Confident" : band === 7 ?
                "Advanced" : "Expert",
            objectiveWeight: objectiveValue || 0
        };
    }

    function getProgression(levelId, finalWorld) {
        return {
            isMilestoneLevel: MILESTONE_LEVELS.has(levelId),
            isWorldStart: levelId === 1 ||
                levelId === 11 ||
                levelId === 21 ||
                levelId === 36 ||
                levelId === 51 ||
                levelId === 66 ||
                levelId === 81 ||
                levelId === 91,
            isWorldEnd: levelId === 10 ||
                levelId === 20 ||
                levelId === 35 ||
                levelId === 50 ||
                levelId === 65 ||
                levelId === 80 ||
                levelId === 90 ||
                levelId === 100,
            unlocksBombs: levelId === 25,
            unlocksRainbows: levelId === 55,
            unlocksStones: levelId === 75,
            finalLevel: levelId === finalWorld.end
        };
    }

    function getAboveAndBeyondNotes(levelId, objectiveType) {
        const notes = [];

        if (levelId === 1) notes.push("Tutorial aiming support is active.");
        if (levelId === 2) notes.push("Tutorial swapping support is active.");
        if (levelId === 3) notes.push("Tutorial clear guidance is active.");
        if (levelId === 25) notes.push("Bomb bubbles are introduced.");
        if (levelId === 55) notes.push("Rainbow bubbles are introduced.");
        if (levelId === 75) notes.push("Stone bubbles are introduced.");
        if (levelId === 100) notes.push("Final champion level.");

        if (objectiveType === "pop_count") {
            notes.push("This level uses a pop-count win condition.");
        }

        if (objectiveType === "score_target") {
            notes.push("This level uses a score-target win condition.");
        }

        return notes;
    }

    /* =========================================================
       Build one level
    ========================================================= */

    function makeLevel(index) {
        const id = index + 1;
        const band = getBand(id);
        const world = getWorld(id);

        const rows = clamp(getRows(id, band), 3, 10);
        const colors = clamp(getColors(id, band), 3, 5);
        const speed = getSpeed(id, band);
        const pattern = getPattern(id, band);
        const objectiveType = getObjectiveType(id, band);

        const flags = {
            allowBombBubble: id >= 25,
            allowRainbowBubble: id >= 55,
            allowStoneBubble: id >= 75
        };

        const chances = {
            bombBubbleChance: getBombChance(id),
            rainbowBubbleChance: getRainbowChance(id),
            stoneBubbleChance: getStoneChance(id)
        };

        const tempObjective = getObjective(id, band, 0, rows, objectiveType);

        const targetScore = getTargetScore(
            id,
            rows,
            colors,
            band,
            pattern,
            flags,
            objectiveType,
            tempObjective.value,
            chances
        );

        const objective = getObjective(id, band, targetScore, rows, objectiveType);
        const starTargets = getStarTargets(targetScore);
        const dropShots = getDropShots(id, band, objectiveType);
        const layoutHints = getLayoutHints(id, pattern, band, objectiveType);
        const scoringRules = getScoringRules(id, band, targetScore, objectiveType);
        const isMilestoneLevel = MILESTONE_LEVELS.has(id);

        return {
            id: id,
            name: LEVEL_NAMES[index] || "Level " + id,
            mission: getMission(id, band, objective.type),

            rows: rows,
            colors: colors,
            speed: speed,

            objective: objective,
            targetScore: targetScore,
            starTargets: starTargets,

            dropShots: dropShots,
            scoringRules: scoringRules,

            theme: world.key,
            themeLabel: world.label,
            worldId: world.id,
            worldName: world.worldName,

            themeColors: {
                skyTop: world.themeColors.skyTop,
                skyBottom: world.themeColors.skyBottom,
                ground: world.themeColors.ground,
                accent: world.themeColors.accent,
                mapAccent: world.themeColors.mapAccent
            },

            pattern: pattern,
            patternMeta: PATTERN_LIBRARY[pattern],
            layoutHints: layoutHints,

            difficultyBand: band,
            difficultyLabel: getDifficultyLabel(band),

            specialBubbleChance: getSpecialBubbleChance(id),

            allowBombBubble: flags.allowBombBubble,
            allowRainbowBubble: flags.allowRainbowBubble,
            allowStoneBubble: flags.allowStoneBubble,

            bombBubbleChance: chances.bombBubbleChance,
            rainbowBubbleChance: chances.rainbowBubbleChance,
            stoneBubbleChance: chances.stoneBubbleChance,

            tutorial: {
                showAimHint: id === 1,
                showSwapHint: id === 2,
                showStarHint: id === 3,
                showDangerHint: id === 4
            },

            rewards: getRewardData(id, band, isMilestoneLevel),
            analytics: getAnalytics(
                rows,
                colors,
                band,
                flags,
                isMilestoneLevel,
                layoutHints,
                objective.type,
                objective.value
            ),

            progression: getProgression(id, WORLD_DEFS[WORLD_DEFS.length - 1]),

            map: {
                nodeStyle: isMilestoneLevel ? "milestone" : "normal",
                badgeText: isMilestoneLevel ? "★" : "",
                chapterLabel: world.worldName
            },


            narrative: {
                shortIntro: getSpecialIntroText(id, world.worldName, objective.type),
                worldMessage: isMilestoneLevel ?
                    world.worldName + " milestone challenge." : "",
                endingMessage: id === 100 ?
                    "You reached the final summit of the arcade challenge." : ""
            },

            tags: getLevelTags(id, band, flags, objective.type),
            aboveAndBeyondNotes: getAboveAndBeyondNotes(id, objective.type),
            specialIntroText: getSpecialIntroText(id, world.worldName, objective.type),
            isMilestoneLevel: isMilestoneLevel
        };
    }

    /* =========================================================
       Export final levels
    ========================================================= */

    window.COLOR_BUBBLE_LEVELS = Array.from({ length: TOTAL_LEVELS }, function(_, index) {
        return makeLevel(index);
    });
})();