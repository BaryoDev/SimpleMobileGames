/**
 * Data Service - Abstraction Layer for Data Persistence
 * 
 * Current Implementation: LocalStorage (Offline)
 * Future: Can be swapped to Firebase, Supabase, or custom API
 * 
 * This abstraction allows all game code to remain unchanged when
 * switching from offline to online storage.
 */

class DataService {
    constructor() {
        this.storagePrefix = 'simplemobilegames_';
        this.useOnline = false; // Set to true when online backend is ready
    }

    /**
     * Save data to storage
     * @param {string} key - Storage key
     * @param {any} value - Data to store (will be JSON.stringify'd)
     * @returns {Promise<boolean>} Success status
     */
    async save(key, value) {
        if (this.useOnline) {
            return this._saveOnline(key, value);
        }
        return this._saveOffline(key, value);
    }

    /**
     * Load data from storage
     * @param {string} key - Storage key
     * @param {any} defaultValue - Default value if key doesn't exist
     * @returns {Promise<any>} Stored data or default value
     */
    async load(key, defaultValue = null) {
        if (this.useOnline) {
            return this._loadOnline(key, defaultValue);
        }
        return this._loadOffline(key, defaultValue);
    }

    /**
     * Delete data from storage
     * @param {string} key - Storage key
     * @returns {Promise<boolean>} Success status
     */
    async delete(key) {
        if (this.useOnline) {
            return this._deleteOnline(key);
        }
        return this._deleteOffline(key);
    }

    /**
     * Get all keys matching a pattern
     * @param {string} pattern - Key pattern to match
     * @returns {Promise<Array<string>>} Array of matching keys
     */
    async getKeys(pattern = '') {
        if (this.useOnline) {
            return this._getKeysOnline(pattern);
        }
        return this._getKeysOffline(pattern);
    }

    // ==================== OFFLINE IMPLEMENTATION (LocalStorage) ====================

    _saveOffline(key, value) {
        try {
            const fullKey = this.storagePrefix + key;
            localStorage.setItem(fullKey, JSON.stringify(value));
            return Promise.resolve(true);
        } catch (error) {
            console.error('Failed to save to LocalStorage:', error);
            return Promise.resolve(false);
        }
    }

    _loadOffline(key, defaultValue = null) {
        try {
            const fullKey = this.storagePrefix + key;
            const item = localStorage.getItem(fullKey);
            if (item === null) {
                return Promise.resolve(defaultValue);
            }
            return Promise.resolve(JSON.parse(item));
        } catch (error) {
            console.error('Failed to load from LocalStorage:', error);
            return Promise.resolve(defaultValue);
        }
    }

    _deleteOffline(key) {
        try {
            const fullKey = this.storagePrefix + key;
            localStorage.removeItem(fullKey);
            return Promise.resolve(true);
        } catch (error) {
            console.error('Failed to delete from LocalStorage:', error);
            return Promise.resolve(false);
        }
    }

    _getKeysOffline(pattern = '') {
        try {
            const keys = [];
            const prefixLength = this.storagePrefix.length;

            for (let i = 0; i < localStorage.length; i++) {
                const fullKey = localStorage.key(i);
                if (fullKey && fullKey.startsWith(this.storagePrefix)) {
                    const key = fullKey.substring(prefixLength);
                    if (!pattern || key.includes(pattern)) {
                        keys.push(key);
                    }
                }
            }

            return Promise.resolve(keys);
        } catch (error) {
            console.error('Failed to get keys from LocalStorage:', error);
            return Promise.resolve([]);
        }
    }

    // ==================== ONLINE IMPLEMENTATION (Placeholder) ====================
    // These methods will be implemented when connecting to an online backend

    async _saveOnline(key, value) {
        // TODO: Implement online save
        // Example for Firebase:
        // return firebase.database().ref(`users/${userId}/${key}`).set(value);

        // Example for custom API:
        // return fetch(`/api/save`, {
        //     method: 'POST',
        //     body: JSON.stringify({ key, value })
        // }).then(r => r.ok);

        throw new Error('Online storage not implemented yet');
    }

    async _loadOnline(key, defaultValue = null) {
        // TODO: Implement online load
        throw new Error('Online storage not implemented yet');
    }

    async _deleteOnline(key) {
        // TODO: Implement online delete
        throw new Error('Online storage not implemented yet');
    }

    async _getKeysOnline(pattern = '') {
        // TODO: Implement online getKeys
        throw new Error('Online storage not implemented yet');
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Export all data (for backup or migration)
     * @returns {Promise<Object>} All stored data
     */
    async exportAll() {
        const keys = await this.getKeys();
        const data = {};

        for (const key of keys) {
            data[key] = await this.load(key);
        }

        return data;
    }

    /**
     * Import data (for restore or migration)
     * @param {Object} data - Data object to import
     * @returns {Promise<boolean>} Success status
     */
    async importAll(data) {
        try {
            for (const [key, value] of Object.entries(data)) {
                await this.save(key, value);
            }
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }

    /**
     * Clear all game data (use with caution!)
     * @returns {Promise<boolean>} Success status
     */
    async clearAll() {
        try {
            const keys = await this.getKeys();
            for (const key of keys) {
                await this.delete(key);
            }
            return true;
        } catch (error) {
            console.error('Failed to clear data:', error);
            return false;
        }
    }
}

// Create singleton instance
const dataService = new DataService();
