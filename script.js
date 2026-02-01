/**
 * CATCH MY HEART: VALENTINE BOSS RUN
 * 
 * Core Game Logic
 * - State Machine
 * - Entity System
 * - Canvas Rendering
 * - Audio Synthesis
 * - Persistence
 */

/* =========================================
   CONFIGURATION & CONSTANTS
   ========================================= */

const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    PLAYER_RADIUS: 30, // Hit area radius
    
    // Game Balance
    BASE_SCORE: 10,
    GOLD_SCORE: 50,
    BROKEN_PENALTY: 10,
    COMBO_TIMER: 2000, // ms to keep combo alive
    SPEED_MULTIPLIER: 0.5,
    
    // Entity Types
    TYPES: {
        NORMAL: 'normal',   // ❤️
        GOLDEN: 'golden',   // 💛
        BROKEN: 'broken',   // 💔
        BOSS: 'boss',       // 😈
        SLOW: 'slow',       // ❄️
        NUKE: 'nuke',       // 💣
        HEAL: 'heal'        // 🩹
    },
    
    // Funny Messages
    MESSAGES: {
        NEAR_MISS: ["Almost stole it 😏", "Too slow!", "Nice try 💅", "Swiped left on that one"],
        BROKEN_HIT: ["Ouch. Emotional damage.", "Red flag! 🚩", "Why are you like this?", "Heartbreak 💔"],
        HIGH_COMBO: ["Okay gamer 😳", "Rizz god?", "Don't stop now!", "On fire! 🔥"],
        BOSS_INTRO: ["FINAL BOSS: FEELINGS", "COMMITMENT ISSUES INCOMING", "POV: The 'Talk'", "BOSS: MIXED SIGNALS"],
        VICTORY: ["Certified Valentine ✅", "Simp card revoked (you won) 👑", "W", "Relationship goals"]
    }
};

// Level Design (8 Levels + Boss)
const LEVELS = [
    { id: 1, name: "The Crush", target: 300, spawnRate: 1000, speedMin: 2, speedMax: 4, hazardRatio: 0.1, powerupRatio: 0.05, desc: "Just getting started..." },
    { id: 2, name: "First Date", target: 600, spawnRate: 900, speedMin: 3, speedMax: 5, hazardRatio: 0.2, powerupRatio: 0.05, desc: "Don't mess this up!" },
    { id: 3, name: "Mixed Signals", target: 1000, spawnRate: 800, speedMin: 3, speedMax: 6, hazardRatio: 0.3, powerupRatio: 0.08, desc: "Watch out for red flags 🚩" },
    { id: 4, name: "The 'Talk'", target: 1500, spawnRate: 700, speedMin: 4, speedMax: 7, hazardRatio: 0.35, powerupRatio: 0.1, desc: "It's getting serious." },
    { id: 5, name: "Ghosting", target: 2000, spawnRate: 600, speedMin: 5, speedMax: 8, hazardRatio: 0.4, powerupRatio: 0.1, desc: "They disappear fast!" }, // Fast fade entities
    { id: 6, name: "Love Bombing", target: 2800, spawnRate: 400, speedMin: 4, speedMax: 7, hazardRatio: 0.2, powerupRatio: 0.15, desc: "Too much at once!" }, // High spawn rate
    { id: 7, name: "Trust Issues", target: 3500, spawnRate: 550, speedMin: 6, speedMax: 9, hazardRatio: 0.5, powerupRatio: 0.1, desc: "Is it safe? Who knows." },
    { id: 8, name: "The Proposal", target: 4500, spawnRate: 500, speedMin: 7, speedMax: 10, hazardRatio: 0.4, powerupRatio: 0.12, desc: "One last hurdle..." },
    { id: 9, name: "BOSS: COMMITMENT", target: 6000, spawnRate: 300, speedMin: 5, speedMax: 12, hazardRatio: 0.6, powerupRatio: 0.2, desc: "DEFEAT THE FINAL BOSS" }
];

