# QUEUELESS APP

Single codebase with folder launchers:

- `Admin/` launches the root app in Admin mode workflows (web-friendly).
- `Staff/` launches the root app in Staff mode workflows (android/dev-client friendly).

## One-time setup

Run once from project root:


## Run

```bash
cd C:\queueless-appdev
npm run web
npx expo start --web
```

## Staff password reset (Gmail SMTP)

This app sends a 6-digit reset code via Gmail SMTP using Firebase Cloud Functions.

1) Install dependencies and set Gmail app password:

```bash
cd C:\queueless-appdev\functions
npm install
firebase functions:config:set gmail.user="YOUR_GMAIL" gmail.app_password="YOUR_APP_PASSWORD"
```

2) Deploy functions:

```bash
firebase deploy --only functions
```

3) (Optional) Set region in the app if you deploy outside `asia-southeast1`:

```bash
setx EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION your-region
```

For Android native rebuild (when needed):

```bash
cd C:\queueless-appdev\Staff
npm run android

```

## Run staff phone without ADB pairing (different Wi-Fi ok)

Use Expo tunnel so the phone does not need to be on the same Wi-Fi or paired.

From project root:

```bash
npm run start:tunnel
```

From Staff folder (dev client):

```bash
cd C:\queueless-appdev\Staff
npm run start:tunnel
```

Notes:
- ADB pairing is only needed for `expo run:android` or `adb reverse` workflows.
- Queue, login, QR, and push are cloud-based (Firebase) and work on any network.

## Optional: ADB wireless debugging

Only needed for `expo run:android` or when you want ADB commands.

Use laptop hotspot:

```bash
adb pair IP:PORT
adb connect IP:5555
adb devices
```

Restart ADB completely (if needed):

```bash
adb disconnect
adb kill-server
adb start-server
```
