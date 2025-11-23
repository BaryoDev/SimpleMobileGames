import { rewardSystem } from './core/RewardSystem.js';
import { dataService } from './core/DataService.js';
import { gameUI } from './ui/GameUI.js';
import { particleSystem } from './effects/ParticleSystem.js';
import { soundManager } from './audio/SoundManager.js';
import './ui/dopamine.css';

export { rewardSystem, dataService, gameUI, particleSystem, soundManager };

export default class Dopamine {
    constructor(config = {}) {
        this.config = config;
    }

    async init() {
        await rewardSystem.init();
        console.log('DopamineJS Initialized 🚀');
        return {
            rewardSystem,
            gameUI,
            particleSystem,
            soundManager
        };
    }
}