/* =========================================
   STORAGE HELPER
   ========================================= */
class StorageHelper {
    static get(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn('LocalStorage access failed:', e);
            return null;
        }
    }

    static set(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn('LocalStorage write failed:', e);
        }
    }

    static clear() {
        try {
            localStorage.clear();
        } catch (e) {
            console.warn('LocalStorage clear failed:', e);
        }
    }
}

/* =========================================
   AUDIO SYSTEM (Synthesizer)
   ========================================= */
class AudioController {
    constructor() {
        this.ctx = null;
        this.enabled = false;
    }

    init() {
        try {
            if (!this.ctx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this.ctx = new AudioContext();
                }
            }
            this.enabled = StorageHelper.get('cmh_sound') !== 'false';
        } catch (e) {
            console.warn('AudioContext initialization failed:', e);
            this.enabled = false;
        }
    }

    resume() {
        try {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        } catch (e) {
            console.warn('Audio resume failed:', e);
        }
    }

    toggle(state) {
        this.enabled = state;
        StorageHelper.set('cmh_sound', state);
        if (state && this.ctx) {
            this.resume();
        }
    }

    playTone(freq, type, duration, vol = 0.1) {
        if (!this.enabled || !this.ctx) return;
        
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            // Ignore audio errors during play to avoid spam
        }
    }

    play(soundName) {
        if (!this.enabled) return;
        switch (soundName) {
            case 'pop': this.playTone(600 + Math.random() * 200, 'sine', 0.1); break;
            case 'good': this.playTone(800, 'sine', 0.15); setTimeout(() => this.playTone(1200, 'sine', 0.15), 100); break;
            case 'bad': this.playTone(150, 'sawtooth', 0.3); break;
            case 'level': 
                this.playTone(400, 'sine', 0.2); 
                setTimeout(() => this.playTone(600, 'sine', 0.2), 150);
                setTimeout(() => this.playTone(800, 'sine', 0.4), 300);
                break;
            case 'boss': this.playTone(100, 'square', 0.5); break;
            case 'click': this.playTone(2000, 'triangle', 0.05, 0.05); break;
        }
    }
}

