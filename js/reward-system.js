/**
 * Reward System - Dopamine-Driven Game Mechanics
 * 
 * Manages achievements, XP, levels, streaks, and rewards
 * Uses DataService for storage (currently offline, ready for online)
 */

class RewardSystem {
    constructor() {
        this.player = null;
        this.achievements = this._initAchievements();
        this.listeners = [];
    }

    /**
     * Initialize the reward system for current player
     * @returns {Promise<Object>} Player data
     */
    async init() {
        this.player = await dataService.load('player', this._getDefaultPlayer());

        // Check daily streak
        this._updateDailyStreak();

        // Save updated player data
        await this.save();

        return this.player;
    }

    /**
     * Get default player data structure
     */
    _getDefaultPlayer() {
        return {
            name: 'Player',
            xp: 0,
            level: 1,
            totalGamesPlayed: 0,
            createdAt: Date.now(),
            lastPlayedAt: Date.now(),
            streak: {
                current: 1,
                longest: 1,
                lastPlayDate: this._getTodayDateString()
            },
            achievements: {}, // achievement_id: { unlockedAt: timestamp, seen: boolean }
            stats: {
                birdFlight: { highScore: 0, totalPlays: 0, totalScore: 0 },
                diceMaster: { highScore: 0, totalPlays: 0, wins: 0, losses: 0 },
                skyAce: { highScore: 0, totalPlays: 0, kills: 0 },
                blockDrop: { highScore: 0, totalPlays: 0, linesCleared: 0 },
                chessMaster: { wins: 0, losses: 0, draws: 0, totalPlays: 0 }
            }
        };
    }

    /**
     * Save player data
     */
    async save() {
        if (this.player) {
            this.player.lastPlayedAt = Date.now();
            await dataService.save('player', this.player);
        }
    }

    /**
     * Add XP and handle level ups
     * @param {number} amount - XP to add
     * @param {string} reason - Why XP was awarded (for notifications)
     * @returns {Object} { leveledUp: boolean, newLevel: number, xpGained: number }
     */
    async addXP(amount, reason = '') {
        const oldLevel = this.player.level;
        this.player.xp += amount;

        // Check for level up
        const newLevel = this._calculateLevel(this.player.xp);
        const leveledUp = newLevel > oldLevel;

        if (leveledUp) {
            this.player.level = newLevel;
        }

        await this.save();

        // Notify listeners
        this._emit('xp_gained', { amount, reason, leveledUp, newLevel });

        if (leveledUp) {
            this._emit('level_up', { oldLevel, newLevel });
        }

        return { leveledUp, newLevel, xpGained: amount };
    }

    /**
     * Calculate level from XP (exponential curve)
     * Level 1: 0 XP
     * Level 2: 100 XP
     * Level 3: 250 XP
     * Level 4: 450 XP
     * ...exponentially increases
     */
    _calculateLevel(xp) {
        // Formula: XP = 50 * level * (level - 1)
        // Solving for level: level = (1 + sqrt(1 + 8*XP/50)) / 2
        const level = Math.floor((1 + Math.sqrt(1 + 8 * xp / 50)) / 2);
        return Math.max(1, level);
    }

    /**
     * Get XP needed for next level
     */
    getXPForNextLevel() {
        const nextLevel = this.player.level + 1;
        const xpNeeded = 50 * nextLevel * (nextLevel - 1);
        const currentLevelXP = 50 * this.player.level * (this.player.level - 1);
        return {
            total: xpNeeded,
            needed: xpNeeded - this.player.xp,
            progress: (this.player.xp - currentLevelXP) / (xpNeeded - currentLevelXP)
        };
    }

    /**
     * Record game result and award XP
     * @param {string} gameName - 'birdFlight', 'diceMaster', etc.
     * @param {Object} result - Game-specific result data
     */
    async recordGame(gameName, result) {
        const stats = this.player.stats[gameName];
        if (!stats) {
            console.error(`Unknown game: ${gameName}`);
            return;
        }

        // Update stats
        stats.totalPlays++;
        this.player.totalGamesPlayed++;

        // Update high score if applicable
        if (result.score !== undefined && result.score > stats.highScore) {
            stats.highScore = result.score;
            this._emit('new_high_score', { gameName, score: result.score });
        }

        // Game-specific stat updates
        if (gameName === 'birdFlight') {
            stats.totalScore = (stats.totalScore || 0) + (result.score || 0);
        } else if (gameName === 'diceMaster') {
            if (result.won) stats.wins++;
            else stats.losses++;
        } else if (gameName === 'skyAce') {
            stats.kills = (stats.kills || 0) + (result.kills || 0);
        } else if (gameName === 'blockDrop') {
            stats.linesCleared = (stats.linesCleared || 0) + (result.lines || 0);
        } else if (gameName === 'chessMaster') {
            if (result.result === 'win') stats.wins++;
            else if (result.result === 'loss') stats.losses++;
            else if (result.result === 'draw') stats.draws++;
        }

        // Base XP for playing
        let xp = 10;

        // Score-based bonus
        if (result.score) {
            xp += Math.floor(result.score / 5);
        }

        // Streak multiplier
        xp = Math.floor(xp * this.getStreakMultiplier());

        await this.addXP(xp, `Played ${gameName}`);

        // Check for achievements
        await this.checkAchievements(gameName, result);

        await this.save();
    }

