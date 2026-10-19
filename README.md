# Bird Flight

A one-tap flying game for Android. Tap to flap, slip through the pipes and beat your best score. Built with Vite, [dopaminejs](https://www.npmjs.com/package/dopaminejs) and Capacitor 8.

## Scripts

- `npm run dev`: start the Vite dev server.
- `npm run build`: build the web app into `www/`.
- `npm test`: run the unit tests with Vitest (`tests/unit`).
- `npm run e2e`: run the Playwright tests (`tests/e2e`) on a Pixel 7 profile against a preview build.
- `npm run sync`: build, then copy `www/` into the Android project.
- `npm run apk`: sync and build a debug APK.
- `npm run bundle`: sync and build a release app bundle.

Android builds need JDK 21.

## Releasing

A release is a signed app bundle from `npm run bundle`, uploaded to the Play Console. The signing key and `keystore.properties` stay out of the repo. The steps are in `PLAYSTORE_DEPLOYMENT.md`.

## License

MIT, see [LICENSE](LICENSE).
