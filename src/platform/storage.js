import { Preferences } from '@capacitor/preferences';

export function createStorage() {
  return {
    async getItem(key) {
      const { value } = await Preferences.get({ key });
      return value;
    },
    async setItem(key, value) {
      await Preferences.set({ key, value: String(value) });
    },
    async removeItem(key) {
      await Preferences.remove({ key });
    },
  };
}