    /**
     * Check and unlock achievements
     */
    async checkAchievements(gameName, result) {
        const unlockedAchievements = [];

        for (const [id, achievement] of Object.entries(this.achievements)) {
            // Skip if already unlocked
            if (this.player.achievements[id]) continue;

            // Check if achievement condition is met
            if (achievement.check(this.player, gameName, result)) {
                await this.unlockAchievement(id);
                unlockedAchievements.push(achievement);
            }
        }

        return unlockedAchievements;
    }

    /**
     * Unlock an achievement
     */
    async unlockAchievement(achievementId) {
        const achievement = this.achievements[achievementId];
        if (!achievement) return false;

        // Mark as unlocked
        this.player.achievements[achievementId] = {
            unlockedAt: Date.now(),
            seen: false
        };

        // Award XP
        await this.addXP(achievement.xp, `Achievement: ${achievement.name}`);

        this._emit('achievement_unlocked', achievement);
        await this.save();

        return true;
    }

    /**
     * Get all unlocked achievements
     */
    getUnlockedAchievements() {
        return Object.entries(this.player.achievements)
            .map(([id, data]) => ({
                ...this.achievements[id],
                id,
                ...data
            }));
    }

    /**
     * Get achievements user hasn't seen the notification for yet
     */
    getUnseenAchievements() {
        return this.getUnlockedAchievements().filter(a => !a.seen);
    }

    /**
     * Mark achievements as seen
     */
    async markAchievementsSeen(achievementIds) {
        for (const id of achievementIds) {
            if (this.player.achievements[id]) {
                this.player.achievements[id].seen = true;
            }
        }
        await this.save();
    }

    /**
     * Update daily streak
     */
    _updateDailyStreak() {
        const today = this._getTodayDateString();
        const lastPlayed = this.player.streak.lastPlayDate;

        if (lastPlayed === today) {
            // Already played today
            return;
        }

        const yesterday = this._getYesterdayDateString();

        if (lastPlayed === yesterday) {
            // Streak continues!
            this.player.streak.current++;
            if (this.player.streak.current > this.player.streak.longest) {
                this.player.streak.longest = this.player.streak.current;
            }
        } else {
            // Streak broken
            this.player.streak.current = 1;
        }

        this.player.streak.lastPlayDate = today;
    }

    /**
     * Get streak multiplier for XP
     */
    getStreakMultiplier() {
        const streak = this.player.streak.current;
        if (streak >= 7) return 2.0;  // 2× at 7 days
        if (streak >= 5) return 1.5;  // 1.5× at 5 days
        if (streak >= 3) return 1.25; // 1.25× at 3 days
        return 1.0;
    }

    /**
     * Get today's date as YYYY-MM-DD string
     */
    _getTodayDateString() {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * Get yesterday's date as YYYY-MM-DD string
     */
    _getYesterdayDateString() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }

    /**
     * Event system for UI updates
     */
    on(event, callback) {
        this.listeners.push({ event, callback });
    }

    _emit(event, data) {
        this.listeners
            .filter(l => l.event === event)
            .forEach(l => l.callback(data));
    }

    /**
     * Initialize achievement definitions
     */
    _initAchievements() {
        return {
            // Universal achievements
            'first_game': {
                name: 'First Steps',
                description: 'Play your first game',
                icon: '🎮',
                xp: 50,
                check: (player) => player.totalGamesPlayed >= 1
            },
            'level_5': {
                name: 'Rising Star',
                description: 'Reach level 5',
                icon: '⭐',
                xp: 100,
                check: (player) => player.level >= 5
            },
            'level_10': {
                name: 'Expert Player',
                description: 'Reach level 10',
                icon: '🏆',
                xp: 250,
                check: (player) => player.level >= 10
            },
            'streak_3': {
                name: 'Dedicated',
                description: 'Play 3 days in a row',
                icon: '🔥',
                xp: 100,
                check: (player) => player.streak.current >= 3
            },
            'streak_7': {
                name: 'Unstoppable',
                description: 'Play 7 days in a row',
                icon: '💥',
                xp: 300,
                check: (player) => player.streak.current >= 7
            },

            // Bird Flight achievements
            'bird_first_point': {
                name: 'Learning to Fly',
                description: 'Score your first point in Bird Flight',
                icon: '🐣',
                xp: 25,
                check: (player, game) => game === 'birdFlight' && player.stats.birdFlight.highScore >= 1
            },
            'bird_10': {
                name: 'Sky Dancer',
                description: 'Score 10 in Bird Flight',
                icon: '🐦',
                xp: 50,
                check: (player, game) => game === 'birdFlight' && player.stats.birdFlight.highScore >= 10
            },
            'bird_25': {
                name: 'Ace Pilot',
                description: 'Score 25 in Bird Flight',
                icon: '🦅',
                xp: 150,
                check: (player, game) => game === 'birdFlight' && player.stats.birdFlight.highScore >= 25
            },

            // Add more achievements for other games...
            // (We'll expand this as we enhance each game)
        };
    }
}

// Create singleton instance
const rewardSystem = new RewardSystem();
