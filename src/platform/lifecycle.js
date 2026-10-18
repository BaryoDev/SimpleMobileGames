import { backAction } from './back.js';

export function wireLifecycle({ App, scene, onBack, onPause }) {
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
  ];
  return async () => {
    const resolved = await Promise.all(handles);
    await Promise.all(resolved.map((h) => h.remove()));
  };
}
