# Google Play Store Deployment Guide

This guide will walk you through deploying your Bird Flight app to the Google Play Store.

## Prerequisites

- [ ] Google Play Console account ($25 one-time registration fee)
- [ ] App icon (512x512 PNG)
- [ ] Screenshots (at least 2, recommended sizes)
- [ ] Privacy Policy URL (required for Play Store)

## Step 1: Create a Signing Key

Android apps must be signed before they can be uploaded to Play Store.

```bash
# Navigate to your project
cd /Users/arnelirobles/Documents/repos/HTMLGames/android

# Generate a keystore (you'll be asked to create a password)
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# Important: Save the password and alias - you'll need them!
```

**IMPORTANT**: Keep your keystore file and passwords secure! You'll need them for all future updates.

## Step 2: Configure Gradle for Release Build

Create or edit `android/app/build.gradle.kts` to add signing configuration:

1. Add this before the `android` block:

```kotlin
// Load keystore properties
val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = java.util.Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(java.io.FileInputStream(keystorePropertiesFile))
}
```

2. Inside the `android` block, add:

```kotlin
signingConfigs {
    create("release") {
        keyAlias = keystoreProperties["keyAlias"] as String
        keyPassword = keystoreProperties["keyPassword"] as String
        storeFile = file(keystoreProperties["storeFile"] as String)
        storePassword = keystoreProperties["storePassword"] as String
    }
}

buildTypes {
    release {
        isMinifyEnabled = true
        isShrinkResources = true
        proguardFiles(
            getDefaultProguardFile("proguard-android-optimize.txt"),
            "proguard-rules.pro"
        )
        signingConfig = signingConfigs.getByName("release")
    }
}
```

3. Create `android/keystore.properties`:

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=my-key-alias
storeFile=my-release-key.keystore
```

**IMPORTANT**: Add `keystore.properties` and `*.keystore` to `.gitignore`!

## Step 3: Update App Configuration

Edit `android/app/build.gradle.kts`:

```kotlin
android {
    namespace = "com.yourdomain.htmlgames"  // Change this!
    compileSdk = 34

    defaultConfig {
        applicationId = "com.yourdomain.htmlgames"  // Must be unique!
        minSdk = 24
        targetSdk = 34
        versionCode = 1  // Increment for each release
        versionName = "1.0.0"
    }
}
```

Also update `capacitor.config.json`:

```json
{
  "appId": "com.yourdomain.htmlgames",
  "appName": "Bird Flight"
}
```

## Step 4: Build Release APK/AAB

Google Play now requires AAB (Android App Bundle) format instead of APK:

```bash
# Set Java 21
export JAVA_HOME=$(/usr/libexec/java_home -v 21)

# Build release AAB
cd android
./gradlew bundleRelease

# Output location:
# android/app/build/outputs/bundle/release/app-release.aab
```

## Step 5: Prepare App Assets

### App Icon
- Size: 512x512 PNG
- Format: 32-bit PNG with alpha channel
- No rounded corners (Google adds them)

### Screenshots
- At least 2 screenshots required
- Recommended: 1080x1920 (portrait) or 1920x1080 (landscape)
- Max 8 screenshots

### Feature Graphic
- Size: 1024x500 PNG
- Used in Play Store listing

### Privacy Policy
- Required for apps that collect data
- Must be hosted on a public URL
- Can use free hosting like GitHub Pages

## Step 6: Create Play Console Account

1. Go to [Google Play Console](https://play.google.com/console)
2. Sign in with your Google account
3. Pay the $25 one-time registration fee
4. Accept the Developer Distribution Agreement
5. Complete account details

## Step 7: Create App in Play Console

1. Click "Create app"
2. Fill in:
   - App name: "Bird Flight" (or your preferred name)
   - Default language: English
   - App or game: Game
   - Free or paid: Free
3. Accept declarations
4. Click "Create app"

## Step 8: Complete Store Listing

### Main Store Listing
- **App name**: Bird Flight
- **Short description**: Tap to flap through the pipes
- **Full description**: 
  ```
  Bird Flight is a one-tap flying game. Tap to flap, slip through the pipes and beat your best score.
  ```

### Graphics
- Upload app icon (512x512)
- Upload feature graphic (1024x500)
- Upload at least 2 screenshots

### Categorization
- App category: Games > Arcade
- Content rating: Complete questionnaire
- Target audience: Select appropriate age groups

## Step 9: Set Up Privacy Policy

Create a simple privacy policy:

```markdown
# Privacy Policy for Bird Flight

We do not collect, store, or share any personal information.
This app does not require internet permissions.
The game runs locally on your device.

Contact: your-email@example.com
Last updated: [Current Date]
```

Host it on GitHub Pages or any public URL, then add the URL in Play Console.

## Step 10: Upload AAB and Submit

1. Go to "Production" > "Create new release"
2. Upload your AAB file: `android/app/build/outputs/bundle/release/app-release.aab`
3. Fill in release notes:
   ```
   Initial release
   - Flappy Bird game
   - Dice Master game  
   - Sky Ace game
   ```
4. Save and review
5. Click "Submit for review"

## Step 11: Review Process

- Google typically reviews apps within 1-3 days
- You'll receive an email when the review is complete
- If approved, your app will be published!
- If rejected, address the issues and resubmit

## Future Updates

To release an update:

1. Update `versionCode` and `versionName` in `build.gradle.kts`
2. Rebuild: `./gradlew bundleRelease`
3. In Play Console, create new release in Production
4. Upload new AAB
5. Submit for review

## Troubleshooting

### "App not signed" error
- Make sure you created the release build, not debug
- Verify keystore.properties is correct

### "Version code already used"
- Increment `versionCode` in build.gradle.kts

### "Package name already exists"
- Change `applicationId` to a unique identifier

## Cost Summary

- Google Play Console registration: $25 (one-time)
- App hosting: Free
- Updates: Free

## Next Steps

1. ✅ Change package name from `com.example.htmlgames`
2. ✅ Create signing key
3. ✅ Build release AAB
4. ✅ Prepare app assets (icon, screenshots)
5. ✅ Create privacy policy
6. ✅ Register Play Console account
7. ✅ Create and submit app

Good luck with your app launch! 🚀
