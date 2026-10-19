export function createHaptics(Haptics, isNative) {
  const fire = (call) => {
    if (!isNative) return;
    try {
      Promise.resolve(call()).catch(() => {});
    } catch {
      // haptics are optional, a failure must not reach the frame
    }
  };
  return {
    flap: () => fire(() => Haptics.impact({ style: 'LIGHT' })),
    score: () => fire(() => Haptics.impact({ style: 'MEDIUM' })),
    crash: () => fire(() => Haptics.notification({ type: 'ERROR' })),
  };
}
