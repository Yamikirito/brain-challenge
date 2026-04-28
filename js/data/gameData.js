/* =========================================================
   Brain Challenge Arcade - gameData.js
   Centralised data for all mini games

   PURPOSE:
   - Keep game questions, words, images, and card sets
     in ONE place (clean architecture for high marks).
   - No game logic here — data only.
   - Other game scripts import from window.BCA_GAME_DATA

   HOW TO USE (example inside a game file):
     const data = window.BCA_GAME_DATA.imageGuess;
     const questions = data.questions;
========================================================= */

(function() {
    "use strict";

    window.BCA_GAME_DATA = {

        /* =====================================================
           1. IMAGE GUESS GAME DATA
           ===================================================== */
        imageGuess: {
            title: "Image Guess",
            description: "Guess the object shown in the image.",
            questions: [{
                    id: 1,
                    image: "assets/images/apple.jpg",
                    answer: "apple",
                    hints: ["It's a fruit", "Often red or green"]
                },
                {
                    id: 2,
                    image: "assets/images/cat.jpg",
                    answer: "cat",
                    hints: ["A common pet", "Says meow"]
                },
                {
                    id: 3,
                    image: "assets/images/car.jpg",
                    answer: "car",
                    hints: ["Has four wheels", "Used for transport"]
                },
                {
                    id: 4,
                    image: "assets/images/book.jpg",
                    answer: "book",
                    hints: ["You read it", "Has pages"]
                },
                {
                    id: 5,
                    image: "assets/images/mountain.jpg",
                    answer: "mountain",
                    hints: ["A tall natural landform", "Climbers love it"]
                }
            ]
        },

        /* =====================================================
           2. MEMORY TEST GAME DATA
           ===================================================== */
        memoryTest: {
            title: "Memory Test",
            description: "Remember the sequence and repeat it.",
            levels: [
                { level: 1, sequenceLength: 3 },
                { level: 2, sequenceLength: 4 },
                { level: 3, sequenceLength: 5 },
                { level: 4, sequenceLength: 6 },
                { level: 5, sequenceLength: 7 },
                { level: 6, sequenceLength: 8 }
            ],
            possibleColors: ["red", "blue", "green", "yellow"]
        },

        /* =====================================================
           3. CARD MATCHING GAME DATA
           ===================================================== */
        cardMatching: {
            title: "Card Matching",
            description: "Find all matching pairs.",
            sets: [{
                    id: "animals",
                    name: "Animal Set",
                    cards: ["🐶", "🐱", "🐰", "🦊", "🐼", "🐸"]
                },
                {
                    id: "fruits",
                    name: "Fruit Set",
                    cards: ["🍎", "🍌", "🍓", "🍇", "🍉", "🍍"]
                },
                {
                    id: "symbols",
                    name: "Symbol Set",
                    cards: ["⭐", "❤️", "⚡", "🔥", "🌙", "☀️"]
                }
            ],
            defaultSet: "animals"
        },

        /* =====================================================
           4. STORY GAME META DATA
           ===================================================== */
        storyGame: {
            title: "Story Mode",
            description: "The Prince and the Witch's Shadow.",
            maxProgress: 100,
            progressStep: 5
        },

        /* =====================================================
           5. STORY QUESTIONS / PUZZLES
           Used by story-related mini games if needed
           ===================================================== */
        storyQuestions: {
            test2_traveler: {
                question: "Prince Adrian meets a tired traveler on the dark road. What should he do?",
                options: [
                    "Ignore the traveler and ride away",
                    "Threaten the traveler for answers",
                    "Stop, help the traveler, and listen"
                ],
                correctAnswer: 2
            },
            test3_wise_old_man: {
                question: "The wise old man offers Adrian help. What must Adrian do first?",
                options: [
                    "Walk away from the old man",
                    "Solve the old man's test",
                    "Take the staff and run"
                ],
                correctAnswer: 1
            },
            test4_magic_map: {
                question: "How does Adrian awaken the Magic Map?",
                options: [
                    "By solving the puzzle",
                    "By throwing it away",
                    "By hiding it in the forest"
                ],
                correctAnswer: 0
            },
            test5_sword_light: {
                question: "What must Adrian show to earn the Sword of Light?",
                options: [
                    "Fear",
                    "Courage",
                    "Anger"
                ],
                correctAnswer: 1
            },
            test7_castle_gate: {
                question: "What must Adrian do to enter the witch's castle?",
                options: [
                    "Wait outside",
                    "Solve the gate puzzle",
                    "Turn back home"
                ],
                correctAnswer: 1
            },
            test6_final_battle: {
                question: "What helps Adrian defeat the witch's dark power?",
                options: [
                    "The Sword of Light",
                    "A wooden stick",
                    "Running away"
                ],
                correctAnswer: 0
            }
        },

        /* =====================================================
           6. GLOBAL GAME SETTINGS
           ===================================================== */
        globalSettings: {
            maxLeaderboardEntries: 10,
            defaultUsername: "Guest",
            allowCaseInsensitiveAnswers: true,
            trimAnswerWhitespace: true
        }
    };

})();