/* =========================================
   GAME ENGINE
   ========================================= */

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) throw new Error('Canvas not found');
        
        this.ctx = this.canvas.getContext('2d');
        
        // State
        this.state = 'START'; // START, TUTORIAL, PLAYING, PAUSED, LEVEL_COMPLETE, GAMEOVER, VICTORY, SUCCESS
        this.levelIndex = 0;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.comboTimer = 0;
        this.entities = [];
        this.particles = [];
        this.floatingTexts = [];
        this.lastFrameTime = 0;
        this.spawnTimer = 0;
        this.isPlaying = false;
        
        // Stats
        this.stats = {
            heartsCaught: 0,
            trapsDodged: 0,
            accuracy: 0, // calculated
            clicks: 0,
            hits: 0
        };

        // Systems
        this.audio = new AudioController();
        this.reduceMotion = StorageHelper.get('cmh_motion') === 'true';
        
        // Setup
        this.resize();
        this.bindEvents();
        this.loadSettings();
        
        // Start Loop
        requestAnimationFrame((t) => this.loop(t));
    }

    loadSettings() {
        // Load motion pref
        const motionToggle = document.getElementById('motion-toggle');
        if (motionToggle) {
            motionToggle.checked = this.reduceMotion;
        }
        
        // Load sound pref
        const soundToggle = document.getElementById('sound-toggle');
        this.audio.init(); // Init context (starts suspended usually)
        if (soundToggle) {
            soundToggle.checked = this.audio.enabled;
        }

        // Check for previous win
        if (StorageHelper.get('cmh_hasWon') === 'true') {
            const title = document.querySelector('#start-screen h1');
            if (title) title.innerText = "Catch My Heart 💘\n(Again?)";
        }
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());
        
        // Canvas Interaction
        const handleInput = (e) => {
            if (!this.isPlaying) return;
            e.preventDefault();
            
            const rect = this.canvas.getBoundingClientRect();
            let clientX, clientY;
            
            if (e.type.startsWith('touch')) {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    clientX = e.changedTouches[i].clientX;
                    clientY = e.changedTouches[i].clientY;
                    this.processInput(clientX - rect.left, clientY - rect.top);
                }
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
                this.processInput(clientX - rect.left, clientY - rect.top);
            }
        };

        this.canvas.addEventListener('mousedown', handleInput);
        this.canvas.addEventListener('touchstart', handleInput, { passive: false });

        // Helper to safe bind
        const bind = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.onclick = fn;
        };

        bind('start-btn', () => {
            this.audio.init(); // Ensure audio context is ready on user interaction
            this.audio.resume();
            this.audio.play('click');
            if (StorageHelper.get('cmh_tutorialDone') === 'true') {
                this.startLevel(1);
            } else {
                this.showScreen('tutorial-screen');
            }
        });
        
        bind('tutorial-btn', () => {
            this.audio.play('click');
            StorageHelper.set('cmh_tutorialDone', 'true');
            this.startLevel(1);
        });
        
        bind('pause-btn', () => this.togglePause());
        bind('resume-btn', () => this.togglePause());
        
        bind('restart-btn', () => {
            this.audio.play('click');
            this.startLevel(this.levelIndex + 1); // Restart current level
        });
        
        bind('quit-btn', () => {
            this.audio.play('click');
            this.showScreen('start-screen');
        });
        
        bind('next-level-btn', () => {
            this.audio.play('click');
            if (this.levelIndex + 1 < LEVELS.length) {
                this.startLevel(this.levelIndex + 2); // 1-based index in UI
            } else {
                this.winGame();
            }
        });

        bind('retry-btn', () => {
            this.audio.play('click');
            this.startLevel(this.levelIndex + 1);
        });

        bind('menu-btn', () => {
            this.audio.play('click');
            this.showScreen('start-screen');
        });

        // Victory Logic
        const noBtn = document.getElementById('no-btn');
        if (noBtn) {
            noBtn.addEventListener('mouseover', () => this.moveNoButton());
            noBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.moveNoButton(); });
            noBtn.addEventListener('click', () => this.moveNoButton());
        }

        bind('yes-btn', () => {
            this.audio.play('good');
            this.showScreen('success-screen');
            this.triggerConfetti();
        });

        bind('replay-btn', () => {
            this.levelIndex = 0; // Reset completely
            this.startLevel(1);
        });
        
        bind('reset-btn', () => {
            StorageHelper.clear();
            location.reload();
        });

        // Toggles
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) soundToggle.onchange = (e) => this.audio.toggle(e.target.checked);

        const motionToggle = document.getElementById('motion-toggle');
        if (motionToggle) motionToggle.onchange = (e) => {
            this.reduceMotion = e.target.checked;
            StorageHelper.set('cmh_motion', this.reduceMotion);
        };
    }

    /* =========================================
       GAMEPLAY LOGIC
       ========================================= */

    startLevel(levelNum) {
        this.levelIndex = levelNum - 1;
        this.levelConfig = LEVELS[this.levelIndex];
        
        // Reset Level State
        this.entities = [];
        this.particles = [];
        this.floatingTexts = [];
        this.score = 0; 
        this.combo = 0;
        this.stats = { heartsCaught: 0, trapsDodged: 0, clicks: 0, hits: 0 };
        
        // Update HUD
        const levelVal = document.getElementById('level-val');
        if (levelVal) levelVal.innerText = this.levelConfig.id;
        
        const targetVal = document.getElementById('target-val');
        if (targetVal) targetVal.innerText = this.levelConfig.target;
        
        this.updateHUD();
        
        // Show Level Intro
        this.showScreen('level-screen');
        const levelTitle = document.getElementById('level-title');
        if (levelTitle) levelTitle.innerText = `Level ${this.levelConfig.id}: ${this.levelConfig.name}`;
        
        const levelObj = document.getElementById('level-objective');
        if (levelObj) levelObj.innerText = `Goal: ${this.levelConfig.target} pts`;
        
        // Countdown
        let count = 3;
        const countEl = document.getElementById('level-countdown');
        if (countEl) countEl.innerText = count;
        
        const timer = setInterval(() => {
            count--;
            if (count > 0) {
                if (countEl) countEl.innerText = count;
                this.audio.play('click');
            } else {
                clearInterval(timer);
                if (countEl) countEl.innerText = "GO!";
                this.audio.play('good');
                setTimeout(() => {
                    this.showScreen(null); // Hide overlays
                    this.isPlaying = true;
                    this.state = 'PLAYING';
                    this.spawnTimer = 0;
                }, 500);
            }
        }, 800);
    }

    processInput(x, y) {
        this.stats.clicks++;
        this.createParticle(x, y, '#fff', 2); // Tap effect
        
        // Check hits (iterate backwards to hit top entities first)
        let hit = false;
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const ent = this.entities[i];
            const centerX = ent.x;
            const centerY = ent.y + ent.radius * 0.6; // visual center of heart
            const dx = x - centerX;
            const dy = y - centerY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < ent.radius * 0.9 + 20 || (Math.abs(dx) < ent.radius && Math.abs(dy) < ent.radius)) {
                this.hitEntity(ent, i);
                hit = true;
                break; // One tap = one hit
            }
        }
    }

    hitEntity(ent, index) {
        this.entities.splice(index, 1);
        this.stats.hits++;
        
        // Handle Effects
        if (ent.type === CONFIG.TYPES.BROKEN) {
            this.handleBadHit(ent);
        } else {
            this.handleGoodHit(ent);
        }
    }

    handleGoodHit(ent) {
        this.audio.play('pop');
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        this.comboTimer = CONFIG.COMBO_TIMER;
        
        let points = CONFIG.BASE_SCORE;
        if (ent.type === CONFIG.TYPES.GOLDEN) {
            points = CONFIG.GOLD_SCORE;
            this.audio.play('good');
            this.showFloatingText(ent.x, ent.y, "GOLD!", "#FFD700");
        } else if (ent.type === CONFIG.TYPES.BOSS) {
            points = 100;
            this.audio.play('boss');
        }
        
        // Combo Multiplier
        const multiplier = 1 + Math.floor(this.combo / 5) * 0.1;
        points = Math.round(points * multiplier);
        
        this.score += points;
        this.stats.heartsCaught++;
        
        // Visuals
        this.createExplosion(ent.x, ent.y, ent.color);
        this.showFloatingText(ent.x, ent.y, `+${points}`, "#fff");
        
        // Powerups
        if (ent.type === CONFIG.TYPES.SLOW) {
            this.applyPowerup('slow');
        } else if (ent.type === CONFIG.TYPES.NUKE) {
            this.applyPowerup('nuke');
        }

        // Funny messages
        if (this.combo % 10 === 0) {
            const msg = CONFIG.MESSAGES.HIGH_COMBO[Math.floor(Math.random() * CONFIG.MESSAGES.HIGH_COMBO.length)];
            this.showFloatingText(this.canvas.width/2, this.canvas.height/2, msg, "#ff69b4", 20);
        }

        this.checkWinCondition();
    }

    handleBadHit(ent) {
        this.audio.play('bad');
        this.combo = 0;
        this.score = Math.max(0, this.score - CONFIG.BROKEN_PENALTY);
        this.showFloatingText(ent.x, ent.y, "💔", "#ff0000");
        this.shakeScreen();
        
        const msg = CONFIG.MESSAGES.BROKEN_HIT[Math.floor(Math.random() * CONFIG.MESSAGES.BROKEN_HIT.length)];
        this.showFloatingText(this.canvas.width/2, 100, msg, "#ff0000", 18);
    }

    applyPowerup(type) {
        if (type === 'slow') {
            this.entities.forEach(e => e.vy *= 0.5);
            this.showFloatingText(this.canvas.width/2, this.canvas.height/2, "CHILL OUT ❄️", "#00ffff", 24);
        } else if (type === 'nuke') {
            // Clear all bad hearts
            this.entities = this.entities.filter(e => {
                if (e.type === CONFIG.TYPES.BROKEN) {
                    this.createExplosion(e.x, e.y, e.color);
                    return false;
                }
                return true;
            });
            this.showFloatingText(this.canvas.width/2, this.canvas.height/2, "RED FLAGS CLEARED ✅", "#00ff00", 24);
        }
    }

    checkWinCondition() {
        if (this.score >= this.levelConfig.target) {
            this.levelComplete();
        }
    }

    levelComplete() {
        this.isPlaying = false;
        this.state = 'LEVEL_COMPLETE';
        this.audio.play('level');
        
        const acc = Math.round((this.stats.hits / this.stats.clicks) * 100) || 0;
        
        // Random funny recap
        const msgs = ["TZAAAAAA, ESTI PRAF", "Heart collector!", "Smooth operator.", "Is it hot in here?"];
        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        
        const msgEl = document.getElementById('complete-msg');
        if (msgEl) msgEl.innerText = msg;

        const scoreEl = document.getElementById('stat-score');
        if (scoreEl) scoreEl.innerText = this.score;

        const comboEl = document.getElementById('stat-combo');
        if (comboEl) comboEl.innerText = this.maxCombo;

        const accEl = document.getElementById('stat-acc');
        if (accEl) accEl.innerText = acc + "%";
        
        // Star rating
        const stars = document.getElementById('star-rating');
        if (stars) {
            let starCount = 1;
            if (acc > 80) starCount++;
            if (this.maxCombo > 10) starCount++;
            stars.innerHTML = "⭐".repeat(starCount);
        }
        
        this.showScreen('level-complete-screen');
    }

    winGame() {
        this.isPlaying = false;
        this.state = 'VICTORY';
        StorageHelper.set('cmh_hasWon', 'true');
        this.audio.play('level'); // Victory fanfare
        this.showScreen('victory-screen');
    }

    gameOver() {
        this.isPlaying = false;
        this.state = 'GAMEOVER';
        this.audio.play('bad');
        
        const msgs = ["Mission Failed: We'll get 'em next time.", "Love hurts.", "Friendzoned.", "Left on read."];
        const reasonEl = document.getElementById('death-reason');
        if (reasonEl) reasonEl.innerText = msgs[Math.floor(Math.random() * msgs.length)];
        
        // Calculate stats
        const acc = this.stats.clicks > 0 ? Math.round((this.stats.hits / this.stats.clicks) * 100) : 0;
        
        const fScore = document.getElementById('final-score-val');
        if (fScore) fScore.innerText = this.score;

        const fCombo = document.getElementById('final-combo-val');
        if (fCombo) fCombo.innerText = this.maxCombo;

        const fAcc = document.getElementById('final-acc-val');
        if (fAcc) fAcc.innerText = acc + "%";
        
        this.showScreen('game-over-screen');
    }

    /* =========================================
       UPDATE & DRAW
       ========================================= */

    loop(timestamp) {
        const dt = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        if (this.isPlaying && this.state === 'PLAYING') {
            this.update(dt);
            this.draw();
        } else {
            if (this.state === 'VICTORY' || this.state === 'SUCCESS') {
                // Keep particles rendering for confetti
                this.updateParticles(dt);
                this.draw(); // Clear and draw only particles?
            }
        }
        
        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        // Spawning
        this.spawnTimer += dt;
        if (this.spawnTimer > this.levelConfig.spawnRate) {
            this.spawnEntity();
            this.spawnTimer = 0;
        }

        // Combo Timer
        if (this.combo > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.combo = 0;
            }
        }

        // Entities
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const ent = this.entities[i];
            ent.y += ent.vy;
            ent.x += ent.vx;
            
            // Wall bounce (optional, mostly fall down)
            if (ent.x < ent.radius || ent.x > this.canvas.width - ent.radius) ent.vx *= -1;

            // Remove off-screen
            if (ent.y > this.canvas.height + 50) {
                if (ent.type === CONFIG.TYPES.NORMAL || ent.type === CONFIG.TYPES.GOLDEN) {
                    // Missed a good heart
                    // Optional: Penalty? For now, just reset combo
                    if (this.combo > 0) this.combo = 0;
                } else if (ent.type === CONFIG.TYPES.BROKEN) {
                    this.stats.trapsDodged++;
                    // Funny text for dodging
                    if (Math.random() < 0.1) {
                         const msg = CONFIG.MESSAGES.NEAR_MISS[Math.floor(Math.random() * CONFIG.MESSAGES.NEAR_MISS.length)];
                         this.showFloatingText(ent.x, this.canvas.height - 50, msg, "#aaa", 14);
                    }
                }
                this.entities.splice(i, 1);
            }
        }

        this.updateParticles(dt);
        this.updateFloatingText(dt);
        this.updateHUD();
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // gravity
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    updateFloatingText(dt) {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const t = this.floatingTexts[i];
            t.life -= dt;
            t.y -= 0.5; // Float up
            if (t.life <= 0) this.floatingTexts.splice(i, 1);
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw Entities
        this.entities.forEach(ent => {
            this.ctx.save();
            this.ctx.translate(ent.x, ent.y);
            
            // Draw Heart Shape
            this.ctx.fillStyle = ent.color;
            this.ctx.beginPath();
            
            // Simple Heart Path
            const s = ent.radius / 30; // Scale
            this.ctx.scale(s, s);
            this.ctx.translate(0, -5);
            
            this.ctx.moveTo(0, 0);
            this.ctx.bezierCurveTo(-20, -25, -45, -5, 0, 35);
            this.ctx.bezierCurveTo(45, -5, 20, -25, 0, 0);
            this.ctx.fill();
            
            if (ent.type === CONFIG.TYPES.BROKEN) {
                this.ctx.strokeStyle = "#333";
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(-15, -10);
                this.ctx.lineTo(0, 10);
                this.ctx.lineTo(15, -10);
                this.ctx.stroke();
            }

            // Icon overlay for powerups
            if (ent.icon) {
                this.ctx.fillStyle = "#fff";
                this.ctx.font = "20px Arial";
                this.ctx.textAlign = "center";
                this.ctx.fillText(ent.icon, 0, 10);
            }

            this.ctx.restore();
        });

        // Draw Particles
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life / 500;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });

        // Draw Floating Text (using DOM overlay is better for accessibility, but canvas is faster for game loop)
        this.ctx.font = "bold 20px 'Segoe UI', sans-serif";
        this.ctx.textAlign = "center";
        this.floatingTexts.forEach(t => {
            this.ctx.fillStyle = t.color;
            this.ctx.fillText(t.text, t.x, t.y);
        });
    }

    updateHUD() {
        if (!this.isPlaying) return;
        
        const scoreVal = document.getElementById('score-val');
        if (scoreVal) scoreVal.innerText = this.score;
        
        const comboVal = document.getElementById('combo-val');
        if (comboVal) comboVal.innerText = this.combo;
        
        // Progress Bar
        const progress = Math.min(100, (this.score / this.levelConfig.target) * 100);
        const pFill = document.getElementById('progress-fill');
        if (pFill) pFill.style.width = `${progress}%`;
        
        // Combo Bar
        const comboPct = Math.min(100, (this.comboTimer / CONFIG.COMBO_TIMER) * 100);
        const cFill = document.getElementById('combo-fill');
        if (cFill) cFill.style.width = `${comboPct}%`;
    }

    /* =========================================
       HELPERS
       ========================================= */

    spawnEntity() {
        const typeRoll = Math.random();
        let type = CONFIG.TYPES.NORMAL;
        let color = "#ff4d6d";
        let icon = null;
        
        if (typeRoll < this.levelConfig.hazardRatio) {
            type = CONFIG.TYPES.BROKEN;
            color = "#555";
        } else if (typeRoll < this.levelConfig.hazardRatio + this.levelConfig.powerupRatio) {
            // Powerup or Gold
            const subRoll = Math.random();
            if (subRoll < 0.4) {
                type = CONFIG.TYPES.GOLDEN;
                color = "#FFD700";
            } else if (subRoll < 0.7) {
                type = CONFIG.TYPES.SLOW;
                color = "#00ced1";
                icon = "❄️";
            } else {
                type = CONFIG.TYPES.NUKE;
                color = "#ff4500";
                icon = "💣";
            }
        }

        const margin = 40;
        const x = margin + Math.random() * (this.canvas.width - margin * 2);
        const y = -50;
        const speed = this.levelConfig.speedMin + Math.random() * (this.levelConfig.speedMax - this.levelConfig.speedMin);
        
        this.entities.push({
            x, y,
            vx: (Math.random() - 0.5) * 1,
            vy: speed * CONFIG.SPEED_MULTIPLIER,
            type,
            color,
            icon,
            radius: CONFIG.PLAYER_RADIUS
        });
    }

    createExplosion(x, y, color) {
        if (this.reduceMotion) return;
        const count = 10;
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 500 + Math.random() * 300,
                color: color,
                size: 2 + Math.random() * 4
            });
        }
    }
    
    createParticle(x, y, color, size) {
        if (this.reduceMotion) return;
        this.particles.push({
            x, y,
            vx: 0,
            vy: 0,
            life: 300,
            color: color,
            size: size
        });
    }

    showFloatingText(x, y, text, color, size = 20) {
        this.floatingTexts.push({
            x, y,
            text,
            color,
            life: 800
        });
    }

    shakeScreen() {
        if (this.reduceMotion) return;
        const container = document.getElementById('game-canvas');
        if (container) {
            container.style.transform = "translate(5px, 5px)";
            setTimeout(() => container.style.transform = "translate(-5px, -5px)", 50);
            setTimeout(() => container.style.transform = "translate(5px, -5px)", 100);
            setTimeout(() => container.style.transform = "none", 150);
        }
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            this.isPlaying = false;
            this.showScreen('pause-screen');
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            this.isPlaying = true;
            this.showScreen(null); // Hide pause screen
        }
    }

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        if (id) {
            const el = document.getElementById(id);
            if (el) el.classList.add('active');
        }
    }

    moveNoButton() {
        const btn = document.getElementById('no-btn');
        const container = document.getElementById('victory-screen');
        if (btn && container) {
            const rect = container.getBoundingClientRect();
            
            const newX = Math.random() * (rect.width - 100);
            const newY = Math.random() * (rect.height - 50);
            
            btn.style.position = 'absolute';
            btn.style.left = `${newX}px`;
            btn.style.top = `${newY}px`;
            
            btn.innerText = "Nice try 😅";
            this.audio.play('click');
        }
    }

    triggerConfetti() {
        if (window.confetti) {
            window.confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 }
            });
        } else {
            // Fallback
            for (let i = 0; i < 100; i++) {
                this.createExplosion(this.canvas.width/2, this.canvas.height/2, `hsl(${Math.random()*360}, 100%, 50%)`);
            }
        }
    }
}

// Init Game with Error Handling
function initGame() {
    try {
        window.game = new Game();
        console.log("Catch My Heart: Game Initialized");
    } catch (e) {
        console.error("Game Initialization Failed:", e);
        // Fallback or Alert?
        // document.body.innerHTML = `<h1>Game Error</h1><p>${e.message}</p>`;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
