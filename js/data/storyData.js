/* =========================================================
   Brain Challenge Arcade - storyData.js
   Story content + external routes for Story Mode

   This file is ONLY DATA.
   The engine (storyEngine.js) reads:
     window.BCA_STORY_DATA
     window.BCA_STORY_ROUTES

   HOW TO USE:
   1) Include this file BEFORE storyEngine.js in story.html:
        <script src="js/storyData.js"></script>
        <script src="js/storyEngine.js"></script>

   2) Edit story scenes safely in this file only.

   NOTE:
   - No optional chaining.
   - Uses simple JS objects (easy to mark/understand).
   ========================================================= */

(function() {
    "use strict";

    /* ---------------------------------------------------------
       External routes:
       These are scene IDs that perform redirects.
       Make sure the paths match your folders.
    --------------------------------------------------------- */
    window.BCA_STORY_ROUTES = {
        external_home: "index.html",
        external_imageGuess: "games/guess-image/index.html",
        external_memoryTest: "games/memory-test/index.html", // change if needed
        external_cardMatching: "games/memory-match/index.html" // change if needed
    };

    /* ---------------------------------------------------------
       Story Data
       Structure:
         {
           start: { id, title, art, text, progressOnEnter, choices: [...] },
           ...
         }
  
       Choice structure:
         {
           text: "Button label",
           to: "sceneId",
           gate: { type, op, value, hint },
           reward: { progress:+10 } OR { progressSet: 40 }
         }
  
       Gate types:
         - "imageGuess"
         - "memoryTest"
         - "cardMatching"
         - "storyProgress"
    --------------------------------------------------------- */
    window.BCA_STORY_DATA = {
        start: {
            id: "start",
            title: "The Arcade Door",
            art: "🚪🧠",
            text: "You discover a hidden door behind the old library shelves.\n\n" +
                "A sign reads: “BRAIN CHALLENGE ARCADE — prove your skills to escape.”\n\n" +
                "Three glowing terminals power the lock: Image Guess, Memory Test, and Card Matching.",
            progressOnEnter: 0,
            choices: [
                { text: "Enter the Arcade", to: "hall", reward: { progressSet: 5 } },
                { text: "Walk away (not today)", to: "leave" }
            ]
        },

        leave: {
            id: "leave",
            title: "Maybe Later…",
            art: "🌙",
            text: "You step back. The door fades into the shadows.\n\n" +
                "But you know it’s still there — waiting.",
            progressOnEnter: 0,
            choices: [
                { text: "Return to the Door", to: "start" },
                { text: "Go to Home", to: "external_home" }
            ]
        },

        hall: {
            id: "hall",
            title: "The Challenge Hall",
            art: "🏛️✨",
            text: "The hall has three paths. Each path leads to a different terminal.\n\n" +
                "A voice whispers: “Complete the challenges. Unlock the final exit.”",
            progressOnEnter: 10,
            choices: [
                { text: "Path of Vision (Image Guess)", to: "vision_gate", reward: { progressSet: 15 } },
                { text: "Path of Memory (Memory Test)", to: "memory_gate", reward: { progressSet: 15 } },
                { text: "Path of Matching (Card Matching)", to: "match_gate", reward: { progressSet: 15 } },
                { text: "Check the Exit Door", to: "final_door" }
            ]
        },

        vision_gate: {
            id: "vision_gate",
            title: "Vision Terminal",
            art: "🖼️🔎",
            text: "A screen lights up: “Recognize what others miss.”\n\n" +
                "The terminal demands a proof score from Image Guess.",
            progressOnEnter: 15,
            choices: [{
                    text: "I scored 5+ (Unlock)",
                    to: "vision_unlocked",
                    gate: {
                        type: "imageGuess",
                        op: ">=",
                        value: 5,
                        hint: "Play Image Guess and reach a best score of 5 or more."
                    },
                    reward: { progressSet: 30 }
                },
                { text: "Go play Image Guess now", to: "external_imageGuess" },
                { text: "Back to Hall", to: "hall" }
            ]
        },

        vision_unlocked: {
            id: "vision_unlocked",
            title: "Vision Cleared",
            art: "🦅✅",
            text: "The Vision Terminal accepts your result.\n\n" +
                "A golden symbol appears on your wristband: “EYES OPEN.”",
            progressOnEnter: 30,
            choices: [
                { text: "Back to Hall", to: "hall" }
            ]
        },

        memory_gate: {
            id: "memory_gate",
            title: "Memory Terminal",
            art: "🧠🔁",
            text: "Lights pulse in a pattern. “Repeat the sequence. Keep calm.”\n\n" +
                "The terminal demands a proof level from Memory Test.",
            progressOnEnter: 15,
            choices: [{
                    text: "I reached level 3+ (Unlock)",
                    to: "memory_unlocked",
                    gate: {
                        type: "memoryTest",
                        op: ">=",
                        value: 3,
                        hint: "Play Memory Test and reach a best level of 3 or more."
                    },
                    reward: { progressSet: 45 }
                },
                { text: "Go play Memory Test now", to: "external_memoryTest" },
                { text: "Back to Hall", to: "hall" }
            ]
        },

        memory_unlocked: {
            id: "memory_unlocked",
            title: "Memory Cleared",
            art: "🏗️✅",
            text: "The Memory Terminal hums and powers down.\n\n" +
                "Your wristband displays: “PATTERN MASTERED.”",
            progressOnEnter: 45,
            choices: [
                { text: "Back to Hall", to: "hall" }
            ]
        },

        match_gate: {
            id: "match_gate",
            title: "Matching Terminal",
            art: "🃏🔓",
            text: "Cards swirl in the air. “Find pairs. Waste no moves.”\n\n" +
                "The terminal demands proof that you completed Card Matching at least once.",
            progressOnEnter: 15,
            choices: [{
                    text: "I completed a match (Unlock)",
                    to: "match_unlocked",
                    gate: {
                        type: "cardMatching",
                        op: ">=",
                        value: 1,
                        hint: "Play Card Matching and finish one game (save a best value)."
                    },
                    reward: { progressSet: 60 }
                },
                { text: "Go play Card Matching now", to: "external_cardMatching" },
                { text: "Back to Hall", to: "hall" }
            ]
        },

        match_unlocked: {
            id: "match_unlocked",
            title: "Matching Cleared",
            art: "🎴✅",
            text: "The Matching Terminal flashes: “ACCEPTED.”\n\n" +
                "Your wristband shows: “PAIRS FOUND.”",
            progressOnEnter: 60,
            choices: [
                { text: "Back to Hall", to: "hall" }
            ]
        },

        final_door: {
            id: "final_door",
            title: "The Final Exit",
            art: "🚪✨",
            text: "You stand before a huge exit door.\n\n" +
                "Three slots glow — Vision, Memory, Matching.\n\n" +
                "If you cleared the terminals, the door will open.",
            progressOnEnter: 60,
            choices: [{
                    text: "Try to open the Exit",
                    to: "ending",
                    gate: {
                        type: "storyProgress",
                        op: ">=",
                        value: 60,
                        hint: "Clear the three terminals (or reach 60% story progress)."
                    },
                    reward: { progressSet: 100 }
                },
                { text: "Back to Hall", to: "hall" }
            ]
        },

        ending: {
            id: "ending",
            title: "You Escaped!",
            art: "🏆🎉",
            text: "The door unlocks with a satisfying click.\n\n" +
                "Light floods the hall as you step out — smarter, faster, and ready for the next challenge.\n\n" +
                "Congratulations: Story Mode Complete!",
            progressOnEnter: 100,
            choices: [
                { text: "Replay Story", to: "start", reward: { progressSet: 5 } },
                { text: "Go to Home", to: "external_home" }
            ]
        }
    };
})();