# Ko-fi Setup Instructions

Your app now has a Ko-fi donation button on the main menu!

## Steps to Configure:

### 1. Create Your Ko-fi Account
- Go to https://ko-fi.com
- Sign up for a free account
- Choose your username (this will be in your URL)

### 2. Update the Donation Link
Open `index.html` and replace the placeholder:

```html
<!-- Change this line (around line 413): -->
<a href="https://ko-fi.com/YOUR_USERNAME" target="_blank" class="support-btn">

<!-- To your actual Ko-fi username: -->
<a href="https://ko-fi.com/yourActualUsername" target="_blank" class="support-btn">
```

### 3. Sync and Rebuild
After updating your username, run:
```bash
cd /Users/arnelirobles/Documents/repos/HTMLGames
npx cap sync
cd android && ./gradlew assembleDebug
```

## Ko-fi Features:
- ✅ **One-time donations** - Users can buy you a "coffee" (€3)
- ✅ **Monthly support** - Users can become members
- ✅ **No platform fees** - Ko-fi is free (only payment processor fees ~5%)
- ✅ **PayPal & Stripe** - Supports both payment methods
- ✅ **Goal tracking** - Set fundraising goals on your page

## Alternative: In-App Link
If you prefer not to open a browser, you can also:
1. Accept donations via other methods (PayPal, etc.)
2. Update the link to point to your preferred platform
3. Remove the button entirely if not needed

The button opens in the device's default browser when clicked.
