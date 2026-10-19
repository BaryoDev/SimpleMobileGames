import { backAction } from './back.js';

export function wireLifecycle({ App, scene, onBack, onPause }) {
  const warn = (error) => {
    console.warn('[bird-flight] could not register a listener', error);
    return null;
  };
  const handles = [
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) return;
      if (scene.paused || scene.world.phase !== 'playing') return;
      scene.pause();
      onPause?.();
    }),
    App.addListener('backButton', () => {
      onBack(backAction({ phase: scene.world.phase, paused: scene.paused }));
    }),
  ].map((p) => Promise.resolve(p).catch(warn));
  return async () => {
    const resolved = await Promise.all(handles);
    await Promise.all(resolved.filter(Boolean).map((h) => h.remove()));
  };
}
